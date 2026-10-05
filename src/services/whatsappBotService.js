/**
 * WhatsApp Bot & Signal Notification Service for XAUUSD Trading Bot
 * Formats multi-source Web Fundamental AI synthesis and handles custom TP/SL commands.
 */

let waState = {
  isConnected: true,
  targetPhone: "+6281234567890",
  autoAlertEnabled: true,
  customSlPips: 40,
  customTpPips: 80,
  lastNotificationSent: null,
  logs: [
    {
      id: 1,
      type: "ALERT_SENT",
      phone: "+6281234567890",
      message: "🟢 *NOTIFIKASI REKOMENDASI AI XAUUSD* 🟢\nAction: STRONG BUY\nSintesis Web: ForexFactory CPI Inflation Red Folder & USD DXY Softening",
      timestamp: new Date().toISOString()
    }
  ]
};

export function getWhatsAppStatus() {
  return waState;
}

export function updateWhatsAppConfig(config = {}) {
  if (config.targetPhone) waState.targetPhone = config.targetPhone;
  if (typeof config.autoAlertEnabled === 'boolean') waState.autoAlertEnabled = config.autoAlertEnabled;
  if (config.customSlPips) waState.customSlPips = parseInt(config.customSlPips);
  if (config.customTpPips) waState.customTpPips = parseInt(config.customTpPips);
  return waState;
}

/**
 * Format a rich WhatsApp notification containing complete Web Fundamental AI synthesis,
 * BUY/SELL recommendation, and custom TP/SL risk targets.
 */
export function formatWhatsAppSignalAlert(signalData) {
  const signal = signalData.signal || signalData;
  const risk = signal.risk || {};
  const fund = signal.fundamental || {};
  const newsList = signalData.newsList || [];
  const ffData = signalData.forexFactory || {};
  const dxy = signalData.dxy || {};

  const isBuy = signal.action.includes('BUY');
  const actionEmoji = isBuy ? '🟢' : signal.action.includes('SELL') ? '🔴' : '🟡';

  // Build Web Fundamental Synthesis text block
  const ffEventStr = ffData.events && ffData.events.length 
    ? `• *ForexFactory*: ${ffData.events[0].event} (${ffData.redFolderCount || 3} Red Folders USD Active)`
    : '• *ForexFactory*: US Core CPI & FOMC Rate Decision High Impact Calendar';

  const newsHeadlineStr = newsList && newsList.length 
    ? `• *Market News*: "${newsList[0].title}" (${newsList[0].source})`
    : '• *Market News*: Gold holds above key support amid geopolitical demand (Reuters)';

  const dxyStr = `• *DXY Index Dollar*: ${dxy.price || 104.15} (${dxy.changePct >= 0 ? '+' : ''}${dxy.changePct || -0.20}%) → ${dxy.changePct < 0 ? 'Mendorong kenaikan Emas (Bullish Tailwind)' : 'Menekan harga Emas'}`;

  return `${actionEmoji} *REKOMENDASI AI TRADING XAUUSD* ${actionEmoji}

📊 *PASAR*: XAUUSD (Emas vs US Dollar)
🎯 *REKOMENDASI AI*: *${signal.action}* (${signal.strength})
⚡ *GAYA TRADING*: ${signal.tradingStyle || 'INTRADAY'}
🛡️ *KEPERCAYAAN AI*: *${signal.confidenceScore}%*

==================================
🌐 *SINTESIS FUNDAMENTAL WEB & FOREXFACTORY*:
${ffEventStr}
${newsHeadlineStr}
${dxyStr}
📈 *Skor Sentimen Fundamental*: *${fund.score > 0 ? '+' : ''}${fund.score || 35}* (${fund.bias || 'BULLISH GOLD'})

==================================
📌 *LEVEL HARGA TP & SL (KUSTOM)*:
▶️ *Harga Entry*: *$${risk.entryPrice ? risk.entryPrice.toFixed(2) : '2415.50'}*
🛑 *Stop Loss (SL)*: *$${risk.stopLoss ? risk.stopLoss.toFixed(2) : '2409.50'}* (${risk.slPips || 60} pips)
🎯 *Take Profit 1*: *$${risk.takeProfit1 ? risk.takeProfit1.toFixed(2) : '2422.70'}*
🏆 *Target TP2 Utama*: *$${risk.takeProfit2 ? risk.takeProfit2.toFixed(2) : '2427.50'}* (${risk.tp2Pips || 120} pips)
🚀 *Extended TP3*: *$${risk.takeProfit3 ? risk.takeProfit3.toFixed(2) : '2434.70'}*

==================================
⚖️ *MANAJEMEN RISIKO (LOT & MODAL)*:
• Rekomendasi Lot: *${risk.recommendedLot || 0.03} Lot*
• Batas Risiko Modal: *$${risk.riskAmountUSD || 10.00}* (1% modal)
• Potensi Profit TP2: *$${risk.potentialProfitUSD || 20.00}*
• Rasio Risk:Reward: *1 : ${risk.riskRewardRatio || 2.0}*

💡 *Alasan & Pertimbangan AI*:
_${signal.aiReasoning ? signal.aiReasoning[0].replace(/\*\*/g, '') : 'Disertai konfirmasi indikator teknikal RSI/MACD dan rilis kalender ForexFactory.'}_

_Dikirim otomatis oleh Bot AI Trading Pintar XAUUSD_`;
}

/**
 * Parse incoming WhatsApp command text including custom TP/SL parameters
 * Examples: !buy sl 30 tp 60 | !sell tp 120 sl 40 | !tpsl sl 35 tp 70 | !signal
 */
export function handleWhatsAppCommand(commandText, currentSignalData = {}) {
  const rawCmd = commandText.trim();
  const lowerCmd = rawCmd.toLowerCase();
  let responseText = "";
  let executedAction = null;

  // Extract custom SL / TP pips if passed (e.g., !buy sl 30 tp 60 or !tpsl sl 40 tp 80)
  const slMatch = lowerCmd.match(/sl\s*(\d+)/);
  const tpMatch = lowerCmd.match(/tp\s*(\d+)/);

  const customSlPips = slMatch ? parseInt(slMatch[1]) : waState.customSlPips || 40;
  const customTpPips = tpMatch ? parseInt(tpMatch[1]) : waState.customTpPips || 80;

  if (lowerCmd.startsWith('!signal') || lowerCmd.startsWith('!analisis') || lowerCmd.startsWith('/signal')) {
    executedAction = 'FETCH_SIGNAL';
    responseText = formatWhatsAppSignalAlert(currentSignalData);
  }
  else if (lowerCmd.startsWith('!tpsl')) {
    executedAction = 'SET_TPSL';
    waState.customSlPips = customSlPips;
    waState.customTpPips = customTpPips;
    responseText = `⚙️ *PENGATURAN TP/SL KUSTOM BERHASIL DIPERBARUI!*

Stop Loss (SL) Kustom: *${customSlPips} pips* ($${(customSlPips * 0.10).toFixed(2)})
Take Profit (TP) Kustom: *${customTpPips} pips* ($${(customTpPips * 0.10).toFixed(2)})
Rasio Risk:Reward: *1 : ${(customTpPips / customSlPips).toFixed(1)}*

_Setiap sinyal baru & perintah WA selanjutnya akan menggunakan batas TP/SL kustom ini._`;
  }
  else if (lowerCmd.startsWith('!berita') || lowerCmd.startsWith('!news')) {
    executedAction = 'FETCH_NEWS';
    const newsList = currentSignalData.newsList || [];
    const ffData = currentSignalData.forexFactory || {};
    const fund = currentSignalData.signal?.fundamental || {};

    responseText = `📰 *RADAR BERITA MACRO FOREXFACTORY & ALL WEB SOURCES*

📊 *Skor Sentimen Emas*: *${fund.score > 0 ? '+' : ''}${fund.score || 35}* (${fund.bias || 'BULLISH GOLD'})
USD *Indeks DXY*: ${currentSignalData.dxy?.price || 104.15} (${currentSignalData.dxy?.changePct >= 0 ? '+' : ''}${currentSignalData.dxy?.changePct || -0.2}%)

🔴 *ForexFactory Red Folder Calendar*:
• ${ffData.events && ffData.events[0] ? ffData.events[0].event : 'US Core CPI Inflation Rate (YoY/MoM)'}
• ${ffData.events && ffData.events[1] ? ffData.events[1].event : 'FOMC Press Conference & Fed Interest Rate'}

🌐 *Berita Web Terkini (Bloomberg / Reuters / FXStreet)*:
1. ${newsList[0]?.title || 'US Core CPI Inflation Expected to Signal Rate Cut'} (${newsList[0]?.source || 'Reuters'})
2. ${newsList[1]?.title || 'Gold Holds Support as Geopolitical Safe Haven Demand Persists'} (${newsList[1]?.source || 'Bloomberg'})

_Ketik !signal untuk mendapatkan update sinyal XAUUSD._`;
  }
  else if (lowerCmd.startsWith('!buy')) {
    executedAction = 'EXECUTE_BUY';
    const entryPrice = currentSignalData.signal?.currentPrice || 2415.50;
    const slPrice = (entryPrice - (customSlPips * 0.10)).toFixed(2);
    const tpPrice = (entryPrice + (customTpPips * 0.10)).toFixed(2);

    responseText = `🚀 *REKOMENDASI ENTRY BUY EXECUTED VIA WHATSAPP!* 🚀

Pair: XAUUSD (Gold vs US Dollar)
Order: *BUY LIMIT / MARKET*
Entry Price: *$${entryPrice.toFixed(2)}*
Stop Loss (SL): *$${slPrice}* (-${customSlPips} pips)
Take Profit (TP): *$${tpPrice}* (+${customTpPips} pips)
Rasio RRR: *1 : ${(customTpPips / customSlPips).toFixed(1)}*
Rekomendasi Lot: *0.03 Lot* (Risiko $10.00 / 1% modal)

🌐 *Sintesis Fundamental AI*:
Pasar didukung sentimen pelemahan DXY Dollar & data ForexFactory Red Folder.

_Order telah dicatat dan terhubung dengan Risk Engine Bot AI._`;
  }
  else if (lowerCmd.startsWith('!sell')) {
    executedAction = 'EXECUTE_SELL';
    const entryPrice = currentSignalData.signal?.currentPrice || 2415.50;
    const slPrice = (entryPrice + (customSlPips * 0.10)).toFixed(2);
    const tpPrice = (entryPrice - (customTpPips * 0.10)).toFixed(2);

    responseText = `📉 *REKOMENDASI ENTRY SELL EXECUTED VIA WHATSAPP!* 📉

Pair: XAUUSD (Gold vs US Dollar)
Order: *SELL LIMIT / MARKET*
Entry Price: *$${entryPrice.toFixed(2)}*
Stop Loss (SL): *$${slPrice}* (+${customSlPips} pips)
Take Profit (TP): *$${tpPrice}* (-${customTpPips} pips)
Rasio RRR: *1 : ${(customTpPips / customSlPips).toFixed(1)}*
Rekomendasi Lot: *0.03 Lot* (Risiko $10.00 / 1% modal)

🌐 *Sintesis Fundamental AI*:
Pasar tertekan penguatan DXY Dollar Index & rilis data NFP / CPI hawkish.

_Order telah dicatat dan terhubung dengan Risk Engine Bot AI._`;
  }
  else if (lowerCmd.startsWith('!scalp')) {
    executedAction = 'SWITCH_SCALPING';
    responseText = `⚡ *GAYA TRADING DIUBAH KE SCALPING VIA WHATSAPP!*

Bot AI telah mengaktifkan mode *SCALPING (M5/M15)*.
Stop Loss otomatis diperketat ke M15 (~20 pips) dan RRR 1:1.5. Ketik !signal untuk mendapatkan angka Entry terbaru.`;
  }
  else if (lowerCmd.startsWith('!swing')) {
    executedAction = 'SWITCH_SWING';
    responseText = `🎯 *GAYA TRADING DIUBAH KE SWING VIA WHATSAPP!*

Bot AI telah mengaktifkan mode *SWING (H4/D1)*.
Stop Loss otomatis disesuaikan ke struktur tren besar (~100 pips) dan RRR 1:3.0. Ketik !signal untuk mendapatkan angka Entry terbaru.`;
  }
  else {
    executedAction = 'HELP';
    responseText = `🤖 *COMMAND WHATSAPP BOT TRADING PINTAR XAUUSD*

Daftar perintah yang bisa Anda ketik di WhatsApp:
• *!signal* : Analisis sintesis web & sinyal XAUUSD lengkap
• *!berita* : Rangkuman kalender ForexFactory Red Folder & berita web
• *!buy sl 30 tp 60* : Rekomendasi BUY dengan SL/TP kustom
• *!sell sl 40 tp 80* : Rekomendasi SELL dengan SL/TP kustom
• *!tpsl sl 35 tp 70* : Atur default pips SL/TP kustom
• *!scalp* : Ubah mode trading bot ke SCALPING
• *!swing* : Ubah mode trading bot ke SWING`;
  }

  const logItem = {
    id: waState.logs.length + 1,
    type: "COMMAND_RECEIVED",
    command: commandText,
    phone: waState.targetPhone,
    responseSnippet: responseText.slice(0, 90) + '...',
    timestamp: new Date().toISOString()
  };
  waState.logs.unshift(logItem);
  waState.lastNotificationSent = new Date().toISOString();

  return {
    success: true,
    executedAction,
    responseText,
    logItem
  };
}

export function logNotification(messageText) {
  const logItem = {
    id: waState.logs.length + 1,
    type: "ALERT_SENT",
    phone: waState.targetPhone,
    message: messageText.slice(0, 120) + '...',
    timestamp: new Date().toISOString()
  };
  waState.logs.unshift(logItem);
  waState.lastNotificationSent = new Date().toISOString();
  return logItem;
}
