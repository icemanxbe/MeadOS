// ==========================================================================
// HA companion Lovelace card, batch additions tracker, fermentation temperature history.
// Split out of the former 11-features.js. Globals, no behaviour change.
// ==========================================================================

// ==================== HA COMPANION LOVELACE CARD ====================
// Builds the Lovelace YAML used by all three actions: download, copy, preview.
function buildLovelaceYAML(){
  var brewer=APP.settings.brewerName||'MeadOS';
  var tempEntity=APP.settings.tempSensorEntity||'';
  var appUrl=appBaseUrl();
  var tempBlock=tempEntity?[
    '      - type: entity',
    '        entity: '+tempEntity,
    '        name: Fermentation Temp',
    '        icon: mdi:thermometer'
  ]:[];
  return[
    '# MeadOS Companion Lovelace Card',
    '# Paste this into your HA dashboard via Edit → Add Card → Manual',
    '# Reads from sensor.meadows_data attributes. In MeadOS, configure the optional',
    '# Home Assistant connection and enable "Publish status summary" so these',
    '# attributes update on every save.',
    '# Uses only built-in HA cards — no HACS dependencies required.',
    '',
    'type: vertical-stack',
    'title: ⚗ MeadOS · '+brewer,
    'cards:',
    '',
    '  # ---- HEADER: sync status + fermentation temp ----',
    '  - type: horizontal-stack',
    '    cards:',
    '      - type: entity',
    '        entity: sensor.meadows_data',
    '        name: Last Sync',
    '        icon: mdi:database-sync',
    '        attribute: updated'
  ].concat(tempBlock).concat([
    '',
    '  # ---- STAT GRID ----',
    '  - type: glance',
    '    show_state: true',
    '    columns: 4',
    '    entities:',
    '      - entity: sensor.meadows_data',
    '        name: Active',
    '        icon: mdi:flask',
    '        attribute: active_batches',
    '      - entity: sensor.meadows_data',
    '        name: Bottles',
    '        icon: mdi:bottle-wine',
    '        attribute: bottles_on_hand',
    '      - entity: sensor.meadows_data',
    '        name: Fermenters Free',
    '        icon: mdi:beaker-outline',
    '        attribute: fermenters_free',
    '      - entity: sensor.meadows_data',
    '        name: Ready / Peak',
    '        icon: mdi:glass-wine',
    '        attribute: drinking_window_count',
    '',
    '  # ---- NEXT MILESTONE banner ----',
    '  - type: markdown',
    '    content: |',
    '      ### ⏭ Next up',
    '      {{ state_attr("sensor.meadows_data", "next_milestone") or "_No upcoming milestones._" }}',
    '',
    '  # ---- ACTIVE BATCHES ----',
    '  - type: markdown',
    '    content: |',
    '      ### ⚗ Active Batches',
    '      {{ state_attr("sensor.meadows_data", "active_batch_lines") or "_No active batches._" }}',
    '',
    '  # ---- FERMENTER STATUS ----',
    '  - type: markdown',
    '    content: |',
    '      ### 🛢 Fermenters · {{ state_attr("sensor.meadows_data","fermenters_free") }}/{{ state_attr("sensor.meadows_data","fermenters_total") }} free',
    '      {{ state_attr("sensor.meadows_data", "fermenter_lines") or "_No fermenters configured._" }}',
    '',
    '  # ---- DRINKING WINDOW ALERTS (only shows if there are any) ----',
    '  - type: conditional',
    '    conditions:',
    '      - condition: numeric_state',
    '        entity: sensor.meadows_data',
    '        attribute: drinking_window_count',
    '        above: 0',
    '    card:',
    '      type: markdown',
    '      content: |',
    '        ### 🍷 Drinking Window',
    '        {{ state_attr("sensor.meadows_data", "drinking_lines") }}',
    '',
    '  # ---- OPEN MEADOS BUTTON ----',
    '  - type: button',
    '    name: Open MeadOS',
    '    icon: mdi:glass-mug-variant',
    '    tap_action:',
    '      action: url',
    '      url_path: '+appUrl,
    '',
    '# ===== NOTES =====',
    '# 1. If you have a temperature sensor for your fermentation space, set it',
    '#    in Settings → Temperature Sensor and re-export this YAML; the temp',
    '#    will appear in the header row.',
    '# 2. To put MeadOS itself in an HA sidebar, add as a panel-iframe:',
    '#    in configuration.yaml:',
    '#      panel_iframe:',
    '#        meados:',
    '#          title: "MeadOS"',
    '#          icon: mdi:glass-mug-variant',
    '#          url: "'+appUrl+'"',
    '# 3. The attributes used here are recomputed on every save. If you do not',
    '#    see new values, force a sync via the ⟳ button in MeadOS.'
  ]).join('\n');
}

function downloadLovelaceCard(){
  var yaml=buildLovelaceYAML();
  var blob=new Blob([yaml],{type:'text/yaml'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='meados-lovelace-card.yaml';a.click();
  URL.revokeObjectURL(url);
  toast('📋 Lovelace card YAML downloaded');
}

function copyLovelaceCard(){
  var yaml=buildLovelaceYAML();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(yaml).then(function(){
      toast('✓ YAML copied to clipboard — paste into HA Manual card');
    },function(){
      // Fallback for browsers/contexts where clipboard API is unavailable
      fallbackCopyText(yaml);
    });
  }else{
    fallbackCopyText(yaml);
  }
}

function fallbackCopyText(text){
  var ta=document.createElement('textarea');
  ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');toast('✓ YAML copied to clipboard');}
  catch(e){toast('⚠ Copy failed — use Preview to copy manually');}
  document.body.removeChild(ta);
}

function previewLovelaceCard(){
  closeModal();
  var yaml=buildLovelaceYAML();
  // Show a side-by-side: rendered preview (as much as we can in pure HTML)
  // plus the raw YAML. The preview uses the same summary fields the real
  // card would, so the user sees their actual current state.
  var s=computeHASummary();
  var preview='<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px;max-height:50vh;overflow-y:auto">'
    +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold);margin-bottom:10px;letter-spacing:1.5px">⚗ MEADOS · '+escHtml(APP.settings.brewerName||'MeadOS')+'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">'
    +['Active|'+APP.batches.filter(function(b){var st=getBatchStatus(b);return st!=='bottled'&&st!=='complete';}).length,
      'Bottles|'+s.bottlesOnHand,
      'Free|'+s.fermentersFree,
      'Ready|'+s.drinkingWindowCount].map(function(p){var x=p.split('|');return'<div style="text-align:center;padding:8px;background:var(--bg2);border-radius:4px"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+x[1]+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px">'+x[0].toUpperCase()+'</div></div>';}).join('')
    +'</div>'
    +'<div style="font-size:12px;color:var(--gold2);font-weight:600;margin-bottom:4px">⏭ Next up</div>'
    +'<div style="font-size:12px;color:var(--text2);margin-bottom:12px">'+escHtml(s.nextMilestone)+'</div>'
    +'<div style="font-size:12px;color:var(--gold2);font-weight:600;margin-bottom:4px">⚗ Active Batches</div>'
    +'<div style="font-size:12px;color:var(--text2);white-space:pre-wrap;margin-bottom:12px;font-family:var(--font-mono);line-height:1.6">'+escHtml(s.activeBatchLines)+'</div>'
    +'<div style="font-size:12px;color:var(--gold2);font-weight:600;margin-bottom:4px">🛢 Fermenters · '+s.fermentersFree+'/'+s.fermentersTotal+' free</div>'
    +'<div style="font-size:12px;color:var(--text2);white-space:pre-wrap;margin-bottom:12px;font-family:var(--font-mono);line-height:1.6">'+escHtml(s.fermenterLines)+'</div>'
    +(s.drinkingWindowCount?'<div style="font-size:12px;color:var(--gold2);font-weight:600;margin-bottom:4px">🍷 Drinking Window</div>'
    +'<div style="font-size:12px;color:var(--text2);white-space:pre-wrap;font-family:var(--font-mono);line-height:1.6">'+escHtml(s.drinkingLines)+'</div>':'')
    +'</div>';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:760px">'
    +'<div class="modal-title">👁 LOVELACE CARD PREVIEW</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:10px">A mock-up of how this card will look in your HA dashboard, using your actual current data:</div>'
    +preview
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin:14px 0 4px">YAML SOURCE ('+yaml.length+' bytes)</div>'
    +'<textarea readonly style="width:100%;height:140px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text2);padding:8px;font-family:var(--font-mono);font-size:10px;line-height:1.4">'+escHtml(yaml)+'</textarea>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="copyLovelaceCard()">📋 Copy YAML</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// ==================== BATCH ADDITIONS TRACKER ====================
// Tracks anything you add to a batch after brew day: backsweetening, fruit, spices,
// oak, vanilla, cinnamon sticks, etc. Records type (permanent vs temporary), removal
// dates, and warns when temporary additions are overdue for removal.
//
// Storage: APP.additions[batchId] = [{id, date, item, amount, type, removeBy, removedDate, notes}]

var ADDITION_TYPES=[
  {key:'backsweeten',label:'Backsweetening',icon:'🍯',permanent:true,examples:'honey, sugar syrup, glycerin'},
  {key:'fruit',label:'Fruit',icon:'🍒',permanent:false,examples:'cherries, berries, peach — typically 3-7 days'},
  {key:'spice',label:'Spice',icon:'🌶',permanent:false,examples:'cinnamon stick, cloves, star anise — typically 1-3 days'},
  {key:'oak',label:'Oak / Wood',icon:'🪵',permanent:false,examples:'oak chips, cubes, staves — typically 1-4 weeks'},
  {key:'herb',label:'Herb / Botanical',icon:'🌿',permanent:false,examples:'lavender, hibiscus, rose petals — typically 1-7 days'},
  {key:'acid',label:'Acid adjustment',icon:'🧪',permanent:true,examples:'malic, citric, tartaric acid'},
  {key:'tannin',label:'Tannin',icon:'🍇',permanent:true,examples:'powdered tannin, grape skins'},
  {key:'stabilizer',label:'Stabilizer',icon:'🛡',permanent:true,examples:'potassium sorbate + metabisulfite'},
  {key:'fining',label:'Fining agent',icon:'💧',permanent:false,examples:'bentonite, sparkolloid — typically 1-2 weeks then rack'},
  {key:'flavor',label:'Flavor extract',icon:'🧴',permanent:true,examples:'vanilla extract, almond extract'},
  {key:'other',label:'Other',icon:'➕',permanent:false,examples:''}
];

function getAdditions(batchId){
  return(APP.additions&&APP.additions[batchId])||[];
}

function renderAdditionsTab(batch){
  var batchId=batch.id;
  var adds=getAdditions(batchId);
  // Sort: pending (in batch) first, then by date desc
  adds=adds.slice().sort(function(a,b){
    var aPending=!a.removedDate&&!ADDITION_TYPES.find(function(t){return t.key===a.type;})?.permanent;
    var bPending=!b.removedDate&&!ADDITION_TYPES.find(function(t){return t.key===b.type;})?.permanent;
    if(aPending!==bPending)return aPending?-1:1;
    return(b.date||'').localeCompare(a.date||'');
  });
  var now=new Date();
  var rows=adds.length?adds.map(function(a){
    var typeInfo=ADDITION_TYPES.find(function(t){return t.key===a.type;})||{label:'Other',icon:'➕',permanent:false};
    var isPermanent=typeInfo.permanent;
    var inBatch=!a.removedDate&&!isPermanent;
    var overdue=inBatch&&a.removeBy&&new Date(a.removeBy)<now;
    var daysLeft=inBatch&&a.removeBy?Math.ceil((new Date(a.removeBy)-now)/86400000):null;
    var statusBadge='';
    if(isPermanent)statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg4);padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid var(--border)">PERMANENT</span>';
    else if(a.removedDate)statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:var(--green2);background:#0d1f12;padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid var(--green)">REMOVED '+fmtDate(a.removedDate)+'</span>';
    else if(overdue)statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:var(--red2);background:#1a0808;padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid var(--red);animation:pulse-warn 2s infinite">⚠ OVERDUE — REMOVE NOW</span>';
    else if(daysLeft!=null)statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:'+(daysLeft<=1?'var(--honey)':'var(--blue2)')+';background:'+(daysLeft<=1?'#1a1205':'#0d1525')+';padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid '+(daysLeft<=1?'var(--amber)':'var(--blue)')+'">REMOVE IN '+fmtDurationCompact(daysLeft).toUpperCase()+'</span>';
    else statusBadge='<span style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);background:var(--bg4);padding:2px 7px;border-radius:8px;letter-spacing:1px;border:1px solid var(--border)">IN BATCH</span>';
    return'<div style="background:var(--bg3);border:1px solid '+(overdue?'var(--red)':'var(--border)')+';border-radius:var(--radius);padding:14px;margin-bottom:8px">'
      +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
      +'<div style="font-size:20px">'+typeInfo.icon+'</div>'
      +'<div style="flex:1;min-width:160px"><div style="font-family:var(--font-display);font-size:14px;color:var(--text);letter-spacing:1px">'+escHtml(a.item)+'</div>'
      +'<div style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-top:2px">'+typeInfo.label+' · added '+fmtDate(a.date)+(a.amount?' · '+escHtml(a.amount):'')+'</div></div>'
      +statusBadge
      +'<div style="display:flex;gap:4px">'
      +(inBatch?'<button class="btn btn-secondary btn-sm" onclick="markAdditionRemoved(\''+batchId+'\',\''+a.id+'\')" title="Mark as removed today">✓ Remove</button>':'')
      +'<button class="btn btn-secondary btn-sm" onclick="openAdditionModal(\''+batchId+'\',\''+a.id+'\')">✏</button>'
      +'<button class="btn btn-danger btn-sm" onclick="deleteAddition(\''+batchId+'\',\''+a.id+'\')">✕</button>'
      +'</div></div>'
      +(a.notes?'<div style="font-size:12px;color:var(--text3);font-style:italic;margin-top:4px;padding-left:30px">'+escHtml(a.notes)+'</div>':'')
      +'</div>';
  }).join(''):'<div style="text-align:center;color:var(--text3);font-style:italic;padding:30px">No additions logged yet. Use this tab when you backsweeten, add fruit/spice/oak, or stabilize.</div>';
  return'<div class="grid-2">'
    +'<div><div class="card"><div class="card-header"><div class="card-title">ADDITIONS &amp; INFUSIONS</div><button class="btn btn-primary btn-sm" onclick="openAdditionModal(\''+batchId+'\')">＋ Log Addition</button></div>'
    +rows
    +'</div></div>'
    +'<div><div class="card"><div class="card-header"><div class="card-title">REFERENCE · TYPICAL TIMINGS</div></div>'
    +'<div style="font-size:12px;color:var(--text3);line-height:1.8">'
    +ADDITION_TYPES.filter(function(t){return!t.permanent&&t.examples;}).map(function(t){return'<div style="margin-bottom:6px"><span style="color:var(--gold2);font-family:var(--font-mono);font-size:11px">'+t.icon+' '+t.label.toUpperCase()+'</span><br><span style="color:var(--text3);padding-left:24px">'+escHtml(t.examples)+'</span></div>';}).join('')
    +'</div>'
    +'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:14px;padding-top:10px;border-top:1px solid var(--border)">Times vary by recipe and taste. Sample frequently — over-extraction with oak or spice is hard to reverse. Permanent additions (sweetening, acid, tannin) stay forever.</div>'
    +'</div></div></div>';
}

function openAdditionModal(batchId,additionId){
  closeModal();
  var existing=additionId?(getAdditions(batchId).find(function(a){return a.id===additionId;})):null;
  var typeOpts=ADDITION_TYPES.map(function(t){return'<option value="'+t.key+'"'+(existing&&existing.type===t.key?' selected':'')+'>'+t.icon+' '+t.label+'</option>';}).join('');
  var isEdit=!!existing;
  var defaultRemoveBy='';
  if(!isEdit){
    // Suggest a default "remove by" 3 days out for temporary additions
    var d=new Date();d.setDate(d.getDate()+3);
    defaultRemoveBy=d.toISOString().split('T')[0];
  }
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:520px">'
    +'<div class="modal-title">'+(isEdit?'EDIT':'LOG')+' ADDITION</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Type</label><select class="form-select" id="ad-type" onchange="updateAdditionTypeHint()">'+typeOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label">Date Added</label><input class="form-input" type="date" id="ad-date" value="'+(existing?existing.date:today())+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Item</label><input class="form-input" id="ad-item" placeholder="Cinnamon stick / Tart cherries / Honey…" value="'+escHtml(existing?existing.item:'')+'"></div>'
    +'<div class="form-group"><label class="form-label">Amount</label><input class="form-input" id="ad-amount" placeholder="500g / 2 sticks / 200ml" value="'+escHtml(existing?existing.amount:'')+'"></div></div>'
    +'<div id="ad-removal-section">'
    +'<div class="form-group"><label class="form-label">Planned Removal Date <span style="font-weight:400;color:var(--text3);font-size:11px">· leave empty for permanent additions</span></label><input class="form-input" type="date" id="ad-removeby" value="'+(existing&&existing.removeBy?existing.removeBy:defaultRemoveBy)+'"></div>'
    +(isEdit&&existing.removedDate?'<div class="form-group"><label class="form-label">Actually Removed On</label><input class="form-input" type="date" id="ad-removed" value="'+existing.removedDate+'"></div>':'')
    +'</div>'
    +'<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="ad-notes" placeholder="Why added, expected effect, tasting impressions…">'+escHtml(existing?existing.notes:'')+'</textarea></div>'
    +'<div id="ad-hint" style="font-size:12px;color:var(--text3);font-style:italic;margin-top:6px;padding:8px;background:var(--bg4);border-radius:var(--radius)"></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveAddition(\''+batchId+'\','+(existing?'\''+additionId+'\'':'null')+')">Save</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  updateAdditionTypeHint();
}

function updateAdditionTypeHint(){
  var sel=document.getElementById('ad-type');
  if(!sel)return;
  var info=ADDITION_TYPES.find(function(t){return t.key===sel.value;});
  var hint=document.getElementById('ad-hint');
  var removal=document.getElementById('ad-removal-section');
  if(hint&&info){
    hint.innerHTML=info.examples?'<strong>'+info.label+':</strong> '+escHtml(info.examples):info.label+(info.permanent?' is a permanent addition — no removal needed.':' is typically removed after a few days/weeks.');
  }
  // For permanent additions, hide the removal date field
  if(removal&&info){
    removal.style.opacity=info.permanent?'0.4':'1';
    var rmInput=document.getElementById('ad-removeby');
    if(rmInput&&info.permanent)rmInput.value='';
  }
}

function saveAddition(batchId,additionId){
  var type=document.getElementById('ad-type').value;
  var info=ADDITION_TYPES.find(function(t){return t.key===type;});
  var entry={
    id:additionId||genId(),
    type:type,
    date:document.getElementById('ad-date').value||today(),
    item:document.getElementById('ad-item').value.trim(),
    amount:document.getElementById('ad-amount').value.trim(),
    removeBy:info&&info.permanent?'':(document.getElementById('ad-removeby').value||''),
    removedDate:(document.getElementById('ad-removed')&&document.getElementById('ad-removed').value)||(additionId?(getAdditions(batchId).find(function(a){return a.id===additionId;})||{}).removedDate||'':''),
    notes:document.getElementById('ad-notes').value.trim()
  };
  if(!entry.item){toast('⚠ Item is required');return;}
  if(!APP.additions)APP.additions={};
  if(!APP.additions[batchId])APP.additions[batchId]=[];
  var idx=APP.additions[batchId].findIndex(function(a){return a.id===entry.id;});
  if(idx>=0)APP.additions[batchId][idx]=entry;
  else APP.additions[batchId].push(entry);
  closeModal();scheduleSave();toast('✦ Addition logged');renderMain();
}

function markAdditionRemoved(batchId,additionId){
  var add=getAdditions(batchId).find(function(a){return a.id===additionId;});
  if(!add)return;
  add.removedDate=today();
  scheduleSave();toast('✓ Marked as removed');renderMain();
}

function deleteAddition(batchId,additionId){
  if(!confirm('Delete this addition entry?'))return;
  if(APP.additions&&APP.additions[batchId]){
    APP.additions[batchId]=APP.additions[batchId].filter(function(a){return a.id!==additionId;});
  }
  scheduleSave();toast('Deleted');renderMain();
}

// Overdue additions across all batches → for dashboard alerts
function getOverdueAdditions(){
  if(!APP.additions)return[];
  var now=Date.now();
  var out=[];
  Object.keys(APP.additions).forEach(function(bid){
    var b=getBatch(bid);
    if(!b||(typeof inActiveMode==='function'&&!inActiveMode(b)))return;
    (APP.additions[bid]||[]).forEach(function(a){
      if(a.removedDate)return;
      var info=ADDITION_TYPES.find(function(t){return t.key===a.type;});
      if(info&&info.permanent)return;
      if(a.removeBy&&new Date(a.removeBy).getTime()<now){
        out.push({batch:b,addition:a});
      }
    });
  });
  return out;
}

// ==================== FERMENTATION TEMPERATURE HISTORY ====================
// Fetches temperature history from HA's /api/history endpoint for the configured sensor,
// over the lifetime of the batch (or last 14 days, whichever is shorter — HA recorder default).

async function fetchTempHistory(batchId,hoursBack){
  var b=getBatch(batchId);
  if(!b)return null;
  var st=(typeof getBatchStatus==='function')?getBatchStatus(b):'';
  var bottled=(st==='bottled'||st==='complete');
  var ent,floorMs;
  if(bottled){
    // Bottled batches aren't in a fermenter anymore — graph the STORAGE
    // environment instead: the cabinet the batch rests in (via its shelf),
    // falling back to the legacy settings-level cellar sensor.
    var bot=APP.bottling[b.id]||{};
    var hit=(bot.cellarShelfId&&typeof findShelfById==='function')?findShelfById(bot.cellarShelfId):null;
    ent=(hit&&hit.cabinet&&hit.cabinet.tempSensorEntity)||(APP.settings&&APP.settings.cellarTempSensorEntity);
    floorMs=bot.date?new Date(bot.date).getTime():new Date(b.startDate).getTime();
  }else{
    // Prefer the batch's bound fermenter sensor over the global fallback —
    // this is what makes per-fermenter bindings actually useful for diagnostics.
    var ferm=b.fermenterId?getFermenter(b.fermenterId):null;
    ent=(ferm&&ferm.tempSensorEntity)||APP.settings.tempSensorEntity;
    floorMs=new Date(b.startDate).getTime();
  }
  if(!ent||!haConfigured())return null;
  var now=Date.now();
  var rangeMs=hoursBack?hoursBack*3600000:(now-floorMs);
  var start=new Date(Math.max(now-rangeMs,floorMs)).toISOString();
  var path='/api/history/period/'+encodeURIComponent(start)+'?filter_entity_id='+encodeURIComponent(ent)+'&minimal_response&significant_changes_only';
  var res=await haFetch(path);
  if(!res||!res.ok)return null;
  try{
    var data=await res.json();
    if(!data||!data.length||!data[0])return[];
    return data[0].map(function(s){
      var v=parseFloat(s.state);
      if(isNaN(v))return null;
      return{ts:new Date(s.last_changed||s.last_updated),value:v};
    }).filter(Boolean);
  }catch(e){return null;}
}

function setBatchTempRange(batchId,hours){
  window._batchTempRange=hours;
  // Move the active highlight (the range buttons aren't re-rendered on click).
  var btns=document.querySelectorAll('.temp-range-btn');
  for(var i=0;i<btns.length;i++){
    var on=parseInt(btns[i].getAttribute('data-trange'),10)===hours;
    btns[i].style.background=on?'rgba(232,196,106,0.18)':'';
    btns[i].style.color=on?'var(--gold2)':'';
    btns[i].style.borderColor=on?'var(--gold)':'';
  }
  // Redraw the chart in place
  renderTempHistoryChart('batch-temp-history-chart',batchId);
}

async function renderTempHistoryChart(canvasId,batchId){
  var canvas=document.getElementById(canvasId);
  if(!canvas)return;
  var loading=document.getElementById('batch-temp-loading');
  var summary=document.getElementById('batch-temp-summary');
  var hours=window._batchTempRange||168; // default 7 days
  // Show the loading overlay while fetching; keep the canvas in the DOM (just
  // hidden) so switching ranges always works — replacing the wrap's innerHTML
  // would delete the canvas and silently kill every later button press.
  if(loading){loading.textContent='Loading history…';loading.style.display='flex';}
  canvas.style.display='none';
  var history=await fetchTempHistory(batchId,hours);
  if(!history||history.length<2){
    if(window._batchTempChart){try{window._batchTempChart.destroy();}catch(e){}window._batchTempChart=null;}
    if(summary)summary.innerHTML='';
    if(loading){loading.textContent='No temperature history for this range — try a longer one, or HA recorder may still be collecting samples.';loading.style.display='flex';}
    return;
  }
  if(loading)loading.style.display='none';
  canvas.style.display='';
  // Stats for summary line
  var values=history.map(function(p){return p.value;});
  var minV=Math.min.apply(null,values),maxV=Math.max.apply(null,values);
  var avgV=values.reduce(function(s,v){return s+v;},0)/values.length;
  // Strain-specific bands — pull this batch's actual yeast ranges.
  var chartBatch=getBatch(batchId);
  var chartStatus=(chartBatch&&typeof getBatchStatus==='function')?getBatchStatus(chartBatch):'';
  var storageChart=(chartStatus==='bottled'||chartStatus==='complete');
  var oL,oH,sL,sH,yName;
  if(storageChart){
    // Bottled = aging in storage: judge against the cellar band, not the
    // yeast's fermentation range (the yeast is dormant).
    oL=10;oH=14;sL=8;sH=18;yName='aging';
  }else{
    var chartYeast=getYeastById((chartBatch&&chartBatch.yeast)||'m05');
    oL=chartYeast.optimalTempLow;oH=chartYeast.optimalTempHigh;
    sL=(chartYeast.tempToleranceLow!=null?chartYeast.tempToleranceLow:oL-3);
    sH=(chartYeast.tempToleranceHigh!=null?chartYeast.tempToleranceHigh:oH+6);
    yName=yeastShortName(chartYeast);
  }
  var outOfOpt=values.filter(function(v){return v<oL||v>oH;}).length;
  var outOfSafe=values.filter(function(v){return v<sL||v>sH;}).length;
  var inOptPct=Math.round((1-outOfOpt/values.length)*100);
  var inSafePct=Math.round((1-outOfSafe/values.length)*100);
  if(summary){
    summary.innerHTML='AVG '+avgV.toFixed(1)+'°C · MIN '+minV.toFixed(1)+'°C · MAX '+maxV.toFixed(1)+'°C · '
      +'<span style="color:'+(inSafePct>=99?'var(--green2)':inSafePct>=90?'var(--gold2)':'var(--red2)')+'">'+inSafePct+'% IN SAFE RANGE</span> · '
      +'<span style="color:'+(inOptPct>=80?'var(--green2)':inOptPct>=50?'var(--gold2)':'var(--text3)')+'">'+inOptPct+'% IN '+escHtml(yName.toUpperCase())+' OPTIMUM</span>';
  }
  // Downsample if huge
  var maxPoints=300;
  if(history.length>maxPoints){
    var step=Math.ceil(history.length/maxPoints);
    history=history.filter(function(_,i){return i%step===0;});
  }
  // Destroy any prior chart on this canvas
  if(window._batchTempChart){try{window._batchTempChart.destroy();}catch(e){}}
  var t0=history[0].ts.getTime();
  var t1=history[history.length-1].ts.getTime();
  var yMin=Math.floor(Math.min(minV,sL-1)*2)/2-1;
  var yMax=Math.ceil(Math.max(maxV,sH+1)*2)/2+1;
  window._batchTempChart=makeChart(canvas,{
    type:'line',
    data:{
      datasets:[
        // Optimum band (strain's optimal range) — filled green
        {label:'_opt_low',data:[{x:t0,y:oL},{x:t1,y:oL}],borderColor:'transparent',pointRadius:0,fill:false,tension:0,backgroundColor:'transparent'},
        {label:'_opt_high',data:[{x:t0,y:oH},{x:t1,y:oH}],borderColor:'transparent',backgroundColor:'rgba(122,160,64,0.10)',pointRadius:0,fill:'-1',tension:0},
        // Safe range (strain's tolerance) — dashed boundary lines
        {label:'_safe_low',data:[{x:t0,y:sL},{x:t1,y:sL}],borderColor:'rgba(200,160,64,0.4)',borderDash:[3,4],borderWidth:1,pointRadius:0,fill:false,tension:0,backgroundColor:'transparent'},
        {label:'_safe_high',data:[{x:t0,y:sH},{x:t1,y:sH}],borderColor:'rgba(200,160,64,0.4)',borderDash:[3,4],borderWidth:1,pointRadius:0,fill:false,tension:0,backgroundColor:'transparent'},
        // Actual trace
        {label:'Temperature',
          data:history.map(function(p){return{x:p.ts.getTime(),y:p.value};}),
          borderColor:'#e8a020',backgroundColor:'rgba(232,160,32,0.05)',
          tension:0.25,pointRadius:0,borderWidth:2,fill:false}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          filter:function(item){return!String(item.dataset.label||'').startsWith('_');},
          callbacks:{
            label:function(item){return item.parsed.y.toFixed(1)+'°C ('+fermentTempEval(item.parsed.y,chartYeast).zone+')';},
            title:function(items){if(!items.length)return'';return new Date(items[0].parsed.x).toLocaleString(_dloc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
          }
        }
      },
      scales:{
        x:{type:'linear',min:t0,max:t1,
          ticks:{color:'#6a5f50',font:{size:10},maxTicksLimit:7,callback:function(v){
            var d=new Date(v);
            return hours<=24
              ?d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
              :d.toLocaleDateString(_dloc(),{day:'2-digit',month:'short'});
          }},
          grid:{color:'#2a2a35'}
        },
        y:{min:yMin,max:yMax,
          ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v+'°C';}},
          grid:{color:'#2a2a35'}
        }
      },
      interaction:{mode:'nearest',axis:'x',intersect:false}
    }
  });
}
