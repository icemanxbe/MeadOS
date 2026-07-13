// ==========================================================================
// Off-flavor diagnostic wizard, tasting evolution chart, tasting side-by-side.
// Split out of the former 12-features2.js. Globals, no behaviour change.
// ==========================================================================

// ==================== OFF-FLAVOR DIAGNOSTIC WIZARD ====================
// Interactive backwards-from-symptom troubleshooter. Pick the flavors you
// taste, get the likely causes ranked by overlap, with concrete fix steps.
// Data shape: each off-flavor maps to one or more causes, and each cause
// has steps to remediate or prevent. The UI tallies cause-matches across
// selected flavors and surfaces the top hits.

// ciderCauses (where present) is used instead of causes when activeBevMode()
// is 'cider' — written as genuinely distinct cider guidance, not a mead word-
// swap. onlyFor restricts a flavor chip to a single beverage entirely (used
// for "Mousy", which has no mead-side equivalent worth surfacing).
var OFF_FLAVOR_DB={
  'Rotten egg / sulphur':{
    icon:'🥚',
    causes:[{
      cause:'Stressed yeast / nitrogen deficiency',
      severity:'high',
      fix:['Stir vigorously to degas the H₂S','Add a half-dose of nutrient immediately','Warm to 22-24°C if currently cool','Time often heals — most sulphur dissipates by bottling']
    }]
  },
  'Band-aid / medicinal':{
    icon:'🩹',
    causes:[{
      cause:'Wild yeast or bacterial contamination (4-VG / phenolic)',
      severity:'high',
      fix:['Likely Brettanomyces or wild bacteria','Cannot be removed — accept or discard','Re-evaluate sanitation: sanitizer contact time and coverage','Replace porous gear (siphon tubing, plastic wand) — biofilm sticks']
    }],
    ciderCauses:[{
      cause:'Wild yeast or bacterial contamination (4-VG / phenolic)',
      severity:'medium',
      fix:['A degree of this is the actual point of a French Cider or Sidra — traditional farmhouse funk from Brettanomyces or wild bacteria is expected there, not a flaw','In any other style, it\'s unwanted and can\'t be removed — accept or discard','Re-evaluate sanitation: sanitizer contact time and coverage','Replace porous gear (siphon tubing, plastic wand) — biofilm sticks']
    }]
  },
  'Vinegar / sharp acidic':{
    icon:'🍶',
    causes:[{
      cause:'Acetobacter contamination (oxygen exposure)',
      severity:'high',
      fix:['Limit oxygen contact: top up vessel, use airlock','Discard if strongly acetic — unrecoverable','Sanitize all vessels and gear with your no-rinse sanitizer','For prevention: fill bulk-aging vessels to >95%']
    }],
    ciderCauses:[{
      cause:'Acetobacter contamination (oxygen exposure) — cider\'s single biggest real-world spoilage risk',
      severity:'high',
      fix:['Limit oxygen contact: top up vessel, use airlock','Discard if strongly acetic — unrecoverable','Sanitize all vessels and gear with your no-rinse sanitizer','Wild-fermented, low-sulfite styles (Sidra, French Cider) carry the highest risk — a light sulfite dose (0.2-0.3g/L) cuts risk without losing much wild character']
    }]
  },
  'Cardboard / wet paper / sherry':{
    icon:'📦',
    causes:[{
      cause:'Oxidation',
      severity:'medium',
      fix:['Add 0.5g/L potassium metabisulfite to bind oxygen','Rack with minimal splashing under the surface','For aging: keep headspace <3% in bulk vessels','Some "sherry" notes are stylistic in sack meads — context matters']
    }],
    ciderCauses:[{
      cause:'Oxidation',
      severity:'medium',
      fix:['Add 0.5g/L potassium metabisulfite to bind oxygen','Rack with minimal splashing under the surface','For aging: keep headspace <3% in bulk vessels','A faint sherry-like note can be part of the character in a long-aged Applewine or English Cider — context matters before "fixing" it']
    }]
  },
  'Hot / solvent / nail polish':{
    icon:'🔥',
    causes:[{
      cause:'Fusel alcohols from high-temp fermentation',
      severity:'medium',
      fix:['Age 3-6 more months — fusels mellow significantly with time','Future batches: ferment 16-22°C, never above 26°C','Pitch enough yeast and stagger nutrients to reduce stress']
    }],
    ciderCauses:[{
      cause:'Fusel alcohols from high-temp fermentation',
      severity:'medium',
      fix:['Age 3-6 more months — fusels mellow significantly with time','Future batches: ferment 18-20°C with Nottingham/M02, never above 28°C even with heat-tolerant EC-1118','Pitch enough yeast and stagger Fermaid-O to reduce stress']
    }]
  },
  'Soapy / floral perfumed':{
    icon:'🧼',
    causes:[{
      cause:'Yeast autolysis (dead yeast cells released oils)',
      severity:'medium',
      fix:['Rack off the lees promptly after primary','Don\'t leave on gross lees longer than 3-4 weeks at warm temps','Future: cold-crash before racking to firm up sediment']
    },{
      cause:'Lavender or floral additions over-extracted',
      severity:'low',
      fix:['Reduce lavender to ≤8g per 5L next time, or use shorter contact time','Soap quality fades with 6-12 months of aging','Some character is style-appropriate for floral meads']
    }],
    ciderCauses:[{
      cause:'Yeast autolysis (dead yeast cells released oils)',
      severity:'medium',
      fix:['Rack off the lees promptly after primary','Don\'t leave on gross lees longer than 3-4 weeks at warm temps','Future: cold-crash before racking to firm up sediment']
    }]
  },
  'Buttery / butterscotch':{
    icon:'🧈',
    causes:[{
      cause:'Diacetyl from incomplete fermentation',
      severity:'medium',
      fix:['Warm to 22-24°C and hold 7-14 days — yeast will reabsorb diacetyl','Don\'t rush bottling — let yeast clean up','Future: ensure adequate yeast pitch and nutrient']
    }],
    ciderCauses:[{
      cause:'Malolactic fermentation (English Cider) or incomplete fermentation (everywhere else)',
      severity:'low',
      fix:['If this is an English Cider you deliberately let undergo MLF, this IS the intended phenolic/buttery character — taste before treating it as a flaw','If unintended: warm to 22-24°C and hold 7-14 days so the yeast reabsorbs the diacetyl','Don\'t rush bottling — let the ferment clean up first','Future: ensure adequate yeast pitch and Fermaid-O']
    }]
  },
  'Yeasty / bready':{
    icon:'🍞',
    causes:[{
      cause:'Suspended yeast in young mead',
      severity:'low',
      fix:['Age longer — usually clears with 2-3 more months','Cold-crash 2 weeks at 2-4°C drops most yeast','Bentonite or gelatin fining for stubborn cases']
    }],
    ciderCauses:[{
      cause:'Suspended yeast in young cider',
      severity:'low',
      fix:['Age longer — usually clears with 2-3 more months','Cold-crash 2 weeks at 2-4°C drops most yeast','Pectic enzyme plus a fining agent for stubborn cases — cider haze is often pectin-and-yeast combined']
    }]
  },
  'Sourness / acetone':{
    icon:'🌬',
    causes:[{
      cause:'Lactobacillus or wild bacterial fermentation',
      severity:'high',
      fix:['Some sourness is style-appropriate (e.g. Pyment)','True acetone smell = unrecoverable, discard','Improve sanitation for future batches','Check tap water quality / source — chloramine inhibits but doesn\'t kill all bacteria']
    }],
    ciderCauses:[{
      cause:'Lactobacillus or wild bacterial fermentation',
      severity:'high',
      fix:['Some sourness is entirely style-appropriate for Sidra or French Cider — that\'s the wild/rustic character those styles are built around','True acetone smell = unrecoverable, discard','Improve sanitation for future batches unless you\'re deliberately going wild','Check water quality / source — chloramine inhibits but doesn\'t kill all bacteria']
    }]
  },
  'Astringent / mouth-drying':{
    icon:'🌿',
    causes:[{
      cause:'Over-extraction of tannins from fruit, herbs, or oak',
      severity:'low',
      fix:['Age 6+ months — astringency mellows','Future: shorter contact times, gentler fruit handling (no pulverizing)','For oak: reduce cube/chip contact by half']
    }],
    ciderCauses:[{
      cause:'A genuinely high-tannin apple blend (Kingston Black, Foxwhelp) or over-extracted oak',
      severity:'low',
      fix:['Age 6+ months — English Cider and Heirloom Cider especially need this time for tannin to round out, not fade','If it\'s oak (New England Cider\'s barrel-aged version): reduce cube contact by half next time, or pull cubes earlier','Some astringency is simply the point of a bittersharp-forward single-varietal — taste before "fixing" it']
    }]
  },
  'Sweet / cloying when expected dry':{
    icon:'🍯',
    causes:[{
      cause:'Stuck fermentation',
      severity:'medium',
      fix:['Check current SG against target','Add fresh nutrient and warm to 22-24°C','If still stuck, repitch with EC-1118 (alcohol-tolerant rescue strain)','Sometimes residual sweetness is fine — taste before "fixing"']
    }],
    ciderCauses:[{
      cause:'Stuck fermentation',
      severity:'medium',
      fix:['Check current SG against target','Add fresh Fermaid-O and warm to 22-24°C','If still stuck, repitch with EC-1118 (highest-tolerance cider yeast)','French Cider, Ice Cider and Fire Cider are all DELIBERATELY sweet by design — confirm this is actually unintended before "fixing" it']
    }]
  },
  'Cooked / caramelized when not intended':{
    icon:'🍮',
    causes:[{
      cause:'Honey overheated during preparation',
      severity:'low',
      fix:['Future: never heat honey above 40°C','Maillard browning can be desirable in bochets — undesirable otherwise','Age to integrate flavor; some character will remain']
    }],
    ciderCauses:[{
      cause:'Over-caramelized maple syrup (Fire Cider) or long-term oxidative aging',
      severity:'low',
      fix:['If this was a Fire Cider brew day: the caramelization step goes from perfect to burnt in under a minute — pull the syrup the moment it smells deeply toasted rather than sharp/burnt','Cooked-apple/caramel notes can also emerge from long oxidative aging in an Applewine or English Cider — some is stylistic, too much means the vessel wasn\'t topped up well enough','Age to integrate the flavor either way; some character will remain']
    }]
  },
  'Mousy (aftertaste only, not on the nose)':{
    icon:'🐭',
    onlyFor:'cider',
    causes:[{
      cause:'Certain lactic acid bacteria producing pyridines, usually in low-sulfite, higher-pH cider',
      severity:'high',
      fix:['Only detectable retronasally (after swallowing) — if you\'re unsure, swallow a sip and wait a few seconds','Add metabisulfite promptly to suppress further bacterial activity — this stops it worsening but won\'t remove taint already present','Most common in wild-fermented, unsulfited styles (Sidra, French Cider) — a light initial sulfite dose reduces the risk without losing much character','If strong, it\'s effectively unrecoverable for drinking neat — consider it for cooking use instead']
    }]
  }
};

function openOffFlavorWizard(){
  window._offFlavorSelections={};
  renderOffFlavorWizard();
}

function toggleOffFlavorSelection(flavor){
  if(!window._offFlavorSelections)window._offFlavorSelections={};
  if(window._offFlavorSelections[flavor])delete window._offFlavorSelections[flavor];
  else window._offFlavorSelections[flavor]=true;
  renderOffFlavorWizard();
}

function renderOffFlavorWizard(){
  closeModal();
  var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
  var sel=window._offFlavorSelections||{};
  var selectedFlavors=Object.keys(sel);
  // Build chips — "Mousy" only appears for cider (no mead-side equivalent worth surfacing)
  var chips=Object.keys(OFF_FLAVOR_DB).filter(function(name){
    var entry=OFF_FLAVOR_DB[name];
    return!entry.onlyFor||entry.onlyFor===(isCider?'cider':'mead');
  }).map(function(name){
    var isSel=!!sel[name];
    var entry=OFF_FLAVOR_DB[name];
    return'<span class="filter-chip '+(isSel?'active':'')+'" onclick="toggleOffFlavorSelection(\''+name.replace(/'/g,"\\'")+'\')" style="cursor:pointer;'+(isSel?'background:rgba(232,196,106,0.2);border-color:var(--gold);color:var(--gold2)':'')+'">'+entry.icon+' '+escHtml(name)+'</span>';
  }).join('');

  // Tally causes across selected flavors — cider mode prefers ciderCauses when present
  var causeMap={};
  selectedFlavors.forEach(function(f){
    var entry=OFF_FLAVOR_DB[f];
    if(!entry)return;
    var causesToUse=(isCider&&entry.ciderCauses)?entry.ciderCauses:entry.causes;
    causesToUse.forEach(function(c){
      if(!causeMap[c.cause])causeMap[c.cause]={cause:c.cause,severity:c.severity,fix:c.fix,flavors:[],hits:0};
      causeMap[c.cause].flavors.push(f);
      causeMap[c.cause].hits++;
    });
  });
  var causes=Object.values(causeMap).sort(function(a,b){return b.hits-a.hits;});
  var diagnosis;
  if(!selectedFlavors.length){
    diagnosis='<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">Select one or more off-flavors above to get likely causes and remediation steps.</div>';
  }else{
    diagnosis=causes.map(function(c){
      var sevColor=c.severity==='high'?'var(--red)':c.severity==='medium'?'var(--gold)':'var(--text3)';
      var sevLabel=c.severity==='high'?'LIKELY':c.severity==='medium'?'POSSIBLE':'SECONDARY';
      var multiHit=c.hits>1?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);margin-left:8px">'+c.hits+' flavor matches</span>':'';
      return'<div style="background:var(--bg);border-left:3px solid '+sevColor+';border-radius:var(--radius);padding:14px;margin-bottom:10px">'
        +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><div style="font-family:var(--font-display);font-size:14px;color:var(--text)">'+escHtml(c.cause)+multiHit+'</div><div style="font-family:var(--font-mono);font-size:10px;color:'+sevColor+';letter-spacing:1.5px">'+sevLabel+'</div></div>'
        +'<ol style="padding-left:22px;margin:0;font-size:12.5px;color:var(--text2);line-height:1.6">'
        +c.fix.map(function(s){return'<li>'+escHtml(s)+'</li>';}).join('')
        +'</ol>'
        +'</div>';
    }).join('');
  }

  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:780px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">🧭 OFF-FLAVOR DIAGNOSTIC WIZARD</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Pick the flavors and aromas you\'re detecting in your batch. Multiple selections combine — common causes float to the top.</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">'+chips+'</div>'
    +'<div style="flex:1;overflow-y:auto">'+diagnosis+'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// Open a troubleshooting topic's step-by-step guidance in a detail modal.
// Topics live across two arrays (brewing + app/sync); search both by id.
function openTroubleshootTopic(id){
  var all=((typeof TROUBLESHOOT_TOPICS!=='undefined'&&TROUBLESHOOT_TOPICS)||[])
    .concat((typeof APP_TROUBLESHOOT_TOPICS!=='undefined'&&APP_TROUBLESHOOT_TOPICS)||[]);
  var t=all.find(function(x){return x.id===id;});
  if(!t)return;
  t=tsLocalizeTopic(t);
  closeModal();
  var stepsHtml=t.steps.map(function(s){return'<li style="margin-bottom:10px;line-height:1.55">'+s+'</li>';}).join('');
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:600px">'
    +'<div class="modal-title">'+t.icon+' '+escHtml(t.title)+'</div>'
    +(t.category?'<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin:-12px 0 14px">'+escHtml(t.category)+'</div>':'')
    +'<ol style="padding-left:22px;margin:0;font-size:13.5px;color:var(--text2)">'+stepsHtml+'</ol>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
// Pick mead/cider content (based on activeBevMode()) then swap in the Dutch
// version (keeping id/icon/category so grouping and the detail modal still
// work) when NL. Falls back to the mead variant if a cider version is
// missing for a given topic, so nothing renders blank.
function tsLocalizeTopic(t){
  if(!t)return t;
  var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
  var base=(isCider&&t.ciderTitle&&t.ciderSteps)?{id:t.id,icon:t.icon,category:t.category,title:t.ciderTitle,steps:t.ciderSteps}:t;
  if(typeof appLang!=='function'||appLang()!=='nl')return base;
  var nl=(typeof TROUBLESHOOT_TOPICS_NL!=='undefined'&&TROUBLESHOOT_TOPICS_NL[t.id])
        ||(typeof APP_TROUBLESHOOT_TOPICS_NL!=='undefined'&&APP_TROUBLESHOOT_TOPICS_NL[t.id]);
  if(!nl)return base;
  var nlTitle=isCider?(nl.ciderTitle||base.title):(nl.title||base.title);
  var nlSteps=isCider?(nl.ciderSteps||base.steps):(nl.steps||base.steps);
  return {id:t.id,icon:t.icon,category:t.category,title:nlTitle,steps:nlSteps};
}
function renderTroubleshoot(){
  // Group by category — each category becomes a large card, with its topics as
  // button-cards inside that open the step-by-step detail modal.
  var categories={};
  TROUBLESHOOT_TOPICS.forEach(function(t){
    var cat=t.category||'Other';
    if(!categories[cat])categories[cat]=[];
    categories[cat].push(t);
  });
  var CAT_ICONS={Fermentation:'🫧',Temperature:'🌡',"Off-Flavors":'👃',Clarity:'💧',Process:'🔧',Bottling:'🍾',Aging:'⏳',Sanitation:'🧼',Result:'🏁',Equipment:'📏',Other:'🔧'};
  // Teaser from the first step, HTML stripped — mirrors the Mead Guide cards.
  function tsTeaser(t){
    var first=String((t.steps&&t.steps[0])||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
    return first.slice(0,104);
  }
  // Same tile as the Mead Guide topic cards (icon + title + teaser + footer link).
  function topicCard(t){
    t=tsLocalizeTopic(t);
    return'<div class="card" style="cursor:pointer;margin:0" onclick="openTroubleshootTopic(\''+t.id+'\')">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px"><span style="font-size:20px">'+t.icon+'</span><div class="card-title" style="font-size:12.5px">'+escHtml(t.title.toUpperCase())+'</div></div>'
      +'<div style="font-size:12.5px;color:var(--text3);line-height:1.5">'+escHtml(tsTeaser(t))+'…</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1px;margin-top:10px">'+t.steps.length+' STEP'+(t.steps.length===1?'':'S')+' →</div>'
    +'</div>';
  }
  function catSection(cat,items,icon){
    return'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:2px;margin:22px 0 12px">'+(icon||CAT_ICONS[cat]||'🔧')+' '+escHtml(cat.toUpperCase())+' <span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">· '+items.length+' topic'+(items.length===1?'':'s')+'</span></div>'
      +'<div class="grid-3">'+items.map(topicCard).join('')+'</div>';
  }
  var categoryOrder=['Fermentation','Temperature','Off-Flavors','Clarity','Process','Bottling','Aging','Sanitation','Result','Equipment'];
  var seen={};
  var brewingHtml=categoryOrder.map(function(cat){if(!categories[cat])return'';seen[cat]=1;return catSection(cat,categories[cat]);}).join('');
  // any categories not in the explicit order land at the end
  brewingHtml+=Object.keys(categories).filter(function(c){return!seen[c];}).map(function(c){return catSection(c,categories[c]);}).join('');
  var appCard=catSection('App & Sync Issues',APP_TROUBLESHOOT_TOPICS,'🖥');
  return'<div class="page-title">Troubleshooting</div><div class="page-subtitle">Brewing problems and process guidance</div>'
    +'<div class="ornament">— ⬡ ✦ ⬡ —</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button class="btn btn-primary" onclick="openOffFlavorWizard()">🧭 Off-flavor diagnostic wizard</button></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:16px;font-style:italic">Pick a category, then tap a topic for step-by-step guidance — or use the diagnostic wizard above to work backward from observed flavors.</div>'
    +brewingHtml
    +appCard;
}

// ==================== TASTING EVOLUTION CHART ====================
// Overlays multiple tasting wheels for the same batch on a single radar,
// color-coded by date so you can see how the flavor profile evolved.
function renderTastingEvolution(tastings){
  if(!tastings||tastings.length<2)return'';
  var withWheels=tastings.filter(function(t){
    return t.wheel&&Object.values(t.wheel).some(function(v){return v>0;});
  });
  if(withWheels.length<2)return'';
  // Sort oldest → newest
  withWheels.sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  // Color palette — gray (oldest) → gold (newest)
  function colorFor(idx,total){
    var t=total===1?0:idx/(total-1);
    // gray rgb(120,120,120) → gold rgb(232,196,106)
    var r=Math.round(120+(232-120)*t);
    var g=Math.round(120+(196-120)*t);
    var b=Math.round(120+(106-120)*t);
    return'rgb('+r+','+g+','+b+')';
  }
  var size=320,cx=size/2,cy=size/2,r=size/2-40,n=TASTING_AXES.length;
  // Grid rings
  var rings=[1,2,3,4,5].map(function(level){
    var pts=TASTING_AXES.map(function(ax,i){
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var d=r*(level/5);
      return(cx+Math.cos(angle)*d)+','+(cy+Math.sin(angle)*d);
    }).join(' ');
    return'<polygon points="'+pts+'" fill="none" stroke="#2a2a35" stroke-width="0.5"/>';
  }).join('');
  // Axis lines
  var axes=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var ex=cx+Math.cos(angle)*r;
    var ey=cy+Math.sin(angle)*r;
    return'<line x1="'+cx+'" y1="'+cy+'" x2="'+ex+'" y2="'+ey+'" stroke="#2a2a35" stroke-width="0.5"/>';
  }).join('');
  // Axis labels
  var labels=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var lx=cx+Math.cos(angle)*(r+22);
    var ly=cy+Math.sin(angle)*(r+22)+4;
    return'<text x="'+lx+'" y="'+ly+'" text-anchor="middle" fill="#a89880" font-family="var(--font-mono)" font-size="9" style="text-transform:uppercase;letter-spacing:1px">'+ax.label+'</text>';
  }).join('');
  // One polygon per tasting
  var polygons=withWheels.map(function(t,idx){
    var color=colorFor(idx,withWheels.length);
    var pts=TASTING_AXES.map(function(ax,i){
      var v=(t.wheel&&t.wheel[ax.key])||0;
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var d=r*(v/5);
      return(cx+Math.cos(angle)*d)+','+(cy+Math.sin(angle)*d);
    }).join(' ');
    var isLatest=idx===withWheels.length-1;
    return'<polygon points="'+pts+'" fill="'+color+(isLatest?'40':'15')+'" stroke="'+color+'" stroke-width="'+(isLatest?2:1)+'" stroke-dasharray="'+(isLatest?'':'3,2')+'"/>';
  }).join('');
  // Legend
  var legend=withWheels.map(function(t,idx){
    var color=colorFor(idx,withWheels.length);
    var isLatest=idx===withWheels.length-1;
    return'<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px;color:'+(isLatest?'var(--gold2)':'var(--text3)')+';font-family:var(--font-mono)">'
      +'<span style="display:inline-block;width:18px;height:3px;background:'+color+';border-radius:2px"></span>'
      +'<span>'+fmtDate(t.date)+(isLatest?' · LATEST':'')+'</span>'
      +'<span style="margin-left:auto;color:var(--text3)">'+'★'.repeat(t.rating||0)+'</span>'
      +'</div>';
  }).join('');
  return'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">🌀 TASTING EVOLUTION · '+withWheels.length+' notes</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center;flex-wrap:wrap">'
    +'<div><svg viewBox="-40 -10 400 340" overflow="visible" style="width:100%;display:block;overflow:visible" preserveAspectRatio="xMidYMid meet">'+rings+axes+polygons+labels+'</svg></div>'
    +'<div>'+legend+'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">Faded outlines = earlier tastings. The solid gold polygon is the most recent. Notice which axes grew (more developed) and which mellowed (less pronounced) — that\'s your aging signature.</div></div>'
    +'</div></div>';
}

// ==================== TASTING SIDE-BY-SIDE COMPARISON ====================
// Pick 2-3 tastings of the same batch and see them rendered next to each other
// with all fields visible at once (rating, color, aroma, flavor, finish,
// wheel deltas, notes). Useful for tracking how a batch evolves with age.
//
// State lives on window._tastingCompare = { batchId, selectedIds: [] }.

function openTastingCompareModal(batchId){
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var tastings=APP.tastings[batchId]||[];
  if(tastings.length<2){toast('⚠ Need at least 2 tastings to compare');return;}
  // Default selection: most recent + oldest (good starter comparison).
  var sorted=tastings.slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  window._tastingCompare={
    batchId:batchId,
    selectedIds:[sorted[0].id,sorted[sorted.length-1].id]
  };
  renderTastingCompareModal();
}

function renderTastingCompareModal(){
  closeModal();
  var s=window._tastingCompare;
  if(!s)return;
  var b=getBatch(s.batchId);
  if(!b)return;
  var tastings=(APP.tastings[s.batchId]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});

  // Selector row — chip per tasting. Selected ones highlighted.
  var maxSelect=3;
  var chips=tastings.map(function(t){
    var sel=s.selectedIds.indexOf(t.id)!==-1;
    var label=fmtDate(t.date)+(t.rating?' · '+'★'.repeat(t.rating):'');
    return'<span class="filter-chip '+(sel?'active':'')+'" style="cursor:pointer;'+(sel?'background:rgba(232,196,106,0.2);border-color:var(--gold);color:var(--gold2)':'')+'" onclick="toggleTastingCompare(\''+t.id+'\')">'+escHtml(label)+'</span>';
  }).join('');

  var selected=tastings.filter(function(t){return s.selectedIds.indexOf(t.id)!==-1;});
  var body='';
  if(selected.length<2){
    body='<div style="padding:24px;text-align:center;color:var(--text3);font-style:italic">Pick at least 2 tastings above to compare them side by side. You can compare up to '+maxSelect+'.</div>';
  }else{
    // Column-per-tasting layout. Wheels overlaid in a combined radar.
    var cols=selected.map(function(t,idx){
      var color=['#c9a350','#8a8aa0','#a0c08a','#c89060'][idx%4];
      var fields=[
        ['Rating',t.rating?'★'.repeat(t.rating)+'☆'.repeat(5-t.rating):'—'],
        ['Color',t.color||'—'],
        ['Aroma',t.aroma||'—'],
        ['Flavor',t.flavor||'—'],
        ['Finish',t.finish||'—'],
        ['Notes',t.note||t.notes||'—']
      ];
      return'<div style="background:var(--bg);border-radius:var(--radius);border-top:3px solid '+color+';padding:14px;flex:1;min-width:0">'
        +'<div style="font-family:var(--font-display);font-size:13px;color:'+color+';margin-bottom:4px">'+fmtDate(t.date)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:14px">DAY '+(typeof bottleDaysAged==='function'?(daysSince(t.date)+' since '+fmtDate(b.startDate)):'')+'</div>'
        +fields.map(function(f){
          return'<div style="margin-bottom:10px"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:2px">'+f[0].toUpperCase()+'</div><div style="font-size:13px;color:var(--text);line-height:1.5">'+escHtml(f[1])+'</div></div>';
        }).join('')
        +'</div>';
    }).join('');

    // Overlaid radar across the selected tastings — reuses TASTING_AXES.
    var wheelOverlay='';
    if(typeof TASTING_AXES!=='undefined'){
      var withWheels=selected.filter(function(t){return t.wheel&&Object.values(t.wheel).some(function(v){return v>0;});});
      if(withWheels.length>=2){
        var size=320,cx=size/2,cy=size/2,r=size/2-40,n=TASTING_AXES.length;
        var rings=[1,2,3,4,5].map(function(level){
          var pts=TASTING_AXES.map(function(ax,i){
            var ang=(Math.PI*2*i/n)-Math.PI/2;
            var d=r*(level/5);
            return(cx+Math.cos(ang)*d)+','+(cy+Math.sin(ang)*d);
          }).join(' ');
          return'<polygon points="'+pts+'" fill="none" stroke="#2a2a35" stroke-width="0.5"/>';
        }).join('');
        var axes=TASTING_AXES.map(function(ax,i){
          var ang=(Math.PI*2*i/n)-Math.PI/2;
          var ex=cx+Math.cos(ang)*r;
          var ey=cy+Math.sin(ang)*r;
          return'<line x1="'+cx+'" y1="'+cy+'" x2="'+ex+'" y2="'+ey+'" stroke="#2a2a35" stroke-width="0.5"/>';
        }).join('');
        var labels=TASTING_AXES.map(function(ax,i){
          var ang=(Math.PI*2*i/n)-Math.PI/2;
          var lx=cx+Math.cos(ang)*(r+22);
          var ly=cy+Math.sin(ang)*(r+22)+4;
          return'<text x="'+lx+'" y="'+ly+'" text-anchor="middle" fill="#a89880" font-family="var(--font-mono)" font-size="9" style="letter-spacing:1px">'+ax.label+'</text>';
        }).join('');
        var polys=withWheels.map(function(t,idx){
          var color=['#c9a350','#8a8aa0','#a0c08a','#c89060'][idx%4];
          var pts=TASTING_AXES.map(function(ax,i){
            var v=(t.wheel&&t.wheel[ax.key])||0;
            var ang=(Math.PI*2*i/n)-Math.PI/2;
            var d=r*(v/5);
            return(cx+Math.cos(ang)*d)+','+(cy+Math.sin(ang)*d);
          }).join(' ');
          return'<polygon points="'+pts+'" fill="'+color+'30" stroke="'+color+'" stroke-width="1.5"/>';
        }).join('');
        var legend=withWheels.map(function(t,idx){
          var color=['#c9a350','#8a8aa0','#a0c08a','#c89060'][idx%4];
          return'<div style="display:flex;align-items:center;gap:8px;font-size:11px;font-family:var(--font-mono);color:var(--text2)"><span style="display:inline-block;width:16px;height:3px;background:'+color+';border-radius:2px"></span>'+fmtDate(t.date)+'</div>';
        }).join('');
        wheelOverlay='<div style="margin-top:20px;padding:14px;background:var(--bg);border-radius:var(--radius)">'
          +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:12px">TASTING WHEEL OVERLAY</div>'
          +'<div style="display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center">'
          +'<svg viewBox="-40 -10 400 340" style="width:100%;display:block;overflow:visible">'+rings+axes+polys+labels+'</svg>'
          +'<div style="display:flex;flex-direction:column;gap:8px">'+legend+'</div>'
          +'</div></div>';
      }
    }

    body='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:stretch">'+cols+'</div>'+wheelOverlay;
  }

  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:980px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">📊 COMPARE TASTINGS · '+escHtml(b.name)+'</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:10px;line-height:1.55">Pick 2-3 tastings to view side by side. The radar overlay below combines tasting-wheel scores for batches that have them.</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border)">'+chips+'</div>'
    +'<div style="flex:1;overflow-y:auto">'+body+'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function toggleTastingCompare(tastingId){
  var s=window._tastingCompare;
  if(!s)return;
  var idx=s.selectedIds.indexOf(tastingId);
  if(idx>=0){
    s.selectedIds.splice(idx,1);
  }else{
    if(s.selectedIds.length>=3){
      // Cycle: drop the oldest to make room for the new one.
      s.selectedIds.shift();
    }
    s.selectedIds.push(tastingId);
  }
  renderTastingCompareModal();
}
