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
var LABEL_SHAPES=[
  {key:'rect',label:'Rectangle'},
  {key:'round',label:'Rounded'},
  {key:'ellipse',label:'Oval'},
  {key:'arch',label:'Arch top'},
  {key:'pointed',label:'Crest'}
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
  {key:'style',label:'Style'},
  {key:'abv',label:'ABV %'},
  {key:'tasting',label:'Tasting note (honey-based)'},
  {key:'ingredients',label:'Ingredients'},
  {key:'allergens',label:'Allergens & dietary'},
  {key:'bottled',label:'Bottled date'},
  {key:'window',label:'Best-drink-between dates'},
  {key:'volume',label:'Volume'},
  {key:'serial',label:'Batch №'},
  {key:'brewer',label:'Brewer'},
  {key:'custom',label:'Custom text'}
];

// ── Storage ──────────────────────────────────────────────────────────────
function labelStudioStore(){if(!APP.settings)APP.settings={};if(!APP.settings.labelStudio)APP.settings.labelStudio={};return APP.settings.labelStudio;}
function labelStudioGet(recipeId){
  var s=labelStudioStore();
  if(!s[recipeId])s[recipeId]=labelStudioDefault(recipeId);
  return s[recipeId];
}
function labelStudioDefault(recipeId){
  var r=(APP.recipes||[]).find(function(x){return x.id===recipeId;})||{};
  var accent=r.brandColor||'#c9a84c';
  // A genuinely premium starting design — dark card, gold name, divider, ABV,
  // a tasting line and a bottled line on the FRONT; ingredients + allergens BACK.
  var front={shape:'round',bg:'#17110a',bgImage:null,border:accent,elements:[
    {id:'e1',type:'shape',kind:'rect',x:16,y:16,w:308,h:408,fill:'none',stroke:accent,strokeW:1.5,radius:10},
    {id:'e2',type:'field',field:'style',x:30,y:42,w:280,h:22,font:'Mono',size:11,color:'#9a8a66',align:'center',weight:'400',spacing:3,upper:true},
    {id:'e3',type:'field',field:'name',x:24,y:74,w:292,h:96,font:'Cinzel',size:30,color:'#e8c878',align:'center',weight:'700',lh:1.05},
    {id:'e4',type:'shape',kind:'line',x:120,y:182,w:100,h:0,stroke:accent,strokeW:1},
    {id:'e5',type:'field',field:'tasting',x:34,y:200,w:272,h:120,font:'Crimson',size:13,color:'#d8cbb0',align:'center',italic:true,lh:1.4},
    {id:'e6',type:'field',field:'abv',x:24,y:330,w:292,h:40,font:'Cinzel',size:26,color:'#e8c878',align:'center',weight:'700'},
    {id:'e7',type:'field',field:'bottled',x:24,y:392,w:292,h:18,font:'Mono',size:9,color:'#8a7a58',align:'center',spacing:1}
  ]};
  var back={shape:'round',bg:'#17110a',bgImage:null,border:accent,elements:[
    {id:'b1',type:'field',field:'name',x:24,y:36,w:292,h:30,font:'Cinzel',size:16,color:'#e8c878',align:'center',weight:'700'},
    {id:'b2',type:'text',text:'INGREDIENTS',x:30,y:78,w:280,h:18,font:'Mono',size:10,color:'#9a8a66',align:'left',spacing:2},
    {id:'b3',type:'field',field:'ingredients',x:30,y:98,w:280,h:120,font:'Crimson',size:12,color:'#d8cbb0',align:'left',lh:1.45},
    {id:'b4',type:'field',field:'allergens',x:30,y:240,w:280,h:90,font:'Crimson',size:11,color:'#c9b894',align:'left',italic:true,lh:1.4},
    {id:'b5',type:'field',field:'window',x:24,y:360,w:292,h:20,font:'Mono',size:9,color:'#8a7a58',align:'center',spacing:1},
    {id:'b6',type:'field',field:'serial',x:24,y:404,w:292,h:16,font:'Mono',size:8,color:'#6a5d44',align:'center',spacing:1}
  ]};
  return {w:340,h:440,front:front,back:back};
}
function labelStudioSave(){scheduleSave();}

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
  var sweet=(bot&&bot.sweetness)||labelStudioSweetGuess(r);
  var style=(r.style||'mead').toLowerCase();
  var lead=recipeFlavorLead(r),leadLow=lead?lead.toLowerCase():'';
  if(leadLow&&style.indexOf(leadLow)>=0)leadLow='';          // avoid "melomel melomel"
  var desc=(sweet?sweet.toLowerCase()+' ':'')+(leadLow?leadLow+' ':'')+style;
  var art=/^[aeiou]/i.test(desc)?'An':'A';
  var s=art+' '+desc;
  if(hp&&hp.profile){
    s+=' on '+honey+' honey — '+lcFirst(firstSentence(hp.profile));
  }else if(honey){
    s+=' built on '+honey+' honey.';
  }else if(r.description){
    s+=' — '+lcFirst(firstSentence(r.description));
  }else s+='.';
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
function labelStudioIngredients(ctx){
  var r=ctx.recipe||{},b=ctx.batch;
  var names=[];
  (r.ingredients||[]).forEach(function(i){var n=(i.item||'').trim();if(!n)return;if(/yeast nutrient|nutrient$/i.test(n))return;names.push(n);});
  // batch additions
  if(b&&APP.additions&&APP.additions[b.id])APP.additions[b.id].forEach(function(a){if(a.item)names.push(a.item);});
  // reflect actual honey variety
  if(ctx.honey)names=names.map(function(n){return /honey/i.test(n)&&n.toLowerCase().indexOf(ctx.honey.toLowerCase())<0?ctx.honey+' honey':n;});
  // dedupe
  var seen={},out=[];names.forEach(function(n){var k=n.toLowerCase();if(!seen[k]){seen[k]=1;out.push(n);}});
  return out.join(', ')+'.';
}
function labelStudioAllergens(ctx){
  var r=ctx.recipe||{},b=ctx.batch||{id:'_'};
  var d=(typeof shareDietaryData==='function')?shareDietaryData(b,r):{contains:[],sulfites:false,gluten:false};
  var bits=[];
  bits.push(d.gluten?'Contains gluten':'Gluten-free');
  (d.contains||[]).forEach(function(c){bits.push('Contains '+c.k);});
  if(d.sulfites)bits.push('Contains sulfites');
  bits.push('Vegetarian · contains honey (not vegan)');
  return bits.join(' · ')+'. Contains alcohol.';
}
function labelStudioBottled(ctx){
  var bot=ctx.bot;if(!bot||!bot.date)return 'Bottled —';
  var d=new Date(bot.date);if(isNaN(d.getTime()))return 'Bottled —';
  var M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return 'Bottled '+M[d.getMonth()]+' '+d.getFullYear();
}
function labelStudioWindow(ctx){
  var bot=ctx.bot,r=ctx.recipe||{};
  var M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var minD=r.minAgeDays||30,maxD=r.maxAgeDays||(r.peakAgeDays?r.peakAgeDays*2:365);
  if(bot&&bot.date){
    var d=new Date(bot.date);
    if(!isNaN(d.getTime())){
      var a=new Date(d.getTime()+minD*86400000),b=new Date(d.getTime()+maxD*86400000);
      return 'Best between '+M[a.getMonth()]+' '+a.getFullYear()+' – '+M[b.getMonth()]+' '+b.getFullYear();
    }
  }
  // No bottling date yet (e.g. designing from the recipe) — show it relatively.
  var fc=(typeof fmtDurationCompact==='function')?fmtDurationCompact:function(x){return Math.round(x/30)+'mo';};
  return 'Best '+fc(minD)+' – '+fc(maxD)+' after bottling';
}
// Resolve a field key → display string.
function labelFieldValue(field,el,ctx){
  switch(field){
    case'name':return (ctx.batch&&ctx.batch.name)||ctx.recipe.name||'Your Mead';
    case'style':return ctx.recipe.style||'Mead';
    case'abv':var a=labelStudioAbv(ctx);return a?(a+'% ABV'):'';
    case'tasting':return meadTastingSummary(ctx);
    case'ingredients':return labelStudioIngredients(ctx);
    case'allergens':return labelStudioAllergens(ctx);
    case'bottled':return labelStudioBottled(ctx);
    case'window':return labelStudioWindow(ctx);
    case'volume':return ctx.batch&&ctx.batch.volume?(typeof fmtVol==='function'?fmtVol(ctx.batch.volume):ctx.batch.volume+' L'):'';
    case'serial':return ctx.batch&&ctx.batch.serial?'№ '+ctx.batch.serial:'';
    case'brewer':return (APP.settings&&(APP.settings.brewerName||APP.settings.brandName))||'';
    case'custom':return el.text||'Custom text';
    default:return '';
  }
}

// ── SVG rendering ──────────────────────────────────────────────────────────
function studioShapePath(shape,w,h){
  switch(shape){
    case'ellipse':return '<ellipse cx="'+(w/2)+'" cy="'+(h/2)+'" rx="'+(w/2)+'" ry="'+(h/2)+'"/>';
    case'round':return '<rect x="0" y="0" width="'+w+'" height="'+h+'" rx="22" ry="22"/>';
    case'arch':return '<path d="M0 '+w*0.55+' Q0 0 '+w/2+' 0 Q'+w+' 0 '+w+' '+w*0.55+' L'+w+' '+h+' L0 '+h+' Z"/>';
    case'pointed':return '<path d="M0 0 L'+w+' 0 L'+w+' '+(h-26)+' L'+(w/2)+' '+h+' L0 '+(h-26)+' Z"/>';
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
  if(el.type==='text')return studioTextEl(el,el.text||'');
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
// Render one side (front/back) to an SVG string.
function studioRenderSide(side,W,H,ctx,opts){
  opts=opts||{};
  var clipId='lsclip-'+(opts.idSuffix||'x');
  var bg=side.bg||'#ffffff';
  var parts='<defs><clipPath id="'+clipId+'">'+studioShapePath(side.shape||'rect',W,H)+'</clipPath></defs>';
  parts+='<g clip-path="url(#'+clipId+')">';
  parts+=studioShapePath(side.shape||'rect',W,H).replace('<rect','<rect fill="'+bg+'"').replace('<ellipse','<ellipse fill="'+bg+'"').replace('<path','<path fill="'+bg+'"');
  if(side.bgImage)parts+='<image href="'+escHtml(side.bgImage)+'" x="0" y="0" width="'+W+'" height="'+H+'" preserveAspectRatio="xMidYMid slice"/>';
  (side.elements||[]).forEach(function(el){
    parts+='<g data-el-id="'+el.id+'" style="cursor:'+(opts.interactive?'move':'default')+'">'+studioRenderElement(el,ctx)+'</g>';
    if(opts.selId===el.id){
      parts+='<rect x="'+(el.x-3)+'" y="'+(el.y-3)+'" width="'+(el.w+6)+'" height="'+((el.h||2)+6)+'" fill="none" stroke="#5aa0ff" stroke-width="1.5" stroke-dasharray="4 3" pointer-events="none"/>';
    }
  });
  parts+='</g>';
  if(side.border)parts+=studioShapePath(side.shape||'rect',W,H).replace(/<(rect|ellipse|path)/,'<$1 fill="none" stroke="'+side.border+'" stroke-width="2"');
  return '<svg id="'+(opts.svgId||'studio-svg')+'" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" style="'+(opts.style||'')+'">'+parts+'</svg>';
}

// ── Editor ──────────────────────────────────────────────────────────────────
function openLabelStudio(recipeId,batchId){
  closeModal();
  window._studio={recipeId:recipeId,batchId:batchId||null,side:'front',selId:null};
  document.body.insertAdjacentHTML('beforeend','<div class="modal-overlay modal-static" id="studio-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" id="studio-modal" style="max-width:1120px;width:96vw;max-height:94vh;display:flex;flex-direction:column;padding:0;overflow:hidden"></div></div>');
  renderLabelStudio();
}
function studioDesign(){return labelStudioGet(window._studio.recipeId);}
function studioSide(){var d=studioDesign();return d[window._studio.side];}
function studioCtx(){return labelStudioCtx(window._studio.recipeId,window._studio.batchId);}
function studioSelEl(){var s=studioSide();return (s.elements||[]).filter(function(e){return e.id===window._studio.selId;})[0]||null;}

function renderLabelStudio(){
  var modal=document.getElementById('studio-modal');if(!modal)return;
  var d=studioDesign(),st=window._studio;
  modal.innerHTML=
    // Top bar
    '<div style="display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<div class="modal-title" style="margin:0">🎨 Label Studio</div>'
      +'<div style="display:flex;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">'
        +['front','back'].map(function(sd){var on=st.side===sd;return '<button onclick="studioSetSide(\''+sd+'\')" style="padding:6px 16px;border:none;cursor:pointer;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;background:'+(on?'var(--gold)':'var(--bg2)')+';color:'+(on?'#000':'var(--text2)')+'">'+sd+'</button>';}).join('')+'</div>'
      +'<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">'
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
  function sect(t){return '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin:4px 0 8px">'+t+'</div>';}
  var addBtn=function(label,onclick){return '<button class="btn btn-secondary btn-sm" style="width:100%;justify-content:flex-start;margin-bottom:6px" onclick="'+onclick+'">'+label+'</button>';};
  var fieldOpts=LABEL_FIELDS.map(function(f){return '<option value="'+f.key+'">'+escHtml(f.label)+'</option>';}).join('');
  return sect('ADD ELEMENT')
    +addBtn('＋ Text',"studioAdd('text')")
    +addBtn('＋ Rectangle',"studioAdd('rect')")
    +addBtn('＋ Line',"studioAdd('line')")
    +addBtn('＋ Brand logo',"studioAdd('logo')")
    +addBtn('＋ Image…',"studioAddImage()")
    +addBtn('＋ QR code',"studioAdd('qr')")
    +'<div style="display:flex;gap:6px;margin-bottom:10px"><select id="studio-field-pick" class="form-input" style="flex:1;font-size:12px">'+fieldOpts+'</select><button class="btn btn-primary btn-sm" onclick="studioAddField()">＋</button></div>'
    +sect('CANVAS')
    +'<label class="form-label">Shape</label><select class="form-input" onchange="studioSetCanvas(\'shape\',this.value)" style="margin-bottom:8px">'+LABEL_SHAPES.map(function(s){return '<option value="'+s.key+'"'+(studioSide().shape===s.key?' selected':'')+'>'+s.label+'</option>';}).join('')+'</select>'
    +'<label class="form-label">Size</label><select class="form-input" onchange="studioSetSize(this.value)" style="margin-bottom:8px">'+LABEL_SIZES.map(function(s){return '<option value="'+s.key+'"'+(d.w===s.w&&d.h===s.h?' selected':'')+'>'+s.label+' ('+s.w+'×'+s.h+')</option>';}).join('')+'</select>'
    +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Background</label><input type="color" value="'+(studioSide().bg||'#17110a')+'" oninput="studioSetCanvas(\'bg\',this.value)" style="width:38px;height:26px;padding:0;border:1px solid var(--border);border-radius:4px;background:none"></div>'
    +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Border</label><input type="color" value="'+(studioSide().border||'#c9a84c')+'" oninput="studioSetCanvas(\'border\',this.value)" style="width:38px;height:26px;padding:0;border:1px solid var(--border);border-radius:4px;background:none"><button class="btn btn-secondary btn-sm" onclick="studioSetCanvas(\'border\',null)">none</button></div>'
    +'<button class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:6px" onclick="studioBgImage()">Background image…</button>'
    +(studioSide().bgImage?'<button class="btn btn-secondary btn-sm" style="width:100%" onclick="studioSetCanvas(\'bgImage\',null)">Remove bg image</button>':'');
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
  if(el.type==='text'||el.type==='field'){
    row('Font','<select class="form-input" onchange="studioUpd(\'font\',this.value)">'+LABEL_FONTS.map(function(f){return '<option value="'+f.key+'"'+(el.font===f.key?' selected':'')+'>'+f.label+'</option>';}).join('')+'</select>');
    row('Size / colour','<div style="display:flex;gap:8px"><input type="number" class="form-input" style="flex:1" value="'+(el.size||13)+'" min="6" max="64" oninput="studioUpd(\'size\',parseFloat(this.value))"><input type="color" value="'+(el.color||'#e8e0d0')+'" oninput="studioUpd(\'color\',this.value)" style="width:38px;height:36px;padding:0;border:1px solid var(--border);border-radius:4px"></div>');
    row('Align','<div style="display:flex;gap:6px">'+['left','center','right'].map(function(a){return '<button class="btn '+(el.align===a?'btn-primary':'btn-secondary')+' btn-sm" style="flex:1" onclick="studioUpd(\'align\',\''+a+'\')">'+a+'</button>';}).join('')+'</div>');
    row('Style','<div style="display:flex;gap:6px"><button class="btn '+(el.weight==='700'?'btn-primary':'btn-secondary')+' btn-sm" style="flex:1" onclick="studioToggle(\'weight\',\'700\',\'400\')">Bold</button><button class="btn '+(el.italic?'btn-primary':'btn-secondary')+' btn-sm" style="flex:1" onclick="studioToggle(\'italic\',true,false)">Italic</button><button class="btn '+(el.upper?'btn-primary':'btn-secondary')+' btn-sm" style="flex:1" onclick="studioToggle(\'upper\',true,false)">CAPS</button></div>');
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
function studioSetSize(key){var s=LABEL_SIZES.filter(function(x){return x.key===key;})[0];if(!s)return;var d=studioDesign();d.w=s.w;d.h=s.h;renderLabelStudio();}
function studioSetCanvas(prop,val){var s=studioSide();if(val===null)delete s[prop];else s[prop]=val;renderLabelStudio();}
function studioGenId(){return 'el'+(Date.now().toString(36))+Math.floor(performance.now()%1000);}
function studioAdd(kind){
  var s=studioSide(),d=studioDesign(),el;
  var cx=Math.round(d.w/2-60),cy=Math.round(d.h/2-16);
  if(kind==='text')el={id:studioGenId(),type:'text',text:'New text',x:cx,y:cy,w:120,h:30,font:'Crimson',size:16,color:'#e8e0d0',align:'center'};
  else if(kind==='rect')el={id:studioGenId(),type:'shape',kind:'rect',x:cx,y:cy,w:120,h:60,fill:'none',stroke:'#c9a84c',strokeW:1.5,radius:6};
  else if(kind==='line')el={id:studioGenId(),type:'shape',kind:'line',x:cx,y:cy+16,w:120,h:0,stroke:'#c9a84c',strokeW:1};
  else if(kind==='logo')el={id:studioGenId(),type:'logo',x:cx,y:cy-20,w:80,h:80};
  else if(kind==='qr')el={id:studioGenId(),type:'field',field:'qr',x:cx,y:cy-20,w:80,h:80};
  if(!el)return;
  s.elements.push(el);window._studio.selId=el.id;renderLabelStudio();
}
function studioAddField(){
  var pick=document.getElementById('studio-field-pick');var f=pick?pick.value:'name';
  var s=studioSide(),d=studioDesign();
  var multi=(f==='ingredients'||f==='allergens'||f==='tasting');
  var el={id:studioGenId(),type:'field',field:f,x:24,y:Math.round(d.h/2-20),w:d.w-48,h:multi?90:30,font:f==='name'?'Cinzel':'Crimson',size:f==='name'?24:(multi?12:14),color:'#e8c878',align:'center',italic:f==='tasting'};
  if(f==='custom'){el.text='Custom text';el.color='#e8e0d0';}
  s.elements.push(el);window._studio.selId=el.id;renderLabelStudio();
}
function studioAddImage(){studioPickImage(function(dataUrl){var s=studioSide(),d=studioDesign();s.elements.push({id:studioGenId(),type:'image',src:dataUrl,x:Math.round(d.w/2-60),y:Math.round(d.h/2-60),w:120,h:120});window._studio.selId=s.elements[s.elements.length-1].id;renderLabelStudio();});}
function studioBgImage(){studioPickImage(function(dataUrl){studioSide().bgImage=dataUrl;renderLabelStudio();});}
function studioPickImage(cb){
  var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
  inp.onchange=function(){var f=inp.files&&inp.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){cb(rd.result);};rd.readAsDataURL(f);};
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
  var b=studioRenderSide(d.back,d.w,d.h,ctx,{idSuffix:'pb',style:'border:1px solid #ccc'});
  var w=window.open('','_blank','width=900,height=900');if(!w){toast('⚠ Popup blocked');return;}
  w.document.write('<!DOCTYPE html><html><head><title>Labels</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=Crimson+Pro:ital@0;1&family=JetBrains+Mono&display=swap" rel="stylesheet">'
    +'<style>body{margin:0;display:flex;flex-wrap:wrap;gap:14mm;justify-content:center;align-items:flex-start;padding:14mm;background:#fff}svg{height:auto}@media print{body{padding:0}}</style></head><body>'+f+b+'</body></html>');
  w.document.close();setTimeout(function(){try{w.print();}catch(e){}},600);
}
