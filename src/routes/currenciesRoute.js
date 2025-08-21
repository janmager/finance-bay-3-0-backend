import express from "express";
import { 
  refreshCurrencyRates, 
  getCurrencyRates, 
  getCurrencyRate,
  initializeCurrencies 
} from "../controllers/currenciesController.js";

const router = express.Router();

// Refresh currency rates (main endpoint for cron job)
router.get("/refresh", async (req, res) => {
  try {
    const result = await refreshCurrencyRates();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error refreshing currency rates:", error);
    res.status(500).json({ error: "Failed to refresh currency rates" });
  }
});

// Get all currency rates
router.get("/", async (req, res) => {
  try {
    const rates = await getCurrencyRates();
    res.status(200).json(rates);
  } catch (error) {
    console.error("Error getting currency rates:", error);
    res.status(500).json({ error: "Failed to get currency rates" });
  }
});

// Get specific currency rate
router.get("/:currencyName", async (req, res) => {
  try {
    const { currencyName } = req.params;
    const rate = await getCurrencyRate(currencyName);
    
    if (!rate) {
      return res.status(404).json({ error: "Currency not found" });
    }
    
    res.status(200).json(rate);
  } catch (error) {
    console.error("Error getting currency rate:", error);
    res.status(500).json({ error: "Failed to get currency rate" });
  }
});

export default router;
