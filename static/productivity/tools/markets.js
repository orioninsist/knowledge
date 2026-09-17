(() => {
  "use strict";

  const register = shared => {
    const { workspace, escapeHtml, getTool } = shared;

    const MARKET_FIAT_SYMBOLS = ["USD", "EUR", "GBP", "CHF", "SEK", "NOK", "DKK", "CAD", "AUD", "JPY"];
    const MARKET_FIAT_NAMES = { USD:"US Dollar", EUR:"Euro", GBP:"British Pound", CHF:"Swiss Franc", SEK:"Swedish Krona", NOK:"Norwegian Krone", DKK:"Danish Krone", CAD:"Canadian Dollar", AUD:"Australian Dollar", JPY:"Japanese Yen" };
    const MARKET_CRYPTO = [{symbol:"BTC",name:"Bitcoin"},{symbol:"ETH",name:"Ethereum"}];
    const TROY_OUNCE_GRAMS = 31.1034768;

    const marketNumber = (value, options={}) => typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("en-US", {maximumFractionDigits:2,...options}).format(value) : "—";
    const marketPrice = (value,currency,options={}) => {
      if (typeof value !== "number" || !Number.isFinite(value)) return "—";
      try { return new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:2,...options}).format(value); }
      catch { return `${marketNumber(value,options)} ${currency}`; }
    };

    const fetchJson = async url => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(url,{headers:{Accept:"application/json"},cache:"no-store",signal:controller.signal});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        if (error?.name === "AbortError") throw new Error("Request timed out");
        throw error;
      } finally { clearTimeout(timeout); }
    };

    const fetchFiatMarkets = async () => {
      const symbols=["TRY",...MARKET_FIAT_SYMBOLS].filter((v,i,a)=>a.indexOf(v)===i).join(",");
      const data=await fetchJson(`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${encodeURIComponent(symbols)}`);
      const rates={EUR:1,...(data.rates??{})};
      const tryPerEuro=Number(rates.TRY);
      if(!Number.isFinite(tryPerEuro)) throw new Error("TRY reference rate unavailable");
      const tryRates=Object.fromEntries(MARKET_FIAT_SYMBOLS.map(symbol=>{
        const unitsPerEuro=Number(rates[symbol]);
        return [symbol,symbol==="EUR"?tryPerEuro:tryPerEuro/unitsPerEuro];
      }));
      return {date:data.date??null,rates:tryRates,cross:rates};
    };
    const fetchGoldMarket = async () => {
      const data=await fetchJson("https://api.gold-api.com/price/XAU");
      const usdPerOunce=Number(data.price);
      if(!Number.isFinite(usdPerOunce)) throw new Error("Gold price unavailable");
      return {usdPerOunce,usdPerGram:usdPerOunce/TROY_OUNCE_GRAMS};
    };
    const fetchCryptoMarket = async symbol => {
      const data=await fetchJson(`https://api.gold-api.com/price/${encodeURIComponent(symbol)}`);
      const usd=Number(data.price);
      if(!Number.isFinite(usd)) throw new Error(`${symbol} price unavailable`);
      return {symbol,usd};
    };

    const loading = label => `<div class="market-state"><strong>Loading ${escapeHtml(label)}…</strong><span>Fetching current market data.</span></div>`;
    const errorView = (label,error) => `<div class="market-state market-state-error"><strong>${escapeHtml(label)} unavailable</strong><span>${escapeHtml(error?.message??"Could not load market data.")}</span></div>`;

    const renderFiat = data => {
      const el=workspace.querySelector("#market-currencies"); if(!el)return;
      el.innerHTML=`<div class="market-card-grid">${MARKET_FIAT_SYMBOLS.map(symbol=>{const value=data.rates[symbol];return `<article class="market-card"><div class="market-card-head"><div><strong>${symbol}</strong><span>${MARKET_FIAT_NAMES[symbol]}</span></div><small>TRY</small></div><div class="market-value">${Number.isFinite(value)?`${marketNumber(value,{minimumFractionDigits:value<1?4:2,maximumFractionDigits:value<1?4:2})} ₺`:"—"}</div><div class="market-caption">1 ${symbol} in TRY</div></article>`}).join("")}</div><div class="market-source-note">Reference date: <strong>${escapeHtml(data.date??"—")}</strong> · daily reference rates</div>`;
    };
    const renderGold = (gold,fiat) => {
      const el=workspace.querySelector("#market-gold"); if(!el)return;
      const usdTry=Number(fiat?.rates?.USD), tryOz=gold.usdPerOunce*usdTry, tryGram=gold.usdPerGram*usdTry;
      el.innerHTML=`<div class="market-feature-grid"><article class="market-feature-card"><div class="market-feature-label"><span>Gold</span><strong>XAU / oz</strong></div><div class="market-feature-price">${marketPrice(gold.usdPerOunce,"USD")}</div><div class="market-secondary-price">${Number.isFinite(tryOz)?`${marketNumber(tryOz)} ₺`:"TRY unavailable"}</div></article><article class="market-feature-card"><div class="market-feature-label"><span>Gold</span><strong>1 gram</strong></div><div class="market-feature-price">${marketPrice(gold.usdPerGram,"USD")}</div><div class="market-secondary-price">${Number.isFinite(tryGram)?`${marketNumber(tryGram)} ₺`:"TRY unavailable"}</div></article></div><div class="market-source-note">Spot XAU/USD · gram calculated from 1 troy oz = 31.1034768 g</div>`;
    };
    const renderCrypto = (crypto,fiat) => {
      const el=workspace.querySelector("#market-crypto"); if(!el)return;
      const usdTry=Number(fiat?.rates?.USD), usdPerEuro=Number(fiat?.cross?.USD);
      el.innerHTML=`<div class="market-feature-grid">${crypto.map(asset=>{const def=MARKET_CRYPTO.find(x=>x.symbol===asset.symbol);const eur=asset.usd/usdPerEuro,tryValue=asset.usd*usdTry;return `<article class="market-feature-card"><div class="market-feature-label"><span>${def?.name??asset.symbol}</span><strong>${asset.symbol}</strong></div><div class="market-feature-price">${marketPrice(asset.usd,"USD")}</div><div class="market-price-row"><span>${Number.isFinite(eur)?marketPrice(eur,"EUR"):"EUR —"}</span><span>${Number.isFinite(tryValue)?`${marketNumber(tryValue)} ₺`:"TRY —"}</span></div></article>`}).join("")}</div><div class="market-source-note">BTC and ETH spot reference prices</div>`;
    };

    let requestId=0;
    const loadMarkets = async () => {
      const id=++requestId;
      const fiatEl=workspace.querySelector("#market-currencies"),goldEl=workspace.querySelector("#market-gold"),cryptoEl=workspace.querySelector("#market-crypto"),refresh=workspace.querySelector("#markets-refresh"),updated=workspace.querySelector("#markets-updated");
      if(!fiatEl||!goldEl||!cryptoEl)return;
      fiatEl.innerHTML=loading("currencies");goldEl.innerHTML=loading("gold");cryptoEl.innerHTML=loading("crypto");
      if(refresh){refresh.disabled=true;refresh.textContent="Refreshing…"} if(updated)updated.textContent="Updating market data…";
      try {
        const [fiatResult,goldResult,cryptoResult]=await Promise.allSettled([fetchFiatMarkets(),fetchGoldMarket(),Promise.all(MARKET_CRYPTO.map(x=>fetchCryptoMarket(x.symbol)))]);
        if(id!==requestId||getTool?.()!=="markets")return;
        const fiat=fiatResult.status==="fulfilled"?fiatResult.value:null;
        fiat?renderFiat(fiat):fiatEl.innerHTML=errorView("Currencies",fiatResult.reason);
        goldResult.status==="fulfilled"?renderGold(goldResult.value,fiat):goldEl.innerHTML=errorView("Gold",goldResult.reason);
        cryptoResult.status==="fulfilled"?renderCrypto(cryptoResult.value,fiat):cryptoEl.innerHTML=errorView("Crypto",cryptoResult.reason);
        if(updated)updated.textContent=`Updated ${new Intl.DateTimeFormat("tr-TR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date())}`;
      } finally {
        if(id===requestId&&refresh){refresh.disabled=false;refresh.textContent="Refresh";}
      }
    };

    const render = () => {
      workspace.innerHTML=`<section class="markets-view"><header class="tool-header"><div><span class="tool-kicker">Markets</span><h2>Markets</h2><p>Currencies, gold and crypto in one quiet view.</p></div><button id="markets-refresh" class="primary-button" type="button">Refresh</button></header><div class="markets-meta"><span id="markets-updated">Loading market data…</span><span>No background refresh</span></div><section class="market-section"><div class="market-section-head"><div><span class="tool-kicker">Fiat</span><h3>Currencies</h3></div><span>TRY reference</span></div><div id="market-currencies">${loading("currencies")}</div></section><section class="market-section"><div class="market-section-head"><div><span class="tool-kicker">Metal</span><h3>Gold</h3></div><span>USD + TRY</span></div><div id="market-gold">${loading("gold")}</div></section><section class="market-section"><div class="market-section-head"><div><span class="tool-kicker">Crypto</span><h3>Crypto</h3></div><span>USD + EUR + TRY</span></div><div id="market-crypto">${loading("crypto")}</div></section></section>`;
      workspace.querySelector("#markets-refresh")?.addEventListener("click",loadMarkets);
      loadMarkets();
    };
    shared.markets={render};
  };
  if(window.KnowledgeProductivity)register(window.KnowledgeProductivity);else(window.KnowledgeProductivityQueue=window.KnowledgeProductivityQueue||[]).push(register);
})();
