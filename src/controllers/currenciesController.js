import { sql } from "../config/db.js";
import fetch from "node-fetch";

// Free currency API endpoint
const CURRENCY_API_URL = "https://api.exchangerate-api.com/v4/latest/PLN";

// Currency pairs we want to track
const CURRENCY_PAIRS = [
  { name: "EUR/PLN", from: "EUR", to: "PLN" },
  { name: "USD/PLN", from: "USD", to: "PLN" },
  { name: "GBP/PLN", from: "GBP", to: "PLN" },
  { name: "JPY/PLN", from: "JPY", to: "PLN" }
];

// Fetch currency rates from free API
async function fetchCurrencyRates() {
  try {
    const response = await fetch(CURRENCY_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const rates = data.rates;
    
    // Convert rates to PLN (since API gives rates relative to PLN)
    const currencyRates = CURRENCY_PAIRS.map(pair => {
      const rate = 1 / rates[pair.from]; // Convert from PLN to foreign currency
      return {
        name: pair.name,
        rate_pln: rate.toFixed(4),
        last_update_rate: new Date().toISOString()
      };
    });
    
    return currencyRates;
  } catch (error) {
    console.error("Error fetching currency rates:", error);
    throw error;
  }
}

// Initialize currencies table with initial data
export async function initializeCurrencies() {
  try {
    // Check if currencies table exists, if not create it
    await sql`
      CREATE TABLE IF NOT EXISTS currencies (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL,
        rate_pln DECIMAL(10,4) NOT NULL,
        last_update_rate TEXT NOT NULL
      )
    `;
    
    // Check if we have any currencies, if not insert initial data
    const existingCurrencies = await sql`SELECT COUNT(*) as count FROM currencies`;
    
    if (existingCurrencies[0].count === 0) {
      const initialRates = await fetchCurrencyRates();
      
      for (const rate of initialRates) {
        await sql`
          INSERT INTO currencies (name, rate_pln, last_update_rate)
          VALUES (${rate.name}, ${rate.rate_pln}, ${rate.last_update_rate})
        `;
      }
      
      console.log("Currencies table initialized with initial rates");
    }
  } catch (error) {
    console.error("Error initializing currencies:", error);
    throw error;
  }
}

// Refresh all currency rates
export async function refreshCurrencyRates() {
  try {
    const rates = await fetchCurrencyRates();
    
    for (const rate of rates) {
      await sql`
        UPDATE currencies 
        SET rate_pln = ${rate.rate_pln}, last_update_rate = ${rate.last_update_rate}
        WHERE name = ${rate.name}
      `;
    }
    
    console.log(`Currency rates refreshed successfully at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("Error refreshing currency rates:", error);
    throw error;
  }
}

// Get all current currency rates
export async function getCurrencyRates() {
  try {
    const rates = await sql`SELECT * FROM currencies ORDER BY name`;
    return rates;
  } catch (error) {
    console.error("Error getting currency rates:", error);
    throw error;
  }
}

// Get specific currency rate
export async function getCurrencyRate(currencyName) {
  try {
    const rate = await sql`SELECT * FROM currencies WHERE name = ${currencyName}`;
    return rate[0] || null;
  } catch (error) {
    console.error("Error getting currency rate:", error);
    throw error;
  }
}
