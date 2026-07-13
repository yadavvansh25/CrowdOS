import { PitchEngine } from './PitchEngine.js';
import { initUI } from './UIController.js';
// Tab Navigation
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const titles = { command:'Command Center', incident:'Incident Response', resource:'Resource Hub', fanai:'Fan AI Assistant' };
navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const tab = item.dataset.tab;
    navItems.forEach(n => n.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    const pane = document.getElementById('tab-' + tab);
    if(pane) pane.classList.add('active');
    const t = document.getElementById('page-title');
    if(t) t.textContent = titles[tab] || tab;
  });
});

// UTC Clock
import DOMPurify from 'dompurify';

function tick() {
  const n = new Date(), p = v => String(v).padStart(2,'0');
  const s = p(n.getUTCHours())+':'+p(n.getUTCMinutes())+':'+p(n.getUTCSeconds());
  ['utc-clock','footer-clock'].forEach(id => { const e = document.getElementById(id); if(e) e.textContent = id==='footer-clock'?'UTC: '+s:s; });
}
tick(); setInterval(tick, 1000);

// Activity Feed
const feedItems = [
  {icon:'local_hospital', color:'secondary', bg:'secondary-container/40', title:'Medical Assist', time:'14:32', desc:'Section 114, Row J. Dispatching Unit Med-2.'},
  {icon:'security', color:'tertiary', bg:'tertiary/10', title:'Unauthorized Entry', time:'14:28', desc:'Perimeter Gate 3. Secondary fence breach alarm.'},
  {icon:'cleaning_services', color:'primary', bg:'primary/10', title:'Cleanup Required', time:'14:25', desc:'Liquid spill in Suite Corridor B.'},
  {icon:'group', color:'on-surface-variant', bg:'surface-container-high', title:'Staff Shift Change', time:'14:15', desc:'Logistics Team Alpha out. Beta active.'},
  {icon:'bolt', color:'tertiary', bg:'tertiary/10', title:'Power Grid Check', time:'14:10', desc:'Solar panel efficiency 91.2%. Nominal.'},
  {icon:'directions', color:'primary', bg:'primary/10', title:'Route Optimised', time:'14:05', desc:'Gate 7 overflow via North Concourse.'},
];
const feed = document.getElementById('activity-feed');
feedItems.forEach(f => {
  feed.innerHTML += `<div class="flex gap-3 pb-3 border-b border-outline-variant/10 last:border-0">
    <div class="w-8 h-8 rounded shrink-0 bg-${f.bg} flex items-center justify-center">
      <span class="material-symbols-outlined text-${f.color} text-sm">${f.icon}</span>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex justify-between"><p class="text-sm font-bold truncate">${f.title}</p><span class="font-mono-data text-[10px] text-on-surface-variant shrink-0 ml-2">${f.time}</span></div>
      <p class="text-xs text-on-surface-variant">${f.desc}</p>
    </div>
  </div>`;
});

// Elapsed timer
let secs = 272;
const tel = document.getElementById('elapsed-timer');
setInterval(() => {
  secs++;
  const m = Math.floor(secs/60), s = secs%60;
  if(tel) tel.textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}, 1000);

// Heart rate
let hr = 112;
setInterval(() => {
  const e = document.getElementById('heart-rate');
  if(!e) return;
  hr += Math.random()>.5?1:-1;
  hr = Math.max(100,Math.min(130,hr));
  e.textContent = Math.round(hr);
}, 1400);

// Waste metric
let wv = 84.0;
setInterval(() => {
  const e = document.getElementById('waste-metric');
  if(!e) return;
  wv += (Math.random()-.5)*.15;
  wv = Math.max(82,Math.min(87,wv));
  e.innerHTML = wv.toFixed(1)+'<span class="text-xl opacity-50">%</span>';
}, 3000);

// --- Fan AI Chat ---
const RESP = {
  'exit':      '🚪 **Nearest exits:**\n\n• **Gate 8 Overflow** — 180m via Concourse A East ✅ Recommended\n• **Gate 7 North** — 120m ⚠️ Currently congested (15 min wait)\n• **Gate 3 South** — 250m ✅ Clear\n\nFollow the blue floor markers!',
  'parking':   '🅿️ **Parking Guidance:**\n\n• **Zone D (Main)** — Gate 3, ~8 min walk\n• **Zone A (North)** — Pedestrian bridge from Gate 7\n• **Zone C (VIP)** — Gate 1 access, verified pass required\n\nTraffic is moderate. AI suggests departing 15 min early.',
  'food':      '🍔 **F&B near Section 12:**\n\n• **Concourse B** — Burgers, Hotdogs, Beer Garden (Gate 5 side) ⚠️ 15 min wait\n• **Section 12 Kiosk** — Snacks & Drinks ✅ 3 min wait — recommended!\n• **VIP Terrace (Level 3)** — Premium dining, pass required',
  'restroom':  '🚿 **Nearest Restrooms:**\n\n• **Concourse B, Bay 12** — 40m, 2 min ✅\n• **Gate 5 Corridor** — 80m, 3 min\n• **Section 14 Accessible** — ♿ Full accessible facilities, 60m',
  'accessible':'♿ **Accessibility Services:**\n\n• Accessible seating: Sections 1, 12, 24 (ground level)\n• Wheelchair loan: Gate 1 Help Desk\n• Hearing loops: All main entrances\n• Audio description: Gate 1 help desk\n• Guide dog relief areas: Gates 2 & 6',
  'wheelchair':'♿ **Wheelchair & Mobility:**\n\n• Complimentary wheelchair loan at Gate 1\n• Priority entry lanes at all gates\n• Accessible seating: Sections 1, 12, 24\n• Dedicated accessible restrooms at every entrance',
  'medical':   '🚑 **Medical Assistance:**\n\nI\'ve flagged your location to the nearest medical team — **ETA ~2 minutes.**\n\n• Stay where you are and remain calm\n• First Aid stations: Gates 1, 4, 7\n• Emergency: dial **ext. 999** or call **911**',
  'default':   'I\'m here to help! I can assist with:\n\n• 🚪 Navigation & exits\n• 🍔 Food & beverage\n• ♿ Accessibility services\n• 🅿️ Parking guidance\n• 🚿 Facilities\n• 🚑 Medical assistance\n\nWhat can I help you with today?'
};
const CACHED = new Set(['exit','parking','food','restroom','accessible','wheelchair']);
const LANG_NAMES = {en:'English',es:'Español',fr:'Français',de:'Deutsch',pt:'Português',ar:'العربية',zh:'中文',hi:'हिन्दी',ja:'日本語'};
let queryCount=0, cacheHits=0;

function getResp(input) {
  const l = input.toLowerCase();
  for(const k of Object.keys(RESP)) {
    if(k!=='default' && l.includes(k)) return {text:RESP[k], cached:CACHED.has(k)};
  }
  if(/medical|hurt|help|assist|ambulan/.test(l)) return {text:RESP.medical, cached:false};
  return {text:RESP.default, cached:false};
}

function appendMsg(role, text, meta='') {
  const msgs = document.getElementById('chat-messages');
  const isAI = role==='ai';
  const cleanText = DOMPurify.sanitize(text);
  const html = `<div class="flex items-start gap-3 chat-msg ${isAI?'':'flex-row-reverse'}">
    <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isAI?'bg-primary/20 border border-primary/30':'bg-secondary-container/50'}">
      ${isAI?'<span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:\'FILL\' 1">smart_toy</span>':'<span class="material-symbols-outlined text-secondary text-sm" style="font-variation-settings:\'FILL\' 1">person</span>'}
    </div>
    <div class="${isAI?'flex-1 max-w-lg':'max-w-sm'}">
      <div class="${isAI?'bg-surface-container rounded-xl rounded-tl-sm px-4 py-3 border border-outline-variant/30':'bg-primary/15 border border-primary/30 rounded-xl rounded-tr-sm px-4 py-3'}">
        <p class="text-sm text-on-surface whitespace-pre-line">${cleanText.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</p>
      </div>
      <p class="text-[10px] text-on-surface-variant mt-1 ${isAI?'ml-2':'text-right mr-2'}">${meta}</p>
    </div>
  </div>`;
  msgs.insertAdjacentHTML('beforeend', html);
  msgs.scrollTop = 99999;
}

function sendMsg(text) {
  if(!text.trim()) return;
  const lang = document.getElementById('lang-select').value;
  const langName = LANG_NAMES[lang]||'English';
  appendMsg('user', text, 'You · just now');
  document.getElementById('chat-input').value = '';
  const ti = document.getElementById('typing-indicator');
  ti.classList.remove('hidden');
  document.getElementById('chat-messages').scrollTop = 99999;
  const delay = 700 + Math.random()*700;
  setTimeout(() => {
    ti.classList.add('hidden');
    const {text:resp, cached} = getResp(text);
    queryCount++; if(cached) cacheHits++;
    document.getElementById('query-count').textContent = queryCount;
    document.getElementById('cache-hits').textContent = cacheHits;
    document.getElementById('current-lang').textContent = langName;
    document.getElementById('session-stats').textContent = `${queryCount} ${queryCount===1?'query':'queries'} · ${cacheHits} cache hits`;
    appendMsg('ai', resp, `AI · ${cached?'⚡ Redis cached · ':''}${Math.round(delay)}ms · ${langName}`);
  }, delay);
}

document.getElementById('send-btn').addEventListener('click', () => sendMsg(document.getElementById('chat-input').value));
document.getElementById('chat-input').addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg(e.target.value);} });
document.querySelectorAll('.quick-prompt').forEach(b => { b.addEventListener('click', () => sendMsg(b.textContent.trim().replace(/^[^\s]+ /,''))); });
document.getElementById('clear-chat').addEventListener('click', () => {
  document.getElementById('chat-messages').innerHTML='';
  queryCount=0; cacheHits=0;
  document.getElementById('query-count').textContent='0';
  document.getElementById('cache-hits').textContent='0';
  document.getElementById('session-stats').textContent='0 queries · 0 cache hits';
  appendMsg('ai','Conversation cleared. How can I help you?','AI · just now');
});
document.getElementById('stt-btn').addEventListener('click', () => {
  if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){appendMsg('ai','⚠️ Voice input not supported in this browser.','System');return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition, r=new SR();
  const mi=document.getElementById('mic-icon');
  r.lang=document.getElementById('lang-select').value;
  r.onstart=()=>{mi.textContent='mic_off';mi.classList.add('text-error');};
  r.onresult=e=>{const t=e.results[0][0].transcript;document.getElementById('chat-input').value=t;sendMsg(t);};
  r.onend=()=>{mi.textContent='mic';mi.classList.remove('text-error');};
  r.start();
});
document.getElementById('tts-btn').addEventListener('click', () => {
  const msgs=document.getElementById('chat-messages').querySelectorAll('.chat-msg');
  const last=Array.from(msgs).reverse().find(m=>m.querySelector('.text-primary'));
  const text=last?.querySelector('p.text-sm')?.textContent||'';
  if('speechSynthesis' in window&&text){const u=new SpeechSynthesisUtterance(text);u.lang=document.getElementById('lang-select').value;window.speechSynthesis.speak(u);}
});
document.getElementById('lang-select').addEventListener('change', e => {document.getElementById('current-lang').textContent=LANG_NAMES[e.target.value]||e.target.value;});

// Accessibility toggles
document.getElementById('hc-toggle').addEventListener('change', e => {document.body.style.filter=e.target.checked?'contrast(1.35)':'';});
document.getElementById('lt-toggle').addEventListener('change', e => {document.documentElement.style.fontSize=e.target.checked?'18px':'';});
document.getElementById('rm-toggle').addEventListener('change', e => {document.documentElement.style.setProperty('--motion','none');document.body.style.animationDuration=e.target.checked?'0s':'';});

// ══════════════════════════════════════════════════════════════
// TITAN STADIUM — PITCH PHYSICS ENGINE
// ══════════════════════════════════════════════════════════════

// ── Pitch alert tooltips ──
document.getElementById('alert-gate7')?.addEventListener('mouseenter', () => { document.getElementById('tip-gate7').classList.remove('hidden'); });
document.getElementById('alert-gate7')?.addEventListener('mouseleave', () => { document.getElementById('tip-gate7').classList.add('hidden'); });
document.getElementById('alert-med')?.addEventListener('mouseenter',  () => { document.getElementById('tip-med').classList.remove('hidden'); });
document.getElementById('alert-med')?.addEventListener('mouseleave',  () => { document.getElementById('tip-med').classList.add('hidden'); });

// ── Layer toggles ──
document.querySelectorAll('.layer-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const layer = btn.dataset.layer;
    btn.classList.toggle('active');
    btn.classList.toggle('text-on-surface-variant');
    const on = btn.classList.contains('active');
    const show = v => v && (v.style.opacity = on ? '1' : '0');
    if(layer === 'heatmap') show(document.getElementById('heatmap-layer'));
    if(layer === 'players') {
      show(document.getElementById('players-group'));
      show(document.getElementById('ball-group'));
      show(document.getElementById('shadows-group'));
      show(document.getElementById('trails-group'));
    }
    if(layer === 'staff')  show(document.getElementById('staff-group'));
    if(layer === 'access') show(document.getElementById('alert-ok'));
  });
});

// ── Match clock ──
let matchSecs = 47 * 60 + 2;
const matchClockEl = document.getElementById('match-clock');
setInterval(() => {
  if(!matchClockEl) return;
  matchSecs++;
  const m = Math.floor(matchSecs / 60), s = matchSecs % 60;
  matchClockEl.textContent = m < 45 ? `${m}'${String(s).padStart(2,'0')}`
    : m === 45 ? `45+${s}'`
    : m < 90   ? `${m}'`
    : `90+${matchSecs - 90*60}'`;
}, 1000);

// ── Map pings ──
function createPing() {
  const m = document.getElementById('map-section');
  if(!m) return;
  const p = document.createElement('div');
  p.className = 'map-ping';
  p.style.left = (Math.random()*70+15)+'%';
  p.style.top  = (Math.random()*60+20)+'%';
  p.style.zIndex = '25';
  m.appendChild(p);
  setTimeout(() => p.remove(), 2000);
}
setInterval(createPing, 4000);

// ══════════════════════════════════════════════════════════════
// PHYSICS ENGINE
// ══════════════════════════════════════════════════════════════

PitchEngine();

initUI();
