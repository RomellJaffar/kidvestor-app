const express = require('express');
const dotenv = require('dotenv');
const path = require('path'); // <-- ADD THIS LINE

dotenv.config();

let fetchFn;
try {
  fetchFn = fetch;
} catch (err) {
  fetchFn = require('node-fetch');
}

const app = express();

const API_KEY = process.env.ALPHA_VANTAGE_KEY;
if (!API_KEY) {
  console.warn('Warning: No Alpha Vantage API key provided...');
}

app.use(express.static('public'));

// ✅ ADD THIS ROUTE
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing required query parameter `q`.' });
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

app.get('/api/quote', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Missing required query parameter `symbol`.' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KidVestor server listening on port ${PORT}`);
});
