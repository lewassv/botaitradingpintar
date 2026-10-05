/**
 * Risk Management Engine for XAUUSD (Gold)
 * Supports Scalping, Intraday, and Swing trading styles with dynamic or fixed Stop Loss,
 * Take Profits (TP1, TP2, TP3), Risk-to-Reward Ratio, and Lot Sizing.
 */

export const DEFAULT_RISK_CONFIG = {
  tradingStyle: 'INTRADAY', // 'SCALPING' | 'INTRADAY' | 'SWING'
  mode: 'DYNAMIC_ATR',      // 'DYNAMIC_ATR' | 'FIXED_PIPS' | 'SUPPORT_RESISTANCE'
  riskRewardRatio: 2.0,
  fixedSlPips: 40,
  atrMultiplier: 1.5,
  accountEquity: 1000,
  riskPercent: 1.0
};

export function calculateRiskLevels(entryPrice, action, techIndicators, userConfig = {}) {
  const config = { ...DEFAULT_RISK_CONFIG, ...userConfig };
  const style = config.tradingStyle || 'INTRADAY';
  const isBuy = action.includes('BUY');
  const atr = techIndicators.atr || 3.5;
  const supports = techIndicators.support || [entryPrice - 5, entryPrice - 10];
  const resistances = techIndicators.resistance || [entryPrice + 5, entryPrice + 10];

  let slDistanceDollars = 4.0;
  let targetRRR = config.riskRewardRatio || 2.0;

  // Adjust parameters based on Trading Style (Scalping vs Intraday vs Swing)
  if (style === 'SCALPING') {
    // Tight risk & fast targets (M5/M15 timeframe focus)
    targetRRR = userConfig.riskRewardRatio ? config.riskRewardRatio : 1.5;
    if (config.mode === 'FIXED_PIPS') {
      slDistanceDollars = (config.fixedSlPips || 20) * 0.10;
    } else if (config.mode === 'SUPPORT_RESISTANCE') {
      slDistanceDollars = Math.max(1.5, (isBuy ? (entryPrice - (supports[0] || entryPrice - 2)) : ((resistances[0] || entryPrice + 2) - entryPrice)));
    } else {
      slDistanceDollars = Math.max(1.5, atr * 0.85); // tight ATR
    }
  } else if (style === 'SWING') {
    // Wide structural risk & long targets (H4/D1 timeframe focus)
    targetRRR = userConfig.riskRewardRatio ? config.riskRewardRatio : 3.0;
    if (config.mode === 'FIXED_PIPS') {
      slDistanceDollars = (config.fixedSlPips || 100) * 0.10;
    } else if (config.mode === 'SUPPORT_RESISTANCE') {
      slDistanceDollars = Math.max(6.0, (isBuy ? (entryPrice - (supports[1] || entryPrice - 8)) : ((resistances[1] || entryPrice + 8) - entryPrice)));
    } else {
      slDistanceDollars = Math.max(6.0, atr * 2.5); // wide ATR
    }
  } else {
    // INTRADAY Mode (Standard H1 focus)
    targetRRR = config.riskRewardRatio || 2.0;
    if (config.mode === 'FIXED_PIPS') {
      slDistanceDollars = (config.fixedSlPips || 40) * 0.10;
    } else if (config.mode === 'SUPPORT_RESISTANCE') {
      slDistanceDollars = Math.max(2.5, (isBuy ? (entryPrice - (supports[0] || entryPrice - 4)) : ((resistances[0] || entryPrice + 4) - entryPrice)));
    } else {
      slDistanceDollars = Math.max(2.5, atr * 1.5);
    }
  }

  slDistanceDollars = parseFloat(slDistanceDollars.toFixed(2));

  // Compute Stop Loss Price
  const stopLossPrice = isBuy
    ? parseFloat((entryPrice - slDistanceDollars).toFixed(2))
    : parseFloat((entryPrice + slDistanceDollars).toFixed(2));

  // Compute Take Profits based on RRR
  const tp1Distance = slDistanceDollars * (targetRRR * 0.5);
  const tp2Distance = slDistanceDollars * targetRRR;
  const tp3Distance = slDistanceDollars * (targetRRR * 1.5);

  const tp1 = isBuy ? entryPrice + tp1Distance : entryPrice - tp1Distance;
  const tp2 = isBuy ? entryPrice + tp2Distance : entryPrice - tp2Distance;
  const tp3 = isBuy ? entryPrice + tp3Distance : entryPrice - tp3Distance;

  // Position Sizing & Money Risk Calculation
  const riskAmountUSD = (config.accountEquity * (config.riskPercent / 100));
  const rawLotSize = riskAmountUSD / (slDistanceDollars * 100);
  const recommendedLot = Math.max(0.01, parseFloat(rawLotSize.toFixed(2)));
  const projectedProfitTP2USD = parseFloat((recommendedLot * 100 * (tp2Distance)).toFixed(2));

  return {
    tradingStyle: style,
    entryPrice: parseFloat(entryPrice.toFixed(2)),
    stopLoss: stopLossPrice,
    takeProfit1: parseFloat(tp1.toFixed(2)),
    takeProfit2: parseFloat(tp2.toFixed(2)),
    takeProfit3: parseFloat(tp3.toFixed(2)),
    slPips: Math.round(slDistanceDollars * 10),
    tp2Pips: Math.round(tp2Distance * 10),
    riskRewardRatio: parseFloat(targetRRR.toFixed(1)),
    riskAmountUSD: parseFloat(riskAmountUSD.toFixed(2)),
    potentialProfitUSD: projectedProfitTP2USD,
    recommendedLot,
    riskConfigUsed: {
      tradingStyle: style,
      mode: config.mode,
      riskPercent: config.riskPercent,
      equity: config.accountEquity
    },
    tradeManagementRules: [
      `Gaya Trading: ${style} (${style === 'SCALPING' ? 'M5/M15 Fast Execution' : style === 'SWING' ? 'H4/D1 Multi-day Trend' : 'H1 Intraday'})`,
      `Stop Loss ditetapkan pada ${stopLossPrice} (${Math.round(slDistanceDollars * 10)} pips)`,
      `Pindahkan SL ke Break-Even (${entryPrice.toFixed(2)}) setelah TP1 (${tp1.toFixed(2)}) tersentuh`,
      `Rekomendasi Lot: ${recommendedLot} Lot untuk batas risiko $${riskAmountUSD.toFixed(2)} (${config.riskPercent}% akun)`
    ]
  };
}
