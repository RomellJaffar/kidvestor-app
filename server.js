// KidVestor real‑time backend server
// This Node.js server proxies requests to the Alpha Vantage API to avoid exposing
// your API key to the browser. It also serves static files from the `public`
// directory. To use this server, rename `.env.example` to `.env` and provide
// your Alpha Vantage API key. See package.json for dependencies.

const express = require('express');
const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config();

// Use native fetch if available (Node 18+), otherwise fall back to node-fetch
let fetchFn;
try {
  // Node 18 and later provide a global fetch API
  fetchFn = fetch;
} catch (err) {
  // eslint-disable-next-line global-require
  fetchFn = require('node-fetch');
}

const app = express();

// Read API key from environment
const API_KEY = process.env.ALPHA_VANTAGE_KEY;
if (!API_KEY) {
  console.warn('Warning: No Alpha Vantage API key provided. Real‑time data will not work until you set ALPHA_VANTAGE_KEY in your .env file.');
}

// Serve files from the `public` directory
app.use(express.static('public'));

// Search for stocks by keyword. Uses Alpha Vantage SYMBOL_SEARCH endpoint.
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing required query parameter `q`.' });
  }
  try {
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(q)}&apikey=${API_KEY}`;
    const response = await fetchFn(url);
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Error fetching search results:', err);
    return res.status(500).json({ error: 'Failed to fetch search results.' });
  }
});

// Get real‑time quote for a given stock symbol. Uses Alpha Vantage GLOBAL_QUOTE endpoint.
app.get('/api/quote', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({ error: 'Missing required query parameter `symbol`.' });
  }
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    const response = await fetchFn(url);
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Error fetching quote:', err);
    return res.status(500).json({ error: 'Failed to fetch quote.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KidVestor server listening on port ${PORT}`);
});