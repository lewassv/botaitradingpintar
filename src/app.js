/**
 * Frontend Controller for Bot AI Trading Pintar XAUUSD with TradingView Widget
 */

let tvWidget = null;
let currentAnalysis = null;
let activeTimeframe = 'H1';
let activeTradingStyle = 'INTRADAY';

const TF_MAP = {
  'M5': '5',
  'M15': '15',
  'H1': '60',
  'H4': '240',
  'D1': 'D'
};

document.addEventListener('DOMContentLoaded', () => {
  initTradingViewChart('60');
  fetchAnalysisData();
  fetchWhatsAppStatus();
  setupEventListeners();

  setInterval(() => {
    fetchAnalysisData(true);
  }, 10000);
});

function initTradingViewChart(intervalStr = '60') {
  const container = document.getElementById('tradingview_xauusd_chart');
  if (!container) return;

  container.innerHTML = '';

  if (window.TradingView) {
    tvWidget = new window.TradingView.widget({
      autosize: true,
      symbol: "OANDA:XAUUSD",
      interval: intervalStr,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#090d18",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      container_id: "tradingview_xauusd_chart"
    });
  } else {
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:#94a3b8;">TradingView Widget Loading...</div>';
  }
}

async function fetchAnalysisData(isSilent = false) {
  try {
    if (!isSilent) {
      document.getElementById('btn-refresh').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
    }

    const riskParams = getRiskConfigFromForm();
    const query = new URLSearchParams({
      timeframe: activeTimeframe,
      tradingStyle: activeTradingStyle,
      ...riskParams
    }).toString();

    const response = await fetch(`/api/analysis?${query}`);
    const result = await response.json();

    if (result.success) {
      currentAnalysis = result.data;
      updateUI(result.data);
    }
  } catch (err) {
    console.error('Failed to fetch analysis data:', err);
  } finally {
    document.getElementById('btn-refresh').innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh Analisis';
  }
}

async function fetchWhatsAppStatus() {
  try {
    const res = await fetch('/api/whatsapp/status');
    const result = await res.json();
    if (result.success && result.waState) {
      document.getElementById('wa-phone-input').value = result.waState.targetPhone;
      document.getElementById('wa-auto-alert-toggle').checked = result.waState.autoAlertEnabled;
      if (document.getElementById('wa-sl-input')) document.getElementById('wa-sl-input').value = result.waState.customSlPips || 40;
      if (document.getElementById('wa-tp-input')) document.getElementById('wa-tp-input').value = result.waState.customTpPips || 80;
      document.getElementById('top-wa-status').textContent = `Connected (${result.waState.targetPhone})`;
    }
  } catch (e) {
    console.warn('Failed to fetch WA status:', e.message);
  }
}

function getRiskConfigFromForm() {
  return {
    riskMode: document.getElementById('cfg-risk-mode').value,
    rrr: document.getElementById('cfg-rrr').value,
    fixedSlPips: document.getElementById('cfg-sl-pips').value,
    equity: document.getElementById('cfg-equity').value,
    riskPercent: document.getElementById('cfg-risk-pct').value
  };
}

function updateUI(data) {
  const { signal, dxy, newsList, forexFactory } = data;

  // 1. Tickers & Header
  if (signal.currentPrice) {
    document.getElementById('live-gold-price').textContent = `$${signal.currentPrice.toFixed(2)}`;
  }
  if (dxy) {
    document.getElementById('live-dxy-price').textContent = dxy.price.toFixed(2);
    const dxyChangeEl = document.getElementById('live-dxy-change');
    dxyChangeEl.textContent = `${dxy.changePct >= 0 ? '+' : ''}${dxy.changePct}%`;
    dxyChangeEl.className = `ticker-change ${dxy.changePct >= 0 ? 'positive' : 'negative'}`;
  }

  const styleLabel = activeTradingStyle === 'SCALPING' ? '⚡ SCALPING (M5/M15)' : activeTradingStyle === 'SWING' ? '🎯 SWING (H4/D1)' : '⚖️ INTRADAY (H1)';
  document.getElementById('live-active-style').textContent = styleLabel;

  if (signal.learningModel) {
    document.getElementById('side-winrate').textContent = `${signal.learningModel.winRate}% Win Rate`;
    document.getElementById('side-trades').textContent = `${signal.learningModel.totalTrades} Trade Teruji`;
  }

  // 2. Technical Indicators Radar
  const tech = signal.technical;
  if (tech && tech.indicators) {
    document.getElementById('tech-score-pill').textContent = `Skor: ${tech.score > 0 ? '+' : ''}${tech.score} (${tech.trend})`;
    document.getElementById('val-rsi').textContent = tech.indicators.rsi;
    document.getElementById('bar-rsi').style.width = `${Math.min(100, Math.max(0, tech.indicators.rsi))}%`;

    const macd = tech.indicators.macd;
    document.getElementById('val-macd').textContent = `${macd.histogram >= 0 ? '+' : ''}${macd.histogram} (MACD ${macd.macd})`;
    document.getElementById('val-atr').textContent = `$${tech.indicators.atr} / candle`;
    document.getElementById('val-ema').textContent = `Price ${signal.currentPrice > tech.indicators.ema20 ? '>' : '<'} EMA 20 ($${tech.indicators.ema20})`;

    const patternBox = document.getElementById('pattern-container');
    patternBox.innerHTML = '';
    if (tech.indicators.patterns && tech.indicators.patterns.length) {
      tech.indicators.patterns.forEach(p => {
        patternBox.innerHTML += `<span class="chip ${p.bias === 'BULLISH' ? 'chip-bullish' : 'chip-bearish'}"><i class="fa-solid fa-fire"></i> ${p.name}</span>`;
      });
    } else {
      patternBox.innerHTML = `<span class="chip chip-neutral"><i class="fa-solid fa-layer-group"></i> S/R Support $${tech.indicators.support[0] || 'N/A'}</span>`;
    }
  }

  // 3. Update Weights
  if (signal.aiWeights) {
    const techW = Math.round(signal.aiWeights.technical * 100);
    const fundW = Math.round(signal.aiWeights.fundamental * 100);
    const paW = Math.round(signal.aiWeights.priceAction * 100);

    document.getElementById('weight-tech-pct').textContent = `${techW}%`;
    document.getElementById('bar-weight-tech').style.width = `${techW}%`;

    document.getElementById('weight-fund-pct').textContent = `${fundW}%`;
    document.getElementById('bar-weight-fund').style.width = `${fundW}%`;

    document.getElementById('weight-pa-pct').textContent = `${paW}%`;
    document.getElementById('bar-weight-pa').style.width = `${paW}%`;
  }

  // 4. Update Primary Signal Card
  const actionBadge = document.getElementById('signal-action');
  const actionText = document.getElementById('action-text');
  const strengthText = document.getElementById('strength-text');
  
  actionText.textContent = signal.action;
  strengthText.textContent = signal.strength;
  document.getElementById('signal-confidence').innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${signal.confidenceScore}% Confidence`;

  if (signal.action.includes('BUY')) {
    actionBadge.className = 'signal-action-badge action-buy';
  } else if (signal.action.includes('SELL')) {
    actionBadge.className = 'signal-action-badge action-sell';
  } else {
    actionBadge.className = 'signal-action-badge action-hold';
  }

  // 5. Update TP / SL & Lot Risk Matrix
  const risk = signal.risk;
  if (risk) {
    document.getElementById('val-entry').textContent = `$${risk.entryPrice.toFixed(2)}`;
    document.getElementById('val-sl').textContent = `$${risk.stopLoss.toFixed(2)}`;
    document.getElementById('val-sl-pips').textContent = `(${risk.slPips} pips)`;

    document.getElementById('val-tp1').textContent = `$${risk.takeProfit1.toFixed(2)}`;
    document.getElementById('val-tp2').textContent = `$${risk.takeProfit2.toFixed(2)}`;
    document.getElementById('val-tp2-pips').textContent = `(${risk.tp2Pips} pips)`;
    document.getElementById('val-tp3').textContent = `$${risk.takeProfit3.toFixed(2)}`;

    document.getElementById('val-rrr').textContent = `1 : ${risk.riskRewardRatio}`;
    document.getElementById('val-lot').textContent = `${risk.recommendedLot} Lot`;
    document.getElementById('val-risk-usd').textContent = `-$${risk.riskAmountUSD.toFixed(2)} (${risk.riskConfigUsed.riskPercent}%)`;
    document.getElementById('val-profit-usd').textContent = `+$${risk.potentialProfitUSD.toFixed(2)}`;
  }

  // 6. Update News, Sentiment & ForexFactory Calendar
  const fund = signal.fundamental;
  if (fund) {
    document.getElementById('news-sentiment-badge').textContent = `Sentimen: ${fund.score > 0 ? '+' : ''}${fund.score} (${fund.bias})`;
    const meterPct = Math.min(95, Math.max(5, 50 + (fund.score / 2)));
    document.getElementById('sentiment-pointer').style.left = `${meterPct}%`;
  }

  if (forexFactory && forexFactory.events) {
    const ffContainer = document.getElementById('ff-events-container');
    ffContainer.innerHTML = forexFactory.events.map(ev => `
      <div class="ff-event-card">
        <span class="ff-badge red">${ev.impact === 'HIGH_RED_FOLDER' ? '🔴 FOREXFACTORY HIGH IMPACT' : '🟠 MEDIUM IMPACT'}</span>
        <span class="ff-title">${ev.event}</span>
        <span class="ff-sub">${ev.status || 'Dampak signifikan terhadap volatilitas XAUUSD & DXY'}</span>
      </div>
    `).join('');
  }

  if (newsList && newsList.length) {
    const newsContainer = document.getElementById('news-feed-container');
    newsContainer.innerHTML = newsList.map(n => `
      <div class="news-item">
        <a href="${n.link}" target="_blank" class="news-title">${n.title}</a>
        <div class="news-meta">
          <span><i class="fa-solid fa-building-columns"></i> ${n.source}</span>
          <span class="gold-text"><i class="fa-solid fa-tag"></i> ${n.category}</span>
        </div>
      </div>
    `).join('');
  }

  // 7. Update AI Reasoning
  const reasoningList = document.getElementById('ai-reasoning-list');
  if (signal.aiReasoning && signal.aiReasoning.length) {
    reasoningList.innerHTML = signal.aiReasoning.map(r => `<li>${r.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</li>`).join('');
  }
}

function setupEventListeners() {
  document.getElementById('btn-refresh').addEventListener('click', () => fetchAnalysisData());

  // SIDEBAR MULTI-TAB SWITCHING
  document.querySelectorAll('.sidebar-menu .nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.nav-item');
      const targetViewId = targetBtn.dataset.target;

      document.querySelectorAll('.sidebar-menu .nav-item').forEach(b => b.classList.remove('active'));
      targetBtn.classList.add('active');

      document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.remove('active');
      });

      const targetView = document.getElementById(targetViewId);
      if (targetView) {
        targetView.classList.add('active');
      }
    });
  });

  // Trading Style Switcher buttons
  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
      const targetBtn = e.target.closest('.style-btn');
      targetBtn.classList.add('active');
      activeTradingStyle = targetBtn.dataset.style;

      if (activeTradingStyle === 'SCALPING') activeTimeframe = 'M15';
      else if (activeTradingStyle === 'SWING') activeTimeframe = 'H4';
      else activeTimeframe = 'H1';

      document.querySelectorAll('.tf-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tf === activeTimeframe);
      });
      document.getElementById('active-timeframe').textContent = `${activeTimeframe} Timeframe`;

      // Update TradingView chart timeframe
      initTradingViewChart(TF_MAP[activeTimeframe] || '60');
      fetchAnalysisData();
    });
  });

  // Timeframe buttons
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeTimeframe = e.target.dataset.tf;
      document.getElementById('active-timeframe').textContent = `${activeTimeframe} Timeframe`;

      // Re-init TradingView Chart interval
      initTradingViewChart(TF_MAP[activeTimeframe] || '60');
      fetchAnalysisData();
    });
  });

  // Risk Mode change toggle fixed pips field visibility
  document.getElementById('cfg-risk-mode').addEventListener('change', (e) => {
    const groupFixedPips = document.getElementById('group-fixed-pips');
    groupFixedPips.style.display = e.target.value === 'FIXED_PIPS' ? 'block' : 'none';
  });

  // Apply Risk Config button
  document.getElementById('btn-apply-risk').addEventListener('click', () => {
    fetchAnalysisData();
  });

  // WHATSAPP BOT ACTIONS
  document.getElementById('btn-save-wa-config').addEventListener('click', async () => {
    const phone = document.getElementById('wa-phone-input').value;
    const autoAlert = document.getElementById('wa-auto-alert-toggle').checked;
    const slPips = document.getElementById('wa-sl-input').value;
    const tpPips = document.getElementById('wa-tp-input').value;

    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetPhone: phone, 
          autoAlertEnabled: autoAlert,
          customSlPips: slPips,
          customTpPips: tpPips
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Pengaturan WhatsApp & SL/TP Kustom (${slPips} pips SL / ${tpPips} pips TP) berhasil disimpan!`);
        document.getElementById('top-wa-status').textContent = `Connected (${phone})`;
      }
    } catch (e) {
      alert('Error saving WA config: ' + e.message);
    }
  });

  document.getElementById('btn-send-wa-test').addEventListener('click', async () => {
    try {
      document.getElementById('btn-send-wa-test').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim WA...';
      const riskParams = getRiskConfigFromForm();

      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradingStyle: activeTradingStyle, ...riskParams })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Notifikasi Sintesis AI & Sinyal terformat berhasil dikirimkan ke WhatsApp (${data.sentTo})!\n\nPratinjau Pesan WA:\n${data.messageText}`);
        
        appendChatBubble('USER', `[Auto Test Trigger] Send Web Fundamental Synthesis & Signal Alert to ${data.sentTo}`);
        appendChatBubble('BOT', data.messageText);
      }
    } catch (e) {
      alert('Error sending WA test alert: ' + e.message);
    } finally {
      document.getElementById('btn-send-wa-test').innerHTML = '<i class="fa-brands fa-whatsapp"></i> Test Kirim Notifikasi Sintesis AI ke WA';
    }
  });

  // WhatsApp Terminal Command execution
  const sendCmdBtn = document.getElementById('btn-send-wa-cmd');
  const cmdInput = document.getElementById('wa-cmd-input');

  const executeWaCmd = async (commandText) => {
    if (!commandText) return;
    appendChatBubble('USER', commandText);
    cmdInput.value = '';

    try {
      const riskParams = getRiskConfigFromForm();
      const res = await fetch('/api/whatsapp/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandText,
          userConfig: { tradingStyle: activeTradingStyle, ...riskParams }
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        appendChatBubble('BOT', data.result.responseText);

        if (data.result.executedAction === 'SWITCH_SCALPING') {
          activeTradingStyle = 'SCALPING';
          fetchAnalysisData();
        } else if (data.result.executedAction === 'SWITCH_SWING') {
          activeTradingStyle = 'SWING';
          fetchAnalysisData();
        }
      }
    } catch (e) {
      appendChatBubble('BOT', 'Error processing command: ' + e.message);
    }
  };

  sendCmdBtn.addEventListener('click', () => executeWaCmd(cmdInput.value));
  cmdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeWaCmd(cmdInput.value);
  });

  document.querySelectorAll('.wa-quick-chips .chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => executeWaCmd(e.target.dataset.cmd));
  });

  // Modal Backtest events
  const modal = document.getElementById('modal-backtest');
  document.getElementById('btn-open-backtest').addEventListener('click', () => modal.classList.add('active'));
  document.getElementById('btn-trigger-backtest').addEventListener('click', () => modal.classList.add('active'));
  document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.remove('active'));

  document.getElementById('btn-start-sim-run').addEventListener('click', async () => {
    const statusBox = document.getElementById('modal-sim-status');
    statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Melatih Model AI dengan Historical Data...';

    try {
      const response = await fetch('/api/backtest', { method: 'POST' });
      const resData = await response.json();
      if (resData.success) {
        statusBox.innerHTML = `<i class="fa-solid fa-check green-text"></i> Training Selesai! Win rate model: <b>${resData.result.winRate}%</b> (${resData.result.wins} Win / ${resData.result.losses} Loss). PnL: $${resData.result.netPnL}.`;
        document.getElementById('sim-stats-container').style.display = 'grid';
        document.getElementById('sim-val-trades').textContent = resData.result.totalTrades;
        document.getElementById('sim-val-winrate').textContent = `${resData.result.winRate}%`;
        document.getElementById('sim-val-pnl').textContent = `$${resData.result.netPnL.toFixed(2)}`;

        fetchAnalysisData(true);
      }
    } catch (e) {
      statusBox.innerHTML = 'Error running simulation: ' + e.message;
    }
  });

  document.getElementById('btn-simulate-trade-win').addEventListener('click', async () => {
    try {
      const payload = {
        action: 'BUY',
        wasWin: true,
        fundScoreMagnitude: 40,
        techScoreMagnitude: 30,
        entry: currentAnalysis ? currentAnalysis.signal.currentPrice : 2415.50,
        sl: 2409.50,
        tp: 2427.50,
        pnl: 160.00
      };
      const response = await fetch('/api/trade-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();
      if (resData.success) {
        alert('Trade WIN tercatat! Bobot AI diperbarui secara otomatis.');
        fetchAnalysisData(true);
      }
    } catch (e) {
      console.error(e);
    }
  });
}

function appendChatBubble(sender, text) {
  const container = document.getElementById('wa-chat-container');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender === 'USER' ? 'user-bubble' : 'bot-bubble'}`;
  
  if (sender === 'BOT') {
    bubble.innerHTML = `<span class="sender-name">🤖 Bot AI Trading XAUUSD</span><p>${text.replace(/\n/g, '<br>')}</p>`;
  } else {
    bubble.innerHTML = `<p>${text}</p>`;
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}
