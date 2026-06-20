// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// pitch, templates, predictions, fermenter & racking helpers, supply deduction, label overlay
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== PITCH CALCULATOR ====================
// Compute pitch amount using coverage-based ceiling math.
// Each sachet/pouch handles up to its `sachetCoversL` of must at standard OG.
// Higher OG stresses the yeast, effectively reducing coverage — we model that
// as a stress multiplier applied to the volume side of the equation.
// Sachets are always integers (≥1) since you can't open half a foil pouch
// and dose precisely without lab equipment. A 5L batch and a 23L batch with
// M05 both call for exactly 1 sachet — that's how manufacturers package them.
function calcPitchAmount(yeastId,volumeL,og){
  var y=getYeastById(yeastId);
  if(!volumeL||!og)return null;
  var ogPoints=(og-1)*1000;
  // Stress multiplier: 1.0 base at OG≤1.080, scales linearly to ~2.0 at OG=1.130+
  // The same yeast that handles 23L of OG-1.090 must can only cleanly handle
  // half that at OG-1.130. We bake this into the effective-volume calculation.
  var stressMult=1+Math.max(0,(ogPoints-80))/50;
  var coverage=y.sachetCoversL||23;
  var effectiveL=volumeL*stressMult;
  // ceil(effectiveL / coverage), minimum 1 — you always pitch at least one
  // sachet even for tiny batches. Slight over-pitch is fine; under-pitch is risky.
  var sachets=Math.max(1,Math.ceil(effectiveL/coverage));
  // For liquid yeast (sachetSize=null, e.g. WLP720) we report units instead of g
  var totalGrams=y.sachetSize?sachets*y.sachetSize:null;
  var gramsPerL=totalGrams?totalGrams/volumeL:null;
  return{
    yeast:y,
    gramsPerL:gramsPerL,
    totalGrams:totalGrams,
    sachets:sachets,
    sachetsRounded:sachets,  // already an integer
    coverage:coverage,
    effectiveL:effectiveL,
    rehydrateWater:totalGrams?Math.round(totalGrams*10):null,  // 10x dry weight in ml
    stressLevel:stressMult>1.5?'high':stressMult>1.2?'moderate':'standard',
    abvHeadroom:y.abvMax-((og-1)*131.25),  // rough max-attenuation ABV
    isLiquid:y.unit==='pouch'
  };
}

// ==================== BATCH TEMPLATES ====================
// Templates are saved configurations users can apply to new batches.
// Stored in APP.templates as: {id, name, recipeId, volume, og, honeyType, yeast, additions[], notes}
function makeTemplateFromBatch(b){
  var bot=APP.bottling[b.id];
  return{
    id:'tpl_'+genId(),
    name:b.name.replace(/\s*#\d+\s*$/,'').trim()+' Template',
    createdFrom:b.id,
    createdAt:new Date().toISOString(),
    recipeId:b.recipeId,
    volume:b.volume,
    og:b.og,
    honey:b.honey,
    honeyType:b.honeyType,
    yeast:b.yeast,
    additions:(APP.additions&&APP.additions[b.id])?APP.additions[b.id].slice():[],
    notes:b.notes,
    sweetness:bot?bot.sweetness:'',
    // Reference cost (per-litre, for prediction)
    costPerLitre:(b.cost&&b.volume)?((b.cost.honey||0)+(b.cost.extras||0))/b.volume:0
  };
}

function saveAsTemplate(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return;
  if(!APP.templates)APP.templates=[];
  var existing=APP.templates.find(function(t){return t.createdFrom===batchId;});
  if(existing&&!confirm('A template from this batch already exists. Overwrite it?'))return;
  var tpl=makeTemplateFromBatch(b);
  if(existing){
    Object.assign(existing,tpl,{id:existing.id});
  }else{
    APP.templates.push(tpl);
  }
  scheduleSave();
  toast('✦ Template saved');
}

function applyTemplate(tplId){
  var tpl=(APP.templates||[]).find(function(t){return t.id===tplId;});
  if(!tpl){toast('⚠ Template not found');return;}
  openNewBatchModal(tpl.recipeId);
  setTimeout(function(){
    var setVal=function(id,val){var el=document.getElementById(id);if(el&&val!=null)el.value=val;};
    setVal('nb-vol',tpl.volume);
    setVal('nb-og',tpl.og);
    setVal('nb-honey',tpl.honey);
    setVal('nb-honey-type',tpl.honeyType);
    setVal('nb-yeast',tpl.yeast);
    if(tpl.notes)setVal('nb-notes','From template "'+tpl.name+'":\n'+tpl.notes);
    if(tpl.costPerLitre&&tpl.volume){
      setVal('nb-cost-honey',(tpl.costPerLitre*tpl.volume).toFixed(2));
    }
  },80);
}

function deleteTemplate(tplId){
  if(!confirm('Delete this template?'))return;
  APP.templates=(APP.templates||[]).filter(function(t){return t.id!==tplId;});
  scheduleSave();
  toast('Template deleted');
  renderMain();
}

// ==================== TASTING PROFILE PREDICTION ====================
// Heuristic prediction of tasting wheel scores based on batch params + recipe defaults.
// Used to set expectations BEFORE the first tasting, and as a baseline to compare to actual.
function predictTastingProfile(batch){
  var recipe=APP.recipes.find(function(r){return r.id===batch.recipeId;});
  var bot=APP.bottling[batch.id]||{};
  var sweetness=bot.sweetness||'';
  var abv=bot.abv||(batch.og?(batch.og-1)*131.25:null);  // rough est
  var honeyType=batch.honeyType||'Wildflower';
  // Base profile per recipe category (loose guideline)
  var categoryBase={
    'Traditional':{honey:8,fruit:0,spice:1,floral:4,acid:3,sweetness:5,body:4,warmth:5},
    'Melomel':   {honey:5,fruit:8,spice:1,floral:3,acid:5,sweetness:5,body:5,warmth:5},
    'Cyser':     {honey:5,fruit:7,spice:2,floral:3,acid:6,sweetness:5,body:5,warmth:5},
    'Pyment':    {honey:5,fruit:6,spice:2,floral:5,acid:5,sweetness:4,body:6,warmth:5},
    'Metheglin': {honey:5,fruit:1,spice:8,floral:3,acid:3,sweetness:5,body:5,warmth:6},
    'Bochet':    {honey:9,fruit:0,spice:3,floral:1,acid:3,sweetness:6,body:7,warmth:6},
    'Braggot':   {honey:5,fruit:1,spice:2,floral:2,acid:3,sweetness:4,body:7,warmth:5},
    'Specialty': {honey:5,fruit:3,spice:5,floral:4,acid:4,sweetness:5,body:5,warmth:5}
  };
  var profile=Object.assign({},categoryBase[(recipe&&recipe.category)||'Traditional']);
  // Sweetness override
  var sweetnessMap={'Bone Dry':1,'Dry':3,'Off-Dry':5,'Semi-Sweet':6,'Sweet':8,'Dessert':9};
  if(sweetness&&sweetnessMap[sweetness])profile.sweetness=sweetnessMap[sweetness];
  // ABV warmth correlation
  if(abv){
    if(abv<8)profile.warmth=3;
    else if(abv<11)profile.warmth=5;
    else if(abv<14)profile.warmth=7;
    else profile.warmth=9;
  }
  // Honey type nudges
  var honeyMods={
    'Wildflower':{floral:+1},
    'Orange Blossom':{floral:+2,fruit:+1},
    'Buckwheat':{honey:+2,body:+1,floral:-2,warmth:+1},
    'Heather':{honey:+2,spice:+1,floral:+1},
    'Forest':{honey:+1,spice:+1,body:+1},
    'Acacia':{floral:+1,honey:-1},
    'Linden':{floral:+2,honey:-1},
    'Clover':{floral:+1,sweetness:+1},
    'Chestnut':{honey:+2,spice:+1,body:+1,floral:-1},
    'Lavender':{floral:+3,spice:+1},
    'Eucalyptus':{spice:+2,floral:+1},
    'Thyme':{spice:+2,floral:+1}
  };
  var m=honeyMods[honeyType];
  if(m){Object.keys(m).forEach(function(k){profile[k]=Math.max(1,Math.min(10,profile[k]+m[k]));});}
  return profile;
}

// ==================== STUCK FERMENTATION GUIDE ====================
// What nutrients has this batch ACTUALLY received? Reads both sources of truth:
//   • manual entries in the additions log (APP.additions)
//   • nutrient steps the user checked off in the brew coach (APP.tasksDone,
//     keyed "<batchId>-step-<day>", matched against the batch's effective steps)
// Returns {manual, done, expected, total} so the diagnosis can tell "never fed"
// from "partway through the schedule" from "fully fed" — per the real batch.
function getNutrientStatus(batch,recipe){
  var nutRe=/nutrient|fermaid|dap|sna|tosna|go-?ferm|nutrivit/i;
  var manual=0;
  ((APP.additions&&APP.additions[batch.id])||[]).forEach(function(a){
    if(nutRe.test((a.what||a.name||'')+''))manual++;
  });
  recipe=recipe||APP.recipes.find(function(r){return r.id===batch.recipeId;});
  var expected=0,done=0;
  if(recipe&&typeof getEffectiveSteps==='function'){
    (getEffectiveSteps(batch,recipe)||[]).forEach(function(s){
      if(!nutRe.test(s.title||''))return;
      expected++;
      if(typeof isTaskDone==='function'&&isTaskDone(batch.id+'-step-'+s.day))done++;
    });
  }
  return{manual:manual,done:done,expected:expected,total:manual+done};
}

// Decision-tree based diagnostic. Returns step-by-step recommendations
// given current batch state.
function diagnoseStuckFermentation(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b)return null;
  var logs=APP.logs[b.id]||[];
  var lastLog=logs[logs.length-1];
  var lastG=lastLog?lastLog.gravity:b.og;
  var lastTemp=lastLog?lastLog.temp:null;
  var daysSinceStart=Math.floor((new Date()-new Date(b.startDate))/86400000);
  var daysSinceLastReading=lastLog?Math.floor((new Date()-new Date(lastLog.date))/86400000):null;
  var attenuation=b.og?(b.og-lastG)/(b.og-1):0;
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  var yeast=getYeastById(b.yeast||'m05');
  var diagnoses=[];
  // Test 1: Is it actually stuck? Need to confirm gravity stable
  if(daysSinceLastReading!=null&&daysSinceLastReading<3){
    diagnoses.push({severity:'info',title:'Take a fresh reading first',
      detail:'Last gravity reading was '+daysSinceLastReading+' day(s) ago. To confirm fermentation is actually stuck (rather than just slow), take 2 readings 48-72 hours apart with no change.'});
  }
  // Test 2: Temperature too low?
  if(lastTemp!=null&&lastTemp<yeast.optimalTempLow){
    diagnoses.push({severity:'high',title:'Temperature too cold for yeast',
      detail:'Last temp '+lastTemp+'°C is below '+yeast.name.split('—')[0].trim()+'\'s optimal range ('+yeast.optimalTempLow+'-'+yeast.optimalTempHigh+'°C). Yeast metabolism slows dramatically below 15°C. Move to a warmer spot or add a fermentation belt — let temp rise gradually, not in shock.'});
  }
  // Test 3: Temperature too high (caused yeast death)?
  if(lastTemp!=null&&lastTemp>yeast.optimalTempHigh+5){
    diagnoses.push({severity:'high',title:'Temperature too hot — yeast may be stressed/dead',
      detail:'Temp '+lastTemp+'°C is well above '+yeast.name.split('—')[0].trim()+'\'s optimal ('+yeast.optimalTempLow+'-'+yeast.optimalTempHigh+'°C). Heat-stressed yeast produces fusel alcohols (solvent flavor) and may have died off. Cool to optimal range first, then consider repitching.'});
  }
  // Test 4: ABV ceiling reached?
  var currentAbv=b.og&&lastG?(b.og-lastG)*131.25:0;
  if(yeast.abvMax&&currentAbv>=yeast.abvMax-1){
    diagnoses.push({severity:'high',title:'Yeast at ABV ceiling',
      detail:'Current ABV is ~'+currentAbv.toFixed(1)+'% — at or near '+yeast.name.split('—')[0].trim()+'\'s '+yeast.abvMax+'% tolerance. The yeast has done what it can. Either accept current gravity, or pitch a higher-tolerance yeast (EC-1118: 18%, or fresh K1-V1116 starter for stuck ferments).'});
  }
  // Test 5: Nutrient deficiency — based on what this batch ACTUALLY received,
  // counting both logged additions and nutrient steps ticked off in the coach.
  var nut=getNutrientStatus(b,recipe);
  if(b.og&&b.og>=1.090){
    if(nut.total===0){
      diagnoses.push({severity:'medium',title:'Possible nutrient deficiency',
        detail:'OG '+b.og+' is high and no nutrient additions are recorded for this batch — nothing in the additions log, and no nutrient steps checked off in the coach. Honey is nutrient-poor; high-OG meads NEED staggered nutrient additions. If you genuinely haven\'t fed it, add Fermaid-O or DAP (see Tools → TOSNA Scheduler) and degas vigorously to release CO₂. If you did feed it, tick the nutrient steps in the coach (or log the addition) so this clears.'});
    }else if(nut.expected>0&&nut.done<nut.expected&&nut.manual===0){
      diagnoses.push({severity:'low',title:'Nutrient schedule incomplete',
        detail:'You\'ve completed '+nut.done+' of '+nut.expected+' planned nutrient doses for this batch. If the remaining doses are still before the 1/3 sugar break, add them now and tick them off; once past the break, extra nutrient won\'t help and can feed spoilage organisms.'});
    }else{
      diagnoses.push({severity:'info',title:'Nutrients accounted for',
        detail:'This batch has '+nut.total+' nutrient addition'+(nut.total===1?'':'s')+' recorded'+(nut.expected?' ('+nut.done+'/'+nut.expected+' scheduled doses ticked off'+(nut.manual?' + '+nut.manual+' logged':'')+')':'')+', so a nitrogen deficiency is unlikely to be the cause. Look to temperature, ABV ceiling, or pH instead.'});
    }
  }
  // Test 6: pH out of range? (no pH data — heuristic recommend testing)
  if(daysSinceStart>14&&attenuation<0.4){
    diagnoses.push({severity:'medium',title:'Check pH — may be too low for yeast',
      detail:'After 14 days, attenuation is only '+(attenuation*100).toFixed(0)+'%. Yeast struggles below pH 3.0. Test with strips or meter. If pH < 3.2, add potassium bicarbonate (0.5-1 g/L) to raise it.'});
  }
  // Test 7: Insufficient pitch?
  if(daysSinceStart<7&&attenuation<0.2){
    diagnoses.push({severity:'low',title:'Slow start — may be light pitch',
      detail:'Only '+(attenuation*100).toFixed(0)+'% attenuation after '+daysSinceStart+' days. Could be normal lag (give it 3-5 more days at proper temp) OR insufficient yeast. Use Tools → Pitch Calculator to verify the right amount for your OG.'});
  }
  // Test 8: Just give it more time (only when nothing actionable was found —
  // info-level notes like "nutrients accounted for" don't count as red flags)
  if(!diagnoses.some(function(d){return d.severity!=='info';})&&attenuation<0.7&&daysSinceStart<35){
    diagnoses.push({severity:'info',title:'Likely just slow — give it time',
      detail:'No obvious red flags. Mead ferments take 2-6 weeks for full attenuation. As long as gravity is dropping (even slowly) and temp is in range, patience is the answer. Check again in a week.'});
  }
  // Rescue recipe: build a recommended action plan
  var actions=[];
  if(lastTemp!=null&&lastTemp<yeast.optimalTempLow){
    actions.push('Warm to '+(yeast.optimalTempLow+2)+'°C over 24h (don\'t shock the yeast).');
  }
  if(daysSinceStart>10&&nut.total===0&&b.og>=1.090){
    actions.push('Degas vigorously (stir 60+ sec) and add nutrient — '+(b.volume*1.5).toFixed(1)+'g DAP or Fermaid-O.');
  }
  if(currentAbv>=yeast.abvMax-1){
    actions.push('Make a starter with EC-1118 in 250ml warm water + 2 tsp sugar; pitch when active (15-30 min).');
  }
  if(attenuation>=0.7&&!diagnoses.some(function(d){return d.severity==='high';})){
    actions.push('You\'re probably done — confirm with 2 readings 48h apart, then bottle.');
  }
  return{
    batch:b,daysSinceStart:daysSinceStart,daysSinceLastReading:daysSinceLastReading,
    lastGravity:lastG,attenuation:attenuation,currentAbv:currentAbv,
    diagnoses:diagnoses,actions:actions
  };
}

// ==================== COST EFFECTIVENESS ====================
function computeCostEffectiveness(){
  return APP.batches.map(function(b){
    var bot=APP.bottling[b.id];
    if(!bot)return null;
    var totalCost=(b.cost&&((b.cost.honey||0)+(b.cost.extras||0)))||0;
    var bottlesOrig=typeof bottlesOriginal==='function'?bottlesOriginal(bot):0;
    var volMl=typeof totalVolumeMLOriginal==='function'?totalVolumeMLOriginal(bot):0;
    if(!bottlesOrig||!totalCost)return null;
    var abv=bot.abv||0;
    var tastings=APP.tastings[b.id]||[];
    var avgRating=tastings.length?tastings.reduce(function(s,t){return s+(t.rating||0);},0)/tastings.length:0;
    return{
      batch:b,totalCost:totalCost,bottles:bottlesOrig,
      volumeL:volMl/1000,abv:abv,avgRating:avgRating,
      costPerBottle:totalCost/bottlesOrig,
      costPerLitre:volMl?totalCost/(volMl/1000):0,
      costPerAbvL:(abv&&volMl)?totalCost/((volMl/1000)*abv):0,
      ratingPerEuro:avgRating&&totalCost?avgRating/totalCost:0
    };
  }).filter(Boolean);
}

// ==================== CONFETTI ====================
// Simple canvas particle confetti for celebrations.
function fireConfetti(opts){
  opts=opts||{};
  var count=opts.count||80;
  var duration=opts.duration||3000;
  var canvas=document.createElement('canvas');
  canvas.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999';
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  document.body.appendChild(canvas);
  var ctx=canvas.getContext('2d');
  var particles=[];
  var colors=['#c9a84c','#d9be7b','#e8d9a7','#8a6a30','#a85aa0','#7aa040'];
  for(var i=0;i<count;i++){
    particles.push({
      x:canvas.width/2+(Math.random()-0.5)*200,
      y:canvas.height/3,
      vx:(Math.random()-0.5)*12,
      vy:Math.random()*-12-4,
      g:0.4,
      size:Math.random()*8+4,
      rot:Math.random()*360,
      vrot:(Math.random()-0.5)*12,
      color:colors[Math.floor(Math.random()*colors.length)]
    });
  }
  var start=Date.now();
  function frame(){
    var t=Date.now()-start;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(function(p){
      p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.rot+=p.vrot;
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.color;
      ctx.globalAlpha=Math.max(0,1-t/duration);
      ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6);
      ctx.restore();
    });
    if(t<duration)requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

// Track which milestones we've already celebrated to avoid repeat confetti.
// Fires once when a batch first crosses into its 'drinkable' window.
// Uses getAgingProfile (the same function the aging timeline uses) for the
// thresholds — previously this referenced a nonexistent getDrinkProfile and
// silently returned early, so confetti never fired on real batches.
function checkMilestoneConfetti(){
  if(!APP.celebrated)APP.celebrated={};
  if(typeof getAgingProfile!=='function')return;
  APP.batches.forEach(function(b){
    var bot=APP.bottling[b.id];
    if(!bot||!bot.date)return;
    var profile=getAgingProfile(b);
    if(!profile||!profile.minDays)return;
    var ageDays=Math.floor((new Date()-new Date(bot.date))/86400000);
    var key=b.id+'_ready';
    if(ageDays>=profile.minDays&&!APP.celebrated[key]){
      APP.celebrated[key]=true;
      setTimeout(function(){
        toast('🎉 '+b.name+' has reached its ready age! ('+ageDays+' days)');
        fireConfetti({count:120,duration:4000});
      },1500);
      scheduleSave();
    }
  });
}

// ==================== TEMP ANOMALY DETECTOR ====================
// Polls the configured temperature sensor and warns when readings are sustained
// outside the optimal zone. Stores anomalies per-batch so they can be reviewed.
var TEMP_ANOMALY_GRACE_MS=2*60*60*1000;  // 2 hours sustained out-of-range
function recordTempAnomaly(temp,severity){
  if(!APP.tempAnomalies)APP.tempAnomalies=[];
  APP.tempAnomalies.push({ts:new Date().toISOString(),temp:temp,severity:severity});
  // Keep only last 50
  if(APP.tempAnomalies.length>50)APP.tempAnomalies=APP.tempAnomalies.slice(-50);
  scheduleSave();
}

function checkTempAnomalies(temp){
  if(temp==null||isNaN(temp))return;
  // Get active batches' yeast strain (use M05 default)
  var active=APP.batches.filter(function(b){
    var s=typeof getBatchStatus==='function'?getBatchStatus(b):null;
    return s!=='bottled'&&s!=='complete';
  });
  if(!active.length)return;
  // Use coldest tolerance and hottest tolerance across active yeasts
  var minTemp=Infinity,maxTemp=-Infinity;
  active.forEach(function(b){
    var y=getYeastById(b.yeast||'m05');
    if(y.optimalTempLow<minTemp)minTemp=y.optimalTempLow;
    if(y.optimalTempHigh>maxTemp)maxTemp=y.optimalTempHigh;
  });
  var severity=null;
  if(temp<minTemp-3||temp>maxTemp+5)severity='critical';
  else if(temp<minTemp||temp>maxTemp)severity='warning';
  if(severity){
    // Throttle: don't spam every poll. Use a rolling state machine.
    if(!APP._tempAnomalyState)APP._tempAnomalyState={};
    var s=APP._tempAnomalyState;
    if(!s.startedAt){
      s.startedAt=Date.now();
      s.maxTemp=temp;s.minTemp=temp;
      s.severity=severity;
    }else{
      s.maxTemp=Math.max(s.maxTemp,temp);
      s.minTemp=Math.min(s.minTemp,temp);
      if(severity==='critical')s.severity='critical';
      // If sustained beyond grace, fire alert
      if(Date.now()-s.startedAt>TEMP_ANOMALY_GRACE_MS&&!s.notified){
        recordTempAnomaly(temp,s.severity);
        s.notified=true;
        if(typeof toast==='function')toast('⚠ Temp '+temp.toFixed(1)+'°C outside optimal range ('+minTemp+'-'+maxTemp+'°C) for '+Math.floor((Date.now()-s.startedAt)/60000)+'min');
        // Push notification if enabled
        if(APP.settings.notificationsEnabled&&APP.settings.notificationService&&typeof haCallService==='function'){
          haCallService('notify',APP.settings.notificationService,{
            title:'⚗ MeadOS Temp Alert',
            message:'Fermentation chamber at '+temp.toFixed(1)+'°C — outside the '+minTemp+'-'+maxTemp+'°C range. Check on your batches.',
            data:{tag:'meados-temp-anomaly'}
          });
        }
      }
    }
  }else{
    // Back in range — reset state
    APP._tempAnomalyState=null;
  }
}

// ==================== FERMENTER HELPERS ====================
// Returns the fermenter object for an id, or null. Tolerates missing/legacy data.
function getFermenter(id){
  if(!id||!APP.fermenters)return null;
  return APP.fermenters.find(function(f){return f.id===id;})||null;
}

// Returns the batch currently occupying a given fermenter, or null.
// "Active" = batch exists, not yet bottled (status is 'active' or 'aging' but
// not 'bottled' or 'complete'). Bottled batches free up the fermenter.
function fermenterOccupiedBy(fermenterId){
  if(!fermenterId||!APP.batches)return null;
  return APP.batches.find(function(b){
    if(b.fermenterId!==fermenterId)return false;
    var s=getBatchStatus(b);
    // Failed batches no longer occupy their vessel — the vessel was emptied
    // when the batch was dumped, so the slot is free for a new brew.
    return s!=='bottled'&&s!=='complete'&&s!=='failed';
  })||null;
}

// Computes when a fermenter becomes free given its occupying batch's recipe.
// Returns ISO date string, or null if the fermenter is currently free.
function fermenterFreeWhen(fermenterId){
  var occ=fermenterOccupiedBy(fermenterId);
  if(!occ)return null;
  var recipe=APP.recipes.find(function(r){return r.id===occ.recipeId;});
  if(!recipe)return null;
  // Use recipe's expected bottling day
  return addDays(occ.startDate,recipe.fermentDays||42);
}

// Returns an array of fermenters that are currently free (not occupied by an
// active batch). Order preserves the user's fermenter list order.
function getFreeFermenters(){
  if(!APP.fermenters)return[];
  return APP.fermenters.filter(function(f){return!fermenterOccupiedBy(f.id);});
}

// Default fermenter id for a NEW batch — first free, or first overall.
function defaultFermenterIdForNewBatch(){
  var free=getFreeFermenters();
  if(free.length)return free[0].id;
  if(APP.fermenters&&APP.fermenters.length)return APP.fermenters[0].id;
  return null;
}

// CRUD helpers
function addFermenter(name,capacity,notes,color,tempSensorEntity){
  if(!APP.fermenters)APP.fermenters=[];
  var existingIds=APP.fermenters.map(function(f){return f.id;});
  var n=1;
  while(existingIds.indexOf('f'+n)!==-1)n++;
  APP.fermenters.push({
    id:'f'+n,
    name:name||('Fermenter '+(APP.fermenters.length+1)),
    capacity:parseFloat(capacity)||7.6,
    notes:notes||'',
    color:color||['#c9a84c','#7aa8c0','#a87aa0','#7aa850','#c87850','#5a8a7a','#a05a50','#7a7ac0'][APP.fermenters.length%8],
    // Optional HA temperature sensor entity ID (e.g. 'sensor.fermenter_1_temp').
    // When set, the live reading auto-populates the gravity-log temp field and
    // displays on the fermenter card. Leave blank to hide.
    tempSensorEntity:tempSensorEntity||''
  });
  scheduleSave();
}

function updateFermenter(id,patch){
  var f=getFermenter(id);
  if(!f)return false;
  if(patch.name!==undefined)f.name=patch.name;
  if(patch.capacity!==undefined)f.capacity=parseFloat(patch.capacity)||f.capacity;
  if(patch.notes!==undefined)f.notes=patch.notes;
  if(patch.color!==undefined)f.color=patch.color;
  if(patch.tempSensorEntity!==undefined)f.tempSensorEntity=patch.tempSensorEntity;
  scheduleSave();
  return true;
}

function deleteFermenter(id){
  if(!APP.fermenters)return false;
  // Reassign occupying batches to first remaining fermenter (or null)
  var occupied=APP.batches.filter(function(b){return b.fermenterId===id;});
  var remaining=APP.fermenters.filter(function(f){return f.id!==id;});
  var fallback=remaining.length?remaining[0].id:null;
  occupied.forEach(function(b){b.fermenterId=fallback;});
  APP.fermenters=remaining;
  scheduleSave();
  return true;
}

// ==================== RACKING / VESSEL HISTORY ====================
// Each batch can be racked between fermenters. b.fermenterId points to the
// CURRENT vessel; b.rackings is the chronological log of every move:
//   [{date, fromFermenterId, toFermenterId, notes?}, ...]
//
// On creation, fermenterId is set and rackings is empty. A racking action
// pushes an entry AND updates fermenterId to the new vessel.

// Returns chronological list of {fermenterId, startDate, endDate} segments
// describing every vessel a batch has lived in. endDate=null for the current
// segment of an active batch.
function getBatchVesselHistory(b){
  if(!b||!b.fermenterId)return[];
  // Closing date for the final (open) segment: bottling date if bottled; for a
  // failed/complete-but-never-bottled batch, the last log (else startDate+fermDays)
  // so it stops projecting as if still occupying the lane; otherwise null (active).
  var bot=APP.bottling&&APP.bottling[b.id];
  var endDate=bot&&bot.date?bot.date:null;
  if(!endDate){
    var st=getBatchStatus(b);
    if(st==='failed'||st==='complete'){
      var lg=(APP.logs&&APP.logs[b.id])||[];
      var rec=APP.recipes.find(function(r){return r.id===b.recipeId;});
      var fd=(rec&&rec.fermentDays)||42;
      endDate=lg.length?lg[lg.length-1].date:new Date(new Date(b.startDate).getTime()+fd*86400000).toISOString().slice(0,10);
    }
  }
  var segments=[];
  var rackings=(b.rackings||[]).slice().sort(function(a,c){return(a.date||'').localeCompare(c.date||'');});
  if(!rackings.length){
    segments.push({fermenterId:b.fermenterId,startDate:b.startDate,endDate:endDate});
    return segments;
  }
  // The FIRST racking's "from" is the starting vessel. Each subsequent racking
  // closes the previous segment and opens a new one; the last stays open to endDate.
  var vesselNow=rackings[0].fromFermenterId;
  var segStart=b.startDate;
  rackings.forEach(function(r){
    segments.push({fermenterId:vesselNow,startDate:segStart,endDate:r.date});
    vesselNow=r.toFermenterId;
    segStart=r.date;
  });
  segments.push({fermenterId:vesselNow,startDate:segStart,endDate:endDate});
  return segments;
}

// Record a racking event. Validates that target vessel exists and isn't the
// same as current. Updates b.fermenterId and appends to b.rackings.
function rackBatch(batchId,toFermenterId,date,notes){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return false;}
  if(!toFermenterId||toFermenterId===b.fermenterId){toast('⚠ Pick a different vessel');return false;}
  if(!getFermenter(toFermenterId)){toast('⚠ Target vessel not found');return false;}
  if(!b.rackings)b.rackings=[];
  b.rackings.push({
    date:date||today(),
    fromFermenterId:b.fermenterId,
    toFermenterId:toFermenterId,
    notes:(notes||'').trim()
  });
  b.fermenterId=toFermenterId;
  scheduleSave();
  return true;
}
// Returns categorized "drinking window status" for a bottled batch.
// Status one of: 'pre-window', 'entering', 'in-window-rising', 'peak',
//                'in-window-falling', 'past-peak', 'past-max'
function getDrinkingWindowStatus(batch){
  var bot=APP.bottling&&APP.bottling[batch.id];
  if(!bot||!bot.date)return null;
  var recipe=APP.recipes.find(function(r){return r.id===batch.recipeId;});
  if(!recipe)return null;
  var minD=recipe.minAgeDays||30;
  var peakD=recipe.peakAgeDays||(minD*3);
  var maxD=recipe.maxAgeDays||(peakD*2);
  var aged=daysSince(bot.date);
  var status;
  if(aged<minD-30)status='pre-window';
  else if(aged<minD)status='entering';
  else if(aged<peakD*0.85)status='in-window-rising';
  else if(aged<=peakD*1.15)status='peak';
  else if(aged<maxD)status='in-window-falling';
  else status='past-max';
  return{
    status:status,
    aged:aged,
    daysUntilReady:Math.max(0,minD-aged),
    daysUntilPeak:Math.max(0,peakD-aged),
    daysUntilMax:Math.max(0,maxD-aged),
    minD:minD,peakD:peakD,maxD:maxD,
    onHand:typeof bottlesOnHand==='function'?bottlesOnHand(bot):0
  };
}

// ==================== SUPPLY DEDUCTION ON BATCH START ====================
// When the user creates a batch, optionally deduct the consumed supplies
// (honey by variety, yeast packet, nutrient sachets) from the supplies
// inventory. Matching is fuzzy: honey by name substring (b.honeyType vs
// supply.name), yeast by name OR strain id, nutrient takes from any
// nutrient-type supply. Returns an array of {supply, amount, unit} for the
// caller to surface as a confirmation toast.
//
// Behaviour:
//   - If APP.settings.autoDeductSupplies is explicitly false, returns [].
//   - Missing supplies are silently skipped (no error, no deduction).
//   - Insufficient stock still deducts down to 0 (doesn't go negative);
//     caller can warn the user from the returned list.
function deductSuppliesForBatch(b,recipe){
  if(APP.settings&&APP.settings.autoDeductSupplies===false)return[];
  if(!APP.supplies||!APP.supplies.length)return[];
  var deductions=[];
  // ---- HONEY ----
  if(b.honey&&b.honeyType){
    var needle=String(b.honeyType).toLowerCase();
    var honeySupply=APP.supplies.find(function(s){
      if(s.type!=='honey')return false;
      var name=String(s.name||'').toLowerCase();
      // Match either direction: supply name contains honeyType, or vice versa
      return name.indexOf(needle)!==-1||needle.indexOf(name)!==-1;
    });
    if(honeySupply){
      var before=parseFloat(honeySupply.qty)||0;
      var amount=parseFloat(b.honey)||0;
      // If supply is in g but batch.honey is kg, convert
      var unit=String(honeySupply.unit||'kg').toLowerCase();
      var deductAmount=amount;
      if(unit==='g'||unit==='gram'||unit==='grams')deductAmount=amount*1000;
      honeySupply.qty=Math.max(0,before-deductAmount);
      deductions.push({
        supply:honeySupply,
        amount:deductAmount,
        unit:honeySupply.unit,
        before:before,
        after:honeySupply.qty,
        insufficient:before<deductAmount
      });
    }
  }
  // ---- YEAST ----
  // Always 1 packet/sachet per batch (recipes assume single-pitch).
  if(b.yeast){
    var yeastNeedle=String(b.yeast).toLowerCase();
    var yeastStrain=typeof getYeastById==='function'?getYeastById(b.yeast):null;
    var strainName=yeastStrain?String(yeastStrain.name||'').toLowerCase():'';
    var yeastSupply=APP.supplies.find(function(s){
      if(s.type!=='yeast')return false;
      var name=String(s.name||'').toLowerCase();
      // Match by strain id (e.g. "m05") OR strain full name (e.g. "Mangrove Jack's M05")
      return name.indexOf(yeastNeedle)!==-1||(strainName&&name.indexOf(strainName.split(' ').pop())!==-1);
    });
    // Fallback: any yeast supply if no specific match
    if(!yeastSupply)yeastSupply=APP.supplies.find(function(s){return s.type==='yeast';});
    if(yeastSupply){
      var beforeY=parseFloat(yeastSupply.qty)||0;
      yeastSupply.qty=Math.max(0,beforeY-1);
      deductions.push({
        supply:yeastSupply,
        amount:1,
        unit:yeastSupply.unit,
        before:beforeY,
        after:yeastSupply.qty,
        insufficient:beforeY<1
      });
    }
  }
  // ---- NUTRIENT ----
  // Compute total nutrient grams from recipe.steps text or fallback to ~12g
  // for typical 5L mead. Adjusts for actual batch volume.
  var nutrientGrams=0;
  if(recipe&&recipe.steps){
    recipe.steps.forEach(function(s){
      var m=String(s.desc||'').match(/(\d+(?:\.\d+)?)\s*g\s+(?:yeast\s+)?nutrient/i);
      if(m)nutrientGrams+=parseFloat(m[1]);
    });
  }
  if(nutrientGrams<=0)nutrientGrams=12*(parseFloat(b.volume)||5)/5;
  var nutrientSupply=APP.supplies.find(function(s){return s.type==='nutrient';});
  if(nutrientSupply&&nutrientGrams>0){
    var beforeN=parseFloat(nutrientSupply.qty)||0;
    var nutUnit=String(nutrientSupply.unit||'g').toLowerCase();
    var nDeduct;
    if(/packet|sachet/i.test(nutUnit)){
      var sachetSize=parseFloat(APP.settings&&APP.settings.sachetSize)||12;
      nDeduct=Math.ceil(nutrientGrams/sachetSize);
    }else{
      nDeduct=nutrientGrams; // assume g
    }
    nutrientSupply.qty=Math.max(0,beforeN-nDeduct);
    deductions.push({
      supply:nutrientSupply,
      amount:nDeduct,
      unit:nutrientSupply.unit,
      before:beforeN,
      after:nutrientSupply.qty,
      insufficient:beforeN<nDeduct
    });
  }
  return deductions;
}

// ==================== LABEL OVERLAY SYSTEM (Phase 1) ====================
// Per-recipe overlay configuration. Each element (style, name, batchName, abv,
// qr, bestDrink) has a position (% of 900-viewBox), visibility, and — for text
// elements — full typography. Users will customize via the Label Designer
// (Phase 2). Defaults reproduce the original hardcoded behavior so recipes
// without overrides look pixel-identical to before this refactor.

// 9-grid presets — UI convenience for "snap to corner/edge/center".
// Values are percentages on the 900×900 label viewBox.
var OVERLAY_GRID = {
  TL:{x:7, y:10},  TC:{x:50, y:10},  TR:{x:93, y:10},
  ML:{x:7, y:50},  MC:{x:50, y:50},  MR:{x:93, y:50},
  BL:{x:7, y:90},  BC:{x:50, y:90},  BR:{x:93, y:90}
};

// Default overlay config per element. Defaults preserve the prior hardcoded
// behaviour for unmigrated recipes:
//   - style/name overlays default OFF (existing labels have those baked in)
//   - batchName defaults ON for generic labels, OFF for photographic ones
//     (photographic labels have busy artwork in the cream band area)
// Users will flip them on/off in the Label Designer (Phase 2) once custom
// art-only labels start arriving.
function defaultOverlayFor(elementKey,recipeId){
  var isPhotographic=(recipeId&&typeof recipeUsesGenericLabel==='function')
    ?!recipeUsesGenericLabel(recipeId):false;
  var DEFS={
    style:     {pos:'TC',x:50,y:14, show:false,font:'Cinzel',size:22,color:'#c9a350',weight:400,italic:false,spacing:6},
    name:      {pos:'TC',x:50,y:26, show:false,font:'Georgia',size:36,color:'#f0e6cc',weight:600,italic:true,spacing:0},
    batchName: {pos:'BC',x:50,y:80.5,show:true, font:'Cinzel',size:36,color:'#3a2010',weight:700,italic:false,spacing:0.5,dynamicSize:true},
    abv:       {pos:'BC',x:50,y:92,  show:true, font:'Cinzel',size:48,color:'#3a2010',weight:700,italic:false,spacing:1},
    qr:        {pos:'BL',x:6.4,y:93, show:true, theme:'light'},
    bestDrink: {pos:'BR',x:93.6,y:93,show:true, theme:'light'}
  };
  var def=Object.assign({},DEFS[elementKey]||{});
  // Photographic labels: their artwork already shows the brand name in the
  // cream band, so the batch-name overlay would collide with it.
  if(isPhotographic&&elementKey==='batchName')def.show=false;
  return def;
}

// Build the full overlay config for a recipe, merging user overrides with
// defaults. Returns an object keyed by element (style, name, batchName, abv,
// qr, bestDrink).
function getRecipeOverlays(recipeId){
  var keys=['style','name','batchName','abv','qr','bestDrink'];
  var userOverrides=(APP.settings&&APP.settings.recipeOverlays)
    ?(APP.settings.recipeOverlays[recipeId]||{}):{};
  var result={};
  keys.forEach(function(k){
    var def=defaultOverlayFor(k,recipeId);
    result[k]=userOverrides[k]?Object.assign({},def,userOverrides[k]):def;
  });
  return result;
}

// Map friendly font name → CSS font stack. The stacks are SVG-safe (no smart
// quotes, escaped " for inline use).
function overlayFontStack(name){
  var map={
    'Cinzel':         'Cinzel,&quot;Times New Roman&quot;,serif',
    'Georgia':        'Georgia,&quot;Times New Roman&quot;,serif',
    'Crimson Pro':    '&quot;Crimson Pro&quot;,Georgia,serif',
    'JetBrains Mono': '&quot;JetBrains Mono&quot;,ui-monospace,monospace',
    'serif':          'Georgia,serif',
    'sans':           'system-ui,sans-serif',
    'mono':           'ui-monospace,monospace'
  };
  return map[name]||(name||'Georgia,serif');
}

// Render a single text overlay element. Returns SVG <text> markup or '' if
// the element is hidden or the text is empty.
function renderOverlayText(cfg,text){
  if(!cfg||!cfg.show||!text)return'';
  var x=(cfg.x!=null?cfg.x:50)*9; // percent → viewBox units
  var y=(cfg.y!=null?cfg.y:50)*9;
  var size=cfg.size||24;
  // Auto-size to fit the cream-band inner width for batch-name overlays
  if(cfg.dynamicSize&&text.length>0){
    var maxInnerWidth=380;
    var charWidthRatio=0.55;
    var ideal=Math.floor(maxInnerWidth/(text.length*charWidthRatio));
    size=Math.max(14,Math.min(cfg.size||36,ideal));
  }
  return'<text x="'+x+'" y="'+y+'"'
    +' font-family="'+overlayFontStack(cfg.font)+'"'
    +' font-size="'+size+'"'
    +' fill="'+(cfg.color||'#000')+'"'
    +' font-weight="'+(cfg.weight||400)+'"'
    +(cfg.italic?' font-style="italic"':'')
    +(cfg.spacing?' letter-spacing="'+cfg.spacing+'"':'')
    +' text-anchor="middle" dominant-baseline="central">'
    +escHtml(String(text))
    +'</text>';
}

// Build the complete overlay layer for a label. This is the single source of
// truth for "what gets painted on top of the label image" — replaces the
// scattered inline overlay logic from before.
//
// Args:
//   recipe   — recipe object (provides .style and .name)
//   batch    — batch object (provides .name and drives QR/bestDrink); may be null
//   abvText  — string for ABV display (e.g. "11.5" or "11.5%" or "" or "—")
//   opts     — {qr:false to suppress QR (for tiny renders like bottle preview)}
//
// Returns concatenated SVG fragments (no wrapping <svg>) ready to drop inside
// the caller's existing <svg viewBox="0 0 900 900"> wrapper.
function renderOverlayLayer(recipe,batch,abvText,opts){
  if(!recipe)return'';
  opts=opts||{};
  // opts.overlays — caller can pass a pre-built overlay config (used by the
  // Label Designer's live preview to render with unsaved working state)
  var overlays=opts.overlays||getRecipeOverlays(recipe.id);
  var displayAbv=(abvText==='—'||abvText===''||abvText==null)
    ?'':String(abvText).replace(/%$/,'').trim();
  var parts=[];
  // Recipe style (top caps) — hidden by default for built-in images
  parts.push(renderOverlayText(overlays.style,recipe.style?recipe.style.toUpperCase():''));
  // Recipe name (italic title) — hidden by default for built-in images
  parts.push(renderOverlayText(overlays.name,recipe.name||''));
  // Batch name (cream band)
  if(batch&&batch.name){
    parts.push(renderOverlayText(overlays.batchName,batch.name));
  }
  // ABV (large)
  if(displayAbv){
    parts.push(renderOverlayText(overlays.abv,displayAbv));
  }
  // QR — accepts overlay cfg for position + theme
  if(batch&&opts.qr!==false&&overlays.qr.show&&typeof buildBatchQRSVG==='function'){
    var qr=buildBatchQRSVG(batch,overlays.qr);
    if(qr)parts.push(qr);
  }
  // Best-drink box — accepts overlay cfg for position + theme. Suppressible via
  // opts.bestDrink:false (certificate / complete record / gift card omit it).
  if(batch&&opts.bestDrink!==false&&overlays.bestDrink.show&&typeof buildBestDrinkBoxSVG==='function'){
    var bd=buildBestDrinkBoxSVG(batch,overlays.bestDrink);
    if(bd)parts.push(bd);
  }
  return parts.join('');
}
