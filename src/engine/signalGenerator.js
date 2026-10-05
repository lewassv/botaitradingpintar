import { analyzeTechnical } from './technicalEngine.js';
import { analyzeFundamental } from './fundamentalEngine.js';
import { calculateRiskLevels } from './riskManager.js';
import { getLearningState } from './aiLearningEngine.js';

/**
 * Signal Generator for XAUUSD
 * Integrates Technical Analysis, Fundamental Sentiment, Adaptive Weights, and Scalping/Swing Risk Manager
 */
export function generateTradingSignal(candles, newsList, dxyData, userRiskConfig = {}) {
  const tradingStyle = userRiskConfig.tradingStyle || 'INTRADAY';
  const tech = analyzeTechnical(candles);
  const fund = analyzeFundamental(newsList, dxyData);
  const learningState = getLearningState();

  let wTech = learningState.weights.technical || 0.50;
  let wFund = learningState.weights.fundamental || 0.35;
  let wPA = learningState.weights.priceAction || 0.15;

  // Adjust weighting priority depending on trading style
  if (tradingStyle === 'SCALPING') {
    wTech = 0.65; // Scalping is heavily technical & price action driven
    wFund = 0.20;
    wPA = 0.15;
  } else if (tradingStyle === 'SWING') {
    wTech = 0.35;
    wFund = 0.50; // Swing trading is heavily driven by macro news & Fed rates
    wPA = 0.15;
  }

  // Calculate composite score (-100 to +100)
  const compositeScore = (tech.score * wTech) + (fund.score * wFund);

  // Determine Signal Action
  let action = 'HOLD';
  let strength = 'NEUTRAL';

  if (compositeScore >= 40) {
    action = 'STRONG BUY';
    strength = tradingStyle === 'SCALPING' ? 'SCALPER BREAKOUT BUY' : tradingStyle === 'SWING' ? 'SWING MACRO BULLISH' : 'HIGH BULLISH CONVICTION';
  } else if (compositeScore >= 18) {
    action = 'BUY';
    strength = tradingStyle === 'SCALPING' ? 'SCALP BUY (QUICK TARGET)' : 'MODERATE BULLISH';
  } else if (compositeScore <= -40) {
    action = 'STRONG SELL';
    strength = tradingStyle === 'SCALPING' ? 'SCALPER BREAKOUT SELL' : tradingStyle === 'SWING' ? 'SWING MACRO BEARISH' : 'HIGH BEARISH CONVICTION';
  } else if (compositeScore <= -18) {
    action = 'SELL';
    strength = tradingStyle === 'SCALPING' ? 'SCALP SELL (QUICK TARGET)' : 'MODERATE BEARISH';
  } else {
    action = 'HOLD';
    strength = 'CONSOLIDATION / NO CLEAR EDGE';
  }

  const scoreAbs = Math.abs(compositeScore);
  const rawConfidence = 55 + (scoreAbs * 0.38) + ((learningState.winRate - 50) * 0.15);
  const confidenceScore = parseFloat(Math.min(96, Math.max(50, rawConfidence)).toFixed(1));

  const currentPrice = candles && candles.length ? candles[candles.length - 1].close : 2415.50;

  // Risk Management (TP / SL / Lot Calculation)
  const riskLevels = calculateRiskLevels(currentPrice, action, tech.indicators, userRiskConfig);

  // Synthesize AI Reasoning in Indonesian
  const aiReasoning = [];

  const styleLabel = tradingStyle === 'SCALPING' ? '⚡ SCALPING (M5/M15)' : tradingStyle === 'SWING' ? '🎯 SWING (H4/D1)' : '⚖️ INTRADAY (H1)';

  aiReasoning.push(`🎯 **Sinyal & Mode Active**: Mode **${styleLabel}** → Rekomendasi **${action}** (${strength}) dengan Tingkat Kepercayaan AI **${confidenceScore}%**.`);
  
  if (tradingStyle === 'SCALPING') {
    aiReasoning.push(`⚡ **Fokus Scalping**: Stop Loss dipasang ketat sebesar **${riskLevels.slPips} pips** ($${riskLevels.stopLoss}) untuk eksekusi cepat. Target TP1 **${riskLevels.takeProfit1}** dan TP2 **${riskLevels.takeProfit2}**.`);
  } else if (tradingStyle === 'SWING') {
    aiReasoning.push(`🎯 **Fokus Swing**: Menggunakan area S/R struktur lebar **${riskLevels.slPips} pips** ($${riskLevels.stopLoss}) untuk menahan fluktuasi pasar harian. Target Profit TP2 **${riskLevels.takeProfit2}** (+${riskLevels.tp2Pips} pips).`);
  }

  aiReasoning.push(`📈 **Analisis Teknikal (${(wTech*100).toFixed(0)}% Bobot Mode)**: Skor Teknikal = **${tech.score > 0 ? '+' : ''}${tech.score}**. ${tech.summary}`);
  aiReasoning.push(`📰 **Analisis Fundamental & Berita (${(wFund*100).toFixed(0)}% Bobot Mode)**: Skor Sentimen = **${fund.score > 0 ? '+' : ''}${fund.score}**. ${fund.summary}`);

  if (fund.dxy) {
    aiReasoning.push(`USD **DXY Index**: ${fund.dxy.price} (${fund.dxy.changePct >= 0 ? '+' : ''}${fund.dxy.changePct}%). ${fund.keyDrivers[0] || ''}`);
  }

  aiReasoning.push(`🛡️ **Manajemen Risiko**: Target Risk-to-Reward **1:${riskLevels.riskRewardRatio}**. Recommended Lot: **${riskLevels.recommendedLot} Lot** (Risiko Modal: $${riskLevels.riskAmountUSD} / 1% akun).`);

  return {
    timestamp: new Date().toISOString(),
    pair: 'XAUUSD',
    tradingStyle,
    action,
    strength,
    confidenceScore,
    currentPrice: parseFloat(currentPrice.toFixed(2)),
    compositeScore: parseFloat(compositeScore.toFixed(2)),
    technical: tech,
    fundamental: fund,
    risk: riskLevels,
    aiWeights: { technical: wTech, fundamental: wFund, priceAction: wPA },
    aiReasoning,
    learningModel: {
      totalTrades: learningState.totalTrades,
      winRate: learningState.winRate
    }
  };
}
