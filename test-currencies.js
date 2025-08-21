import { initializeCurrencies, refreshCurrencyRates, getCurrencyRates } from "./src/controllers/currenciesController.js";

async function testCurrencies() {
  try {
    console.log("Testing currencies functionality...");
    
    // Test initialization
    console.log("1. Testing initialization...");
    await initializeCurrencies();
    console.log("✓ Initialization completed");
    
    // Test getting rates
    console.log("2. Testing get rates...");
    const rates = await getCurrencyRates();
    console.log("✓ Current rates:", rates);
    
    // Test refresh
    console.log("3. Testing refresh...");
    const refreshResult = await refreshCurrencyRates();
    console.log("✓ Refresh completed:", refreshResult);
    
    // Test getting updated rates
    console.log("4. Testing get updated rates...");
    const updatedRates = await getCurrencyRates();
    console.log("✓ Updated rates:", updatedRates);
    
    console.log("All tests passed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testCurrencies();
