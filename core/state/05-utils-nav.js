// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// utilities, batch serials, navigation
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== UTILITIES ====================
function genId(){return Date.now().toString(36)+Math.random().toString(36).substr(2,5);}
function today(){return new Date().toISOString().split('T')[0];}
function fmtDate(d){
  // Always DD/MM/YYYY — explicit, no locale ambiguity
  var x=new Date(d);
  if(isNaN(x.getTime()))return'';
  var dd=String(x.getDate()).padStart(2,'0');
  var mm=String(x.getMonth()+1).padStart(2,'0');
  return dd+'/'+mm+'/'+x.getFullYear();
}
function fmtDateShort(d){
  // DD/MM
  var x=new Date(d);
  if(isNaN(x.getTime()))return'';
  var dd=String(x.getDate()).padStart(2,'0');
  var mm=String(x.getMonth()+1).padStart(2,'0');
  return dd+'/'+mm;
}
function fmtDateLong(d){
  // Friendly long form: "Saturday 30 May 2026"
  var x=new Date(d);
  if(isNaN(x.getTime()))return'';
  return x.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function fmtDateTime(d){
  // DD/MM/YYYY HH:MM
  var x=new Date(d);
  if(isNaN(x.getTime()))return'';
  return fmtDate(x)+' '+String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0');
}
function daysSince(ds){return Math.floor((Date.now()-new Date(ds))/86400000);}

// Human-readable duration formatter for elapsed time displays.
// Used wherever the UI shows "how long has X been aging/fermenting/resting".
// Uses approximate but consistent unit sizes (1mo=30d, 1y=365d) and always
// shows the largest sensible unit plus one secondary unit when meaningful:
//   0d        → "today"
//   1d        → "1 day"
//   2-6d      → "X days"
//   7-29d     → "Xw" or "Xw Yd" if there are leftover days
//   30-364d   → "Xmo" or "Xmo Yd" if leftover days fit
//   365d+     → "Xy" / "Xy Yd" (when months would be 0) / "Xy Ymo"
// Returns "—" for null/undefined/negative so callers don't need to guard.
function fmtDuration(d){
  if(d==null||d<0)return'—';
  if(d===0)return'today';
  if(d<7)return d+(d===1?' day':' days');
  if(d<30){var w=Math.floor(d/7),wr=d%7;return w+'w'+(wr>0?' '+wr+'d':'');}
  if(d<365){var m=Math.floor(d/30),mr=d%30;return m+'mo'+(mr>0?' '+mr+'d':'');}
  var y=Math.floor(d/365),md=d%365;
  if(md<30)return y+'y'+(md>0?' '+md+'d':'');
  var m2=Math.floor(md/30);
  return y+'y '+m2+'mo';
}

// Ultra-compact variant for tight UI like sidebar pills. Single unit only,
// uses 'd' for days, 'w' for weeks (>=14d), 'mo' for months (>=60d),
// 'y' for years (>=365d). For step day indices use the raw number.
function fmtDurationCompact(d){
  if(d==null||d<0)return'—';
  if(d<14)return d+'d';
  if(d<60)return Math.floor(d/7)+'w';
  if(d<365)return Math.floor(d/30)+'mo';
  var y=d/365;
  return(y>=10?Math.round(y):y.toFixed(1))+'y';
}
function addDays(ds,n){var d=new Date(ds);d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];}
function calcABV(og,fg){return((og-fg)*131.25).toFixed(1);}
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function getBatchColor(b){
  if(b&&b.recipeId){
    var r=APP.recipes.find(function(x){return x.id===b.recipeId;});
    if(r&&r.brandColor)return r.brandColor;
  }
  return'#c9a84c';
}

// ==================== BATCH SERIAL NUMBERS ====================
// Year-prefixed sequential serial — e.g. 2025-001, 2025-002, restarting each
// calendar year. Stable from creation (never reassigned), so it's safe to
// reference on printed labels, storage boxes, share links, certificates.
// Internal `b.id` is still the random hex token used for routing and tool
// dispatch; the serial is purely a human-facing label.

// Parse a serial string into {year:number, seq:number} or null if malformed.
function parseBatchSerial(s){
  if(!s)return null;
  var m=/^(\d{4})-(\d{3,})$/.exec(String(s));
  if(!m)return null;
  return{year:parseInt(m[1],10),seq:parseInt(m[2],10)};
}

// Build a serial string from a year+seq pair.
function formatBatchSerial(year,seq){
  return year+'-'+String(seq).padStart(3,'0');
}

// Returns the next available serial for a given startDate's year. Walks the
// existing batches, finds the highest serial issued for that year, and
// increments. If no batches exist for that year yet, starts at 001.
function assignBatchSerial(startDate){
  var year=new Date(startDate||today()).getFullYear();
  if(isNaN(year))year=new Date().getFullYear();
  var maxSeq=0;
  (APP.batches||[]).forEach(function(b){
    var p=parseBatchSerial(b.serial);
    if(p&&p.year===year&&p.seq>maxSeq)maxSeq=p.seq;
  });
  return formatBatchSerial(year,maxSeq+1);
}

// Backfill serials onto any pre-existing batches that don't have one. Runs
// once on schema migration. Sort by startDate so serials line up with brewing
// order; ties broken by `id` for determinism.
function backfillBatchSerials(){
  if(!APP.batches||!APP.batches.length)return;
  // Group batches by startDate year, sort chronologically within each year,
  // assign serials in that order — skipping any batch that already has one.
  var byYear={};
  APP.batches.forEach(function(b){
    var year=new Date(b.startDate||today()).getFullYear();
    if(isNaN(year))year=new Date().getFullYear();
    if(!byYear[year])byYear[year]=[];
    byYear[year].push(b);
  });
  Object.keys(byYear).forEach(function(yr){
    // Find any serials that ARE present this year — we want to start the
    // counter above them so backfilled batches don't collide.
    var year=parseInt(yr,10);
    var maxExisting=0;
    var unassigned=[];
    byYear[yr].forEach(function(b){
      var p=parseBatchSerial(b.serial);
      if(p&&p.year===year){
        if(p.seq>maxExisting)maxExisting=p.seq;
      }else{
        unassigned.push(b);
      }
    });
    // Sort the unassigned ones by startDate then id for stable ordering
    unassigned.sort(function(a,b){
      var sa=(a.startDate||'')+'|'+(a.id||'');
      var sb=(b.startDate||'')+'|'+(b.id||'');
      return sa.localeCompare(sb);
    });
    unassigned.forEach(function(b){
      maxExisting++;
      b.serial=formatBatchSerial(year,maxExisting);
    });
  });
}

// Resolve a batch by either its serial (preferred — human-readable, e.g.
// "2024-001") or its internal id (legacy fallback — the random hex id from
// genId). Used by share URLs, QR-code deep links, and the hash router so
// callers don't have to care which form the URL carries. Returns the batch
// object or null if nothing matches.
function findBatchByRef(ref){
  if(!ref||!APP.batches)return null;
  // Try serial first — that's what new URLs carry. Match case-insensitively
  // since serials are alphanumeric ASCII, but be tolerant of "2024-001"
  // pasted as "2024-1" by stripping any padding-zero ambiguity on lookup.
  var p=parseBatchSerial(ref);
  if(p){
    var canonical=formatBatchSerial(p.year,p.seq);
    var bySerial=APP.batches.find(function(b){return b.serial===canonical;});
    if(bySerial)return bySerial;
  }
  // Fallback to internal id — covers legacy URLs predating serials and any
  // batch that somehow missed the v8 backfill.
  return APP.batches.find(function(b){return b.id===ref;})||null;
}

// Read the recent gravity trend to tell whether fermentation is still moving.
// "stopped"  — last two readings (≥2 days apart, or three in a row) are flat
// "maybe"    — flat but the readings are close in time / only two exist
// "slowing"  — still dropping, but only a little
// "active"   — dropping normally   ·   "unknown" — fewer than two readings
function getFermentationActivity(b){
  var logs=(APP.logs[b.id]||[]).filter(function(l){return l&&l.gravity!=null;})
    .slice().sort(function(a,c){return (a.date||'').localeCompare(c.date||'');});
  if(logs.length<2)return{state:'unknown',count:logs.length};
  var last=logs[logs.length-1],prev=logs[logs.length-2];
  var drop=prev.gravity-last.gravity; // >0 = still dropping
  var daysApart=Math.abs(Math.round((new Date(last.date)-new Date(prev.date))/86400000));
  var flat3=false;
  if(logs.length>=3)flat3=Math.abs(logs[logs.length-3].gravity-last.gravity)<=0.003;
  if(Math.abs(drop)<=0.002){
    return{state:(daysApart>=2||flat3)?'stopped':'maybe',last:last.gravity,daysApart:daysApart};
  }
  if(drop>0&&drop<=0.005)return{state:'slowing',last:last.gravity,drop:drop};
  return{state:'active',last:last.gravity,drop:drop};
}

function getBatchStatus(b){
  if(b.failed)return'failed';
  if(b.status)return b.status;
  if(APP.bottling[b.id]){
    // Batch is 'complete' ONLY when bottled AND every bottle has been drunk/gifted
    // (i.e. on-hand count is 0 with an original count > 0). Until then it's 'bottled'.
    if(bottlesOnHand(APP.bottling[b.id])===0&&bottlesOriginal(APP.bottling[b.id])>0)return'complete';
    return'bottled';
  }
  var d=daysSince(b.startDate);
  // Pre-bottling lifecycle follows what's ACTUALLY happened — completed brew-coach
  // steps and the gravity trend — not just elapsed days. So a batch won't jump to
  // the next stage on the calendar if you haven't racked / marked the steps.
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  var steps=(recipe&&typeof getEffectiveSteps==='function')?getEffectiveSteps(b,recipe):[];
  var anyStepDone=false,rackDone=false,ageDone=false;
  steps.forEach(function(s){
    if(typeof isTaskDone!=='function'||!isTaskDone(b.id+'-step-'+s.day))return;
    anyStepDone=true;
    var t=s.title||'';
    if(/rack|secondary|transfer/i.test(t))rackDone=true;
    if(/aging|bulk|stabil|clarif|cold ?crash|oak|back-?sweet/i.test(t))ageDone=true;
  });
  var hasLogs=(APP.logs[b.id]||[]).some(function(l){return l&&l.gravity!=null;});
  // No tracking data at all → fall back to the original calendar estimate so the
  // stage isn't stuck at "fermenting" for someone who doesn't use the coach.
  if(!anyStepDone&&!hasLogs){
    if(d<14)return'fermenting';
    if(d<42)return'conditioning';
    return'aging';
  }
  if(ageDone)return'aging';
  if(rackDone)return d>=42?'aging':'conditioning';
  if(getFermentationActivity(b).state==='stopped')return'conditioning';
  return'fermenting';
}

// Small at-a-glance pill for whether fermentation is still moving. Empty for
// bottled/failed batches and for normal active fermentation (no need to shout).
function fermentationBadge(b){
  if(!b||b.failed||APP.bottling[b.id])return'';
  var f=getFermentationActivity(b);
  if(f.state==='stopped')return'<span class="badge" style="background:rgba(122,160,64,0.18);color:#a8d27a;border-color:rgba(122,160,64,0.45)" title="The last gravity readings are flat — fermentation looks finished. Confirm with one more reading, then rack or stabilize.">● fermentation stopped</span>';
  if(f.state==='maybe')return'<span class="badge" style="background:rgba(200,160,32,0.16);color:var(--honey);border-color:var(--amber)" title="Recent readings barely moved. Take another reading 2–3 days apart to confirm it has truly stopped.">● maybe stopped</span>';
  if(f.state==='slowing')return'<span class="badge" style="background:rgba(122,160,64,0.10);color:#9bbf6e;border-color:rgba(122,160,64,0.30)" title="Gravity is still dropping, but slowly — fermentation is winding down.">● slowing</span>';
  return'';
}

function statusBadge(s){
  var m={fermenting:'badge-fermenting',conditioning:'badge-conditioning',aging:'badge-aging',bottled:'badge-bottled',complete:'badge-complete',planning:'badge-planning',failed:'badge-failed'};
  if(s==='failed')return'<span class="badge" style="background:rgba(180,40,40,0.18);color:#e89090;border-color:rgba(180,40,40,0.4)">⚰ '+s+'</span>';
  // Active fermentation gets a few tiny rising CO2 bubbles (currentColor, so they
  // tint with the badge). Purely decorative; hidden under prefers-reduced-motion.
  var bubbles=s==='fermenting'?'<span class="ferm-bubbles" aria-hidden="true"><span></span><span></span><span></span></span>':'';
  return'<span class="badge '+(m[s]||'badge-planning')+'">'+bubbles+s+'</span>';
}

function toast(msg,durationMs){
  var t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},durationMs||2200);
}

// ==================== NAVIGATION ====================
function showView(view,arg){
  currentView=view;
  document.querySelectorAll('.nav-item').forEach(function(el){el.classList.remove('active');});
  var nav=document.getElementById('nav-'+view);
  if(nav)nav.classList.add('active');
  if(arg)currentBatchId=arg;
  renderMain();
}

function renderSidebar(){
  var el=document.getElementById('sidebar-batches');
  if(!el)return; // share mode replaces the whole body — no sidebar exists
  if(!APP.batches.length){
    el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:8px 14px;font-style:italic">No batches yet</div>';
    return;
  }
  var active=APP.batches.filter(function(b){var s=getBatchStatus(b);return s!=='complete'&&s!=='bottled'&&s!=='failed';});
  if(!active.length){
    el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:8px 14px;font-style:italic">All batches bottled or complete</div>';
    return;
  }
  el.innerHTML=active.map(function(b){
    var color=getBatchColor(b);
    return'<div class="batch-pill '+(currentBatchId===b.id&&currentView==='batch'?'active':'')+'" onclick="showView(\'batch\',\''+b.id+'\')">'
      +'<div class="batch-dot" style="background:'+color+';color:'+color+'"></div>'
      +'<div class="batch-pill-name">'+escHtml(b.name)+'</div>'
      +'<div class="batch-pill-day">'+fmtDurationCompact(daysSince(b.startDate)).toUpperCase().replace(/\s/g,'')+'</div></div>';
  }).join('');
}

// Create a Chart.js chart, first destroying any existing chart bound to the same
// canvas — full-view re-renders reuse canvas ids, so without this old instances
// leak and Chart.js throws "Canvas is already in use".
function makeChart(target,cfg){
  try{
    if(typeof Chart!=='undefined'&&Chart.getChart){
      var canvas=(target&&target.canvas)?target.canvas:target; // 2d-context → its canvas
      var ex=Chart.getChart(canvas);
      if(ex)ex.destroy();
    }
  }catch(e){}
  return new Chart(target,cfg);
}
var _lastRenderedView=null;
function renderMain(){
  renderSidebar();
  var main=document.getElementById('main');
  if(!main)return; // share mode has no app shell to render into
  // Preserve scroll + focus on an in-place re-render (same view, e.g. after
  // logging a reading). On a real navigation (view changed) start at the top.
  var _sameView=(_lastRenderedView===currentView);
  var _keepScroll=_sameView?main.scrollTop:0;
  var _afEl=_sameView?document.activeElement:null;
  var _afId=(_afEl&&_afEl.id&&main.contains(_afEl))?_afEl.id:null;
  var _selS=_afId&&_afEl.selectionStart!=null?_afEl.selectionStart:null;
  var _selE=_afId&&_afEl.selectionEnd!=null?_afEl.selectionEnd:null;
  switch(currentView){
    case'dashboard':main.innerHTML=renderDashboard();initDashCharts();break;
    case'batches':main.innerHTML=renderBatchList();break;
    case'cellar':main.innerHTML=renderCellar();break;
    case'compare':main.innerHTML=renderCompare();initCompareCharts();break;
    case'supplies':main.innerHTML=renderSupplies();break;
    case'timeline':main.innerHTML=renderTimeline();break;
    case'ferm-timeline':main.innerHTML=renderFermenterTimeline();break;
    case'review':main.innerHTML=renderYearReview();break;
    case'insights':main.innerHTML=renderInsightsView();break;
    case'cellar-map':
      main.innerHTML=renderCellarMap();
      // The cellar temp history card needs Chart.js initialization — same as
      // the existing Cellar view does. Without this the card renders but stays
      // stuck on "Loading history…" forever because drawCellarTempChart never
      // gets called.
      if(typeof initCellarCharts==='function')initCellarCharts();
      // Kick off a sensor refresh and re-render once data arrives so the
      // user doesn't have to wait up to 60s for the next polling tick.
      if(typeof refreshAllSensorTemps==='function'){
        refreshAllSensorTemps().then(function(){
          if(currentView==='cellar-map'){
            try{
              main.innerHTML=renderCellarMap();
              // Re-render destroyed the canvas DOM nodes — restart the chart
              if(typeof initCellarCharts==='function')initCellarCharts();
            }catch(e){}
          }
        });
      }
      break;
    case'suppliers':main.innerHTML=renderSuppliersView();break;
    case'troubleshoot':main.innerHTML=renderTroubleshoot();break;
    case'batch':main.innerHTML=renderBatchDetail();initBatchCharts();break;
    case'coach':main.innerHTML=renderCoach();break;
    case'recipes':main.innerHTML=renderRecipes();break;
    case'recipe-detail':main.innerHTML=renderRecipeDetail();break;
    case'calendar':main.innerHTML=renderCalendar();break;
    case'tools':main.innerHTML=renderTools();initTools();break;
    case'guide':main.innerHTML=renderGuide();break;
    case'honey':main.innerHTML=renderHoneyLibrary();break;
    case'honey-detail':main.innerHTML=renderHoneyDetail();break;
    case'yeast-library':main.innerHTML=renderYeastLibrary();break;
    case'yeast-detail':main.innerHTML=renderYeastDetail();break;
    case'nutrient-library':main.innerHTML=renderNutrientLibrary();break;
    case'nutrient-detail':main.innerHTML=renderNutrientDetail();break;
    case'protocol-guide':main.innerHTML=renderProtocolGuide();break;
    case'settings':main.innerHTML=renderSettings();if(typeof refreshSecurityStatus==='function')refreshSecurityStatus();break;
    default:main.innerHTML=renderDashboard();initDashCharts();
  }
  // Restart the view-transition fade AFTER the content is swapped in, so each
  // view actually re-animates (setting the same class never restarts it) and the
  // freshly-swapped DOM forces a clean repaint — no stale layer from the prior
  // view ghosting over this one.
  main.classList.remove('fade-in');
  void main.offsetWidth;
  main.classList.add('fade-in');
  _lastRenderedView=currentView;
  // Restore scroll + focus on an in-place re-render so a mutation doesn't jump
  // the page to the top or drop the cursor out of the field being edited.
  if(_afId){var _el=document.getElementById(_afId);if(_el){try{_el.focus({preventScroll:true});if(_selS!=null&&_el.setSelectionRange)_el.setSelectionRange(_selS,_selE);}catch(e){}}}
  main.scrollTop=_keepScroll;
  if(typeof a11yEnhance==='function')a11yEnhance(main);
}
