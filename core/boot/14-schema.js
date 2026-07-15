// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// schema versioning, storage budget, modals, photo journal, settings actions, init()
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== SCHEMA VERSIONING ====================
// Current schema version. Bump when packageState/applyState changes shape.
//
// NOT bumped for the gravity-readings extraction: "logs" moved out of the
// live blob into its own SQLite table (server.py), but deliberately has no
// migration step here. A migration step runs inside migrateData(), which
// importData() also calls on a restored backup — a `delete d.logs` step
// would destroy the very readings an import is trying to restore. The
// server's own strip-and-adopt (db_put_state) self-heals any stale blob-
// embedded "logs" on the next save; nothing client-side needs to force it.
// "logs" stays in STATE_OBJECT_BUCKETS below so validateState() still
// usefully type-checks it on import, even though applyState() no longer
// assigns it — see importData() in 14-modals.js for where it's actually applied.
var CURRENT_SCHEMA_VERSION=13;

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
  },
  // v12 → v13: Cider mode. Every batch and recipe (built-in and custom) gets a
  // beverageType tag so the app can filter what's shown per the active mode.
  // Everything that existed before this version was mead by definition, so the
  // migration is a pure default-fill, never a guess — no batch changes meaning.
  13:function(d){
    (d.batches||[]).forEach(function(b){if(!b.beverageType)b.beverageType='mead';});
    (d.customRecipes||[]).forEach(function(r){if(!r.beverageType)r.beverageType='mead';});
    (d.plannedBatches||[]).forEach(function(b){if(!b.beverageType)b.beverageType='mead';});
    return d;
  }
};

function migrateData(d){
  // Migration steps below assign properties directly onto d (e.g. d.fermenters=[...]),
  // which throws under 'use strict' if d is a non-object primitive (a string, a
  // number...) rather than the object every migration assumes. Bail out before
  // that instead of letting a malformed root crash mid-migration.
  if(!d||typeof d!=='object'||Array.isArray(d))return{result:d,steps:[]};
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

// ==================== STATE SHAPE VALIDATION ====================
// applyState()/importData() used to trust every bucket's type implicitly —
// `APP.batches=d.batches||[]` only guards against falsy values, so a
// truthy-but-wrong-type value (a string, a number, `true`) sailed straight
// into APP and corrupted state silently; the failure would surface later,
// far from the cause, as some unrelated .map()/.filter() crash. This checks
// every known top-level bucket against its expected shape (array vs plain
// object) BEFORE it's applied, so a bad bucket is dropped (falls back to
// applyState's existing `||[]`/`||{}` defaults) and reported loudly instead
// of silently propagating.
var STATE_ARRAY_BUCKETS=['batches','supplies','customRecipes','fermenters','plannedBatches','suppliers','templates','stepTemplates','tempAnomalies','cabinets'];
var STATE_OBJECT_BUCKETS=['logs','tasksDone','tastings','competitions','bottling','shareTokens','additions','notifiedTasks','celebrated','photos','settings','sharedSettings'];

function _isPlainObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}

// Returns {ok, errors:[{bucket,expected,got}], sanitized}. `sanitized` is a
// shallow copy of `d` with any bucket that fails its type check deleted
// (not coerced) — deleting lets the caller's existing `||[]`/`||{}` fallback
// take over exactly as it does for a bucket that was simply absent.
function validateState(d){
  var errors=[];
  if(!d||typeof d!=='object'||Array.isArray(d)){
    return{ok:false,errors:[{bucket:'(root)',expected:'object',got:d===null?'null':Array.isArray(d)?'array':typeof d}],sanitized:null};
  }
  var sanitized=Object.assign({},d);
  STATE_ARRAY_BUCKETS.forEach(function(key){
    var v=d[key];
    if(v!==undefined&&v!==null&&!Array.isArray(v)){
      errors.push({bucket:key,expected:'array',got:typeof v});
      delete sanitized[key];
    }
  });
  STATE_OBJECT_BUCKETS.forEach(function(key){
    var v=d[key];
    if(v!==undefined&&v!==null&&!_isPlainObject(v)){
      errors.push({bucket:key,expected:'object',got:Array.isArray(v)?'array':typeof v});
      delete sanitized[key];
    }
  });
  return{ok:errors.length===0,errors:errors,sanitized:sanitized};
}

// Logs + (if a toast function is loaded) surfaces validation problems. Kept
// separate from validateState() itself so callers that want to inspect
// results before deciding whether to proceed (e.g. importData rejecting a
// wholesale-wrong file) can still do so silently first.
function reportStateValidation(validation,context){
  if(!validation||validation.ok)return;
  console.error('[MeadOS] state validation problems ('+(context||'unknown source')+'): '+JSON.stringify(validation.errors));
  APP._lastStateValidationErrors=validation.errors;
  if(typeof toast==='function'){
    var names=validation.errors.map(function(e){return e.bucket;}).join(', ');
    toast('⚠ Some stored data had an unexpected shape ('+names+') — reset to defaults, see console');
  }
}

function showMigrationReport(report){
  if(!report||!report.steps||!report.steps.length)return;
  if(report.fromVersion===report.toVersion)return;
  var html='<div class="modal-overlay"><div class="modal" style="max-width:540px">'
    +'<div class="modal-title">⚙ DATA MIGRATED</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Your stored data was upgraded from schema <strong>v'+report.fromVersion+'</strong> to <strong>v'+report.toVersion+'</strong>. The original data is preserved; this is just a non-destructive reshape so newer features can read older batches.</div>'
    +'<div style="background:var(--bg3);padding:12px;border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;line-height:1.8">'
    +report.steps.map(function(s){return'<div>'+(s.ok?'<span style="color:var(--green2)">✓</span>':'<span style="color:var(--red2)">✗</span>')+' v'+s.from+' → v'+s.to+(s.error?' <span style="color:var(--red2)">'+escHtml(s.error)+'</span>':'')+'</div>';}).join('')
    +'</div>'
    +'<div class="modal-actions"><button class="btn btn-primary" data-action="closeModal">OK</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
