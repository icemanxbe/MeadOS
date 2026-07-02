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

// ---- Merge-patch (RFC 7386) for delta saves. The client only ever sends a
// patch it has PROVEN reconstructs the exact state (see saveData), and the
// server applies the identical algorithm to the same base rev — so a delta save
// can never corrupt or lose data; the full save is always the fallback. --------
function _deepEqual(a,b){
  if(a===b)return true;
  if(typeof a!==typeof b)return false;
  if(a===null||b===null)return a===b;
  if(typeof a!=='object')return a===b;
  var aArr=Array.isArray(a),bArr=Array.isArray(b);
  if(aArr!==bArr)return false;
  if(aArr){if(a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(!_deepEqual(a[i],b[i]))return false;return true;}
  var ak=Object.keys(a),bk=Object.keys(b);
  if(ak.length!==bk.length)return false;
  for(var j=0;j<ak.length;j++){var k=ak[j];if(!Object.prototype.hasOwnProperty.call(b,k)||!_deepEqual(a[k],b[k]))return false;}
  return true;
}
function _isPlainObj(x){return x&&typeof x==='object'&&!Array.isArray(x);}
// Diff old→new into a merge-patch (changed keys → value, removed keys → null,
// arrays/primitives replaced wholesale). undefined when nothing changed.
function mergePatchDiff(o,n){
  if(!_isPlainObj(o)||!_isPlainObj(n))return _deepEqual(o,n)?undefined:(n===undefined?null:n);
  var p={},changed=false,k;
  for(k in o)if(Object.prototype.hasOwnProperty.call(o,k)&&!Object.prototype.hasOwnProperty.call(n,k)){p[k]=null;changed=true;}
  for(k in n)if(Object.prototype.hasOwnProperty.call(n,k)){var s=mergePatchDiff(o[k],n[k]);if(s!==undefined){p[k]=s;changed=true;}}
  return changed?p:undefined;
}
function mergePatchApply(target,patch){
  if(!_isPlainObj(patch))return patch;
  if(!_isPlainObj(target))target={};
  for(var k in patch)if(Object.prototype.hasOwnProperty.call(patch,k)){
    if(patch[k]===null)delete target[k];
    else target[k]=mergePatchApply(target[k],patch[k]);
  }
  return target;
}

async function saveData(force){
  var data=packageState();
  var json=JSON.stringify(data);
  // Always cache locally
  try{localStorage.setItem('meadows_data',json);}catch(e){}
  setSyncStatus('syncing');

  // Try a delta (merge-patch) save: only when the server advertises support, we
  // have a known base rev + baseline, it's not a forced overwrite, AND applying
  // the patch to the baseline provably reproduces the exact state. Otherwise we
  // send the full state. This guarantees a patch can never lose data.
  var usePatch=false,patch=null,res=null,wireBytes=json.length;
  if(!force&&window._dataRev&&window._lastSavedState!=null&&(window._dataCaps||'').indexOf('patch')>=0){
    try{
      var diff=mergePatchDiff(JSON.parse(window._lastSavedState),data);
      if(diff===undefined){setSyncStatus('synced');return true;}  // nothing changed
      var rebuilt=mergePatchApply(JSON.parse(window._lastSavedState),diff);
      if(_deepEqual(rebuilt,data)){usePatch=true;patch=diff;}
    }catch(e){usePatch=false;}
  }

  if(usePatch){
    var pjson=JSON.stringify(patch);wireBytes=pjson.length;
    res=await apiFetch('/api/data/patch',{method:'POST',
      headers:{'Content-Type':'application/json','X-Base-Rev':window._dataRev||''},body:pjson});
    // Endpoint absent (older server somehow) → disable patch + fall back to full.
    if(res&&(res.status===404||res.status===501)){window._dataCaps='';res=null;}
  }
  if(!res){
    wireBytes=json.length;
    res=await apiFetch('/api/data',{method:'POST',
      // X-Base-Rev is the rev we last loaded; the server rejects (409) if the
      // stored state moved on since. '*' forces overwrite (conflict resolver).
      headers:{'Content-Type':'application/json','X-Base-Rev':force?'*':(window._dataRev||'')},body:json});
  }
  lastSyncMeta.bytes=wireBytes;

  // Conflict — another device saved newer data. Don't retry-clobber; ask.
  if(res&&res.status===409){
    setSyncStatus('error');
    lastSyncMeta={ts:new Date(),bytes:wireBytes,mode:'server',ok:false,detail:'conflict — newer data on server'};
    if(typeof onSaveConflict==='function')onSaveConflict();
    return false;
  }
  var ok=!!(res&&res.ok);
  lastSyncMeta={ts:new Date(),bytes:wireBytes,mode:'server',ok:ok,detail:ok?('saved to server'+(usePatch?' (delta)':'')):'server unreachable'};
  setSyncStatus(ok?'synced':'error');
  if(ok){
    // Success — capture the new rev, update the delta baseline, clear pending.
    try{var b=await res.json();if(b&&b.updatedAt)window._dataRev=b.updatedAt;}catch(e){}
    window._lastSavedState=json;  // server now holds exactly this — next diff is against it
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
    var label=(dt&&!isNaN(dt))?dt.toLocaleString(_dloc(),{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'(unknown time)';
    var kb=it.bytes?(it.bytes/1024).toFixed(0)+' KB':'';
    // Snapshots older than this feature predate the summary column (NULL) —
    // those just show timestamp+size as before, same as always.
    var summaryLine=it.summary?'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+escHtml(it.summary)+'</div>':'';
    return'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">'
      +'<div><span style="color:var(--text)">'+label+'</span> <span style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-left:6px">'+kb+'</span>'+summaryLine+'</div>'
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
  if(typeof closeModal==='function')closeModal();
  await loadData();
  renderMain();
  toast('✦ Restored snapshot from '+label);
}
// A self-contained "Restore from snapshot" picker — lists the server's saved
// snapshots (reusing loadHistoryPanel's #history-list renderer) with a Restore
// button on each. Reachable from the Storage Budget card.
function openSnapshotRestoreModal(){
  if(typeof closeModal==='function')closeModal();
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:520px">'
    +'<div class="modal-title">🕘 Restore from snapshot</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.55">'+(appLang()==='nl'?'De server bewaart je recente opgeslagen momentopnames. Herstellen rolt <strong>al</strong> je data terug naar dat punt — je huidige data wordt eerst als een nieuwe momentopname opgeslagen, dus het is omkeerbaar.':'The server keeps your recent saved snapshots. Restoring rolls <strong>all</strong> your data back to that point — your current data is saved as a new snapshot first, so it\'s reversible.')+'</div>'
    +'<div id="history-list" style="font-size:13px;color:var(--text3);max-height:55vh;overflow:auto">Loading…</div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  if(typeof loadHistoryPanel==='function')loadHistoryPanel();
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
      // Capture the rev so the next save can detect concurrent edits, and the
      // server's delta-save capability so saveData() can send merge-patches.
      if(res.headers&&res.headers.get){
        window._dataRev=res.headers.get('X-Data-Rev')||null;
        window._dataCaps=res.headers.get('X-Data-Caps')||'';
      }
      var parsed=await res.json();
      if(parsed){
        // Baseline for delta saves = the server's ACTUAL stored state (before any
        // client-side migration below), so a patch always merges onto what the
        // server really holds.
        if(!APP._shareMode)window._lastSavedState=JSON.stringify(parsed);
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
