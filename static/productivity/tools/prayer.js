(() => {
  "use strict";
  const register = shared => {
    const { workspace, escapeHtml } = shared;
    const KEY = "knowledge-productivity-prayer-v2";
    const OLD_KEY = "knowledge-productivity-prayer-v1";
    const ADHANS = [
      {id:"a9",name:"Mishary Rashid Alafasy · Yet Another Adhan",url:"https://cdn.aladhan.com/audio/adhans/a9.mp3"},
      {id:"a1",name:"Ahmad al-Nafees",url:"https://cdn.aladhan.com/audio/adhans/a1.mp3"},
      {id:"a2",name:"Hafız Mustafa Özcan · Türkiye",url:"https://cdn.aladhan.com/audio/adhans/a2.mp3"},
      {id:"a3",name:"Karl Jenkins · Mass for Peace",url:"https://cdn.aladhan.com/audio/adhans/a3.mp3"},
      {id:"a4",name:"Mishary Rashid Alafasy · Dubai One TV",url:"https://cdn.aladhan.com/audio/adhans/a4.mp3"},
      {id:"a7",name:"Mishary Rashid Alafasy · Another Adhan",url:"https://cdn.aladhan.com/audio/adhans/a7.mp3"},
      {id:"a11",name:"Mansour Al-Zahrani",url:"https://cdn.aladhan.com/audio/adhans/a11-mansour-al-zahrani.mp3"},
    ];
    const PRAYERS = [["Fajr","Sabah"],["Dhuhr","Öğle"],["Asr","İkindi"],["Maghrib","Akşam"],["Isha","Yatsı"]];
    function load(){try{return JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY)||"{}")}catch{return {}}}
    let state={city:"Istanbul",country:"Turkey",audio:false,defaultAdhan:"a9",prayerAdhans:{},...load()};
    state.prayerAdhans=state.prayerAdhans||{};
    let today=null,tomorrow=null,timer=null,audio=null,lastPlayed="";
    function save(){localStorage.setItem(KEY,JSON.stringify(state))}
    const cleanTime=v=>String(v||"--:--").match(/\d{1,2}:\d{2}/)?.[0]||"--:--";
    function localDateKey(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
    function atTime(hhmm,addDays=0){const [h,m]=cleanTime(hhmm).split(":").map(Number),d=new Date();d.setDate(d.getDate()+addDays);d.setHours(h,m,0,0);return d}
    async function request(url){const r=await fetch(url);if(!r.ok)throw new Error("API "+r.status);const j=await r.json();if(j.code!==200)throw new Error(j.status||"Prayer API error");return j.data}
    async function fetchTimes(){
      workspace.querySelector("[data-prayer-status]")?.replaceChildren(document.createTextNode("Vakitler yükleniyor…"));
      try{
        const base=`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(state.city)}&country=${encodeURIComponent(state.country)}&method=13`;
        today=await request(base);const t=new Date();t.setDate(t.getDate()+1);const stamp=`${String(t.getDate()).padStart(2,"0")}-${String(t.getMonth()+1).padStart(2,"0")}-${t.getFullYear()}`;
        tomorrow=await request(`https://api.aladhan.com/v1/timingsByCity/${stamp}?city=${encodeURIComponent(state.city)}&country=${encodeURIComponent(state.country)}&method=13`);render();
      }catch(e){renderError(e.message)}
    }
    async function fetchByCoords(lat,lon){try{today=await request(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=13`);tomorrow=null;state.city="Konumum";state.country=`${lat.toFixed(3)}, ${lon.toFixed(3)}`;save();render()}catch(e){renderError(e.message)}}
    function nextPrayer(){if(!today)return null;const now=new Date();for(const [key,label] of PRAYERS){const when=atTime(today.timings[key]);if(when>now)return {key,label,time:cleanTime(today.timings[key]),when}}const raw=tomorrow?.timings?.Fajr||today.timings.Fajr;return {key:"Fajr",label:"Sabah",time:cleanTime(raw),when:atTime(raw,1)}}
    function countdown(ms){const n=Math.max(0,Math.floor(ms/1000)),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
    const adhanById=id=>ADHANS.find(x=>x.id===id)||ADHANS[0];
    const selectedForPrayer=key=>state.prayerAdhans[key]||state.defaultAdhan;
    const options=(selected,inherit=false)=>`${inherit?`<option value="">Varsayılan ezan</option>`:""}${ADHANS.map(a=>`<option value="${a.id}" ${selected===a.id?"selected":""}>${escapeHtml(a.name)}</option>`).join("")}`;
    function render(){
      if(!today){workspace.innerHTML='<div class="prayer-view"><div class="prayer-loading">Namaz vakitleri yükleniyor…</div></div>';return}
      const next=nextPrayer(),hijri=today.date?.hijri,cards=PRAYERS.map(([key,label])=>`<article class="prayer-card ${next?.key===key?"is-next":""}"><span>${label}</span><strong>${cleanTime(today.timings[key])}</strong></article>`).join("");
      const library=ADHANS.map(a=>`<div class="prayer-adhan-row"><span>${escapeHtml(a.name)}</span><button type="button" data-adhan-preview="${a.id}">Dinle</button></div>`).join("");
      const assignments=PRAYERS.map(([key,label])=>`<label>${label}<select data-prayer-adhan="${key}">${options(state.prayerAdhans[key]||"",true)}</select></label>`).join("");
      workspace.innerHTML=`<div class="prayer-view">
        <header class="tool-header"><div><span class="tool-kicker">PRAYER</span><h2>5 Vakit</h2><p data-prayer-status>${escapeHtml(state.city)} · ${escapeHtml(state.country)} · Diyanet hesaplama yöntemi</p></div></header>
        <section class="prayer-next"><span>Sıradaki vakit</span><strong>${next?.label||"—"} <b>${next?.time||""}</b></strong><time data-prayer-countdown>${next?countdown(next.when-Date.now()):"--:--:--"}</time></section>
        <div class="prayer-grid">${cards}</div><div class="prayer-sun"><span>Güneş</span><strong>${cleanTime(today.timings.Sunrise)}</strong><span>İmsak</span><strong>${cleanTime(today.timings.Imsak)}</strong></div>
        <section class="prayer-settings">
          <form data-prayer-form><label>Şehir<input name="city" value="${escapeHtml(state.city==="Konumum"?"Istanbul":state.city)}" required></label><label>Ülke<input name="country" value="${escapeHtml(state.country.includes(",")?"Turkey":state.country)}" required></label><button class="primary-button">Vakitleri getir</button><button type="button" data-prayer-location>Konumumu kullan</button></form>
          <div class="prayer-audio"><div><strong>Ezan</strong><small>Vakit geldiğinde seçtiğin kayıt çalınır. Tarayıcı ses izni için önce ezanı etkinleştir.</small></div><button type="button" data-prayer-audio>${state.audio?"Ezan açık":"Ezanı etkinleştir"}</button><button type="button" data-prayer-test>Seçileni test et</button></div>
          <div class="prayer-adhan-settings"><h3>Ezan sesi</h3><label>Varsayılan<select data-default-adhan>${options(state.defaultAdhan)}</select></label><p>İstersen her vakte ayrı ezan ata. “Varsayılan ezan” seçiliyse yukarıdaki sesi kullanır.</p><div class="prayer-adhan-assignments">${assignments}</div></div>
          <div class="prayer-adhan-library"><h3>Tüm ezan sesleri</h3><p>Kaydetmeden önce her sesi doğrudan dinleyebilirsin.</p>${library}</div>
        </section>
        <footer class="prayer-meta">${hijri?`${escapeHtml(hijri.day)} ${escapeHtml(hijri.month?.en||"")} ${escapeHtml(hijri.year)} H · `:""}AlAdhan API · Method 13</footer></div>`;tick();
    }
    function renderError(message){workspace.innerHTML=`<div class="prayer-view"><div class="prayer-error"><strong>Vakitler alınamadı</strong><span>${escapeHtml(message)}</span><button class="primary-button" data-prayer-retry>Tekrar dene</button></div></div>`}
    function playAdhan(id=state.defaultAdhan){const chosen=adhanById(id);if(audio){audio.pause();audio=null}audio=new Audio(chosen.url);audio.play().catch(()=>{})}
    function tick(){const next=nextPrayer(),el=workspace.querySelector("[data-prayer-countdown]");if(el&&next)el.textContent=countdown(next.when-Date.now());if(state.audio&&today){const now=new Date();for(const [key] of PRAYERS){const when=atTime(today.timings[key]),token=`${localDateKey()}-${key}`;if(Math.abs(now-when)<30000&&lastPlayed!==token){lastPlayed=token;playAdhan(selectedForPrayer(key))}}}}
    function bindEvents(){
      workspace.addEventListener("submit",e=>{if(!e.target.matches("[data-prayer-form]"))return;e.preventDefault();const fd=new FormData(e.target);state.city=String(fd.get("city")||"Istanbul").trim();state.country=String(fd.get("country")||"Turkey").trim();save();fetchTimes()});
      workspace.addEventListener("change",e=>{if(e.target.matches("[data-default-adhan]")){state.defaultAdhan=e.target.value;save()}if(e.target.matches("[data-prayer-adhan]")){state.prayerAdhans[e.target.dataset.prayerAdhan]=e.target.value;save()}});
      workspace.addEventListener("click",e=>{const preview=e.target.closest("[data-adhan-preview]");if(preview)playAdhan(preview.dataset.adhanPreview);if(e.target.closest("[data-prayer-retry]"))fetchTimes();if(e.target.closest("[data-prayer-location]")){if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(p=>fetchByCoords(p.coords.latitude,p.coords.longitude),()=>renderError("Konum izni verilmedi."))}if(e.target.closest("[data-prayer-audio]")){state.audio=!state.audio;save();if(state.audio)playAdhan();render()}if(e.target.closest("[data-prayer-test]"))playAdhan()});
      if(!timer)timer=setInterval(tick,1000);
    }
    function start(){fetchTimes()}
    shared.prayer={render:start,bindEvents};if(location.hash.slice(1).toLowerCase()==="prayer")start();
  };
  if(window.KnowledgeProductivity)register(window.KnowledgeProductivity);else (window.KnowledgeProductivityQueue=window.KnowledgeProductivityQueue||[]).push(register);
})();