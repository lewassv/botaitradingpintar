import axios from 'axios';

/**
 * Market Data Service for XAUUSD and USD (DXY Index)
 * Supports live API retrieval and ultra-realistic 24/7 candle simulation engine.
 */

let simulatedPrice = 2415.50;
let simulatedHistory = generateInitialCandles(120, simulatedPrice);

export async function getXauusdData(timeframe = 'H1') {
  try {
    // Attempt live API fetch from public finance endpoint (e.g. Yahoo Finance Gold Futures GC=F)
    const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1h&range=5d', {
      timeout: 4000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const result = response.data?.chart?.result?.[0];
    if (result && result.indicators?.quote?.[0]) {
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const candles = [];

      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
          candles.push({
            time: timestamps[i] * 1000,
            open: parseFloat(quote.open[i].toFixed(2)),
            high: parseFloat(quote.high[i].toFixed(2)),
            low: parseFloat(quote.low[i].toFixed(2)),
            close: parseFloat(quote.close[i].toFixed(2)),
            volume: quote.volume[i] || 1500
          });
        }
      }

      if (candles.length > 30) {
        return {
          source: 'LIVE_YAHOO_GOLD',
          currentPrice: candles[candles.length - 1].close,
          candles
        };
      }
    }
  } catch (err) {
    console.warn('Live gold price fetch warning, using high-precision simulator:', err.message);
  }

  // Fallback to Realistic Live Simulation Engine
  tickSimulation();
  return {
    source: 'REALTIME_SIMULATOR',
    currentPrice: simulatedPrice,
    candles: simulatedHistory
  };
}

export async function getDxyIndexData() {
  try {
    const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=2d', {
      timeout: 4000
    });
    const meta = response.data?.chart?.result?.[0]?.meta;
    if (meta && meta.regularMarketPrice) {
      const prevClose = meta.chartPreviousClose || meta.regularMarketPrice;
      const changePct = ((meta.regularMarketPrice - prevClose) / prevClose) * 100;
      return {
        price: parseFloat(meta.regularMarketPrice.toFixed(2)),
        changePct: parseFloat(changePct.toFixed(2))
      };
    }
  } catch (e) {
    // Fallback DXY simulation
  }

  // Realistic fallback DXY (~104.15)
  const randomDrift = (Math.random() - 0.52) * 0.12;
  return {
    price: parseFloat((104.15 + randomDrift).toFixed(2)),
    changePct: parseFloat((randomDrift * 1.5).toFixed(2))
  };
}

function generateInitialCandles(count = 100, startPrice = 2415.50) {
  const candles = [];
  let current = startPrice - 15;
  const now = Date.now();
  const timeframeMs = 60 * 60 * 1000; // 1 hour

  for (let i = count; i >= 0; i--) {
    const time = now - (i * timeframeMs);
    const change = (Math.random() - 0.48) * 3.5; // slight upward drift for gold
    const open = current;
    const close = open + change;
    const high = Math.max(open, close) + (Math.random() * 2.5);
    const low = Math.min(open, close) - (Math.random() * 2.5);
    const volume = Math.floor(1000 + Math.random() * 4000);

    candles.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });

    current = close;
  }

  simulatedPrice = parseFloat(current.toFixed(2));
  return candles;
}

function tickSimulation() {
  const lastCandle = simulatedHistory[simulatedHistory.length - 1];
  const delta = (Math.random() - 0.49) * 0.85; // micro tick fluctuation
  const newClose = parseFloat((lastCandle.close + delta).toFixed(2));
  
  lastCandle.close = newClose;
  lastCandle.high = Math.max(lastCandle.high, newClose);
  lastCandle.low = Math.min(lastCandle.low, newClose);
  simulatedPrice = newClose;

  // Add new candle every ~50 ticks
  if (Math.random() < 0.15) {
    const newTime = lastCandle.time + (60 * 60 * 1000);
    simulatedHistory.push({
      time: newTime,
      open: newClose,
      high: newClose + 0.5,
      low: newClose - 0.5,
      close: newClose,
      volume: Math.floor(1200 + Math.random() * 2000)
    });
    if (simulatedHistory.length > 150) {
      simulatedHistory.shift();
    }
  }
}
