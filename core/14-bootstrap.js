// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// schema versioning, storage budget, modals, photo journal, settings actions, init()
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== SCHEMA VERSIONING ====================
// Current schema version. Bump when packageState/applyState changes shape.
var CURRENT_SCHEMA_VERSION=12;

var SCHEMA_MIGRATIONS={
  // v1 → v2: legacy locations as numbers → size-keyed maps
  2:function(d){
    if(d.bottling){
      Object.keys(d.bottling).forEach(function(bid){
        var bot=d.bottling[bid];
        if(!bot.locations)return;
        ['cellar','fridge','gifted','other'].forEach(function(loc){
          if(typeof bot.locations[loc]==='number'){
            var n=bot.locations[loc];
            bot.locations[loc]={};
            bot.locations[loc][750]=n;
          }
        });
      });
    }
    return d;
  },
  // v2 → v3: ensure countsAtBottling exists (immutable original counts)
  3:function(d){
    if(d.bottling){
      Object.keys(d.bottling).forEach(function(bid){
        var bot=d.bottling[bid];
        if(bot&&bot.locations&&!bot.countsAtBottling){
          bot.countsAtBottling={};
          ['cellar','fridge','gifted','other'].forEach(function(loc){
            var sizes=bot.locations[loc]||{};
            Object.keys(sizes).forEach(function(sz){
              bot.countsAtBottling[sz]=(bot.countsAtBottling[sz]||0)+(sizes[sz]||0);
            });
          });
        }
      });
    }
    return d;
  },
  // v3 → v4: add honeyType + yeast fields to batches (default missing values)
  4:function(d){
    if(d.batches){
      d.batches.forEach(function(b){
        if(!b.honeyType)b.honeyType='Wildflower';
        if(!b.yeast)b.yeast='m05';
      });
    }
    return d;
  },
  // v4 → v5: introduce gravityRaw separate from corrected gravity in logs
  5:function(d){
    // No-op migration — both keys are optional and old data is forward-compatible
    return d;
  },
  // v5 → v6: introduce fermenters as first-class entities. The user may have 1+
  // fermenters; existing batches with no fermenterId get assigned to f1
  // (the first/default fermenter). Settings.favoriteRecipes also normalized.
  6:function(d){
    if(!d.fermenters||!d.fermenters.length){
      d.fermenters=[
        {id:'f1',name:'Primary 1',capacity:9,notes:'9 L wide-mouth · primary fermentation',color:'#c9a84c',tempSensorEntity:''},
        {id:'f2',name:'Primary 2',capacity:9,notes:'9 L wide-mouth · primary fermentation',color:'#a87aa0',tempSensorEntity:''},
        {id:'f3',name:'Secondary 1',capacity:7.6,notes:'7.6 L wide-mouth · secondary / assist',color:'#7aa8c0',tempSensorEntity:''},
        {id:'f4',name:'Secondary 2',capacity:7.6,notes:'7.6 L wide-mouth · secondary / assist',color:'#7aa850',tempSensorEntity:''},
        {id:'f5',name:'Bulk Aging 1',capacity:5,notes:'5 L wide-mouth · secondary + bulk aging before bottling',color:'#c87850',tempSensorEntity:''},
        {id:'f6',name:'Bulk Aging 2',capacity:5,notes:'5 L wide-mouth · secondary + bulk aging before bottling',color:'#5a8a7a',tempSensorEntity:''}
      ];
    }
    if(d.batches){
      d.batches.forEach(function(b){
        if(!b.fermenterId)b.fermenterId='f1';
      });
    }
    if(!d.settings)d.settings={};
    if(!Array.isArray(d.settings.favoriteRecipes))d.settings.favoriteRecipes=[];
    return d;
  },
  // v6 → v7: photo journal feature removed. Strip b.photos arrays from any
  // existing batches to reclaim storage space (base64 JPEGs were ~80 KB each).
  // This is destructive — photo data is gone after migration runs. Intentional.
  7:function(d){
    if(d.batches){
      d.batches.forEach(function(b){
        if(b.photos)delete b.photos;
      });
    }
    return d;
  },
  // v7 → v8: human-readable batch serial numbers (e.g. 2024-001). Backfilled
  // onto every existing batch in chronological order, grouped by start-year.
  // Once assigned, a serial is sticky — never recomputed — so they're safe to
  // reference on printed storage labels, certificates, share URLs.
  8:function(d){
    if(!d.batches||!d.batches.length)return d;
    var byYear={};
    d.batches.forEach(function(b){
      var year=new Date(b.startDate||(new Date().toISOString().slice(0,10))).getFullYear();
      if(isNaN(year))year=new Date().getFullYear();
      if(!byYear[year])byYear[year]=[];
      byYear[year].push(b);
    });
    Object.keys(byYear).forEach(function(yr){
      var year=parseInt(yr,10);
      var maxExisting=0;
      var unassigned=[];
      byYear[yr].forEach(function(b){
        var m=b.serial&&/^(\d{4})-(\d{3,})$/.exec(String(b.serial));
        if(m&&parseInt(m[1],10)===year){
          var seq=parseInt(m[2],10);
          if(seq>maxExisting)maxExisting=seq;
        }else{
          unassigned.push(b);
        }
      });
      unassigned.sort(function(a,b){
        return((a.startDate||'')+'|'+(a.id||'')).localeCompare((b.startDate||'')+'|'+(b.id||''));
      });
      unassigned.forEach(function(b){
        maxExisting++;
        b.serial=year+'-'+String(maxExisting).padStart(3,'0');
      });
    });
    return d;
  },
  // v8 → v9: add time-capsule reservations and cellar sub-locations.
  // Time-capsule reservations: per-batch list of {count, openDate, reason}
  // marking bottles set aside for a specific future event. Counts against
  // bottlesOnHand but won't appear in normal drink/gift workflows.
  // Cellar sub-locations: free-text labels like "Shelf A box 3" that can be
  // assigned to bottles within the cellar location. Purely a label — no
  // structural change to the bottle count model.
  // Both fields are optional; missing values are treated as empty arrays.
  9:function(d){
    if(d.batches){
      d.batches.forEach(function(b){
        // No-op data initialization — the runtime code tolerates missing
        // fields, but explicitly seeding empty arrays makes the schema shape
        // visible in exports/backups.
        if(!Array.isArray(b.timeCapsules))b.timeCapsules=[];
      });
    }
    if(d.bottling){
      Object.keys(d.bottling).forEach(function(bid){
        var bot=d.bottling[bid];
        if(bot&&typeof bot==='object'&&!bot.cellarSublocation){
          bot.cellarSublocation='';
        }
      });
    }
    return d;
  },
  // v9 → v10: supplier rolodex. Tracks beekeepers and shops with notes,
  // honey specialties, contact info. Pure additive — existing data unaffected.
  10:function(d){
    if(!Array.isArray(d.suppliers))d.suppliers=[];
    return d;
  },
  // v10 → v11: Cellar as a first-class object. Previously the cellar was just
  // a sensor entity field on settings + free-text cellarSublocation on each
  // bottling record. Now there's a proper APP.cellar object with name, model,
  // both temp+humidity sensors, target band, and a structured shelves[] array.
  // The temp sensor entity gets migrated from settings.cellarTempSensorEntity
  // (the settings field is kept as a fallback for legacy code paths).
  // Existing bottling.cellarSublocation values are preserved as-is and shown
  // alongside the new shelf assignment.
  11:function(d){
    if(!d.cellar){
      d.cellar={
        name:'',
        model:'',
        location:'',
        capacity:0,
        tempSensorEntity:(d.settings&&d.settings.cellarTempSensorEntity)||'',
        humiditySensorEntity:'',
        targetTemp:13,
        targetTempMin:8,
        targetTempMax:18,
        targetHumidityMin:50,
        targetHumidityMax:75,
        shelves:[]
      };
    }
    return d;
  },
  // v11 → v12: Multi-cabinet cellar. The singleton `cellar` object becomes a
  // `cabinets` array so brewers can track several cabinets/fridges/racks in
  // different places. Shelf ids are globally unique, so existing
  // cellarShelfId references on batches/bottling/fermenters keep working.
  12:function(d){
    if(!Array.isArray(d.cabinets)){
      d.cabinets=[];
      var c=d.cellar;
      var hasContent=c&&(c.name||c.model||c.location||c.tempSensorEntity||c.humiditySensorEntity||(Array.isArray(c.shelves)&&c.shelves.length));
      if(hasContent){
        if(!c.id)c.id='cab-1';
        d.cabinets.push(c);
      }
    }
    delete d.cellar;
    return d;
  }
};

function migrateData(d){
  if(!d)return{result:d,steps:[]};
  var fromVersion=d.dataVersion||1;
  var steps=[];
  for(var v=fromVersion+1;v<=CURRENT_SCHEMA_VERSION;v++){
    var fn=SCHEMA_MIGRATIONS[v];
    if(fn){
      try{
        d=fn(d)||d;
        steps.push({from:v-1,to:v,ok:true});
      }catch(e){
        steps.push({from:v-1,to:v,ok:false,error:e.message});
      }
    }
  }
  d.dataVersion=CURRENT_SCHEMA_VERSION;
  return{result:d,steps:steps,fromVersion:fromVersion,toVersion:CURRENT_SCHEMA_VERSION};
}

function showMigrationReport(report){
  if(!report||!report.steps||!report.steps.length)return;
  if(report.fromVersion===report.toVersion)return;
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:540px">'
    +'<div class="modal-title">⚙ DATA MIGRATED</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Your stored data was upgraded from schema <strong>v'+report.fromVersion+'</strong> to <strong>v'+report.toVersion+'</strong>. The original data is preserved; this is just a non-destructive reshape so newer features can read older batches.</div>'
    +'<div style="background:var(--bg3);padding:12px;border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;line-height:1.8">'
    +report.steps.map(function(s){return'<div>'+(s.ok?'<span style="color:var(--green2)">✓</span>':'<span style="color:var(--red2)">✗</span>')+' v'+s.from+' → v'+s.to+(s.error?' <span style="color:var(--red2)">'+escHtml(s.error)+'</span>':'')+'</div>';}).join('')
    +'</div>'
    +'<div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">OK</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// ==================== STORAGE BUDGET ====================
// Computes a breakdown of the synced JSON payload so the user can see what's
// taking up space and how close they are to their mode's limit.
// Uploaded images (data: URLs) bloat the payload; media-source IDs are tiny.

function computeStorageBreakdown(){
  var pkg=(typeof packageState==='function')?packageState():null;
  if(!pkg)return null;
  var fullJson=JSON.stringify(pkg);
  var total=fullJson.length;
  // Compute the data: URL portion of customLabels + brandLogo (these are the
  // big-ticket items — full base64-encoded images).
  var labels=(pkg.sharedSettings&&pkg.sharedSettings.customLabels)||{};
  var dataLabelBytes=0,mediaLabelCount=0,urlLabelCount=0,dataLabelCount=0;
  Object.keys(labels).forEach(function(k){
    var v=labels[k]||'';
    if(typeof v!=='string')return;
    if(v.indexOf('data:')===0){dataLabelBytes+=v.length;dataLabelCount++;}
    else if(v.indexOf('media-source://')===0)mediaLabelCount++;
    else if(v.length>0)urlLabelCount++;
  });
  // Brand logo
  var brandLogo=(pkg.sharedSettings&&pkg.sharedSettings.brandLogo)||'';
  var brandLogoBytes=0,brandLogoKind='none';
  if(typeof brandLogo==='string'&&brandLogo){
    if(brandLogo.indexOf('data:')===0){brandLogoBytes=brandLogo.length;brandLogoKind='data';}
    else if(brandLogo.indexOf('media-source://')===0)brandLogoKind='media';
    else brandLogoKind='url';
  }
  // Limit — the SQLite server stores far more than this without complaint,
  // but the localStorage offline cache and page-load time degrade past a few
  // MB. 5 MB is a safe soft warning threshold.
  var mode='server';
  var limit=5*1024*1024;
  var limitNote='offline-cache soft limit';
  var imagesBytes=dataLabelBytes+brandLogoBytes;
  var coreBytes=total-imagesBytes;
  return{
    total:total,
    coreBytes:coreBytes,
    imagesBytes:imagesBytes,
    dataLabelBytes:dataLabelBytes,
    dataLabelCount:dataLabelCount,
    mediaLabelCount:mediaLabelCount,
    urlLabelCount:urlLabelCount,
    brandLogoBytes:brandLogoBytes,
    brandLogoKind:brandLogoKind,
    mode:mode,
    limit:limit,
    limitNote:limitNote,
    pct:Math.min(100,total/limit*100)
  };
}

function fmtBytes(n){
  if(n<1024)return n+' B';
  if(n<1024*1024)return(n/1024).toFixed(1)+' KB';
  return(n/1024/1024).toFixed(2)+' MB';
}

function renderStorageBudgetCard(){
  var b=computeStorageBreakdown();
  if(!b)return'';
  // Color zones based on % usage
  var barColor='var(--green2)',statusLabel='Healthy',statusColor='var(--green2)';
  if(b.pct>85){barColor='var(--red2)';statusLabel='Near limit';statusColor='var(--red2)';}
  else if(b.pct>60){barColor='var(--gold2)';statusLabel='Watch';statusColor='var(--gold2)';}
  // Breakdown rows
  var rows=[];
  rows.push({label:'Core data (batches, logs, supplies, etc.)',bytes:b.coreBytes,color:'var(--text2)'});
  if(b.dataLabelCount>0)rows.push({label:b.dataLabelCount+' uploaded label'+(b.dataLabelCount===1?'':'s')+' (data URLs)',bytes:b.dataLabelBytes,color:'var(--gold2)'});
  if(b.brandLogoBytes>0)rows.push({label:'Uploaded brand logo',bytes:b.brandLogoBytes,color:'var(--gold2)'});
  // Storage-free items get a separate informational note
  var freeItems=[];
  if(b.mediaLabelCount>0)freeItems.push(b.mediaLabelCount+' HA Media label'+(b.mediaLabelCount===1?'':'s'));
  if(b.urlLabelCount>0)freeItems.push(b.urlLabelCount+' URL-referenced label'+(b.urlLabelCount===1?'':'s'));
  if(b.brandLogoKind==='media')freeItems.push('brand logo (HA Media)');
  if(b.brandLogoKind==='url')freeItems.push('brand logo (URL)');
  // Recommendation
  var recommendation='';
  if(b.dataLabelCount>=3){
    recommendation='<div style="margin-top:10px;padding:10px;background:rgba(201,163,80,0.08);border-left:3px solid var(--gold);border-radius:3px;font-size:12px;color:var(--text2)">'
      +'<strong style="color:var(--gold2)">Tip:</strong> '+b.dataLabelCount+' uploaded labels are riding the synced blob ('+fmtBytes(b.dataLabelBytes)+'). For tighter syncs and easier backups, drop those PNGs into <code>/config/media/labels/</code> and re-pick them via the 🗂 HA Media tab. Media-source picks add ~60 bytes regardless of image size.'
      +'</div>';
  }else if(b.pct>85){
    recommendation='<div style="margin-top:10px;padding:10px;background:rgba(199,80,80,0.08);border-left:3px solid var(--red2);border-radius:3px;font-size:12px;color:var(--text2)">'
      +'<strong style="color:var(--red2)">Approaching capacity.</strong> Consider replacing uploaded labels with URL or HA-media references, or trimming old batches.'
      +'</div>';
  }
  return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📊 STORAGE BUDGET</div></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">'
    +'<div style="font-family:var(--font-display);font-size:18px;color:var(--text)">'+fmtBytes(b.total)+'</div>'
    +'<div style="font-family:var(--font-mono);font-size:11px;color:'+statusColor+';letter-spacing:0.5px">'+statusLabel.toUpperCase()+' · '+b.pct.toFixed(1)+'%</div>'
    +'</div>'
    // Progress bar
    +'<div style="background:var(--bg4);border-radius:3px;overflow:hidden;height:8px;margin-bottom:6px">'
    +'<div style="background:'+barColor+';height:100%;width:'+b.pct.toFixed(1)+'%;transition:width 0.3s"></div>'
    +'</div>'
    +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-bottom:14px">'
    +'of '+fmtBytes(b.limit)+' · '+escHtml(b.limitNote)
    +'</div>'
    // Breakdown table
    +(rows.length>0?'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:6px">BREAKDOWN</div>':'')
    +rows.map(function(r){
      return'<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12.5px;color:var(--text2);border-bottom:1px solid var(--bg4)">'
        +'<span style="color:'+r.color+'">'+escHtml(r.label)+'</span>'
        +'<span style="font-family:var(--font-mono);color:var(--text)">'+fmtBytes(r.bytes)+'</span>'
        +'</div>';
    }).join('')
    +(freeItems.length>0?'<div style="margin-top:10px;padding:8px 10px;background:var(--bg);border-radius:3px;font-size:11.5px;color:var(--text3);font-style:italic">'
      +'+ '+escHtml(freeItems.join(', '))+' — references only, no storage cost'
      +'</div>':'')
    +recommendation
    +'</div>';
}

// ==================== MODAL HANDLERS ====================
function closeModal(){var m=document.querySelector('.modal-overlay');if(m)m.remove();}

function openNewBatchModal(recipeId,scaledVol,opts){
  closeModal();
  opts=opts||{};
  // When deploying a planned batch, remember which plan to retire on success.
  // A plain new batch clears it so a stale id can't consume an unrelated plan.
  window._deployingPlanId=opts.plannedId||null;
  window._batchDangerOverride=false;
  window._lastBatchYeastCheck=null;
  var preselect=recipeId||(APP.recipes[0]&&APP.recipes[0].id);
  var recipeOpts=APP.recipes.map(function(r){return'<option value="'+r.id+'"'+(r.id===preselect?' selected':'')+'>'+escHtml(r.name)+' ('+r.style+')</option>';}).join('');
  var initial=APP.recipes.find(function(r){return r.id===preselect;})||APP.recipes[0];
  var volPrefSI=scaledVol||(initial?initial.volume:4.5);      // metric litres
  // Estimate honey amount from OG + volume (metric kg)
  var initialHoneyKg=initial?((initial.ogTarget-1)*1000*volPrefSI/292):0;
  var initialCost=APP.settings.honeyPricePerKg?(initialHoneyKg*APP.settings.honeyPricePerKg).toFixed(2):'';
  // Display values honour the chosen unit system (storage stays metric).
  var us=currentUnitSystem();
  var volPref=(volPrefSI/UNIT_VOL[us].toSI).toFixed(us==='metric'?2:3);
  var initialHoney=initialHoneyKg?(initialHoneyKg/UNIT_WT[us].toSI).toFixed(2):'';
  var unitBtns=['metric','us','imperial'].map(function(s){
    var lbl={metric:'Metric · L / kg',us:'US · gal / lb',imperial:'Imperial · gal / lb'}[s];
    var on=(s===us);
    return'<button type="button" id="nb-unit-'+s+'" onclick="onBatchUnitChange(\''+s+'\')" style="flex:1;padding:7px 4px;border-radius:var(--radius);cursor:pointer;font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.3px;border:1px solid '+(on?'var(--gold)':'var(--border)')+';background:'+(on?'rgba(201,168,76,0.14)':'var(--bg3)')+';color:'+(on?'var(--gold2)':'var(--text3)')+'">'+lbl+'</button>';
  }).join('');
  // Fermenter picker — show all fermenters with availability badges
  var defaultFermId=defaultFermenterIdForNewBatch();
  var fermenterOpts=(APP.fermenters||[]).map(function(f){
    var occ=fermenterOccupiedBy(f.id);
    var label=f.name+(f.capacity?' ('+f.capacity+'L)':'');
    if(occ)label+=' — occupied by '+occ.name;
    else label+=' — free';
    return'<option value="'+f.id+'"'+(f.id===defaultFermId?' selected':'')+(occ?' style="color:#a07060"':'')+'>'+escHtml(label)+'</option>';
  }).join('');
  var fermenterRow=fermenterOpts?
    '<div class="form-group"><label class="form-label">Fermenter</label><select class="form-select" id="nb-fermenter">'+fermenterOpts+'</select><div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">Occupied fermenters can still be selected (e.g., if you bottle and re-pitch the same day).</div></div>':
    '';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">⚗ NEW BATCH</div>'
    +'<div class="form-group"><label class="form-label">Choose Recipe</label><select class="form-select" id="nb-recipe" onchange="updateRecipeFields();updateYeastCompatibility()">'+recipeOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Batch Name</label><input class="form-input" id="nb-name" placeholder="e.g., Spring Batch #1" value="'+escHtml((initial?initial.name:'Mead')+' #'+(APP.batches.length+1))+'"></div>'
    +'<div class="form-group"><label class="form-label">Units</label><div style="display:flex;gap:6px">'+unitBtns+'</div></div>'
    +fermenterRow
    +'<div class="form-row"><div class="form-group"><label class="form-label">Start Date</label><input class="form-input" id="nb-date" type="date" value="'+today()+'"></div>'
    +'<div class="form-group"><label class="form-label" id="nb-vol-label">Volume ('+UNIT_VOL[us].label+')</label><input class="form-input" id="nb-vol" type="number" step="0.1" value="'+volPref+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Target OG</label><input class="form-input" id="nb-og" type="number" step="0.001" value="'+(initial?initial.ogTarget:1.095)+'" onchange="updateYeastCompatibility()"></div>'
    +'<div class="form-group"><label class="form-label" id="nb-honey-label">Honey ('+UNIT_WT[us].label+')</label><input class="form-input" id="nb-honey" type="number" step="0.01" value="'+initialHoney+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Honey Type</label><select class="form-select" id="nb-honey-type" onchange="updateYeastCompatibility()">'
    +(function(){
      // Build two-group dropdown: honeys you actually have in supplies first,
      // then every other variety. Quantities and units shown for stocked ones
      // so the user picks "what's available" rather than "what's nice in theory".
      var honeySupplies=(APP.supplies||[]).filter(function(s){return s.type==='honey'&&parseFloat(s.qty)>0;});
      // Match each supply to a canonical HONEY_TYPES entry by substring; track which canonical names are stocked
      var stockedCanonical={};
      var inStockOptions=honeySupplies.map(function(s){
        var name=String(s.name||'').trim();
        var canonical=HONEY_TYPES.find(function(t){
          var lt=t.toLowerCase(),ln=name.toLowerCase();
          return ln.indexOf(lt)!==-1||lt.indexOf(ln)!==-1;
        });
        var displayValue=canonical||name;
        if(canonical)stockedCanonical[canonical]=true;
        var qtyLabel=(parseFloat(s.qty)||0)+' '+(s.unit||'');
        var brandSuffix=s.brand?' · '+s.brand:'';
        return'<option value="'+escHtml(displayValue)+'">'+escHtml(name)+' ('+qtyLabel+brandSuffix+')</option>';
      }).join('');
      var otherOptions=HONEY_TYPES.filter(function(t){return!stockedCanonical[t];})
        .map(function(t){return'<option value="'+escHtml(t)+'"'+(t==='Wildflower'&&!inStockOptions?' selected':'')+'>'+escHtml(t)+'</option>';}).join('');
      // If user has stocked honeys, default-select the first one
      if(inStockOptions){
        return'<optgroup label="🟢 In your supplies">'+inStockOptions+'</optgroup>'
          +'<optgroup label="Other varieties (not stocked)">'+otherOptions+'</optgroup>';
      }
      return otherOptions;
    }())
    +'</select></div>'
    +'<div class="form-group"><label class="form-label">Yeast Strain</label><select class="form-select" id="nb-yeast" onchange="updateYeastCompatibility()">'
    +(function(){
      // Same treatment for yeast — show what you have first
      var yeastSupplies=(APP.supplies||[]).filter(function(s){return s.type==='yeast'&&parseFloat(s.qty)>0;});
      var stockedStrains={};
      var inStockOptions=yeastSupplies.map(function(s){
        var name=String(s.name||'').trim();
        var strain=YEAST_STRAINS.find(function(y){
          var ln=name.toLowerCase(),lyn=y.name.toLowerCase(),lyid=y.id.toLowerCase();
          return ln.indexOf(lyid)!==-1||ln.indexOf(lyn.split(' ').pop().toLowerCase())!==-1;
        });
        var value=strain?strain.id:'m05';
        if(strain)stockedStrains[strain.id]=true;
        var qtyLabel=(parseFloat(s.qty)||0)+' '+(s.unit||'');
        return'<option value="'+escHtml(value)+'">'+escHtml(name)+' ('+qtyLabel+')</option>';
      }).join('');
      var otherOptions=YEAST_STRAINS.filter(function(y){return!stockedStrains[y.id];})
        .map(function(y){return'<option value="'+escHtml(y.id)+'"'+(y.id==='m05'&&!inStockOptions?' selected':'')+'>'+escHtml(y.name)+'</option>';}).join('');
      if(inStockOptions){
        return'<optgroup label="🟢 In your supplies">'+inStockOptions+'</optgroup>'
          +'<optgroup label="Other strains (not stocked)">'+otherOptions+'</optgroup>';
      }
      return otherOptions;
    }())
    +'</select>'
    +'<div id="nb-yeast-check" style="margin-top:8px"></div>'
    +'</div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Nutrient Product</label><select class="form-select" id="nb-nutrient" onchange="onNutrientChange()">'
    +(function(){
      // Group: nutrients you have in supplies (matched by product name) first,
      // then the rest. Selection sets batch.nutrient which drives the protocol
      // (Fermaid-O → TOSNA, everything else → SNA).
      var nutSupplies=(APP.supplies||[]).filter(function(s){return s.type==='nutrient'&&parseFloat(s.qty)>0;});
      var stockedProducts={};
      var inStockOptions=nutSupplies.map(function(s){
        var name=String(s.name||'').trim();
        var product=NUTRIENT_PRODUCTS.find(function(p){
          var ln=name.toLowerCase(),lpn=p.name.toLowerCase();
          // Match by full name or by salient keyword
          return ln.indexOf(lpn)!==-1||lpn.indexOf(ln)!==-1||
            (p.id==='mj-mead'&&/mangrove|mead\s*yeast\s*nutrient/i.test(name))||
            (p.id==='fermaid-o'&&/fermaid-?o/i.test(name))||
            (p.id==='fermaid-k'&&/fermaid-?k/i.test(name))||
            (p.id==='vinoferm-nutrivit'&&/nutrivit/i.test(name))||
            (p.id==='vinoferm-nutrisal'&&/nutrisal/i.test(name))||
            (p.id==='goferm'&&/go-?ferm/i.test(name))||
            (p.id==='generic-dap'&&/^dap$|diammonium/i.test(name));
        });
        var value=product?product.id:'other';
        if(product)stockedProducts[product.id]=true;
        var qtyLabel=(parseFloat(s.qty)||0)+' '+(s.unit||'');
        var protocolTag=product?' ['+(product.protocol==='tosna'?'TOSNA':product.protocol==='goferm'?'rehydration':'SNA')+']':'';
        return'<option value="'+escHtml(value)+'">'+escHtml(name)+' ('+qtyLabel+')'+protocolTag+'</option>';
      }).join('');
      var otherOptions=NUTRIENT_PRODUCTS.filter(function(p){return!stockedProducts[p.id];})
        .map(function(p){var tag=' ['+(p.protocol==='tosna'?'TOSNA':p.protocol==='goferm'?'rehydration':'SNA')+']';return'<option value="'+escHtml(p.id)+'"'+(p.id==='mj-mead'&&!inStockOptions?' selected':'')+'>'+escHtml(p.name)+tag+'</option>';}).join('');
      if(inStockOptions){
        return'<optgroup label="🟢 In your supplies">'+inStockOptions+'</optgroup>'
          +'<optgroup label="Other products (not stocked)">'+otherOptions+'</optgroup>';
      }
      return otherOptions;
    }())
    +'</select>'
    +'<div id="nb-nutrient-hint" style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic"></div>'
    +'</div>'
    +'<div class="form-group"><label class="form-label">Nutrient schedule</label><select class="form-select" id="nb-protocol" onchange="onNutrientChange()">'
    +'<option value="auto" selected>Auto — match the nutrient</option>'
    +'<option value="tosca2">TOSCA 2.0 — organic, GoFerm + 24/48/72h + 1/3 break</option>'
    +'<option value="tosna2">TOSNA (classic) — organic, GoFerm + 24/48/72/96h</option>'
    +'<option value="tiosna">TiOSNA — organic, GoFerm + pitch/24/48h + 1/3 break</option>'
    +'<option value="sna">SNA — standard (2 doses, days 1 &amp; 3)</option>'
    +'<option value="sna-high">SNA — high-gravity (3 doses, days 1/3/7)</option>'
    +'</select></div></div>'
    +'<div id="nb-protocol-warn"></div>'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin:14px 0 8px;text-transform:uppercase">Cost Tracking (optional)</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Honey Cost ('+(APP.settings.currency||'€')+')</label><input class="form-input" id="nb-cost-honey" type="number" step="0.01" value="'+initialCost+'" placeholder="e.g. 18.00"></div>'
    +'<div class="form-group"><label class="form-label">Extras Cost ('+(APP.settings.currency||'€')+')</label><input class="form-input" id="nb-cost-extras" type="number" step="0.01" placeholder="fruit, spices, etc."></div></div>'
    +'<div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" id="nb-notes" placeholder="Honey source, intentions, anything worth remembering…"></textarea></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="createBatch()">Create Batch</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  // Deploy pre-fills: when launched from a planned batch, seed the target
  // vessel, brew date, and notes so the brewer just confirms.
  if(opts.fermenterId){var fe=document.getElementById('nb-fermenter');if(fe)fe.value=opts.fermenterId;}
  if(opts.startDate){var de=document.getElementById('nb-date');if(de)de.value=opts.startDate;}
  if(opts.notes){var ne=document.getElementById('nb-notes');if(ne)ne.value=opts.notes;}
  // Deploy from a plan also seeds the chosen yeast / nutrient / honey type.
  if(opts.yeast){var ye=document.getElementById('nb-yeast');if(ye){ye.value=opts.yeast;if(typeof updateYeastCompatibility==='function')updateYeastCompatibility();}}
  if(opts.nutrient){var nu=document.getElementById('nb-nutrient');if(nu){nu.value=opts.nutrient;if(typeof onNutrientChange==='function')onNutrientChange();}}
  if(opts.honeyType){var ht=document.getElementById('nb-honey-type');if(ht)ht.value=opts.honeyType;}
  if(typeof onNutrientChange==='function')onNutrientChange();
  if(typeof updateYeastCompatibility==='function')updateYeastCompatibility();
}

// Read the new-batch form's yeast + recipe + OG fields and render a coloured
// compatibility panel below the yeast dropdown. Severity drives:
//   - the visible banner colour/icon
//   - whether createBatch() will gate behind a confirmation
// The check is non-modal — the user sees feedback as they pick options.
function updateYeastCompatibility(){
  var box=document.getElementById('nb-yeast-check');
  if(!box)return;
  var yeastEl=document.getElementById('nb-yeast');
  var recipeEl=document.getElementById('nb-recipe');
  var ogEl=document.getElementById('nb-og');
  if(!yeastEl||!recipeEl)return;
  var yeastId=yeastEl.value;
  var recipeId=recipeEl.value;
  var recipe=APP.recipes.find(function(r){return r.id===recipeId;});
  if(!recipe){box.innerHTML='';return;}
  // Override recipe's OG/ABV target with the user's chosen OG (so a high-OG
  // pick triggers ABV warnings even if the recipe normally targets less).
  var liveRecipe=Object.assign({},recipe);
  if(ogEl){
    var og=parseFloat(ogEl.value);
    if(og>1){
      liveRecipe.ogTarget=og;
      // Re-derive ABV target if recipe declared a finishing gravity
      if(recipe.fgTarget){
        liveRecipe.abvTarget=parseFloat(((og-recipe.fgTarget)*131.25).toFixed(1));
      }
    }
  }
  var result=evaluateYeastForRecipe(yeastId,liveRecipe);
  // Fructose-stall alert: a high/critical-fructose honey paired
  // with a non-fructophilic yeast stalls at the 1/3 break. Uses the honey's
  // F:G tech data + the strain's fructophilic flag.
  (function(){
    var honeyEl=document.getElementById('nb-honey-type');
    var honey=honeyEl&&HONEY_PROFILES[honeyEl.value];
    var tech=honey&&honey.tech;
    var y=getYeastById(yeastId);
    if(!tech||!y||y.fructophilic)return;
    var rank={recommended:0,good:1,caveat:2,warning:3,danger:4};
    var yn=y.name.split('—')[0].trim();
    if(tech.fructoseRisk==='critical'){
      result.messages.push({tone:'danger',text:honeyEl.value+' is critically fructose-dominant (F:G ~'+(tech.fgRatio||'?')+') and '+yn+' is not fructophilic — it will likely stall at the 1/3 sugar break. Use a fructophilic strain: K1-V1116, Fermentis BC-S103, or UVAFERM 43.'});
      if(rank[result.severity]<rank.danger)result.severity='danger';
    }else if(tech.fructoseRisk==='high'){
      result.messages.push({tone:'caveat',text:honeyEl.value+' is high-fructose (F:G ~'+(tech.fgRatio||'?')+') and '+yn+' isn\'t fructophilic — watch gravity closely near the 1/3 break, or switch to a fructophilic strain to be safe.'});
      if(rank[result.severity]<rank.caveat)result.severity='caveat';
    }
  })();
  var conf={
    recommended:{bg:'rgba(122,160,64,0.15)',border:'var(--green2)',icon:'✓',label:'RECOMMENDED',textColor:'var(--green2)'},
    good:{bg:'rgba(201,163,80,0.10)',border:'var(--gold2)',icon:'•',label:'ACCEPTABLE',textColor:'var(--gold2)'},
    caveat:{bg:'rgba(214,165,67,0.14)',border:'#d6a543',icon:'⚠',label:'CAVEAT',textColor:'#d6a543'},
    warning:{bg:'rgba(218,108,52,0.16)',border:'#da6c34',icon:'⚠',label:'NOT RECOMMENDED',textColor:'#da6c34'},
    danger:{bg:'rgba(200,60,60,0.18)',border:'var(--red2)',icon:'⛔',label:'WILL FAIL',textColor:'var(--red2)'}
  };
  var c=conf[result.severity]||conf.good;
  // Cache the result so createBatch() can read it without re-computing
  window._lastBatchYeastCheck={severity:result.severity,yeastId:yeastId,recipeId:recipeId,messages:result.messages};
  box.innerHTML='<div style="background:'+c.bg+';border:1px solid '+c.border+'66;border-left:3px solid '+c.border+';border-radius:var(--radius);padding:9px 12px;font-size:12.5px;line-height:1.55">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:'+(result.messages.length>1?'6px':'0')+'">'
      +'<span style="color:'+c.textColor+';font-size:14px">'+c.icon+'</span>'
      +'<span style="font-family:var(--font-mono);font-size:10px;color:'+c.textColor+';letter-spacing:1.5px;font-weight:bold">'+c.label+'</span>'
      +'<span style="color:var(--text3);font-family:var(--font-mono);font-size:9.5px;letter-spacing:1px;margin-left:auto">'+escHtml(result.yeast.name.split('—')[0].trim())+' × '+escHtml(recipe.style||recipe.name)+'</span>'
    +'</div>'
    +result.messages.map(function(m){
      var mc=conf[m.tone]||c;
      return '<div style="color:var(--text2);padding:'+(result.messages.length>1?'4px 0':'2px 0')+';'+(result.messages.length>1?'border-top:1px dotted var(--border);':'')+'">'+(result.messages.length>1?'<span style="color:'+mc.textColor+';font-family:var(--font-mono);font-size:9.5px;margin-right:6px">'+(m.tone||'').toUpperCase()+'</span>':'')+escHtml(m.text)+'</div>';
    }).join('')
  +'</div>';
}

// Updates the helper hint below the nutrient dropdown to show the protocol
// description for the currently-selected product. Fires on change AND once on
// modal open so the first selection's hint is populated.
function onNutrientChange(){
  var sel=document.getElementById('nb-nutrient');
  var hint=document.getElementById('nb-nutrient-hint');
  if(!sel||!hint)return;
  var product=getNutrientById(sel.value);
  if(!product)return;
  var protocolName=product.protocol==='tosna'?'TOSNA':(product.protocol==='goferm'?'Rehydration only':'SNA');
  var color=product.protocol==='tosna'?'var(--green2)':(product.protocol==='goferm'?'var(--blue2)':'var(--gold2)');
  hint.innerHTML='<span style="color:'+color+';font-family:var(--font-mono);font-size:10px;letter-spacing:1px">→ '+protocolName+'</span> · '+escHtml(product.notes||'');
  // Dummy-proof compatibility check between the chosen schedule and nutrient.
  var protoSel=document.getElementById('nb-protocol');
  var warnEl=document.getElementById('nb-protocol-warn');
  if(protoSel&&warnEl){
    var chosen=protoSel.value;            // auto | tosca2 | tosna2 | tiosna | sna | sna-high
    var isOrganicProtocol=(chosen==='tosca2'||chosen==='tosna2'||chosen==='tiosna');
    var isOrganic=(product.id==='fermaid-o');
    var w='';
    if(isOrganicProtocol&&!isOrganic){
      w='<div style="margin:4px 0 12px;padding:10px 12px;border-radius:var(--radius);border-left:4px solid var(--red2);background:rgba(176,58,46,0.09);font-size:12px;color:var(--text2);line-height:1.55">'
        +'<strong style="color:var(--red2)">⛔ '+escHtml(product.name)+' isn\'t an organic (TOSCA/TOSNA) nutrient.</strong> These protocols are organic-only — they need <strong>Fermaid-O</strong>. '+(product.id==='mj-mead'?'The MJ/M05 sachet is a pre-blended SNA product; ':(/dap/i.test(product.id)||product.protocol==='sna'?'This product contains DAP; ':''))+'either switch the nutrient to Fermaid-O, or pick an <strong>SNA</strong> schedule above.</div>';
    }else if((chosen==='sna'||chosen==='sna-high')&&isOrganic){
      w='<div style="margin:4px 0 12px;padding:10px 12px;border-radius:var(--radius);border-left:4px solid #e0843c;background:rgba(224,132,60,0.08);font-size:12px;color:var(--text2);line-height:1.55">'
        +'<strong style="color:#e0843c">⚠ Fermaid-O on an SNA schedule.</strong> Fermaid-O is organic and is normally run as <strong>TOSCA 2.0 / TOSNA</strong> (staggered doses to the 1/3 break) for the cleanest result. SNA still works, but consider switching the schedule.</div>';
    }
    warnEl.innerHTML=w;
  }
}

// Convert the open new-batch modal's volume/honey fields between unit systems
// in place (no re-render, so other fields are preserved) and persist the
// preference. Storage stays metric; this is presentation only.
function onBatchUnitChange(sys){
  if(sys!=='metric'&&sys!=='us'&&sys!=='imperial')return;
  var old=currentUnitSystem();
  var volEl=document.getElementById('nb-vol'),honeyEl=document.getElementById('nb-honey');
  if(volEl&&volEl.value!==''){
    var si=parseFloat(volEl.value)*UNIT_VOL[old].toSI;
    volEl.value=(si/UNIT_VOL[sys].toSI).toFixed(sys==='metric'?2:3);
  }
  if(honeyEl&&honeyEl.value!==''){
    var sik=parseFloat(honeyEl.value)*UNIT_WT[old].toSI;
    honeyEl.value=(sik/UNIT_WT[sys].toSI).toFixed(2);
  }
  APP.settings.unitSystem=sys;
  if(typeof saveSettings==='function')saveSettings();
  var vl=document.getElementById('nb-vol-label');if(vl)vl.textContent='Volume ('+UNIT_VOL[sys].label+')';
  var hl=document.getElementById('nb-honey-label');if(hl)hl.textContent='Honey ('+UNIT_WT[sys].label+')';
  ['metric','us','imperial'].forEach(function(s){
    var b=document.getElementById('nb-unit-'+s);if(!b)return;var on=(s===sys);
    b.style.border='1px solid '+(on?'var(--gold)':'var(--border)');
    b.style.background=on?'rgba(201,168,76,0.14)':'var(--bg3)';
    b.style.color=on?'var(--gold2)':'var(--text3)';
  });
}

function updateRecipeFields(){
  var id=document.getElementById('nb-recipe').value;
  var r=APP.recipes.find(function(x){return x.id===id;});
  if(!r)return;
  var us=currentUnitSystem();
  document.getElementById('nb-name').value=r.name+' #'+(APP.batches.length+1);
  // r.volume is metric litres; convert to the displayed unit.
  document.getElementById('nb-vol').value=(r.volume/UNIT_VOL[us].toSI).toFixed(us==='metric'?2:3);
  document.getElementById('nb-og').value=r.ogTarget;
  var honeyKg=((r.ogTarget-1)*1000*r.volume/292);      // metric kg
  document.getElementById('nb-honey').value=(honeyKg/UNIT_WT[us].toSI).toFixed(2);
  if(APP.settings.honeyPricePerKg){
    // Cost is always computed from the metric kg, regardless of display unit.
    document.getElementById('nb-cost-honey').value=(honeyKg*APP.settings.honeyPricePerKg).toFixed(2);
  }
}

function createBatch(){
  var name=document.getElementById('nb-name').value.trim();
  if(!name){toast('⚠ Name required');return;}
  // Compatibility gate — if the live check flagged danger (yeast can't reach the
  // recipe's target ABV, ferment temp out of yeast range, etc.), make the user
  // explicitly confirm. This is the "stop me from ruining a batch" guard rail.
  var check=window._lastBatchYeastCheck;
  if(check&&check.severity==='danger'&&!window._batchDangerOverride){
    var msgList=(check.messages||[]).map(function(m){return'• '+m.text;}).join('\n');
    var ok=confirm('⛔ This yeast/recipe combination will likely fail:\n\n'+msgList+'\n\nContinue anyway? (Tip: pick a different yeast from the dropdown — see the Yeast Library for guidance.)');
    if(!ok)return;
    window._batchDangerOverride=true; // skip prompt on retry within same modal session
  }
  var costHoney=parseFloat(document.getElementById('nb-cost-honey').value)||0;
  var costExtras=parseFloat(document.getElementById('nb-cost-extras').value)||0;
  var fermenterSel=document.getElementById('nb-fermenter');
  var startDate=document.getElementById('nb-date').value||today();
  // Volume/honey are entered in the user's chosen unit — convert back to the
  // metric values MeadOS stores and calculates with everywhere else.
  var volIn=parseFloat(document.getElementById('nb-vol').value);
  var honeyIn=parseFloat(document.getElementById('nb-honey').value);
  var volumeSI=(!isNaN(volIn)?volIn*UNIT_VOL[currentUnitSystem()].toSI:4.5);
  var honeySI=(!isNaN(honeyIn)?honeyIn*UNIT_WT[currentUnitSystem()].toSI:null);
  var protoSel=(document.getElementById('nb-protocol')||{}).value||'auto';
  var b={
    id:genId(),
    // Human-readable batch serial number — YEAR-NNN, sequenced per calendar
    // year of the batch's startDate. Stable from creation, unique even when
    // names collide (e.g. several "Traditional Mead" boxes side by side).
    // The internal id stays the random hex string for technical references;
    // the serial is what you see on labels, in the UI, and in search.
    serial:assignBatchSerial(startDate),
    name:name,
    recipeId:document.getElementById('nb-recipe').value,
    startDate:startDate,
    volume:Math.round(volumeSI*1000)/1000,
    og:parseFloat(document.getElementById('nb-og').value)||1.095,
    honey:honeySI!=null?Math.round(honeySI*1000)/1000:null,
    honeyType:(document.getElementById('nb-honey-type')||{}).value||'Wildflower',
    yeast:(document.getElementById('nb-yeast')||{}).value||'m05',
    nutrient:(document.getElementById('nb-nutrient')||{}).value||'mj-mead',
    // Nutrient schedule the batch follows: 'auto' defers to the nutrient's own
    // protocol; otherwise an explicit tosna2 / sna / sna-high choice.
    nutrientProtocol:(protoSel!=='auto'?protoSel:undefined),
    fermenterId:(fermenterSel&&fermenterSel.value)||defaultFermenterIdForNewBatch(),
    cost:(costHoney||costExtras)?{honey:costHoney,extras:costExtras}:null,
    notes:document.getElementById('nb-notes').value.trim()
  };
  var r=APP.recipes.find(function(x){return x.id===b.recipeId;});
  if(r)b.style=r.style;
  APP.batches.push(b);
  APP.logs[b.id]=[];
  // If this batch was deployed from the brew plan, retire that plan entry now
  // that it's a real, supply-deducting batch.
  if(window._deployingPlanId){
    APP.plannedBatches=(APP.plannedBatches||[]).filter(function(p){return p.id!==window._deployingPlanId;});
    window._deployingPlanId=null;
  }
  // Auto-deduct supplies (honey, yeast, nutrient). Returns array of
  // {supply, amount, unit, before, after, insufficient}. Build a summary
  // line for the toast so the user sees what got debited.
  var deductions=(typeof deductSuppliesForBatch==='function')?deductSuppliesForBatch(b,r):[];
  closeModal();
  scheduleSave();
  if(deductions.length){
    var anyInsufficient=deductions.some(function(d){return d.insufficient;});
    var summary=deductions.map(function(d){
      // Round display amount for readability
      var amt=d.amount;
      var amtStr=(Math.abs(amt-Math.round(amt))<0.01)?String(Math.round(amt)):String(parseFloat(amt.toFixed(2)));
      return amtStr+' '+(d.unit||'')+' '+(d.supply.name||'').replace(/\s*honey\s*$/i,'');
    }).join(' · ');
    toast('✦ Batch created '+(anyInsufficient?'⚠ ':'· ')+'deducted: '+summary,5000);
  }else{
    toast('✦ Batch created');
  }
  showView('batch',b.id);
}

// ==================== RACKING (move batch to different vessel) ====================
// Opens a modal letting the user pick a target vessel and a racking date.
// Saves to b.rackings[] and updates b.fermenterId. The Fermenter Schedule
// then renders the batch as separate segments across the relevant vessels.
function openRackModal(batchId){
  closeModal();
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var currentVessel=getFermenter(b.fermenterId);
  if(!APP.fermenters||APP.fermenters.length<2){
    toast('⚠ Add a second fermenter first');showView('settings');return;
  }
  // Build options excluding current vessel, annotating each with occupancy
  var opts=APP.fermenters.filter(function(f){return f.id!==b.fermenterId;}).map(function(f){
    var occ=fermenterOccupiedBy(f.id);
    var label=f.name+(f.capacity?' ('+f.capacity+'L)':'')+(occ?' — currently has '+occ.name:' — free');
    return'<option value="'+f.id+'"'+(occ?' style="color:#a07060"':'')+'>'+escHtml(label)+'</option>';
  }).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal">'
    +'<div class="modal-title">🔁 RACK '+escHtml(b.name)+' TO NEW VESSEL</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Currently in: <strong style="color:'+(currentVessel&&currentVessel.color||'var(--gold2)')+'">'+escHtml(currentVessel?currentVessel.name:'(unassigned)')+'</strong>. This records the move on the Fermenter Schedule and frees up the current vessel for new batches.</div>'
    +'<div class="form-group"><label class="form-label">Rack To</label><select class="form-select" id="rack-target">'+opts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Racking Date</label><input class="form-input" id="rack-date" type="date" value="'+today()+'"></div>'
    +'<div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" id="rack-notes" placeholder="e.g. left lees behind, added 0.5g K-meta, gravity 1.012"></textarea></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveRack(\''+batchId+'\')">Rack Batch</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveRack(batchId){
  var target=document.getElementById('rack-target').value;
  var date=document.getElementById('rack-date').value||today();
  var notes=document.getElementById('rack-notes').value.trim();
  if(rackBatch(batchId,target,date,notes)){
    closeModal();
    toast('✦ Racked to new vessel');
    renderMain();
  }
}

function openEditBatchModal(id){
  closeModal();
  var b=APP.batches.find(function(x){return x.id===id;});
  if(!b)return;
  var cost=b.cost||{};
  var fermenterOpts=(APP.fermenters||[]).map(function(f){
    return'<option value="'+f.id+'"'+(f.id===b.fermenterId?' selected':'')+'>'+escHtml(f.name+(f.capacity?' ('+f.capacity+'L)':''))+'</option>';
  }).join('');
  var fermenterRow=fermenterOpts?'<div class="form-group"><label class="form-label">Fermenter</label><select class="form-select" id="eb-fermenter">'+fermenterOpts+'</select></div>':'';
  // Honey type — datalist with all known varieties (free-text still allowed
  // for custom additions). Defaults to whatever was stored on the batch.
  var honeyDatalist=(typeof HONEY_TYPES!=='undefined'&&HONEY_TYPES.length)
    ?'<datalist id="eb-honey-types">'+HONEY_TYPES.map(function(h){return'<option value="'+escHtml(h)+'"></option>';}).join('')+'</datalist>':'';
  // Yeast strain — dropdown of known strains plus the raw value (for legacy
  // data that may not match any known id).
  var currentYeast=b.yeast||'m05';
  var yeastOpts='';
  if(typeof YEAST_STRAINS!=='undefined'&&YEAST_STRAINS.length){
    var found=false;
    yeastOpts=YEAST_STRAINS.map(function(y){
      var sel=(y.id===currentYeast);
      if(sel)found=true;
      return'<option value="'+y.id+'"'+(sel?' selected':'')+'>'+escHtml(y.name)+'</option>';
    }).join('');
    if(!found&&currentYeast){
      yeastOpts='<option value="'+escHtml(currentYeast)+'" selected>'+escHtml(currentYeast)+' (custom)</option>'+yeastOpts;
    }
  }
  var yeastRow=yeastOpts?'<div class="form-group"><label class="form-label">Yeast</label><select class="form-select" id="eb-yeast">'+yeastOpts+'</select></div>':'';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">EDIT BATCH</div>'
    +'<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="eb-name" value="'+escHtml(b.name)+'"></div>'
    +fermenterRow
    +'<div class="form-row"><div class="form-group"><label class="form-label">Start Date</label><input class="form-input" id="eb-date" type="date" value="'+b.startDate+'"></div>'
    +'<div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="eb-vol" type="number" step="0.1" value="'+(b.volume||4.5)+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">OG</label><input class="form-input" id="eb-og" type="number" step="0.001" value="'+(b.og||1.095)+'"></div>'
    +'<div class="form-group"><label class="form-label">Honey (kg)</label><input class="form-input" id="eb-honey" type="number" step="0.1" value="'+(b.honey||'')+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Honey Type</label><input class="form-input" id="eb-honey-type" value="'+escHtml(b.honeyType||'')+'" list="eb-honey-types" placeholder="Wildflower, Acacia, Buckwheat…">'+honeyDatalist+'</div>'
    +yeastRow+'</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Honey Cost ('+(APP.settings.currency||'€')+')</label><input class="form-input" id="eb-cost-honey" type="number" step="0.01" value="'+(cost.honey||'')+'"></div>'
    +'<div class="form-group"><label class="form-label">Extras Cost ('+(APP.settings.currency||'€')+')</label><input class="form-input" id="eb-cost-extras" type="number" step="0.01" value="'+(cost.extras||'')+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="eb-notes">'+escHtml(b.notes||'')+'</textarea></div>'
    +'<div class="form-group" style="background:var(--bg);border-left:3px solid var(--gold2);border-radius:var(--radius);padding:12px 14px">'
      +'<label class="form-label">📡 Gravity sensor entity <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">optional · iSpindel / Tilt / RAPT / generic HA sensor</span></label>'
      +'<input class="form-input" id="eb-gravsensor" type="text" placeholder="sensor.ispindel_floor_gravity (leave blank if you measure manually)" value="'+escHtml(b.gravitySensorEntity||'')+'" style="font-family:var(--font-mono);font-size:12px">'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:6px;line-height:1.55;font-style:italic">When set, a 📡 button appears on the gravity-log form to pull the current sensor reading with one tap. You still confirm and save each reading manually — automated logging would create noisy data, so this is just a convenience shortcut. Compatible with iSpindel, Tilt Hydrometer, RAPT Pill, or any HA sensor reporting SG (e.g. 1.045).</div>'
    +'</div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveBatchEdit(\''+id+'\')">Save</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveBatchEdit(id){
  var b=APP.batches.find(function(x){return x.id===id;});
  if(!b)return;
  b.name=document.getElementById('eb-name').value.trim()||b.name;
  b.startDate=document.getElementById('eb-date').value||b.startDate;
  b.volume=parseFloat(document.getElementById('eb-vol').value)||b.volume;
  b.og=parseFloat(document.getElementById('eb-og').value)||b.og;
  b.honey=parseFloat(document.getElementById('eb-honey').value)||null;
  // Honey type — optional free-text/datalist. Empty leaves the field cleared.
  var htEl=document.getElementById('eb-honey-type');
  if(htEl){var ht=htEl.value.trim();b.honeyType=ht||null;}
  // Yeast — read from the strain dropdown if present.
  var yEl=document.getElementById('eb-yeast');
  if(yEl&&yEl.value)b.yeast=yEl.value;
  var fermSel=document.getElementById('eb-fermenter');
  if(fermSel&&fermSel.value)b.fermenterId=fermSel.value;
  var ch=parseFloat(document.getElementById('eb-cost-honey').value)||0;
  var ce=parseFloat(document.getElementById('eb-cost-extras').value)||0;
  b.cost=(ch||ce)?{honey:ch,extras:ce}:null;
  b.notes=document.getElementById('eb-notes').value.trim();
  // Gravity-sensor binding — empty string clears the binding cleanly
  var gsEl=document.getElementById('eb-gravsensor');
  if(gsEl)b.gravitySensorEntity=gsEl.value.trim();
  closeModal();scheduleSave();toast('✦ Updated');renderMain();
}

function addLog(batchId){
  var rawG=parseFloat(document.getElementById('log-gravity').value);
  if(!rawG){toast('⚠ Gravity required');return;}
  var temp=parseFloat(document.getElementById('log-temp').value);
  // Hydrometer temp correction. Most home hydrometers calibrate at 20°C.
  // Standard approximation: correction = (T - 20) × 0.00013 per °C.
  // Apply only when temp is provided and meaningfully different from 20°C.
  var correctedG=rawG;
  var corrApplied=false;
  if(temp!=null&&!isNaN(temp)&&Math.abs(temp-20)>=1){
    correctedG=rawG+(temp-20)*0.00013;
    correctedG=Math.round(correctedG*1000)/1000;
    corrApplied=true;
  }
  // pH is fully optional. Only stored when the user actually enters a value;
  // null is preserved as null so charts and aggregates can ignore it cleanly.
  var phEl=document.getElementById('log-ph');
  var phRaw=phEl?phEl.value.trim():'';
  var ph=phRaw!==''?parseFloat(phRaw):null;
  if(ph!==null&&(isNaN(ph)||ph<2||ph>5))ph=null; // reject obvious garbage
  var entry={
    id:genId(),
    date:document.getElementById('log-date').value||today(),
    gravity:correctedG,
    temp:isNaN(temp)?null:temp,
    ph:ph,
    airlock:document.getElementById('log-airlock').value||'',
    note:document.getElementById('log-note').value.trim()
  };
  if(corrApplied){
    entry.gravityRaw=rawG;
    entry.tempCorrected=true;
  }
  if(!APP.logs[batchId])APP.logs[batchId]=[];
  APP.logs[batchId].push(entry);
  APP.logs[batchId].sort(function(a,b){return a.date.localeCompare(b.date);});
  scheduleSave();
  toast(corrApplied?'✦ Logged (corrected '+rawG.toFixed(3)+' → '+correctedG.toFixed(3)+' @ '+temp+'°C)':'✦ Reading logged');
  renderMain();
}

function deleteLog(batchId,logId){
  if(!confirm('Delete this reading?'))return;
  APP.logs[batchId]=(APP.logs[batchId]||[]).filter(function(l){return l.id!==logId;});
  scheduleSave();toast('Reading deleted');renderMain();
}

function setTastingStars(n){
  document.getElementById('t-rating').value=n;
  for(var i=1;i<=5;i++){
    var s=document.getElementById('t-star-'+i);
    if(s)s.classList.toggle('active',i<=n);
  }
}

function addTasting(batchId){
  var wheel=window._tastingWheel||{};
  var entry={
    id:genId(),
    date:document.getElementById('t-date').value||today(),
    rating:parseInt(document.getElementById('t-rating').value)||0,
    color:document.getElementById('t-color').value.trim(),
    aroma:document.getElementById('t-aroma').value.trim(),
    flavor:document.getElementById('t-flavor').value.trim(),
    finish:document.getElementById('t-finish').value.trim(),
    wheel:wheel,
    bjcp:(typeof readBJCPScore==='function')?readBJCPScore():null,
    note:document.getElementById('t-note').value.trim()
  };
  var hasWheel=Object.values(wheel).some(function(v){return v>0;});
  if(!entry.color&&!entry.aroma&&!entry.flavor&&!entry.finish&&!entry.note&&!entry.rating&&!hasWheel&&!entry.bjcp){toast('⚠ Add at least one note or rating');return;}
  if(!APP.tastings[batchId])APP.tastings[batchId]=[];
  APP.tastings[batchId].push(entry);
  APP.tastings[batchId].sort(function(a,b){return a.date.localeCompare(b.date);});
  window._tastingWheel={};  // reset for next entry
  scheduleSave();toast('✦ Tasting saved');renderMain();
}

function deleteTasting(batchId,id){
  if(!confirm('Delete this tasting note?'))return;
  APP.tastings[batchId]=(APP.tastings[batchId]||[]).filter(function(t){return t.id!==id;});
  scheduleSave();toast('Deleted');renderMain();
}

// ==================== PHOTO JOURNAL ====================
// Per-batch photo gallery. Images are resized client-side then uploaded to
// /api/asset (stored as files under labels/); only the /labels/<hash> URL and
// metadata ride the state blob. Stages let you tell brew-day from bottling.
var PHOTO_STAGES=[
  {key:'brew',label:'Brew Day',color:'#c9a84c'},
  {key:'ferment',label:'Fermentation',color:'#7aa850'},
  {key:'racking',label:'Racking',color:'#7aa8c0'},
  {key:'bottling',label:'Bottling',color:'#a87aa0'},
  {key:'tasting',label:'Tasting',color:'#c04858'},
  {key:'other',label:'Other',color:'#8a8a8a'}
];
function photoStage(key){return PHOTO_STAGES.find(function(s){return s.key===key;})||PHOTO_STAGES[PHOTO_STAGES.length-1];}

function renderBatchPhotos(b){
  var photos=(APP.photos[b.id]||[]).slice().sort(function(a,c){return(c.date||c.addedAt||'').localeCompare(a.date||a.addedAt||'');});
  var addBtn='<button class="btn btn-primary btn-sm" onclick="addBatchPhoto(\''+b.id+'\')">📷 Add Photo</button>';
  var head='<div class="card-header" style="display:flex;justify-content:space-between;align-items:center"><div class="card-title">📷 PHOTO JOURNAL</div>'+addBtn+'</div>';
  if(!photos.length){
    return'<div class="card">'+head
      +'<div style="text-align:center;padding:30px 16px;color:var(--text3)"><div style="font-size:32px;margin-bottom:8px">📷</div>'
      +'<div style="font-size:13px;font-style:italic;line-height:1.5">No photos yet. Capture brew day, the fermentation, racking, or the finished bottles —<br>a visual diary of this batch\'s life.</div></div></div>';
  }
  var grid=photos.map(function(p){
    var st=photoStage(p.stage);
    var src=(typeof getResolvedMediaUrl==='function'&&getResolvedMediaUrl(p.url))||p.url;
    return'<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg3)">'
      +'<div style="position:relative;aspect-ratio:4/3;background:var(--bg);cursor:pointer;overflow:hidden" onclick="openPhotoLightbox(\''+b.id+'\',\''+p.id+'\')">'
      +'<img src="'+escHtml(src)+'" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" alt="'+escHtml(p.caption||st.label)+'">'
      +'<span style="position:absolute;top:6px;left:6px;font-family:var(--font-mono);font-size:9px;letter-spacing:1px;padding:2px 7px;border-radius:8px;background:'+st.color+'cc;color:#0f0f0a">'+st.label.toUpperCase()+'</span></div>'
      +'<div style="padding:8px 10px">'
      +'<div style="font-size:12.5px;color:var(--text2);line-height:1.4;min-height:18px">'+escHtml(p.caption||'')+'</div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px"><span style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">'+fmtDate(p.date||p.addedAt)+'</span>'
      +'<button class="btn-icon" style="font-size:12px" onclick="deleteBatchPhoto(\''+b.id+'\',\''+p.id+'\')" title="Delete photo">🗑</button></div>'
      +'</div></div>';
  }).join('');
  return'<div class="card">'+head
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-top:8px">'+grid+'</div></div>';
}

function addBatchPhoto(batchId){
  var input=document.createElement('input');
  input.type='file';input.accept='image/*';
  input.onchange=function(){
    var file=input.files&&input.files[0];
    if(!file)return;
    toast('⏳ Processing photo…');
    readImageAsDataUrl(file,{maxDim:1400},function(err,dataUrl){
      if(err){toast('⚠ '+err.message);return;}
      storeImageAsset(dataUrl,'photos').then(function(url){
        openPhotoMetaModal(batchId,url);
      });
    });
  };
  input.click();
}

// After upload, collect caption + stage + date before committing the entry.
function openPhotoMetaModal(batchId,url){
  closeModal();
  var src=(typeof getResolvedMediaUrl==='function'&&getResolvedMediaUrl(url))||url;
  var stageOpts=PHOTO_STAGES.map(function(s){return'<option value="'+s.key+'">'+s.label+'</option>';}).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal">'
    +'<div class="modal-title">📷 ADD PHOTO</div>'
    +'<div style="text-align:center;margin-bottom:14px"><img src="'+escHtml(src)+'" style="max-width:100%;max-height:240px;border-radius:var(--radius);border:1px solid var(--border)"></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Stage</label><select class="form-select" id="ph-stage">'+stageOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Date</label><input class="form-input" id="ph-date" type="date" value="'+today()+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Caption (optional)</label><input class="form-input" id="ph-caption" placeholder="e.g. vigorous krausen on day 3"></div>'
    +'<input type="hidden" id="ph-url" value="'+escHtml(url)+'">'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="savePhoto(\''+batchId+'\')">Save Photo</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function savePhoto(batchId){
  var url=document.getElementById('ph-url').value;
  if(!url){toast('⚠ No image');return;}
  var entry={
    id:genId(),
    url:url,
    stage:document.getElementById('ph-stage').value,
    date:document.getElementById('ph-date').value||today(),
    caption:document.getElementById('ph-caption').value.trim(),
    addedAt:new Date().toISOString()
  };
  if(!APP.photos[batchId])APP.photos[batchId]=[];
  APP.photos[batchId].push(entry);
  closeModal();scheduleSave();toast('✦ Photo added');renderMain();
}

function deleteBatchPhoto(batchId,photoId){
  if(!confirm('Delete this photo? This removes it from the journal and deletes the image file.'))return;
  var photo=(APP.photos[batchId]||[]).find(function(p){return p.id===photoId;});
  var url=photo&&photo.url;
  APP.photos[batchId]=(APP.photos[batchId]||[]).filter(function(p){return p.id!==photoId;});
  if(!APP.photos[batchId].length)delete APP.photos[batchId];
  scheduleSave();
  // Remove the underlying file now that the reference is gone (if unused).
  if(typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(url);
  toast('Deleted');renderMain();
}

// Full-screen lightbox with prev/next across the batch's photos.
function openPhotoLightbox(batchId,photoId){
  var photos=(APP.photos[batchId]||[]).slice().sort(function(a,c){return(c.date||c.addedAt||'').localeCompare(a.date||a.addedAt||'');});
  var idx=photos.findIndex(function(p){return p.id===photoId;});
  if(idx<0)return;
  window._lightbox={batchId:batchId,ids:photos.map(function(p){return p.id;}),idx:idx};
  renderPhotoLightbox();
}
function renderPhotoLightbox(){
  var lb=window._lightbox;if(!lb)return;
  var existing=document.getElementById('photo-lightbox');if(existing)existing.remove();
  var photos=APP.photos[lb.batchId]||[];
  var p=photos.find(function(x){return x.id===lb.ids[lb.idx];});
  if(!p)return;
  var st=photoStage(p.stage);
  var src=(typeof getResolvedMediaUrl==='function'&&getResolvedMediaUrl(p.url))||p.url;
  var multi=lb.ids.length>1;
  var html='<div id="photo-lightbox" class="modal-overlay" style="z-index:9999;background:rgba(8,8,6,0.94)" onclick="if(event.target===this)closePhotoLightbox()">'
    +'<div style="max-width:92vw;max-height:92vh;display:flex;flex-direction:column;align-items:center;gap:10px">'
    +'<img src="'+escHtml(src)+'" style="max-width:92vw;max-height:78vh;object-fit:contain;border-radius:6px;box-shadow:0 8px 40px rgba(0,0,0,0.6)">'
    +'<div style="text-align:center;color:var(--text2)">'
    +'<span style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;padding:2px 8px;border-radius:8px;background:'+st.color+';color:#0f0f0a">'+st.label.toUpperCase()+'</span>'
    +(p.caption?'<div style="font-size:14px;margin-top:8px">'+escHtml(p.caption)+'</div>':'')
    +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-top:4px">'+fmtDate(p.date||p.addedAt)+(multi?' · '+(lb.idx+1)+'/'+lb.ids.length:'')+'</div></div>'
    +(multi?'<div style="display:flex;gap:10px;margin-top:4px"><button class="btn btn-secondary" onclick="event.stopPropagation();navPhotoLightbox(-1)">← Prev</button><button class="btn btn-secondary" onclick="event.stopPropagation();navPhotoLightbox(1)">Next →</button></div>':'')
    +'<button class="btn btn-secondary btn-sm" onclick="closePhotoLightbox()" style="margin-top:2px">Close</button>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
function navPhotoLightbox(delta){
  var lb=window._lightbox;if(!lb)return;
  lb.idx=(lb.idx+delta+lb.ids.length)%lb.ids.length;
  renderPhotoLightbox();
}
function closePhotoLightbox(){
  var el=document.getElementById('photo-lightbox');if(el)el.remove();
  window._lightbox=null;
}

function updateBottlingTotalDisplay(){
  var el=document.getElementById('bt-total-display');
  if(!el)return;
  var c500=parseInt((document.getElementById('bt-count-500')||{}).value)||0;
  var c750=parseInt((document.getElementById('bt-count-750')||{}).value)||0;
  var customSize=parseInt((document.getElementById('bt-count-custom-size')||{}).value)||0;
  var customQty=parseInt((document.getElementById('bt-count-custom-qty')||{}).value)||0;
  var totalBottles=c500+c750+(customSize>0?customQty:0);
  var totalMl=c500*500+c750*750+(customSize>0?customQty*customSize:0);
  if(totalBottles===0){
    el.innerHTML='<span style="color:var(--text3)">Enter bottle counts above to see total volume.</span>';
    return;
  }
  var parts=[];
  if(c500>0)parts.push(c500+'×500ml');
  if(c750>0)parts.push(c750+'×750ml');
  if(customSize>0&&customQty>0)parts.push(customQty+'×'+customSize+'ml');
  el.innerHTML='<span style="color:var(--gold2)">TOTAL: '+totalBottles+' bottle'+(totalBottles!==1?'s':'')+' · '+(totalMl/1000).toFixed(2)+' L</span> &nbsp; <span style="color:var(--text3);font-size:11px">('+parts.join(' + ')+')</span>';
}

function saveBottling(batchId){
  var count500=parseInt(document.getElementById('bt-count-500').value)||0;
  var count750=parseInt(document.getElementById('bt-count-750').value)||0;
  var customSize=parseInt((document.getElementById('bt-count-custom-size')||{}).value)||0;
  var customCount=parseInt((document.getElementById('bt-count-custom-qty')||{}).value)||0;
  var countsAtBottling={};
  if(count500>0)countsAtBottling[500]=count500;
  if(count750>0)countsAtBottling[750]=count750;
  if(customSize>0&&customCount>0)countsAtBottling[customSize]=customCount;
  var total=Object.keys(countsAtBottling).reduce(function(s,k){return s+countsAtBottling[k];},0);
  if(total===0){toast('⚠ Enter at least one bottle count (500ml or 750ml)');return;}
  var existing=APP.bottling[batchId];
  var existingTotal=existing?totalBottles(existing):0;
  // Build new locations map
  var locations={cellar:{},fridge:{},gifted:{},other:{}};
  if(existing&&existing.locations&&existingTotal>0){
    // Editing meaningful existing inventory — preserve splits, rebalance delta per size
    Object.assign(locations,{
      cellar:Object.assign({},_coerceLocations(existing.locations.cellar)),
      fridge:Object.assign({},_coerceLocations(existing.locations.fridge)),
      gifted:Object.assign({},_coerceLocations(existing.locations.gifted)),
      other:Object.assign({},_coerceLocations(existing.locations.other))
    });
    // For each size, rebalance: delta goes to/from cellar
    Object.keys(countsAtBottling).forEach(function(size){
      var sz=parseInt(size);
      var newCount=countsAtBottling[size];
      var oldCount=Object.keys(locations).reduce(function(s,loc){return s+(locations[loc][sz]||0);},0);
      var delta=newCount-oldCount;
      if(delta>0)locations.cellar[sz]=(locations.cellar[sz]||0)+delta;
      else if(delta<0){
        var toRemove=-delta;
        ['cellar','fridge','other','gifted'].forEach(function(loc){
          if(toRemove<=0)return;
          var avail=locations[loc][sz]||0;
          var take=Math.min(toRemove,avail);
          locations[loc][sz]=avail-take;
          if(locations[loc][sz]<=0)delete locations[loc][sz];
          toRemove-=take;
        });
      }
    });
    // Remove sizes that aren't in the new count map at all (probably user removed them entirely)
    ['cellar','fridge','gifted','other'].forEach(function(loc){
      Object.keys(locations[loc]).forEach(function(sz){
        if(!countsAtBottling[sz]&&locations[loc][sz]>0){
          // size removed entirely from bottling — clear from all locations
          delete locations[loc][sz];
        }
      });
    });
  }else{
    // Fresh bottling — all bottles go to cellar
    Object.keys(countsAtBottling).forEach(function(size){
      locations.cellar[parseInt(size)]=countsAtBottling[size];
    });
  }
  APP.bottling[batchId]={
    date:document.getElementById('bt-date').value||today(),
    bottleCount:total,                       // IMMUTABLE total — legacy field
    bottlesAtBottling:total,                 // explicit as-bottled snapshot
    countsAtBottling:countsAtBottling,       // per-size immutable map
    bottleSizes:Object.keys(countsAtBottling).map(function(s){return parseInt(s);}).sort(function(a,b){return a-b;}),
    locations:locations,
    fg:parseFloat(document.getElementById('bt-fg').value)||null,
    abv:parseFloat(document.getElementById('bt-abv').value)||null,
    sweetness:document.getElementById('bt-sweet').value,
    notes:document.getElementById('bt-notes').value.trim(),
    closure:((document.getElementById('bt-closure')||{}).value)||(existing&&existing.closure)||'crown',
    // Bottling auto-places everything in the cellar, so the cellar IS filled —
    // mark it so a later drink-to-zero reads as "Finished", not "needs fill".
    cellarFilled:true,
    // Preserve gifts log from existing
    gifts:(existing&&existing.gifts)||[]
  };
  // Deduct bottles + closures from tracked supplies — but ONLY on the first
  // (fresh) bottling, so editing an existing record doesn't double-deduct.
  // (The guided workflow has its own deduction path.)
  if((!existing||existingTotal===0)&&typeof consumePackagingSupplies==='function'){
    var pkg=consumePackagingSupplies(countsAtBottling,total,APP.bottling[batchId].closure);
    APP.bottling[batchId].packaging=pkg;
    if(pkg&&pkg.items&&pkg.items.length){
      var deducted=pkg.items.filter(function(i){return i.tracked;}).map(function(i){return i.qty+' '+i.label;});
      if(deducted.length)toast('📦 Deducted: '+deducted.join(' · '),4000);
    }
  }
  scheduleSave();
  try{console.log('[MeadOS] saveBottling — total',total,'counts',countsAtBottling,'locations',JSON.parse(JSON.stringify(locations)));}catch(e){}
  toast('✦ '+total+' bottle'+(total!==1?'s':'')+' bottled · cellar populated');
  showView('cellar');
}

function clearBottling(batchId){
  if(!confirm('Clear bottling record? Batch will return to active.'))return;
  delete APP.bottling[batchId];
  scheduleSave();toast('Bottling cleared');renderMain();
}

function deleteBatch(id){
  var b=APP.batches.find(function(x){return x.id===id;});
  if(!b)return;
  if(!confirm('Permanently delete "'+b.name+'" and all associated logs, tastings, and bottling data?'))return;
  APP.batches=APP.batches.filter(function(x){return x.id!==id;});
  delete APP.logs[id];delete APP.tastings[id];delete APP.bottling[id];
  scheduleSave();toast('Batch deleted');showView('batches');
}

// ==================== FAILURE POSTMORTEM ====================
// When a batch goes wrong — contamination, irrecoverable stuck ferment,
// off-flavors, accident, planned-experiment-that-flopped — recording a
// postmortem preserves the lesson without losing the data. Unlike Delete,
// the batch stays in the database, just flagged as failed. Useful because:
//   - Year-end stats are honest (you brewed 30, dumped 4)
//   - Pattern-mining shows what failed batches share (counterpart to the
//     "best batches share" insights view)
//   - Future-you doesn't repeat the same mistake from forgetting

// Categories chosen for mead specifically — bacteria/wild yeast contamination
// is the #1 cause; oxidation and stuck-beyond-rescue are next.
var FAILURE_CATEGORIES=[
  {id:'contamination',label:'Contamination (bacteria / wild yeast)',icon:'🦠'},
  {id:'stuck',label:'Stuck ferment beyond rescue',icon:'⏸'},
  {id:'off-flavor',label:'Off-flavors / autolysis',icon:'🙊'},
  {id:'oxidation',label:'Oxidation / acetification',icon:'🍶'},
  {id:'accident',label:'Accident (spill, breakage, mishap)',icon:'💥'},
  {id:'process',label:'Process error (wrong yeast, miscalc, etc.)',icon:'🧪'},
  {id:'experiment',label:'Planned experiment that didn\'t work',icon:'🔬'},
  {id:'other',label:'Other',icon:'❓'}
];

function openFailureModal(batchId){
  closeModal();
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var f=b.failed||{};
  var isEdit=!!b.failed;
  var catChips=FAILURE_CATEGORIES.map(function(c){
    var isSel=f.category===c.id;
    return'<span onclick="document.querySelectorAll(\'.fail-cat-chip\').forEach(function(el){el.classList.remove(\'sel\');el.style.background=\'var(--bg)\';el.style.color=\'var(--text2)\';el.style.borderColor=\'var(--border)\'});this.classList.add(\'sel\');this.style.background=\'rgba(232,196,106,0.15)\';this.style.color=\'var(--gold2)\';this.style.borderColor=\'var(--gold)\';document.getElementById(\'fail-cat\').value=\''+c.id+'\'" class="fail-cat-chip'+(isSel?' sel':'')+'" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;background:'+(isSel?'rgba(232,196,106,0.15)':'var(--bg)')+';border:1px solid '+(isSel?'var(--gold)':'var(--border)')+';color:'+(isSel?'var(--gold2)':'var(--text2)')+';padding:5px 11px;border-radius:14px;margin:3px 4px 3px 0;transition:all 0.15s">'+c.icon+' '+escHtml(c.label)+'</span>';
  }).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:680px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">⚰ '+(isEdit?'EDIT POSTMORTEM':'MARK BATCH AS FAILED')+'</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.6">Recording a postmortem preserves the lesson — far better than just deleting the batch. The batch stays in your database (so year-end stats are honest) but is marked failed: it stops appearing on aging timelines and fermenter schedules, but contributes to "what your failed batches share" analysis. You can unfail it later if you change your mind.</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'
    +'<div style="background:var(--bg);padding:12px;border-radius:var(--radius);margin-bottom:14px;border-left:3px solid var(--gold)">'
      +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(b.name)+(b.serial?' <span style="font-family:var(--font-mono);font-size:11px;color:var(--text3)">#'+escHtml(b.serial)+'</span>':'')+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:4px">Started '+fmtDate(b.startDate)+' · OG '+(b.og||'?')+' · '+(b.honeyType||'?')+'</div>'
    +'</div>'
    +'<div class="form-group"><label class="form-label">Date of failure</label><input class="form-input" type="date" id="fail-date" value="'+(f.date||today())+'"></div>'
    +'<div class="form-group"><label class="form-label">Failure category</label><div style="line-height:2.2">'+catChips+'</div><input type="hidden" id="fail-cat" value="'+escHtml(f.category||'')+'"></div>'
    +'<div class="form-group"><label class="form-label">What went wrong?</label><textarea class="form-textarea" id="fail-what" placeholder="Be specific: aromas, gravity readings, timeline, anything visual. Future-you will thank present-you for the detail." style="min-height:100px">'+escHtml(f.whatWentWrong||'')+'</textarea></div>'
    +'<div class="form-group"><label class="form-label">What would you do differently next time?</label><textarea class="form-textarea" id="fail-next" placeholder="Concrete corrective action. e.g. \'Pitch yeast at 22°C not 28°C\', \'Use Chemipro SAN with 2min contact time, not just rinse\'" style="min-height:80px">'+escHtml(f.whatToTryNext||'')+'</textarea></div>'
    +'<div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text2)"><input type="checkbox" id="fail-saved" '+(f.wasSaved?'checked':'')+' style="width:16px;height:16px;cursor:pointer;accent-color:var(--gold2)"> The mead was salvaged (bottled as cooking mead, vinegar, etc.) rather than dumped</label></div>'
    +'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px">'
      +'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
      +'<button class="btn btn-primary" onclick="saveFailurePostmortem(\''+batchId+'\')">'+(isEdit?'Save Postmortem':'Mark Failed & Save')+'</button>'
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveFailurePostmortem(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return;
  var cat=document.getElementById('fail-cat').value;
  var what=document.getElementById('fail-what').value.trim();
  if(!cat){toast('⚠ Pick a failure category');return;}
  if(!what){toast('⚠ Describe what went wrong');return;}
  b.failed={
    date:document.getElementById('fail-date').value||today(),
    category:cat,
    whatWentWrong:what,
    whatToTryNext:document.getElementById('fail-next').value.trim(),
    wasSaved:document.getElementById('fail-saved').checked,
    markedAt:Date.now()
  };
  scheduleSave();
  closeModal();
  toast('⚰ Marked as failed — postmortem saved');
  renderMain();
}

function unmarkBatchFailed(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b||!b.failed)return;
  if(!confirm('Restore "'+b.name+'" to its previous active state? The postmortem notes will be deleted.'))return;
  delete b.failed;
  scheduleSave();
  toast('Batch restored');
  renderMain();
}

// Prominent banner shown at the top of the batch detail view when failed.
function renderFailureBanner(b){
  if(!b||!b.failed)return'';
  var f=b.failed;
  var cat=FAILURE_CATEGORIES.find(function(c){return c.id===f.category;})||{label:f.category||'Unknown',icon:'⚰'};
  return'<div style="background:rgba(180,40,40,0.10);border-left:4px solid var(--red2);border-radius:var(--radius);padding:14px 18px;margin:12px 0">'
    +'<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
      +'<div style="font-family:var(--font-display);font-size:16px;color:var(--red2)">'+cat.icon+' Failed batch — '+escHtml(cat.label)+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+(f.date?fmtDate(f.date):'')+(f.wasSaved?' · SALVAGED':' · DUMPED')+'</div>'
    +'</div>'
    +(f.whatWentWrong?'<div style="font-size:12.5px;color:var(--text2);line-height:1.6;margin-bottom:6px"><strong style="color:var(--red2);font-family:var(--font-mono);font-size:10px;letter-spacing:1px;text-transform:uppercase">What went wrong</strong><br>'+escHtml(f.whatWentWrong)+'</div>':'')
    +(f.whatToTryNext?'<div style="font-size:12.5px;color:var(--text2);line-height:1.6"><strong style="color:var(--gold2);font-family:var(--font-mono);font-size:10px;letter-spacing:1px;text-transform:uppercase">What to try next time</strong><br>'+escHtml(f.whatToTryNext)+'</div>':'')
    +'</div>';
}

// ==================== SETTINGS ACTIONS ====================
function saveHASettings(){
  function normUrl(v){
    v=(v||'').trim().replace(/\/+$/,'');
    if(v&&!/^https?:\/\//i.test(v))v='http://'+v;
    return v;
  }
  var urlEl=document.getElementById('set-url');
  if(urlEl)APP.settings.haUrl=normUrl(urlEl.value);
  var extUrlEl=document.getElementById('set-url-external');
  if(extUrlEl)APP.settings.haUrlExternal=normUrl(extUrlEl.value);
  // The token is write-only: only a freshly-typed value is sent to the server;
  // a blank field keeps whatever token is already stored there.
  var tokEl=document.getElementById('set-token');
  var typedToken=tokEl?tokEl.value.trim():'';
  var brewerEl=document.getElementById('set-brewer');
  if(brewerEl)APP.settings.brewerName=brewerEl.value.trim();
  var extEl=document.getElementById('set-external-url');
  if(extEl)APP.settings.externalUrl=extEl.value.trim().replace(/\/+$/,'');
  var usehaEl=document.getElementById('set-useha');
  if(usehaEl)APP.settings.useHA=usehaEl.checked;
  var pubEl=document.getElementById('set-publish-summary');
  if(pubEl)APP.settings.haPublishSummary=pubEl.checked;
  var tempEl=document.getElementById('set-temp');
  if(tempEl)APP.settings.tempSensorEntity=tempEl.value.trim();
  var cellarTempEl=document.getElementById('set-cellar-temp');
  if(cellarTempEl)APP.settings.cellarTempSensorEntity=cellarTempEl.value.trim();
  var notifyEl=document.getElementById('set-notify');
  if(notifyEl)APP.settings.notificationService=notifyEl.value.trim();
  var notifEnEl=document.getElementById('set-notif-enabled');
  if(notifEnEl)APP.settings.notificationsEnabled=notifEnEl.checked;
  var sachetEl=document.getElementById('set-sachet');
  if(sachetEl)APP.settings.sachetSize=parseFloat(sachetEl.value)||6;
  var hpEl=document.getElementById('set-honey-price');
  if(hpEl)APP.settings.honeyPricePerKg=parseFloat(hpEl.value)||0;
  var ccyEl=document.getElementById('set-currency');
  if(ccyEl)APP.settings.currency=ccyEl.value;
  saveSettings();
  scheduleSave(); // brewer name rides the shared blob — sync it too
  // Push the HA connection to the server: URLs + (only if typed) the token.
  // The token is stored server-side and proxied — never in the synced blob.
  var cfg={url:APP.settings.haUrl,urlExternal:APP.settings.haUrlExternal};
  if(typedToken)cfg.token=typedToken;
  fetch('/api/ha-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)})
    .then(function(r){return r.json();})
    .then(function(j){
      APP._haTokenSet=!!(j&&j.hasToken);
      APP._haTokenExp=(j&&j.tokenExp)||null;
      if(tokEl)tokEl.value='';  // clear the field; status now reads "stored"
      toast('Settings saved');
      startTempPolling();
      if(haConfigured())testConnection();
    })
    .catch(function(){toast('Settings saved — but HA config sync failed');});
}

// Clear the server-side HA token (e.g. on rotation or disconnect).
function clearHAToken(){
  if(!confirm('Remove the stored Home Assistant token from the server?'))return;
  fetch('/api/ha-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clearToken:true})})
    .then(function(r){return r.json();})
    .then(function(j){
      APP._haTokenSet=!!(j&&j.hasToken);
      APP._haTokenExp=(j&&j.tokenExp)||null;
      toast('HA token cleared');
      if(typeof showView==='function')showView('settings');
    })
    .catch(function(){toast('Could not clear token');});
}

// Auto-save handler for the Costs & Supplies card. Wired to each input's
// onchange. Doesn't touch HA-connection state — just persists locally and
// schedules a background sync.
function saveCostsSettings(){
  var hpEl=document.getElementById('set-honey-price');
  if(hpEl)APP.settings.honeyPricePerKg=parseFloat(hpEl.value)||0;
  var ccyEl=document.getElementById('set-currency');
  if(ccyEl)APP.settings.currency=ccyEl.value;
  var sachetEl=document.getElementById('set-sachet');
  if(sachetEl)APP.settings.sachetSize=parseFloat(sachetEl.value)||12;
  var deductEl=document.getElementById('set-auto-deduct');
  if(deductEl)APP.settings.autoDeductSupplies=deductEl.checked;
  var sanEl=document.getElementById('set-sanitizer');
  if(sanEl&&SANITIZERS[sanEl.value])APP.settings.sanitizer=sanEl.value;
  saveSettings();
  toast('✓ Saved');
}

function forceSyncNow_button(){
  // Thin wrapper kept for backward compatibility with onclick handlers that
  // may have referenced this name; delegates to the canonical forceSyncNow.
  return forceSyncNow();
}

async function testConnection(){
  var status=document.getElementById('ha-conn-status')||document.getElementById('conn-status');
  if(status)status.innerHTML='<span style="color:var(--text2)">⟳ Testing…</span>';
  var r=await haTestConnection();
  if(!status)return;
  // Per-URL results already carry their own ✓/✗ markers — only prepend one
  // for single-sentence messages (e.g. "No Home Assistant URL").
  var prefix=(r.msg.charAt(0)==='✓'||r.msg.charAt(0)==='✗')?'':(r.ok?'✓ ':'✗ ');
  status.innerHTML='<span style="color:'+(r.ok?'var(--green2)':'var(--red2)')+'">'+prefix+r.msg+'</span>';
}

async function pullFromServer(){
  if(APP.batches.length>0||Object.keys(APP.bottling||{}).length>0){
    if(!confirm('Reload data from the server?\n\nThis will REPLACE all current local data with whatever is stored in the server database. Local changes that haven\'t synced will be lost.\n\nContinue?'))return;
  }
  toast('⟳ Loading from server…');
  await loadData();
  if(typeof rebuildRecipes==='function')rebuildRecipes();
  renderMain();
  toast('✓ '+APP.batches.length+' batch'+(APP.batches.length!==1?'es':'')+' loaded');
}
var pullFromHA=pullFromServer; // legacy name

// Scan the server for orphaned uploaded images (not referenced by any batch,
// recipe, or restorable snapshot) and offer to delete them.
async function scanOrphanImages(){
  var el=document.getElementById('orphan-result');
  if(el)el.innerHTML='Scanning…';
  try{
    var res=await apiFetch('/api/assets/orphans');
    var j=res&&res.ok?await res.json():null;
    if(!j||!j.ok){if(el)el.innerHTML='<span style="color:var(--red2)">Scan failed.</span>';return;}
    var n=(j.orphans||[]).length;
    if(!n){if(el)el.innerHTML='<span style="color:var(--green2)">✓ No unused images — everything on disk is in use.</span>';return;}
    window._orphanNames=j.orphans.map(function(o){return o.name;});
    if(el)el.innerHTML='<div style="margin-bottom:10px"><strong style="color:var(--gold2)">'+n+'</strong> unused image'+(n===1?'':'s')+' · '+fmtBytes(j.totalBytes||0)+' reclaimable.</div>'
      +'<button class="btn btn-danger btn-sm" onclick="deleteOrphanImages()">🗑 Delete '+n+' unused image'+(n===1?'':'s')+'</button>';
  }catch(e){if(el)el.innerHTML='<span style="color:var(--red2)">Scan failed.</span>';}
}
async function deleteOrphanImages(){
  if(!window._orphanNames||!window._orphanNames.length)return;
  if(!confirm('Permanently delete '+window._orphanNames.length+' unused image file'+(window._orphanNames.length===1?'':'s')+' from the server? Images still referenced anywhere (including version history) are kept automatically.'))return;
  var el=document.getElementById('orphan-result');
  if(el)el.innerHTML='Deleting…';
  try{
    var res=await apiFetch('/api/assets/cleanup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:window._orphanNames})});
    var j=res&&res.ok?await res.json():null;
    if(j&&j.ok){
      window._orphanNames=null;
      if(el)el.innerHTML='<span style="color:var(--green2)">✓ Deleted '+j.deleted+' image'+(j.deleted===1?'':'s')+' · freed '+fmtBytes(j.freedBytes||0)+'.</span>';
    }else if(res&&res.status===403){
      if(el)el.innerHTML='<span style="color:var(--red2)">Cleanup is only allowed from inside your LAN.</span>';
    }else{
      if(el)el.innerHTML='<span style="color:var(--red2)">Cleanup failed.</span>';
    }
  }catch(e){if(el)el.innerHTML='<span style="color:var(--red2)">Cleanup failed.</span>';}
}

function exportData(){
  // Full snapshot — every persisted bucket. Versioned with CURRENT_SCHEMA_VERSION
  // so older exports can be migrated on import. Anything in packageState should
  // also be exportable here.
  var data={
    exportedAt:new Date().toISOString(),
    dataVersion:(typeof CURRENT_SCHEMA_VERSION!=='undefined'?CURRENT_SCHEMA_VERSION:8),
    settings:APP.settings,
    batches:APP.batches,
    logs:APP.logs,
    additions:APP.additions||{},
    tasksDone:APP.tasksDone,
    tastings:APP.tastings,
    bottling:APP.bottling,
    supplies:APP.supplies,
    customRecipes:APP.customRecipes||[],
    fermenters:APP.fermenters||[],
    suppliers:APP.suppliers||[],
    cabinets:APP.cabinets||[],
    templates:APP.templates||[],
    celebrated:APP.celebrated||{},
    tempAnomalies:APP.tempAnomalies||[],
    notifiedTasks:APP.notifiedTasks||{}
  };
  var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='meadows-backup-'+today()+'.json';a.click();
  URL.revokeObjectURL(url);
  toast('✦ Backup exported');
}

function importData(event){
  var file=event.target.files[0];
  if(!file)return;
  if(!confirm('Replace ALL current data with imported backup? Cannot be undone.'))return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var d=JSON.parse(e.target.result);
      // Run migrations on the imported payload so older backups (v1-v5) come
      // up to the current shape before we apply them. migrateData mutates in
      // place and stamps dataVersion.
      if(typeof migrateData==='function'){
        var report=migrateData(d);
        d=report.result;
      }
      // Apply EVERY bucket. Use applyState if available so cross-field
      // normalization (bottle location shape, fermenter assignment, etc) runs;
      // otherwise fall back to direct assignment.
      if(typeof applyState==='function'){
        applyState(d);
      }else{
        if(d.settings)APP.settings=Object.assign(APP.settings,d.settings);
        APP.batches=d.batches||[];
        APP.logs=d.logs||{};
        APP.additions=d.additions||{};
        APP.tasksDone=d.tasksDone||{};
        APP.tastings=d.tastings||{};
        APP.bottling=d.bottling||{};
        APP.supplies=d.supplies||[];
        APP.customRecipes=d.customRecipes||[];
        APP.fermenters=d.fermenters||[];
        APP.plannedBatches=d.plannedBatches||[];
        APP.photos=d.photos||{};
        APP.templates=d.templates||[];
        APP.celebrated=d.celebrated||{};
        APP.tempAnomalies=d.tempAnomalies||[];
        APP.notifiedTasks=d.notifiedTasks||{};
      }
      if(typeof rebuildRecipes==='function')rebuildRecipes();
      saveSettings();scheduleSave();
      toast('✦ Backup imported');renderMain();
    }catch(err){toast('⚠ Invalid backup file');}
  };
  reader.readAsText(file);
}

function resetAllData(){
  // Clears every batch-related data bucket but preserves the things the brewer
  // has invested time in customizing: label designs, custom recipes, brand logo,
  // HA connection settings, supply prices and the brewer's display name.
  var warning=
    'RESET DUMMY / TEST DATA — PERMANENT, CANNOT BE UNDONE\n\n'+
    'This will DELETE:\n'+
    '  • All batches and their gravity logs\n'+
    '  • All bottling records (bottle counts, drunk/gifted history)\n'+
    '  • All tasting notes and ratings\n'+
    '  • All brew-day task completion state\n'+
    '  • All supply inventory entries\n'+
    '  • Per-batch additions log\n'+
    '  • Celebrated milestones (so future confetti fires correctly)\n'+
    '  • Temperature anomaly history\n'+
    '  • Compare-batches selection\n'+
    '  • Sent-notification cache\n\n'+
    'This will PRESERVE:\n'+
    '  • Label designs and recipe overlays (Label Designer)\n'+
    '  • Brand logo and brewer name\n'+
    '  • Custom recipes you authored\n'+
    '  • Favorite recipes\n'+
    '  • Server & Home Assistant connection settings, sensor bindings\n'+
    '  • Honey price, currency, sachet size\n'+
    '  • Fermenter list (vessels themselves, but their assigned batches will clear)\n\n'+
    'Proceed?';
  if(!confirm(warning))return;
  if(!confirm('Are you absolutely sure? Type-equivalent of "yes" — there is no undo.'))return;
  APP.batches=[];
  APP.logs={};
  APP.tasksDone={};
  APP.tastings={};
  APP.bottling={};
  APP.supplies=[];
  APP.notifiedTasks={};
  APP.additions={};
  APP.celebrated={};
  APP.tempAnomalies=[];
  APP.compareSelection=[];
  APP.plannedBatches=[];
  APP.photos={};
  // Clear any batch assignments on fermenters but keep the vessels themselves
  if(APP.fermenters&&APP.fermenters.length){
    APP.fermenters.forEach(function(f){f.batchId=null;});
  }
  scheduleSave();
  toast('All batch data reset · labels & recipes preserved');
  showView('dashboard');
}

// ==================== INIT ====================
function updateTopbarDate(){
  var el=document.getElementById('topbar-date');
  if(el)el.textContent=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}).toUpperCase();
}

async function init(){
  // Register the service worker for offline support + installability. Fire and
  // forget — never block app start on it, and stay silent on failure (e.g.
  // unsupported browser, or http:// on a non-localhost host where SW is
  // disallowed). Runs in both normal and share mode.
  if('serviceWorker' in navigator){
    try{navigator.serviceWorker.register('/sw.js').catch(function(){});}catch(e){}
  }
  // Share-link mode. The recipient gets a read-only standalone page — no
  // sidebar, no nav, no modify UI — built from a single sanitized batch that
  // the server returns in exchange for an unguessable token. Two URL shapes:
  //   /share/<token>            ← current form (token in the path)
  //   /share#<token>            ← bounce-page / hash form, same token
  // The legacy /#share=<serial> links no longer resolve (they exposed the
  // whole state); the owner re-shares to get a tokenised link.
  var pm=window.location.pathname.match(/\/share\/([^/?#]+)\/?$/);
  var sharePathBare=/\/share\/?$/.test(window.location.pathname);
  var hashTok=(window.location.hash&&window.location.hash.indexOf('#share=')===0)
    ?window.location.hash.slice(7):'';
  if(pm||sharePathBare||hashTok){
    var shareToken=pm?decodeURIComponent(pm[1])
      :(hashTok||decodeURIComponent((window.location.hash||'').replace(/^#/,'')));
    await initShareMode(shareToken);
    return;
  }
  loadSettings();
  // Combine built-in + user-saved custom recipes
  function rebuildRecipes(){
    // Everything in customRecipes is user-owned, so backfill isCustom — older
    // imports/forks saved before the flag existed still get Edit/Delete. Also
    // backfill display fields some imports omit so the header doesn't read
    // "undefined% ABV · undefined-day fermentation".
    (APP.customRecipes||[]).forEach(function(r){
      if(!r.isCustom)r.isCustom=true;
      if(r.abvTarget==null&&r.ogTarget&&r.fgTarget)r.abvTarget=Math.round((r.ogTarget-r.fgTarget)*131.25*10)/10;
      if(r.fermentDays==null)r.fermentDays=42;
    });
    APP.recipes=BUILTIN_RECIPES().concat(APP.customRecipes||[]);
  }
  window.rebuildRecipes=rebuildRecipes;
  rebuildRecipes();
  // Populate topbar crest with the MeadOS logo
  var crest=document.getElementById('topbar-crest');
  if(crest&&typeof MEADOS_LOGO!=='undefined'&&MEADOS_LOGO){
    var src=(typeof getBrandLogoSrc==='function')?getBrandLogoSrc():MEADOS_LOGO;
    crest.innerHTML='<img src="'+src+'" alt="MeadOS">';
  }
  updateTopbarDate();
  await loadData();
  // Learn whether the server holds an HA token (and when it expires) — the
  // token itself never comes to the browser. Drives haConfigured() & reminders.
  await loadHAConfig();
  // Backfill the square dark-background PWA/app icon for a brand logo that was
  // set before this feature existed — one-time, then it rides the shared blob.
  if(APP.settings&&APP.settings.brandLogo&&!APP.settings.appIcon&&typeof regenerateAppIcon==='function'){
    regenerateAppIcon().then(function(){scheduleSave();});
  }
  // Prefetch any media-source IDs in custom labels / brand logo so cache is warm
  if(typeof prefetchAllMediaUrls==='function')prefetchAllMediaUrls();
  // Ensure fermenters exist on fresh installs (loadData may have been a no-op
  // if there's no local cache and HA is unreachable, leaving APP.fermenters
  // empty). This mirrors what the v6 migration would do.
  if(!APP.fermenters||!APP.fermenters.length){
    APP.fermenters=[
      {id:'f1',name:'Primary 1',capacity:9,notes:'9 L wide-mouth · primary fermentation',color:'#c9a84c',tempSensorEntity:''},
      {id:'f2',name:'Primary 2',capacity:9,notes:'9 L wide-mouth · primary fermentation',color:'#a87aa0',tempSensorEntity:''},
      {id:'f3',name:'Secondary 1',capacity:7.6,notes:'7.6 L wide-mouth · secondary / assist',color:'#7aa8c0',tempSensorEntity:''},
      {id:'f4',name:'Secondary 2',capacity:7.6,notes:'7.6 L wide-mouth · secondary / assist',color:'#7aa850',tempSensorEntity:''},
      {id:'f5',name:'Bulk Aging 1',capacity:5,notes:'5 L wide-mouth · secondary + bulk aging before bottling',color:'#c87850',tempSensorEntity:''},
      {id:'f6',name:'Bulk Aging 2',capacity:5,notes:'5 L wide-mouth · secondary + bulk aging before bottling',color:'#5a8a7a',tempSensorEntity:''}
    ];
  }
  if(!APP.settings.favoriteRecipes)APP.settings.favoriteRecipes=[];
  rebuildRecipes(); // Re-merge after loadData populated customRecipes
  // Hash routing: support QR code deep-links like #batch=b1, #recipe=r9, #view=cellar
  handleHashRoute();
  window.addEventListener('hashchange',handleHashRoute);
  if(!window.location.hash)renderMain();
  setInterval(updateTopbarDate,60000);
  // Start temp polling + check for due-today notifications
  startTempPolling();
  setTimeout(function(){maybeNotifyForToday();},2000);
  // Check for batch milestones (ready age, anniversaries) — fires confetti once per milestone
  setTimeout(function(){if(typeof checkMilestoneConfetti==='function')checkMilestoneConfetti();},3500);
  // Move any legacy inline (base64) label/logo images out of the state blob
  // into the server's labels/ folder — done post-load so it never blocks paint
  setTimeout(function(){if(typeof migrateInlineImagesToAssets==='function')migrateInlineImagesToAssets();},2500);
  // Token rotation alert. Only fires for critical/expired states; the warning
  // band lives quietly in settings. Dedup'd per-day via APP.notifiedTasks so
  // we don't pester on every reload.
  setTimeout(function(){
    if(typeof getActiveTokenExpiry!=='function')return;
    if(typeof haConfigured!=='function'||!haConfigured())return;
    var info=getActiveTokenExpiry();
    if(!info||info.status==='ok'||info.status==='warning')return;
    var todayKey=new Date().toISOString().slice(0,10);
    var dedupKey=todayKey+'-token-'+info.status;
    if(APP.notifiedTasks&&APP.notifiedTasks[dedupKey])return;
    if(!APP.notifiedTasks)APP.notifiedTasks={};
    APP.notifiedTasks[dedupKey]=true;
    var msg=info.status==='expired'
      ?'⛔ HA access token has EXPIRED — sync is failing. Open Settings to rotate.'
      :'⚠ HA access token expires in '+info.daysLeft+' day'+(info.daysLeft===1?'':'s')+'. Rotate soon in Settings.';
    toast(msg);
    scheduleSave();
  },4500);
  // Surface any pending schema-migration report once UI has settled
  setTimeout(function(){
    if(APP._pendingMigrationReport&&typeof showMigrationReport==='function'){
      showMigrationReport(APP._pendingMigrationReport);
      APP._pendingMigrationReport=null;
    }
  },1200);
}

async function initShareMode(token){
  // Loading state — replace body immediately so no nav flashes
  document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;color:#888;background:#1a0f08;font-size:14px;letter-spacing:2px">Loading…</div>';
  // Flag share mode so any incidental save/sync paths stay inert. Unlike the
  // old flow we do NOT loadData() the full state — we fetch exactly one
  // sanitized batch by token, so a guest's browser never receives anything
  // beyond the batch they were given.
  APP._shareMode=true;
  function notFound(msg){
    document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;color:#888;background:#1a0f08;font-size:16px;padding:20px;text-align:center">'+(msg||'This share link is no longer valid.')+'</div>';
  }
  if(!token){notFound('Missing share token.');return;}
  var payload=null;
  try{
    var res=await fetch('/api/share?token='+encodeURIComponent(token),{cache:'no-store'});
    if(res&&res.status===200)payload=await res.json();
  }catch(e){}
  if(!payload||!payload.ok||!payload.batch){notFound('This share link is no longer valid — the batch may have been deleted.');return;}
  // Build a MINIMAL in-memory state from the single-batch payload. Only this
  // one batch exists in the guest's APP; there is no other data to leak.
  var b=payload.batch;
  APP.batches=[b];
  APP.logs={};APP.logs[b.id]=payload.logs||[];
  APP.tastings={};APP.tastings[b.id]=payload.tastings||[];
  // Share photos arrive without their internal id (privacy). Assign a stable
  // synthetic id per photo so the gallery's lightbox can address them.
  APP.photos={};APP.photos[b.id]=(payload.photos||[]).map(function(p,i){return Object.assign({id:'sp'+i},p);});
  APP.bottling={};APP.bottling[b.id]=payload.bottling||{};
  APP.customRecipes=payload.recipe?[payload.recipe]:[];
  if(typeof BUILTIN_RECIPES==='function'){
    APP.recipes=BUILTIN_RECIPES().concat(APP.customRecipes);
  }
  APP.settings=APP.settings||{};
  if(payload.meadery){
    APP.settings.brewerName=payload.meadery.brewerName||APP.settings.brewerName;
    if(payload.meadery.brandLogo)APP.settings.brandLogo=payload.meadery.brandLogo;
  }
  // Bottle-label art + the recipe's Label-Maker overlay config, so the share
  // page renders the label EXACTLY as configured (just with QR + drinking-window
  // suppressed). Feeding customLabels/recipeOverlays lets getLabelImage and
  // getRecipeOverlays resolve them via the normal label render path.
  window._shareLabelImage=(typeof payload.labelImage==='string'&&/^(data:image\/|\/labels\/|\/assets\/)/.test(payload.labelImage))?payload.labelImage:'';
  if(window._shareLabelImage){
    APP.settings.customLabels=APP.settings.customLabels||{};
    APP.settings.customLabels[b.recipeId]=window._shareLabelImage;
  }
  if(payload.recipeOverlays&&typeof payload.recipeOverlays==='object'){
    APP.settings.recipeOverlays=APP.settings.recipeOverlays||{};
    APP.settings.recipeOverlays[b.recipeId]=payload.recipeOverlays;
  }
  // Visitor-facing label locale: default to Dutch when the visitor's browser is
  // Dutch-speaking (nl-BE / nl-NL), else the brewer's chosen locale. A toggle on
  // the share page can override this.
  var navLang=((navigator.languages&&navigator.languages.join(','))||navigator.language||navigator.userLanguage||'').toLowerCase();
  APP.settings.labelLocale=/(^|,)nl\b/.test(navLang)?'nl':((typeof payload.labelLocale==='string'&&payload.labelLocale)||'en');
  // Label Studio design (front only) so the share page renders the new label,
  // print-ready. backEnabled:false → renderBatchLabel shows the front alone.
  if(payload.labelStudio&&payload.labelStudio.front){
    APP.settings.labelStudio=APP.settings.labelStudio||{};
    var ls=payload.labelStudio;
    APP.settings.labelStudio[b.recipeId]={w:ls.w||340,h:ls.h||440,front:ls.front,back:ls.front,backEnabled:false};
  }
  renderPublicShareView(b);
  // Don't register hashchange — share view is static and we don't want any
  // navigation to fire later. If user changes the hash, nothing happens.
}

function handleHashRoute(){
  var h=window.location.hash.slice(1);
  if(!h){renderMain();return;}
  // #share= is handled at init time, not here — if it fires here it means
  // the user clicked something or pasted a URL after the app already loaded.
  // Easiest UX: reload the page so init runs in share mode.
  if(h.indexOf('share=')===0){
    window.location.reload();
    return;
  }
  var params={};
  h.split('&').forEach(function(kv){
    var p=kv.split('=');
    if(p.length===2)params[p[0]]=decodeURIComponent(p[1]);
  });
  if(params.batch){
    // Accept either the serial (e.g. "2024-001") or the internal id — both
    // legitimate references depending on which generation of share link or
    // QR code is being used. findBatchByRef tries serial first, falls back.
    var b=findBatchByRef(params.batch);
    if(b){showView('batch',b.id);return;}
    toast('⚠ Batch not found');
  }
  if(params.recipe){
    var r=APP.recipes.find(function(x){return x.id===params.recipe;});
    if(r){window.currentRecipeId=params.recipe;showView('recipe-detail');return;}
    toast('⚠ Recipe not found');
  }
  if(params.view){showView(params.view);return;}
  renderMain();
}

document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});

init();

