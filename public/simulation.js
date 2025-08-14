// KidVestor Real‑time Simulation Script
// This script handles searching for stocks, adding them to the market table,
// executing buy and sell orders, tracking portfolio performance, and
// evaluating results after a 30‑day simulation. It communicates with a
// Node.js backend (server.js) that proxies requests to Alpha Vantage.

(function () {
  // Starting cash balance
  let cash = 100000;
  // Holdings keyed by symbol: { quantity, avgCost }
  const holdings = {};
  // Market watch list: array of { symbol, name, price }
  const market = [];
  // Day counter and history arrays
  let day = 1;
  const maxDays = 30;
  const portfolioHistory = [];
  const dailyReturns = [];
  const orderHistory = [];
  let chartInstance = null;

  // DOM elements
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const searchResults = document.getElementById('searchResults');
  const marketTableBody = document.querySelector('#marketTable tbody');
  const portfolioTableBody = document.querySelector('#portfolioTable tbody');
  const historyTableBody = document.querySelector('#historyTable tbody');
  const advanceDayBtn = document.getElementById('advanceDayBtn');
  const resultMessage = document.getElementById('resultMessage');
  const chartCanvas = document.getElementById('portfolioChart');

  // Helper: fetch JSON from backend
  async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return response.json();
  }

  // Search for stocks by keyword
  async function searchStocks() {
    const query = searchInput.value.trim();
    if (!query) return;
    searchBtn.disabled = true;
    searchResults.innerHTML = '<li>Searching…</li>';
    try {
      const data = await fetchJSON(`/api/search?q=${encodeURIComponent(query)}`);
      const matches = data.bestMatches || [];
      if (matches.length === 0) {
        searchResults.innerHTML = '<li>No results found.</li>';
        return;
      }
      // Render list of search results
      searchResults.innerHTML = '';
      matches.slice(0, 5).forEach((match) => {
        const symbol = match['1. symbol'];
        const name = match['2. name'];
        const li = document.createElement('li');
        li.textContent = `${symbol} – ${name}`;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          addStockToMarket(symbol, name);
          // Clear results
          searchResults.innerHTML = '';
          searchInput.value = '';
        });
        searchResults.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      searchResults.innerHTML = '<li>Failed to fetch data.</li>';
    } finally {
      searchBtn.disabled = false;
    }
  }

  // Add a stock to the market watch list
  async function addStockToMarket(symbol, name) {
    // Prevent duplicates
    if (market.find((s) => s.symbol === symbol)) return;
    try {
      const data = await fetchJSON(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
      const quote = data['Global Quote'] || {};
      const price = parseFloat(quote['05. price']);
      if (Number.isNaN(price)) {
        alert('Price unavailable for ' + symbol);
        return;
      }
      market.push({ symbol, name, price });
      renderMarketTable();
    } catch (err) {
      console.error(err);
      alert('Failed to fetch quote for ' + symbol);
    }
  }

  // Render the market table
  function renderMarketTable() {
    marketTableBody.innerHTML = '';
    market.forEach((stock) => {
      const row = document.createElement('tr');
      // Symbol
      const symCell = document.createElement('td');
      symCell.textContent = stock.symbol;
      row.appendChild(symCell);
      // Name
      const nameCell = document.createElement('td');
      nameCell.textContent = stock.name;
      row.appendChild(nameCell);
      // Price
      const priceCell = document.createElement('td');
      priceCell.textContent = stock.price.toFixed(2);
      row.appendChild(priceCell);
      // Quantity input
      const qtyCell = document.createElement('td');
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.value = '1';
      qtyInput.style.width = '60px';
      qtyCell.appendChild(qtyInput);
      row.appendChild(qtyCell);
      // Actions
      const actionsCell = document.createElement('td');
      actionsCell.classList.add('actions');
      const buyBtn = document.createElement('button');
      buyBtn.textContent = 'Buy';
      buyBtn.className = 'btn btn-primary btn-small';
      buyBtn.addEventListener('click', () => {
        const qty = parseInt(qtyInput.value, 10);
        buyStock(stock.symbol, stock.price, qty);
      });
      const sellBtn = document.createElement('button');
      sellBtn.textContent = 'Sell';
      sellBtn.className = 'btn btn-secondary btn-small';
      sellBtn.style.marginLeft = '0.25rem';
      sellBtn.addEventListener('click', () => {
        const qty = parseInt(qtyInput.value, 10);
        sellStock(stock.symbol, stock.price, qty);
      });
      actionsCell.appendChild(buyBtn);
      actionsCell.appendChild(sellBtn);
      row.appendChild(actionsCell);
      marketTableBody.appendChild(row);
    });
  }

  // Render portfolio table
  function renderPortfolioTable() {
    portfolioTableBody.innerHTML = '';
    let totalHoldings = 0;
    Object.keys(holdings).forEach((symbol) => {
      const h = holdings[symbol];
      const currentPrice = getCurrentPrice(symbol);
      const value = h.quantity * currentPrice;
      totalHoldings += value;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${symbol}</td>
        <td>${h.quantity}</td>
        <td>${h.avgCost.toFixed(2)}</td>
        <td>${currentPrice.toFixed(2)}</td>
        <td>${value.toFixed(2)}</td>
      `;
      portfolioTableBody.appendChild(row);
    });
    // Append cash row and total row
    const cashRow = document.createElement('tr');
    cashRow.innerHTML = `
      <td colspan="4"><strong>Cash</strong></td>
      <td>${cash.toFixed(2)}</td>
    `;
    portfolioTableBody.appendChild(cashRow);
    const totalRow = document.createElement('tr');
    totalRow.innerHTML = `
      <td colspan="4"><strong>Total Portfolio Value</strong></td>
      <td>${(cash + totalHoldings).toFixed(2)}</td>
    `;
    portfolioTableBody.appendChild(totalRow);
  }

  // Get current price for a symbol from market array or fallback to last known price in holdings
  function getCurrentPrice(symbol) {
    const stock = market.find((s) => s.symbol === symbol);
    if (stock) return stock.price;
    // If not in market, price is stored as avgCost for reference
    return holdings[symbol] ? holdings[symbol].avgCost : 0;
  }

  // Buy stock
  function buyStock(symbol, price, quantity) {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const cost = price * quantity;
    if (cash < cost) {
      alert('Not enough cash to complete purchase.');
      return;
    }
    cash -= cost;
    if (holdings[symbol]) {
      const h = holdings[symbol];
      const newQty = h.quantity + quantity;
      const newAvg = ((h.avgCost * h.quantity) + cost) / newQty;
      h.quantity = newQty;
      h.avgCost = newAvg;
    } else {
      holdings[symbol] = { quantity, avgCost: price };
    }
    orderHistory.push({ day, action: 'BUY', symbol, quantity, price, amount: -cost });
    renderPortfolioTable();
    renderHistoryTable();
  }

  // Sell stock
  function sellStock(symbol, price, quantity) {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const h = holdings[symbol];
    if (!h || h.quantity < quantity) {
      alert('Insufficient shares to sell.');
      return;
    }
    const revenue = price * quantity;
    cash += revenue;
    h.quantity -= quantity;
    if (h.quantity === 0) {
      delete holdings[symbol];
    }
    orderHistory.push({ day, action: 'SELL', symbol, quantity, price, amount: revenue });
    renderPortfolioTable();
    renderHistoryTable();
  }

  // Render history table
  function renderHistoryTable() {
    historyTableBody.innerHTML = '';
    orderHistory.forEach((ord) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${ord.day}</td>
        <td>${ord.action}</td>
        <td>${ord.symbol}</td>
        <td>${ord.quantity}</td>
        <td>${ord.price.toFixed(2)}</td>
        <td>${ord.amount >= 0 ? '+' : ''}${ord.amount.toFixed(2)}</td>
      `;
      historyTableBody.appendChild(row);
    });
  }

  // Update prices for all tracked stocks
  async function updatePrices() {
    for (const stock of market) {
      try {
        const data = await fetchJSON(`/api/quote?symbol=${encodeURIComponent(stock.symbol)}`);
        const quote = data['Global Quote'] || {};
        const newPrice = parseFloat(quote['05. price']);
        if (!Number.isNaN(newPrice)) {
          stock.price = newPrice;
        }
      } catch (err) {
        console.error('Failed to update price for', stock.symbol, err);
      }
    }
    renderMarketTable();
    renderPortfolioTable();
  }

  // Advance simulation by one day
  async function advanceDay() {
    if (day > maxDays) return;
    // Calculate current portfolio value
    const currentValue = cash + Object.keys(holdings).reduce((sum, sym) => {
      const h = holdings[sym];
      const price = getCurrentPrice(sym);
      return sum + h.quantity * price;
    }, 0);
    portfolioHistory.push({ day, value: currentValue });
    // Compute daily return from previous day
    if (portfolioHistory.length > 1) {
      const prev = portfolioHistory[portfolioHistory.length - 2].value;
      const ret = (currentValue - prev) / prev;
      dailyReturns.push(ret);
    }
    // If last day, evaluate performance
    if (day === maxDays) {
      evaluatePerformance();
    } else {
      day += 1;
      await updatePrices();
      renderChart();
    }
  }

  // Evaluate final performance and display results
  function evaluatePerformance() {
    // Compute monthly return
    const initialValue = portfolioHistory[0].value;
    const finalValue = portfolioHistory[portfolioHistory.length - 1].value;
    const monthlyReturn = (finalValue - initialValue) / initialValue;
    // Annualize: approximate monthly compounding to annual
    const annualReturn = Math.pow(1 + monthlyReturn, 12) - 1;
    // Compute volatility: standard deviation of daily returns
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance);
    let message = `Simulation complete! Annualized return: ${(annualReturn * 100).toFixed(1)}%. Volatility: ${(volatility * 100).toFixed(2)}%.`;
    if (annualReturn >= 0.5 && volatility <= 0.02) {
      message += ' Congratulations! Your strategy is steady and profitable. You qualify for investor matchmaking!';
    } else {
      message += ' Keep practicing to achieve consistent returns above 50% annually with low volatility.';
    }
    resultMessage.textContent = message;
    renderChart();
  }

  // Render portfolio performance chart
  function renderChart() {
    const labels = portfolioHistory.map((entry) => `Day ${entry.day}`);
    const dataPoints = portfolioHistory.map((entry) => entry.value);
    const ctx = chartCanvas.getContext('2d');
    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = dataPoints;
      chartInstance.update();
    } else {
      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Portfolio Value',
              data: dataPoints,
              borderWidth: 2,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: 'Portfolio Performance',
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Day',
              },
            },
            y: {
              title: {
                display: true,
                text: 'Value',
              },
            },
          },
        },
      });
    }
  }

  // Event listeners
  searchBtn.addEventListener('click', searchStocks);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchStocks();
    }
  });
  advanceDayBtn.addEventListener('click', advanceDay);

  // Initialize simulation: update chart with starting value
  function init() {
    portfolioHistory.length = 0;
    dailyReturns.length = 0;
    orderHistory.length = 0;
    // Starting portfolio value (cash only)
    portfolioHistory.push({ day, value: cash });
    renderPortfolioTable();
    renderHistoryTable();
    renderChart();
  }

  init();
})();