(()=>{"use strict";
const KEY="knowledge.productivity.v3",CACHE_KEY="knowledge.productivity.cache.v1",TIMEOUT=8000;let cache={};try{cache=JSON.parse(localStorage.getItem(CACHE_KEY)||"{}")}catch{}const cacheSave=()=>localStorage.setItem(CACHE_KEY,JSON.stringify(cache));async function getJson(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error("Service unavailable");return await r.json()}finally{clearTimeout(timer)}}
const defaults={cities:[{name:"Istanbul",country:"Türkiye",timezone:"Europe/Istanbul",latitude:41.0138,longitude:28.9497}],weatherCities:[{name:"Istanbul",country:"Türkiye",timezone:"Europe/Istanbul",latitude:41.0138,longitude:28.9497}],prayerCity:{name:"Istanbul",country:"Türkiye",timezone:"Europe/Istanbul"},prayer:{adhan:"makkah",overrides:{Fajr:"",Dhuhr:"",Asr:"",Maghrib:"",Isha:""},lastAlert:""},focus:{kind:"pomodoro",mode:"focus",remaining:1500,running:false,endAt:null,sessions:0,totalSeconds:0,pomodoro:{focus:25,short:5,long:15,longEvery:4},focusMinutes:60,focusSeconds:0,completed:null,nextMode:null}};
let raw={};try{raw=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}
const state={...defaults,...raw,focus:{...defaults.focus,...raw.focus},prayer:{...defaults.prayer,...raw.prayer,overrides:{...defaults.prayer.overrides,...raw.prayer?.overrides}},cities:Array.isArray(raw.cities)?raw.cities:defaults.cities,weatherCities:Array.isArray(raw.weatherCities)?raw.weatherCities:(raw.weatherCity?[raw.weatherCity]:defaults.weatherCities)};
const $=s=>document.querySelector(s),workspace=$("#workspace"),title=$("#title"),eyebrow=$("#eyebrow");
const save=()=>localStorage.setItem(KEY,JSON.stringify(state)),esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=s=>{s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
const CITY_GROUPS=[
{name:"Europe",cities:["London","Paris","Berlin","Stockholm","Madrid","Rome","Amsterdam","Brussels","Vienna","Copenhagen","Oslo","Helsinki","Dublin","Lisbon","Prague","Warsaw","Athens","Bucharest","Budapest","Zagreb","Sofia","Tallinn","Riga","Vilnius","Luxembourg","Ljubljana","Bratislava","Valletta","Nicosia"]},
{name:"United States",cities:["New York","Washington DC","Los Angeles","Chicago","San Francisco","Seattle","Boston","Miami","Denver","Austin","Portland Oregon"]},
{name:"World",cities:["Istanbul","Tokyo","Dubai","Singapore","Sydney","Toronto","Vancouver","Mexico City","São Paulo","Buenos Aires","Cape Town","Cairo","Seoul","Hong Kong","Mumbai"]}
];
const ADHAN={
makkah:{name:"Makkah",src:"https://www.islamcan.com/audio/adhan/azan1.mp3"},
madinah:{name:"Madinah",src:"https://www.islamcan.com/audio/adhan/azan2.mp3"},
aqsa:{name:"Al-Aqsa",src:"https://www.islamcan.com/audio/adhan/azan3.mp3"},
mishary:{name:"Mishary Rashid Alafasy",src:"https://www.islamcan.com/audio/adhan/azan4.mp3"},
abdulbasit:{name:"Abdul Basit Abdus Samad",src:"https://www.islamcan.com/audio/adhan/azan5.mp3"},
husary:{name:"Mahmoud Khalil Al-Husary",src:"https://www.islamcan.com/audio/adhan/azan6.mp3"},
minshawi:{name:"Mohamed Siddiq Al-Minshawi",src:"https://www.islamcan.com/audio/adhan/azan7.mp3"},
shuraim:{name:"Saud Al-Shuraim",src:"https://www.islamcan.com/audio/adhan/azan8.mp3"},
sudais:{name:"Abdul Rahman Al-Sudais",src:"https://www.islamcan.com/audio/adhan/azan9.mp3"},
ayyub:{name:"Muhammad Ayyub",src:"https://www.islamcan.com/audio/adhan/azan10.mp3"},
ibrahimakhbar:{name:"Ibrahim Al-Akhdar",src:"https://www.islamcan.com/audio/adhan/azan11.mp3"},
ali_jaber:{name:"Ali Jaber",src:"https://www.islamcan.com/audio/adhan/azan12.mp3"}
};let adhanAudio=null,prayerToday=null;
async function notify(body){if(!("Notification"in window))return false;let permission=Notification.permission;if(permission==="default")permission=await Notification.requestPermission();if(permission!=="granted")return false;new Notification("Knowledge Productivity",{body});return true}
function setHead(k,t){eyebrow.textContent=k;title.textContent=t}
function tickClock(){const d=new Date();$("#side-clock").textContent=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});$("#now").textContent=d.toLocaleDateString([],{weekday:"long",day:"numeric",month:"long"})}
const CITY_PRESETS={
"London":{name:"London",country:"United Kingdom",timezone:"Europe/London",latitude:51.5074,longitude:-0.1278},"Paris":{name:"Paris",country:"France",timezone:"Europe/Paris",latitude:48.8566,longitude:2.3522},"Berlin":{name:"Berlin",country:"Germany",timezone:"Europe/Berlin",latitude:52.52,longitude:13.405},"Stockholm":{name:"Stockholm",country:"Sweden",timezone:"Europe/Stockholm",latitude:59.3293,longitude:18.0686},"Madrid":{name:"Madrid",country:"Spain",timezone:"Europe/Madrid",latitude:40.4168,longitude:-3.7038},"Rome":{name:"Rome",country:"Italy",timezone:"Europe/Rome",latitude:41.9028,longitude:12.4964},"Amsterdam":{name:"Amsterdam",country:"Netherlands",timezone:"Europe/Amsterdam",latitude:52.3676,longitude:4.9041},"Brussels":{name:"Brussels",country:"Belgium",timezone:"Europe/Brussels",latitude:50.8503,longitude:4.3517},"Vienna":{name:"Vienna",country:"Austria",timezone:"Europe/Vienna",latitude:48.2082,longitude:16.3738},"Copenhagen":{name:"Copenhagen",country:"Denmark",timezone:"Europe/Copenhagen",latitude:55.6761,longitude:12.5683},"Oslo":{name:"Oslo",country:"Norway",timezone:"Europe/Oslo",latitude:59.9139,longitude:10.7522},"Helsinki":{name:"Helsinki",country:"Finland",timezone:"Europe/Helsinki",latitude:60.1699,longitude:24.9384},"Dublin":{name:"Dublin",country:"Ireland",timezone:"Europe/Dublin",latitude:53.3498,longitude:-6.2603},"Lisbon":{name:"Lisbon",country:"Portugal",timezone:"Europe/Lisbon",latitude:38.7223,longitude:-9.1393},"Prague":{name:"Prague",country:"Czechia",timezone:"Europe/Prague",latitude:50.0755,longitude:14.4378},"Warsaw":{name:"Warsaw",country:"Poland",timezone:"Europe/Warsaw",latitude:52.2297,longitude:21.0122},"Athens":{name:"Athens",country:"Greece",timezone:"Europe/Athens",latitude:37.9838,longitude:23.7275},"Bucharest":{name:"Bucharest",country:"Romania",timezone:"Europe/Bucharest",latitude:44.4268,longitude:26.1025},"Budapest":{name:"Budapest",country:"Hungary",timezone:"Europe/Budapest",latitude:47.4979,longitude:19.0402},"Zagreb":{name:"Zagreb",country:"Croatia",timezone:"Europe/Zagreb",latitude:45.815,longitude:15.9819},"Sofia":{name:"Sofia",country:"Bulgaria",timezone:"Europe/Sofia",latitude:42.6977,longitude:23.3219},"Tallinn":{name:"Tallinn",country:"Estonia",timezone:"Europe/Tallinn",latitude:59.437,longitude:24.7536},"Riga":{name:"Riga",country:"Latvia",timezone:"Europe/Riga",latitude:56.9496,longitude:24.1052},"Vilnius":{name:"Vilnius",country:"Lithuania",timezone:"Europe/Vilnius",latitude:54.6872,longitude:25.2797},"Luxembourg":{name:"Luxembourg",country:"Luxembourg",timezone:"Europe/Luxembourg",latitude:49.6116,longitude:6.1319},"Ljubljana":{name:"Ljubljana",country:"Slovenia",timezone:"Europe/Ljubljana",latitude:46.0569,longitude:14.5058},"Bratislava":{name:"Bratislava",country:"Slovakia",timezone:"Europe/Bratislava",latitude:48.1486,longitude:17.1077},"Valletta":{name:"Valletta",country:"Malta",timezone:"Europe/Malta",latitude:35.8989,longitude:14.5146},"Nicosia":{name:"Nicosia",country:"Cyprus",timezone:"Asia/Nicosia",latitude:35.1856,longitude:33.3823},
"New York":{name:"New York",country:"United States",timezone:"America/New_York",latitude:40.7128,longitude:-74.006},"Washington DC":{name:"Washington DC",country:"United States",timezone:"America/New_York",latitude:38.9072,longitude:-77.0369},"Los Angeles":{name:"Los Angeles",country:"United States",timezone:"America/Los_Angeles",latitude:34.0522,longitude:-118.2437},"Chicago":{name:"Chicago",country:"United States",timezone:"America/Chicago",latitude:41.8781,longitude:-87.6298},"San Francisco":{name:"San Francisco",country:"United States",timezone:"America/Los_Angeles",latitude:37.7749,longitude:-122.4194},"Seattle":{name:"Seattle",country:"United States",timezone:"America/Los_Angeles",latitude:47.6062,longitude:-122.3321},"Boston":{name:"Boston",country:"United States",timezone:"America/New_York",latitude:42.3601,longitude:-71.0589},"Miami":{name:"Miami",country:"United States",timezone:"America/New_York",latitude:25.7617,longitude:-80.1918},"Denver":{name:"Denver",country:"United States",timezone:"America/Denver",latitude:39.7392,longitude:-104.9903},"Austin":{name:"Austin",country:"United States",timezone:"America/Chicago",latitude:30.2672,longitude:-97.7431},"Portland Oregon":{name:"Portland",country:"United States",timezone:"America/Los_Angeles",latitude:45.5152,longitude:-122.6784},
"Istanbul":{name:"Istanbul",country:"Türkiye",timezone:"Europe/Istanbul",latitude:41.0082,longitude:28.9784},"Tokyo":{name:"Tokyo",country:"Japan",timezone:"Asia/Tokyo",latitude:35.6762,longitude:139.6503},"Dubai":{name:"Dubai",country:"United Arab Emirates",timezone:"Asia/Dubai",latitude:25.2048,longitude:55.2708},"Singapore":{name:"Singapore",country:"Singapore",timezone:"Asia/Singapore",latitude:1.3521,longitude:103.8198},"Sydney":{name:"Sydney",country:"Australia",timezone:"Australia/Sydney",latitude:-33.8688,longitude:151.2093},"Toronto":{name:"Toronto",country:"Canada",timezone:"America/Toronto",latitude:43.6532,longitude:-79.3832},"Vancouver":{name:"Vancouver",country:"Canada",timezone:"America/Vancouver",latitude:49.2827,longitude:-123.1207},"Mexico City":{name:"Mexico City",country:"Mexico",timezone:"America/Mexico_City",latitude:19.4326,longitude:-99.1332},"São Paulo":{name:"São Paulo",country:"Brazil",timezone:"America/Sao_Paulo",latitude:-23.5505,longitude:-46.6333},"Buenos Aires":{name:"Buenos Aires",country:"Argentina",timezone:"America/Argentina/Buenos_Aires",latitude:-34.6037,longitude:-58.3816},"Cape Town":{name:"Cape Town",country:"South Africa",timezone:"Africa/Johannesburg",latitude:-33.9249,longitude:18.4241},"Cairo":{name:"Cairo",country:"Egypt",timezone:"Africa/Cairo",latitude:30.0444,longitude:31.2357},"Seoul":{name:"Seoul",country:"South Korea",timezone:"Asia/Seoul",latitude:37.5665,longitude:126.978},"Hong Kong":{name:"Hong Kong",country:"Hong Kong",timezone:"Asia/Hong_Kong",latitude:22.3193,longitude:114.1694},"Mumbai":{name:"Mumbai",country:"India",timezone:"Asia/Kolkata",latitude:19.076,longitude:72.8777}
};
async function geocode(q){const preset=CITY_PRESETS[q];if(preset)return{...preset};const u="https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name="+encodeURIComponent(q);const d=await getJson(u),items=d.results||[];if(!items.length)throw Error('City not found. Try the city name in English.');const x=items.find(v=>["PPLC","PPLA","PPLA2","PPL"].includes(v.feature_code))||items[0];return{name:x.name,country:x.country||"",timezone:x.timezone,latitude:x.latitude,longitude:x.longitude}}
function cityPicker(kind){return '<div class="city-picker">'+CITY_GROUPS.map(g=>'<details class="city-group"><summary><span>'+esc(g.name)+'</span><small>'+g.cities.length+' cities</small></summary><div class="city-options">'+g.cities.map(x=>'<button class="city-option" type="button" data-city-preset="'+esc(x)+'" data-city-target="'+kind+'"><span>'+esc(x)+'</span><b>+</b></button>').join("")+'</div></details>').join("")+'</div>'}
function clock(){setHead("WORLD CLOCK","Your cities, at a glance.");workspace.innerHTML='<div class="clock-layout"><aside class="clock-add card"><p class="kicker">ADD A CITY</p><h2>World cities</h2><p class="muted">Europe, United States and major world cities. Your list is saved automatically.</p><form id="city-form" class="add-form city-search"><input id="city-input" class="field" placeholder="Search any city…" autocomplete="off"><button class="btn primary">Add</button></form>'+cityPicker("clock")+'</aside><section class="clock-saved"><div class="section-head"><div><p class="kicker">MY CLOCKS</p><h2>Saved cities</h2></div><span class="count-pill">'+state.cities.length+'</span></div><div id="clock-list" class="clock-grid"></div></section></div>';renderClocks()}
function renderClocks(){const el=$("#clock-list");if(!el)return;const now=new Date();el.innerHTML=state.cities.length?state.cities.map((c,i)=>{const time=new Intl.DateTimeFormat([],{timeZone:c.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(now),date=new Intl.DateTimeFormat([],{timeZone:c.timezone,weekday:"short",month:"short",day:"numeric"}).format(now);return '<article class="clock-card"><div class="clock-card-top"><div><h3>'+esc(c.name)+'</h3><p>'+esc(c.country)+'</p></div><button class="icon-btn" data-city-remove="'+i+'" aria-label="Remove '+esc(c.name)+'">×</button></div><div class="clock-time">'+esc(time)+'</div><div class="clock-date">'+esc(date)+'<span>'+esc(c.timezone)+'</span></div></article>'}).join(""):'<div class="empty-state"><strong>No saved cities</strong><span>Add a city from the directory.</span></div>'}
async function weather(){setHead("WEATHER","Weather across your saved cities.");workspace.innerHTML='<div class="weather-layout"><aside class="weather-add card"><p class="kicker">ADD A CITY</p><h2>Weather cities</h2><p class="muted">Add the cities you want to follow. Your list is saved automatically.</p><form id="weather-form" class="add-form city-search"><input id="weather-input" class="field" placeholder="Search any city…" autocomplete="off"><button class="btn primary">Add</button></form>'+cityPicker("weather")+'</aside><section class="weather-saved"><div class="section-head"><div><p class="kicker">MY WEATHER</p><h2>Saved cities</h2></div><span class="count-pill">'+state.weatherCities.length+'</span></div><div id="weather-grid" class="weather-grid">'+state.weatherCities.map((c,i)=>'<article class="weather-card" data-weather-index="'+i+'"><div class="weather-card-head"><div><h3>'+esc(c.name)+'</h3><p>'+esc(c.country)+'</p></div><button class="icon-btn" data-weather-remove="'+i+'" aria-label="Remove '+esc(c.name)+'">×</button></div><div class="weather-card-body"><div class="empty">Loading weather…</div></div></article>').join("")+'</div></section></div>';await Promise.all(state.weatherCities.map((c,i)=>loadWeather(c,i)))}
async function loadWeather(c,index){const u="https://api.open-meteo.com/v1/forecast?latitude="+c.latitude+"&longitude="+c.longitude+"&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone="+encodeURIComponent(c.timezone)+"&forecast_days=7";let d;const key=c.name+"|"+c.timezone;try{d=await getJson(u);cache.weather=cache.weather||{};cache.weather[key]={at:Date.now(),data:d};cacheSave()}catch{const hit=cache.weather?.[key];if(hit&&Date.now()-hit.at<21600000)d=hit.data;else throw Error("Weather unavailable. Check your connection.")}const labels={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Fog",51:"Drizzle",53:"Drizzle",55:"Drizzle",61:"Rain",63:"Rain",65:"Heavy rain",71:"Snow",73:"Snow",75:"Heavy snow",80:"Showers",81:"Showers",82:"Heavy showers",95:"Thunderstorm"},cur=d.current,days=d.daily,card=document.querySelector('[data-weather-index="'+index+'"] .weather-card-body');if(!card)return;card.innerHTML='<div class="weather-now compact-weather"><div class="weather-temp">'+Math.round(cur.temperature_2m)+'°</div><div class="weather-meta"><h2>'+esc(labels[cur.weather_code]||"Conditions")+'</h2><div class="muted">Feels '+Math.round(cur.apparent_temperature)+'° · Wind '+Math.round(cur.wind_speed_10m)+' km/h</div></div></div><div class="forecast compact-forecast">'+days.time.map((x,i)=>'<div class="forecast-row"><span>'+new Date(x+"T12:00:00").toLocaleDateString([],{weekday:"short"})+'</span><span class="muted">'+esc(labels[days.weather_code[i]]||"")+'</span><strong>'+Math.round(days.temperature_2m_max[i])+'° / '+Math.round(days.temperature_2m_min[i])+'°</strong></div>').join("")+'</div>'}
async function prayer(background=false){const c=state.prayerCity;if(!background){setHead("PRAYER TIMES","Five daily prayer times.");workspace.innerHTML='<div class="prayer-shell"><section class="prayer-main card"><div class="prayer-city-bar"><div><p class="kicker">LOCATION</p><strong>'+esc(c.name)+'</strong><span>'+esc(c.country)+'</span></div><details class="prayer-location"><summary class="btn">Change city</summary><div class="prayer-location-panel">'+cityPicker("prayer")+'<form id="prayer-form" class="add-form"><input id="prayer-input" class="field" placeholder="Choose city…" value="'+esc(c.name)+'" autocomplete="off"><input id="prayer-country" class="field" placeholder="Country" value="'+esc(c.country)+'" autocomplete="off"><button class="btn primary">Update</button></form></div></details></div><div id="prayer-body"><div class="empty">Loading prayer times…</div></div></section><aside class="prayer-settings card"><p class="kicker">ADHAN</p><label class="compact-label">General<select id="adhan-select" class="field">'+Object.entries(ADHAN).map(([k,v])=>'<option value="'+k+'" '+(state.prayer.adhan===k?'selected':'')+'>'+esc(v.name)+'</option>').join("")+'</select></label><div class="actions compact-actions"><button class="btn primary" data-adhan-test>Play</button><button class="btn" data-adhan-stop>Stop</button></div><details class="adhan-advanced"><summary>Per-prayer overrides</summary><div class="adhan-overrides">'+["Fajr","Dhuhr","Asr","Maghrib","Isha"].map(name=>'<div class="adhan-override-row"><label>'+name+'</label><select class="field" data-adhan-override="'+name+'"><option value="">General</option>'+Object.entries(ADHAN).map(([k,v])=>'<option value="'+k+'" '+(state.prayer.overrides?.[name]===k?'selected':'')+'>'+esc(v.name)+'</option>').join("")+'</select><button class="btn" type="button" data-adhan-preview="'+name+'">Play</button></div>').join("")+'</div></details></aside></div>';}try{const u="https://api.aladhan.com/v1/timingsByCity?city="+encodeURIComponent(c.name)+"&country="+encodeURIComponent(c.country)+"&method=13";let d;try{d=await getJson(u);cache.prayer={at:Date.now(),city:c.name,data:d};cacheSave()}catch{if(cache.prayer?.city===c.name&&Date.now()-cache.prayer.at<86400000)d=cache.prayer.data;else throw Error("Prayer times unavailable. Check your connection.")}const t=d.data?.timings;if(!t)throw Error("Prayer times unavailable");prayerToday={timings:t,date:d.data?.date?.gregorian?.date||"",city:c.name};const names=[["Fajr","Fajr"],["Dhuhr","Dhuhr"],["Asr","Asr"],["Maghrib","Maghrib"],["Isha","Isha"]];const zone=c.timezone||"Europe/Istanbul",parts=new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date()),mins=Number(parts.find(p=>p.type==="hour")?.value||0)*60+Number(parts.find(p=>p.type==="minute")?.value||0);let next=names.find(x=>{const [h,m]=t[x[0]].split(":").map(Number);return h*60+m>mins});const nextText=next?next[1]+" · "+t[next[0]]:"Fajr · tomorrow";if(background)return;$("#prayer-body").innerHTML='<div class="next-prayer-hero"><p class="kicker">NEXT</p><strong>'+esc(nextText)+'</strong></div><div class="prayer-grid">'+names.map(x=>'<div class="prayer-slot"><span>'+x[1]+'</span><strong>'+esc(t[x[0]])+'</strong></div>').join("")+'</div><p class="muted prayer-method">Diyanet İşleri Başkanlığı · method 13</p>'}catch(e){if(!background&&$("#prayer-body"))$("#prayer-body").innerHTML='<div class="error">'+esc(e.message)+'</div>'}}
const FOCUS_AUDIO_DB="knowledge.productivity.audio.v1";
const FOCUS_AUDIO_STORE="audio";
let focusAudio=null;

function focusAudioDb(){
    return new Promise((resolve,reject)=>{
        const req=indexedDB.open(FOCUS_AUDIO_DB,1);
        req.onupgradeneeded=()=>req.result.createObjectStore(FOCUS_AUDIO_STORE);
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error);
    });
}

async function getFocusAudio(){
    const db=await focusAudioDb();
    return new Promise((resolve,reject)=>{
        const tx=db.transaction(FOCUS_AUDIO_STORE,"readonly");
        const req=tx.objectStore(FOCUS_AUDIO_STORE).get("completion");
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>reject(req.error);
        tx.oncomplete=()=>db.close();
    });
}

async function saveFocusAudio(file){
    const db=await focusAudioDb();
    await new Promise((resolve,reject)=>{
        const tx=db.transaction(FOCUS_AUDIO_STORE,"readwrite");
        tx.objectStore(FOCUS_AUDIO_STORE).put({
            blob:file,
            name:file.name,
            type:file.type,
            savedAt:Date.now()
        },"completion");
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
    });
    db.close();
}

async function removeFocusAudio(){
    stopFocusSound();
    const db=await focusAudioDb();
    await new Promise((resolve,reject)=>{
        const tx=db.transaction(FOCUS_AUDIO_STORE,"readwrite");
        tx.objectStore(FOCUS_AUDIO_STORE).delete("completion");
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
    });
    db.close();
}

function stopFocusSound(){
    if(focusAudio){
        focusAudio.pause();
        focusAudio.currentTime=0;
        if(focusAudio.dataset.objectUrl)URL.revokeObjectURL(focusAudio.dataset.objectUrl);
        focusAudio=null;
    }
}

async function playFocusSound(){
    stopFocusSound();
    const saved=await getFocusAudio();
    if(!saved?.blob)return false;
    const url=URL.createObjectURL(saved.blob);
    focusAudio=new Audio(url);
    focusAudio.dataset.objectUrl=url;
    focusAudio.onended=()=>{
        URL.revokeObjectURL(url);
        focusAudio=null;
    };
    await focusAudio.play();
    return true;
}

async function refreshFocusAudioName(){
    const el=document.querySelector("[data-focus-audio-name]");
    if(!el)return;
    try{
        const saved=await getFocusAudio();
        el.textContent=saved?.name||"No music selected";
    }catch{
        el.textContent="Audio storage unavailable";
    }
}
const focusTimerDuration=()=>Math.max(1,(Math.max(0,+state.focus.focusMinutes||0)*60)+Math.max(0,Math.min(59,+state.focus.focusSeconds||0)));
const focusDurations=()=>({focus:Math.max(1,+state.focus.pomodoro.focus||25)*60,short:Math.max(1,+state.focus.pomodoro.short||5)*60,long:Math.max(1,+state.focus.pomodoro.long||15)*60});
const currentFocus=()=>state.focus.running?Math.max(0,Math.ceil((state.focus.endAt-Date.now())/1000)):state.focus.remaining;
function focus(){
    setHead("FOCUS","Stay with one thing.");
    const p=state.focus.pomodoro,done=state.focus.completed;
    const nextLabel=state.focus.nextMode==="short"?"Short Break":state.focus.nextMode==="long"?"Long Break":"Focus";
    const nextSeconds=state.focus.kind==="pomodoro"&&state.focus.nextMode?focusDurations()[state.focus.nextMode]:focusTimerDuration();
    const status=done
        ?'<div class="focus-complete"><strong>'+esc(done==="focus"?"FOCUS COMPLETE":"BREAK COMPLETE")+'</strong><span>'+(state.focus.kind==="pomodoro"?"Next: "+esc(nextLabel)+" · "+fmt(nextSeconds):"Session finished")+'</span></div>'
        :'<p class="timer-sub">'+(state.focus.running?"Stay with the task.":state.focus.kind==="pomodoro"?"Ready for "+state.focus.mode+".":"Ready when you are.")+'</p>';
    const actions=done
        ?'<div class="actions center-actions focus-actions"><button class="btn primary" data-focus-continue>'+(state.focus.kind==="pomodoro"?"Continue":"Start again")+'</button><button class="btn" data-focus-reset>Reset</button></div>'
        :'<div class="actions center-actions focus-actions"><button class="btn primary" data-focus-toggle>'+(state.focus.running?"Pause":"Start")+'</button><button class="btn" data-focus-reset>Reset</button></div>';

    workspace.innerHTML='<div class="focus-shell"><section class="focus-stage"><div class="focus-topline"><div class="mode-tabs"><button class="btn '+(state.focus.kind==="pomodoro"?"is-active":"")+'" data-focus-kind="pomodoro">Pomodoro</button><button class="btn '+(state.focus.kind==="timer"?"is-active":"")+'" data-focus-kind="timer">Focus Mode</button></div><div class="focus-stats"><strong>'+state.focus.sessions+'</strong> sessions · '+Math.round(state.focus.totalSeconds/60)+' min</div></div>'
        +(state.focus.kind==="pomodoro"?'<div class="modes compact-modes"><button class="btn '+(state.focus.mode==="focus"?"is-active":"")+'" data-mode="focus">Focus</button><button class="btn '+(state.focus.mode==="short"?"is-active":"")+'" data-mode="short">Short</button><button class="btn '+(state.focus.mode==="long"?"is-active":"")+'" data-mode="long">Long</button></div>':'')
        +'<div id="focus-timer" class="focus-timer-hero">'+fmt(currentFocus())+'</div>'
        +status+actions
        +'<details class="focus-settings"><summary>Settings</summary><div class="focus-settings-body">'
        +(state.focus.kind==="pomodoro"
            ?'<div class="settings-row"><label>Focus<input class="field compact" type="number" min="1" data-pomo-setting="focus" value="'+p.focus+'"></label><label>Short<input class="field compact" type="number" min="1" data-pomo-setting="short" value="'+p.short+'"></label><label>Long<input class="field compact" type="number" min="1" data-pomo-setting="long" value="'+p.long+'"></label><label>Long every<input class="field compact" type="number" min="1" data-pomo-setting="longEvery" value="'+p.longEvery+'"></label></div>'
            :'<div class="focus-duration-parts"><label>Minutes<input class="field compact" type="number" min="0" data-focus-minutes value="'+state.focus.focusMinutes+'"></label><label>Seconds<input class="field compact" type="number" min="0" max="59" data-focus-seconds value="'+state.focus.focusSeconds+'"></label></div>')
        +'<div class="focus-sound"><p class="kicker">COMPLETION MUSIC</p><div class="focus-audio-file"><strong data-focus-audio-name>No music selected</strong><span>MP3 or WAV · saved on this device</span></div><input type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" data-focus-audio-file hidden><div class="actions compact-actions"><button class="btn" data-focus-audio-choose>Choose MP3 / WAV</button><button class="btn primary" data-focus-sound-play>Play</button><button class="btn" data-focus-sound-stop>Stop</button><button class="btn danger" data-focus-audio-remove>Remove</button></div><p class="kicker focus-notification-label">DESKTOP NOTIFICATION</p><div class="actions compact-actions"><button class="btn" data-notification-test>Test notification</button></div></div></div></details></section></div>';
    refreshFocusAudioName();
}
const views={clock,weather,prayer,focus};let active="clock";
function render(name=active){active=views[name]?name:"clock";location.hash=active==="clock"?"":active;document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("is-active",x.dataset.view===active));views[active]()}
document.addEventListener("submit",async e=>{e.preventDefault();try{if(e.target.id==="city-form"){const c=await geocode($("#city-input").value.trim());if(!state.cities.some(x=>x.timezone===c.timezone&&x.name===c.name))state.cities.push(c);save();clock()}else if(e.target.id==="weather-form"){const c=await geocode($("#weather-input").value.trim());if(!state.weatherCities.some(x=>x.name===c.name&&x.timezone===c.timezone))state.weatherCities.push(c);save();weather()}else if(e.target.id==="prayer-form"){const g=await geocode($("#prayer-input").value.trim());state.prayerCity={name:g.name,country:$("#prayer-country").value.trim()||g.country,timezone:g.timezone};save();prayer()}}catch(err){alert(err.message)}});
document.addEventListener("change",async e=>{if(e.target.matches("[data-focus-audio-file]")){const file=e.target.files?.[0];if(!file)return;const ok=file.type==="audio/mpeg"||file.type==="audio/wav"||/\.(mp3|wav)$/i.test(file.name);if(!ok){alert("Choose an MP3 or WAV file.");e.target.value="";return}try{await saveFocusAudio(file);await refreshFocusAudioName()}catch{alert("Music could not be saved.")}e.target.value="";return}if(e.target.id==="adhan-select"){state.prayer.adhan=e.target.value;save()}const ao=e.target.closest("[data-adhan-override]");if(ao){state.prayer.overrides[ao.dataset.adhanOverride]=ao.value;save()}const ps=e.target.closest("[data-pomo-setting]");if(ps){state.focus.pomodoro[ps.dataset.pomoSetting]=Math.max(1,+ps.value||1);state.focus.running=false;state.focus.endAt=null;state.focus.completed=null;state.focus.nextMode=null;state.focus.remaining=focusDurations()[state.focus.mode];save();focus()}if(e.target.matches("[data-focus-minutes]")){state.focus.focusMinutes=Math.max(0,+e.target.value||0);state.focus.running=false;state.focus.endAt=null;state.focus.completed=null;state.focus.nextMode=null;state.focus.remaining=focusTimerDuration();save();focus()}if(e.target.matches("[data-focus-seconds]")){state.focus.focusSeconds=Math.max(0,Math.min(59,+e.target.value||0));state.focus.running=false;state.focus.endAt=null;state.focus.completed=null;state.focus.nextMode=null;state.focus.remaining=focusTimerDuration();save();focus()}});
document.addEventListener("click",async e=>{const preset=e.target.closest("[data-city-preset]");if(preset){try{const c=await geocode(preset.dataset.cityPreset),target=preset.dataset.cityTarget;if(target==="clock"){if(!state.cities.some(x=>x.name===c.name&&x.timezone===c.timezone))state.cities.push(c);save();clock()}else if(target==="weather"){if(!state.weatherCities.some(x=>x.name===c.name&&x.timezone===c.timezone))state.weatherCities.push(c);save();weather()}else{state.prayerCity={name:c.name,country:c.country,timezone:c.timezone};save();prayer()}}catch(err){alert(err.message)}return}const nav=e.target.closest("[data-view]");if(nav){render(nav.dataset.view);return}const rm=e.target.closest("[data-city-remove]");if(rm){state.cities.splice(+rm.dataset.cityRemove,1);save();renderClocks();return}const wr=e.target.closest("[data-weather-remove]");if(wr){state.weatherCities.splice(+wr.dataset.weatherRemove,1);save();weather();return}const kind=e.target.closest("[data-focus-kind]");if(kind){state.focus.kind=kind.dataset.focusKind;state.focus.running=false;state.focus.endAt=null;state.focus.completed=null;state.focus.nextMode=null;state.focus.remaining=state.focus.kind==="timer"?focusTimerDuration():focusDurations()[state.focus.mode];save();focus();return}const mode=e.target.closest("[data-mode]");if(mode){state.focus.mode=mode.dataset.mode;state.focus.remaining=focusDurations()[state.focus.mode];state.focus.running=false;state.focus.endAt=null;state.focus.completed=null;state.focus.nextMode=null;save();focus();return}if(e.target.closest("[data-focus-toggle]")){if(state.focus.running){state.focus.remaining=currentFocus();state.focus.running=false;state.focus.endAt=null}else{if(currentFocus()<=0)state.focus.remaining=state.focus.kind==="timer"?focusTimerDuration():focusDurations()[state.focus.mode];state.focus.running=true;state.focus.endAt=Date.now()+state.focus.remaining*1000}save();focus();return}if(e.target.closest("[data-focus-continue]")){stopFocusSound();if(state.focus.kind==="pomodoro"){state.focus.mode=state.focus.nextMode||"focus";state.focus.remaining=focusDurations()[state.focus.mode]}else state.focus.remaining=focusTimerDuration();state.focus.completed=null;state.focus.nextMode=null;state.focus.running=false;state.focus.endAt=null;save();focus();return}if(e.target.closest("[data-focus-reset]")){state.focus.remaining=state.focus.kind==="timer"?focusTimerDuration():focusDurations()[state.focus.mode];state.focus.running=false;state.focus.endAt=null;state.focus.completed=null;state.focus.nextMode=null;save();focus();return}const preview=e.target.closest("[data-adhan-preview]");if(preview){const key=state.prayer.overrides?.[preview.dataset.adhanPreview]||state.prayer.adhan,a=ADHAN[key]||ADHAN.makkah;if(adhanAudio)adhanAudio.pause();adhanAudio=new Audio(a.src);adhanAudio.play().catch(()=>alert("Adhan audio could not be played."));return}if(e.target.closest("[data-adhan-test]")){const a=ADHAN[state.prayer.adhan]||ADHAN.makkah;if(adhanAudio){adhanAudio.pause()}adhanAudio=new Audio(a.src);adhanAudio.play().catch(()=>alert("Adhan audio could not be played."));return}if(e.target.closest("[data-adhan-stop]")){if(adhanAudio){adhanAudio.pause();adhanAudio.currentTime=0}return}if(e.target.closest("[data-focus-audio-choose]")){document.querySelector("[data-focus-audio-file]")?.click();return}if(e.target.closest("[data-focus-audio-remove]")){try{await removeFocusAudio();await refreshFocusAudioName()}catch{alert("Music could not be removed.")}return}if(e.target.closest("[data-focus-sound-play]")){playFocusSound().then(ok=>{if(!ok)alert("Choose an MP3 or WAV file first.")}).catch(()=>alert("Focus music could not be played."));return}if(e.target.closest("[data-focus-sound-stop]")){stopFocusSound();return}if(e.target.closest("[data-notification-test]")){notify("Desktop notification test.");return}});
setInterval(()=>{
    tickClock();
    checkPrayerAlert();
    if(active==="clock")renderClocks();

    if(state.focus.running&&currentFocus()<=0){
        const wasFocus=state.focus.kind==="timer"||state.focus.mode==="focus";
        const spent=state.focus.kind==="timer"?focusTimerDuration():focusDurations()[state.focus.mode];

        state.focus.running=false;
        state.focus.endAt=null;
        state.focus.remaining=0;
        state.focus.completed=wasFocus?"focus":"break";

        if(wasFocus){
            state.focus.sessions++;
            state.focus.totalSeconds+=spent;
        }

        if(state.focus.kind==="pomodoro"){
            state.focus.nextMode=state.focus.mode==="focus"
                ?(state.focus.sessions%Math.max(1,state.focus.pomodoro.longEvery)===0?"long":"short")
                :"focus";
        }else{
            state.focus.nextMode=null;
        }

        save();
        notify(wasFocus?"Focus complete.":"Break complete.");
        playFocusSound().catch(()=>{});
        if(active==="focus")focus();
    }

    if(active==="focus"){
        const el=$("#focus-timer");
        if(el)el.textContent=fmt(currentFocus());
    }
},500);
function checkPrayerAlert(){if(!prayerToday?.timings)return;const zone=state.prayerCity.timezone||"Europe/Istanbul",parts=new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date()),hh=parts.find(p=>p.type==="hour")?.value,mm=parts.find(p=>p.type==="minute")?.value,now=hh+":"+mm,names=[["Fajr","Fajr"],["Dhuhr","Dhuhr"],["Asr","Asr"],["Maghrib","Maghrib"],["Isha","Isha"]],hit=names.find(([k])=>String(prayerToday.timings[k]).slice(0,5)===now);if(!hit)return;const key=new Date().toLocaleDateString("en-CA")+"|"+hit[0]+"|"+state.prayerCity.name;if(state.prayer.lastAlert===key)return;state.prayer.lastAlert=key;save();notify(hit[1]+" prayer time in "+state.prayerCity.name+".");const adhanKey=state.prayer.overrides?.[hit[0]]||state.prayer.adhan,a=ADHAN[adhanKey]||ADHAN.makkah;if(adhanAudio)adhanAudio.pause();adhanAudio=new Audio(a.src);adhanAudio.play().catch(()=>{})}
tickClock();prayer(true);render(location.hash.slice(1)||"clock");
})();