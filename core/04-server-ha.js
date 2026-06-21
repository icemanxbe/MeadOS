// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// SQLite sync, Home Assistant, CSV, version history, temperature
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== SERVER STORAGE LAYER (SQLITE) ====================
// Strategy: MeadOS state lives in a server-side SQLite database (meados.db),
// exposed by server.py through a tiny REST API:
//   GET  /api/data    → full state JSON (404 when nothing saved yet)
//   POST /api/data    → replace the stored state
//   GET  /api/health  → storage metadata (size, last update, history count)
// Every browser that opens this page reads and writes the SAME shared data.
// localStorage acts as offline cache & fallback.

var HA_ENTITY='sensor.meadows_data'; // only used by the optional HA summary publisher
var lastSyncMeta={ts:null,bytes:0,mode:'',ok:false,detail:''};

// Same-origin fetch against the storage API. Returns null on network failure
// so callers can simply `if(res&&res.ok)`.
async function apiFetch(path,opts){
  try{return await fetch(path,opts);}catch(e){return null;}
}

// ==================== OPTIONAL HOME ASSISTANT INTEGRATION ====================
// Home Assistant is NOT required and is never used for data storage. When a
// URL + long-lived access token are configured in Settings, MeadOS can:
//   • read live temperature / humidity / hydrometer sensors
//   • fetch sensor history for the temperature charts
//   • send push notifications through the HA companion app
//   • browse HA media for label images
//   • publish a small status summary entity for the companion Lovelace card
// Leave the URL blank to run MeadOS fully standalone.

// The HA token lives server-side now (see /api/ha proxy). APP._haTokenSet is
// loaded from /api/ha-config at boot; we never hold the raw token in the app.
function haConfigured(){
  return!!(APP.settings.useHA&&(APP.settings.haUrl||APP.settings.haUrlExternal)&&APP._haTokenSet);
}

// Fetch the {hasToken,tokenExp} status from the server (token itself stays put).
async function loadHAConfig(){
  try{
    var r=await fetch('/api/ha-config');
    if(!r.ok)return;
    var j=await r.json();
    APP._haTokenSet=!!(j&&j.hasToken);
    APP._haTokenExp=(j&&j.tokenExp)||null;
  }catch(e){}
}

// ---- Dual-URL resolution (internal + external) ----
// Two base URLs can be configured: internal/LAN and external (Nabu Casa or a
// reverse proxy). REST calls are proxied server-side now; this only feeds the
// media-browser WebSocket, which connects from the browser. Internal first.
function haCandidateUrls(){
  var urls=[];
  [APP.settings.haUrl,APP.settings.haUrlExternal].forEach(function(u){
    if(u&&urls.indexOf(u)<0)urls.push(u);
  });
  return urls;
}

// The HA base URL for the media-browser WebSocket: internal, then external.
function haBaseUrl(){
  var urls=haCandidateUrls();
  return urls.length?urls[0]:'';
}

// fetch with a deadline — an unreachable LAN IP can otherwise hang for the
// full TCP timeout (30s+) before the external fallback gets a chance. The
// budget is generous enough for slow history queries over the internet.
async function haFetchWithTimeout(url,opts,ms){
  if(typeof AbortController==='undefined')return fetch(url,opts);
  var ctrl=new AbortController();
  var t=setTimeout(function(){ctrl.abort();},ms||8000);
  try{return await fetch(url,Object.assign({},opts,{signal:ctrl.signal}));}
  finally{clearTimeout(t);}
}

// ---- Token expiry inspection ----
// The server decodes the token's JWT exp claim (it holds the token now) and
// reports it via /api/ha-config → APP._haTokenExp. Returns {daysLeft, expDate,
// status} or null. `status` ∈ 'expired' | 'critical' (<30d) | 'warning' (<90d) | 'ok'.
function getActiveTokenExpiry(){
  var exp=APP._haTokenExp;
  if(!exp)return null;
  var nowSec=Math.floor(Date.now()/1000);
  var secsLeft=exp-nowSec;
  var daysLeft=Math.floor(secsLeft/86400);
  var status='ok';
  if(secsLeft<=0)status='expired';
  else if(daysLeft<30)status='critical';
  else if(daysLeft<90)status='warning';
  return{daysLeft:daysLeft,expDate:new Date(exp*1000),status:status,source:'server'};
}

// Authenticated HA call, proxied through our own server (POST /api/ha) so the
// token never reaches the browser. The server forwards to the configured HA
// URL and passes the response straight back, so callers keep using res.ok /
// res.status / res.json(). Returns null when HA isn't configured or the proxy
// itself is unreachable.
async function haFetch(path,opts){
  if(!haConfigured())return null;
  opts=opts||{};
  try{
    return await haFetchWithTimeout('/api/ha',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({path:path,method:opts.method||'GET',body:opts.body||null})
    },14000);
  }catch(e){return null;}
}

async function haWriteState(entityId,state,attributes){
  var res=await haFetch('/api/states/'+entityId,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({state:state,attributes:attributes})
  });
  if(!res||!res.ok)return null;
  try{return await res.json();}catch(e){return null;}
}

// Pull the latest gravity reading from a batch's bound gravity sensor (e.g.
// iSpindel, Tilt, RAPT). Pre-fills the SG and Temperature fields on the
// log-reading form. The user still confirms and saves — we don't auto-log,
// because automated logging from these sensors produces noisy data full of
// transient spikes during yeast activity.
async function pullGravityFromSensor(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b||!b.gravitySensorEntity){toast('⚠ No gravity sensor bound to this batch');return;}
  if(!haConfigured()){toast('⚠ Home Assistant not connected');return;}
  var state=await haReadState(b.gravitySensorEntity);
  if(!state||state.state==null||state.state==='unavailable'||state.state==='unknown'){
    toast('⚠ Sensor reports no reading');return;
  }
  var sg=parseFloat(state.state);
  if(isNaN(sg)){toast('⚠ Sensor value is not a number');return;}
  // Some integrations report SG×1000 (e.g. "1045" instead of "1.045"). Detect
  // and rescale — anything >50 is clearly the ×1000 form.
  if(sg>50)sg=sg/1000;
  if(sg<0.98||sg>1.20){toast('⚠ Sensor value out of plausible range: '+sg);return;}
  var gravEl=document.getElementById('log-gravity');
  if(gravEl)gravEl.value=sg.toFixed(3);
  // Some iSpindel-style sensors also report temperature as an attribute
  var tempAttr=state.attributes&&(state.attributes.temperature||state.attributes.temp);
  if(tempAttr!=null){
    var t=parseFloat(tempAttr);
    if(!isNaN(t)){
      var tempEl=document.getElementById('log-temp');
      if(tempEl&&!tempEl.value)tempEl.value=t.toFixed(1);
    }
  }
  toast('📡 '+sg.toFixed(3)+' pulled from sensor — review and tap Log Reading');
}

async function haReadState(entityId){
  var res=await haFetch('/api/states/'+entityId);
  if(!res||!res.ok)return null;
  try{return await res.json();}catch(e){return null;}
}

// Pull historical state data for a sensor entity from HA's history endpoint.
// Used by the cellar / fermenter temperature history graphs.
//   entityId   — HA entity ID (e.g. 'sensor.cellar_temperature')
//   hoursBack  — how far back to fetch (default 24h, max recommended 720h = 30d)
// Returns an array of {timestamp, value} sorted ascending by time, or null on
// error / empty data. State values that aren't parseable as numbers are
// filtered out (e.g. 'unavailable', 'unknown').
async function haFetchHistory(entityId,hoursBack){
  if(!entityId||!haConfigured())return null;
  hoursBack=hoursBack||24;
  var start=new Date(Date.now()-hoursBack*3600000).toISOString();
  // minimal_response cuts the payload roughly in half — we only need state+timestamp
  var url='/api/history/period/'+start+'?filter_entity_id='+encodeURIComponent(entityId)+'&minimal_response';
  var res=await haFetch(url);
  if(!res||!res.ok)return null;
  try{
    var json=await res.json();
    // HA returns an array of arrays — one inner array per entity. We asked for
    // one entity so we take index 0. Empty if no recorded history.
    if(!Array.isArray(json)||!json.length||!Array.isArray(json[0]))return[];
    var points=json[0].map(function(s){
      var v=parseFloat(s.state);
      if(isNaN(v))return null;
      // minimal_response returns last_changed; full response has different shape
      var t=s.last_changed||s.last_updated;
      if(!t)return null;
      return{timestamp:new Date(t),value:v};
    }).filter(Boolean);
    return points;
  }catch(e){return null;}
}

async function haTestConnection(){
  // The MeadOS server reaches HA (not the browser), so this pings HA's root API
  // through the proxy — no browser CORS / mixed-content concerns to report.
  if(!APP.settings.useHA)return{ok:false,msg:'Home Assistant integration is disabled'};
  if(!(APP.settings.haUrl||APP.settings.haUrlExternal))return{ok:false,msg:'No Home Assistant URL'};
  if(!APP._haTokenSet)return{ok:false,msg:'No token — paste a long-lived access token, then Save'};
  var res=await haFetch('/api/');  // HA REST root — 200 with a valid token
  if(res&&res.ok)return{ok:true,msg:'✓ Home Assistant reachable'};
  if(res&&res.status===401)return{ok:false,msg:'✗ Auth rejected — the stored token is wrong or expired'};
  // 502 is our proxy's "couldn't reach HA" code (the MeadOS server forwards).
  if(res&&res.status===502)return{ok:false,msg:'✗ The MeadOS server can\'t reach the HA URL(s). Check the address and that HA is up.'};
  if(res)return{ok:false,msg:'✗ Home Assistant returned HTTP '+res.status};
  return{ok:false,msg:'✗ No response from the MeadOS server.'};
}

async function saveData(force){
  var data=packageState();
  var json=JSON.stringify(data);
  // Always cache locally
  try{localStorage.setItem('meadows_data',json);}catch(e){}
  lastSyncMeta.bytes=json.length;
  setSyncStatus('syncing');
  var res=await apiFetch('/api/data',{
    method:'POST',
    // X-Base-Rev is the rev we last loaded; the server rejects (409) if the
    // stored state moved on since — so a second device can't be clobbered.
    // '*' forces an overwrite (used by the conflict resolver).
    headers:{'Content-Type':'application/json','X-Base-Rev':force?'*':(window._dataRev||'')},
    body:json
  });
  // Conflict — another device saved newer data. Don't retry-clobber; ask.
  if(res&&res.status===409){
    setSyncStatus('error');
    lastSyncMeta={ts:new Date(),bytes:json.length,mode:'server',ok:false,detail:'conflict — newer data on server'};
    if(typeof onSaveConflict==='function')onSaveConflict();
    return false;
  }
  var ok=!!(res&&res.ok);
  lastSyncMeta={ts:new Date(),bytes:json.length,mode:'server',ok:ok,detail:ok?'saved to server (SQLite)':'server unreachable'};
  setSyncStatus(ok?'synced':'error');
  if(ok){
    // Success — capture the new rev, clear any pending state, record timestamp
    try{var b=await res.json();if(b&&b.updatedAt)window._dataRev=b.updatedAt;}catch(e){}
    pendingSync=false;
    try{
      localStorage.removeItem('meadows_pendingSync');
      localStorage.setItem('meadows_lastSyncedTs',new Date().toISOString());
    }catch(e){}
    // Optional: refresh the HA companion-card summary entity
    publishHASummary();
  }else{
    // Failure — mark pending so we retry later
    markPendingSync();
  }
  return ok;
}

// Save-conflict resolver: shown when the server rejects a save because another
// device saved first. The user decides whose version wins (no silent clobber).
function onSaveConflict(){
  if(window._saveConflictShown)return; // don't stack modals on repeated 409s
  window._saveConflictShown=true;
  closeModal();
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-overlay"><div class="modal" style="max-width:460px">'
    +'<div class="modal-title">⚠ SAVE CONFLICT</div>'
    +'<div style="font-size:13px;color:var(--text2);line-height:1.65;margin-bottom:16px">Another device saved newer data while you were editing. To avoid silently overwriting it, your last change was <strong>not</strong> saved. Choose how to resolve:</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
    +'<button class="btn btn-secondary" onclick="resolveSaveConflict(\'reload\')">↻ Load their version (discard my unsaved changes)</button>'
    +'<button class="btn btn-danger" onclick="resolveSaveConflict(\'overwrite\')">⚠ Keep mine (overwrite the server)</button>'
    +'</div></div></div>');
}
function resolveSaveConflict(choice){
  window._saveConflictShown=false;
  closeModal();
  if(choice==='reload'){
    loadData().then(function(){renderMain();toast('↻ Loaded the latest from server');});
  }else if(choice==='overwrite'){
    saveData(true).then(function(ok){if(ok)toast('✦ Saved — overwrote the server copy');});
  }
}

// ==================== CSV EXPORT ====================
function downloadCSV(filename,header,rows){
  var esc=function(v){v=(v==null?'':String(v));return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  var text=[header.join(',')].concat(rows.map(function(r){return r.map(esc).join(',');})).join('\n');
  var blob=new Blob([text],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=filename;
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
}
function exportBatchesCSV(){
  var rows=(APP.batches||[]).map(function(b){
    var bot=APP.bottling[b.id]||{};
    return [b.serial||b.id,b.name,b.style||'',b.startDate||'',b.og||'',bot.fg||'',bot.abv||'',b.honey||'',b.honeyType||'',b.yeast||'',getBatchStatus(b),bot.date||'',bot.bottleCount||''];
  });
  downloadCSV('meados-batches.csv',['Serial','Name','Style','Started','OG','FG','ABV','HoneyKg','HoneyType','Yeast','Status','Bottled','Bottles'],rows);
  toast('✦ Exported '+rows.length+' batch'+(rows.length===1?'':'es'));
}
function exportGravityCSV(){
  var rows=[];
  (APP.batches||[]).forEach(function(b){
    (APP.logs[b.id]||[]).forEach(function(l){
      rows.push([b.serial||b.id,b.name,l.date,l.gravity,(l.temp==null?'':l.temp),(l.ph==null?'':l.ph)]);
    });
  });
  downloadCSV('meados-gravity-logs.csv',['Batch','Name','Date','Gravity','TempC','pH'],rows);
  toast('✦ Exported '+rows.length+' reading'+(rows.length===1?'':'s'));
}

// ==================== VERSION HISTORY (server snapshots) ====================
async function loadHistoryPanel(){
  var el=document.getElementById('history-list');
  if(el)el.innerHTML='Loading…';
  var res=await apiFetch('/api/history');
  if(!res||!res.ok){if(el)el.innerHTML='<span style="color:var(--red2)">Could not load history (server unreachable).</span>';return;}
  var data=null;try{data=await res.json();}catch(e){}
  var items=(data&&data.items)||[];
  if(!el)return;
  if(!items.length){el.innerHTML='No snapshots yet — they appear here once you\'ve saved.';return;}
  el.innerHTML=items.map(function(it){
    var when=it.savedAt||it.updatedAt||'';
    var dt=when?new Date(when):null;
    var label=(dt&&!isNaN(dt))?dt.toLocaleString('en-GB',{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'(unknown time)';
    var kb=it.bytes?(it.bytes/1024).toFixed(0)+' KB':'';
    return'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">'
      +'<div><span style="color:var(--text)">'+label+'</span> <span style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-left:6px">'+kb+'</span></div>'
      +'<button class="btn btn-secondary btn-sm" onclick="restoreHistorySnapshot('+it.id+',&quot;'+label.replace(/"/g,'')+'&quot;)">Restore</button>'
      +'</div>';
  }).join('');
}
async function restoreHistorySnapshot(id,label){
  if(!confirm('Restore the snapshot from '+label+'?\n\nYour current data is saved as a new snapshot first, so you can switch back.'))return;
  try{await saveData();}catch(e){}  // best-effort: ensure current state is in history
  var res=await apiFetch('/api/history/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})});
  if(!res||!res.ok){toast('⚠ Restore failed');return;}
  try{var b=await res.json();if(b&&b.updatedAt)window._dataRev=b.updatedAt;}catch(e){}
  await loadData();
  renderMain();
  toast('✦ Restored snapshot from '+label);
}

// ==================== HA COMPANION-CARD SUMMARY ====================
// Computes compact summary fields for the sensor.meadows_data attributes.
// Each *_lines field is a newline-delimited string the markdown card can
// directly inject; the count/number fields are for stat-card style displays.
function computeHASummary(){
  var now=new Date();
  var activeBatchLines=[];
  var nextMilestoneCandidates=[];
  APP.batches.forEach(function(b){
    var s=getBatchStatus(b);
    if(s==='bottled'||s==='complete')return;
    var d=daysSince(b.startDate);
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    var fermDays=(recipe&&recipe.fermentDays)||42;
    var pct=Math.min(100,Math.round(d/fermDays*100));
    var ferm=getFermenter(b.fermenterId);
    var vesselTag=ferm?' · '+ferm.name:'';
    activeBatchLines.push('- **'+b.name+'** · day '+d+'/'+fermDays+' ('+pct+'%)'+vesselTag);
    // Next-milestone: closest brew-coach step within ±5d, OR bottling
    if(recipe&&recipe.steps){
      recipe.steps.forEach(function(st){
        var offset=st.day-d;
        if(offset>=0&&offset<=14){
          nextMilestoneCandidates.push({days:offset,text:b.name+': '+st.title+(offset===0?' (today)':' in '+fmtDuration(offset))});
        }
      });
    }
    var bottlingDay=fermDays;
    var bottlingOffset=bottlingDay-d;
    if(bottlingOffset>=0&&bottlingOffset<=14){
      nextMilestoneCandidates.push({days:bottlingOffset,text:b.name+': bottling'+(bottlingOffset===0?' today':' in '+fmtDuration(bottlingOffset))});
    }
  });
  var fermenterLines=(APP.fermenters||[]).map(function(f){
    var occ=fermenterOccupiedBy(f.id);
    if(occ){
      var fdays=daysSince(occ.startDate);
      return'- **'+f.name+'**: '+occ.name+' · day '+fdays;
    }
    return'- **'+f.name+'**: 🟢 free';
  });
  var fermentersFree=(APP.fermenters||[]).filter(function(f){return!fermenterOccupiedBy(f.id);}).length;
  var fermentersTotal=(APP.fermenters||[]).length;
  // Drinking window: TWO concepts
  //   drinkingWindowCount = batches with bottles in their drinkable window
  //                          (between minAge and maxAge, with bottles on hand)
  //                          → shown in the glance stat as "Ready / Peak"
  //   drinkingLines       = actionable transitions only (entering / peak / 
  //                          approaching max) → shown in the markdown card
  var drinkingLines=[];
  var drinkingWindowCount=0;
  var bottlesOnHand_total=0;
  var bottlesTotalLifetime=0;
  APP.batches.forEach(function(b){
    var bot=APP.bottling&&APP.bottling[b.id];
    if(!bot)return;
    if(typeof bottlesOriginal==='function')bottlesTotalLifetime+=bottlesOriginal(bot);
    if(typeof bottlesOnHand!=='function')return;
    var onHand=bottlesOnHand(bot);
    bottlesOnHand_total=bottlesOnHand_total+onHand;
    if(onHand<=0)return;
    var status=getDrinkingWindowStatus(b);
    if(!status)return;
    // Count this batch toward "drinkable now" if it's in any in-window state
    if(status.status==='in-window-rising'||status.status==='peak'||status.status==='in-window-falling'){
      drinkingWindowCount++;
    }
    // Lines only for actionable milestones
    if(status.status==='entering'){
      drinkingLines.push('- ⏳ **'+b.name+'** enters drinking window in '+fmtDuration(status.daysUntilReady));
      nextMilestoneCandidates.push({days:status.daysUntilReady,text:b.name+' ready to drink in '+fmtDuration(status.daysUntilReady)});
    } else if(status.status==='peak'){
      drinkingLines.push('- ✦ **'+b.name+'** is at PEAK · '+onHand+' bottle'+(onHand===1?'':'s')+' on hand');
    } else if(status.status==='past-max'){
      drinkingLines.push('- ⚠ **'+b.name+'** past max window · drink soon');
    } else if(status.status==='in-window-rising'&&status.daysUntilPeak<=21){
      // Approaching peak (within 3 weeks) — surface it
      drinkingLines.push('- ↗ **'+b.name+'** approaching peak in '+fmtDuration(status.daysUntilPeak));
    }
  });
  // Pick the soonest milestone
  nextMilestoneCandidates.sort(function(a,b){return a.days-b.days;});
  var nextMilestone=nextMilestoneCandidates.length?nextMilestoneCandidates[0].text:'No upcoming milestones';
  // Cap line strings to keep attributes lean
  function joinAndCap(lines,maxLines){
    if(!lines.length)return'_None_';
    if(lines.length>maxLines)return lines.slice(0,maxLines).join('\n')+'\n- _…and '+(lines.length-maxLines)+' more_';
    return lines.join('\n');
  }
  return{
    activeBatchLines:joinAndCap(activeBatchLines,6),
    fermenterLines:joinAndCap(fermenterLines,8),
    drinkingLines:joinAndCap(drinkingLines,5),
    nextMilestone:nextMilestone,
    bottlesOnHand:bottlesOnHand_total,
    bottlesTotalLifetime:bottlesTotalLifetime,
    fermentersFree:fermentersFree,
    fermentersTotal:fermentersTotal,
    drinkingWindowCount:drinkingWindowCount
  };
}


// ===== Optional HA companion-card publisher =====
// When Home Assistant is configured AND "Publish status summary" is enabled,
// every successful save also refreshes sensor.meadows_data in HA with compact
// summary attributes for the companion Lovelace card. The full data blob is
// NOT sent — storage lives exclusively in the server's SQLite database.
async function publishHASummary(){
  if(!haConfigured()||!APP.settings.haPublishSummary)return;
  var active=APP.batches.filter(function(b){var s=getBatchStatus(b);return s!=='complete'&&s!=='bottled';}).length;
  var summary=computeHASummary();
  await haWriteState(HA_ENTITY,'ok',{
    updated:new Date().toISOString(),
    batch_count:APP.batches.length,
    active_batches:active,
    friendly_name:'MeadOS Data',
    icon:'mdi:glass-mug-variant',
    brewer:APP.settings.brewerName||'MeadOS',
    active_batch_lines:summary.activeBatchLines,
    fermenter_lines:summary.fermenterLines,
    drinking_lines:summary.drinkingLines,
    next_milestone:summary.nextMilestone,
    bottles_on_hand:summary.bottlesOnHand,
    bottles_total_lifetime:summary.bottlesTotalLifetime,
    fermenters_free:summary.fermentersFree,
    fermenters_total:summary.fermentersTotal,
    drinking_window_count:summary.drinkingWindowCount
  });
}

// When the server is unreachable, mark the local data as pending. Retry on:
//   - browser 'online' event (network reconnect)
//   - periodic interval (every 30 s while pending)
//   - explicit user action (Sync Now button)
var pendingSync=false;
var pendingSyncTimer=null;

function markPendingSync(){
  pendingSync=true;
  try{localStorage.setItem('meadows_pendingSync',new Date().toISOString());}catch(e){}
  startPendingSyncWatcher();
}

function startPendingSyncWatcher(){
  if(pendingSyncTimer)return;  // already running
  pendingSyncTimer=setInterval(function(){
    if(!pendingSync){
      clearInterval(pendingSyncTimer);
      pendingSyncTimer=null;
      return;
    }
    if(!navigator.onLine)return;  // browser knows we're offline
    // Retry the save silently
    saveData().then(function(ok){
      if(ok&&typeof toast==='function')toast('✓ Synced (was pending)');
    });
  },30000);
}

if(typeof window!=='undefined'){
  // Resume pending state across reloads
  try{
    if(localStorage.getItem('meadows_pendingSync')){
      pendingSync=true;
    }
  }catch(e){}
  // Listen for connectivity restoration
  window.addEventListener('online',function(){
    if(pendingSync){
      saveData().then(function(ok){
        if(ok&&typeof toast==='function')toast('✓ Reconnected — synced');
      });
    }
  });
  // Listen for visibility change (user comes back to the tab — try to flush)
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden&&pendingSync&&navigator.onLine){
      saveData();
    }
  });
}

async function loadData(){
  setSyncStatus('syncing');
  // Share mode reads the sanitized public endpoint (HA credentials stripped,
  // not password-gated) so share links work for guests.
  var res=await apiFetch(APP._shareMode?'/api/share':'/api/data');
  if(res&&res.status===200){
    try{
      // Capture the rev so the next save can detect concurrent edits.
      if(res.headers&&res.headers.get)window._dataRev=res.headers.get('X-Data-Rev')||null;
      var parsed=await res.json();
      if(parsed){
        applyState(parsed);
        setSyncStatus('synced');
        // Self-heal: migrate any embedded label images to /assets/ references so
        // uploaded designs (and their per-volume clones) stop bloating the state.
        if(!APP._shareMode&&typeof migrateLabelStudioImages==='function')migrateLabelStudioImages();
        var json=JSON.stringify(parsed);
        lastSyncMeta={ts:new Date(),bytes:json.length,mode:'server',ok:true,detail:'loaded from server (SQLite)'};
        try{
          localStorage.setItem('meadows_data',json);
          localStorage.setItem('meadows_lastSyncedTs',new Date().toISOString());
        }catch(e){}
        return true;
      }
    }catch(e){}
  }
  // Server empty (fresh database) or unreachable — fall back to local cache.
  var local=localStorage.getItem('meadows_data');
  if(local){
    try{applyState(JSON.parse(local));lastSyncMeta={ts:new Date(),bytes:local.length,mode:'local',ok:true,detail:'restored from local cache'};}catch(e){}
  }
  setSyncStatus(res&&res.status===404?'local':'error');
}

// ===== Temperature integration =====
async function haReadTemperature(){
  var ent=APP.settings.tempSensorEntity;
  if(!ent||!haConfigured())return null;
  var s=await haReadState(ent);
  if(!s||s.state==null||s.state==='unavailable'||s.state==='unknown')return null;
  var val=parseFloat(s.state);
  if(isNaN(val))return null;
  return{value:val,unit:(s.attributes&&s.attributes.unit_of_measurement)||'°C',ts:new Date()};
}

// Generic per-entity reader. Used by per-fermenter and cellar bindings.
// Returns null on any failure (unset, unreachable, unknown/unavailable, NaN)
// so callers can `if(data)` without further error handling.
async function haReadEntityTemperature(entityId){
  if(!entityId||!haConfigured())return null;
  var s=await haReadState(entityId);
  if(!s||s.state==null||s.state==='unavailable'||s.state==='unknown')return null;
  var val=parseFloat(s.state);
  if(isNaN(val))return null;
  return{value:val,unit:(s.attributes&&s.attributes.unit_of_measurement)||'°C',ts:new Date(),entity:entityId};
}

// In-memory cache of latest readings keyed by entity ID. Refreshed by the
// temp polling loop; consumed by render helpers and the gravity-log temp
// autopopulator. Not persisted (these are live readings, no value once stale).
if(typeof window!=='undefined'&&!window._liveSensorTemps)window._liveSensorTemps={};

// Read a fermenter's temperature from its sensor binding. Returns the cached
// latest value if available (sync) — the polling loop refreshes it. Async
// callers can also call haReadEntityTemperature directly for a fresh read.
function getFermenterLiveTemp(fermenter){
  if(!fermenter||!fermenter.tempSensorEntity)return null;
  return(window._liveSensorTemps||{})[fermenter.tempSensorEntity]||null;
}

// Live temperature for a cabinet. Pass the cabinet object; when called
// without one, falls back to the legacy settings-level cellar sensor.
// Returns the cached value or null if no sensor configured / no reading yet.
function getCellarLiveTemp(cab){
  var ent=cab?cab.tempSensorEntity:(APP.settings&&APP.settings.cellarTempSensorEntity);
  if(!ent)return null;
  return(window._liveSensorTemps||{})[ent]||null;
}

// Live humidity for a cabinet. Same cache pattern as temperatures.
if(typeof window!=='undefined'&&!window._liveSensorHumidities)window._liveSensorHumidities={};
function getCellarLiveHumidity(cab){
  var ent=cab&&cab.humiditySensorEntity;
  if(!ent)return null;
  return(window._liveSensorHumidities||{})[ent]||null;
}

// ===== Yeast-aware fermentation temperature evaluation =====
// Each strain in YEAST_STRAINS carries its OWN optimalTempLow/High (sweet
// spot) and tempToleranceLow/High (safe range). fermentTempEval scores a
// live temperature against the actual strain a batch is using, instead of
// assuming M05's 16-22°C. Returns a zone (matching the pill CSS classes),
// a borderline flag, a short label, and a plain-English 'expect' line.
function yeastShortName(y){
  if(!y)return'yeast';
  return String(y.name||'').split('—')[0].trim()||y.id||'yeast';
}

function fermentTempEval(t,yeast){
  if(t==null)return{zone:null,borderline:false,label:'',expect:''};
  var y=yeast||getYeastById('m05');
  var oL=y.optimalTempLow,oH=y.optimalTempHigh;
  var tL=(y.tempToleranceLow!=null?y.tempToleranceLow:oL-3);
  var tH=(y.tempToleranceHigh!=null?y.tempToleranceHigh:oH+6);
  var name=yeastShortName(y);
  var zone,label,expect;
  if(t>tH){
    zone='danger';label='Above '+name+' safe max ('+tH+'°C)';
    expect='Heat-stressed yeast — fusel (solvent) alcohols, possible early die-off or a stall. Cool toward '+oL+'–'+oH+'°C as soon as you can.';
  }else if(t<tL){
    zone='danger';label='Below '+name+' safe min ('+tL+'°C)';
    expect='Yeast may go dormant and the ferment stall. Warm gradually toward '+oL+'°C — don\'t shock it.';
  }else if(t>oH){
    zone=(tH-t<=2)?'hot':'warm';
    label=(zone==='hot')?'Near '+name+' ceiling ('+tH+'°C)':'Above '+name+' optimal';
    expect=(zone==='hot')
      ?'Fusel alcohols increasingly likely. Bring it down toward '+oH+'°C.'
      :'Faster, fruitier/estery ferment; hot notes if it climbs further. Optimal is '+oL+'–'+oH+'°C.';
  }else if(t<oL){
    zone='cold';label='Below '+name+' optimal';
    expect='Slower but cleaner ferment — usually fine. It can stall below '+tL+'°C. Optimal is '+oL+'–'+oH+'°C.';
  }else{
    zone='optimal';label='In '+name+' sweet spot ('+oL+'–'+oH+'°C)';
    expect='Ideal — clean, characteristic fermentation.';
  }
  var borderline=false;
  if(zone!=='danger'){
    if(t>=tL&&t<=tL+1)borderline=true;
    if(t<=tH&&t>=tH-1)borderline=true;
  }
  return{zone:zone,borderline:borderline,label:label,expect:expect,oL:oL,oH:oH,tL:tL,tH:tH,name:name};
}

function tempZoneColor(zone){
  return{optimal:'#7aa850',cold:'#7aa8c0',warm:'#c89040',hot:'#c87850',danger:'#c83030'}[zone]||'var(--text3)';
}

// Active batches that are still fermenting/aging (not bottled/complete/failed).
function activeFermentingBatches(){
  return(APP.batches||[]).filter(function(b){
    var s=getBatchStatus(b);
    return s!=='complete'&&s!=='bottled'&&s!=='failed';
  });
}

// Aggregate one temperature across every active batch's strain — used by the
// global top-bar sensor pill, which isn't tied to a single fermenter. Surfaces
// the most concerning zone and a per-strain summary.
function aggregateFermentEval(t){
  var sev={optimal:1,cold:2,warm:2,hot:3,danger:4};
  var active=activeFermentingBatches();
  if(!active.length){
    var ev=fermentTempEval(t,getYeastById('m05'));
    return{zone:ev.zone,borderline:ev.borderline,summary:ev.label+' — '+ev.expect,count:0};
  }
  var worst=null,wb=false,lines=[];
  active.forEach(function(b){
    var ev=fermentTempEval(t,getYeastById(b.yeast||'m05'));
    lines.push(b.name+' ('+ev.name+'): '+ev.label);
    if(ev.borderline)wb=true;
    if(!worst||sev[ev.zone]>sev[worst.zone])worst=ev;
  });
  return{zone:worst.zone,borderline:wb,summary:lines.join(' · '),count:active.length};
}

// Back-compat: callers that still want the old M05-based zone keep working.
function tempZone(t){return fermentTempEval(t,getYeastById('m05')).zone;}
function tempZoneLabel(zone){
  return{
    optimal:'In optimal range (clean, characteristic ferment)',
    cold:'Below optimal — slower, cleaner ferment',
    warm:'Above optimal — fruitier/hotter esters',
    hot:'Near the upper limit — fusel alcohols likely',
    danger:'Outside the strain\'s safe range'
  }[zone]||'';
}

// Cellar-specific zone — cellar is a STORAGE environment for bottled mead,
// not a fermentation vessel. Stable cool temps are what matter; the optimum
// is 10-14°C and roughly stable. Strong daily/weekly swings hurt aging more
// than a slightly-off mean does.
function cellarTempZone(t){
  if(t==null)return null;
  if(t<4||t>22)return'danger';   // freezing risk / actively bad for aging
  if(t>18)return'warm';           // accelerated aging, risk of oxidation
  if(t<8)return'cold';            // fine for sweet meads, slows aging
  return'optimal';                 // 8-18°C window, 10-14°C ideal
}

function cellarTempZoneLabel(zone){
  return{
    optimal:'Stable cellar range (8–18°C, ideal 10–14°C)',
    cold:'Slow-aging side — fine, especially for sweet meads',
    warm:'Above ideal — accelerates aging, watch for oxidation',
    danger:'OUTSIDE SAFE CELLAR RANGE — relocate bottles if possible'
  }[zone]||'';
}

// ===== Aging: yeast reactivation risk =====
// During aging the yeast is dormant, not fermenting — so the strain's
// fermentation optimum isn't the right yardstick. What matters is whether a
// warm cabinet could wake residual/bottle-conditioning yeast and re-ferment
// any leftover sugar (bottle pressure / gushers). High-ABV, aggressive
// strains are the restart-prone ones.
function yeastRestartProne(y){
  if(!y)return false;
  if(typeof y.abvMax==='number'&&y.abvMax>=16)return true;
  return /bayanus|champagne|ec-?1118|k1v|71b|premier|cuvee/i.test((y.name||'')+' '+(y.strain||''));
}

function agingReactivationNote(t,yeast){
  if(t==null||!yeast)return null;
  var name=yeastShortName(yeast);
  if(t>=18&&yeastRestartProne(yeast)){
    return{level:'warn',text:name+' is restart-prone — at '+t.toFixed(1)+'°C any back-sweetened or bottle-conditioned mead risks re-fermentation and bottle pressure. Keep below ~15°C to hold it dormant.'};
  }
  if(t<=15){
    return{level:'ok',text:name+' stays safely dormant at this temperature.'};
  }
  return{level:'info',text:name+': low reactivation risk, but cooler (≤14°C) is better for long aging.'};
}

// Split a cabinet's residents by what they're doing right now, grouped by
// yeast strain. A fermenter on a shelf whose batch is still in primary or
// secondary (status fermenting/conditioning) counts as ACTIVELY FERMENTING —
// the cabinet temperature then has to suit the strain's fermentation. Anything
// else here (bulk-aging carboys, bottled batches resting on shelves) is AGING,
// where the yeast is dormant and only reactivation risk matters.
function cabinetYeasts(cab){
  if(!cab)return{fermenting:[],aging:[]};
  var shelfIds={};
  (cab.shelves||[]).forEach(function(s){shelfIds[s.id]=true;});
  var ferm={},aging={};
  function isFermenting(b){
    var s=(typeof getBatchStatus==='function')?getBatchStatus(b):'aging';
    return s==='fermenting'||s==='conditioning';
  }
  function add(b,fermentingNow){
    if(!b)return;
    var bucket=fermentingNow?ferm:aging;
    var y=getYeastById(b.yeast||'m05');
    if(bucket[y.id]){bucket[y.id].batches.push(b.name);return;}
    bucket[y.id]={yeast:y,batches:[b.name]};
  }
  (APP.batches||[]).forEach(function(b){
    var bot=APP.bottling[b.id];
    if(bot&&bot.cellarShelfId&&shelfIds[bot.cellarShelfId])add(b,false);        // bottled → always aging
    else if(b.cellarShelfId&&shelfIds[b.cellarShelfId])add(b,isFermenting(b));  // carboy on a shelf → by stage
  });
  (APP.fermenters||[]).forEach(function(f){
    if(!f.cellarShelfId||!shelfIds[f.cellarShelfId])return;
    var ab=(typeof activeBatchForFermenter==='function')?activeBatchForFermenter(f.id):null;
    if(ab)add(ab,isFermenting(ab));                                             // fermenter vessel → by stage
  });
  function list(m){return Object.keys(m).map(function(k){return m[k];});}
  return{fermenting:list(ferm),aging:list(aging)};
}

// ===== Temperature advice modals (clicked from the pills) =====
function tempZoneBadge(zone,borderline){
  var c=tempZoneColor(zone);
  var lbl=(zone||'').toUpperCase()+(borderline?' · BORDERLINE':'');
  return'<span style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;background:'+c+'22;color:'+c+';border:1px solid '+c+'66;padding:3px 9px;border-radius:10px">'+lbl+'</span>';
}

// One strain's fermentation reading — shared by the fermenter/topbar modals.
function fermentAdviceRow(t,yeast,contextLabel){
  var ev=fermentTempEval(t,yeast);
  var c=tempZoneColor(ev.zone);
  return'<div style="background:var(--bg);border-left:3px solid '+c+';border-radius:var(--radius);padding:12px 14px;margin-bottom:8px">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
      +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(ev.name)+(contextLabel?' <span style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">· '+escHtml(contextLabel)+'</span>':'')+'</div>'
      +tempZoneBadge(ev.zone,ev.borderline)
    +'</div>'
    +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-bottom:6px">optimal '+ev.oL+'–'+ev.oH+'°C · safe '+ev.tL+'–'+ev.tH+'°C</div>'
    +'<div style="font-size:13px;color:var(--text);font-weight:500;margin-bottom:3px">'+escHtml(ev.label)+'</div>'
    +'<div style="font-size:12.5px;color:var(--text2);line-height:1.55">'+escHtml(ev.expect)+'</div>'
    +'</div>';
}

function tempAdviceModal(title,tempLine,bodyHtml){
  closeModal();
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:560px;max-height:90vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">'+title+'</div>'
    +(tempLine?'<div style="font-family:var(--font-display);font-size:30px;color:var(--gold2);text-align:center;margin:4px 0 14px">'+tempLine+'</div>':'')
    +'<div style="flex:1;overflow-y:auto;min-height:0;padding-right:4px">'+bodyHtml+'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function showFermenterTempAdvice(fermenterId){
  var f=getFermenter(fermenterId);
  if(!f){toast('⚠ Fermenter not found');return;}
  var lt=(typeof getFermenterLiveTemp==='function')?getFermenterLiveTemp(f):null;
  if(!lt){toast('⚠ No live reading for this fermenter');return;}
  var occ=fermenterOccupiedBy(f.id);
  var body;
  if(occ){
    body=fermentAdviceRow(lt.value,getYeastById(occ.yeast||'m05'),occ.name);
  }else{
    body='<div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:10px">No batch is in <strong>'+escHtml(f.name)+'</strong> right now, so this is judged against the default mead yeast (M05). Assign a batch to evaluate against its actual strain.</div>'
      +fermentAdviceRow(lt.value,getYeastById('m05'),'default');
  }
  tempAdviceModal('🌡 '+escHtml(f.name)+' — Fermentation Temp',lt.value.toFixed(1)+lt.unit,body);
}

// Global top-bar sensor: evaluate against every active batch's strain.
function showFermentTempAdvice(){
  if(!currentTemp||currentTemp.value==null){toast('⚠ No live temperature');return;}
  var active=activeFermentingBatches();
  var body;
  if(!active.length){
    body='<div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:10px">No active batches right now — judged against the default mead yeast (M05).</div>'
      +fermentAdviceRow(currentTemp.value,getYeastById('m05'),'default');
  }else{
    body='<div style="font-size:12.5px;color:var(--text3);margin-bottom:10px">This is the fallback fermentation sensor, evaluated against each active batch\'s yeast:</div>'
      +active.map(function(b){return fermentAdviceRow(currentTemp.value,getYeastById(b.yeast||'m05'),b.name);}).join('');
  }
  tempAdviceModal('🌡 Fermentation Temperature',currentTemp.value.toFixed(1)+currentTemp.unit,body);
}

// Cellar cabinet temperature advice. The fermentation warning is only shown
// for residents ACTIVELY fermenting in the cabinet; bulk-aging and bottled
// residents get the aging environment + reactivation risk instead.
function showCabinetTempAdvice(cabinetId){
  var cab=(typeof getCabinet==='function')?getCabinet(cabinetId):null;
  if(!cab){toast('⚠ Cabinet not found');return;}
  var lt=(typeof getCellarLiveTemp==='function')?getCellarLiveTemp(cab):null;
  if(!lt){toast('⚠ No live reading for this cabinet');return;}
  var t=lt.value;
  var res=cabinetYeasts(cab);
  var body='';

  // ── Actively fermenting → fermentation temperature is the signal. A vessel
  // mid-ferment sitting in a cold aging cabinet (e.g. 12°C) would stall, so
  // judge it against the strain's fermentation range, not the aging band.
  if(res.fermenting.length){
    body+='<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">⚗ FERMENTING NOW — FERMENTATION TEMPERATURE</div>';
    res.fermenting.forEach(function(r){
      body+=fermentAdviceRow(t,r.yeast,r.batches.length+' batch'+(r.batches.length===1?'':'es'));
    });
    body+='<div style="font-size:11.5px;color:var(--text3);font-style:italic;line-height:1.5;margin:2px 0 14px">A vessel still in primary/secondary is judged against its yeast\'s fermentation range — a cabinet set for aging can run too cold for an active ferment.</div>';
  }

  // ── Aging environment — shown when something is aging here, or the cabinet
  // is empty. Suppressed when the cabinet is purely an active-ferment space.
  if(res.aging.length||!res.fermenting.length){
    var az=cellarTempZone(t),ac=tempZoneColor(az);
    body+='<div style="background:var(--bg);border-left:3px solid '+ac+';border-radius:var(--radius);padding:12px 14px;margin-bottom:14px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">Aging environment</div>'+tempZoneBadge(az,false)+'</div>'
      +'<div style="font-size:12.5px;color:var(--text2);line-height:1.55">'+escHtml(cellarTempZoneLabel(az))+'. Cabinet target '+cab.targetTemp+'°C ('+cab.targetTempMin+'–'+cab.targetTempMax+'°C).</div>'
      +'</div>';
  }

  // ── Aging residents → reactivation risk only (yeast dormant; fermentation
  // range is irrelevant during aging, so it's intentionally omitted here).
  if(res.aging.length){
    body+='<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">🛢 AGING — RESIDENT STRAINS &amp; REACTIVATION RISK</div>';
    res.aging.forEach(function(r){
      var note=agingReactivationNote(t,r.yeast);
      var ncolor=note?{warn:'#c83030',info:'var(--text3)',ok:'#7aa850'}[note.level]:'var(--text3)';
      body+='<div style="background:var(--bg);border-left:3px solid '+(note&&note.level==='warn'?'#c83030':'var(--border2)')+';border-radius:var(--radius);padding:12px 14px;margin-bottom:8px">'
        +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)'+(note?';margin-bottom:6px':'')+'">'+escHtml(yeastShortName(r.yeast))+' <span style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">· '+r.batches.length+' batch'+(r.batches.length===1?'':'es')+'</span></div>'
        +(note?'<div style="font-size:12.5px;color:'+ncolor+';line-height:1.55">'+(note.level==='warn'?'⚠ ':note.level==='ok'?'✓ ':'• ')+escHtml(note.text)+'</div>':'')
        +'</div>';
    });
  }else if(!res.fermenting.length){
    body+='<div style="font-size:13px;color:var(--text3);font-style:italic">No batches placed on this cabinet\'s shelves yet.</div>';
  }

  tempAdviceModal('🌡 '+escHtml(cab.name||cab.model||'Cabinet')+' — Temperature',t.toFixed(1)+lt.unit,body);
}

async function updateTempPill(){
  var pill=document.getElementById('topbar-temp');
  if(!pill)return;
  if(!APP.settings.tempSensorEntity||!haConfigured()){
    pill.style.display='none';return;
  }
  var data=await haReadTemperature();
  if(!data){pill.style.display='none';currentTemp=null;return;}
  currentTemp=data;
  var agg=aggregateFermentEval(data.value);
  pill.className='temp-pill '+agg.zone;
  pill.textContent='🌡 '+data.value.toFixed(1)+data.unit+(agg.borderline?' ⚠':'');
  pill.style.display='inline-flex';
  pill.style.cursor='pointer';
  pill.title=agg.summary+' · click for detail';
  pill.onclick=function(){showFermentTempAdvice();};
  // Anomaly detection — alerts on sustained out-of-range temperatures
  if(typeof checkTempAnomalies==='function')checkTempAnomalies(data.value);
}

// Refresh the in-memory live-temp cache from every bound sensor — per-fermenter
// bindings + the cellar sensor. Called from the polling loop. Failures are
// silent; entries get removed if a sensor goes unavailable so stale numbers
// don't linger on cards.
async function refreshAllSensorTemps(){
  if(!haConfigured())return;
  if(!window._liveSensorTemps)window._liveSensorTemps={};
  if(!window._liveSensorHumidities)window._liveSensorHumidities={};
  var tempEntities=[];
  var humidityEntities=[];
  (APP.fermenters||[]).forEach(function(f){
    if(f.tempSensorEntity)tempEntities.push(f.tempSensorEntity);
  });
  // Legacy single-sensor config
  if(APP.settings.cellarTempSensorEntity)tempEntities.push(APP.settings.cellarTempSensorEntity);
  // Cabinets — temp AND humidity sensors for every configured cabinet
  (APP.cabinets||[]).forEach(function(cab){
    if(cab.tempSensorEntity)tempEntities.push(cab.tempSensorEntity);
    if(cab.humiditySensorEntity)humidityEntities.push(cab.humiditySensorEntity);
  });
  // De-duplicate (same sensor could be bound twice)
  tempEntities=Array.from(new Set(tempEntities));
  humidityEntities=Array.from(new Set(humidityEntities));
  // Fire both in parallel; haReadEntityTemperature is actually a generic state
  // reader that returns {value, unit} — works for any numeric sensor including
  // humidity. The name is historical from the early temp-only days.
  var jobs=[];
  jobs=jobs.concat(tempEntities.map(function(e){return haReadEntityTemperature(e).then(function(d){return{kind:'t',ent:e,data:d};});}));
  jobs=jobs.concat(humidityEntities.map(function(e){return haReadEntityTemperature(e).then(function(d){return{kind:'h',ent:e,data:d};});}));
  if(!jobs.length)return;
  var results=await Promise.all(jobs);
  results.forEach(function(r){
    var cache=r.kind==='t'?window._liveSensorTemps:window._liveSensorHumidities;
    if(r.data)cache[r.ent]=r.data;
    else delete cache[r.ent];
  });
}

function startTempPolling(){
  clearInterval(tempPollTimer);
  updateTempPill();
  refreshAllSensorTemps();
  tempPollTimer=setInterval(function(){
    updateTempPill();
    refreshAllSensorTemps();
  },60000); // every minute
}

// ===== HA service calls (for push notifications) =====
async function haCallService(domain,service,data){
  var res=await haFetch('/api/services/'+domain+'/'+service,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(data||{})
  });
  return res&&res.ok;
}

async function maybeNotifyForToday(){
  if(!APP.settings.notificationsEnabled||!APP.settings.notificationService)return;
  if(!haConfigured())return;
  var todayKey=today();
  var tasks=getTodayTasks();
  // ===== 1. Today's scheduled tasks =====
  for(var i=0;i<tasks.length;i++){
    var t=tasks[i];
    var key=todayKey+'-'+t.id;
    if(APP.notifiedTasks[key])continue;
    if(isTaskDone(t.id))continue;
    var ok=await haCallService('notify',APP.settings.notificationService,{
      title:'⚗ MeadOS: '+t.batch,
      message:t.title+' — Day '+t.day,
      data:{tag:'meados-'+t.id}
    });
    if(ok){APP.notifiedTasks[key]=true;scheduleSave();}
  }
  // ===== 2. Smart contextual alerts (only checked once per day) =====
  await checkSmartNotifications(todayKey);
  // ===== 3. Anniversary reminders =====
  await checkAnniversaryNotifications(todayKey);
  // Cleanup keys older than today
  Object.keys(APP.notifiedTasks).forEach(function(k){
    if(!k.startsWith(todayKey))delete APP.notifiedTasks[k];
  });
}

async function checkSmartNotifications(todayKey){
  var active=APP.batches.filter(function(b){var s=getBatchStatus(b);return s!=='complete'&&s!=='bottled'&&s!=='failed';});
  for(var i=0;i<active.length;i++){
    var b=active[i];
    var logs=APP.logs[b.id]||[];
    var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
    // ---- a) Stale: 7+ days since last reading on an active batch ----
    var lastLog=logs.length?logs[logs.length-1]:null;
    var daysSinceLog=lastLog?Math.floor((Date.now()-new Date(lastLog.date).getTime())/86400000):daysSince(b.startDate);
    if(daysSinceLog>=7){
      var key=todayKey+'-stale-'+b.id;
      if(!APP.notifiedTasks[key]){
        var ok=await haCallService('notify',APP.settings.notificationService,{
          title:'⚗ '+b.name+' — No reading in '+fmtDuration(daysSinceLog),
          message:'Take a hydrometer reading to track fermentation progress.',
          data:{tag:'meados-stale-'+b.id}
        });
        if(ok){APP.notifiedTasks[key]=true;scheduleSave();}
      }
    }
    // ---- b) FG plateau: 2+ readings stable within 0.001 over 3+ days ----
    if(logs.length>=2){
      var last=logs[logs.length-1];
      var prev=logs[logs.length-2];
      var gravDiff=Math.abs((last.gravity||0)-(prev.gravity||0));
      var dayGap=Math.floor((new Date(last.date)-new Date(prev.date))/86400000);
      if(gravDiff<=0.001&&dayGap>=3&&last.gravity<=1.020){
        // Fermentation appears complete
        var key=todayKey+'-plateau-'+b.id;
        if(!APP.notifiedTasks[key]){
          var ok=await haCallService('notify',APP.settings.notificationService,{
            title:'⚗ '+b.name+' — Fermentation may be complete',
            message:'SG stable at '+last.gravity+' for '+dayGap+'+ days. Consider racking or bottling.',
            data:{tag:'meados-plateau-'+b.id}
          });
          if(ok){APP.notifiedTasks[key]=true;scheduleSave();}
        }
      }
    }
    // ---- c) Temp deviation: current temp is in danger or hot zone ----
    if(currentTemp&&currentTemp.value!=null){
      var evB=fermentTempEval(currentTemp.value,getYeastById(b.yeast||'m05'));
      if(evB.zone==='danger'||evB.zone==='hot'){
        var key=todayKey+'-temp-'+b.id+'-'+evB.zone;
        if(!APP.notifiedTasks[key]){
          var ok=await haCallService('notify',APP.settings.notificationService,{
            title:'🌡 '+b.name+' — temp '+(evB.zone==='danger'?'out of range for '+evB.name:'too high for '+evB.name),
            message:'Currently '+currentTemp.value.toFixed(1)+'°C. '+evB.label+'. '+evB.expect,
            data:{tag:'meados-temp-'+b.id}
          });
          if(ok){APP.notifiedTasks[key]=true;scheduleSave();}
        }
      }
    }
  }
  // ---- d) Aging milestones for bottled batches ----
  var bottledKeys=Object.keys(APP.bottling);
  for(var j=0;j<bottledKeys.length;j++){
    var bid=bottledKeys[j];
    var bot=APP.bottling[bid];
    var b=APP.batches.find(function(x){return x.id===bid;});
    if(!b||!bot.date)continue;
    if(bottlesOnHand(bot)===0)continue;
    var profile=getAgingProfile(b);
    var daysAged=Math.floor((Date.now()-new Date(bot.date).getTime())/86400000);
    // Notify when crossing the "ready" threshold (within 24h of it)
    if(daysAged===profile.minDays){
      var key=todayKey+'-ready-'+bid;
      if(!APP.notifiedTasks[key]){
        var ok=await haCallService('notify',APP.settings.notificationService,{
          title:'🍾 '+b.name+' is ready to drink',
          message:'Aged '+profile.minDays+' days — minimum aging window reached. Peak in '+(profile.peakDays-profile.minDays)+' more days.',
          data:{tag:'meados-ready-'+bid}
        });
        if(ok){APP.notifiedTasks[key]=true;scheduleSave();}
      }
    }
    // Notify when crossing peak
    if(daysAged===profile.peakDays){
      var key=todayKey+'-peak-'+bid;
      if(!APP.notifiedTasks[key]){
        var ok=await haCallService('notify',APP.settings.notificationService,{
          title:'⭐ '+b.name+' has reached peak',
          message:'Aged '+profile.peakDays+' days. This is the prime drinking window — pour one to celebrate.',
          data:{tag:'meados-peak-'+bid}
        });
        if(ok){APP.notifiedTasks[key]=true;scheduleSave();}
      }
    }
  }
  // ---- e) Overdue additions ----
  var overdueAdds=(typeof getOverdueAdditions==='function')?getOverdueAdditions():[];
  for(var k=0;k<overdueAdds.length;k++){
    var oa=overdueAdds[k];
    var key=todayKey+'-overdueadd-'+oa.addition.id;
    if(!APP.notifiedTasks[key]){
      var ok=await haCallService('notify',APP.settings.notificationService,{
        title:'⚠ Remove '+oa.addition.item,
        message:'Past removal date in '+oa.batch.name+'. Extended contact may over-extract.',
        data:{tag:'meados-overdueadd-'+oa.addition.id}
      });
      if(ok){APP.notifiedTasks[key]=true;scheduleSave();}
    }
  }
}

async function checkAnniversaryNotifications(todayKey){
  var now=new Date();
  var todayMonth=now.getMonth(),todayDate=now.getDate();
  var bids=Object.keys(APP.bottling);
  for(var i=0;i<bids.length;i++){
    var bid=bids[i];
    var bot=APP.bottling[bid];
    var b=APP.batches.find(function(x){return x.id===bid;});
    if(!b||!bot.date)continue;
    var bDate=new Date(bot.date);
    if(bDate.getMonth()===todayMonth&&bDate.getDate()===todayDate){
      // Anniversary — check it's been at least 1 full year
      var yearsAgo=now.getFullYear()-bDate.getFullYear();
      if(yearsAgo>=1){
        var key=todayKey+'-anniversary-'+bid;
        if(!APP.notifiedTasks[key]){
          var msg=yearsAgo===1
            ?'Bottled exactly 1 year ago. Pour one for a vertical tasting — see how it aged.'
            :'Bottled '+yearsAgo+' years ago. Still '+bottlesOnHand(bot)+' bottle'+(bottlesOnHand(bot)!==1?'s':'')+' on-hand if any survived.';
          var ok=await haCallService('notify',APP.settings.notificationService,{
            title:'🎂 '+b.name+' — '+yearsAgo+' year'+(yearsAgo!==1?'s':'')+' aged today',
            message:msg,
            data:{tag:'meados-anniv-'+bid}
          });
          if(ok){APP.notifiedTasks[key]=true;scheduleSave();}
        }
      }
    }
  }
}

// ===== Bottle count helpers — multi-size aware =====
// Each `bot.locations[loc]` is an object keyed by size-in-ml: {500:N, 750:M}.
// Legacy data with numeric location values is auto-migrated on read (treated as 750ml).
// bottlesOriginal / bottlesAtBottling stay IMMUTABLE after bottling — drives cost math.

var DEFAULT_BOTTLE_SIZE=750; // ml — legacy default before size-aware bottling

function _coerceLocations(loc){
  // Accept legacy numeric value, or {ml500:N,ml750:M} (older key style), or {500:N,750:M}.
  // Returns a canonical {size:count} map.
  if(loc==null)return{};
  if(typeof loc==='number')return loc>0?{[DEFAULT_BOTTLE_SIZE]:loc}:{};
  if(typeof loc!=='object')return{};
  var out={};
  Object.keys(loc).forEach(function(k){
    var size=parseInt(String(k).replace(/^ml/,''));
    if(!isNaN(size)&&size>0){
      out[size]=(out[size]||0)+(parseInt(loc[k])||0);
    }
  });
  return out;
}

function activeBottleSizes(bot){
  // Sizes actually used in this bottling (sticky if declared on bot.bottleSizes,
  // else derived from locations + countsAtBottling). Defaults to [750] when no data.
  var sizes={};
  if(bot){
    if(Array.isArray(bot.bottleSizes))bot.bottleSizes.forEach(function(s){if(parseInt(s)>0)sizes[parseInt(s)]=true;});
    if(bot.countsAtBottling)Object.keys(_coerceLocations(bot.countsAtBottling)).forEach(function(s){sizes[s]=true;});
    if(bot.locations)Object.keys(bot.locations).forEach(function(loc){
      Object.keys(_coerceLocations(bot.locations[loc])).forEach(function(s){sizes[s]=true;});
    });
  }
  var arr=Object.keys(sizes).map(function(s){return parseInt(s);}).filter(function(s){return s>0;}).sort(function(a,b){return a-b;});
  return arr.length?arr:[DEFAULT_BOTTLE_SIZE];
}

function bottlesInLocationBySize(bot,loc,size){
  if(!bot||!bot.locations||!bot.locations[loc])return 0;
  var m=_coerceLocations(bot.locations[loc]);
  return m[parseInt(size)]||0;
}

function bottlesInLocation(bot,loc){
  if(!bot||!bot.locations||!bot.locations[loc])return 0;
  var m=_coerceLocations(bot.locations[loc]);
  return Object.keys(m).reduce(function(s,k){return s+(m[k]||0);},0);
}

function bottlesOriginalBySize(bot,size){
  if(!bot)return 0;
  if(bot.countsAtBottling){
    var m=_coerceLocations(bot.countsAtBottling);
    return m[parseInt(size)]||0;
  }
  // Legacy: bottleCount/bottlesAtBottling are all DEFAULT_BOTTLE_SIZE
  if(parseInt(size)===DEFAULT_BOTTLE_SIZE){
    return parseInt(bot.bottlesAtBottling)||parseInt(bot.bottleCount)||0;
  }
  return 0;
}

function bottlesOriginal(bot){
  if(!bot)return 0;
  if(bot.countsAtBottling){
    var m=_coerceLocations(bot.countsAtBottling);
    return Object.keys(m).reduce(function(s,k){return s+(m[k]||0);},0);
  }
  if(bot.bottlesAtBottling!=null)return parseInt(bot.bottlesAtBottling)||0;
  if(bot.bottleCount!=null)return parseInt(bot.bottleCount)||0;
  if(bot.locations)return Object.keys(bot.locations).reduce(function(s,loc){return s+bottlesInLocation(bot,loc);},0);
  return 0;
}

function totalBottles(bot){
  if(!bot)return 0;
  if(bot.locations){
    return Object.keys(bot.locations).reduce(function(s,loc){return s+bottlesInLocation(bot,loc);},0);
  }
  return parseInt(bot.bottleCount)||0;
}

function bottlesInCellar(bot){return bottlesInLocation(bot,'cellar');}

// Lifetime roll-up across every batch for the dashboard headline stats. A
// 'complete' batch (bottled then fully drunk/gifted) is gone — it counts in
// the lifetime totals but NOT in "under your care".
function lifetimeStats(){
  var s={total:0,active:0,bottledBatches:0,complete:0,failed:0,
          onHand:0,cellar:0,fridge:0,gifted:0,bottledEver:0,drunk:0,bySize:{}};
  (APP.batches||[]).forEach(function(b){
    s.total++;
    var st=getBatchStatus(b);
    if(st==='failed'||b.failed){s.failed++;return;}
    if(st==='complete')s.complete++;
    else if(st==='bottled')s.bottledBatches++;
    else s.active++;
    var bot=APP.bottling[b.id];
    if(!bot)return;
    s.bottledEver+=bottlesOriginal(bot);
    s.cellar+=bottlesInLocation(bot,'cellar');
    s.fridge+=bottlesInLocation(bot,'fridge');
    s.onHand+=bottlesOnHand(bot);
    s.gifted+=bottlesInLocation(bot,'gifted');
    (bot.bottleSizes||(bot.countsAtBottling?Object.keys(bot.countsAtBottling):[DEFAULT_BOTTLE_SIZE])).forEach(function(sz){
      sz=parseInt(sz); if(!sz)return;
      s.bySize[sz]=(s.bySize[sz]||0)+bottlesOriginalBySize(bot,sz);
    });
  });
  // Drunk = everything bottled minus what's still on-hand minus what was gifted.
  s.drunk=Math.max(0,s.bottledEver-s.onHand-s.gifted);
  // "In your care" = still fermenting or sitting in your cellar (not gone).
  s.inCare=s.active+s.bottledBatches;
  return s;
}
// Compact "12×750 · 8×500" size breakdown from a {size:count} map (ml→cl label).
function fmtBottleSizes(bySize){
  var keys=Object.keys(bySize||{}).filter(function(k){return bySize[k]>0;}).sort(function(a,b){return b-a;});
  if(!keys.length)return '';
  return keys.map(function(k){return bySize[k]+'×'+(parseInt(k)/10)+'cl';}).join(' · ');
}

function bottlesOnHand(bot){
  // Bottles you still own — cellar + fridge + other (NOT gifted, those are gone)
  if(!bot)return 0;
  if(bot.locations)return bottlesInLocation(bot,'cellar')+bottlesInLocation(bot,'fridge')+bottlesInLocation(bot,'other');
  return parseInt(bot.bottleCount)||0;
}

// Time-capsule reservations: bottles set aside for a specific future event
// (anniversary, milestone birthday, etc.). Count against on-hand totals so
// you don't accidentally drink them — but unlike "gifted" they stay in the
// cellar and become available again when the open-date passes.
function getActiveTimeCapsules(batch){
  if(!batch||!Array.isArray(batch.timeCapsules))return[];
  var today=new Date().toISOString().slice(0,10);
  return batch.timeCapsules.filter(function(tc){
    return tc&&tc.count>0&&(!tc.openDate||tc.openDate>today);
  });
}

function getReservedBottleCount(batch){
  return getActiveTimeCapsules(batch).reduce(function(s,tc){return s+(parseInt(tc.count)||0);},0);
}

function addTimeCapsule(batchId,count,openDate,reason){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  if(!Array.isArray(b.timeCapsules))b.timeCapsules=[];
  count=parseInt(count)||0;
  if(count<=0){toast('⚠ Count must be > 0');return;}
  var onHand=bottlesOnHand(APP.bottling[batchId]);
  var alreadyReserved=getReservedBottleCount(b);
  if(count>onHand-alreadyReserved){
    toast('⚠ Only '+(onHand-alreadyReserved)+' free bottle'+(onHand-alreadyReserved===1?'':'s')+' available to reserve');
    return;
  }
  b.timeCapsules.push({
    id:genId(),
    count:count,
    openDate:openDate||'',
    reason:reason||'',
    createdAt:today()
  });
  scheduleSave();toast('✦ '+count+' bottle'+(count===1?'':'s')+' reserved');renderMain();
}

function removeTimeCapsule(batchId,capsuleId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b||!Array.isArray(b.timeCapsules))return;
  b.timeCapsules=b.timeCapsules.filter(function(tc){return tc.id!==capsuleId;});
  scheduleSave();toast('Reservation removed');renderMain();
}

// Renders the time-capsule reservations card on the bottling tab. Shows
// active reservations and a form to add new ones. Hidden if not bottled.
function renderTimeCapsulesCard(b){
  if(!b||!APP.bottling[b.id])return'';
  var capsules=Array.isArray(b.timeCapsules)?b.timeCapsules:[];
  var bot=APP.bottling[b.id];
  var onHand=bottlesOnHand(bot);
  var reserved=getReservedBottleCount(b);
  var available=Math.max(0,onHand-reserved);
  var rows=capsules.map(function(tc){
    var openLabel=tc.openDate?fmtDate(tc.openDate):'(no date set)';
    var daysUntil=tc.openDate?Math.floor((new Date(tc.openDate)-new Date())/86400000):null;
    var status=daysUntil==null?'':daysUntil>0?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--gold2)">'+daysUntil+' days to go</span>':'<span style="font-family:var(--font-mono);font-size:10px;color:var(--green2)">READY TO OPEN</span>';
    return'<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid var(--border)">'
      +'<div style="font-family:var(--font-display);font-size:18px;color:var(--gold2);flex-shrink:0;width:40px;text-align:center">'+tc.count+'×</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--text)">'+escHtml(tc.reason||'(no reason)')+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">Open '+escHtml(openLabel)+' '+status+'</div></div>'
      +'<button class="btn btn-danger btn-sm" onclick="removeTimeCapsule(\''+b.id+'\',\''+tc.id+'\')" title="Remove reservation">✕</button>'
      +'</div>';
  }).join('');
  return'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">🕰 TIME CAPSULE RESERVATIONS</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+reserved+' OF '+onHand+' RESERVED · '+available+' FREE</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:12px;line-height:1.55">Mark bottles set aside for a specific future event (anniversary, milestone birthday, vintage tasting). Counted as "reserved" so you don\'t accidentally drink them — but the bottles stay in the cellar and become available again after the open date passes.</div>'
    +(rows?'<div style="background:var(--bg);border-radius:var(--radius);overflow:hidden;margin-bottom:12px">'+rows+'</div>':'')
    +(available>0
      ?'<div class="form-row"><div class="form-group"><label class="form-label">Bottles to reserve</label><input class="form-input" type="number" id="tc-count" min="1" max="'+available+'" placeholder="e.g. 4"></div>'
        +'<div class="form-group"><label class="form-label">Open date (optional)</label><input class="form-input" type="date" id="tc-date"></div></div>'
        +'<div class="form-group"><label class="form-label">Reason / occasion</label><input class="form-input" type="text" id="tc-reason" placeholder="e.g. 10th anniversary, baby\'s 18th, vintage 2030 tasting"></div>'
        +'<button class="btn btn-secondary btn-sm" onclick="addTimeCapsule(\''+b.id+'\',document.getElementById(\'tc-count\').value,document.getElementById(\'tc-date\').value,document.getElementById(\'tc-reason\').value)">＋ Add reservation</button>'
      :'<div style="font-size:12px;color:var(--text3);font-style:italic;padding:10px 0">All on-hand bottles are reserved. Open or release reservations to add more.</div>')
    +'</div>';
}

// Cellar shelf assignment: when the cellar is configured, this shows a
// "place on shelf" picker; otherwise falls back to the legacy free-text
// cellarSublocation field. Both data paths persist independently, so a user
// migrating from legacy text to structured shelves doesn't lose the old data.
function renderCellarSublocationCard(b){
  if(!b||!APP.bottling[b.id])return'';
  var bot=APP.bottling[b.id];
  if(isCellarConfigured()){
    var shelfId=bot.cellarShelfId||'';
    var hit=shelfId?findShelfById(shelfId):null;
    var shelf=hit&&hit.shelf;
    var legacyText=bot.cellarSublocation||'';
    return'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">🏠 CELLAR PLACEMENT</div>'
      +'<button class="btn btn-secondary btn-sm" onclick="openShelfAssignmentModal(\''+b.id+'\')">'+(shelf?'Move':'Place on shelf')+'</button>'
      +'</div>'
      +(shelf
        ?'<div style="background:var(--bg);border-left:3px solid var(--gold);border-radius:6px;padding:10px 14px;font-size:13px"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">📍 '+escHtml(shelf.label)+'</div><div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);letter-spacing:1px;margin-top:3px">'+escHtml((hit&&hit.cabinet&&(hit.cabinet.name||hit.cabinet.model))||'Cellar')+' · '+(shelf.type==='open'?'OPEN':(shelf.type==='fermenter_slot'?'FERMENTER SLOT':'BOTTLE RACK'))+'</div></div>'
        :'<div style="font-size:12.5px;color:var(--text3);font-style:italic;padding:10px 0">Not yet placed on a shelf. Click "Place on shelf" to assign.</div>')
      +(legacyText?'<div style="margin-top:10px;font-size:11px;color:var(--text3);background:var(--bg);padding:8px 10px;border-radius:4px"><strong>Legacy note:</strong> '+escHtml(legacyText)+' <a onclick="clearLegacySublocation(\''+b.id+'\')" style="color:var(--red2);cursor:pointer;margin-left:8px">clear</a></div>':'')
      +'</div>';
  }
  // Legacy mode (no cellar configured) — keep the free-text field
  var current=bot.cellarSublocation||'';
  return'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">📍 CELLAR SUB-LOCATION</div>'
    +'<button class="btn btn-secondary btn-sm" onclick="showView(\'cellar-map\')" title="Set up your cellar with shelves for structured placement tracking">🏠 Configure cellar</button>'
    +'</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:12px;line-height:1.55">Where is this batch stored in your cellar? Free-text label like "Shelf A box 3". For richer placement tracking (visual shelves, sensor binding), configure your cellar via My Cellar in the sidebar.</div>'
    +'<div class="form-row"><div class="form-group" style="flex:1"><input class="form-input" type="text" id="sub-loc-'+b.id+'" value="'+escHtml(current)+'" placeholder="e.g. Shelf A box 3" oninput="updateSublocation(\''+b.id+'\',this.value)" style="font-family:var(--font-mono);font-size:12.5px"></div></div>'
    +'</div>';
}

function clearLegacySublocation(batchId){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  if(!confirm('Clear the legacy free-text sub-location for this batch? The shelf assignment is unaffected.'))return;
  delete bot.cellarSublocation;
  scheduleSave();
  toast('Legacy note cleared');
  renderMain();
}

function updateSublocation(batchId,val){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  bot.cellarSublocation=String(val||'').trim();
  scheduleSave();
}

function totalVolumeMLOriginal(bot){
  if(!bot)return 0;
  if(bot.countsAtBottling){
    var m=_coerceLocations(bot.countsAtBottling);
    return Object.keys(m).reduce(function(s,size){return s+(m[size]||0)*parseInt(size);},0);
  }
  return(bottlesOriginal(bot))*DEFAULT_BOTTLE_SIZE;
}

function totalVolumeMLOnHand(bot){
  if(!bot||!bot.locations)return totalBottles(bot)*DEFAULT_BOTTLE_SIZE;
  var ml=0;
  ['cellar','fridge','other'].forEach(function(loc){
    var m=_coerceLocations(bot.locations[loc]);
    Object.keys(m).forEach(function(size){ml+=(m[size]||0)*parseInt(size);});
  });
  return ml;
}

function costPerLitre(b,bot){
  if(!b||!b.cost||!bot)return 0;
  var totalCost=(b.cost.honey||0)+(b.cost.extras||0);
  var vol=totalVolumeMLOriginal(bot)/1000;
  return vol>0?totalCost/vol:0;
}

function costForBottle(b,bot,sizeML){
  return costPerLitre(b,bot)*(parseInt(sizeML)/1000);
}

// Convenience for displays
function fmtBottleSummary(bot){
  // e.g. "6 bottles (2×500ml + 4×750ml)" or "6×750ml"
  if(!bot)return'0 bottles';
  var sizes=activeBottleSizes(bot);
  var parts=[];
  sizes.forEach(function(size){
    // Sum across all locations
    var n=Object.keys(bot.locations||{}).reduce(function(s,loc){return s+bottlesInLocationBySize(bot,loc,size);},0);
    if(n>0)parts.push(n+'×'+size+'ml');
  });
  var total=totalBottles(bot);
  if(parts.length===0)return'0 bottles';
  if(parts.length===1)return parts[0];
  return total+' bottles ('+parts.join(' + ')+')';
}

function setSyncStatus(status){
  syncStatus=status;
  var badge=document.getElementById('sync-badge');
  if(!badge)return;
  // If we have a pending sync queue waiting for connectivity, show that instead of plain 'error'
  var effectiveStatus=status;
  if(status==='error'&&pendingSync)effectiveStatus='pending';
  badge.className='sync-badge '+effectiveStatus;
  var label={local:'⬡ LOCAL',synced:'✓ SYNCED',syncing:'↻ SYNCING',error:'⚠ ERROR',pending:'⏳ QUEUED'}[effectiveStatus]||effectiveStatus;
  badge.textContent=label;
  badge.title=effectiveStatus==='pending'?'Sync queued — will retry when the server is reachable':'';
  var btn=document.getElementById('sync-btn');
  if(btn)btn.classList.toggle('spinning',status==='syncing');
}

function packageState(){
  return{
    batches:APP.batches,
    logs:APP.logs,
    shareTokens:APP.shareTokens||{},
    // Calendar feed: token (private feed URL) + a snapshot of upcoming events
    // for the server to format as .ics. Recomputed on every save.
    calendarToken:(APP.settings&&APP.settings.calendarToken)||'',
    calendarEvents:(typeof buildCalendarEvents==='function')?buildCalendarEvents():[],
    tasksDone:APP.tasksDone,
    tastings:APP.tastings,
    bottling:APP.bottling,
    supplies:APP.supplies,
    suppliers:APP.suppliers||[],
    additions:APP.additions,
    customRecipes:APP.customRecipes,
    notifiedTasks:APP.notifiedTasks,
    templates:APP.templates||[],
    celebrated:APP.celebrated||{},
    tempAnomalies:APP.tempAnomalies||[],
    fermenters:APP.fermenters||[],
    // Brew Planner queue — planned batches travel with the blob so the plan and
    // its shopping list are cross-device, just like fermenters/batches.
    plannedBatches:APP.plannedBatches||[],
    // Photo journal — metadata + /labels/ URLs (the image bytes live as files,
    // not in this blob).
    photos:APP.photos||{},
    // Cabinet configuration (v12+) — the cellar storage cabinets, each with
    // sensors, target temp/humidity band, and a shelves[] layout.
    // Travels with the data blob so it's cross-device just like batches/recipes.
    cabinets:APP.cabinets||[],
    // Cross-device settings ride the data blob so they persist when you open
    // MeadOS on a different device. This includes the Home Assistant connection
    // (URLs + token) — configure once, every browser picks it up. NOTE: that
    // means anyone who can reach this MeadOS server can read the HA token; the
    // server and HA share one trust boundary. The only per-device state left
    // is the which-HA-URL-worked-last cache (it depends on the network).
    sharedSettings:{
      recipeOverlays:(APP.settings&&APP.settings.recipeOverlays)||{},
      customLabels:(APP.settings&&APP.settings.customLabels)||{},
      brandLogo:(APP.settings&&APP.settings.brandLogo)||null,
      appIcon:(APP.settings&&APP.settings.appIcon)||null,
      brewerName:(APP.settings&&APP.settings.brewerName)||'',
      externalUrl:(APP.settings&&APP.settings.externalUrl)||'',
      currency:(APP.settings&&APP.settings.currency)||'€',
      honeyPricePerKg:(APP.settings&&APP.settings.honeyPricePerKg)||0,
      sachetSize:(APP.settings&&APP.settings.sachetSize)||12,
      sanitizer:(APP.settings&&APP.settings.sanitizer)||'chemipro_san',
      haUrl:(APP.settings&&APP.settings.haUrl)||'',
      haUrlExternal:(APP.settings&&APP.settings.haUrlExternal)||'',
      // haToken is intentionally NOT synced — it lives server-side (config) and
      // HA calls go through the /api/ha proxy. See saveHASettings / loadHAConfig.
      useHA:!(APP.settings&&APP.settings.useHA===false),
      haPublishSummary:!!(APP.settings&&APP.settings.haPublishSummary),
      tempSensorEntity:(APP.settings&&APP.settings.tempSensorEntity)||'',
      cellarTempSensorEntity:(APP.settings&&APP.settings.cellarTempSensorEntity)||'',
      notificationService:(APP.settings&&APP.settings.notificationService)||'',
      notificationsEnabled:!!(APP.settings&&APP.settings.notificationsEnabled),
      favoriteRecipes:(APP.settings&&APP.settings.favoriteRecipes)||[],
      labelStudio:(APP.settings&&APP.settings.labelStudio)||{},
      labelLayouts:(APP.settings&&APP.settings.labelLayouts)||[],
      labelLocale:(APP.settings&&APP.settings.labelLocale)||'en'
    },
    dataVersion:(typeof CURRENT_SCHEMA_VERSION!=='undefined'?CURRENT_SCHEMA_VERSION:8),
    version:8,
    savedAt:new Date().toISOString()
  };
}

function applyState(d){
  if(!d)return;
  // Run schema migrations first so later code sees a normalized shape.
  var migrationReport=null;
  if(typeof migrateData==='function'){
    var mig=migrateData(d);
    d=mig.result;
    if(mig.fromVersion!==mig.toVersion)migrationReport=mig;
  }
  // Add to APP so it can be surfaced later (showMigrationReport is called once after first render)
  if(migrationReport)APP._pendingMigrationReport=migrationReport;
  // Also remember templates + celebrated milestones + temp anomalies + custom user data buckets
  APP.templates=d.templates||APP.templates||[];
  APP.celebrated=d.celebrated||APP.celebrated||{};
  APP.tempAnomalies=d.tempAnomalies||APP.tempAnomalies||[];
  APP.batches=d.batches||[];
  APP.logs=d.logs||{};
  APP.tasksDone=d.tasksDone||{};
  APP.tastings=d.tastings||{};
  APP.bottling=d.bottling||{};
  APP.shareTokens=(d.shareTokens&&typeof d.shareTokens==='object')?d.shareTokens:{};
  // Calendar feed token rides the data blob so the feed URL is stable
  // cross-device; restore it into settings (where getCalendarToken reads it).
  if(typeof d.calendarToken==='string')APP.settings.calendarToken=d.calendarToken;
  APP.supplies=d.supplies||[];
  APP.additions=d.additions||{};
  APP.customRecipes=d.customRecipes||[];
  APP.notifiedTasks=d.notifiedTasks||{};
  APP.fermenters=Array.isArray(d.fermenters)?d.fermenters:(APP.fermenters||[]);
  APP.plannedBatches=Array.isArray(d.plannedBatches)?d.plannedBatches:(APP.plannedBatches||[]);
  APP.photos=(d.photos&&typeof d.photos==='object')?d.photos:(APP.photos||{});
  APP.suppliers=Array.isArray(d.suppliers)?d.suppliers:(APP.suppliers||[]);
  // Cabinets (multi-cabinet cellar, v12+): normalize entries with defaults.
  // Older blobs are converted from the singleton `cellar` by migration 12
  // before this runs. Keep the in-memory list when the blob lacks the field
  // entirely (e.g. partial backups), mirroring the fermenters behavior.
  if(Array.isArray(d.cabinets)){
    APP.cabinets=d.cabinets.map(function(c){
      var cab=Object.assign({id:'',name:'',model:'',location:'',capacity:0,tempSensorEntity:'',humiditySensorEntity:'',targetTemp:13,targetTempMin:8,targetTempMax:18,targetHumidityMin:50,targetHumidityMax:75,shelves:[]},c||{});
      if(!cab.id)cab.id=genId();
      if(!Array.isArray(cab.shelves))cab.shelves=[];
      return cab;
    });
  }else if(!Array.isArray(APP.cabinets)){
    APP.cabinets=[];
  }
  // Restore device-shared settings that ride the data blob — label
  // customizations, brand identity, cost preferences, AND the Home Assistant
  // connection (URLs + token), so a fresh browser needs zero setup. String
  // fields only apply when non-empty: clearing a field on one device won't
  // silently wipe a configured value loaded elsewhere (clear + Save still
  // updates the blob from the device you do it on).
  if(d.sharedSettings){
    var ss=d.sharedSettings;
    if(ss.recipeOverlays&&typeof ss.recipeOverlays==='object')APP.settings.recipeOverlays=ss.recipeOverlays;
    if(ss.customLabels&&typeof ss.customLabels==='object')APP.settings.customLabels=ss.customLabels;
    if(ss.labelStudio&&typeof ss.labelStudio==='object')APP.settings.labelStudio=ss.labelStudio;
    if(Array.isArray(ss.labelLayouts))APP.settings.labelLayouts=ss.labelLayouts;
    if(typeof ss.labelLocale==='string')APP.settings.labelLocale=ss.labelLocale;
    if('brandLogo' in ss)APP.settings.brandLogo=ss.brandLogo;
    if('appIcon' in ss)APP.settings.appIcon=ss.appIcon;
    if(ss.brewerName)APP.settings.brewerName=ss.brewerName;
    if(typeof ss.externalUrl==='string')APP.settings.externalUrl=ss.externalUrl;
    if(ss.currency)APP.settings.currency=ss.currency;
    if(typeof ss.honeyPricePerKg==='number')APP.settings.honeyPricePerKg=ss.honeyPricePerKg;
    if(typeof ss.sachetSize==='number')APP.settings.sachetSize=ss.sachetSize;
    if(ss.sanitizer&&typeof SANITIZERS!=='undefined'&&SANITIZERS[ss.sanitizer])APP.settings.sanitizer=ss.sanitizer;
    if(ss.haUrl&&typeof ss.haUrl==='string')APP.settings.haUrl=ss.haUrl;
    if(ss.haUrlExternal&&typeof ss.haUrlExternal==='string')APP.settings.haUrlExternal=ss.haUrlExternal;
    // ss.haToken (legacy blobs) is ignored — the server strips it into config.
    if(typeof ss.useHA==='boolean')APP.settings.useHA=ss.useHA;
    if(typeof ss.haPublishSummary==='boolean')APP.settings.haPublishSummary=ss.haPublishSummary;
    if(ss.tempSensorEntity&&typeof ss.tempSensorEntity==='string')APP.settings.tempSensorEntity=ss.tempSensorEntity;
    if(ss.cellarTempSensorEntity&&typeof ss.cellarTempSensorEntity==='string')APP.settings.cellarTempSensorEntity=ss.cellarTempSensorEntity;
    if(ss.notificationService&&typeof ss.notificationService==='string')APP.settings.notificationService=ss.notificationService;
    if(typeof ss.notificationsEnabled==='boolean')APP.settings.notificationsEnabled=ss.notificationsEnabled;
    if(Array.isArray(ss.favoriteRecipes))APP.settings.favoriteRecipes=ss.favoriteRecipes;
    // Write to localStorage so the just-loaded shared settings survive a hard
    // reload before the next scheduleSave fires.
    if(typeof saveSettings==='function')saveSettings();
  }
  // Ensure at least one fermenter exists on fresh installs
  if(!APP.fermenters.length){
    APP.fermenters=[
      {id:'f1',name:'Primary 1',capacity:9,notes:'9 L wide-mouth · primary fermentation',color:'#c9a84c',tempSensorEntity:''},
      {id:'f2',name:'Primary 2',capacity:9,notes:'9 L wide-mouth · primary fermentation',color:'#a87aa0',tempSensorEntity:''},
      {id:'f3',name:'Secondary 1',capacity:7.6,notes:'7.6 L wide-mouth · secondary / assist',color:'#7aa8c0',tempSensorEntity:''},
      {id:'f4',name:'Secondary 2',capacity:7.6,notes:'7.6 L wide-mouth · secondary / assist',color:'#7aa850',tempSensorEntity:''},
      {id:'f5',name:'Bulk Aging 1',capacity:5,notes:'5 L wide-mouth · secondary + bulk aging before bottling',color:'#c87850',tempSensorEntity:''},
      {id:'f6',name:'Bulk Aging 2',capacity:5,notes:'5 L wide-mouth · secondary + bulk aging before bottling',color:'#5a8a7a',tempSensorEntity:''}
    ];
  }
  // Migrate older bottling records to the (multi-size) locations model
  Object.keys(APP.bottling).forEach(function(bid){
    var bot=APP.bottling[bid];
    if(!bot)return;
    // 1. Convert legacy numeric locations to size-keyed maps (assume 750ml legacy default).
    if(bot.locations){
      ['cellar','fridge','gifted','other'].forEach(function(loc){
        var v=bot.locations[loc];
        if(typeof v==='number'){
          bot.locations[loc]=v>0?{[DEFAULT_BOTTLE_SIZE]:v}:{};
        }else if(v&&typeof v==='object'){
          // Normalize keys: 'ml500' → '500'
          var normalized={};
          Object.keys(v).forEach(function(k){
            var size=parseInt(String(k).replace(/^ml/,''));
            if(!isNaN(size)&&size>0&&parseInt(v[k])>0)normalized[size]=parseInt(v[k]);
          });
          bot.locations[loc]=normalized;
        }else{
          bot.locations[loc]={};
        }
      });
    }
    // 2. Ensure locations object exists with all 4 buckets
    if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
    ['cellar','fridge','gifted','other'].forEach(function(loc){
      if(!bot.locations[loc]||typeof bot.locations[loc]!=='object')bot.locations[loc]={};
    });
    // 3. First-time-seeing-this-record migration: snapshot countsAtBottling + restore corrupted state
    if(bot.countsAtBottling==null&&bot.bottlesAtBottling==null){
      var origCount=parseInt(bot.bottleCount)||0;
      bot.bottlesAtBottling=origCount;
      bot.countsAtBottling=origCount>0?{[DEFAULT_BOTTLE_SIZE]:origCount}:{};
      var sumLoc=Object.keys(bot.locations).reduce(function(s,loc){
        return s+Object.keys(bot.locations[loc]).reduce(function(a,k){return a+(bot.locations[loc][k]||0);},0);
      },0);
      var hasTastings=(APP.tastings[bid]||[]).length>0;
      if(sumLoc===0&&origCount>0&&!hasTastings){
        // Corrupted state — restore to cellar at default size
        bot.locations.cellar={[DEFAULT_BOTTLE_SIZE]:origCount};
      }
    }else if(bot.countsAtBottling==null&&bot.bottlesAtBottling!=null){
      // Has bottlesAtBottling but no per-size — assume legacy 750ml
      bot.countsAtBottling=bot.bottlesAtBottling>0?{[DEFAULT_BOTTLE_SIZE]:bot.bottlesAtBottling}:{};
    }
    // 4. Sticky bottleSizes — derive from current state
    bot.bottleSizes=activeBottleSizes(bot);
  });
}

function scheduleSave(){
  // Settings live in a separate localStorage key from the data blob. They're
  // tiny (kB), so we always persist them synchronously alongside the data
  // save — this ensures Designer/picker changes (recipeOverlays, customLabels,
  // brandLogo, etc.) survive a reload. Before this fix, scheduleSave only
  // wrote the data blob and any pure-settings change would be lost.
  if(typeof saveSettings==='function')saveSettings();
  clearTimeout(saveTimeout);
  saveTimeout=setTimeout(function(){saveData().then(function(ok){toast(ok?'✦ Saved':'⚠ Save failed — server unreachable or rejected the data');});},800);
}

async function forceSyncNow(){
  await saveData();
  if(syncStatus==='synced')toast('✓ Synced to server');
  else toast('⚠ Sync failed — is the server running?');
}

function loadSettings(){
  var s=localStorage.getItem('meadows_settings');
  if(s){try{APP.settings=Object.assign({},APP.settings,JSON.parse(s));}catch(e){}}
  // Drop legacy keys from the Home-Assistant-storage era
  delete APP.settings.storageMode;
  delete APP.settings.inputTextPrefix;
  delete APP.settings.inputTextCount;
}
function saveSettings(){
  try{
    localStorage.setItem('meadows_settings',JSON.stringify(APP.settings));
  }catch(e){
    // Quota exceeded — Safari caps localStorage around 5MB and uploaded label
    // images (customLabels/brandLogo data URLs) can tip it over. The server
    // database is the source of truth and localStorage is only a warm-start
    // cache, so degrade gracefully instead of blowing up the caller — an
    // uncaught throw here used to freeze the Label Designer's Save button.
    if(!window._lsQuotaWarned){
      window._lsQuotaWarned=true;
      if(typeof toast==='function')toast('⚠ Browser cache is full — settings will load from the server instead. Everything still saves.');
    }
  }
}
