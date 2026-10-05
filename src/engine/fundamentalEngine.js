/**
 * Fundamental & Sentiment Analysis Engine for XAUUSD (Gold / US Dollar)
 */

export function analyzeFundamental(newsList, dxyData = { price: 104.10, changePct: -0.15 }) {
  let sentimentScore = 0;
  const headlineAnalyses = [];
  const keyDrivers = [];

  // Keywords dictionary for Gold vs USD impact
  const goldBullishKeywords = [
    { word: 'rate cut', weight: 25 },
    { word: 'dovish', weight: 20 },
    { word: 'inflation sticky', weight: 15 },
    { word: 'geopolitical', weight: 20 },
    { word: 'safe-haven', weight: 20 },
    { word: 'war', weight: 25 },
    { word: 'conflict', weight: 20 },
    { word: 'dollar weakens', weight: 20 },
    { word: 'dollar retreats', weight: 15 },
    { word: 'treasury yields fall', weight: 20 },
    { word: 'gold surges', weight: 15 },
    { word: 'recession risk', weight: 20 }
  ];

  const goldBearishKeywords = [
    { word: 'rate hike', weight: 25 },
    { word: 'hawkish', weight: 20 },
    { word: 'fed delays cut', weight: 20 },
    { word: 'strong nfp', weight: 20 },
    { word: 'dollar rallies', weight: 20 },
    { word: 'dxy rises', weight: 15 },
    { word: 'treasury yields surge', weight: 20 },
    { word: 'strong jobs', weight: 15 },
    { word: 'gold drops', weight: 15 },
    { word: 'soft inflation', weight: 10 }
  ];

  // 1. Analyze News Headlines
  newsList.forEach(news => {
    const text = (news.title + ' ' + (news.category || '')).toLowerCase();
    let itemScore = 0;
    const detectedTags = [];

    goldBullishKeywords.forEach(kw => {
      if (text.includes(kw.word)) {
        itemScore += kw.weight;
        detectedTags.push(`Bullish: ${kw.word}`);
      }
    });

    goldBearishKeywords.forEach(kw => {
      if (text.includes(kw.word)) {
        itemScore -= kw.weight;
        detectedTags.push(`Bearish: ${kw.word}`);
      }
    });

    // Default neutral evaluation fallback based on Category
    if (detectedTags.length === 0) {
      if (news.category === 'Geopolitics / Safe-Haven') {
        itemScore += 15;
        detectedTags.push('Safe Haven Demand Boost');
      } else if (news.category === 'FED / Interest Rate') {
        itemScore += 5; // Default Fed uncertainty slightly favors gold
      }
    }

    sentimentScore += itemScore;

    headlineAnalyses.push({
      title: news.title,
      source: news.source,
      category: news.category,
      impactScore: itemScore,
      bias: itemScore > 0 ? 'BULLISH GOLD' : itemScore < 0 ? 'BEARISH GOLD' : 'NEUTRAL',
      tags: detectedTags
    });
  });

  // 2. DXY (US Dollar Index) Inverse Correlation Effect
  let dxyImpact = 0;
  if (dxyData.changePct < -0.2) {
    dxyImpact = 25;
    keyDrivers.push(`DXY Dollar Index falling (${dxyData.changePct}%) → Strong Tailwind for XAUUSD`);
  } else if (dxyData.changePct > 0.2) {
    dxyImpact = -25;
    keyDrivers.push(`DXY Dollar Index strengthening (+${dxyData.changePct}%) → Headwind for XAUUSD`);
  } else {
    keyDrivers.push(`DXY Dollar Index steady around ${dxyData.price} → Neutral FX Pressure`);
  }
  sentimentScore += dxyImpact;

  // Normalize final score between -100 and +100
  sentimentScore = Math.max(-100, Math.min(100, sentimentScore));

  let overallBias = 'NEUTRAL';
  if (sentimentScore >= 30) overallBias = 'BULLISH GOLD (XAU)';
  else if (sentimentScore <= -30) overallBias = 'BEARISH GOLD (XAU)';

  return {
    score: sentimentScore,
    bias: overallBias,
    dxy: {
      price: dxyData.price,
      changePct: dxyData.changePct,
      impactScore: dxyImpact
    },
    keyDrivers,
    headlineAnalyses: headlineAnalyses.slice(0, 8),
    summary: `${overallBias} (Sentiment Score: ${sentimentScore > 0 ? '+' : ''}${sentimentScore}) based on ${headlineAnalyses.length} headlines and DXY index.`
  };
}
