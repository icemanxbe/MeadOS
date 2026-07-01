// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// LABEL STUDIO — a from-scratch SVG bottle-label editor (front + back).
// Plain script, shared global scope; loaded after 13-labels-share.js.
'use strict';

// ── Presets ────────────────────────────────────────────────────────────────
var LABEL_SIZES=[
  {key:'portrait',label:'Portrait',w:340,h:440},
  {key:'square',label:'Square',w:400,h:400},
  {key:'wide',label:'Wide',w:460,h:300},
  {key:'tall',label:'Tall / hip',w:300,h:480},
  {key:'mini',label:'Mini',w:300,h:200}
];
// Shapes seen on real bottle labels — incl. the heraldic shield/crest and
// banner that suit mead's medieval heritage.
var LABEL_SHAPES=[
  {key:'rect',label:'Rectangle'},
  {key:'round',label:'Rounded'},
  {key:'oval',label:'Oval'},
  {key:'arch',label:'Arch / cathedral'},
  {key:'shield',label:'Shield / crest'},
  {key:'banner',label:'Banner / ribbon'},
  {key:'hex',label:'Hexagon'},
  {key:'seal',label:'Seal / circle'}
];
var LABEL_FONTS=[
  {key:'Cinzel',label:'Cinzel (display)',css:'"Cinzel",Georgia,serif'},
  {key:'Crimson',label:'Crimson Pro (serif)',css:'"Crimson Pro",Georgia,serif'},
  {key:'Georgia',label:'Georgia',css:'Georgia,"Times New Roman",serif'},
  {key:'Mono',label:'JetBrains Mono',css:'"JetBrains Mono",ui-monospace,monospace'},
  {key:'Sans',label:'Helvetica / sans',css:'Helvetica,Arial,sans-serif'}
];
function labelFontCss(key){var f=LABEL_FONTS.filter(function(x){return x.key===key;})[0];return f?f.css:LABEL_FONTS[0].css;}
// Data fields that pull live from the batch/recipe/honey.
var LABEL_FIELDS=[
  {key:'name',label:'Mead name'},
  {key:'style',label:'Style / class'},
  {key:'abv',label:'ABV %'},
  {key:'netvol',label:'Net contents (ml ℮)'},
  {key:'vintage',label:'Vintage (year)'},
  {key:'carbonation',label:'Still / sparkling'},
  {key:'tasting',label:'Tasting note (recipe + honey)'},
  {key:'pairing',label:'Food pairing'},
  {key:'serving',label:'Serving suggestion'},
  {key:'ingredients',label:'Ingredients'},
  {key:'allergens',label:'Allergens & dietary'},
  {key:'bottled',label:'Bottled date'},
  {key:'window',label:'Best-drink-between dates'},
  {key:'producer',label:'Produced & bottled by'},
  {key:'warning',label:'Responsibility notice'},
  {key:'volume',label:'Batch volume'},
  {key:'serial',label:'Batch №'},
  {key:'brewer',label:'Brewer'},
  {key:'custom',label:'Custom text'}
];

// ── Storage ──────────────────────────────────────────────────────────────
function labelStudioStore(){if(!APP.settings)APP.settings={};if(!APP.settings.labelStudio)APP.settings.labelStudio={};return APP.settings.labelStudio;}
function labelStudioKey(recipeId,volume){return volume?recipeId+'#'+volume:recipeId;}
function labelStudioGet(recipeId,volume){
  var s=labelStudioStore(),key=labelStudioKey(recipeId,volume);
  if(!s[key]){
    // A new per-volume variant starts as a copy of the recipe's default design.
    s[key]=(volume&&s[recipeId])?JSON.parse(JSON.stringify(s[recipeId])):labelStudioDefault(recipeId);
  }
  return s[key];
}
// The design that applies to a bottle volume: a dedicated variant if one exists,
// else the recipe's default. Returns the design object (or null).
function studioVariantKey(recipeId,volume){
  var store=(APP.settings&&APP.settings.labelStudio)||{};
  if(volume&&store[recipeId+'#'+volume])return recipeId+'#'+volume;
  return store[recipeId]?recipeId:null;
}
function studioDesignFor(recipeId,volume){var k=studioVariantKey(recipeId,volume);return k?APP.settings.labelStudio[k]:null;}
function studioVariantVolumes(recipeId){
  var store=(APP.settings&&APP.settings.labelStudio)||{},pre=recipeId+'#',out=[];
  Object.keys(store).forEach(function(k){if(k.indexOf(pre)===0){var v=parseInt(k.slice(pre.length));if(v)out.push(v);}});
  return out.sort(function(a,b){return a-b;});
}
// Distinct bottle sizes a batch was bottled in (ml), and its primary (most-filled) size.
function batchBottleSizes(bot){
  var sizes=[];
  if(bot){
    if(bot.countsAtBottling)Object.keys(bot.countsAtBottling).forEach(function(k){if(bot.countsAtBottling[k]>0)sizes.push(parseInt(k));});
    else if(bot.bottles&&bot.bottles.length)bot.bottles.forEach(function(x){sizes.push(parseInt(x.size));});
  }
  return sizes.filter(function(v,i,a){return v&&a.indexOf(v)===i;});
}
function batchPrimaryVolume(batch){
  var bot=batch&&(APP.bottling||{})[batch.id];if(!bot)return null;
  var best=-1,vol=null;
  if(bot.countsAtBottling)Object.keys(bot.countsAtBottling).forEach(function(k){if(bot.countsAtBottling[k]>best){best=bot.countsAtBottling[k];vol=parseInt(k);}});
  else if(bot.bottles&&bot.bottles.length)vol=parseInt(bot.bottles[0].size);
  return vol;
}
function labelStudioDefault(recipeId){
  var r=(APP.recipes||[]).find(function(x){return x.id===recipeId;})||{};
  var accent=r.brandColor||'#c9a84c';
  // Modelled on real mead-bottle labels: FRONT carries the brand name, class,
  // tasting line, a Dry→Sweet meter, ABV and net contents; BACK carries the
  // ingredients, allergens, serving/pairing, drinking window, producer line and
  // a responsibility notice — the way commercial labels split it.
  var front={shape:'round',bg:'#17110a',bgImage:null,border:accent,elements:[
    {id:'e1',type:'shape',kind:'rect',x:16,y:16,w:308,h:408,fill:'none',stroke:accent,strokeW:1.5,radius:10},
    {id:'e2',type:'field',field:'style',x:30,y:40,w:280,h:20,font:'Mono',size:11,color:'#9a8a66',align:'center',weight:'400',spacing:3,upper:true},
    {id:'e3',type:'field',field:'name',x:24,y:70,w:292,h:90,font:'Cinzel',size:29,color:'#e8c878',align:'center',weight:'700',lh:1.05},
    {id:'e4',type:'shape',kind:'line',x:120,y:174,w:100,h:0,stroke:accent,strokeW:1},
    {id:'e5',type:'field',field:'tasting',x:34,y:190,w:272,h:96,font:'Crimson',size:12.5,color:'#d8cbb0',align:'center',italic:true,lh:1.38},
    {id:'e8',type:'sweetscale',x:90,y:308,w:160,h:22,font:'Mono',size:8,color:accent},
    {id:'e6',type:'field',field:'abv',x:24,y:344,w:292,h:34,font:'Cinzel',size:24,color:'#e8c878',align:'center',weight:'700'},
    {id:'e9',type:'field',field:'netvol',x:24,y:392,w:292,h:14,font:'Mono',size:9,color:'#8a7a58',align:'center',spacing:1},
    {id:'e7',type:'field',field:'bottled',x:24,y:410,w:292,h:14,font:'Mono',size:8,color:'#7a6d50',align:'center',spacing:1}
  ]};
  var back={shape:'round',bg:'#17110a',bgImage:null,border:accent,elements:[
    {id:'b1',type:'field',field:'name',x:24,y:32,w:292,h:26,font:'Cinzel',size:15,color:'#e8c878',align:'center',weight:'700'},
    {id:'b2',type:'text',text:'INGREDIENTS',x:28,y:70,w:284,h:16,font:'Mono',size:9,color:'#9a8a66',align:'left',spacing:2},
    {id:'b3',type:'field',field:'ingredients',x:28,y:86,w:284,h:78,font:'Crimson',size:11,color:'#d8cbb0',align:'left',lh:1.38},
    {id:'b4',type:'field',field:'allergens',x:28,y:182,w:284,h:54,font:'Crimson',size:10,color:'#c9b894',align:'left',italic:true,lh:1.34},
    {id:'b7',type:'field',field:'serving',x:28,y:248,w:284,h:14,font:'Mono',size:8.5,color:'#9a8a66',align:'left',spacing:0.5},
    {id:'b5',type:'field',field:'window',x:28,y:266,w:284,h:14,font:'Mono',size:8.5,color:'#9a8a66',align:'left',spacing:0.5},
    {id:'b8',type:'field',field:'producer',x:28,y:296,w:284,h:24,font:'Crimson',size:10,color:'#b8a880',align:'left',lh:1.3},
    {id:'b9',type:'field',field:'warning',x:28,y:336,w:284,h:50,font:'Crimson',size:8.5,color:'#7a6d50',align:'left',lh:1.3},
    {id:'b6',type:'field',field:'serial',x:24,y:410,w:292,h:14,font:'Mono',size:8,color:'#6a5d44',align:'center',spacing:1}
  ]};
  return {w:340,h:440,front:front,back:back};
}
function labelStudioSave(){scheduleSave();}

// ── Templates (premium starting points) ───────────────────────────────────
var LABEL_TEMPLATES=[
  {key:'heritage',label:'Heritage',hint:'Dark & gold, classic',build:function(rid){return labelStudioDefault(rid);}},
  {key:'crest',label:'Crest',hint:'Heraldic seal + honeycomb',build:function(rid){return labelTplCrest(rid);}},
  {key:'honeycomb',label:'Honeycomb',hint:'Warm, honeycomb-textured',build:function(rid){return labelTplHoneycomb(rid);}},
  {key:'botanical',label:'Botanical',hint:'Deep plum & gold',build:function(rid){return labelTplBuild(rid,{bg:'#181226',ink:'#e6d28a',body:'#cdbfe2',sub:'#9a8fb8',faint:'#7a6f96',accent:'#caa84c'});}},
  {key:'apothecary',label:'Apothecary',hint:'Cream & ink, vintage',build:function(rid){return labelTplBuild(rid,{bg:'#efe6d2',ink:'#2a2018',body:'#43361f',sub:'#6a5a3c',faint:'#8a7a5c',accent:'#3a2c18',shape:'rect',square:true,doubleBorder:true});}},
  {key:'rustic',label:'Rustic',hint:'Kraft tan, handcrafted',build:function(rid){return labelTplBuild(rid,{bg:'#cdb78d',ink:'#3a2a16',body:'#4a3820',sub:'#6a5436',faint:'#7a6242',accent:'#5a3e1e',honeycomb:true,honeycombColor:'#5a3e1e',honeycombOpacity:0.08});}},
  {key:'modern',label:'Modern',hint:'Clean, bold sans',build:function(rid){return labelTplBuild(rid,{bg:'#101216',ink:'#f0ede6',body:'#aeb4bc',sub:'#7a828c',faint:'#5a626c',accent:'#d8a93a',shape:'rect',nameFont:'Sans',nameSize:30,bodyFont:'Sans'});}},
  {key:'noir',label:'Noir',hint:'Black & gold, luxury',build:function(rid){return labelTplBuild(rid,{bg:'#0a0a0b',ink:'#f5f0e6',body:'#b8b2a6',sub:'#7a7468',faint:'#5a554c',accent:'#d8c8a0',shape:'rect',nameSize:26});}},
  {key:'minimal',label:'Minimal',hint:'Clean cream & ink',build:function(rid){return labelTplMinimal(rid);}},
  {key:'own',label:'My own art',hint:'Upload a finished design & drop data on it'}
];
// Shared builder — one consistent front/back layout, themed by a palette/options.
function labelTplBuild(rid,o){
  o=o||{};
  var r=(APP.recipes||[]).find(function(x){return x.id===rid;})||{};
  var accent=o.accent||r.brandColor||'#c9a84c';
  var bg=o.bg||'#17110a',ink=o.ink||'#e8c878',body=o.body||'#d8cbb0',sub=o.sub||'#9a8a66',faint=o.faint||'#7a6d50';
  var nf=o.nameFont||'Cinzel',sf=o.styleFont||'Mono',bf=o.bodyFont||'Crimson',shape=o.shape||'round';
  var n=0;function id(){return 'tb'+(n++);}
  var front=[];
  if(o.doubleBorder)front.push({id:id(),type:'shape',kind:'rect',x:20,y:20,w:300,h:400,fill:'none',stroke:accent,strokeW:0.6,radius:o.square?0:8});
  front.push({id:id(),type:'field',field:'style',x:30,y:42,w:280,h:18,font:sf,size:11,color:sub,align:'center',spacing:3,upper:true});
  front.push({id:id(),type:'field',field:'name',x:18,y:70,w:304,h:86,font:nf,size:o.nameSize||28,color:ink,align:'center',weight:'700',lh:1.05});
  front.push({id:id(),type:'shape',kind:'line',x:130,y:178,w:80,h:0,stroke:accent,strokeW:1});
  front.push({id:id(),type:'field',field:'tasting',x:34,y:194,w:272,h:88,font:bf,size:12.5,color:body,align:'center',italic:true,lh:1.38});
  front.push({id:id(),type:'sweetscale',x:90,y:314,w:160,h:22,font:'Mono',size:8,color:accent});
  front.push({id:id(),type:'field',field:'abv',x:24,y:350,w:292,h:30,font:nf,size:22,color:ink,align:'center',weight:'700'});
  front.push({id:id(),type:'field',field:'netvol',x:24,y:394,w:292,h:14,font:'Mono',size:9,color:faint,align:'center',spacing:1});
  front.push({id:id(),type:'field',field:'bottled',x:24,y:410,w:292,h:14,font:'Mono',size:8,color:faint,align:'center',spacing:1});
  var back=[];
  back.push({id:id(),type:'field',field:'name',x:24,y:34,w:292,h:24,font:nf,size:15,color:ink,align:'center',weight:'700'});
  back.push({id:id(),type:'text',text:'INGREDIENTS',x:28,y:72,w:284,h:16,font:'Mono',size:9,color:sub,align:'left',spacing:2});
  back.push({id:id(),type:'field',field:'ingredients',x:28,y:88,w:284,h:78,font:bf,size:11,color:body,align:'left',lh:1.38});
  back.push({id:id(),type:'field',field:'allergens',x:28,y:184,w:284,h:54,font:bf,size:10,color:body,align:'left',italic:true,lh:1.34});
  back.push({id:id(),type:'field',field:'serving',x:28,y:250,w:284,h:14,font:'Mono',size:8.5,color:sub,align:'left'});
  back.push({id:id(),type:'field',field:'window',x:28,y:268,w:284,h:14,font:'Mono',size:8.5,color:sub,align:'left'});
  back.push({id:id(),type:'field',field:'producer',x:28,y:296,w:284,h:24,font:bf,size:10,color:sub,align:'left',lh:1.3});
  back.push({id:id(),type:'field',field:'warning',x:28,y:336,w:284,h:50,font:bf,size:8.5,color:faint,align:'left',lh:1.3});
  back.push({id:id(),type:'field',field:'serial',x:24,y:410,w:292,h:14,font:'Mono',size:8,color:faint,align:'center',spacing:1});
  var fs={shape:shape,bg:bg,bgImage:null,border:(o.noBorder?null:accent),elements:front};
  var bs={shape:shape,bg:bg,bgImage:null,border:(o.noBorder?null:accent),elements:back};
  if(o.honeycomb){fs.honeycomb=bs.honeycomb=true;fs.honeycombColor=bs.honeycombColor=o.honeycombColor||accent;fs.honeycombOpacity=fs.honeycombOpacity=o.honeycombOpacity||0.1;bs.honeycombOpacity=(o.honeycombOpacity||0.1)*0.7;}
  return {w:340,h:440,front:fs,back:bs};
}
// Heraldic crest: a honeycomb seal at the top, brewer line, name, sweetness, ABV.
function labelTplCrest(rid){
  var r=(APP.recipes||[]).find(function(x){return x.id===rid;})||{};
  var accent=r.brandColor||'#c9a84c',bg='#17110a',ink='#e8c878',body='#d8cbb0',sub='#9a8a66',faint='#7a6d50';
  var front={shape:'round',bg:bg,bgImage:null,border:accent,elements:[
    {id:'c1',type:'shape',kind:'rect',x:18,y:18,w:304,h:404,fill:'none',stroke:accent,strokeW:0.6,radius:8},
    {id:'c2',type:'shape',kind:'ellipse',x:120,y:30,w:100,h:100,fill:'#0f0b05',stroke:accent,strokeW:2},
    {id:'c3',type:'honeycomb',x:132,y:42,w:76,h:76,color:accent,opacity:0.45,size:8,radius:38},
    {id:'c4',type:'honeydrop',x:161,y:60,w:18,h:26,color:accent},
    {id:'c5',type:'field',field:'brewer',x:40,y:150,w:260,h:14,font:'Mono',size:9,color:sub,align:'center',spacing:2,upper:true},
    {id:'c6',type:'field',field:'name',x:18,y:168,w:304,h:78,font:'Cinzel',size:27,color:ink,align:'center',weight:'700',lh:1.04},
    {id:'c7',type:'field',field:'style',x:30,y:250,w:280,h:16,font:'Mono',size:10,color:sub,align:'center',spacing:2,upper:true},
    {id:'c8',type:'sweetscale',x:90,y:296,w:160,h:22,font:'Mono',size:8,color:accent},
    {id:'c9',type:'field',field:'tasting',x:34,y:330,w:272,h:48,font:'Crimson',size:11,color:body,align:'center',italic:true,lh:1.35},
    {id:'c10',type:'field',field:'abv',x:24,y:388,w:292,h:26,font:'Cinzel',size:20,color:ink,align:'center',weight:'700'},
    {id:'c11',type:'field',field:'netvol',x:24,y:414,w:292,h:12,font:'Mono',size:8,color:faint,align:'center',spacing:1}
  ]};
  return {w:340,h:440,front:front,back:labelTplBuild(rid,{}).back};
}
function labelTplHoneycomb(rid){
  var d=labelStudioDefault(rid);
  ['front','back'].forEach(function(k){d[k].bg='#1b1206';d[k].honeycomb=true;d[k].honeycombColor='#d8a93a';d[k].honeycombOpacity=(k==='front'?0.12:0.07);});
  return d;
}
function labelTplMinimal(rid){
  var r=(APP.recipes||[]).find(function(x){return x.id===rid;})||{};
  var ink='#2a2018',sub='#7a6a50',accent=r.brandColor||'#9a7a30',paper='#f4ecda';
  var front={shape:'rect',bg:paper,bgImage:null,border:null,elements:[
    {id:'m1',type:'field',field:'style',x:24,y:50,w:292,h:18,font:'Mono',size:10,color:sub,align:'center',spacing:3,upper:true},
    {id:'m2',type:'field',field:'name',x:18,y:80,w:304,h:88,font:'Cinzel',size:30,color:ink,align:'center',weight:'700',lh:1.05},
    {id:'m3',type:'shape',kind:'line',x:130,y:184,w:80,h:0,stroke:accent,strokeW:1.2},
    {id:'m4',type:'field',field:'tasting',x:34,y:202,w:272,h:92,font:'Crimson',size:12.5,color:'#4a3c28',align:'center',italic:true,lh:1.4},
    {id:'m5',type:'sweetscale',x:90,y:314,w:160,h:22,font:'Mono',size:8,color:accent},
    {id:'m6',type:'field',field:'abv',x:24,y:354,w:292,h:30,font:'Cinzel',size:22,color:ink,align:'center',weight:'700'},
    {id:'m7',type:'field',field:'netvol',x:24,y:398,w:292,h:14,font:'Mono',size:9,color:sub,align:'center',spacing:1}
  ]};
  var back={shape:'rect',bg:paper,bgImage:null,border:null,elements:[
    {id:'n1',type:'field',field:'name',x:24,y:34,w:292,h:24,font:'Cinzel',size:15,color:ink,align:'center',weight:'700'},
    {id:'n2',type:'text',text:'INGREDIENTS',x:28,y:72,w:284,h:16,font:'Mono',size:9,color:sub,align:'left',spacing:2},
    {id:'n3',type:'field',field:'ingredients',x:28,y:88,w:284,h:78,font:'Crimson',size:11,color:'#4a3c28',align:'left',lh:1.38},
    {id:'n4',type:'field',field:'allergens',x:28,y:184,w:284,h:54,font:'Crimson',size:10,color:'#5a4c34',align:'left',italic:true,lh:1.34},
    {id:'n5',type:'field',field:'window',x:28,y:250,w:284,h:14,font:'Mono',size:8.5,color:sub,align:'left'},
    {id:'n6',type:'field',field:'producer',x:28,y:286,w:284,h:24,font:'Crimson',size:10,color:'#6a5a40',align:'left',lh:1.3},
    {id:'n7',type:'field',field:'warning',x:28,y:330,w:284,h:48,font:'Crimson',size:8.5,color:'#8a7a5c',align:'left',lh:1.3},
    {id:'n8',type:'field',field:'serial',x:24,y:410,w:292,h:14,font:'Mono',size:8,color:'#9a8a6c',align:'center',spacing:1}
  ]};
  return {w:340,h:440,front:front,back:back};
}

// ── Live data binding ──────────────────────────────────────────────────────
function labelStudioCtx(recipeId,batchId){
  var recipe=(APP.recipes||[]).find(function(x){return x.id===recipeId;})||{};
  var batch=batchId?(APP.batches||[]).find(function(x){return x.id===batchId;}):null;
  // If no explicit batch, prefer the most recent batch of this recipe (for live data).
  if(!batch)batch=(APP.batches||[]).filter(function(b){return b.recipeId===recipeId;}).slice(-1)[0]||null;
  var bot=batch?(APP.bottling||{})[batch.id]:null;
  var honeyName=(batch&&batch.honeyType)||labelStudioPrimaryHoney(recipe);
  return {recipe:recipe,batch:batch,bot:bot,honey:honeyName,hp:honeyName&&typeof HONEY_PROFILES!=='undefined'?HONEY_PROFILES[honeyName]:null};
}
function labelStudioPrimaryHoney(r){
  if(typeof honeyTypesInRecipe==='function'){var t=honeyTypesInRecipe(r);if(t&&t.length)return t[0];}
  return '';
}
function firstSentence(s){if(!s)return'';var m=String(s).match(/^[^.!?]*[.!?]/);return m?m[0]:String(s);}
function lcFirst(s){return s?s.charAt(0).toLowerCase()+s.slice(1):s;}

// ── Label localisation (generated text follows APP.settings.labelLocale) ────
function labelLocale(){return (APP.settings&&APP.settings.labelLocale)||'en';}
var LABEL_I18N={
  en:{
    sweet:['Dry','Off-dry','Medium','Sweet'],
    months:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    abv:function(n){return n+'% ABV';},
    bottledWord:'Bottled', bottled:function(m,y){return 'Bottled '+m+' '+y;},
    bestBetween:function(a,b){return 'Best between '+a+' – '+b;},
    bestAfter:function(a,b){return 'Best '+a+' – '+b+' after bottling';},
    producer:function(nm){return 'Produced & bottled by '+nm+'.';}, theBrewer:'the brewer',
    warning:'Contains alcohol — please enjoy responsibly. Not for sale. Not for anyone under the legal drinking age, pregnant, or driving.',
    glutenFree:'Gluten-free', containsGluten:'Contains gluten', contains:function(x){return 'Contains '+x;},
    sulfites:'Contains sulfites', veg:'Vegetarian · contains honey (not vegan)', alcohol:'Contains alcohol',
    serveChilled:'Serve chilled · 8–10 °C', serveCold:'Serve well chilled · 6–8 °C', serveCellar:'Serve at cellar temperature · 12–14 °C',
    sparkling:'Sparkling', still:'Still',
    pairings:{dessert:'Pairs with blue cheese, dark chocolate and toasted nuts.',cyser:'Pairs with pork, sharp cheddar and apple desserts.',pyment:'Pairs with red meats, charcuterie and hard cheese.',spice:'Pairs with spiced desserts, roast meats and aged cheese.',fruit:'Pairs with soft cheese, charcuterie and fresh fruit.',def:'Pairs with cheese, charcuterie and honey cake.'},
    headers:{}
  },
  nl:{
    sweet:['Droog','Halfdroog','Halfzoet','Zoet'],
    sweetAdj:['droge','halfdroge','halfzoete','zoete'],
    months:['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'],
    abv:function(n){return n+'% vol';},
    bottledWord:'Gebotteld', bottled:function(m,y){return 'Gebotteld '+m+' '+y;},
    bestBetween:function(a,b){return 'Best tussen '+a+' – '+b;},
    bestAfter:function(a,b){return 'Best '+a+' – '+b+' na botteling';},
    producer:function(nm){return 'Geproduceerd & gebotteld door '+nm+'.';}, theBrewer:'de brouwer',
    warning:'Bevat alcohol — drink met mate. Niet te koop. Niet voor personen onder de wettelijke leeftijd, zwangere vrouwen of bestuurders.',
    glutenFree:'Glutenvrij', containsGluten:'Bevat gluten', contains:function(x){return 'Bevat '+x;},
    sulfites:'Bevat sulfieten', veg:'Vegetarisch · bevat honing (niet veganistisch)', alcohol:'Bevat alcohol',
    serveChilled:'Geserveerd gekoeld · 8–10 °C', serveCold:'Goed gekoeld serveren · 6–8 °C', serveCellar:'Op keldertemperatuur serveren · 12–14 °C',
    sparkling:'Mousserend', still:'Niet-mousserend',
    pairings:{dessert:'Combineert met blauwe kaas, pure chocolade en geroosterde noten.',cyser:'Combineert met varkensvlees, pittige cheddar en appeldesserts.',pyment:'Combineert met rood vlees, charcuterie en harde kaas.',spice:'Combineert met gekruide desserts, gebraden vlees en belegen kaas.',fruit:'Combineert met zachte kaas, charcuterie en vers fruit.',def:'Combineert met kaas, charcuterie en honingcake.'},
    headers:{'INGREDIENTS':'INGREDIËNTEN','ALLERGENS':'ALLERGENEN','TASTING':'PROEFNOTITIE','NUTRITION':'VOEDINGSWAARDE'},
    // Honey-type word for compound "<type>honing"
    honeyType:{'Tupelo':'Tupelo','Sage':'Salie','Sidr':'Sidr','Wildflower':'Wildebloemen','Orange Blossom':'Sinaasappelbloesem','Buckwheat':'Boekweit','Heather':'Heide','Forest':'Bos','Acacia':'Acacia','Linden':'Linde','Clover':'Klaver','Manuka':'Manuka','Chestnut':'Kastanje','Lavender':'Lavendel','Eucalyptus':'Eucalyptus','Sunflower':'Zonnebloem','Rapeseed':'Koolzaad','Thyme':'Tijm','Coriander':'Koriander','Lemon Blossom':'Citroenbloesem','Rosemary':'Rozemarijn','Coffee Blossom':'Koffiebloesem','Himalayan Balsam':'Himalayabalsemien','Mountain':'Berg','Pine Honeydew':'Dennenhoningdauw'},
    // Per-honey tasting first-sentence (used in the label's tasting summary)
    honeyNotes:{'Tupelo':'boterig en complex met jasmijn en kaneel, zeer zoet in de mond','Sage':'licht, mild en delicaat zoet met een schone afdronk','Sidr':'rijk en weelderig met toffee- en kruidige toetsen','Wildflower':'bloemig en veelzijdig met een zachte honingzoetheid','Orange Blossom':'fris citrus- en bloesemaroma met een lichte zoetheid','Buckwheat':'donker en moutig met aardse, robuuste tonen','Heather':'krachtig en aromatisch met een licht harsige toets','Forest':'donker en bosrijk met dennen- en karameltonen','Acacia':'zeer mild en helder met een delicate, zachte zoetheid','Linden':'fris en kruidig met munt- en balsemtoetsen','Clover':'mild en bloemig met een klassieke, zachte honingsmaak','Manuka':'krachtig en aards met kruidige, medicinale tonen','Chestnut':'donker en stevig met bittere, houtige tonen','Lavender':'bloemig en aromatisch met een zachte lavendeltoets','Eucalyptus':'kruidig en mentholachtig met een lichte zoetheid','Sunflower':'warm en fruitig met een lichte, frisse afdronk','Rapeseed':'mild en zacht met een romige textuur','Thyme':'aromatisch en kruidig met een warme, mediterrane toets','Coriander':'kruidig en fris met een licht citrusachtige toets','Lemon Blossom':'helder citrusaroma met een frisse, bloemige zoetheid','Rosemary':'kruidig en aromatisch met een fijne, harsige toets','Coffee Blossom':'zacht en bloemig met een subtiele koffietoets','Himalayan Balsam':'licht en bloemig met een delicate, fruitige toets','Mountain':'rijk en aromatisch met kruidige, bergbloemige tonen','Pine Honeydew':'donker en harsig met dennen- en moutige tonen'},
    // Common ingredient terms (lower-cased keys)
    ingredientTerms:{'spring water':'bronwater','water':'water','filtered water':'gefilterd water','distilled water':'gedistilleerd water','potassium metabisulfite':'kaliummetabisulfiet','potassium sorbate':'kaliumsorbaat','campden tablet':'campden-tablet','campden tablets':'campden-tabletten','oak chips':'eikensnippers','oak cubes':'eikenblokjes','oak':'eikenhout','strawberries':'aardbeien','strawberry':'aardbei','raspberries':'frambozen','raspberry':'framboos','blackberries':'bramen','blueberries':'bosbessen','cherries':'kersen','cherry':'kers','elderberries':'vlierbessen','elderberry':'vlierbes','elderflower':'vlierbloesem','peaches':'perziken','peach':'perzik','apples':'appels','apple':'appel','apple juice':'appelsap','grapes':'druiven','grape juice':'druivensap','blackcurrant':'zwarte bes','blackcurrants':'zwarte bessen','plums':'pruimen','plum':'pruim','pear':'peer','pears':'peren','mango':'mango','pineapple':'ananas','lemon':'citroen','lemons':'citroenen','lemon zest':'citroenrasp','orange':'sinaasappel','oranges':'sinaasappels','orange zest':'sinaasappelrasp','cinnamon':'kaneel','cinnamon stick':'kaneelstok','cinnamon sticks':'kaneelstokken','vanilla':'vanille','vanilla bean':'vanillestok','vanilla beans':'vanillestokken','cloves':'kruidnagel','clove':'kruidnagel','ginger':'gember','nutmeg':'nootmuskaat','cardamom':'kardemom','star anise':'steranijs','black pepper':'zwarte peper','allspice':'piment','hibiscus':'hibiscus','rose hips':'rozenbottels','rose petals':'rozenblaadjes','chamomile':'kamille','green tea':'groene thee','black tea':'zwarte thee','coffee':'koffie','cacao nibs':'cacaonibs','cocoa':'cacao','vanilla extract':'vanille-extract','mead yeast nutrient':'mede-gistvoeding','yeast nutrient':'gistvoeding','honey':'honing'}
  }
};
function LSTR(){return LABEL_I18N[labelLocale()]||LABEL_I18N.en;}
// Localised header text for fixed text elements (passes custom text through).
function labelHeaderI18n(txt){var h=LSTR().headers||{};var k=String(txt||'').trim().toUpperCase();return h[k]||txt;}
var LABEL_LOCALES=[{id:'en',label:'English'},{id:'nl',label:'Nederlands'}];
// Localised "<type> honey" — EN "Mountain honey", NL compound "Berghoning".
function labelHoneyPhrase(name){
  if(!name)return '';
  if(labelLocale()==='nl'){
    var m=(LABEL_I18N.nl.honeyType)||{},k=String(name).replace(/\s*honey$/i,'').trim();
    var w=m[k]||k;
    return /honing/i.test(w)?w:w+'honing';
  }
  return /honey$/i.test(name)?name:name+' honey';
}
// Localised honey tasting first-sentence (falls back to the authored profile).
function labelHoneyNotes(ctx){
  var hp=ctx.hp;if(!hp||!hp.profile)return '';
  if(labelLocale()==='nl'){var n=(LABEL_I18N.nl.honeyNotes||{})[ctx.honey];if(n)return n;}
  return lcFirst(firstSentence(hp.profile));
}
// Localise a single ingredient term (honey types + a common-terms dictionary).
function labelTrIngredient(n){
  if(labelLocale()!=='nl')return n;
  var nl=LABEL_I18N.nl.ingredientTerms||{},key=String(n||'').trim().toLowerCase();
  if(nl[key])return nl[key];
  if(/\bhoney$/i.test(n))return labelHoneyPhrase(n.replace(/\s*honey$/i,''));
  if(/\byeast$/i.test(n))return n.replace(/\s*yeast$/i,' gist');
  return n;
}
// Localised recipe display name + style word (Dutch when labelLocale is 'nl').
function recipeNameLocalized(r){if(!r)return '';if(labelLocale()==='nl'&&typeof RECIPE_NAME_NL!=='undefined'&&RECIPE_NAME_NL[r.id])return RECIPE_NAME_NL[r.id];return r.name||'';}
function recipeStyleNl(s){if(labelLocale()!=='nl'||typeof RECIPE_STYLE_NL==='undefined'||!s)return s||'';return RECIPE_STYLE_NL[s]||s;}

// The recipe's distinctive flavour lead, e.g. "Strawberry", "Chai-Spiced",
// "Forest Fruits" — the part of the name before the style word.
function recipeFlavorLead(r){
  var n=(r.name||'').replace(/\s*\([^)]*\)/g,'').replace(/[·–—].*/,'').trim();
  var m=n.split(/\b(mead|melomel|metheglin|pyment|cyser|bochet|braggot|hydromel|acerglyn|capsicumel|rhodomel)\b/i)[0].trim();
  if(/^(traditional|classic|show|basic|simple|sweet|dry|sack|aged|heavy|dessert)$/i.test(m))return '';
  return m;
}
// Tasting summary built from BOTH the recipe (flavour lead + style + sweetness)
// AND the honey actually used (its flavour profile).
function meadTastingSummary(ctx){
  var r=ctx.recipe||{},bot=ctx.bot,hp=ctx.hp,honey=ctx.honey;
  var lead=recipeFlavorLead(r),leadLow=lead?lead.toLowerCase():'';
  var style=(r.style||'mead').toLowerCase();
  if(leadLow&&style.indexOf(leadLow)>=0)leadLow='';          // avoid "melomel melomel"
  if(labelLocale()==='nl'){
    var adj=(LSTR().sweetAdj||[])[studioSweetIndex((bot&&bot.sweetness)||labelStudioSweetGuess(r))]||'';
    var styleNl=style.replace(/\bmead\b/,'mede');
    var sn='Een '+(adj?adj+' ':'')+(leadLow?leadLow+' ':'')+styleNl;
    if(hp&&hp.profile)sn+=' op '+labelHoneyPhrase(honey)+' — '+labelHoneyNotes(ctx);
    else if(honey)sn+=' op basis van '+labelHoneyPhrase(honey)+'.';
    else if(r.description){var rd=(typeof RECIPE_DESC_NL!=='undefined'&&RECIPE_DESC_NL[r.id])||r.description;sn+=' — '+lcFirst(firstSentence(rd));}
    else sn+='.';
    if(!/[.!?]$/.test(sn))sn+='.';
    return sn;
  }
  var sweet=(bot&&bot.sweetness)||labelStudioSweetGuess(r);
  var desc=(sweet?sweet.toLowerCase()+' ':'')+(leadLow?leadLow+' ':'')+style;
  var art=/^[aeiou]/i.test(desc)?'An':'A';
  var s=art+' '+desc;
  if(hp&&hp.profile)s+=' on '+labelHoneyPhrase(honey)+' — '+labelHoneyNotes(ctx);
  else if(honey)s+=' built on '+labelHoneyPhrase(honey)+'.';
  else if(r.description)s+=' — '+lcFirst(firstSentence(r.description));
  else s+='.';
  if(!/[.!?]$/.test(s))s+='.';
  return s;
}
function labelStudioSweetGuess(r){
  var fg=parseFloat(r.fgTarget)||0;
  if(/sack|port|dessert|bochet/i.test((r.style||'')+(r.name||'')))return 'sweet';
  if(fg>=1.020)return 'sweet';if(fg>=1.010)return 'semi-sweet';if(fg>=1.004)return 'off-dry';return 'dry';
}
function labelStudioAbv(ctx){
  var bot=ctx.bot,r=ctx.recipe||{},b=ctx.batch;
  if(bot&&bot.abv)return (Math.round(bot.abv*10)/10);
  if(b&&b.og){var logs=(APP.logs||{})[b.id]||[];var last=logs.length?logs[logs.length-1].gravity:null;if(last&&typeof calcABV==='function')return parseFloat(calcABV(b.og,last));}
  return r.abvTarget||'';
}
// Pretty yeast name from a batch's yeast code (e.g. 'm05' → "Mangrove Jack's M05 yeast").
function labelYeastName(code){
  if(!code)return '';
  var y=(typeof YEAST_STRAINS!=='undefined')&&YEAST_STRAINS.filter(function(s){return s.id===code;})[0];
  var nm=y?y.name:String(code);
  nm=nm.split('—')[0].split(' - ')[0].trim();   // drop the "— Mead" descriptor
  nm=nm.replace(/\s*yeast\s*$/i,'');
  return nm+' '+(labelLocale()==='nl'?'gist':'yeast');
}
function labelStudioIngredients(ctx){
  var r=ctx.recipe||{},b=ctx.batch;
  var names=[];
  (r.ingredients||[]).forEach(function(i){var n=(i.item||'').trim();if(!n)return;if(/yeast nutrient|nutrient$/i.test(n))return;names.push(n);});
  // batch additions
  if(b&&APP.additions&&APP.additions[b.id])APP.additions[b.id].forEach(function(a){if(a.item)names.push(a.item);});
  // reflect actual honey variety (localised "<type> honey" / compound "<type>honing")
  if(ctx.honey)names=names.map(function(n){return /honey/i.test(n)&&n.toLowerCase().indexOf(String(ctx.honey).toLowerCase())<0?labelHoneyPhrase(ctx.honey):n;});
  // reflect the yeast actually pitched for THIS batch (recipe only lists its default)
  if(b&&b.yeast){
    var yn=labelYeastName(b.yeast),placed=false;
    names=names.map(function(n){if(/yeast|gist/i.test(n)){placed=true;return yn;}return n;});
    if(!placed&&yn)names.push(yn);
  }
  // localise remaining ingredient terms (honey types + common-terms dictionary)
  names=names.map(labelTrIngredient);
  // dedupe
  var seen={},out=[];names.forEach(function(n){var k=n.toLowerCase();if(!seen[k]){seen[k]=1;out.push(n);}});
  return out.join(', ')+'.';
}
function labelStudioAllergens(ctx){
  var r=ctx.recipe||{},b=ctx.batch||{id:'_'};
  var d=(typeof shareDietaryData==='function')?shareDietaryData(b,r):{contains:[],sulfites:false,gluten:false};
  var T=LSTR(),bits=[];
  bits.push(d.gluten?T.containsGluten:T.glutenFree);
  (d.contains||[]).forEach(function(c){bits.push(T.contains(c.k));});
  if(d.sulfites)bits.push(T.sulfites);
  bits.push(T.veg);
  return bits.join(' · ')+'. '+T.alcohol+'.';
}
function labelStudioBottled(ctx){
  var T=LSTR(),bot=ctx.bot;if(!bot||!bot.date)return T.bottledWord+' —';
  var d=new Date(bot.date);if(isNaN(d.getTime()))return T.bottledWord+' —';
  return T.bottled(T.months[d.getMonth()],d.getFullYear());
}
function labelStudioWindow(ctx){
  var T=LSTR(),M=T.months,bot=ctx.bot,r=ctx.recipe||{};
  var minD=r.minAgeDays||30,maxD=r.maxAgeDays||(r.peakAgeDays?r.peakAgeDays*2:365);
  if(bot&&bot.date){
    var d=new Date(bot.date);
    if(!isNaN(d.getTime())){
      var a=new Date(d.getTime()+minD*86400000),b=new Date(d.getTime()+maxD*86400000);
      return T.bestBetween(M[a.getMonth()]+' '+a.getFullYear(),M[b.getMonth()]+' '+b.getFullYear());
    }
  }
  // No bottling date yet (e.g. designing from the recipe) — show it relatively.
  var fc=(typeof fmtDurationCompact==='function')?fmtDurationCompact:function(x){return Math.round(x/30)+'mo';};
  return T.bestAfter(fc(minD),fc(maxD));
}
// Net contents per bottle (real labels show this with the ℮ estimated sign).
function labelStudioNetVol(ctx,unit){
  var bot=ctx.bot,ml=500;
  if(ctx&&ctx.bottleVol){ml=parseInt(ctx.bottleVol)||ml;}   // per-volume label variant
  else if(bot){
    if(bot.countsAtBottling){var best=0;Object.keys(bot.countsAtBottling).forEach(function(k){if(bot.countsAtBottling[k]>best){best=bot.countsAtBottling[k];ml=parseInt(k)||ml;}});}
    else if(bot.bottles&&bot.bottles.length){ml=parseInt(bot.bottles[0].size)||ml;}
  }
  if(unit==='cl')return (ml/10)+' cl ℮';
  if(unit==='l')return (ml/1000)+' L ℮';
  return ml+' ml ℮';
}
function labelStudioVintage(ctx){var bot=ctx.bot;if(bot&&bot.date){var d=new Date(bot.date);if(!isNaN(d.getTime()))return String(d.getFullYear());}return '';}
function labelStudioProducer(ctx){var T=LSTR();var nm=(APP.settings&&(APP.settings.brewerName||APP.settings.brandName))||'';return T.producer(nm||T.theBrewer);}
function labelStudioWarning(){return LSTR().warning;}
function labelStudioServing(ctx){
  var T=LSTR(),hay=((ctx.recipe.style||'')+' '+(ctx.recipe.name||'')+' '+((ctx.recipe.tags||[]).join(' '))).toLowerCase();
  if(/sparkling|session|hydromel|p[ée]tillant/.test(hay))return T.serveCold;
  if(/sack|port|bochet|dessert|braggot/.test(hay))return T.serveCellar;
  return T.serveChilled;
}
function labelStudioPairing(ctx){
  var P=LSTR().pairings,hay=((ctx.recipe.style||'')+' '+(ctx.recipe.category||'')+' '+(ctx.recipe.name||'')).toLowerCase();
  if(/sack|port|bochet|dessert/.test(hay))return P.dessert;
  if(/cyser|apple/.test(hay))return P.cyser;
  if(/pyment|grape/.test(hay))return P.pyment;
  if(/metheglin|spice|chai|ginger|lavender|rose|hibiscus|vanilla/.test(hay))return P.spice;
  if(/melomel|fruit|berry|cherry|straw|black|peach|blue|rasp/.test(hay))return P.fruit;
  return P.def;
}
function labelStudioCarbonation(ctx){var T=LSTR(),hay=((ctx.recipe.style||'')+' '+(ctx.recipe.name||'')+' '+((ctx.recipe.tags||[]).join(' '))).toLowerCase();return /sparkling|p[ée]tillant|carbonat|bottle-condition/.test(hay)?T.sparkling:T.still;}

// Resolve a field key → display string.
function labelFieldValue(field,el,ctx){
  var v=labelFieldValueRaw(field,el,ctx);
  // In the editor (ctx.preview) show dummy data for fields with no real value
  // yet — e.g. a batch № on a recipe with no active batch — so the element stays
  // visible, selectable and movable instead of an invisible empty (or "—") box.
  if(ctx&&ctx.preview&&studioFieldEmpty(v))return labelFieldDummy(field,el);
  return v;
}
function studioFieldEmpty(v){
  if(v==null)return true;
  var s=String(v).replace(/^(Bottled|Gebotteld|№)\s*/,'').trim();
  return s===''||/^[—–-]+$/.test(s);
}
function labelFieldDummy(field,el){
  switch(field){
    case'abv':return (el&&el.raw)?'12.5':LSTR().abv('12.5');
    case'netvol':return (el&&el.raw)?'750 ml':'750 ml ℮';
    case'vintage':return '2026';
    case'carbonation':return LSTR().sparkling;
    case'volume':return '5 L';
    case'serial':return (el&&el.raw)?'2026-001':'№ 2026-001';
    case'bottled':return (el&&el.raw)?(LSTR().months[5]+' 2026'):LSTR().bottled(LSTR().months[5],'2026');
    case'producer':return labelLocale()==='nl'?'Jouw Mederij · Jouw Stad':'Your Meadery · Your City';
    case'brewer':return labelLocale()==='nl'?'Jouw Mederij':'Your Meadery';
    case'window':return labelLocale()==='nl'?'Best tussen 2026 – 2029':'Best 2026 – 2029';
    case'pairing':return LSTR().pairings.def;
    case'serving':return LSTR().serveChilled;
    case'tasting':return labelLocale()==='nl'?'Zacht, honingachtig, schone afdronk.':'Smooth, honeyed, clean finish.';
    case'ingredients':return labelLocale()==='nl'?'Honing, water, gist':'Honey, Water, Yeast';
    case'allergens':return LSTR().sulfites;
    default:return '◦ '+field;
  }
}
function labelFieldValueRaw(field,el,ctx){
  switch(field){
    case'name':return (ctx.batch&&ctx.batch.name)||recipeNameLocalized(ctx.recipe)||'Your Mead';
    case'style':return recipeStyleNl(ctx.recipe.style||'Mead');
    case'abv':var a=labelStudioAbv(ctx);if(!a)return '';return (el&&el.raw)?(''+a):LSTR().abv(a);
    case'netvol':var nv=labelStudioNetVol(ctx,el&&el.unit);return (el&&el.raw)?nv.replace(' ℮',''):nv;
    case'vintage':return labelStudioVintage(ctx);
    case'carbonation':return labelStudioCarbonation(ctx);
    case'tasting':return meadTastingSummary(ctx);
    case'pairing':return labelStudioPairing(ctx);
    case'serving':return labelStudioServing(ctx);
    case'ingredients':return labelStudioIngredients(ctx);
    case'allergens':return labelStudioAllergens(ctx);
    case'bottled':var bd=labelStudioBottled(ctx);return (el&&el.raw)?bd.replace(/^\S+\s+/,''):bd;
    case'window':return labelStudioWindow(ctx);
    case'producer':return labelStudioProducer(ctx);
    case'warning':return labelStudioWarning();
    case'volume':return ctx.batch&&ctx.batch.volume?(typeof fmtVol==='function'?fmtVol(ctx.batch.volume):ctx.batch.volume+' L'):'';
    case'serial':if(!(ctx.batch&&ctx.batch.serial))return '';return (el&&el.raw)?ctx.batch.serial:'№ '+ctx.batch.serial;
    case'brewer':return (APP.settings&&(APP.settings.brewerName||APP.settings.brandName))||'';
    case'custom':return el.text||'Custom text';
    default:return '';
  }
}

// ── SVG rendering ──────────────────────────────────────────────────────────
function studioShapePath(shape,w,h){
  var ah=(w*0.5).toFixed(1);                 // arch height
  switch(shape){
    case'oval':case'ellipse':return '<ellipse cx="'+(w/2)+'" cy="'+(h/2)+'" rx="'+(w/2)+'" ry="'+(h/2)+'"/>';
    case'seal':var rad=Math.min(w,h)/2;return '<ellipse cx="'+(w/2)+'" cy="'+(h/2)+'" rx="'+rad+'" ry="'+rad+'"/>';
    case'round':return '<rect x="0" y="0" width="'+w+'" height="'+h+'" rx="22" ry="22"/>';
    case'arch':return '<path d="M0 '+ah+' Q0 0 '+(w/2)+' 0 Q'+w+' 0 '+w+' '+ah+' L'+w+' '+h+' L0 '+h+' Z"/>';
    case'shield':return '<path d="M6 0 L'+(w-6)+' 0 L'+(w-6)+' '+(h*0.55).toFixed(1)+' Q'+(w-6)+' '+(h*0.86).toFixed(1)+' '+(w/2)+' '+h+' Q6 '+(h*0.86).toFixed(1)+' 6 '+(h*0.55).toFixed(1)+' Z"/>';
    case'banner':var nw=(w*0.09).toFixed(1);return '<path d="M0 0 L'+w+' 0 L'+(w-nw)+' '+(h/2)+' L'+w+' '+h+' L0 '+h+' L'+nw+' '+(h/2)+' Z"/>';
    case'hex':return '<path d="M'+(w*0.25).toFixed(1)+' 0 L'+(w*0.75).toFixed(1)+' 0 L'+w+' '+(h/2)+' L'+(w*0.75).toFixed(1)+' '+h+' L'+(w*0.25).toFixed(1)+' '+h+' L0 '+(h/2)+' Z"/>';
    default:return '<rect x="0" y="0" width="'+w+'" height="'+h+'"/>';
  }
}
// Crude but effective word-wrap by estimated glyph width.
function studioWrap(text,maxW,size){
  var cpl=Math.max(4,Math.floor(maxW/(size*0.52)));
  var words=String(text).split(/\s+/),lines=[],cur='';
  words.forEach(function(wd){
    if((cur+' '+wd).trim().length<=cpl||!cur)cur=(cur+' '+wd).trim();
    else{lines.push(cur);cur=wd;}
  });
  if(cur)lines.push(cur);
  return lines;
}
function studioTextEl(el,str){
  var size=el.size||13,lh=el.lh||1.25,align=el.align||'left',color=el.color||'#e8e0d0';
  var anchor=align==='center'?'middle':(align==='right'?'end':'start');
  var tx=align==='center'?el.x+el.w/2:(align==='right'?el.x+el.w:el.x);
  var ff=labelFontCss(el.font||'Crimson');
  var weight=el.weight||(el.field==='name'?'700':'400');
  var fs=el.italic?'italic':'normal';
  var ls=el.spacing!=null?el.spacing:0;
  var disp=el.upper?String(str).toUpperCase():String(str);
  var lines=studioWrap(disp,el.w,size);
  var lineH=size*lh;
  var startY=el.y+size; // baseline of first line
  var tspans=lines.map(function(ln,i){
    return '<tspan x="'+tx.toFixed(1)+'" y="'+(startY+i*lineH).toFixed(1)+'">'+escHtml(ln)+'</tspan>';
  }).join('');
  return '<text text-anchor="'+anchor+'" font-family=\''+ff+'\' font-size="'+size+'" font-weight="'+weight+'" font-style="'+fs+'" letter-spacing="'+ls+'" fill="'+color+'">'+tspans+'</text>';
}
function studioRenderElement(el,ctx){
  if(el.type==='sweetscale')return studioSweetScale(el,ctx);
  if(el.type==='honeydrop')return honeyDropSVG(el);
  if(el.type==='honeycomb'){
    var cid='hcp-'+el.id;
    return '<g transform="translate('+el.x+' '+el.y+')"><clipPath id="'+cid+'"><rect width="'+el.w+'" height="'+el.h+'" rx="'+(el.radius||8)+'"/></clipPath><g clip-path="url(#'+cid+')">'+honeycombSVG(el.w,el.h,el.color||'#c9a84c',el.opacity!=null?el.opacity:0.55,el.size||12)+'</g></g>';
  }
  if(el.type==='text')return studioTextEl(el,labelHeaderI18n(el.text||''));
  if(el.type==='field'){
    if(el.field==='qr')return studioQR(el,ctx);
    return studioTextEl(el,labelFieldValue(el.field,el,ctx));
  }
  if(el.type==='shape'){
    if(el.kind==='line')return '<line x1="'+el.x+'" y1="'+el.y+'" x2="'+(el.x+el.w)+'" y2="'+el.y+'" stroke="'+(el.stroke||'#c9a84c')+'" stroke-width="'+(el.strokeW||1)+'"/>';
    if(el.kind==='ellipse')return '<ellipse cx="'+(el.x+el.w/2)+'" cy="'+(el.y+el.h/2)+'" rx="'+(el.w/2)+'" ry="'+(el.h/2)+'" fill="'+(el.fill||'none')+'" stroke="'+(el.stroke||'none')+'" stroke-width="'+(el.strokeW||0)+'"/>';
    return '<rect x="'+el.x+'" y="'+el.y+'" width="'+el.w+'" height="'+el.h+'" rx="'+(el.radius||0)+'" fill="'+(el.fill||'none')+'" stroke="'+(el.stroke||'none')+'" stroke-width="'+(el.strokeW||0)+'"/>';
  }
  if(el.type==='image'||el.type==='logo'){
    var href=el.type==='logo'?((APP.settings&&APP.settings.brandLogo)||''):(el.src||'');
    if(!href)return '<rect x="'+el.x+'" y="'+el.y+'" width="'+el.w+'" height="'+el.h+'" fill="none" stroke="#6a5d44" stroke-width="1" stroke-dasharray="4 3"/><text x="'+(el.x+el.w/2)+'" y="'+(el.y+el.h/2)+'" text-anchor="middle" font-family="monospace" font-size="9" fill="#8a7a58">'+(el.type==='logo'?'no brand logo':'image')+'</text>';
    return '<image href="'+escHtml(href)+'" x="'+el.x+'" y="'+el.y+'" width="'+el.w+'" height="'+el.h+'" preserveAspectRatio="xMidYMid meet"/>';
  }
  return '';
}
function studioQR(el,ctx){
  if(!ctx.batch||typeof buildBatchQRSVG!=='function')return '<rect x="'+el.x+'" y="'+el.y+'" width="'+el.w+'" height="'+el.h+'" fill="none" stroke="#6a5d44" stroke-dasharray="4 3"/><text x="'+(el.x+el.w/2)+'" y="'+(el.y+el.h/2)+'" text-anchor="middle" font-family="monospace" font-size="8" fill="#8a7a58">QR (needs batch)</text>';
  // buildBatchQRSVG draws in a 900 box at cfg.x/y (%); wrap+scale into el box.
  var qr=buildBatchQRSVG(ctx.batch,{x:50,y:50,theme:'transparent'});
  var s=Math.min(el.w,el.h)/148; // QR card is ~148 units
  return '<g transform="translate('+el.x+' '+el.y+') scale('+s.toFixed(3)+') translate(-376,-376)">'+qr+'</g>';
}
// Dry → Sweet meter (a hallmark of real mead/cider labels).
// Map a sweetness word (bottling values Bone Dry…Dessert, or a recipe guess)
// onto the 4-point Dry→Sweet meter. Order matters: dessert before sweet, etc.
function studioSweetIndex(sw){
  sw=String(sw||'').toLowerCase().trim();
  if(/dessert/.test(sw))return 3;
  if(/bone\s*dry/.test(sw))return 0;
  if(/semi|medium/.test(sw))return 2;
  if(/off/.test(sw))return 1;
  if(/sweet/.test(sw))return 3;
  return 0;
}
function studioSweetScale(el,ctx){
  var levels=LSTR().sweet;
  var idx=studioSweetIndex((ctx.bot&&ctx.bot.sweetness)||labelStudioSweetGuess(ctx.recipe));
  var x=el.x,y=el.y,w=el.w,color=el.color||'#c9a84c',ff=labelFontCss(el.font||'Mono'),fs=el.size||8;
  var n=levels.length,seg=n>1?w/(n-1):0;
  var p='<line x1="'+x+'" y1="'+y+'" x2="'+(x+w)+'" y2="'+y+'" stroke="'+color+'" stroke-width="1.2" opacity="0.45"/>';
  for(var i=0;i<n;i++){
    var px=(x+seg*i).toFixed(1),on=(i===idx);
    p+='<circle cx="'+px+'" cy="'+y+'" r="'+(on?3.6:2)+'" fill="'+(on?color:'#0a0806')+'" stroke="'+color+'" stroke-width="1"/>';
    p+='<text x="'+px+'" y="'+(y+fs+5)+'" text-anchor="middle" font-family=\''+ff+'\' font-size="'+fs+'" fill="'+(on?color:'#8a7a58')+'" font-weight="'+(on?'700':'400')+'">'+levels[i]+'</text>';
  }
  return p;
}
// A honeycomb hex grid covering w×h (used as a subtle label texture or a patch).
function honeycombSVG(w,h,color,opacity,s){
  s=s||15;
  var hexW=Math.sqrt(3)*s,vstep=1.5*s,out=[],row=0;
  function hex(cx,cy){var p=[];for(var i=0;i<6;i++){var a=Math.PI/180*(60*i-90);p.push((cx+s*Math.cos(a)).toFixed(1)+','+(cy+s*Math.sin(a)).toFixed(1));}return '<polygon points="'+p.join(' ')+'"/>';}
  for(var cy=0;cy<=h+s;cy+=vstep){var off=(row%2)?hexW/2:0;for(var cx=0;cx<=w+hexW;cx+=hexW){out.push(hex(cx+off,cy));}row++;}
  return '<g fill="none" stroke="'+(color||'#c9a84c')+'" stroke-width="1" opacity="'+(opacity!=null?opacity:0.1)+'">'+out.join('')+'</g>';
}
// A small honey droplet (teardrop) for honey theming.
function honeyDropSVG(el){
  var x=el.x,y=el.y,w=el.w||16,h=el.h||22,c=el.color||'#e0b84e';
  return '<path d="M'+(x+w/2)+' '+y+' Q'+(x+w)+' '+(y+h*0.55)+' '+(x+w/2)+' '+(y+h)+' Q'+x+' '+(y+h*0.55)+' '+(x+w/2)+' '+y+' Z" fill="'+c+'"/>'
    +'<ellipse cx="'+(x+w*0.38)+'" cy="'+(y+h*0.5)+'" rx="'+(w*0.12)+'" ry="'+(h*0.16)+'" fill="#fff" opacity="0.5"/>';
}
// Render one side (front/back) to an SVG string.
function studioRenderSide(side,W,H,ctx,opts){
  opts=opts||{};
  var clipId='lsclip-'+(opts.idSuffix||'x');
  var bg=side.bg||'#ffffff';
  var parts='<defs><clipPath id="'+clipId+'">'+studioShapePath(side.shape||'rect',W,H)+'</clipPath></defs>';
  parts+='<g clip-path="url(#'+clipId+')">';
  parts+=studioShapePath(side.shape||'rect',W,H).replace('<rect','<rect fill="'+bg+'"').replace('<ellipse','<ellipse fill="'+bg+'"').replace('<path','<path fill="'+bg+'"');
  if(side.honeycomb)parts+=honeycombSVG(W,H,side.honeycombColor||'#c9a84c',side.honeycombOpacity!=null?side.honeycombOpacity:0.1,side.honeycombSize||15);
  if(side.bgImage)parts+='<image href="'+escHtml(side.bgImage)+'" x="0" y="0" width="'+W+'" height="'+H+'" preserveAspectRatio="xMidYMid slice"/>';
  (side.elements||[]).forEach(function(el){
    // In the editor, lay a transparent rect over each element's box so the whole
    // box is grabbable — even an empty/short element stays selectable & movable.
    var hit=opts.interactive?'<rect x="'+el.x+'" y="'+el.y+'" width="'+Math.max(8,el.w||8)+'" height="'+Math.max(8,el.h||el.size||20)+'" fill="transparent"/>':'';
    parts+='<g data-el-id="'+el.id+'" style="cursor:'+(opts.interactive?'move':'default')+'">'+hit+studioRenderElement(el,ctx)+'</g>';
    if(opts.selId===el.id){
      parts+='<rect x="'+(el.x-3)+'" y="'+(el.y-3)+'" width="'+(el.w+6)+'" height="'+((el.h||2)+6)+'" fill="none" stroke="#5aa0ff" stroke-width="1.5" stroke-dasharray="4 3" pointer-events="none"/>';
    }
  });
  parts+='</g>';
  if(side.border)parts+=studioShapePath(side.shape||'rect',W,H).replace(/<(rect|ellipse|path)/,'<$1 fill="none" stroke="'+side.border+'" stroke-width="2"');
  return '<svg id="'+(opts.svgId||'studio-svg')+'" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" style="'+(opts.style||'')+'">'+parts+'</svg>';
}

// ── Integration: the saved Studio design IS the label across the app ───────
function studioHasDesign(recipeId){return !!(APP.settings&&APP.settings.labelStudio&&APP.settings.labelStudio[recipeId]&&APP.settings.labelStudio[recipeId].front);}
var _studioLblN=0;
// Drop-in for renderLabelWithABV: renders the Studio FRONT when the recipe has a
// saved design, else falls back to the legacy label. Used by the batch views etc.
function renderBatchLabel(recipeId,abvText,opts){
  opts=opts||{};
  if(studioHasDesign(recipeId)){
    var batch=opts.batch;
    var bot=batch&&(APP.bottling||{})[batch.id];
    var sizes=batchBottleSizes(bot);            // distinct bottle sizes (ml)
    var vols=sizes.length?sizes:[null];          // one default render if not bottled
    var rad=(opts.radius!=null?opts.radius:'4px');
    function one(sd,cap,design,ctx){
      var svg=studioRenderSide(sd,design.w,design.h,ctx,{idSuffix:'bl'+(_studioLblN++),style:'display:block;width:100%;height:auto'});
      return '<div style="flex:1 1 150px;min-width:0;max-width:'+design.w+'px">'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;text-align:center;margin-bottom:5px">'+cap+'</div>'
        +'<div style="line-height:0;overflow:hidden;border-radius:'+rad+'">'+svg+'</div></div>';
    }
    var groups=vols.map(function(vol){
      var design=studioDesignFor(recipeId,vol)||APP.settings.labelStudio[recipeId];
      var ctx=labelStudioCtx(recipeId,batch?batch.id:null);ctx.bottleVol=vol;
      var twoUp=(design.backEnabled!==false);
      var pair='<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;align-items:flex-start">'
        +one(design.front,'FRONT',design,ctx)+(twoUp?one(design.back,'BACK',design,ctx):'')+'</div>';
      // Caption the bottle size only when the batch has more than one.
      var dedicated=studioVariantKey(recipeId,vol)===recipeId+'#'+vol;
      var cap=(vols.length>1&&vol)?'<div style="font-family:var(--font-mono);font-size:10px;color:#caa84c;letter-spacing:1.5px;text-align:center;margin-bottom:6px">🍶 '+vol+' ml'+(dedicated?'':' · default')+'</div>':'';
      return '<div>'+cap+pair+'</div>';
    });
    return '<div class="label-display" style="display:flex;flex-direction:column;gap:16px">'+groups.join('')+'</div>';
  }
  return renderLabelWithABV(recipeId,abvText,opts);
}
// True when the recipe's studio design has a back side that's enabled.
function studioHasBack(recipeId){
  var d=APP.settings&&APP.settings.labelStudio&&APP.settings.labelStudio[recipeId];
  return !!(d&&d.front&&d.back&&d.backEnabled!==false);
}
// Download one or both sides as SEPARATE PNG files. side: 'front'|'back'|'both'.
// Defaults to 'front' so existing callers keep working.
function studioDownloadFor(recipeId,batchId,side){
  side=side||'front';
  var batch=batchId&&(APP.batches||[]).filter(function(b){return b.id===batchId;})[0];
  var vol=batchPrimaryVolume(batch);
  var d=studioDesignFor(recipeId,vol)||APP.settings.labelStudio[recipeId];
  var ctx=labelStudioCtx(recipeId,batchId);ctx.bottleVol=vol;
  var hasBack=!!(d.back&&d.backEnabled!==false);
  var base=((ctx.batch&&ctx.batch.name)||ctx.recipe.name||'mead').replace(/[^\w-]+/g,'_');
  // Render a single side and trigger a download with the given filename suffix.
  function dl(sd,suffix,n){
    var svg=studioRenderSide(sd,d.w,d.h,ctx,{idSuffix:'dl'+(suffix||'')});
    studioRasterize(svg,d.w,d.h,3,function(blob){
      if(!blob){toast('⚠ Could not encode PNG');return;}
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=base+'-label'+(suffix||'')+'.png';
      document.body.appendChild(a);a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},120);
      if(n)toast(n);
    });
  }
  if(side==='back'){
    if(!hasBack){toast('⚠ No back label on this design');return;}
    dl(d.back,'-back','✦ Back label saved');return;
  }
  if(side==='both'){
    if(!hasBack){dl(d.front,'','✦ Label saved');return;}
    dl(d.front,'-front',null);
    // Slight delay so the browser treats it as a second, separate download.
    setTimeout(function(){dl(d.back,'-back','✦ Front + back saved');},300);
    return;
  }
  // 'front' — suffix the file only when a back exists (so the pair is named clearly)
  dl(d.front,hasBack?'-front':'','✦ Label saved');
}
// One side's SVG of the saved design for a recipe (used by the label sheet and
// anywhere that needs a print-ready single side). '' if no design / no back.
function studioSideSVG(recipeId,batchId,side,opts){
  opts=opts||{};
  if(!studioHasDesign(recipeId))return '';
  var batch=batchId&&(APP.batches||[]).filter(function(b){return b.id===batchId;})[0];
  var vol=opts.volume!=null?opts.volume:batchPrimaryVolume(batch);
  var d=studioDesignFor(recipeId,vol)||APP.settings.labelStudio[recipeId];
  if(side==='back'&&d.backEnabled===false)return '';
  var sd=(side==='back')?d.back:d.front,ctx=labelStudioCtx(recipeId,batchId);ctx.bottleVol=vol;
  return studioRenderSide(sd,d.w,d.h,ctx,{idSuffix:opts.idSuffix||('ss'+(_studioLblN++)),style:opts.style||'display:block;width:100%;height:auto'});
}
// Ask front-only vs front+back at print time — only when the design has a back.
function studioAskSides(recipeId){
  var d=APP.settings.labelStudio&&APP.settings.labelStudio[recipeId];
  if(d&&d.backEnabled!==false&&typeof confirm==='function')return confirm('Print BOTH sides?\n\nOK = front + back\nCancel = front only')?'both':'front';
  return 'front';
}
function studioPrintFor(recipeId,batchId,sides){
  var batch=batchId&&(APP.batches||[]).filter(function(b){return b.id===batchId;})[0];
  var vol=batchPrimaryVolume(batch);
  var d=studioDesignFor(recipeId,vol)||APP.settings.labelStudio[recipeId];
  var ctx=labelStudioCtx(recipeId,batchId);ctx.bottleVol=vol;
  var f=studioRenderSide(d.front,d.w,d.h,ctx,{idSuffix:'pf',style:'border:1px solid #ccc'});
  var b=(sides!=='front'&&d.backEnabled!==false)?studioRenderSide(d.back,d.w,d.h,ctx,{idSuffix:'pb',style:'border:1px solid #ccc'}):'';
  var w=window.open('','_blank','width=900,height=900');if(!w){toast('⚠ Popup blocked');return;}
  w.document.write('<!DOCTYPE html><html><head><title>Labels</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=Crimson+Pro:ital@0;1&family=JetBrains+Mono&display=swap" rel="stylesheet"><style>body{margin:0;display:flex;flex-wrap:wrap;gap:14mm;justify-content:center;align-items:flex-start;padding:14mm;background:#fff}svg{height:auto}@media print{body{padding:0}}</style></head><body>'+f+b+'</body></html>');
  w.document.close();setTimeout(function(){try{w.print();}catch(e){}},600);
}

// ── Editor ──────────────────────────────────────────────────────────────────
function openLabelStudio(recipeId,batchId){
  closeModal();
  window._studio={recipeId:recipeId,batchId:batchId||null,side:'front',selId:null,volume:null};
  document.body.insertAdjacentHTML('beforeend','<div class="modal-overlay modal-static" id="studio-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" id="studio-modal" style="max-width:1120px;width:96vw;max-height:94vh;display:flex;flex-direction:column;padding:0;overflow:hidden"></div></div>');
  renderLabelStudio();
}
function studioDesign(){return labelStudioGet(window._studio.recipeId,window._studio.volume);}
function studioSide(){var d=studioDesign();return d[window._studio.side];}
function studioCtx(){var c=labelStudioCtx(window._studio.recipeId,window._studio.batchId);c.preview=true;c.bottleVol=window._studio.volume||null;return c;}
function studioSetVolume(v){window._studio.volume=v?parseInt(v):null;window._studio.selId=null;renderLabelStudio();}
function studioLocalePicker(){
  var cur=labelLocale();
  var opts=LABEL_LOCALES.map(function(l){return '<option value="'+l.id+'"'+(l.id===cur?' selected':'')+'>'+l.label+'</option>';}).join('');
  return '<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text2);white-space:nowrap" title="Language for the generated label text"><span>🌐</span><select onchange="studioSetLocale(this.value)" style="background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:3px 6px;font-size:11.5px">'+opts+'</select></label>';
}
function studioSetLocale(v){if(!APP.settings)APP.settings={};APP.settings.labelLocale=v;window._studio.selId=null;renderLabelStudio();labelStudioSave();}
function studioVolumePicker(){
  var rid=window._studio.recipeId;
  var vols=studioVariantVolumes(rid);
  [250,330,375,500,750,1000].forEach(function(s){vols.push(s);});
  (APP.batches||[]).filter(function(b){return b.recipeId===rid;}).forEach(function(b){batchBottleSizes((APP.bottling||{})[b.id]).forEach(function(s){vols.push(s);});});
  vols=vols.filter(function(v,i,a){return v&&a.indexOf(v)===i;}).sort(function(a,b){return a-b;});
  var cur=window._studio.volume||'';
  var opts='<option value="">Default · all sizes</option>'+vols.map(function(v){
    var has=studioVariantKey(rid,v)===rid+'#'+v;   // ✓ marks sizes with a dedicated variant
    return '<option value="'+v+'"'+(String(cur)===String(v)?' selected':'')+'>'+v+' ml'+(has?' ✓':'')+'</option>';
  }).join('');
  var del=window._studio.volume?'<button class="btn btn-secondary btn-sm" title="Remove this size-specific variant (falls back to the default design)" onclick="studioDeleteVariant()" style="padding:3px 8px">✕</button>':'';
  return '<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text2);white-space:nowrap" title="Design a label specific to a bottle size"><span>🍶</span><select onchange="studioSetVolume(this.value)" style="background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:3px 6px;font-size:11.5px">'+opts+'</select></label>'+del;
}
function studioDeleteVariant(){
  var v=window._studio.volume;if(!v)return;
  delete labelStudioStore()[window._studio.recipeId+'#'+v];
  window._studio.volume=null;window._studio.selId=null;renderLabelStudio();labelStudioSave();toast('Removed '+v+' ml variant');
}
function studioSelEl(){var s=studioSide();return (s.elements||[]).filter(function(e){return e.id===window._studio.selId;})[0]||null;}

function renderLabelStudio(){
  var modal=document.getElementById('studio-modal');if(!modal)return;
  var d=studioDesign(),st=window._studio;
  modal.innerHTML=
    // Top bar
    '<div style="display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<div class="modal-title" style="margin:0">🎨 Label Studio</div>'
      +'<div style="display:flex;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">'
        +(['front'].concat(d.backEnabled!==false?['back']:[])).map(function(sd){var on=st.side===sd;return '<button onclick="studioSetSide(\''+sd+'\')" style="padding:6px 16px;border:none;cursor:pointer;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;background:'+(on?'var(--gold)':'var(--bg2)')+';color:'+(on?'#000':'var(--text2)')+'">'+sd+'</button>';}).join('')+'</div>'
        +'<label style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text2);cursor:pointer;white-space:nowrap" title="Include a back label"><input type="checkbox" '+(d.backEnabled!==false?'checked':'')+' onchange="studioToggleBack(this.checked)" style="accent-color:var(--gold)"> Back label</label>'
      +studioVolumePicker()
      +studioLocalePicker()
      +'<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">'
        +'<button class="btn btn-secondary btn-sm" onclick="studioResetDefault()" title="Reset both sides to the default design">↺ Default</button>'
        +'<button class="btn btn-secondary btn-sm" onclick="exportLabelStudioPNG()">⬇ PNG ('+st.side+')</button>'
        +'<button class="btn btn-secondary btn-sm" onclick="printLabelStudio()">🖨 Print sheet</button>'
        +'<button class="btn btn-primary btn-sm" onclick="labelStudioSave();toast(\'✦ Label saved\')">Save</button>'
        +'<button class="btn btn-secondary btn-sm" onclick="closeModal()">✕</button>'
      +'</div>'
    +'</div>'
    // Body: tools | canvas | props
    +'<div style="flex:1;display:flex;min-height:0;overflow:hidden">'
      +'<div style="width:200px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;padding:14px">'+studioToolsHtml(d)+'</div>'
      +'<div id="studio-stage" style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#15151a 0% 25%,#101014 0% 50%) 50%/26px 26px;overflow:auto;padding:24px">'
        +'<div id="studio-canvas-wrap" onpointerdown="studioPointerDown(event)" style="box-shadow:0 10px 40px rgba(0,0,0,.6);line-height:0">'+studioCanvas()+'</div>'
      +'</div>'
      +'<div id="studio-props" style="width:248px;flex-shrink:0;border-left:1px solid var(--border);overflow-y:auto;padding:14px">'+studioPropsHtml()+'</div>'
    +'</div>';
}
function studioCanvas(){
  var d=studioDesign();
  return studioRenderSide(studioSide(),d.w,d.h,studioCtx(),{interactive:true,selId:window._studio.selId,svgId:'studio-canvas',idSuffix:'edit',style:'display:block;background:#000;border-radius:2px'});
}
function studioRefreshCanvas(){var w=document.getElementById('studio-canvas-wrap');if(w)w.innerHTML=studioCanvas();}

function studioToolsHtml(d){
  function sect(t){return '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin:14px 0 8px">'+t+'</div>';}
  var addBtn=function(label,onclick){return '<button class="btn btn-secondary btn-sm" style="width:100%;justify-content:flex-start;margin-bottom:6px" onclick="'+onclick+'">'+label+'</button>';};
  var fieldOpts=LABEL_FIELDS.map(function(f){
    var o='<option value="'+f.key+'">'+escHtml(f.label)+'</option>';
    // Offer a "value only" variant in the picker for fields that carry a prefix
    // (ABV → 14.5, Batch № → 2026-001, etc.) — for art that already prints it.
    if(/^(abv|serial|netvol|bottled)$/.test(f.key))o+='<option value="'+f.key+':raw">'+escHtml(f.label)+' — value only</option>';
    return o;
  }).join('');
  var s=studioSide();
  var tplBtns=LABEL_TEMPLATES.map(function(t){return '<button class="btn btn-secondary btn-sm" style="margin:0 6px 6px 0" onclick="studioApplyTemplate(\''+t.key+'\')" title="'+escHtml(t.hint||'')+'">'+escHtml(t.label)+'</button>';}).join('');
  return '<button class="btn btn-primary btn-sm" style="width:100%;margin-bottom:8px" onclick="studioUploadOwn()">📤 Upload my own design</button>'
    +'<div style="font-size:10.5px;color:var(--text3);font-style:italic;line-height:1.5;margin-bottom:6px">Upload a finished label image, then drop live data (batch №, % vol…) onto its blank spots.</div>'
    +(s.bgImage?'<button class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:6px" onclick="studioSetCanvas(\'bgImage\',null)">✕ Remove uploaded design</button>':'')
    +sect('TEMPLATES')+'<div style="display:flex;flex-wrap:wrap">'+tplBtns+'</div>'
    +studioLayoutsHtml()
    +sect('ADD ELEMENT')
    +addBtn('＋ Text',"studioAdd('text')")
    +addBtn('＋ Rectangle',"studioAdd('rect')")
    +addBtn('＋ Line',"studioAdd('line')")
    +addBtn('＋ Brand logo',"studioAdd('logo')")
    +addBtn('＋ Image…',"studioAddImage()")
    +addBtn('＋ QR code',"studioAdd('qr')")
    +addBtn('＋ Sweetness scale',"studioAdd('sweetscale')")
    +addBtn('＋ Honeycomb patch',"studioAdd('honeycomb')")
    +addBtn('＋ Honey drop',"studioAdd('honeydrop')")
    +'<div style="display:flex;gap:6px;margin-bottom:6px"><select id="studio-field-pick" class="form-input" style="flex:1;font-size:12px">'+fieldOpts+'</select><button class="btn btn-primary btn-sm" onclick="studioAddField()" title="Add the selected data field">＋</button></div>'
    +'<div style="font-size:10.5px;color:var(--text3);font-style:italic;line-height:1.5;margin-bottom:4px">Data fields pull live from the batch, recipe & honey.</div>'
    +sect('CANVAS')
    +'<label class="form-label">Shape</label><select class="form-input" onchange="studioSetCanvas(\'shape\',this.value)" style="margin-bottom:8px">'+LABEL_SHAPES.map(function(x){return '<option value="'+x.key+'"'+(s.shape===x.key?' selected':'')+'>'+x.label+'</option>';}).join('')+'</select>'
    +'<label class="form-label">Size</label><select class="form-input" onchange="studioSetSize(this.value)" style="margin-bottom:8px">'+LABEL_SIZES.map(function(x){return '<option value="'+x.key+'"'+(d.w===x.w&&d.h===x.h?' selected':'')+'>'+x.label+' ('+x.w+'×'+x.h+')</option>';}).join('')+'</select>'
    +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Background</label><input type="color" value="'+(s.bg||'#17110a')+'" oninput="studioSetCanvas(\'bg\',this.value)" style="width:38px;height:26px;padding:0;border:1px solid var(--border);border-radius:4px;background:none"></div>'
    +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Border</label><input type="color" value="'+(s.border||'#c9a84c')+'" oninput="studioSetCanvas(\'border\',this.value)" style="width:38px;height:26px;padding:0;border:1px solid var(--border);border-radius:4px;background:none"><button class="btn btn-secondary btn-sm" onclick="studioSetCanvas(\'border\',null)">none</button></div>'
    +'<label style="display:flex;align-items:center;gap:8px;margin:6px 0 8px;font-size:12.5px;color:var(--text2);cursor:pointer"><input type="checkbox" '+(s.honeycomb?'checked':'')+' onchange="studioSetCanvas(\'honeycomb\',this.checked?true:null)" style="accent-color:var(--gold)"> 🍯 Honeycomb texture</label>'
    +(s.honeycomb?'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Tint</label><input type="color" value="'+(s.honeycombColor||'#c9a84c')+'" oninput="studioSetCanvas(\'honeycombColor\',this.value)" style="width:38px;height:26px;padding:0;border:1px solid var(--border);border-radius:4px"></div>':'')
    +'<button class="btn btn-secondary btn-sm" style="width:100%" onclick="studioBgImage()">Background image…</button>';
}

function studioPropsHtml(){
  var el=studioSelEl();
  if(!el)return '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">PROPERTIES</div><div style="font-size:12.5px;color:var(--text3);font-style:italic;line-height:1.6">Select an element on the label to edit it — drag to move. Data fields pull live from the batch, recipe and the honey you used.</div>';
  var rows='';
  function row(label,html){rows+='<div style="margin-bottom:10px"><label class="form-label">'+label+'</label>'+html+'</div>';}
  function num(prop,min,max,step){return '<input type="number" class="form-input" value="'+(el[prop]!=null?el[prop]:0)+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" oninput="studioUpd(\''+prop+'\',parseFloat(this.value))">';}
  var title=el.type==='field'?(LABEL_FIELDS.filter(function(f){return f.key===el.field;})[0]||{}).label:(el.type==='text'?'Text':(el.type==='shape'?(el.kind+' shape'):el.type));
  rows+='<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1.5px;margin-bottom:10px">'+escHtml((title||'ELEMENT').toUpperCase())+'</div>';
  if(el.type==='text'||(el.type==='field'&&el.field==='custom'))
    row('Text','<textarea class="form-input" style="min-height:54px" oninput="studioUpd(\'text\',this.value)">'+escHtml(el.text||'')+'</textarea>');
  if(el.type==='text'||el.type==='field'||el.type==='sweetscale'){
    row('Font','<select class="form-input" onchange="studioUpd(\'font\',this.value)">'+LABEL_FONTS.map(function(f){return '<option value="'+f.key+'"'+(el.font===f.key?' selected':'')+'>'+f.label+'</option>';}).join('')+'</select>');
    row('Size / colour','<div style="display:flex;gap:8px"><input type="number" class="form-input" style="flex:1" value="'+(el.size||13)+'" min="6" max="64" oninput="studioUpd(\'size\',parseFloat(this.value))"><input type="color" value="'+(el.color||'#e8e0d0')+'" oninput="studioUpd(\'color\',this.value)" style="width:38px;height:36px;padding:0;border:1px solid var(--border);border-radius:4px"></div>');
  }
  if(el.type==='text'||el.type==='field'){
    row('Align','<div style="display:flex;gap:6px">'+['left','center','right'].map(function(a){return '<button class="btn '+(el.align===a?'btn-primary':'btn-secondary')+' btn-sm" style="flex:1" onclick="studioUpd(\'align\',\''+a+'\')">'+a+'</button>';}).join('')+'</div>');
    row('Style','<div style="display:flex;gap:6px"><button class="btn '+(el.weight==='700'?'btn-primary':'btn-secondary')+' btn-sm" style="flex:1" onclick="studioToggle(\'weight\',\'700\',\'400\')">Bold</button><button class="btn '+(el.italic?'btn-primary':'btn-secondary')+' btn-sm" style="flex:1" onclick="studioToggle(\'italic\',true,false)">Italic</button><button class="btn '+(el.upper?'btn-primary':'btn-secondary')+' btn-sm" style="flex:1" onclick="studioToggle(\'upper\',true,false)">CAPS</button></div>');
  }
  if(el.type==='field'&&/^(abv|netvol|serial|bottled)$/.test(el.field)){
    row('Value','<button class="btn '+(el.raw?'btn-primary':'btn-secondary')+' btn-sm" style="width:100%" onclick="studioToggle(\'raw\',true,false)" title="Show just the number/value, without the &quot;% ABV&quot; / &quot;№&quot; label — for designs that already print it">'+(el.raw?'✓ Number / value only':'Number / value only')+'</button>');
  }
  if(el.type==='field'&&el.field==='netvol'){
    row('Unit','<div style="display:flex;gap:6px">'+['ml','cl','l'].map(function(u){return '<button class="btn '+((el.unit||'ml')===u?'btn-primary':'btn-secondary')+' btn-sm" style="flex:1" onclick="studioSetProp(\'unit\',\''+u+'\')">'+u+'</button>';}).join('')+'</div>');
  }
  if(el.type==='honeycomb'||el.type==='honeydrop'){
    row('Colour','<input type="color" value="'+(el.color||'#c9a84c')+'" oninput="studioUpd(\'color\',this.value)" style="width:48px;height:32px;padding:0;border:1px solid var(--border);border-radius:4px">');
  }
  if(el.type==='shape'){
    if(el.kind!=='line')row('Fill','<div style="display:flex;gap:6px;align-items:center"><input type="color" value="'+(el.fill&&el.fill!=='none'?el.fill:'#c9a84c')+'" oninput="studioUpd(\'fill\',this.value)" style="width:38px;height:32px;padding:0;border:1px solid var(--border);border-radius:4px"><button class="btn btn-secondary btn-sm" onclick="studioUpd(\'fill\',\'none\')">none</button></div>');
    row('Stroke','<div style="display:flex;gap:6px;align-items:center"><input type="color" value="'+(el.stroke&&el.stroke!=='none'?el.stroke:'#c9a84c')+'" oninput="studioUpd(\'stroke\',this.value)" style="width:38px;height:32px;padding:0;border:1px solid var(--border);border-radius:4px"><input type="number" class="form-input" style="flex:1" value="'+(el.strokeW||1)+'" min="0" max="12" step="0.5" oninput="studioUpd(\'strokeW\',parseFloat(this.value))"></div>');
    if(el.kind==='rect')row('Corner radius',num('radius',0,40));
  }
  row('Position','<div style="display:flex;gap:8px">'+num('x',-50,600)+num('y',-50,700)+'</div>');
  if(el.type!=='shape'||el.kind!=='line')row('Size (w × h)','<div style="display:flex;gap:8px">'+num('w',8,600)+num('h',2,700)+'</div>');
  else row('Length',num('w',8,600));
  rows+='<div style="display:flex;gap:6px;margin-top:14px"><button class="btn btn-secondary btn-sm" style="flex:1" onclick="studioOrder(1)">▲ Front</button><button class="btn btn-secondary btn-sm" style="flex:1" onclick="studioOrder(-1)">▼ Back</button></div>';
  rows+='<button class="btn btn-danger btn-sm" style="width:100%;margin-top:8px" onclick="studioDelete()">🗑 Delete element</button>';
  return rows;
}

// ── Editor actions ──────────────────────────────────────────────────────────
function studioSetSide(sd){window._studio.side=sd;window._studio.selId=null;renderLabelStudio();}
function studioToggleBack(on){
  var d=studioDesign();d.backEnabled=!!on;
  if(!on&&window._studio.side==='back')window._studio.side='front';
  window._studio.selId=null;renderLabelStudio();
}
function studioSetSize(key){var s=LABEL_SIZES.filter(function(x){return x.key===key;})[0];if(!s)return;var d=studioDesign();d.w=s.w;d.h=s.h;renderLabelStudio();}
function studioSetCanvas(prop,val){var s=studioSide();if(val===null)delete s[prop];else s[prop]=val;renderLabelStudio();}
function studioSetProp(prop,val){var el=studioSelEl();if(!el)return;el[prop]=val;renderLabelStudio();}
function studioResetDefault(){
  if(!confirm('Reset both sides of this label to the default design? Your customisations will be lost.'))return;
  labelStudioStore()[window._studio.recipeId]=labelStudioDefault(window._studio.recipeId);
  window._studio.selId=null;renderLabelStudio();toast('↺ Reset to default');
}
function studioApplyTemplate(key){
  if(key==='own'){studioUploadOwn();return;}
  var t=LABEL_TEMPLATES.filter(function(x){return x.key===key;})[0];if(!t||!t.build)return;
  if(!confirm('Apply the "'+t.label+'" template? It replaces the current design on both sides.'))return;
  labelStudioStore()[labelStudioKey(window._studio.recipeId,window._studio.volume)]=t.build(window._studio.recipeId);
  window._studio.selId=null;renderLabelStudio();toast('✦ '+t.label+' template applied');
}
// ── Saved layouts (the user's own reusable templates) ──────────────────────
function labelLayoutStore(){if(!APP.settings)APP.settings={};if(!APP.settings.labelLayouts)APP.settings.labelLayouts=[];return APP.settings.labelLayouts;}
function studioLayoutsHtml(){
  var list=labelLayoutStore();
  var hdr='<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin:14px 0 8px">MY LAYOUTS</div>';
  var chips=list.map(function(l){
    return '<span style="display:inline-flex;align-items:center;margin:0 6px 6px 0;border:1px solid var(--border);border-radius:6px;overflow:hidden">'
      +'<button class="btn btn-secondary btn-sm" style="border:none;margin:0" onclick="studioApplyLayout(\''+l.id+'\')" title="Apply this saved layout to the current label">'+escHtml(l.name||'Layout')+'</button>'
      +'<button class="btn btn-secondary btn-sm" style="border:none;margin:0;padding:4px 7px;color:#cc8a7a" onclick="studioDeleteLayout(\''+l.id+'\')" title="Delete this saved layout">✕</button>'
      +'</span>';
  }).join('');
  return hdr
    +(chips?'<div style="display:flex;flex-wrap:wrap">'+chips+'</div>':'<div style="font-size:10.5px;color:var(--text3);font-style:italic;margin-bottom:6px">Save the current element layout to reuse it identically on other labels.</div>')
    +'<button class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:6px" onclick="studioSaveLayout()">💾 Save current layout</button>';
}
function studioSaveLayout(){
  var name=prompt('Name this layout (e.g. "750 ml classic"):');
  if(!name||!name.trim())return;
  var d=studioDesign();
  var copy=JSON.parse(JSON.stringify({w:d.w,h:d.h,front:d.front,back:d.back,backEnabled:d.backEnabled}));
  copy.id='ly'+Date.now().toString(36)+Math.round(performance.now());copy.name=name.trim();
  labelLayoutStore().push(copy);renderLabelStudio();labelStudioSave();toast('💾 Layout "'+copy.name+'" saved');
}
function studioApplyLayout(id){
  var ly=labelLayoutStore().filter(function(l){return l.id===id;})[0];if(!ly)return;
  if(typeof confirm==='function'&&!confirm('Apply layout "'+(ly.name||'')+'"? It replaces the current design on both sides.'))return;
  var d=studioDesign(),c=JSON.parse(JSON.stringify(ly));
  d.w=c.w;d.h=c.h;d.front=c.front;d.back=c.back;d.backEnabled=c.backEnabled;
  window._studio.selId=null;renderLabelStudio();labelStudioSave();toast('✓ Layout applied');
}
function studioDeleteLayout(id){
  if(typeof confirm==='function'&&!confirm('Delete this saved layout?'))return;
  APP.settings.labelLayouts=labelLayoutStore().filter(function(l){return l.id!==id;});
  renderLabelStudio();labelStudioSave();toast('Layout deleted');
}
// Upload a finished label image as the background, then give a couple of
// number-only live-data fields to drag onto its blank boxes.
function studioUploadOwn(){
  studioPickImage(function(dataUrl){
    var d=studioDesign(),s=studioSide();
    // Store the uploaded art as a /labels/ asset (a tiny URL) instead of a
    // multi-MB data URL in the state blob. Show it instantly, then swap to the
    // ref once the server has it (per-volume variants then clone just the URL).
    if(typeof storeImageAsset==='function')storeImageAsset(dataUrl,'labels').then(function(ref){if(ref&&ref!==dataUrl&&studioSide().bgImage===dataUrl){studioSide().bgImage=ref;if(document.getElementById('studio-modal'))renderLabelStudio();}});
    function apply(w,h){
      d.w=w;d.h=h;
      s.bgImage=dataUrl;s.shape='rect';delete s.border;delete s.honeycomb;delete s.bg;
      // Clear the template's elements so they don't sit over the uploaded art;
      // leave two number-only live fields to drop onto its blank boxes.
      s.elements=[
        {id:studioGenId(),type:'field',field:'serial',raw:true,x:Math.round(w*0.12),y:Math.round(h*0.80),w:Math.round(w*0.34),h:24,font:'Mono',size:Math.max(11,Math.round(h*0.032)),color:'#ffffff',align:'center'},
        {id:studioGenId(),type:'field',field:'abv',raw:true,x:Math.round(w*0.56),y:Math.round(h*0.80),w:Math.round(w*0.32),h:24,font:'Mono',size:Math.max(11,Math.round(h*0.032)),color:'#ffffff',align:'center'}
      ];
      window._studio.selId=null;renderLabelStudio();
      toast('📤 Design loaded — drag the batch № / % vol fields onto its blanks');
    }
    // Size the canvas to the image's aspect ratio so nothing is cropped.
    var img=new Image();
    img.onload=function(){
      var iw=img.naturalWidth||img.width||340,ih=img.naturalHeight||img.height||440;
      var scale=Math.min(460/Math.max(iw,ih),2);
      apply(Math.max(140,Math.round(iw*scale)),Math.max(140,Math.round(ih*scale)));
    };
    img.onerror=function(){apply(d.w,d.h);};
    img.src=dataUrl;
  });
}
function studioGenId(){return 'el'+(Date.now().toString(36))+Math.floor(performance.now()%1000);}
// One-time self-heal: convert any embedded label-design images (data: URLs) into
// /assets/ references so they stop bloating the saved state. Per-volume variants
// and saved layouts that cloned the same image collapse onto a shared reference.
// Idempotent — runs on load, does nothing once everything is a reference.
async function migrateLabelStudioImages(){
  if(APP._shareMode||typeof storeImageAsset!=='function')return;
  var store=(APP.settings&&APP.settings.labelStudio)||{},cache={},changed=0;
  async function ref(u){
    if(typeof u!=='string'||u.indexOf('data:image')!==0)return u;
    if(cache[u])return cache[u];
    var r=await storeImageAsset(u,'labels');
    if(r&&r!==u){cache[u]=r;changed++;return r;}
    return u;
  }
  async function fixSide(s){
    if(!s)return;
    if(typeof s.bgImage==='string'&&s.bgImage.indexOf('data:image')===0)s.bgImage=await ref(s.bgImage);
    if(Array.isArray(s.elements))for(var i=0;i<s.elements.length;i++){var el=s.elements[i];if(el&&typeof el.src==='string'&&el.src.indexOf('data:image')===0)el.src=await ref(el.src);}
  }
  var designs=[];
  Object.keys(store).forEach(function(k){designs.push(store[k]);});
  if(Array.isArray(APP.settings.labelLayouts))APP.settings.labelLayouts.forEach(function(l){designs.push(l);});
  for(var j=0;j<designs.length;j++){var d=designs[j];if(d){await fixSide(d.front);await fixSide(d.back);}}
  if(changed){if(typeof scheduleSave==='function')scheduleSave();if(typeof toast==='function')toast('🗜 Optimised '+changed+' label image'+(changed!==1?'s':'')+' → saved as references');}
}
function studioAdd(kind){
  var s=studioSide(),d=studioDesign(),el;
  var cx=Math.round(d.w/2-60),cy=Math.round(d.h/2-16);
  if(kind==='text')el={id:studioGenId(),type:'text',text:'New text',x:cx,y:cy,w:120,h:30,font:'Crimson',size:16,color:'#e8e0d0',align:'center'};
  else if(kind==='rect')el={id:studioGenId(),type:'shape',kind:'rect',x:cx,y:cy,w:120,h:60,fill:'none',stroke:'#c9a84c',strokeW:1.5,radius:6};
  else if(kind==='line')el={id:studioGenId(),type:'shape',kind:'line',x:cx,y:cy+16,w:120,h:0,stroke:'#c9a84c',strokeW:1};
  else if(kind==='logo')el={id:studioGenId(),type:'logo',x:cx,y:cy-20,w:80,h:80};
  else if(kind==='qr')el={id:studioGenId(),type:'field',field:'qr',x:cx,y:cy-20,w:80,h:80};
  else if(kind==='sweetscale')el={id:studioGenId(),type:'sweetscale',x:Math.round(d.w/2-90),y:cy,w:180,h:24,font:'Mono',size:8,color:'#c9a84c'};
  else if(kind==='honeycomb')el={id:studioGenId(),type:'honeycomb',x:cx,y:cy-30,w:120,h:90,color:'#c9a84c',opacity:0.5,size:12,radius:8};
  else if(kind==='honeydrop')el={id:studioGenId(),type:'honeydrop',x:Math.round(d.w/2-9),y:cy-10,w:18,h:24,color:'#e0b84e'};
  if(!el)return;
  s.elements.push(el);window._studio.selId=el.id;renderLabelStudio();
}
function studioAddField(){
  var pick=document.getElementById('studio-field-pick');var val=pick?pick.value:'name';
  var raw=false;if(val.indexOf(':raw')>=0){raw=true;val=val.replace(':raw','');}
  var f=val,s=studioSide(),d=studioDesign();
  var multi=(f==='ingredients'||f==='allergens'||f==='tasting');
  var el={id:studioGenId(),type:'field',field:f,x:24,y:Math.round(d.h/2-20),w:d.w-48,h:multi?90:30,font:f==='name'?'Cinzel':'Crimson',size:f==='name'?24:(multi?12:14),color:'#e8c878',align:'center',italic:f==='tasting'};
  if(raw)el.raw=true;
  if(f==='custom'){el.text='Custom text';el.color='#e8e0d0';}
  s.elements.push(el);window._studio.selId=el.id;renderLabelStudio();
}
function studioAddImage(){studioPickImage(function(dataUrl){var s=studioSide(),d=studioDesign();var el={id:studioGenId(),type:'image',src:dataUrl,x:Math.round(d.w/2-60),y:Math.round(d.h/2-60),w:120,h:120};s.elements.push(el);window._studio.selId=el.id;renderLabelStudio();if(typeof storeImageAsset==='function')storeImageAsset(dataUrl,'labels').then(function(ref){if(ref&&ref!==dataUrl&&el.src===dataUrl){el.src=ref;if(document.getElementById('studio-modal'))renderLabelStudio();}});});}
function studioBgImage(){studioPickImage(function(dataUrl){var s=studioSide();s.bgImage=dataUrl;renderLabelStudio();if(typeof storeImageAsset==='function')storeImageAsset(dataUrl,'labels').then(function(ref){if(ref&&ref!==dataUrl&&s.bgImage===dataUrl){s.bgImage=ref;if(document.getElementById('studio-modal'))renderLabelStudio();}});});}
function studioPickImage(cb){
  // The input must be in the DOM or its change event won't fire in some browsers
  // (Safari especially) — that's why uploads silently did nothing.
  var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
  inp.style.position='fixed';inp.style.left='-9999px';inp.style.opacity='0';
  document.body.appendChild(inp);
  inp.onchange=function(){
    var f=inp.files&&inp.files[0];
    if(f){var rd=new FileReader();rd.onload=function(){cb(rd.result);};rd.onerror=function(){toast('⚠ Could not read image');};rd.readAsDataURL(f);}
    setTimeout(function(){if(inp.parentNode)inp.parentNode.removeChild(inp);},0);
  };
  inp.click();
}
function studioUpd(prop,val){var el=studioSelEl();if(!el)return;el[prop]=val;studioRefreshCanvas();}
function studioToggle(prop,on,off){var el=studioSelEl();if(!el)return;el[prop]=(el[prop]===on)?off:on;renderLabelStudio();}
function studioDelete(){var s=studioSide();s.elements=(s.elements||[]).filter(function(e){return e.id!==window._studio.selId;});window._studio.selId=null;renderLabelStudio();}
function studioOrder(dir){
  var s=studioSide(),els=s.elements,i=els.findIndex(function(e){return e.id===window._studio.selId;});
  if(i<0)return;var j=i+dir;if(j<0||j>=els.length)return;var t=els[i];els[i]=els[j];els[j]=t;renderLabelStudio();
}
function studioSelect(id){window._studio.selId=id;document.getElementById('studio-props').innerHTML=studioPropsHtml();studioRefreshCanvas();}

// ── Pointer drag (event-delegated on the stable wrapper) ───────────────────
function studioPointerDown(ev){
  var svg=document.getElementById('studio-canvas');if(!svg)return;
  var g=ev.target.closest&&ev.target.closest('[data-el-id]');
  if(!g){studioSelect(null);return;}
  var id=g.getAttribute('data-el-id');
  // Capture geometry from the CURRENT (live) svg BEFORE studioSelect re-renders it
  // — otherwise getBoundingClientRect on the detached node returns 0 and the scale
  // becomes Infinity, flinging the element off the canvas.
  var rect=svg.getBoundingClientRect(),d=studioDesign();
  var scaleX=d.w/(rect.width||d.w), scaleY=d.h/(rect.height||d.h);
  studioSelect(id);
  var el=studioSelEl();if(!el)return;
  var startX=ev.clientX,startY=ev.clientY,ox=el.x,oy=el.y,moved=false,raf=0;
  function mv(e){
    moved=true;
    el.x=Math.round(ox+(e.clientX-startX)*scaleX);
    el.y=Math.round(oy+(e.clientY-startY)*scaleY);
    if(!raf)raf=requestAnimationFrame(function(){raf=0;studioRefreshCanvas();});
  }
  function up(){
    document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);
    if(raf){cancelAnimationFrame(raf);studioRefreshCanvas();}
    var p=document.getElementById('studio-props');if(p)p.innerHTML=studioPropsHtml();
  }
  document.addEventListener('pointermove',mv);
  document.addEventListener('pointerup',up);
  ev.preventDefault();
}

// ── Export ──────────────────────────────────────────────────────────────────
function exportLabelStudioPNG(){
  var d=studioDesign(),side=studioSide(),ctx=studioCtx();
  var svg=studioRenderSide(side,d.w,d.h,ctx,{idSuffix:'exp'});
  studioRasterize(svg,d.w,d.h,3,function(blob){
    if(!blob){toast('⚠ Could not encode PNG');return;}
    var name=((ctx.batch&&ctx.batch.name)||ctx.recipe.name||'mead').replace(/[^\w-]+/g,'_')+'-label-'+window._studio.side+'.png';
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},120);
    toast('✦ Label PNG saved');
  });
}
// Inline any remote <image href> to data URLs so the canvas isn't tainted, then rasterize.
function studioRasterize(svgStr,W,H,scale,cb){
  var hrefs=(svgStr.match(/href="([^"]+)"/g)||[]).map(function(m){return m.slice(6,-1);}).filter(function(u){return u&&!/^data:/i.test(u);});
  var uniq=hrefs.filter(function(u,i){return hrefs.indexOf(u)===i;});
  function go(s){
    var img=new Image();
    // s is already a complete <svg … xmlns=…> string — encode as-is (don't add a
    // second xmlns; a duplicate attribute makes the SVG fail to parse → blank PNG).
    var svgUrl='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(s)));
    img.onload=function(){
      var c=document.createElement('canvas');c.width=W*scale;c.height=H*scale;
      var cx=c.getContext('2d');cx.drawImage(img,0,0,c.width,c.height);
      c.toBlob(cb,'image/png');
    };
    img.onerror=function(){cb(null);};
    img.src=svgUrl;
  }
  if(!uniq.length){go(svgStr);return;}
  var map={},done=0;
  uniq.forEach(function(u){
    fetch(u).then(function(r){return r.blob();}).then(function(b){var rd=new FileReader();rd.onload=function(){map[u]=rd.result;if(++done===uniq.length)finish();};rd.onerror=function(){map[u]=u;if(++done===uniq.length)finish();};rd.readAsDataURL(b);}).catch(function(){map[u]=u;if(++done===uniq.length)finish();});
  });
  function finish(){var s=svgStr;Object.keys(map).forEach(function(u){s=s.split('href="'+u+'"').join('href="'+map[u]+'"');});go(s);}
}
function printLabelStudio(){
  var d=studioDesign(),ctx=studioCtx();
  var f=studioRenderSide(d.front,d.w,d.h,ctx,{idSuffix:'pf',style:'border:1px solid #ccc'});
  var b=(d.backEnabled!==false)?studioRenderSide(d.back,d.w,d.h,ctx,{idSuffix:'pb',style:'border:1px solid #ccc'}):'';
  var w=window.open('','_blank','width=900,height=900');if(!w){toast('⚠ Popup blocked');return;}
  w.document.write('<!DOCTYPE html><html><head><title>Labels</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=Crimson+Pro:ital@0;1&family=JetBrains+Mono&display=swap" rel="stylesheet">'
    +'<style>body{margin:0;display:flex;flex-wrap:wrap;gap:14mm;justify-content:center;align-items:flex-start;padding:14mm;background:#fff}svg{height:auto}@media print{body{padding:0}}</style></head><body>'+f+b+'</body></html>');
  w.document.close();setTimeout(function(){try{w.print();}catch(e){}},600);
}
