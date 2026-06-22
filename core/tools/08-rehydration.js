// ==========================================================================
// Yeast rehydration timer.
// Split out of the former 08-tools.js. Globals, no behaviour change.
// ==========================================================================

// ==================== YEAST REHYDRATION TIMER ====================
// Go-Ferm Sterol Flash protocol: rehydrate yeast in 43°C water with Go-Ferm
// to maximize viability, then cool to within 10°C of must temp before pitching.
// Improves yeast health significantly for high-OG batches and stressed
// fermentation conditions. M05 sprinkles directly — skip for M05.
//
// State machine: 6 steps, each with checklist + optional timer. State persists
// to localStorage so reloading doesn't lose the in-flight workflow.

function openYeastRehydrationModal(){
  // Restore in-flight workflow if present (<2h old)
  var saved=null;
  try{
    var raw=localStorage.getItem('meadows_yeastRehydration');
    if(raw){
      var parsed=JSON.parse(raw);
      if(parsed&&parsed.startedAt&&(Date.now()-parsed.startedAt)<7200000)saved=parsed;
      else localStorage.removeItem('meadows_yeastRehydration');
    }
  }catch(e){}
  window._yeastRehydration=saved||{
    startedAt:Date.now(),
    yeastGrams:5,       // typical sachet sub-dose
    mustTemp:20,        // target must temp °C
    stepIdx:0,
    stepStartTimes:{}   // ts when each timed step started
  };
  renderYeastRehydrationModal();
}

function persistYeastRehydration(){
  try{localStorage.setItem('meadows_yeastRehydration',JSON.stringify(window._yeastRehydration));}catch(e){}
}

function setYeastRehydrationStep(stepIdx){
  window._yeastRehydration.stepIdx=stepIdx;
  // Stamp the start of this step (used to drive timers)
  if(!window._yeastRehydration.stepStartTimes[stepIdx]){
    window._yeastRehydration.stepStartTimes[stepIdx]=Date.now();
  }
  persistYeastRehydration();
  renderYeastRehydrationModal();
}

function resetYeastRehydration(){
  if(!confirm('Reset the rehydration workflow? In-progress state will be lost.'))return;
  try{localStorage.removeItem('meadows_yeastRehydration');}catch(e){}
  window._yeastRehydration=null;
  closeModal();
}

function renderYeastRehydrationModal(){
  closeModal();
  var s=window._yeastRehydration;
  if(!s)return;
  // Compute Go-Ferm dose: 1.25 g per g of yeast
  var goferm=(s.yeastGrams*1.25).toFixed(1);
  // Water volume: 20× yeast weight (so 5g yeast → 100ml water)
  var waterMl=(s.yeastGrams*20).toFixed(0);

  var steps=[
    {
      title:'Confirm inputs',
      detail:'Adjust if you\'re rehydrating a different amount of yeast or pitching to a different temperature.',
      content:function(){
        return'<div class="form-row">'
          +'<div class="form-group"><label class="form-label">Yeast (grams)</label><input class="form-input" type="number" min="1" max="30" step="0.5" value="'+s.yeastGrams+'" oninput="window._yeastRehydration.yeastGrams=parseFloat(this.value)||5;persistYeastRehydration();renderYeastRehydrationModal()"></div>'
          +'<div class="form-group"><label class="form-label">Target must temp (°C)</label><input class="form-input" type="number" min="10" max="30" step="0.5" value="'+s.mustTemp+'" oninput="window._yeastRehydration.mustTemp=parseFloat(this.value)||20;persistYeastRehydration()"></div>'
          +'</div>'
          +'<div style="background:var(--bg);border-radius:var(--radius);padding:12px;margin-top:8px;font-size:13px;line-height:1.7">'
          +'<div><strong>Computed doses:</strong></div>'
          +'<div>· Water: <span style="font-family:var(--font-mono);color:var(--gold2)">'+waterMl+' ml</span> heated to <span style="font-family:var(--font-mono);color:var(--gold2)">43°C</span></div>'
          +'<div>· Go-Ferm Protect: <span style="font-family:var(--font-mono);color:var(--gold2)">'+goferm+' g</span> (1.25 g per g of yeast)</div>'
          +'<div>· Yeast: <span style="font-family:var(--font-mono);color:var(--gold2)">'+s.yeastGrams+' g</span></div>'
          +'</div>';
      },
      timer:null
    },
    {
      title:'Heat water + dissolve Go-Ferm',
      detail:'Heat '+waterMl+' ml of filtered/dechlorinated water to 43°C (109°F). Stir in '+goferm+' g of Go-Ferm Protect until fully dissolved. Temperature precision matters here — use a thermometer.',
      content:function(){
        return'<div class="info-box" style="border-left-color:var(--gold2)"><div style="font-size:13px;line-height:1.65"><strong>Why 43°C?</strong> Below 40°C the cell membranes won\'t become permeable enough to absorb Go-Ferm\'s sterols. Above 46°C cell death starts. The window is tight.</div></div>';
      },
      timer:null
    },
    {
      title:'Sprinkle yeast on water',
      detail:'Gently sprinkle '+s.yeastGrams+' g of yeast across the entire surface of the Go-Ferm water. Do NOT stir yet. Let it sit undisturbed for 15 minutes.',
      content:function(){
        return'<div class="info-box" style="border-left-color:var(--gold2)"><div style="font-size:13px;line-height:1.65">The yeast will absorb water and bloom. Disturbing it early prevents proper rehydration.</div></div>';
      },
      timer:15*60 // 15 min in seconds
    },
    {
      title:'Stir gently',
      detail:'After 15 minutes of resting, swirl the container gently to form a uniform slurry. Should be creamy, not chunky.',
      content:function(){
        return'<div class="info-box" style="border-left-color:var(--gold2)"><div style="font-size:13px;line-height:1.65">If you see chunks or dry yeast, give it another 5 minutes — yeast must be fully hydrated before the next step.</div></div>';
      },
      timer:null
    },
    {
      title:'Acclimate to must temperature',
      detail:'Your slurry is at ~38°C; your must is at '+s.mustTemp+'°C. You need to close that gap to within 10°C BEFORE pitching, or thermal shock kills 20-50% of the yeast. Add a splash of cool must to the slurry every 5 minutes, gently mixing each time.',
      content:function(){
        var deltaTime=Math.ceil(Math.max(0,(38-s.mustTemp-10))/2)*5; // rough estimate
        return'<div class="info-box" style="border-left-color:var(--gold2)"><div style="font-size:13px;line-height:1.65"><strong>Suggested protocol:</strong> add ~50 ml of must to the slurry every 5 minutes for ~'+deltaTime+' minutes (until slurry is within 10°C of must temp). Then pitch.</div></div>';
      },
      timer:20*60
    },
    {
      title:'Pitch + done',
      detail:'Pour the acclimated slurry into the must. Stir gently to incorporate. Cap the fermenter, attach the airlock. First signs of fermentation should appear in 12-48 hours.',
      content:function(){
        return'<div class="info-box" style="border-left-color:var(--green2);background:rgba(122,160,64,0.10)"><div style="font-size:13px;line-height:1.65"><strong>You\'re done.</strong> Log your batch start now if you haven\'t — and remember to schedule the first SNA / TOSNA dose for 24h from now.</div></div>'
          +'<div style="margin-top:14px;text-align:center"><button class="btn btn-secondary btn-sm" onclick="resetYeastRehydration()">↻ Reset workflow</button></div>';
      },
      timer:null
    }
  ];

  var step=steps[s.stepIdx];
  var stepStart=s.stepStartTimes[s.stepIdx];
  var timerBlock='';
  if(step.timer&&stepStart){
    var elapsed=Math.floor((Date.now()-stepStart)/1000);
    var remaining=Math.max(0,step.timer-elapsed);
    var mins=Math.floor(remaining/60),secs=remaining%60;
    var done=remaining===0;
    timerBlock='<div style="background:'+(done?'rgba(122,160,64,0.12)':'rgba(232,196,106,0.10)')+';border-left:3px solid '+(done?'var(--green2)':'var(--gold2)')+';border-radius:var(--radius);padding:12px;margin:14px 0;text-align:center">'
      +'<div style="font-family:var(--font-display);font-size:36px;color:'+(done?'var(--green2)':'var(--gold2)')+';font-variant-numeric:tabular-nums">'+(done?'✓':String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0'))+'</div>'
      +'<div class="micro-label">'+(done?'TIMER ELAPSED — PROCEED':'TIMER RUNNING')+'</div>'
      +'</div>';
    // Auto-refresh while timer is running
    if(!done){
      setTimeout(function(){
        if(window._yeastRehydration&&window._yeastRehydration.stepIdx===s.stepIdx&&document.querySelector('.modal'))renderYeastRehydrationModal();
      },1000);
    }
  }else if(step.timer){
    timerBlock='<button class="btn btn-secondary" onclick="window._yeastRehydration.stepStartTimes['+s.stepIdx+']=Date.now();persistYeastRehydration();renderYeastRehydrationModal()" style="width:100%;margin:12px 0">▶ Start '+(step.timer/60)+'-minute timer</button>';
  }

  // Step pip strip
  var pips=steps.map(function(_,i){
    var isActive=i===s.stepIdx;
    var isDone=i<s.stepIdx;
    return'<div onclick="setYeastRehydrationStep('+i+')" style="flex:1;height:6px;background:'+(isDone?'var(--green2)':isActive?'var(--gold2)':'var(--bg4)')+';border-radius:3px;cursor:pointer;transition:background 0.2s" title="Step '+(i+1)+': '+escHtml(steps[i].title)+'"></div>';
  }).join('');

  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:680px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">🧫 YEAST REHYDRATION · STEP '+(s.stepIdx+1)+' OF '+steps.length+'</div>'
    +'<div style="display:flex;gap:4px;margin-bottom:14px">'+pips+'</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'
    +'<div style="font-family:var(--font-display);font-size:18px;color:var(--gold2);margin-bottom:8px">'+escHtml(step.title)+'</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.65">'+escHtml(step.detail)+'</div>'
    +step.content()
    +timerBlock
    +'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px;gap:8px">'
    +(s.stepIdx>0?'<button class="btn btn-secondary" onclick="setYeastRehydrationStep('+(s.stepIdx-1)+')">← Back</button>':'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>')
    +(s.stepIdx<steps.length-1?'<button class="btn btn-primary" onclick="setYeastRehydrationStep('+(s.stepIdx+1)+')">Next →</button>':'<button class="btn btn-primary" onclick="resetYeastRehydration()">Finish</button>')
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function computeTOSNADoses(volumeL,og){
  // Match the same rule used by getEffectiveSteps so the plan you see matches
  // the schedule the coach will produce: ~1 g per L at OG 1.100, scaled.
  var totalGrams=Math.max(2,volumeL*(og-1)*10);
  var perDose=Math.round((totalGrams/4)*10)/10;
  return{totalGrams:Math.round(totalGrams*10)/10,perDose:perDose};
}

function renderTOSNAPlan(){
  var sel=document.getElementById('tp-batch');
  var out=document.getElementById('tp-output');
  if(!sel||!out)return;
  var batchId=sel.value;
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){out.innerHTML='';return;}
  var vol=parseFloat(b.volume)||5;
  var og=parseFloat(b.og)||1.095;
  var doses=computeTOSNADoses(vol,og);

  // Build the schedule dates. Day 0 = batch.startDate. We compute calendar
  // dates so the user can read "Wed 12 Jun" etc.
  var startDate=new Date(b.startDate);
  var dayLabel=function(d){
    var dt=new Date(startDate.getTime()+d*86400000);
    return dt.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'});
  };
  var daysSinceStart=Math.floor((Date.now()-startDate.getTime())/86400000);

  var schedule=[
    {day:1,title:'Dose 1/4',rationale:'24h after pitch — yeast is in active growth phase, needs nitrogen.'},
    {day:2,title:'Dose 2/4',rationale:'Vigorous fermentation now visible. Organic N is absorbed slowly so daily spacing avoids overwhelming.'},
    {day:3,title:'Dose 3/4',rationale:'Take a gravity reading. Looking for the 1/3 sugar break for the final dose.'},
    {day:7,title:'Dose 4/4',rationale:'Last dose at 1/3 sugar break or day 7 (whichever comes first). Sustains yeast through alcohol stress.'}
  ];

  var currentNutrient=b.nutrient||'mj-mead';
  var alreadyTOSNA=currentNutrient==='fermaid-o';

  var rows=schedule.map(function(s){
    var isPast=s.day<=daysSinceStart;
    return'<div style="display:flex;gap:10px;padding:8px 10px;border-bottom:1px solid var(--border);align-items:flex-start">'
      +'<div style="width:60px;flex-shrink:0;font-family:var(--font-mono);font-size:11px;color:'+(isPast?'var(--text3)':'var(--gold2)')+';letter-spacing:0.5px">DAY '+s.day+(isPast?' ⏪':'')+'</div>'
      +'<div style="flex:1">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+(isPast?'var(--text3)':'var(--text)')+'">'+s.title+' · '+doses.perDose+' g Fermaid-O</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px;line-height:1.5">'+dayLabel(s.day)+' · '+s.rationale+'</div>'
      +'</div></div>';
  }).join('');

  out.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:12px">'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)">'+doses.totalGrams+' g</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:4px">TOTAL Fermaid-O</div></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)">'+doses.perDose+' g</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:4px">PER DOSE</div></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)">4</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:4px">DOSES</div></div>'
    +'</div>'
    +'<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;overflow:hidden">'+rows+'</div>'
    +(alreadyTOSNA
      ?'<div style="padding:10px 12px;background:rgba(122,160,64,0.12);border-left:3px solid var(--green2);border-radius:var(--radius);font-size:12px;color:var(--green2)">✓ This batch is already on the TOSNA protocol — Fermaid-O is the configured nutrient. Use the button below to <em>also</em> write explicit doses into the additions log for tracking.</div>'
      :'<div style="padding:10px 12px;background:rgba(200,160,64,0.10);border-left:3px solid var(--gold2);border-radius:var(--radius);font-size:12px;color:var(--text2)">Applying will switch this batch\'s nutrient from <strong>'+escHtml((getNutrientById(currentNutrient)||{}).name||currentNutrient)+'</strong> to <strong>Fermaid-O (TOSNA)</strong> and write the 4 doses above into the additions log.</div>')
    +'<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="btn btn-primary" onclick="applyTOSNAToBatch(\''+batchId+'\')">Apply TOSNA plan to this batch</button>'
    +'<button class="btn btn-secondary" onclick="showView(\'batch\',\''+batchId+'\')">Open batch →</button>'
    +'</div>';
}

function applyTOSNAToBatch(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  if(!confirm('Apply TOSNA schedule to "'+b.name+'"?\n\nThis will:\n  • Set the nutrient to Fermaid-O (TOSNA protocol)\n  • Write 4 dose entries into the additions log\n\nExisting additions are untouched.'))return;
  b.nutrient='fermaid-o';
  var vol=parseFloat(b.volume)||5;
  var og=parseFloat(b.og)||1.095;
  var doses=computeTOSNADoses(vol,og);
  var startDate=new Date(b.startDate);
  if(!APP.additions)APP.additions={};
  if(!APP.additions[batchId])APP.additions[batchId]=[];

  function addEntryIfMissing(dayOffset,label){
    var dt=new Date(startDate.getTime()+dayOffset*86400000);
    var iso=dt.toISOString().slice(0,10);
    // Dedup: don't add if an identical TOSNA dose for this day+amount already exists
    var exists=APP.additions[batchId].some(function(a){
      return a.item&&a.item.indexOf('Fermaid-O')!==-1&&a.date===iso;
    });
    if(exists)return false;
    APP.additions[batchId].push({
      id:genId(),
      type:'primary',
      date:iso,
      item:'Fermaid-O · '+label,
      amount:doses.perDose+' g',
      removeBy:'',
      removedDate:iso, // Nutrients dissolve — mark "removed" on the same day so they don't show as pending
      notes:'TOSNA dose. Hydrate in a splash of room-temp must, stir gently into the fermenter.'
    });
    return true;
  }

  var added=0;
  if(addEntryIfMissing(1,'Dose 1/4'))added++;
  if(addEntryIfMissing(2,'Dose 2/4'))added++;
  if(addEntryIfMissing(3,'Dose 3/4'))added++;
  if(addEntryIfMissing(7,'Dose 4/4 (at 1/3 sugar break)'))added++;

  scheduleSave();
  toast('✦ TOSNA applied · '+added+' new dose'+(added===1?'':'s')+' written');
  renderTOSNAPlan();
}
