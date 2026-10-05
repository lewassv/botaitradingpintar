import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { getXauusdData, getDxyIndexData } from './src/services/marketData.js';
import { fetchLiveNews } from './src/services/newsFetcher.js';
import { fetchForexFactoryData } from './src/services/forexFactoryScraper.js';
import { generateTradingSignal } from './src/engine/signalGenerator.js';
import { getLearningState, recordTradeOutcome, runBacktestSimulation } from './src/engine/aiLearningEngine.js';
import { 
  getWhatsAppStatus, 
  updateWhatsAppConfig, 
  formatWhatsAppSignalAlert, 
  handleWhatsAppCommand, 
  logNotification 
} from './src/services/whatsappBotService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/**
 * GET /api/analysis
 * Returns comprehensive XAUUSD Signal, Technicals, News Sentiment, ForexFactory Calendar, and TP/SL Risk Setup
 */
app.get('/api/analysis', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'H1';
    
    const userRiskConfig = {
      tradingStyle: req.query.tradingStyle || 'INTRADAY',
      riskMode: req.query.riskMode || 'DYNAMIC_ATR',
      riskRewardRatio: req.query.rrr ? parseFloat(req.query.rrr) : undefined,
      fixedSlPips: req.query.fixedSlPips ? parseInt(req.query.fixedSlPips) : undefined,
      accountEquity: parseFloat(req.query.equity || 1000),
      riskPercent: parseFloat(req.query.riskPercent || 1.0)
    };

    const marketData = await getXauusdData(timeframe);
    const dxyData = await getDxyIndexData();
    const newsList = await fetchLiveNews();
    const ffData = await fetchForexFactoryData();

    const signal = generateTradingSignal(marketData.candles, newsList, dxyData, userRiskConfig);

    res.json({
      success: true,
      data: {
        signal,
        candles: marketData.candles,
        marketSource: marketData.source,
        dxy: dxyData,
        newsList,
        forexFactory: ffData
      }
    });
  } catch (err) {
    console.error('Error in /api/analysis:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/whatsapp/status
 * Returns WhatsApp bot connection state, target number, and notification logs
 */
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ success: true, waState: getWhatsAppStatus() });
});

/**
 * POST /api/whatsapp/config
 * Updates target phone number and alert toggles
 */
app.post('/api/whatsapp/config', (req, res) => {
  const updatedState = updateWhatsAppConfig(req.body);
  res.json({ success: true, waState: updatedState });
});

/**
 * POST /api/whatsapp/send-test
 * Sends formatted WhatsApp signal alert test
 */
app.post('/api/whatsapp/send-test', async (req, res) => {
  try {
    const marketData = await getXauusdData('H1');
    const dxyData = await getDxyIndexData();
    const newsList = await fetchLiveNews();
    const signalData = generateTradingSignal(marketData.candles, newsList, dxyData, req.body || {});

    const formattedMessage = formatWhatsAppSignalAlert(signalData);
    const log = logNotification(formattedMessage);

    res.json({ 
      success: true, 
      sentTo: getWhatsAppStatus().targetPhone,
      messageText: formattedMessage,
      log 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/command
 * Simulates or handles incoming WhatsApp commands (!signal, !berita, !buy, !sell, !scalp, !swing)
 */
app.post('/api/whatsapp/command', async (req, res) => {
  try {
    const commandText = req.body.command || '!signal';
    const marketData = await getXauusdData('H1');
    const dxyData = await getDxyIndexData();
    const newsList = await fetchLiveNews();
    const signal = generateTradingSignal(marketData.candles, newsList, dxyData, req.body.userConfig || {});

    const result = handleWhatsAppCommand(commandText, { signal, newsList, dxy: dxyData });

    res.json({
      success: true,
      result,
      waState: getWhatsAppStatus()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/news
 */
app.get('/api/news', async (req, res) => {
  try {
    const newsList = await fetchLiveNews();
    const ffData = await fetchForexFactoryData();
    res.json({ success: true, news: newsList, forexFactory: ffData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/learning
 */
app.get('/api/learning', (req, res) => {
  res.json({ success: true, state: getLearningState() });
});

/**
 * POST /api/backtest
 */
app.post('/api/backtest', async (req, res) => {
  try {
    const marketData = await getXauusdData('H1');
    const result = runBacktestSimulation(marketData.candles, req.body || {});
    res.json({ success: true, result, learningState: getLearningState() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/trade-outcome
 */
app.post('/api/trade-outcome', (req, res) => {
  try {
    const updatedState = recordTradeOutcome(req.body);
    res.json({ success: true, state: updatedState });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Smart XAUUSD AI Trading Bot Server running on http://localhost:${PORT}`);
});
