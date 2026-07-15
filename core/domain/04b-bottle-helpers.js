// ==========================================================================
// Multi-size bottle-count helpers (split out of 04-server-ha.js). Globals, no behaviour change.
// ==========================================================================

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
  // View filter (cider mode): dashboard/Insights stat chips should reflect
  // whichever beverage you're currently looking at, not a combined total —
  // see visibleBatches()'s own comment for why this never touches APP.batches.
  (typeof visibleBatches==='function'?visibleBatches():(APP.batches||[])).forEach(function(b){
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

// data-args is fixed at RENDER time — this form's values need to be read at
// CLICK time instead, so the button names this wrapper (batchId only) and
// it does the live document.getElementById() reads itself.
function _addTimeCapsuleFromForm(batchId){
  addTimeCapsule(batchId,
    document.getElementById('tc-count').value,
    document.getElementById('tc-date').value,
    document.getElementById('tc-reason').value);
}
function addTimeCapsule(batchId,count,openDate,reason){
  var b=getBatch(batchId);
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
  var b=getBatch(batchId);
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
      +'<button class="btn btn-danger btn-sm" data-action="removeTimeCapsule" data-args=\''+JSON.stringify([b.id,tc.id])+'\' title="Remove reservation">✕</button>'
      +'</div>';
  }).join('');
  return'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">🕰 TIME CAPSULE RESERVATIONS</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+reserved+' OF '+onHand+' RESERVED · '+available+' FREE</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:12px;line-height:1.55">'+(appLang()==='nl'?'Markeer flessen die je apart zet voor een specifieke toekomstige gelegenheid (jubileum, mijlpaalverjaardag, vintage-proeverij). Geteld als "gereserveerd" zodat je ze niet per ongeluk opdrinkt — maar de flessen blijven in de kelder en worden weer beschikbaar nadat de openingsdatum is verstreken.':'Mark bottles set aside for a specific future event (anniversary, milestone birthday, vintage tasting). Counted as "reserved" so you don\'t accidentally drink them — but the bottles stay in the cellar and become available again after the open date passes.')+'</div>'
    +(rows?'<div style="background:var(--bg);border-radius:var(--radius);overflow:hidden;margin-bottom:12px">'+rows+'</div>':'')
    +(available>0
      ?'<div class="form-row"><div class="form-group"><label class="form-label">Bottles to reserve</label><input class="form-input" type="number" id="tc-count" min="1" max="'+available+'" placeholder="e.g. 4"></div>'
        +'<div class="form-group"><label class="form-label">Open date (optional)</label><input class="form-input" type="date" id="tc-date"></div></div>'
        +'<div class="form-group"><label class="form-label">Reason / occasion</label><input class="form-input" type="text" id="tc-reason" placeholder="e.g. 10th anniversary, baby\'s 18th, vintage 2030 tasting"></div>'
        +'<button class="btn btn-secondary btn-sm" data-action="_addTimeCapsuleFromForm" data-args=\''+JSON.stringify([b.id])+'\'>＋ Add reservation</button>'
      :'<div style="font-size:12px;color:var(--text3);font-style:italic;padding:10px 0">'+(appLang()==='nl'?'Alle aanwezige flessen zijn gereserveerd. Open of geef reserveringen vrij om er meer toe te voegen.':'All on-hand bottles are reserved. Open or release reservations to add more.')+'</div>')
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
      +'<button class="btn btn-secondary btn-sm" data-action="openShelfAssignmentModal" data-args=\''+JSON.stringify([b.id])+'\'>'+(shelf?'Move':'Place on shelf')+'</button>'
      +'</div>'
      +(shelf
        ?'<div style="background:var(--bg);border-left:3px solid var(--gold);border-radius:6px;padding:10px 14px;font-size:13px"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">📍 '+escHtml(shelf.label)+'</div><div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);letter-spacing:1px;margin-top:3px">'+escHtml((hit&&hit.cabinet&&(hit.cabinet.name||hit.cabinet.model))||'Cellar')+' · '+(shelf.type==='open'?'OPEN':(shelf.type==='fermenter_slot'?'FERMENTER SLOT':'BOTTLE RACK'))+'</div></div>'
        :'<div style="font-size:12.5px;color:var(--text3);font-style:italic;padding:10px 0">Not yet placed on a shelf. Click "Place on shelf" to assign.</div>')
      +(legacyText?'<div style="margin-top:10px;font-size:11px;color:var(--text3);background:var(--bg);padding:8px 10px;border-radius:4px"><strong>Legacy note:</strong> '+escHtml(legacyText)+' <a data-action="clearLegacySublocation" data-args=\''+JSON.stringify([b.id])+'\' style="color:var(--red2);cursor:pointer;margin-left:8px">clear</a></div>':'')
      +'</div>';
  }
  // Legacy mode (no cellar configured) — keep the free-text field
  var current=bot.cellarSublocation||'';
  return'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">📍 CELLAR SUB-LOCATION</div>'
    +'<button class="btn btn-secondary btn-sm" data-action="showView" data-args=\''+JSON.stringify(['cellar-map'])+'\' title="Set up your cellar with shelves for structured placement tracking">🏠 Configure cellar</button>'
    +'</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:12px;line-height:1.55">'+(appLang()==='nl'?'Waar wordt deze partij in je kelder bewaard? Vrij-tekstlabel zoals "Plank A doos 3". Voor uitgebreidere plaatsregistratie (visuele planken, sensorkoppeling) stel je je kelder in via Mijn Kelder in de zijbalk.':'Where is this batch stored in your cellar? Free-text label like "Shelf A box 3". For richer placement tracking (visual shelves, sensor binding), configure your cellar via My Cellar in the sidebar.')+'</div>'
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
  var _nl=(typeof appLang==='function'&&appLang()==='nl');
  var label=(_nl
    ?{local:'⬡ LOKAAL',synced:'✓ GESYNCT',syncing:'↻ SYNCEN',error:'⚠ FOUT',pending:'⏳ WACHTRIJ'}
    :{local:'⬡ LOCAL',synced:'✓ SYNCED',syncing:'↻ SYNCING',error:'⚠ ERROR',pending:'⏳ QUEUED'})[effectiveStatus]||effectiveStatus;
  badge.textContent=label;
  badge.title=effectiveStatus==='pending'?(_nl?'Sync staat in de wachtrij — opnieuw zodra de server bereikbaar is':'Sync queued — will retry when the server is reachable'):'';
  var btn=document.getElementById('sync-btn');
  if(btn)btn.classList.toggle('spinning',status==='syncing');
}

function packageState(){
  // Gravity readings and competitions are NOT included — they live in their
  // own tables now, synced through bucketSyncAdd/Delete/DeleteBatch/ReplaceAll
  // (04-server-ha.js) rather than riding this blob. APP.logs/APP.competitions
  // stay populated (boot-fetched read caches, see fetchBucket) — just never
  // written back through this path.
  return{
    batches:APP.batches,
    shareTokens:APP.shareTokens||{},
    // Calendar feed: token (private feed URL) + a snapshot of upcoming events
    // for the server to format as .ics. Recomputed on every save.
    calendarToken:(APP.settings&&APP.settings.calendarToken)||'',
    calendarEvents:(typeof buildCalendarEvents==='function')?buildCalendarEvents():[],
    // Lets the server notify on a dangerous fermentation temp with no tab
    // open — see buildTempWatchList() in core/sync/04-server-ha.js.
    tempWatch:(typeof buildTempWatchList==='function')?buildTempWatchList():[],
    tasksDone:APP.tasksDone,
    tastings:APP.tastings,
    bottling:APP.bottling,
    supplies:APP.supplies,
    suppliers:APP.suppliers||[],
    additions:APP.additions,
    customRecipes:APP.customRecipes,
    notifiedTasks:APP.notifiedTasks,
    templates:APP.templates||[],
    stepTemplates:APP.stepTemplates||[],
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
  // Check the root shape BEFORE migration: migrateData()'s steps assign
  // properties directly onto d and assume an object, so a non-object root
  // (a string, a number...) needs to be rejected here first rather than
  // reaching migration at all. See validateState() in 14-schema.js.
  if(typeof validateState==='function'){
    var rootValidation=validateState(d);
    if(!rootValidation.sanitized){
      if(typeof reportStateValidation==='function')reportStateValidation(rootValidation,'applyState');
      return; // root itself wasn't a usable object — leave APP untouched
    }
  }
  // Run schema migrations first so later code sees a normalized shape.
  var migrationReport=null;
  if(typeof migrateData==='function'){
    var mig=migrateData(d);
    d=mig.result;
    if(mig.fromVersion!==mig.toVersion)migrationReport=mig;
  }
  // Add to APP so it can be surfaced later (showMigrationReport is called once after first render)
  if(migrationReport)APP._pendingMigrationReport=migrationReport;
  // Re-check per-bucket shape after migration: a bucket can still be the
  // wrong type (a string where `batches` should be an array) even though the
  // root itself was fine — drop just that bucket rather than letting it sail
  // into APP and fail unpredictably somewhere downstream.
  if(typeof validateState==='function'){
    var validation=validateState(d);
    if(typeof reportStateValidation==='function')reportStateValidation(validation,'applyState');
    if(!validation.sanitized)return;
    d=validation.sanitized;
  }
  // Also remember templates + celebrated milestones + temp anomalies + custom user data buckets
  APP.templates=d.templates||APP.templates||[];
  APP.stepTemplates=Array.isArray(d.stepTemplates)?d.stepTemplates:(APP.stepTemplates||[]);
  APP.celebrated=d.celebrated||APP.celebrated||{};
  APP.tempAnomalies=d.tempAnomalies||APP.tempAnomalies||[];
  APP.batches=d.batches||[];
  // APP.logs is deliberately NOT touched here — it's a boot-fetched read cache
  // for the gravity_readings table (see fetchLogs, 04-server-ha.js), not part
  // of the blob applyState is unpacking. Leaving this line in would wipe that
  // cache on every applyState call, since d.logs no longer exists post-cutover.
  APP.tasksDone=d.tasksDone||{};
  APP.tastings=d.tastings||{};
  // APP.competitions is deliberately NOT touched here either, same reasoning
  // as APP.logs just above — its own table now (see fetchBucket), and this
  // line would wipe the boot-fetched cache since the blob no longer carries
  // the key.
  APP.bottling=d.bottling||{};
  // Preserve-if-absent (not reset-to-empty) — matches stepTemplates/plannedBatches/
  // photos below. A backup taken before these buckets existed in exportData()
  // still has no way to include them; importing one shouldn't wipe what's
  // already here just because the file predates the field.
  APP.shareTokens=(d.shareTokens&&typeof d.shareTokens==='object')?d.shareTokens:(APP.shareTokens||{});
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
