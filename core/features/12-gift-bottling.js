// ==========================================================================
// Gift recipient log, bottling-day guided workflow.
// Split out of the former 12-features2.js. Globals, no behaviour change.
// ==========================================================================

// ==================== GIFT RECIPIENT LOG ====================
// When the gifted location count is increased, prompt for who received the bottles.
// Stored per-bottling as bot.gifts = [{id, date, recipient, count, occasion, notes}].

function openGiftRecipientModal(batchId,deltaCount,size){
  closeModal();
  var b=getBatch(batchId);
  if(!b)return;
  size=size||DEFAULT_BOTTLE_SIZE;
  // Suggest recipient names from prior gifts
  var priorRecipients={};
  Object.keys(APP.bottling).forEach(function(bid){
    var bot=APP.bottling[bid];
    if(bot.gifts)bot.gifts.forEach(function(g){priorRecipients[g.recipient]=true;});
  });
  var dataListOpts=Object.keys(priorRecipients).map(function(n){return'<option value="'+escHtml(n)+'">';}).join('');
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-overlay"><div class="modal" style="max-width:460px">'
    +'<div class="modal-title">'+(appLang()==='nl'?'🎁 CADEAU REGISTREREN':'🎁 RECORD GIFT')+(deltaCount>1?' ('+deltaCount+' × '+size+'ml)':' ('+size+'ml)')+'</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">'+(appLang()==='nl'?deltaCount+' × '+size+'ml cadeau'+(deltaCount!==1?'s':'')+' van <strong style="color:var(--gold2)">'+escHtml(b.name)+'</strong> registreren. Houd bij wie de fles'+(deltaCount!==1?'sen':'')+' kreeg zodat je later kunt opvolgen.':'Recording '+deltaCount+' × '+size+'ml gift'+(deltaCount!==1?'s':'')+' of <strong style="color:var(--gold2)">'+escHtml(b.name)+'</strong>. Track who got the bottle'+(deltaCount!==1?'s':'')+' so you can follow up later.')+'</div>'
    +'<input type="hidden" id="gift-size" value="'+size+'">'
    +'<div class="form-group"><label class="form-label">Recipient</label><input class="form-input" id="gift-recipient" placeholder="Mom / Sarah / Jan & Marie" list="gift-recipients-list" autofocus>'
    +'<datalist id="gift-recipients-list">'+dataListOpts+'</datalist></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="gift-date" value="'+today()+'"></div>'
    +'<div class="form-group"><label class="form-label">Bottles</label><input class="form-input" type="number" id="gift-count" min="1" value="'+deltaCount+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Occasion (optional)</label><input class="form-input" id="gift-occasion" placeholder="Birthday / Christmas / Just because"></div>'
    +'<div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" id="gift-notes" placeholder="They loved the cherry one last time, prefer drier…"></textarea></div>'
    +'<div class="modal-actions">'
    +'<button class="btn btn-secondary" data-action="skipGiftRecording" data-args=\''+JSON.stringify([batchId,deltaCount,size])+'\'>Skip — Just Count</button>'
    +'<button class="btn btn-primary" data-action="saveGiftRecord" data-args=\''+JSON.stringify([batchId,deltaCount,size])+'\'>Save Gift</button>'
    +'</div></div></div>');
  setTimeout(function(){var r=document.getElementById('gift-recipient');if(r)r.focus();},50);
}

function saveGiftRecord(batchId,deltaCount,size){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  size=parseInt(size)||DEFAULT_BOTTLE_SIZE;
  var recipient=document.getElementById('gift-recipient').value.trim();
  if(!recipient){toast('⚠ Enter a recipient or click Skip');return;}
  var count=parseInt(document.getElementById('gift-count').value)||deltaCount;
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  if((bot.locations.cellar[size]||0)<count){
    toast('⚠ Only '+(bot.locations.cellar[size]||0)+' × '+size+'ml in cellar — cannot gift '+count);
    return;
  }
  if(!bot.gifts)bot.gifts=[];
  bot.gifts.push({
    id:genId(),
    date:document.getElementById('gift-date').value||today(),
    recipient:recipient,
    count:count,
    size:size,
    occasion:document.getElementById('gift-occasion').value.trim(),
    notes:document.getElementById('gift-notes').value.trim()
  });
  // Transfer: cellar[size] -> gifted[size]
  bot.locations.cellar[size]=(bot.locations.cellar[size]||0)-count;
  bot.locations.gifted[size]=(bot.locations.gifted[size]||0)+count;
  if(bot.locations.cellar[size]<=0)delete bot.locations.cellar[size];
  closeModal();
  scheduleSave();
  toast('🎁 '+count+' × '+size+'ml bottle'+(count!==1?'s':'')+' gifted to '+recipient);
  renderMain();
}

function skipGiftRecording(batchId,deltaCount,size){
  var bot=APP.bottling[batchId];
  if(!bot)return;
  size=parseInt(size)||DEFAULT_BOTTLE_SIZE;
  if(!bot.locations)bot.locations={cellar:{},fridge:{},gifted:{},other:{}};
  if((bot.locations.cellar[size]||0)<deltaCount){
    toast('⚠ Not enough in cellar');
    closeModal();
    renderMain();
    return;
  }
  bot.locations.cellar[size]=(bot.locations.cellar[size]||0)-deltaCount;
  bot.locations.gifted[size]=(bot.locations.gifted[size]||0)+deltaCount;
  if(bot.locations.cellar[size]<=0)delete bot.locations.cellar[size];
  closeModal();
  scheduleSave();
  toast('🎁 '+deltaCount+' × '+size+'ml bottle'+(deltaCount!==1?'s':'')+' marked as gifted (no recipient recorded)');
  renderMain();
}

function deleteGiftRecord(batchId,giftId){
  if(!confirm('Delete this gift record? Bottles will return to the cellar count.'))return;
  var bot=APP.bottling[batchId];
  if(!bot||!bot.gifts)return;
  var gift=bot.gifts.find(function(g){return g.id===giftId;});
  if(!gift)return;
  bot.gifts=bot.gifts.filter(function(g){return g.id!==giftId;});
  var size=gift.size||DEFAULT_BOTTLE_SIZE;
  if(bot.locations){
    if(!bot.locations.gifted)bot.locations.gifted={};
    if(!bot.locations.cellar)bot.locations.cellar={};
    bot.locations.gifted[size]=Math.max(0,(bot.locations.gifted[size]||0)-gift.count);
    bot.locations.cellar[size]=(bot.locations.cellar[size]||0)+gift.count;
    if(bot.locations.gifted[size]<=0)delete bot.locations.gifted[size];
  }
  scheduleSave();toast('Gift record deleted, '+gift.count+' × '+size+'ml returned to cellar');renderMain();
}

function renderGiftHistory(bot,batchId){
  if(!bot.gifts||!bot.gifts.length)return'';
  // Aggregate by recipient
  var byRecipient={};
  bot.gifts.forEach(function(g){
    if(!byRecipient[g.recipient])byRecipient[g.recipient]={count:0,gifts:[]};
    byRecipient[g.recipient].count+=g.count;
    byRecipient[g.recipient].gifts.push(g);
  });
  var summary=Object.keys(byRecipient).map(function(name){
    var d=byRecipient[name];
    return escHtml(name)+(d.count>1?' ('+d.count+')':'');
  }).join(', ');
  return'<div style="margin-top:8px;font-size:11px;color:var(--text3);padding:6px 8px;background:var(--bg4);border-radius:6px;border-left:2px solid var(--gold)">'
    +'<span style="font-family:var(--font-mono);letter-spacing:1px;color:var(--gold2)">🎁 GIVEN TO:</span> '+summary
    +' <button class="btn btn-secondary btn-sm" style="margin-left:6px;padding:2px 8px;font-size:10px" data-action="showGiftDetails" data-args=\''+JSON.stringify([batchId])+'\'>Details</button>'
    +'</div>';
}

function showGiftDetails(batchId){
  closeModal();
  var bot=APP.bottling[batchId];
  if(!bot||!bot.gifts||!bot.gifts.length)return;
  var b=getBatch(batchId);
  var rows=bot.gifts.slice().sort(function(a,c){return(c.date||'').localeCompare(a.date||'');}).map(function(g){
    return'<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);align-items:flex-start">'
      +'<div style="flex:1"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(g.recipient)+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+fmtDate(g.date)+(g.occasion?' · '+escHtml(g.occasion):'')+'</div>'
      +(g.notes?'<div style="font-size:12px;color:var(--text2);margin-top:4px;font-style:italic">'+escHtml(g.notes)+'</div>':'')+'</div>'
      +'<div style="text-align:right"><div style="font-family:var(--font-display);font-size:16px;color:var(--gold2)">'+g.count+'</div><div style="font-size:9px;color:var(--text3);font-family:var(--font-mono)">BOTTLE'+(g.count!==1?'S':'')+'</div></div>'
      +'<button class="btn-icon" data-action="deleteGiftRecord" data-args=\''+JSON.stringify([batchId,g.id])+'\' title="Delete record">×</button>'
      +'</div>';
  }).join('');
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-overlay"><div class="modal" style="max-width:520px">'
    +'<div class="modal-title">🎁 GIFTS · '+escHtml(b?b.name:'')+'</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:8px;font-family:var(--font-mono);letter-spacing:1px">'+bot.gifts.length+' gift'+(bot.gifts.length!==1?'s':'')+' · '+bot.gifts.reduce(function(s,g){return s+g.count;},0)+' bottles total</div>'
    +rows
    +'<div class="modal-actions"><button class="btn btn-primary" data-action="closeModal">Close</button></div>'
    +'</div></div>');
}

// ==================== BOTTLING DAY GUIDED WORKFLOW ====================
// Multi-step modal walking the user through bottling: pre-flight → final gravity →
// sanitize timer → fill → label preview → save. Replaces the "form in a vacuum"
// experience with a checklist-driven flow.

var BOTTLING_STEPS=[
  {id:'preflight',title:'Pre-Flight',icon:'✓'},
  {id:'fg',title:'Final Gravity',icon:'⚗'},
  {id:'sanitize',title:'Sanitize',icon:'🧴'},
  {id:'fill',title:'Fill Bottles',icon:'🍾'},
  {id:'label',title:'Labels',icon:'🏷'},
  {id:'finish',title:'Save',icon:'✦'}
];

var bottlingWorkflowState={
  batchId:null,
  stepIdx:0,
  preflight:{},
  fg:null,
  abv:null,
  sanitizerStartedAt:null,
  sanitizerCompleted:false,
  counts:{500:0,750:0},  // per-size bottle counts
  closure:'crown',       // 'crown' | 'cork' — drives deduction + cost
  customSize:0,
  customQty:0,
  sweetness:'',
  notes:'',
  date:''
};

function startBottlingWorkflow(batchId){
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var existing=APP.bottling[batchId]||{};
  // Previously this used `APP.logs[batchId][batchId.length-1]` — indexing by
  // the batch *ID's* string length, which silently returned undefined for
  // anything other than ~24-element log arrays. Fix: index by the log array's
  // own length minus one.
  var batchLogs=getBatchLogs(batchId);
  var lastLog=batchLogs.length?batchLogs[batchLogs.length-1]:null;
  // Try to read existing per-size counts
  var existingCounts=existing.countsAtBottling?_coerceLocations(existing.countsAtBottling):{};
  var c500=existingCounts[500]||0;
  var c750=existingCounts[750]||(!existing.countsAtBottling&&existing.bottleCount?existing.bottleCount:0);
  var customSize=0,customQty=0;
  Object.keys(existingCounts).forEach(function(s){if(s!=='500'&&s!=='750'){customSize=parseInt(s);customQty=existingCounts[s];}});
  // ABV gap fix: if there's no existing.fg yet but we DO have a recent log, use
  // that log's gravity for the initial ABV estimate. Previously the workflow
  // started with abv=null on first-time bottling even though we had a valid
  // gravity reading to work from.
  var initialFg=existing.fg||(lastLog?lastLog.gravity:null);
  var initialClosure=existing.closure||'crown';
  // Restore any in-flight sanitize timer for this batch from localStorage —
  // survives page reloads / accidental modal closes so the user doesn't lose
  // the countdown mid-soak.
  var savedTimer=null;
  try{
    var raw=localStorage.getItem('meadows_sanitizeTimer');
    if(raw){
      var parsed=JSON.parse(raw);
      // Only restore if it belongs to THIS batch AND hasn't fully elapsed >5min ago
      // (anything older than 5min past the 2min duration is stale).
      if(parsed&&parsed.batchId===batchId&&parsed.startedAt){
        var ageSec=(Date.now()-parsed.startedAt)/1000;
        if(ageSec<420){savedTimer=parsed;}else{localStorage.removeItem('meadows_sanitizeTimer');}
      }
    }
  }catch(e){}
  bottlingWorkflowState={
    batchId:batchId,
    stepIdx:0,
    preflight:{bottles:false,caps:false,sanitizer:false,siphon:false,wand:false,hydrometer:false},
    fg:initialFg,
    closure:initialClosure,
    abv:existing.abv||(b.og&&initialFg?parseFloat(calcABV(b.og,initialFg)):null),
    sanitizerStartedAt:savedTimer?savedTimer.startedAt:null,
    sanitizerCompleted:savedTimer?!!savedTimer.completed:false,
    counts:{500:c500,750:c750||6},  // default 6×750ml if fresh
    customSize:customSize,
    customQty:customQty,
    sweetness:existing.sweetness||'',
    notes:existing.notes||'',
    date:existing.date||today()
  };
  renderBottlingWorkflow();
}

// Helpers for the bottling sanitize timer's localStorage persistence. Public
// so the click-handler inline can call them.
function startSanitizeTimer(){
  var s=bottlingWorkflowState;
  s.sanitizerStartedAt=Date.now();
  s.sanitizerCompleted=false;
  try{localStorage.setItem('meadows_sanitizeTimer',JSON.stringify({batchId:s.batchId,startedAt:s.sanitizerStartedAt,completed:false}));}catch(e){}
  renderBottlingWorkflow();
}
function completeSanitizeTimer(){
  bottlingWorkflowState.sanitizerCompleted=true;
  try{localStorage.removeItem('meadows_sanitizeTimer');}catch(e){}
  renderBottlingWorkflow();
}
function resetSanitizeTimer(){
  bottlingWorkflowState.sanitizerStartedAt=null;
  bottlingWorkflowState.sanitizerCompleted=false;
  try{localStorage.removeItem('meadows_sanitizeTimer');}catch(e){}
  renderBottlingWorkflow();
}

// Two distinct confirm wordings preserved as-is from the original inline
// handlers (backdrop click vs the Cancel button) rather than unified —
// this refactor doesn't change behavior/copy, just how it's wired up.
function _closeBottlingWorkflowBackdrop(){
  if(confirm('Cancel bottling workflow? Progress will be lost.'))closeModal();
}
function _cancelBottlingWorkflow(){
  if(confirm('Cancel bottling workflow?'))closeModal();
}
function renderBottlingWorkflow(){
  closeModal();
  var s=bottlingWorkflowState;
  var b=getBatch(s.batchId);
  if(!b)return;
  var step=BOTTLING_STEPS[s.stepIdx];
  // Stepper header
  var stepper=BOTTLING_STEPS.map(function(st,i){
    var done=i<s.stepIdx,active=i===s.stepIdx;
    return'<div style="display:flex;align-items:center;gap:6px;flex:1;opacity:'+(active?1:done?0.7:0.4)+'"><div style="width:24px;height:24px;border-radius:12px;background:'+(done?'var(--green2)':active?'var(--gold)':'var(--bg4)')+';color:'+(done||active?'#0a0a0b':'var(--text3)')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">'+(done?'✓':st.icon)+'</div><div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;color:'+(active?'var(--gold2)':'var(--text3)')+'">'+st.title.toUpperCase()+'</div>'+(i<BOTTLING_STEPS.length-1?'<div style="flex:1;height:1px;background:var(--border)"></div>':'')+'</div>';
  }).join('');
  var content=renderBottlingStepContent(step.id,s,b);
  var canPrev=s.stepIdx>0;
  var canNext=canAdvanceBottlingStep(step.id,s);
  var isLast=s.stepIdx===BOTTLING_STEPS.length-1;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="modal-overlay modal-static" data-backdrop-action="_closeBottlingWorkflowBackdrop"><div class="modal" style="max-width:640px;max-height:90vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">🍾 GUIDED BOTTLING · '+escHtml(b.name)+'</div>'
    +'<div style="display:flex;gap:0;align-items:center;margin-bottom:18px">'+stepper+'</div>'
    +'<div style="flex:1;overflow-y:auto">'+content+'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px">'
    +(canPrev?'<button class="btn btn-secondary" data-action="bottlingPrevStep">← Back</button>':'<span></span>')
    +'<button class="btn btn-secondary" data-action="_cancelBottlingWorkflow">Cancel</button>'
    +(isLast?'<button class="btn btn-primary" data-action="finishBottlingWorkflow">✦ Complete Bottling</button>':'<button class="btn btn-primary" id="bw-next-btn" data-action="bottlingNextStep" '+(canNext?'':'disabled style="opacity:0.4;cursor:not-allowed"')+'>Next →</button>')
    +'</div></div></div>');
}

function _stampBottlingAbvAndDownloadLabel(batchId,abv){
  var tempBot={abv:abv||0};
  APP.bottling[batchId]=Object.assign({},APP.bottling[batchId]||{},tempBot);
  downloadLabel(batchId);
}
function _stampBottlingAbvAndPrintLabel(batchId,abv){
  var tempBot={abv:abv||0};
  APP.bottling[batchId]=Object.assign({},APP.bottling[batchId]||{},tempBot);
  printLabel(batchId);
}
function renderBottlingStepContent(stepId,s,b){
  if(stepId==='preflight'){
    var items=[
      {key:'bottles',label:'Bottles cleaned and dry',hint:'~'+Math.max(1,Math.ceil((b.volume||5)*1000/750))+' × 750ml or more — exact mix of sizes is decided at the Fill step'},
      {key:'caps',label:'Caps / corks ready',hint:'Crown caps, corks, or swing-tops — your choice'},
      {key:'sanitizer',label:'Sanitizer mixed ('+getSanitizer().name+')',hint:'~'+getSanitizer().mlPerL+' ml per litre water'},
      {key:'siphon',label:'Auto-siphon / racking cane',hint:'Clean and ready to deploy'},
      {key:'wand',label:'Bottling wand or filler',hint:'For controlled bottle filling'},
      {key:'hydrometer',label:'Hydrometer (for final gravity)',hint:'Take a final reading before bottling'}
    ];
    var rows=items.map(function(it){
      return'<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;cursor:pointer;border-bottom:1px solid var(--border)">'
        +'<input type="checkbox" '+(s.preflight[it.key]?'checked':'')+' onchange="bottlingWorkflowState.preflight[\''+it.key+'\']=this.checked;renderBottlingWorkflow()" style="margin-top:3px;cursor:pointer;width:18px;height:18px">'
        +'<div><div style="font-size:14px;color:var(--text)">'+escHtml(it.label)+'</div><div style="font-size:11px;color:var(--text3);font-style:italic">'+escHtml(it.hint)+'</div></div>'
        +'</label>';
    }).join('');
    var allChecked=items.every(function(it){return s.preflight[it.key];});
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Confirm everything is ready before you start. Bottling day rewards preparation — once the siphon is running, you don\'t want to be hunting for sanitizer.</div>'+rows
      +'<div style="margin-top:14px;padding:10px;background:'+(allChecked?'#0d1f12':'var(--bg4)')+';border-left:3px solid '+(allChecked?'var(--green)':'var(--gold)')+';border-radius:var(--radius);font-size:12px;color:'+(allChecked?'var(--green2)':'var(--text2)')+'">'
      +(allChecked?'✓ All ready. Click Next to continue.':'Complete the checklist to proceed.')
      +'</div>';
  }
  if(stepId==='fg'){
    var ogText=b.og?b.og.toFixed(3):'—';
    var lastLog=(APP.logs[b.id]&&APP.logs[b.id].length)?APP.logs[b.id][APP.logs[b.id].length-1]:null;
    var calcedAbv=(b.og&&s.fg)?calcABV(b.og,s.fg):'—';
    var sig=(typeof mwBatchSignals==='function')?mwBatchSignals(b):null;
    var stableWarning='';
    if(sig&&!sig.gravityConfirmedStable){
      stableWarning=sig.sparkling
        ?'<div style="margin-bottom:12px;padding:10px 12px;border-radius:var(--radius);border-left:3px solid var(--red2);background:rgba(176,58,46,0.1);font-size:12.5px;color:var(--text2);line-height:1.55"><strong style="color:var(--red2)">⚠ Not confirmed stable yet.</strong> No two logged readings 5+ days apart agree — this is a sparkling recipe, and priming on top of leftover fermentable sugar is the most common real cause of bottle bombs. Log one more reading a few days out before bottling if you can.</div>'
        :'<div style="margin-bottom:12px;padding:10px 12px;border-radius:var(--radius);border-left:3px solid #e0843c;background:rgba(224,132,60,0.08);font-size:12.5px;color:var(--text2);line-height:1.55"><strong style="color:#e0843c">⚠ Not confirmed stable yet.</strong> No two logged readings 5+ days apart agree yet. Bottling before fermentation genuinely finishes is the #1 real cause of bottle bombs, especially if you plan to backsweeten. Consider logging one more reading first.</div>';
    }else if(sig&&sig.gravityConfirmedStable){
      stableWarning='<div style="margin-bottom:12px;padding:8px 12px;border-radius:var(--radius);border-left:3px solid var(--green);background:rgba(45,106,79,0.08);font-size:12px;color:var(--green2)">✓ Confirmed stable — two logged readings 5+ days apart agree.</div>';
    }
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Take your final hydrometer reading. The batch should be at terminal gravity — no drop in 48-72 hours.</div>'
      +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:14px">'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center">'
      +'<div><div style="font-family:var(--font-display);font-size:20px;color:var(--blue2)">'+ogText+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">ORIGINAL</div></div>'
      +'<div><div id="bw-fg-val" style="font-family:var(--font-display);font-size:20px;color:var(--gold2)">'+(s.fg?s.fg.toFixed(3):'—')+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">FINAL</div></div>'
      +'<div><div id="bw-abv-val" style="font-family:var(--font-display);font-size:20px;color:var(--green2)">'+calcedAbv+'%</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">ABV</div></div>'
      +'</div></div>'
      +stableWarning
      +(lastLog?'<div style="font-size:12px;color:var(--text3);margin-bottom:10px;font-style:italic">Last logged gravity: '+lastLog.gravity+' on '+fmtDate(lastLog.date)+(daysSince(lastLog.date)<3?' — fresh, good to use':' — consider taking a new reading')+'</div>':'')
      +'<div class="form-row"><div class="form-group"><label class="form-label">Final Gravity</label><input class="form-input" type="number" step="0.001" id="bw-fg-input" value="'+(s.fg||'')+'" oninput="updateBwFG(this.value)"></div>'
      +'<div class="form-group"><label class="form-label">Manual ABV Override (optional)</label><input class="form-input" type="number" step="0.1" id="bw-abv-input" value="'+(s.abv||'')+'" oninput="updateBwAbvOverride(this.value)"></div></div>';
  }
  if(stepId==='sanitize'){
    var elapsed=s.sanitizerStartedAt?Math.floor((Date.now()-s.sanitizerStartedAt)/1000):0;
    var duration=120; // 2 minutes
    var remaining=Math.max(0,duration-elapsed);
    var mm=Math.floor(remaining/60),ss=remaining%60;
    var progress=Math.min(100,(elapsed/duration)*100);
    var running=s.sanitizerStartedAt&&!s.sanitizerCompleted&&remaining>0;
    if(running){
      // Schedule a re-render
      setTimeout(function(){if(bottlingWorkflowState.sanitizerStartedAt===s.sanitizerStartedAt&&!bottlingWorkflowState.sanitizerCompleted)renderBottlingWorkflow();},1000);
    }
    if(remaining===0&&s.sanitizerStartedAt&&!s.sanitizerCompleted){
      bottlingWorkflowState.sanitizerCompleted=true;
      try{localStorage.removeItem('meadows_sanitizeTimer');}catch(e){}
    }
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Sanitize all bottles, caps, siphon, and wand. StarSan needs ~30 seconds of contact time, but 2 minutes covers all surfaces with margin.</div>'
      +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius2);padding:24px;text-align:center;margin-bottom:14px">'
      +'<div style="font-family:var(--font-display);font-size:56px;color:'+(s.sanitizerCompleted?'var(--green2)':running?'var(--gold2)':'var(--text3)')+';line-height:1">'+(s.sanitizerCompleted?'DONE':((mm<10?'0':'')+mm+':'+(ss<10?'0':'')+ss))+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:2px;margin-top:8px">'+(s.sanitizerCompleted?'✓ SANITIZATION COMPLETE':running?'SANITIZING — KEEP IN CONTACT':'2-MINUTE TIMER')+'</div>'
      +(running||s.sanitizerCompleted?'<div style="margin-top:14px;height:6px;background:var(--bg4);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+progress+'%;background:linear-gradient(90deg,var(--gold),var(--green2));transition:width 1s linear"></div></div>':'')
      +'</div>'
      +(!s.sanitizerStartedAt?'<button class="btn btn-primary" style="width:100%" data-action="startSanitizeTimer">▶ Start 2-Minute Timer</button>':'')
      +(running?'<button class="btn btn-secondary" style="width:100%" data-action="completeSanitizeTimer">Skip — Already Done</button>':'')
      +(s.sanitizerCompleted?'<div style="padding:10px;background:#0d1f12;border-left:3px solid var(--green);border-radius:var(--radius);font-size:12px;color:var(--green2);margin-bottom:8px">✓ Sanitization complete. Drain bottles and proceed to filling.</div><button class="btn btn-secondary btn-sm" data-action="resetSanitizeTimer">↻ Reset Timer</button>':'');
  }
  if(stepId==='fill'){
    var totalBot=s.counts[500]+s.counts[750]+(s.customSize>0?s.customQty:0);
    var totalMl=s.counts[500]*500+s.counts[750]*750+(s.customSize>0?s.customQty*s.customSize:0);
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Siphon into your sanitized bottles. Fill to the bottom of the bottle neck (~25mm headspace). Cap or cork immediately. Wipe drips before they become sticky regrets.</div>'
      +'<div class="form-group"><label class="form-label">Bottling Date</label><input class="form-input" type="date" id="bw-date" value="'+s.date+'" onchange="bottlingWorkflowState.date=this.value"></div>'
      +'<div style="margin:8px 0 4px;font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">BOTTLE COUNTS BY SIZE</div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">🍶 500 ml bottles</label><input class="form-input" type="number" min="0" id="bw-count-500" value="'+(s.counts[500]||'')+'" oninput="updateBwFillCount()"></div>'
      +'<div class="form-group"><label class="form-label">🍷 750 ml bottles</label><input class="form-input" type="number" min="0" id="bw-count-750" value="'+(s.counts[750]||'')+'" oninput="updateBwFillCount()"></div></div>'
      +'<details style="margin-bottom:10px"'+(s.customSize>0||s.customQty>0?' open':'')+'><summary style="cursor:pointer;font-size:12px;color:var(--text3);padding:4px 0">+ Custom bottle size</summary>'
      +'<div class="form-row" style="margin-top:6px"><div class="form-group"><label class="form-label">Custom size (ml)</label><input class="form-input" type="number" min="100" id="bw-custom-size" value="'+(s.customSize||'')+'" oninput="updateBwFillCount()"></div>'
      +'<div class="form-group"><label class="form-label">Quantity</label><input class="form-input" type="number" min="0" id="bw-custom-qty" value="'+(s.customQty||'')+'" oninput="updateBwFillCount()"></div></div>'
      +'</details>'
      +'<div id="bw-total-info" style="padding:10px 12px;background:var(--bg4);border-left:3px solid var(--gold);border-radius:var(--radius);margin-bottom:10px;font-family:var(--font-mono);font-size:13px;color:var(--gold2);'+(totalBot>0?'':'display:none')+'">TOTAL: '+totalBot+' bottle'+(totalBot!==1?'s':'')+' · '+(totalMl/1000).toFixed(2)+' L</div>'
      +'<div class="form-group"><label class="form-label">Final Sweetness Profile</label><select class="form-select" id="bw-sweetness" onchange="bottlingWorkflowState.sweetness=this.value">'
      +sweetnessOptionLabels(b.beverageType).map(function(o){return'<option value="'+o+'"'+(s.sweetness===o?' selected':'')+'>'+(o||'(set after tasting)')+'</option>';}).join('')
      +'</select><div style="font-size:11px;color:var(--text3);margin-top:4px">'+_bottlingSweetHintHtml(s.fg,b.beverageType)+'</div>'
      +((typeof mwBatchSignals==='function'&&mwBatchSignals(b).sparkling)?'<button type="button" class="btn btn-secondary btn-sm" style="margin-top:6px" data-action="openCarbonationCalcForBatch" data-args=\''+JSON.stringify([b.id])+'\'>🍾 Priming Calculator</button>':'')
      +'</div>'
      +'<div class="form-group"><label class="form-label">Closure</label><select class="form-select" id="bw-closure" onchange="bottlingWorkflowState.closure=this.value">'
      +'<option value="crown"'+((s.closure||'crown')==='crown'?' selected':'')+'>⭕ Crown caps</option>'
      +'<option value="cork"'+(s.closure==='cork'?' selected':'')+'>🪵 Corks</option>'
      +'<option value="swing-top"'+(s.closure==='swing-top'?' selected':'')+'>🔒 Swing-top</option>'
      +'</select><div style="font-size:11px;color:var(--text3);margin-top:4px">Bottles and closures are deducted from Supplies (when tracked) and priced into the batch cost breakdown.</div></div>'
      +'<div class="form-group"><label class="form-label">Bottling Notes (optional)</label><textarea class="form-textarea" id="bw-notes" oninput="bottlingWorkflowState.notes=this.value" placeholder="Bottle type used, cap/cork, anything unusual…">'+escHtml(s.notes)+'</textarea></div>'
      +'<div id="bw-cellar-info" style="padding:10px;background:var(--bg4);border-left:3px solid var(--gold);border-radius:var(--radius);font-size:12px;color:var(--text2);margin-top:8px;'+(totalBot>0?'':'display:none')+'">All '+totalBot+' bottle'+(totalBot!==1?'s':'')+' will land in the cellar by default. You can split into fridge/gifted/other from the Cellar view later.</div>';
  }
  if(stepId==='label'){
    var recipe=getRecipe(b.recipeId);
    var abvForLabel=s.abv||(b.og&&s.fg?parseFloat(calcABV(b.og,s.fg)):null);
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Your label is ready. Save as PNG, print directly, or skip if you\'ll label later. The ABV is baked into the hexagon — no separate sticker needed.</div>'
      +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius2);padding:14px;margin-bottom:14px;text-align:center">'
      +renderBatchLabel(recipe?recipe.id:'r1',abvForLabel||0,{batch:b})
      +'</div>'
      +'<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'
      +'<button class="btn btn-secondary" data-action="_stampBottlingAbvAndDownloadLabel" data-args=\''+JSON.stringify([b.id,abvForLabel||0])+'\'>⬇ Save PNG</button>'
      +'<button class="btn btn-secondary" data-action="_stampBottlingAbvAndPrintLabel" data-args=\''+JSON.stringify([b.id,abvForLabel||0])+'\'>🖨 Print</button>'
      +'<button class="btn btn-secondary" data-action="bottlingNextStep">Skip for Now</button>'
      +'</div>';
  }
  if(stepId==='finish'){
    var recipe=getRecipe(b.recipeId);
    var totalBot=s.counts[500]+s.counts[750]+(s.customSize>0?s.customQty:0);
    var totalMl=s.counts[500]*500+s.counts[750]*750+(s.customSize>0?s.customQty*s.customSize:0);
    var sizeParts=[];
    if(s.counts[500]>0)sizeParts.push(s.counts[500]+' × 500ml');
    if(s.counts[750]>0)sizeParts.push(s.counts[750]+' × 750ml');
    if(s.customSize>0&&s.customQty>0)sizeParts.push(s.customQty+' × '+s.customSize+'ml');
    return'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Review your bottling record. Clicking <strong>Complete Bottling</strong> saves everything, puts all '+totalBot+' bottle'+(totalBot!==1?'s':'')+' in the cellar, and marks the batch as bottled.</div>'
      +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius2);padding:18px">'
      +'<div style="font-family:var(--font-display);font-size:18px;color:var(--gold2);margin-bottom:10px;letter-spacing:2px">'+escHtml(b.name)+'</div>'
      +'<table style="width:100%;font-size:13px">'
      +'<tr><td style="color:var(--text3);padding:4px 0">Style</td><td style="color:var(--text2)">'+escHtml(recipe?recipe.style:'Custom')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Bottling Date</td><td style="color:var(--text2)">'+fmtDate(s.date)+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Original Gravity</td><td style="color:var(--text2);font-family:var(--font-mono)">'+(b.og||'—')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Final Gravity</td><td style="color:var(--text2);font-family:var(--font-mono)">'+(s.fg||'—')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">ABV</td><td style="color:var(--green2);font-family:var(--font-mono)">'+(s.abv||(b.og&&s.fg?calcABV(b.og,s.fg):'—'))+'%</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Bottles Filled</td><td style="color:var(--gold2);font-family:var(--font-display);font-size:16px">'+totalBot+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Sizes</td><td style="color:var(--text2);font-size:12px">'+sizeParts.join(' + ')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Closure</td><td style="color:var(--text2)">'+((s.closure||'crown')==='cork'?'🪵 Corks':'⭕ Crown caps')+'</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Total Volume</td><td style="color:var(--text2);font-family:var(--font-mono)">'+(totalMl/1000).toFixed(2)+' L</td></tr>'
      +'<tr><td style="color:var(--text3);padding:4px 0">Sweetness</td><td style="color:var(--text2)">'+(s.sweetness||'(unset)')+'</td></tr>'
      +'</table>'
      +(s.notes?'<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:12px;color:var(--text2);font-style:italic">'+escHtml(s.notes)+'</div>':'')
      +'</div>';
  }
  return'';
}

function canAdvanceBottlingStep(stepId,s){
  if(stepId==='preflight')return Object.keys(s.preflight).every(function(k){return s.preflight[k];});
  if(stepId==='fg')return s.fg!=null&&s.fg>=0.98&&s.fg<=1.2;
  if(stepId==='sanitize')return s.sanitizerCompleted;
  if(stepId==='fill'){
    var totalBot=s.counts[500]+s.counts[750]+(s.customSize>0?s.customQty:0);
    return totalBot>0;
  }
  if(stepId==='label')return true;
  return true;
}

// Targeted UI updates that DON'T re-render the modal (preserves input focus while typing).
function updateBwNextButton(){
  var btn=document.getElementById('bw-next-btn');
  if(!btn)return;
  var step=BOTTLING_STEPS[bottlingWorkflowState.stepIdx];
  var ok=canAdvanceBottlingStep(step.id,bottlingWorkflowState);
  if(ok){btn.removeAttribute('disabled');btn.style.opacity='1';btn.style.cursor='pointer';}
  else{btn.setAttribute('disabled','disabled');btn.style.opacity='0.4';btn.style.cursor='not-allowed';}
}

function updateBwFG(val){
  var s=bottlingWorkflowState;
  var b=getBatch(s.batchId);
  s.fg=parseFloat(val);if(isNaN(s.fg))s.fg=null;
  s.abv=(b&&b.og&&s.fg)?parseFloat(calcABV(b.og,s.fg)):null;
  var fgEl=document.getElementById('bw-fg-val');
  var abvEl=document.getElementById('bw-abv-val');
  if(fgEl)fgEl.textContent=s.fg?s.fg.toFixed(3):'—';
  if(abvEl)abvEl.textContent=(s.abv!=null?s.abv.toFixed(1):'—')+'%';
  updateBwNextButton();
}

function updateBwAbvOverride(val){
  var s=bottlingWorkflowState;
  var v=parseFloat(val);
  if(!isNaN(v))s.abv=v;
  else{
    var b=getBatch(s.batchId);
    s.abv=(b&&b.og&&s.fg)?parseFloat(calcABV(b.og,s.fg)):null;
  }
  var abvEl=document.getElementById('bw-abv-val');
  if(abvEl)abvEl.textContent=(s.abv!=null?s.abv.toFixed(1):'—')+'%';
}

function updateBwFillCount(){
  var s=bottlingWorkflowState;
  var i500=document.getElementById('bw-count-500');
  var i750=document.getElementById('bw-count-750');
  var ics=document.getElementById('bw-custom-size');
  var icq=document.getElementById('bw-custom-qty');
  s.counts[500]=i500?(parseInt(i500.value)||0):0;
  s.counts[750]=i750?(parseInt(i750.value)||0):0;
  s.customSize=ics?(parseInt(ics.value)||0):0;
  s.customQty=icq?(parseInt(icq.value)||0):0;
  var totalBot=s.counts[500]+s.counts[750]+(s.customSize>0?s.customQty:0);
  var totalMl=s.counts[500]*500+s.counts[750]*750+(s.customSize>0?s.customQty*s.customSize:0);
  var totalEl=document.getElementById('bw-total-info');
  var cellarEl=document.getElementById('bw-cellar-info');
  if(totalEl){
    if(totalBot>0){totalEl.style.display='';totalEl.textContent='TOTAL: '+totalBot+' bottle'+(totalBot!==1?'s':'')+' · '+(totalMl/1000).toFixed(2)+' L';}
    else{totalEl.style.display='none';}
  }
  if(cellarEl){
    if(totalBot>0){cellarEl.style.display='';cellarEl.textContent='All '+totalBot+' bottle'+(totalBot!==1?'s':'')+' will land in the cellar by default. You can split into fridge/gifted/other from the Cellar view later.';}
    else{cellarEl.style.display='none';}
  }
  updateBwNextButton();
}

function bottlingNextStep(){
  if(bottlingWorkflowState.stepIdx<BOTTLING_STEPS.length-1){
    bottlingWorkflowState.stepIdx++;
    renderBottlingWorkflow();
  }
}

function bottlingPrevStep(){
  if(bottlingWorkflowState.stepIdx>0){
    bottlingWorkflowState.stepIdx--;
    renderBottlingWorkflow();
  }
}

// Deduct bottles (per size) and closures from tracked supplies, returning a
// cost breakdown for the batch economics card. Untracked items are listed
// with zero cost — packaging stock-keeping is optional.
function consumePackagingSupplies(countsBySize,totalBottles,closure){
  // Mirror batch-start behaviour: only actually deduct stock when the
  // "auto-deduct supplies" setting is on. Packaging cost is still computed for
  // the bottling record either way.
  var autoDeduct=!(APP.settings&&APP.settings.autoDeductSupplies===false);
  var items=[];var cost=0;
  function take(typeKey,qty,label){
    if(qty<=0)return;
    var sup=(APP.supplies||[]).find(function(x){return x.type===typeKey;});
    var price=sup?(parseFloat(sup.pricePerUnit)||0):0;
    if(sup&&autoDeduct){
      var have=parseFloat(sup.qty)||0;
      sup.qty=Math.max(0,have-qty);
      if(have<qty)toast('⚠ Supplies: only '+have+' '+label+' tracked — stock set to 0');
    }
    items.push({label:label,qty:qty,cost:Math.round(price*qty*100)/100,tracked:!!sup&&autoDeduct});
    cost+=price*qty;
  }
  Object.keys(countsBySize||{}).forEach(function(size){
    var n=parseInt(countsBySize[size])||0;
    var sz=parseInt(size);
    if(sz===750)take('bottle750',n,'750 ml bottles');
    else if(sz===500)take('bottle500',n,'500 ml bottles');
    else if(n>0)items.push({label:sz+' ml bottles',qty:n,cost:0,tracked:false});
  });
  take(closure==='cork'?'cork':'crowncap',totalBottles,closure==='cork'?'corks':'crown caps');
  return{items:items,cost:Math.round(cost*100)/100};
}

function finishBottlingWorkflow(){
  var s=bottlingWorkflowState;
  var b=getBatch(s.batchId);
  // Build size counts map
  var countsAtBottling={};
  if(s.counts[500]>0)countsAtBottling[500]=s.counts[500];
  if(s.counts[750]>0)countsAtBottling[750]=s.counts[750];
  if(s.customSize>0&&s.customQty>0)countsAtBottling[s.customSize]=s.customQty;
  var total=Object.keys(countsAtBottling).reduce(function(s2,k){return s2+countsAtBottling[k];},0);
  // Packaging: deduct bottles + closures from supplies and price them.
  var packaging=consumePackagingSupplies(countsAtBottling,total,s.closure||'crown');
  // Locations: everything in cellar at first
  var locations={cellar:{},fridge:{},gifted:{},other:{}};
  Object.keys(countsAtBottling).forEach(function(size){
    locations.cellar[parseInt(size)]=countsAtBottling[size];
  });
  // Commit
  var existing=APP.bottling[s.batchId]||{};
  APP.bottling[s.batchId]={
    date:s.date||today(),
    bottleCount:total,
    bottlesAtBottling:total,
    countsAtBottling:countsAtBottling,
    bottleSizes:Object.keys(countsAtBottling).map(function(k){return parseInt(k);}).sort(function(a,c){return a-c;}),
    locations:locations,
    fg:s.fg,
    abv:s.abv||(b&&b.og&&s.fg?parseFloat(calcABV(b.og,s.fg)):null),
    sweetness:s.sweetness,
    notes:s.notes,
    closure:s.closure||'crown',
    packaging:packaging,
    gifts:existing.gifts||[]
  };
  closeModal();
  scheduleSave();
  toast('✦ Bottling complete · '+total+' bottle'+(total!==1?'s':'')+' in the cellar'+(packaging.cost>0?' · '+(APP.settings.currency||'€')+packaging.cost.toFixed(2)+' packaging':''));
  showView('cellar');
}
