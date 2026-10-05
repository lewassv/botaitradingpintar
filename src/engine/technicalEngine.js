import { RSI, MACD, EMA, ATR, BollingerBands } from 'technicalindicators';

/**
 * Technical Analysis Engine for XAUUSD
 * Calculates trend, momentum, volatility, support/resistance, and candlestick patterns.
 */
export function analyzeTechnical(candles) {
  if (!candles || candles.length < 50) {
    return {
      score: 0,
      trend: 'NEUTRAL',
      summary: 'Insufficient candles for technical calculation',
      indicators: {}
    };
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const opens = candles.map(c => c.open);
  const volumes = candles.map(c => c.volume || 100);

  const currentPrice = closes[closes.length - 1];

  // 1. RSI (14)
  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const currentRsi = rsiValues[rsiValues.length - 1] || 50;

  // 2. MACD (12, 26, 9)
  const macdInput = {
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  };
  const macdValues = MACD.calculate(macdInput);
  const currentMacd = macdValues[macdValues.length - 1] || { MACD: 0, signal: 0, histogram: 0 };

  // 3. EMAs (20, 50, 200)
  const ema20Arr = EMA.calculate({ values: closes, period: Math.min(20, closes.length) });
  const ema50Arr = EMA.calculate({ values: closes, period: Math.min(50, closes.length) });
  const ema200Arr = EMA.calculate({ values: closes, period: Math.min(200, closes.length) });

  const ema20 = ema20Arr[ema20Arr.length - 1] || currentPrice;
  const ema50 = ema50Arr[ema50Arr.length - 1] || currentPrice;
  const ema200 = ema200Arr[ema200Arr.length - 1] || currentPrice;

  // 4. ATR (14)
  const atrValues = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
  const currentAtr = atrValues[atrValues.length - 1] || (currentPrice * 0.005); // fallback ~10-15 pips

  // 5. Bollinger Bands (20, 2)
  const bbValues = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
  const currentBB = bbValues[bbValues.length - 1] || { upper: currentPrice * 1.01, middle: currentPrice, lower: currentPrice * 0.99 };

  // 6. Support and Resistance Pivot Calculation
  const srLevels = calculateSupportResistance(candles);

  // 7. Candlestick Pattern Recognition
  const patterns = detectCandlestickPatterns(candles);

  // 8. Scoring & Signal Evaluation (-100 to +100)
  let techScore = 0;
  const reasons = [];

  // EMA Crossovers & Price alignment
  if (currentPrice > ema20 && ema20 > ema50) {
    techScore += 25;
    reasons.push("Price above EMA20 & EMA50 (Bullish Trend Alignment)");
  } else if (currentPrice < ema20 && ema20 < ema50) {
    techScore -= 25;
    reasons.push("Price below EMA20 & EMA50 (Bearish Trend Alignment)");
  }

  if (currentPrice > ema200) {
    techScore += 15;
    reasons.push("Above EMA200 Long-Term Bullish Filter");
  } else {
    techScore -= 15;
    reasons.push("Below EMA200 Long-Term Bearish Filter");
  }

  // RSI Conditions
  if (currentRsi > 70) {
    techScore -= 15; // Overbought pull-back risk
    reasons.push(`RSI Overbought (${currentRsi.toFixed(1)}) - Caution Longs`);
  } else if (currentRsi < 30) {
    techScore += 15; // Oversold bounce opportunity
    reasons.push(`RSI Oversold (${currentRsi.toFixed(1)}) - Potential Reversal Buy`);
  } else if (currentRsi >= 50 && currentRsi <= 65) {
    techScore += 10;
    reasons.push(`RSI Healthy Bullish Momentum (${currentRsi.toFixed(1)})`);
  } else if (currentRsi < 50 && currentRsi >= 35) {
    techScore -= 10;
    reasons.push(`RSI Healthy Bearish Momentum (${currentRsi.toFixed(1)})`);
  }

  // MACD Histogram & Cross
  if (currentMacd.histogram > 0) {
    techScore += 15;
    reasons.push("MACD Histogram Positive (Bullish Momentum)");
  } else if (currentMacd.histogram < 0) {
    techScore -= 15;
    reasons.push("MACD Histogram Negative (Bearish Momentum)");
  }

  // Bollinger Bands position
  if (currentPrice <= currentBB.lower) {
    techScore += 15;
    reasons.push("Price touching Lower Bollinger Band (Oversold Bounce Zone)");
  } else if (currentPrice >= currentBB.upper) {
    techScore -= 15;
    reasons.push("Price touching Upper Bollinger Band (Overbought Resistance)");
  }

  // Pattern Impact
  patterns.forEach(p => {
    if (p.bias === 'BULLISH') {
      techScore += p.weight;
      reasons.push(`Candlestick Pattern: ${p.name}`);
    } else if (p.bias === 'BEARISH') {
      techScore -= p.weight;
      reasons.push(`Candlestick Pattern: ${p.name}`);
    }
  });

  // Clamp techScore between -100 and +100
  techScore = Math.max(-100, Math.min(100, techScore));

  let trendStr = 'NEUTRAL';
  if (techScore >= 35) trendStr = 'BULLISH';
  else if (techScore <= -35) trendStr = 'BEARISH';

  return {
    score: techScore,
    trend: trendStr,
    summary: reasons.slice(0, 4).join(' • '),
    reasons,
    indicators: {
      price: parseFloat(currentPrice.toFixed(2)),
      rsi: parseFloat(currentRsi.toFixed(2)),
      macd: {
        macd: parseFloat((currentMacd.MACD || 0).toFixed(3)),
        signal: parseFloat((currentMacd.signal || 0).toFixed(3)),
        histogram: parseFloat((currentMacd.histogram || 0).toFixed(3))
      },
      ema20: parseFloat(ema20.toFixed(2)),
      ema50: parseFloat(ema50.toFixed(2)),
      ema200: parseFloat(ema200.toFixed(2)),
      atr: parseFloat(currentAtr.toFixed(2)),
      bollinger: {
        upper: parseFloat(currentBB.upper.toFixed(2)),
        middle: parseFloat(currentBB.middle.toFixed(2)),
        lower: parseFloat(currentBB.lower.toFixed(2))
      },
      support: srLevels.supports,
      resistance: srLevels.resistances,
      patterns
    }
  };
}

function calculateSupportResistance(candles) {
  const recent = candles.slice(-50);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);

  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const currentClose = recent[recent.length - 1].close;

  // Mid pivot point
  const pivot = (maxHigh + minLow + currentClose) / 3;

  const r1 = (2 * pivot) - minLow;
  const s1 = (2 * pivot) - maxHigh;
  const r2 = pivot + (maxHigh - minLow);
  const s2 = pivot - (maxHigh - minLow);

  return {
    supports: [parseFloat(s1.toFixed(2)), parseFloat(s2.toFixed(2)), parseFloat(minLow.toFixed(2))].sort((a, b) => b - a),
    resistances: [parseFloat(r1.toFixed(2)), parseFloat(r2.toFixed(2)), parseFloat(maxHigh.toFixed(2))].sort((a, b) => a - b)
  };
}

function detectCandlestickPatterns(candles) {
  const patterns = [];
  if (candles.length < 3) return patterns;

  const c1 = candles[candles.length - 2];
  const c2 = candles[candles.length - 1];

  const c1Body = Math.abs(c1.close - c1.open);
  const c2Body = Math.abs(c2.close - c2.open);

  const c2IsGreen = c2.close > c2.open;
  const c2IsRed = c2.close < c2.open;
  const c1IsRed = c1.close < c1.open;
  const c1IsGreen = c1.close > c1.open;

  // Bullish Engulfing
  if (c1IsRed && c2IsGreen && c2.close > c1.open && c2.open < c1.close && c2Body > c1Body * 1.2) {
    patterns.push({ name: 'Bullish Engulfing', bias: 'BULLISH', weight: 20 });
  }

  // Bearish Engulfing
  if (c1IsGreen && c2IsRed && c2.close < c1.open && c2.open > c1.close && c2Body > c1Body * 1.2) {
    patterns.push({ name: 'Bearish Engulfing', bias: 'BEARISH', weight: 20 });
  }

  // Pinbar / Hammer (Bullish Reversal)
  const c2Range = c2.high - c2.low;
  const c2LowerWick = Math.min(c2.open, c2.close) - c2.low;
  const c2UpperWick = c2.high - Math.max(c2.open, c2.close);

  if (c2LowerWick > c2Body * 2 && c2UpperWick < c2Body * 0.5) {
    patterns.push({ name: 'Bullish Pin Bar / Hammer', bias: 'BULLISH', weight: 15 });
  }

  // Shooting Star (Bearish Reversal)
  if (c2UpperWick > c2Body * 2 && c2LowerWick < c2Body * 0.5) {
    patterns.push({ name: 'Shooting Star / Bearish Pin Bar', bias: 'BEARISH', weight: 15 });
  }

  return patterns;
}
