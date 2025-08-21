import express from "express";
import { 
  getUserForeignCurrencies, 
  updateUserForeignCurrency,
  getUserForeignCurrenciesTotalValue
} from "../controllers/foreignCurrenciesController.js";

const router = express.Router();

// Get all foreign currencies for a specific user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const currencies = await getUserForeignCurrencies(userId);
    res.status(200).json(currencies);
  } catch (error) {
    console.error("Error getting user foreign currencies:", error);
    res.status(500).json({ error: "Failed to get user foreign currencies" });
  }
});

// Get total value of user's foreign currencies in PLN
router.get("/:userId/total-value", async (req, res) => {
  try {
    const { userId } = req.params;
    const totalValue = await getUserForeignCurrenciesTotalValue(userId);
    res.status(200).json(totalValue);
  } catch (error) {
    console.error("Error getting total value:", error);
    res.status(500).json({ error: "Failed to get total value", details: error.message });
  }
});

// Update or create foreign currency amount for a user
router.post("/:userId/update", async (req, res) => {
  try {
    const { userId } = req.params;
    const { currency, amountChange } = req.body;
    
    // Validate required fields
    if (!currency || amountChange === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields: currency and amountChange are required" 
      });
    }
    
    // Validate currency format (should match the format in currencies table)
    const validCurrencies = ["EUR", "USD", "GBP", "JPY"];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({ 
        error: "Invalid currency. Supported currencies: EUR, USD, GBP, JPY" 
      });
    }
    
    // Validate amountChange is a number
    if (isNaN(parseFloat(amountChange))) {
      return res.status(400).json({ 
        error: "amountChange must be a valid number" 
      });
    }
    
    const result = await updateUserForeignCurrency(userId, currency, amountChange);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error updating foreign currency:", error);
    
    // Handle specific error for insufficient funds
    if (error.message.includes("Insufficient funds")) {
      return res.status(400).json({ error: error.message });
    }
    
    // Handle specific error for negative initial amount
    if (error.message.includes("Cannot create currency record with negative amount")) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to update foreign currency" });
  }
});

// Deposit foreign currency (positive amount)
router.post("/:userId/deposit", async (req, res) => {
  try {
    const { userId } = req.params;
    const { currency, amount } = req.body;
    
    if (!currency || !amount) {
      return res.status(400).json({ 
        error: "Missing required fields: currency and amount are required" 
      });
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ 
        error: "Deposit amount must be a valid positive number" 
      });
    }
    
    const result = await updateUserForeignCurrency(userId, currency, parsedAmount);
    
    res.status(200).json(result);
  } catch (error) {
    console.error("Error depositing foreign currency:", error);
    res.status(500).json({ error: "Failed to deposit foreign currency" });
  }
});

// Withdraw foreign currency (negative amount)
router.post("/:userId/withdraw", async (req, res) => {
  try {
    const { userId } = req.params;
    const { currency, amount } = req.body;
    
    if (!currency || !amount) {
      return res.status(400).json({ 
        error: "Missing required fields: currency and amount are required" 
      });
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      return res.status(400).json({ 
        error: "Withdrawal amount must be a valid non-zero number" 
      });
    }
    
    // For withdrawal, we always use negative amount
    const withdrawalAmount = Math.abs(parsedAmount);
    const result = await updateUserForeignCurrency(userId, currency, -withdrawalAmount);
    
    res.status(200).json(result);
  } catch (error) {
    console.error("Error withdrawing foreign currency:", error);
    
    if (error.message.includes("Insufficient funds")) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to withdraw foreign currency" });
  }
});

export default router;
