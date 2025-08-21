import { sql } from "../config/db.js";

// Get all foreign currencies for a specific user
export async function getUserForeignCurrencies(userId) {
  try {
    const currencies = await sql`
      SELECT * FROM foreign_currencies 
      WHERE user_id = ${userId} 
      ORDER BY currency
    `;
    
    // Add PLN value for each currency
    const currenciesWithPLNValue = [];
    for (const currency of currencies) {
      try {
        // Get current exchange rate - currencies table stores rates as "EUR/PLN", "USD/PLN", etc.
        const currencyPair = currency.currency.toUpperCase() + '/PLN';
        const exchangeRate = await sql`
          SELECT rate_pln FROM currencies WHERE name = ${currencyPair}
        `;
        
        let plnValue = 0;
        if (exchangeRate.length > 0) {
          const rate = parseFloat(exchangeRate[0].rate_pln);
          const amount = parseFloat(currency.amount);
          plnValue = amount * rate;
        }
        
        currenciesWithPLNValue.push({
          ...currency,
          pln_value: plnValue.toFixed(2)
        });
      } catch (error) {
        console.error(`Error getting exchange rate for ${currency.currency}:`, error);
        // If we can't get the exchange rate, still include the currency with 0 PLN value
        currenciesWithPLNValue.push({
          ...currency,
          pln_value: "0.00"
        });
      }
    }
    
    return currenciesWithPLNValue;
  } catch (error) {
    console.error("Error getting user foreign currencies:", error);
    throw error;
  }
}

// Update or create foreign currency amount for a user
export async function updateUserForeignCurrency(userId, currency, amountChange) {
  try {
    // Check if user already has this currency
    const existingCurrency = await sql`
      SELECT * FROM foreign_currencies 
      WHERE user_id = ${userId} AND currency = ${currency}
    `;

    if (existingCurrency.length > 0) {
      // User has this currency, update the amount
      const currentAmount = parseFloat(existingCurrency[0].amount);
      const newAmount = currentAmount + parseFloat(amountChange);
      
      // Check if new amount would go below 0
      if (newAmount < 0) {
        throw new Error(`Insufficient funds. Cannot withdraw ${Math.abs(amountChange)} ${currency}. Available: ${currentAmount} ${currency}`);
      }
      
      // Update the amount
      await sql`
        UPDATE foreign_currencies 
        SET amount = ${newAmount.toString()}
        WHERE user_id = ${userId} AND currency = ${currency}
      `;
      
      return {
        success: true,
        message: `Currency ${currency} updated successfully`,
        previousAmount: currentAmount,
        newAmount: newAmount,
        change: amountChange
      };
    } else {
      // User doesn't have this currency, create new record
      const newAmount = parseFloat(amountChange);
      
      // Check if initial amount is negative
      if (newAmount < 0) {
        throw new Error(`Cannot create currency record with negative amount: ${newAmount} ${currency}`);
      }
      
      // Insert new record
      await sql`
        INSERT INTO foreign_currencies (user_id, currency, amount)
        VALUES (${userId}, ${currency}, ${newAmount.toString()})
      `;
      
      return {
        success: true,
        message: `New currency ${currency} created successfully`,
        previousAmount: 0,
        newAmount: newAmount,
        change: amountChange
      };
    }
  } catch (error) {
    console.error("Error updating user foreign currency:", error);
    throw error;
  }
}

// Get total value of user's foreign currencies in PLN
export async function getUserForeignCurrenciesTotalValue(userId) {
  try {
    const userCurrencies = await getUserForeignCurrencies(userId);
    let totalValuePLN = 0;
    
    for (const currency of userCurrencies) {
      // Get current exchange rate - currencies table stores rates as "EUR/PLN", "USD/PLN", etc.
      // Convert currency to uppercase to match the format in currencies table
      const currencyPair = currency.currency.toUpperCase() + '/PLN';
      const exchangeRate = await sql`
        SELECT rate_pln FROM currencies WHERE name = ${currencyPair}
      `;
      
      if (exchangeRate.length > 0) {
        const rate = parseFloat(exchangeRate[0].rate_pln);
        const amount = parseFloat(currency.amount);
        
        // rate_pln represents how many PLN you get for 1 unit of foreign currency
        // So we multiply the foreign currency amount by the rate to get PLN value
        totalValuePLN += amount * rate;
        
      } else {
        console.warn(`No exchange rate found for ${currencyPair}`);
      }
    }
    
    return {
      totalValuePLN: totalValuePLN.toFixed(2),
      currencies: userCurrencies,
      calculationDetails: {
        totalCurrencies: userCurrencies.length,
        totalValuePLN: totalValuePLN
      }
    };
  } catch (error) {
    console.error("Error calculating total foreign currencies value:", error);
    throw error;
  }
}
