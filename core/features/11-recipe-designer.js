// ==========================================================================
// Custom recipes + recipe designer wizard.
// Split out of the former 11-features.js. Globals, no behaviour change.
// ==========================================================================

// ==================== CUSTOM RECIPES ====================
var DEFAULT_RECIPE_TEMPLATE={
  name:'',style:'Traditional Mead',difficulty:'Intermediate',
  description:'',brandColor:'#c9a84c',
  volume:5,ogTarget:1.095,fgTarget:1.010,abvTarget:11.5,fermentDays:42,
  bulkAgeDays:90,minAgeDays:60,peakAgeDays:180,maxAgeDays:730,
  tags:['custom'],
  ingredients:[{item:'Honey',amount:'1.7 kg',notes:'Wildflower or local'},
               {item:'Spring water',amount:'4.5 L',notes:'Top up to 5L total'},
               {item:'Mangrove Jack\'s M05 yeast',amount:'10 g (1 packet)',notes:'Sprinkle dry'},
               {item:'Mead Yeast Nutrient',amount:'12 g',notes:'SNA across 2 doses'}],
  steps:[{day:0,title:'Brew Day',desc:'Sanitize. Mix honey with warm water until dissolved. Top up to 5L. Pitch yeast. Seal with airlock.'},
         {day:1,title:'First Nutrient',desc:'Add 6g nutrient. Stir gently.'},
         {day:3,title:'Second Nutrient',desc:'Add remaining 6g nutrient. Log gravity.'},
         {day:14,title:'Mid-Fermentation Reading',desc:'Take gravity reading. Should be around 1.020.'},
         {day:42,title:'Bottling Day',desc:'Final gravity should be stable. Rack, optionally stabilize, bottle.'}]
};
// Cider counterpart of DEFAULT_RECIPE_TEMPLATE — a blank "+ Create Recipe" in
// cider mode should start from juice/Nottingham, not honey/M05.
var DEFAULT_CIDER_RECIPE_TEMPLATE={
  name:'',style:'Common Cider',difficulty:'Beginner',
  description:'',brandColor:'#8ab030',
  volume:5,ogTarget:1.055,fgTarget:1.005,abvTarget:6.5,fermentDays:21,
  bulkAgeDays:30,minAgeDays:14,peakAgeDays:60,maxAgeDays:270,
  tags:['custom'],
  ingredients:[{item:'Apple Juice',amount:'5.0 L',notes:'Fresh-pressed or 100% juice, no preservatives/sorbate'},
               {item:'Lallemand Nottingham Yeast',amount:'11 g (1 packet)',notes:'Neutral — lets the apple lead'},
               {item:'Pectic Enzyme',amount:'2 g',notes:'Prevents a lasting pectin haze'},
               {item:'Fermaid-O',amount:'2 g',notes:'Staggered addition — juice YAN varies by source, safer to assume it needs help'}],
  steps:[{day:0,title:'Brew Day',desc:'Sanitize. Combine juice in the fermenter. Stir in pectic enzyme. Take an OG reading. Pitch yeast. Seal with airlock.'},
         {day:1,title:'First Nutrient',desc:'Add 1g Fermaid-O. Stir gently.'},
         {day:7,title:'1/3 Sugar Break Nutrient',desc:'Once past the 1/3 sugar break, add the remaining 1g Fermaid-O — the last nutrient addition.'},
         {day:14,title:'Rack & Check',desc:'Rack off the initial sediment. Take a gravity reading.'},
         {day:21,title:'Bottling Day',desc:'Final gravity should be stable. To back-sweeten, stabilise first with metabisulfite AND sorbate together.'}]
};

// ==================== RECIPE DESIGNER WIZARD ====================
// A guided alternative to the manual recipe editor: pick a style + targets and
// the wizard back-solves the honey/OG/FG math, recommends a yeast that can
// finish the ABV, suggests a nutrient protocol, and assembles ingredients +
// a step schedule. On finish it seeds window._editingRecipe and hands off to
// the existing renderRecipeEditor() so save/validation reuse one path.
var WIZ_STYLES=[
  {key:'Traditional Mead',label:'Traditional',color:'#c9a84c',adjunct:null,desc:'Honey, water, yeast — nothing to hide behind.'},
  {key:'Melomel',label:'Melomel (fruit)',color:'#c04858',adjunct:'fruit',desc:'Mead fermented with fruit.'},
  {key:'Cyser',label:'Cyser (apple)',color:'#8a3838',adjunct:'juice',desc:'Mead made with apple juice in place of some water.'},
  {key:'Metheglin',label:'Metheglin (spiced)',color:'#7a5230',adjunct:'spice',desc:'Mead with herbs/spices.'},
  {key:'Bochet',label:'Bochet (caramelised)',color:'#5a3a20',adjunct:null,desc:'Honey caramelised before fermenting — toffee, marshmallow.'},
  {key:'Pyment',label:'Pyment (grape)',color:'#6a2a4a',adjunct:'juice',desc:'Mead with grape juice/wine must.'},
  {key:'Braggot',label:'Braggot (malt)',color:'#9a6a2a',adjunct:null,desc:'Mead/beer hybrid with malt.'},
  {key:'Sparkling Mead',label:'Sparkling',color:'#4a8ab0',adjunct:null,desc:'Bottle-conditioned and naturally carbonated — ferment fully dry, don\'t stabilize, prime at bottling.'}
];
// Derived from the canonical MEAD_SWEETNESS_SCALE (03-brew-domain.js) so the
// wizard's picker always agrees with the bottling-record dropdown and the
// backsweetening calculator. Each button's fg is that tier's ceiling (its
// sweetest edge) — Dessert has no real ceiling, so it falls back to a
// representative dessert-mead point (per GotMead's "Dessert Sweet: 1.035-
// 1.060" convention) since the wizard's math needs one finite number.
var WIZ_SWEETNESS=MEAD_SWEETNESS_SCALE.map(function(s){
  return{key:s.key,label:s.label,fg:s.fgMax===Infinity?1.045:s.fgMax,desc:s.desc};
});
function wizComputeMath(w){
  var sw=WIZ_SWEETNESS.find(function(s){return s.key===w.sweetness;})||WIZ_SWEETNESS[3];
  var fg=sw.fg;
  var abv=parseFloat(w.abv)||12;
  var vol=parseFloat(w.volume)||5;
  var og=fg+abv/131.25;
  var st=WIZ_STYLES.find(function(s){return s.key===w.style;})||WIZ_STYLES[0];
  // Fruit/juice brings its own fermentable sugar — a melomel/cyser sized as if
  // honey supplied 100% of the OG always calls for more honey than it needs.
  // Falls back to the wizard's own default adjunct amount (same one the
  // ingredient list uses) when the user hasn't typed a quantity yet.
  var adjunctAmount='',adjunctKg=0,adjunctHoneyEquivKg=0;
  if(st.adjunct==='fruit'||st.adjunct==='juice'){
    var typed=parseFloat(w.adjunctAmount)||0;
    if(typed>0){adjunctKg=typed;adjunctAmount=w.adjunctAmount;}
    else{adjunctKg=st.adjunct==='fruit'?Math.round(vol*0.3*10)/10:Math.round(vol*0.5*10)/10;adjunctAmount=adjunctKg+(st.adjunct==='fruit'?' kg':' L');}
    adjunctHoneyEquivKg=(typeof mwAdjunctHoneyEquivalentKg==='function')?mwAdjunctHoneyEquivalentKg(w.adjunctName,adjunctKg,MW_ADJUNCT_BRIX_DEFAULT):0;
  }
  var honeyKg=Math.max(0,(typeof mwHoneyKg==='function'?mwHoneyKg(og,vol):(og-1)*1000*vol/292)-adjunctHoneyEquivKg);
  return{fg:fg,og:Math.round(og*1000)/1000,abv:abv,vol:vol,honeyKg:Math.round(honeyKg*100)/100,
    adjunctAmount:adjunctAmount,adjunctHoneyEquivKg:adjunctHoneyEquivKg};
}
function wizRecommendYeasts(targetAbv){
  // Strains that can comfortably finish the target, sorted by headroom then
  // by how clean/honey-friendly they are (M05 first among equals).
  var ok=YEAST_STRAINS.filter(function(y){return (y.abvMax||14)>=targetAbv+0.5;});
  ok.sort(function(a,b){
    if(a.id==='m05')return-1;if(b.id==='m05')return 1;
    return(a.abvMax||14)-(b.abvMax||14);
  });
  return ok.length?ok:YEAST_STRAINS.slice();
}

// ==================== CIDER RECIPE DESIGNER WIZARD ====================
// Cider counterpart to the mead wizard above. Shares the same step shell
// (renderRecipeWizard, wizNav, the modal) but diverges on the two things
// that are genuinely different for cider: there's no honey to back-solve
// (juice supplies its own OG — see Formulas & Methods §17 in the wiki).
var WIZ_CIDER_STYLES=[
  {key:'Common Cider',label:'Common',color:'#8ab030',adjunct:null,desc:'Culinary apples — the honest everyday cider.'},
  {key:'Heirloom Cider',label:'Heirloom',color:'#6a4020',adjunct:null,desc:'Real cider-apple character — a bittersweet + sharp blend.'},
  {key:'English Cider',label:'English',color:'#754020',adjunct:null,desc:'Tannic and full-bodied, built around a bittersharp backbone.'},
  {key:'New England Cider',label:'New England',color:'#9a6a2a',adjunct:null,desc:'Higher-ABV, raisin/brown-sugar boosted tradition.'},
  {key:'Fruit Cider',label:'Fruit',color:'#c04858',adjunct:'fruit',desc:'Apple cider fermented or blended with fruit.'},
  {key:'Spiced Cider',label:'Spiced',color:'#7a5230',adjunct:'spice',desc:'Warming spices — mulled-cider character.'},
  {key:'Ice Cider',label:'Ice Cider',color:'#5a8aa0',adjunct:null,desc:'Freeze-concentrated juice — rich, dessert-sweet.'},
  {key:'Sparkling Cider',label:'Sparkling',color:'#d4b860',adjunct:null,desc:'Bottle-conditioned and naturally carbonated — ferment fully dry, don\'t stabilize, prime at bottling.'}
];
// Cider's own scale (03-brew-domain.js CIDER_SWEETNESS_SCALE) — BJCP's real
// Dry/Medium/Sweet bands sit MUCH lower than mead's (cider's "Sweet" starts
// around FG 1.012-1.030, not mead's 1.020-1.035+), so cider needs its own
// button list rather than sharing WIZ_SWEETNESS.
var WIZ_CIDER_SWEETNESS=CIDER_SWEETNESS_SCALE.map(function(s){
  return{key:s.key,label:s.label,fg:s.fgMax===Infinity?1.045:s.fgMax,desc:s.desc};
});
function wizComputeCiderMath(w){
  var sw=WIZ_CIDER_SWEETNESS.find(function(s){return s.key===w.sweetness;})||WIZ_CIDER_SWEETNESS[1];
  var fg=sw.fg;
  var abv=parseFloat(w.abv)||6.5;
  var vol=parseFloat(w.volume)||5;
  var og=fg+abv/131.25;
  // No honey-equivalent back-solve here — juice supplies its own fermentable
  // sugar, so there's nothing to weigh out the way honey is. The wizard's
  // job is to tell you the OG your juice/blend needs to hit, not to compute
  // an ingredient amount (see Cider-Mode wiki page for why).
  return{fg:fg,og:Math.round(og*1000)/1000,abv:abv,vol:vol,juiceL:vol};
}
function wizRecommendCiderYeasts(targetAbv){
  var ciderYeasts=YEAST_STRAINS.filter(function(y){return(y.beverageTypes||[]).indexOf('cider')>=0;});
  var ok=ciderYeasts.filter(function(y){return(y.abvMax||14)>=targetAbv+0.5;});
  ok.sort(function(a,b){
    if(a.id==='nottingham')return-1;if(b.id==='nottingham')return 1;
    return(a.abvMax||14)-(b.abvMax||14);
  });
  return ok.length?ok:ciderYeasts;
}
function wizBuildCiderRecipe(w){
  var m=wizComputeCiderMath(w);
  var st=WIZ_CIDER_STYLES.find(function(s){return s.key===w.style;})||WIZ_CIDER_STYLES[0];
  var yeast=getYeastById(w.yeast)||wizRecommendCiderYeasts(m.abv)[0];
  var fermDays=m.abv>=9?35:21;
  var ingredients=[
    {item:'Apple Juice',amount:m.juiceL+' L',notes:st.key==='Ice Cider'?'Freeze-concentrate part of this to reach the target OG':'Fresh-pressed or 100% juice, no preservatives/sorbate'}
  ];
  if(st.adjunct==='fruit'||st.adjunct==='spice'){
    ingredients.push({item:w.adjunctName||(st.adjunct==='fruit'?'Fruit':'Spices'),amount:w.adjunctAmount||(st.adjunct==='fruit'?Math.round(m.vol*0.2*10)/10+' kg':'to taste'),notes:'Add in secondary'});
  }
  if(st.key==='New England Cider'){
    ingredients.push({item:'Raisins',amount:Math.round(m.vol*0.1*100)/100+' kg',notes:'Traditional gravity/body boost'});
    ingredients.push({item:'Brown Sugar',amount:Math.round(m.vol*0.1*100)/100+' kg',notes:'Dissolve into the juice to help reach target OG'});
  }
  ingredients.push({item:yeast.name,amount:(yeast.sachetSize||11)+' '+(yeast.unit||'g')+' (1 packet)',notes:'Sprinkle on must or rehydrate per packet instructions'});
  ingredients.push({item:'Pectic Enzyme',amount:Math.round(m.vol*0.4*10)/10+' g',notes:'Prevents a lasting pectin haze — apple/pear juice always carries natural pectin'});
  ingredients.push({item:'Fermaid-O',amount:Math.round(m.vol*0.4*10)/10+' g total',notes:'Staggered addition — juice YAN varies by source, safer to assume it needs help'});
  var isSparklingCiderStyle=(st.key==='Sparkling Cider');
  if(isSparklingCiderStyle){
    ingredients.push({item:'Corn Sugar (dextrose)',amount:Math.round(m.vol*6.6)+' g',notes:'Priming sugar for ~2.5 volumes CO₂ — added at bottling, NOT now. Recalculate with Brewing Tools → Carbonation / Priming Sugar for your actual temperature and target.'});
  }
  var steps=[
    {day:0,title:'Brew Day',desc:'Clean & sanitize. Combine the juice'+(st.adjunct==='fruit'?' and fruit':'')+' in the fermenter. Stir in the pectic enzyme. Take an OG reading (target '+m.og+'). Sprinkle/rehydrate '+yeast.name.split('—')[0].trim()+' and pitch. Seal with airlock.'},
    {day:1,title:'First Nutrient',desc:'Add half the Fermaid-O. Stir gently to mix without losing CO2.'},
    {day:7,title:'1/3 Sugar Break Nutrient',desc:'Once at or past the 1/3 sugar break, add the remaining Fermaid-O — the last nutrient addition.'},
    {day:14,title:'Rack & Check',desc:'Rack off the initial sediment to a clean vessel. Take a gravity reading — should be dropping steadily toward '+m.fg.toFixed(3)+'.'},
    isSparklingCiderStyle
      ?{day:fermDays,title:'Confirm Dry, Then Prime & Bottle',desc:'Two stable readings near '+m.fg.toFixed(3)+' at least 5 days apart confirm this is really finished — do NOT stabilise, sorbate/sulfite would kill the yeast that makes the bubbles. Size the priming dose with Brewing Tools → Carbonation / Priming Sugar for your actual volume and temperature, then bottle in pressure-rated bottles (champagne/Belgian + crown caps or wired corks).'}
      :{day:fermDays,title:'Final Gravity & Bottle',desc:'Two stable readings near '+m.fg.toFixed(3)+' confirm completion. To back-sweeten, stabilise first with metabisulfite AND sorbate together. Then bottle.'}
  ];
  var minDays=m.abv>=9?60:14;
  return{
    name:w.name||((WIZ_CIDER_STYLES.find(function(s){return s.key===w.style;})||{}).label||'Cider')+' (Designed)',
    style:w.style,difficulty:m.abv>=9?'Intermediate':'Beginner',
    description:'Designed for '+m.abv+'% ABV, '+(WIZ_CIDER_SWEETNESS.find(function(s){return s.key===w.sweetness;})||WIZ_CIDER_SWEETNESS[1]).label.toLowerCase()+'. '+st.desc,
    brandColor:st.color,beverageType:'cider',
    volume:m.vol,ogTarget:m.og,fgTarget:m.fg,abvTarget:m.abv,fermentDays:fermDays,
    minAgeDays:minDays,peakAgeDays:minDays+60,maxAgeDays:minDays+240,
    tags:['custom','designed',st.label.split(' ')[0].toLowerCase()],
    ingredients:ingredients,steps:steps
  };
}

function openRecipeWizard(){
  closeModal();
  var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
  window._wiz={step:0,name:'',style:isCider?'Common Cider':'Traditional Mead',volume:5,abv:isCider?6.5:12,sweetness:isCider?'medium':'semi-sweet',
    yeast:isCider?'nottingham':'m05',nutrient:'tosca2',adjunctName:'',adjunctAmount:''};
  renderRecipeWizard();
}
function wizSet(field,val){
  if(!window._wiz)return;
  window._wiz[field]=val;
  // Picking a style preselects a sensible adjunct placeholder
  if(field==='style'){
    var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
    var st=(isCider?WIZ_CIDER_STYLES:WIZ_STYLES).find(function(s){return s.key===val;});
    if(st&&st.adjunct&&!window._wiz.adjunctName){
      window._wiz.adjunctName=st.adjunct==='fruit'?(isCider?'Fruit (e.g. blackberries)':'Fruit (e.g. raspberries)'):st.adjunct==='juice'?(val==='Cyser'?'Fresh apple juice':'Grape juice'):'Spices';
    }
  }
  renderRecipeWizard();
}
function wizNav(delta){
  if(!window._wiz)return;
  // Read free-text/numeric inputs that aren't button-driven before navigating
  var nameEl=document.getElementById('wiz-name');if(nameEl)window._wiz.name=nameEl.value;
  var volEl=document.getElementById('wiz-vol');if(volEl)window._wiz.volume=parseFloat(volEl.value)||5;
  var abvEl=document.getElementById('wiz-abv');if(abvEl)window._wiz.abv=parseFloat(abvEl.value)||12;
  var yEl=document.getElementById('wiz-yeast');if(yEl)window._wiz.yeast=yEl.value;
  var nEl=document.getElementById('wiz-nutrient');if(nEl)window._wiz.nutrient=nEl.value;
  var anEl=document.getElementById('wiz-adj-name');if(anEl)window._wiz.adjunctName=anEl.value;
  var aaEl=document.getElementById('wiz-adj-amt');if(aaEl)window._wiz.adjunctAmount=aaEl.value;
  window._wiz.step=Math.max(0,Math.min(3,window._wiz.step+delta));
  renderRecipeWizard();
}
function wizBuildRecipe(){
  var w=window._wiz;
  if((typeof activeBevMode==='function')&&activeBevMode()==='cider')return wizBuildCiderRecipe(w);
  var m=wizComputeMath(w);
  var st=WIZ_STYLES.find(function(s){return s.key===w.style;})||WIZ_STYLES[0];
  var yeast=getYeastById(w.yeast)||YEAST_STRAINS[0];
  var fermDays=m.abv>=15?56:42;
  var ingredients=[
    {item:'Honey',amount:m.honeyKg+' kg',notes:st.key==='Bochet'?'Caramelise before fermenting':'Best quality you can source'}
  ];
  if(st.adjunct==='juice'){
    ingredients.push({item:w.adjunctName||'Juice',amount:m.adjunctAmount,notes:'Replaces part of the water'});
    ingredients.push({item:'Spring water',amount:'to '+m.vol+' L total',notes:'Top up after honey + juice'});
  }else{
    ingredients.push({item:'Spring water',amount:'to '+m.vol+' L total',notes:'Chlorine-free; top up to volume'});
  }
  ingredients.push({item:yeast.name,amount:(yeast.sachetSize||10)+' '+(yeast.unit||'g')+' (1 packet)',notes:yeast.format==='dry'&&yeast.id!=='m05'?'Rehydrate with GoFerm':'Sprinkle on must'});
  var nutLabel=(w.nutrient==='sna'||w.nutrient==='sna-high')?'Mead Yeast Nutrient':'Fermaid-O';
  ingredients.push({item:nutLabel,amount:Math.round(m.vol*2.5)+' g total',notes:(w.nutrient==='tosca2'?'TOSCA 2.0':w.nutrient==='tosna2'?'TOSNA':w.nutrient==='tiosna'?'TiOSNA':w.nutrient==='sna-high'?'SNA, 3 doses':'SNA, 2 doses')+' schedule'});
  if(st.adjunct==='fruit'||st.adjunct==='spice'){
    ingredients.push({item:w.adjunctName||(st.adjunct==='fruit'?'Fruit':'Spices'),amount:st.adjunct==='fruit'?m.adjunctAmount:(w.adjunctAmount||'to taste'),notes:'Add in secondary'});
  }
  var isSparklingStyle=(st.key==='Sparkling Mead');
  if(isSparklingStyle){
    ingredients.push({item:'Corn Sugar (dextrose)',amount:Math.round(m.vol*6.6)+' g',notes:'Priming sugar for ~2.5 volumes CO₂ — added at bottling, NOT now. Recalculate with Brewing Tools → Carbonation / Priming Sugar for your actual temperature and target.'});
  }
  var organic=(w.nutrient!=='sna'&&w.nutrient!=='sna-high');
  var steps=[
    {day:0,title:'Brew Day',desc:'Clean & sanitize. '+(st.key==='Bochet'?'Caramelise the honey to your target colour, cool, then ':'')+'dissolve honey in '+(st.adjunct==='juice'?'juice + water':'water')+', top up to '+m.vol+' L. Take OG (target '+m.og+'). '+(yeast.id==='m05'?'Sprinkle yeast on the surface.':'Rehydrate yeast (GoFerm) and pitch.')+' Seal with airlock.'},
    {day:1,title:organic?'GoFerm / Dose 1':'First Nutrient',desc:'Add the first nutrient dose. Confirm airlock activity within 24h.'},
    {day:3,title:'Nutrient Dose 2',desc:'Add the next dose. Gentle degas. Log gravity.'},
    {day:7,title:'Sugar-break check',desc:'Around the 1/3 sugar break — add the final dose if your protocol schedules one. Log gravity.'}
  ];
  if(st.adjunct==='fruit'||st.adjunct==='spice'||st.adjunct==='juice'&&st.key==='Pyment'){
    steps.push({day:14,title:'Rack onto '+(st.adjunct==='spice'?'spices':'fruit'),desc:'Rack to secondary'+(st.adjunct!=='spice'?' onto '+(w.adjunctName||'fruit'):'')+'. Taste periodically and pull when balanced.'});
  }else{
    steps.push({day:14,title:'Rack to secondary',desc:'If gravity is stable, rack off the lees. Optionally add K-meta.'});
  }
  steps.push(isSparklingStyle
    ?{day:fermDays,title:'Confirm Dry, Then Prime & Bottle',desc:'Two stable readings near '+m.fg+' at least 5 days apart confirm this is really finished — do NOT stabilise, sorbate/sulfite would kill the yeast that makes the bubbles. Size the priming dose with Brewing Tools → Carbonation / Priming Sugar for your actual volume and temperature, then bottle in pressure-rated bottles (champagne/Belgian + crown caps or wired corks).'}
    :{day:fermDays,title:'Final gravity & bottle',desc:'Two stable readings near '+m.fg+' confirm completion. Stabilise if backsweetening, then bottle.'});
  var minDays=m.abv>=15?120:75;
  return{
    name:w.name||((WIZ_STYLES.find(function(s){return s.key===w.style;})||{}).label||'Mead')+' (Designed)',
    style:w.style,difficulty:m.abv>=15?'Advanced':'Intermediate',
    description:'Designed for '+m.abv+'% ABV, '+(WIZ_SWEETNESS.find(function(s){return s.key===w.sweetness;})||WIZ_SWEETNESS[3]).label.toLowerCase()+'. '+st.desc,
    brandColor:st.color,
    volume:m.vol,ogTarget:m.og,fgTarget:m.fg,abvTarget:m.abv,fermentDays:fermDays,
    minAgeDays:minDays,peakAgeDays:minDays+120,maxAgeDays:minDays+700,
    tags:['custom','designed',st.label.split(' ')[0].toLowerCase()],
    ingredients:ingredients,steps:steps
  };
}
function wizFinish(){
  wizNav(0); // flush any open inputs into state
  var recipe=wizBuildRecipe();
  recipe.id=null;
  window._editingRecipe=recipe;
  window._wiz=null;
  renderRecipeEditor(); // hand off to the existing editor for fine-tune + save
}
// Cancelling the wizard (Cancel button or backdrop click) needs to also
// clear window._wiz, not just close the modal — otherwise reopening the
// wizard would resume the abandoned draft instead of starting fresh.
function _closeWizardModal(){
  closeModal();
  window._wiz=null;
}
function renderRecipeWizard(){
  var w=window._wiz;if(!w)return;
  var existing=document.querySelector('.modal-overlay');if(existing)existing.remove();
  var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
  var m=isCider?wizComputeCiderMath(w):wizComputeMath(w);
  var styleList=isCider?WIZ_CIDER_STYLES:WIZ_STYLES;
  var sweetList=isCider?WIZ_CIDER_SWEETNESS:WIZ_SWEETNESS;
  var steps=['Style & Targets','Yeast','Adjuncts & Nutrient','Review'];
  var dots=steps.map(function(s,i){
    return'<div style="display:flex;align-items:center;gap:6px"><div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:11px;'+(i===w.step?'background:var(--gold);color:#1a1a0f':i<w.step?'background:var(--green2);color:#0f0f0a':'background:var(--bg3);color:var(--text3)')+'">'+(i<w.step?'✓':(i+1))+'</div><span style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.5px;color:'+(i===w.step?'var(--gold2)':'var(--text3)')+'">'+s+'</span></div>';
  }).join('<div style="flex:1;height:1px;background:var(--border);min-width:8px"></div>');
  var body='';
  if(w.step===0){
    var styleBtns=styleList.map(function(s){
      var on=w.style===s.key;
      return'<button type="button" data-action="wizSet" data-args=\''+JSON.stringify(['style',s.key])+'\' style="text-align:left;padding:10px 12px;border-radius:var(--radius);cursor:pointer;border:1px solid '+(on?s.color:'var(--border)')+';background:'+(on?s.color+'22':'var(--bg3)')+'"><div style="font-size:13px;color:'+(on?s.color:'var(--text)')+';font-weight:500">'+s.label+'</div><div style="font-size:11px;color:var(--text3);line-height:1.3;margin-top:2px">'+s.desc+'</div></button>';
    }).join('');
    var sweetBtns=sweetList.map(function(s){
      var on=w.sweetness===s.key;
      return'<button type="button" data-action="wizSet" data-args=\''+JSON.stringify(['sweetness',s.key])+'\' style="flex:1;min-width:84px;padding:8px 6px;border-radius:var(--radius);cursor:pointer;border:1px solid '+(on?'var(--gold)':'var(--border)')+';background:'+(on?'rgba(201,168,76,0.14)':'var(--bg3)')+'"><div style="font-size:12px;color:'+(on?'var(--gold2)':'var(--text)')+'">'+s.label+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);margin-top:2px">FG '+s.fg.toFixed(3)+'</div></button>';
    }).join('');
    body='<div class="form-group"><label class="form-label">Recipe Name</label><input class="form-input" id="wiz-name" value="'+escHtml(w.name)+'" placeholder="'+(isCider?'My Designer Cider':'My Designer Mead')+'"></div>'
      +'<div class="form-group"><label class="form-label">Style</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+styleBtns+'</div></div>'
      +'<div class="form-row"><div class="form-group"><label class="form-label">Batch Volume (L)</label><input class="form-input" id="wiz-vol" type="number" step="0.5" value="'+w.volume+'" oninput="window._wiz.volume=parseFloat(this.value)||5;wizUpdateMath()"></div>'
      +'<div class="form-group"><label class="form-label">Target ABV (%)</label><input class="form-input" id="wiz-abv" type="number" step="0.5" value="'+w.abv+'" oninput="window._wiz.abv=parseFloat(this.value)||'+(isCider?6.5:12)+';wizUpdateMath()"></div></div>'
      +'<div class="form-group"><label class="form-label">Sweetness</label><div style="display:flex;gap:6px;flex-wrap:wrap">'+sweetBtns+'</div></div>'
      +wizMathBox(m);
  }else if(w.step===1){
    var recs=isCider?wizRecommendCiderYeasts(m.abv):wizRecommendYeasts(m.abv);
    var recIds={};recs.slice(0,3).forEach(function(y){recIds[y.id]=true;});
    var yeastPool=isCider?YEAST_STRAINS.filter(function(y){return(y.beverageTypes||[]).indexOf('cider')>=0;}):YEAST_STRAINS;
    var opts=yeastPool.map(function(y){
      var fits=(y.abvMax||14)>=m.abv+0.5;
      return'<option value="'+y.id+'"'+(w.yeast===y.id?' selected':'')+'>'+escHtml(y.name)+' · '+(y.abvMax||'?')+'% max'+(fits?'':' ⚠ below target')+(recIds[y.id]?' ★':'')+'</option>';
    }).join('');
    var chosen=getYeastById(w.yeast)||yeastPool[0];
    var fitsTarget=(chosen.abvMax||14)>=m.abv+0.5;
    body='<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.5">For <strong>'+m.abv+'% ABV</strong> you need a yeast that tolerates at least that. ★ marks strains recommended for this target ('+(isCider?'cider-appropriate':'honey-friendly')+', enough headroom).</div>'
      +'<div class="form-group"><label class="form-label">Yeast Strain</label><select class="form-select" id="wiz-yeast" onchange="window._wiz.yeast=this.value;renderRecipeWizard()">'+opts+'</select></div>'
      +'<div style="padding:12px;background:var(--bg3);border-radius:var(--radius);border-left:3px solid '+(fitsTarget?'var(--green2)':'var(--red2)')+'">'
      +'<div style="font-size:13px;color:var(--text);font-weight:500">'+escHtml(chosen.name)+'</div>'
      +'<div style="font-size:12px;color:var(--text2);margin-top:4px;line-height:1.5">'+escHtml(chosen.profile||'')+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text3);margin-top:6px">ABV max '+(chosen.abvMax||'?')+'% · temp '+(chosen.optimalTempLow||'?')+'–'+(chosen.optimalTempHigh||'?')+'°C · N demand '+(chosen.nitrogenNeed||'?')+'</div>'
      +(fitsTarget?'':'<div style="font-size:12px;color:var(--red2);margin-top:6px">⚠ This strain may not reach '+m.abv+'% — it could stall sweet. Pick one with higher tolerance or lower your target.</div>')
      +'</div>'+wizMathBox(m);
  }else if(w.step===2){
    var st=styleList.find(function(s){return s.key===w.style;})||styleList[0];
    var adjBlock='';
    if(st.adjunct){
      adjBlock='<div class="form-row"><div class="form-group"><label class="form-label">'+(st.adjunct==='fruit'?'Fruit':st.adjunct==='spice'?'Spice / herb':'Juice')+'</label><input class="form-input" id="wiz-adj-name" value="'+escHtml(w.adjunctName)+'" placeholder="'+(st.adjunct==='fruit'?(isCider?'Blackberries, frozen':'Raspberries, frozen'):st.adjunct==='spice'?'Cinnamon, vanilla…':'Apple juice')+'"></div>'
        +'<div class="form-group"><label class="form-label">Amount</label><input class="form-input" id="wiz-adj-amt" value="'+escHtml(w.adjunctAmount)+'" placeholder="'+(st.adjunct==='fruit'?(Math.round(m.vol*(isCider?0.2:0.3)*10)/10+' kg'):st.adjunct==='spice'?'2 sticks':(Math.round(m.vol*0.5*10)/10+' L'))+'"></div></div>';
    }else{
      adjBlock='<div style="font-size:13px;color:var(--text3);font-style:italic;margin-bottom:12px">'+escHtml(st.label)+' is a base-style '+(isCider?'cider':'mead')+' — no fruit/spice adjuncts. You can still add some in the editor afterwards.</div>';
    }
    if(isCider){
      body=adjBlock
        +'<div style="font-size:13px;color:var(--text2);line-height:1.5;padding:12px;background:var(--bg3);border-radius:var(--radius)">Cider recipes use a simple two-dose Fermaid-O schedule (half at pitch, half at the 1/3 sugar break) — no protocol picker needed here. Pectic enzyme is included by default since apple/pear juice always carries natural pectin.</div>'
        +wizMathBox(m);
    }else{
    body=adjBlock
      +'<div class="form-group"><label class="form-label">Nutrient Protocol</label><select class="form-select" id="wiz-nutrient" onchange="window._wiz.nutrient=this.value">'
      +'<option value="tosca2"'+(w.nutrient==='tosca2'?' selected':'')+'>TOSCA 2.0 — organic, recommended</option>'
      +'<option value="tosna2"'+(w.nutrient==='tosna2'?' selected':'')+'>TOSNA (classic) — organic</option>'
      +'<option value="tiosna"'+(w.nutrient==='tiosna'?' selected':'')+'>TiOSNA — organic, front-loaded</option>'
      +'<option value="sna"'+(w.nutrient==='sna'?' selected':'')+'>SNA — standard (2 doses)</option>'
      +'<option value="sna-high"'+(w.nutrient==='sna-high'?' selected':'')+'>SNA — high-gravity (3 doses)</option>'
      +'</select><div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">Organic (Fermaid-O) protocols give the cleanest honey character. High-gravity (≥15%) batches benefit from the extra dose.</div></div>'
      +wizMathBox(m);
    }
  }else{
    var built=wizBuildRecipe();
    body='<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Here\'s your designed recipe. Open it in the editor to tweak ingredient amounts, steps, and aging windows before saving.</div>'
      +'<div style="padding:14px;background:var(--bg3);border-radius:var(--radius)">'
      +'<div style="font-family:var(--font-display);font-size:18px;color:'+built.brandColor+'">'+escHtml(built.name)+'</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-bottom:8px">'+escHtml(built.style)+' · '+built.difficulty+'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0">'
      +['OG '+built.ogTarget,'FG '+built.fgTarget,built.abvTarget+'% ABV',built.volume+' L'].map(function(x){return'<div style="text-align:center;padding:8px 4px;background:var(--bg);border-radius:6px;font-family:var(--font-mono);font-size:12px;color:var(--gold2)">'+x+'</div>';}).join('')+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;color:var(--text3);margin:8px 0 4px">INGREDIENTS</div>'
      +built.ingredients.map(function(i){return'<div style="font-size:12.5px;color:var(--text2);padding:2px 0">• '+escHtml(i.item)+' — <span style="color:var(--text3)">'+escHtml(i.amount)+'</span></div>';}).join('')
      +'<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;color:var(--text3);margin:10px 0 4px">SCHEDULE · '+built.steps.length+' STEPS over '+built.fermentDays+' days</div>'
      +built.steps.map(function(s){return'<div style="font-size:12px;color:var(--text2);padding:2px 0">Day '+s.day+' — '+escHtml(s.title)+'</div>';}).join('')
      +'</div>';
  }
  var backBtn=w.step>0?'<button class="btn btn-secondary" data-action="wizNav" data-args=\''+JSON.stringify([-1])+'\'>← Back</button>':'<button class="btn btn-secondary" data-action="_closeWizardModal">Cancel</button>';
  var nextBtn=w.step<3?'<button class="btn btn-primary" data-action="wizNav" data-args=\''+JSON.stringify([1])+'\'>Next →</button>':'<button class="btn btn-primary" data-action="wizFinish">Open in Editor →</button>';
  var html='<div class="modal-overlay" data-backdrop-action="_closeWizardModal"><div class="modal" style="max-width:640px">'
    +'<div class="modal-title">✦ RECIPE DESIGNER</div>'
    +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap">'+dots+'</div>'
    +body
    +'<div class="modal-actions">'+backBtn+nextBtn+'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
function wizMathBox(m){
  return'<div style="margin-top:14px;padding:12px;background:var(--bg4);border-radius:var(--radius);border:1px solid var(--border)">'
    +'<div style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--text3);margin-bottom:8px">⚗ THE MATH (auto)</div>'
    +'<div id="wiz-math-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'+wizMathCells(m)+'</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-top:8px;line-height:1.4">'+wizMathNote(m)+'</div></div>';
}
function wizMathCells(m){
  var last=m.juiceL!=null?['Juice',m.juiceL+' L']:['Honey',m.honeyKg+' kg'];
  return[['OG',m.og],['FG',m.fg.toFixed(3)],['ABV',m.abv+'%'],last].map(function(x){
    return'<div style="text-align:center"><div style="font-family:var(--font-display);font-size:18px;color:var(--gold2)">'+x[1]+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1px;margin-top:2px">'+x[0]+'</div></div>';
  }).join('');
}
function wizMathNote(m){
  if(m.juiceL!=null){
    return'Your juice/blend needs to read <strong>OG '+m.og+'</strong> in '+m.vol+' L to finish near FG '+m.fg.toFixed(3)+' for ~'+m.abv+'% ABV. Juice supplies its own sugar — there\'s no honey to weigh out. Blend varieties, add a juice concentrate, or (for high-OG styles like Ice Cider) freeze-concentrate to raise it; dilute with water to lower it. Check your actual juice\'s OG at brew day.';
  }
  var base='Need <strong>~'+m.honeyKg+' kg honey</strong> in '+m.vol+' L to hit OG '+m.og+', finishing near FG '+m.fg.toFixed(3)+' for ~'+m.abv+'% ABV.';
  if(m.adjunctHoneyEquivKg>0)base+=' Already counts ~'+m.adjunctHoneyEquivKg+' kg of that OG as coming from the '+m.adjunctAmount+' of fruit/juice, not honey.';
  base+=' A starting point, not a guarantee — honey\'s fermentable sugar content varies by source and moisture (roughly ±5%), so take a hydrometer reading once mixed and adjust with a little water or honey before pitching.';
  // Same >=1.090 "high OG" threshold diagnoseStuckFermentation already uses
  // for its nutrient-deficiency check (03-brew-domain.js) — honey's weak pH
  // buffering (a must can swing ~4.3→3.1 over fermentation, far more than
  // beer/wine) is most likely to bite at this gravity. This is a real,
  // specific, community-documented technique (potassium bicarbonate,
  // targeting a starting pH before fermentation), not invented dosing — but
  // it's a proactive step some experienced brewers take, not settled
  // consensus that every high-OG batch needs it, so it's framed as a
  // heads-up here rather than a rule that fires mid-ferment implying
  // something's already wrong.
  if(m.og>=1.090)base+=' At this OG, honey\'s weak natural pH buffering can start the must low enough to slow or stall fermentation later — some brewers proactively check must pH before pitching and raise it toward 3.6–3.9 with potassium bicarbonate if it\'s already below ~3.5, rather than waiting to see if it stalls.';
  return base;
}
// Live-update only the math box without re-rendering the whole modal (keeps
// focus in the number inputs on step 0).
function wizUpdateMath(){
  var grid=document.getElementById('wiz-math-grid');if(!grid||!window._wiz)return;
  var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
  var m=isCider?wizComputeCiderMath(window._wiz):wizComputeMath(window._wiz);
  grid.innerHTML=wizMathCells(m);
}

function openCustomRecipeModal(seedId){
  closeModal();
  var seed=seedId?getRecipe(seedId):null;
  var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
  var r=seed?JSON.parse(JSON.stringify(seed)):JSON.parse(JSON.stringify(isCider?DEFAULT_CIDER_RECIPE_TEMPLATE:DEFAULT_RECIPE_TEMPLATE));
  if(seed){r.name=seed.name+' (My Version)';r.id=null;}
  window._editingRecipe=r;
  renderRecipeEditor();
}

function renderRecipeEditor(){
  var r=window._editingRecipe;
  if(!r)return;
  var existing=document.querySelector('.modal-overlay');
  if(existing)existing.remove();
  var isEdit=r.id&&APP.customRecipes.some(function(x){return x.id===r.id;});
  var html='<div class="modal-overlay"><div class="modal" style="max-width:700px">'
    +'<div class="modal-title">'+(isEdit?'EDIT':'NEW')+' CUSTOM RECIPE</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Name</label><input class="form-input" id="cr-name" value="'+escHtml(r.name)+'" placeholder="My Cherry-Vanilla Melomel"></div>'
    +'<div class="form-group"><label class="form-label">Style</label><input class="form-input" id="cr-style" value="'+escHtml(r.style)+'"></div></div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="cr-diff">'+['Beginner','Intermediate','Advanced','Expert'].map(function(d){return'<option'+(r.difficulty===d?' selected':'')+'>'+d+'</option>';}).join('')+'</select></div>'
    +'<div class="form-group"><label class="form-label">Brand Color</label><input class="form-input" type="color" id="cr-color" value="'+r.brandColor+'" style="height:38px;padding:2px;cursor:pointer"></div>'
    +'<div class="form-group"><label class="form-label">Ferment Days</label><input class="form-input" id="cr-ferment" type="number" value="'+r.fermentDays+'"></div></div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="cr-vol" type="number" step="0.1" value="'+r.volume+'"></div>'
    +'<div class="form-group"><label class="form-label">Target OG</label><input class="form-input" id="cr-og" type="number" step="0.001" value="'+r.ogTarget+'"></div>'
    +'<div class="form-group"><label class="form-label">Target FG</label><input class="form-input" id="cr-fg" type="number" step="0.001" value="'+r.fgTarget+'"></div></div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Target ABV %</label><input class="form-input" id="cr-abv" type="number" step="0.1" value="'+r.abvTarget+'"></div>'
    +'<div class="form-group"><label class="form-label">Bulk Age (days)<span style="font-weight:400;color:var(--text3);font-size:10px;margin-left:4px">before bottling</span></label><input class="form-input" id="cr-bulk" type="number" value="'+(r.bulkAgeDays||90)+'"></div>'
    +'<div class="form-group"><label class="form-label">Ready (days)</label><input class="form-input" id="cr-min" type="number" value="'+(r.minAgeDays||r.minDays||60)+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Peak (days)</label><input class="form-input" id="cr-peak" type="number" value="'+(r.peakAgeDays||r.peakDays||180)+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="cr-desc" rows="2">'+escHtml(r.description)+'</textarea></div>'
    +'<div class="form-group"><label class="form-label">Tags (comma-separated)</label><input class="form-input" id="cr-tags" value="'+escHtml((r.tags||[]).join(', '))+'" placeholder="cherry, autumn, sweet"></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px"><div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">Ingredients</div><button class="btn btn-secondary btn-sm" data-action="addRecipeIngredient">＋ Add Row</button></div>'
    +'<div id="cr-ingredients">'+r.ingredients.map(function(ing,i){return ingredientRowHtml(ing,i);}).join('')+'</div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px"><div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);letter-spacing:1.5px;text-transform:uppercase">Steps</div><button class="btn btn-secondary btn-sm" data-action="addRecipeStep">＋ Add Step</button></div>'
    +'<div id="cr-steps">'+r.steps.map(function(s,i){return stepRowHtml(s,i);}).join('')+'</div>'
    +'<div class="modal-actions">'
    +(isEdit?'<button class="btn btn-danger" style="margin-right:auto" data-action="deleteCustomRecipe" data-args=\''+JSON.stringify([r.id])+'\'>Delete</button>':'')
    +'<button class="btn btn-secondary" data-action="_cancelRecipeEdit">Cancel</button>'
    +'<button class="btn btn-primary" data-action="saveCustomRecipe">Save Recipe</button>'
    +'</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function _cancelRecipeEdit(){
  closeModal();
  window._editingRecipe=null;
}
function _removeIngRow(){
  this.closest('[data-ing-row]').remove();
}
function _removeStepRow(){
  this.closest('[data-step-row]').remove();
}
function ingredientRowHtml(ing,i){
  return'<div class="form-row-3" style="margin-bottom:6px" data-ing-row="'+i+'"><input class="form-input cr-ing-item" placeholder="Item" value="'+escHtml(ing.item||'')+'"><input class="form-input cr-ing-amount" placeholder="Amount" value="'+escHtml(ing.amount||'')+'"><div style="display:flex;gap:4px"><input class="form-input cr-ing-notes" placeholder="Notes" value="'+escHtml(ing.notes||'')+'" style="flex:1"><button class="btn-icon" data-action="_removeIngRow" title="Remove">×</button></div></div>';
}
function stepRowHtml(s,i){
  return'<div style="display:grid;grid-template-columns:60px 1fr;gap:6px;margin-bottom:6px" data-step-row="'+i+'"><input class="form-input cr-step-day" type="number" placeholder="Day" value="'+(s.day||0)+'"><div style="display:flex;flex-direction:column;gap:4px"><div style="display:flex;gap:4px"><input class="form-input cr-step-title" placeholder="Title" value="'+escHtml(s.title||'')+'" style="flex:1"><button class="btn-icon" data-action="_removeStepRow" title="Remove">×</button></div><textarea class="form-textarea cr-step-desc" placeholder="Description" rows="2">'+escHtml(s.desc||'')+'</textarea></div></div>';
}
function addRecipeIngredient(){
  document.getElementById('cr-ingredients').insertAdjacentHTML('beforeend',ingredientRowHtml({item:'',amount:'',notes:''},Date.now()));
}
function addRecipeStep(){
  document.getElementById('cr-steps').insertAdjacentHTML('beforeend',stepRowHtml({day:0,title:'',desc:''},Date.now()));
}

function saveCustomRecipe(){
  var name=document.getElementById('cr-name').value.trim();
  if(!name){toast('⚠ Name required');return;}
  var r=window._editingRecipe||{};
  r.name=name;
  r.style=document.getElementById('cr-style').value.trim()||'Custom';
  r.difficulty=document.getElementById('cr-diff').value;
  r.brandColor=document.getElementById('cr-color').value;
  r.fermentDays=parseInt(document.getElementById('cr-ferment').value)||42;
  r.volume=parseFloat(document.getElementById('cr-vol').value)||5;
  r.ogTarget=parseFloat(document.getElementById('cr-og').value)||1.095;
  r.fgTarget=parseFloat(document.getElementById('cr-fg').value)||1.010;
  r.abvTarget=parseFloat(document.getElementById('cr-abv').value)||11;
  r.bulkAgeDays=parseInt(document.getElementById('cr-bulk').value)||90;
  r.minAgeDays=parseInt(document.getElementById('cr-min').value)||60;
  r.peakAgeDays=parseInt(document.getElementById('cr-peak').value)||180;
  r.maxAgeDays=Math.max(r.peakAgeDays+90,parseInt(r.maxAgeDays||r.maxDays)||730);
  // Drop the old pre-"Age" field names once migrated to the built-in-recipe
  // naming (minAgeDays/peakAgeDays/maxAgeDays) — every read site now checks
  // both, but there's no reason for a freshly-saved recipe to carry both.
  delete r.minDays;delete r.peakDays;delete r.maxDays;
  r.description=document.getElementById('cr-desc').value.trim();
  r.tags=document.getElementById('cr-tags').value.split(',').map(function(t){return t.trim();}).filter(Boolean);
  r.ingredients=Array.from(document.querySelectorAll('#cr-ingredients [data-ing-row]')).map(function(row){
    return{
      item:row.querySelector('.cr-ing-item').value.trim(),
      amount:row.querySelector('.cr-ing-amount').value.trim(),
      notes:row.querySelector('.cr-ing-notes').value.trim()
    };
  }).filter(function(x){return x.item;});
  r.steps=Array.from(document.querySelectorAll('#cr-steps [data-step-row]')).map(function(row){
    return{
      day:parseInt(row.querySelector('.cr-step-day').value)||0,
      title:row.querySelector('.cr-step-title').value.trim(),
      desc:row.querySelector('.cr-step-desc').value.trim()
    };
  }).filter(function(x){return x.title;}).sort(function(a,b){return a.day-b.day;});
  // Assign ID if new
  if(!r.id){r.id='custom_'+genId();r.beverageType=activeBevMode();}
  r.isCustom=true;
  // Upsert into APP.customRecipes
  var idx=APP.customRecipes.findIndex(function(x){return x.id===r.id;});
  if(idx>=0)APP.customRecipes[idx]=r;
  else APP.customRecipes.push(r);
  rebuildRecipes();
  closeModal();
  scheduleSave();
  window._editingRecipe=null;
  toast('✦ Recipe saved');
  currentRecipeId=r.id;
  showView('recipe-detail');
}

function deleteCustomRecipe(id){
  if(!confirm('Delete this custom recipe? Existing batches using it will keep their data.'))return;
  APP.customRecipes=APP.customRecipes.filter(function(r){return r.id!==id;});
  rebuildRecipes();
  closeModal();
  scheduleSave();
  toast('Recipe deleted');
  window._editingRecipe=null;
  showView('recipes');
}
