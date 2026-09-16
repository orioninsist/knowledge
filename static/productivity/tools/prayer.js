(() => {
  "use strict";
  const register = shared => {
    const { workspace, escapeHtml } = shared;
    const KEY = "knowledge-productivity-prayer-v1";
    const AUDIO = "https://cdn.aladhan.com/audio/adhans/a2.mp3";
    const PRAYERS = [
      ["Fajr","Sabah"],["Dhuhr","Öğle"],["Asr","İkindi"],["Maghrib","Akşam"],["Isha","Yatsı"]
    ];
    let state = { city:"Istanbul", country:"Turkey", audio:false, ...load() };
    let today = null, tomorrow = null, timer = null, audio = null, lastPlayed = "";
    function load(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}}
    function save(){localStorage.setItem(KEY,JSON.stringify(state))}
    const cleanTime = value => String(value||"--:--").match(/\d{1,2}:\d{2}/)?.[0] || "--:--";
    function localDateKey(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-")}
    function atTime(hhmm, addDays=0){const [h,m]=cleanTime(hhmm).split(":").map(Number);const d=new Date();d.setDate(d.getDate()+addDays);d.setHours(h,m,0,0);return d}
    async function request(url){const r=await fetch(url);if(!r.ok)throw new Error("API "+r.status);const j=await r.json();if(j.code!==200)throw new Error(j.status||"Prayer API error");return j.data}
    async function fetchTimes(){
      workspace.querySelector("[data-prayer-status]")?.replaceChildren(document.createTextNode("Vakitler yükleniyor…"));
      try{
        const base = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(state.city)}&country=${encodeURIComponent(state.country)}&method=13`;
        today = await request(base);
        const t=new Date();t.setDate(t.getDate()+1);
        const stamp=`${String(t.getDate()).padStart(2,"0")}-${String(t.getMonth()+1).padStart(2,"0")}-${t.getFullYear()}`;
        tomorrow = await request(`https://api.aladhan.com/v1/timingsByCity/${stamp}?city=${encodeURIComponent(state.city)}&country=${encodeURIComponent(state.country)}&method=13`);
        render();
      }catch(e){renderError(e.message)}
    }
    async function fetchByCoords(lat,lon){
      try{
        const data=await request(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=13`);
        today=data; tomorrow=null; state.city="Konumum";state.country=`${lat.toFixed(3)}, ${lon.toFixed(3)}`;save();render();
      }catch(e){renderError(e.message)}
    }
    function nextPrayer(){
      if(!today)return null;
      const now=new Date();
      for(const [key,label] of PRAYERS){const when=atTime(today.timings[key]);if(when>now)return {key,label,time:cleanTime(today.timings[key]),when}}
      const raw=tomorrow?.timings?.Fajr || today.timings.Fajr;
      return {key:"Fajr",label:"Sabah",time:cleanTime(raw),when:atTime(raw,1)};
    }
    function countdown(ms){const total=Math.max(0,Math.floor(ms/1000));const h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
    function render(){
      if(!today){workspace.innerHTML='<div class="prayer-view"><div class="prayer-loading">Namaz vakitleri yükleniyor…</div></div>';return}
      const next=nextPrayer();
      const hijri=today.date?.hijri;
      const cards=PRAYERS.map(([key,label])=>`<article class="prayer-card ${next?.key===key?"is-next":""}"><span>${label}</span><strong>${cleanTime(today.timings[key])}</strong></article>`).join("");
      workspace.innerHTML=`<div class="prayer-view">
        <header class="tool-header"><div><span class="tool-kicker">PRAYER</span><h2>5 Vakit</h2><p data-prayer-status>${escapeHtml(state.city)} · ${escapeHtml(state.country)} · Diyanet hesaplama yöntemi</p></div></header>
        <section class="prayer-next"><span>Sıradaki vakit</span><strong>${next?.label||"—"} <b>${next?.time||""}</b></strong><time data-prayer-countdown>${next?countdown(next.when-Date.now()):"--:--:--"}</time></section>
        <div class="prayer-grid">${cards}</div>
        <div class="prayer-sun"><span>Güneş</span><strong>${cleanTime(today.timings.Sunrise)}</strong><span>İmsak</span><strong>${cleanTime(today.timings.Imsak)}</strong></div>
        <section class="prayer-settings">
          <form data-prayer-form><label>Şehir<input name="city" value="${escapeHtml(state.city==="Konumum"?"Istanbul":state.city)}" required></label><label>Ülke<input name="country" value="${escapeHtml(state.country.includes(",")?"Turkey":state.country)}" required></label><button class="primary-button">Vakitleri getir</button><button type="button" data-prayer-location>Konumumu kullan</button></form>
          <div class="prayer-audio"><div><strong>Ezan sesi</strong><small>Hafız Mustafa Özcan · Türkiye. Tarayıcı ses izni için önce etkinleştir.</small></div><button type="button" data-prayer-audio>${state.audio?"Ezan açık":"Ezanı etkinleştir"}</button><button type="button" data-prayer-test>Test</button></div>
        </section>
        <footer class="prayer-meta">${hijri?`${escapeHtml(hijri.day)} ${escapeHtml(hijri.month?.en||"")} ${escapeHtml(hijri.year)} H · `:""}AlAdhan API · Method 13</footer>
      </div>`;
      tick();
    }
    function renderError(message){workspace.innerHTML=`<div class="prayer-view"><div class="prayer-error"><strong>Vakitler alınamadı</strong><span>${escapeHtml(message)}</span><button class="primary-button" data-prayer-retry>Tekrar dene</button></div></div>`}
    function playAdhan(){if(!audio)audio=new Audio(AUDIO);audio.currentTime=0;audio.play().catch(()=>{})}
    function tick(){
      const next=nextPrayer();const el=workspace.querySelector("[data-prayer-countdown]");if(el&&next)el.textContent=countdown(next.when-Date.now());
      if(state.audio&&today){const now=new Date();for(const [key] of PRAYERS){const when=atTime(today.timings[key]);const token=`${localDateKey()}-${key}`;if(Math.abs(now-when)<30000&&lastPlayed!==token){lastPlayed=token;playAdhan()}}}
    }
    function bindEvents(){
      workspace.addEventListener("submit",e=>{if(!e.target.matches("[data-prayer-form]"))return;e.preventDefault();const fd=new FormData(e.target);state.city=String(fd.get("city")||"Istanbul").trim();state.country=String(fd.get("country")||"Turkey").trim();save();fetchTimes()});
      workspace.addEventListener("click",e=>{
        if(e.target.closest("[data-prayer-retry]"))fetchTimes();
        if(e.target.closest("[data-prayer-location]")){if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(p=>fetchByCoords(p.coords.latitude,p.coords.longitude),()=>renderError("Konum izni verilmedi."))}
        if(e.target.closest("[data-prayer-audio]")){state.audio=!state.audio;save();if(state.audio)playAdhan();render()}
        if(e.target.closest("[data-prayer-test]"))playAdhan();
      });
      if(!timer)timer=setInterval(tick,1000);
    }
    function start(){fetchTimes()}
    shared.prayer={render:start,bindEvents};
    if(location.hash.slice(1).toLowerCase()==="prayer")start();
  };
  if(window.KnowledgeProductivity)register(window.KnowledgeProductivity);
  else (window.KnowledgeProductivityQueue=window.KnowledgeProductivityQueue||[]).push(register);
})();