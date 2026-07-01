// ==========================================================================
// Recipe PDF export, gift-card mode, 3D bottle preview, fermenter card (print).
// Split out of the former 13-labels-share.js. Globals, no behaviour change.
// ==========================================================================

// ==================== RECIPE PDF EXPORT ====================
// Uses browser's print dialog (saves as PDF). One-page formatted recipe card
// with brand crest, ingredients table, step timeline, and target stats.
function exportRecipePDF(recipeId){
  var r=APP.recipes.find(function(x){return x.id===recipeId;});
  if(!r){toast('⚠ Recipe not found');return;}
  var brand=APP.settings.brewerName||'MeadOS';
  // Steps timeline. Recipes use r.steps with {day, title, desc} — NOT r.schedule.
  var steps=(r.steps||r.schedule||[]).slice().sort(function(a,b){return(a.day||0)-(b.day||0);});
  var stepsHtml=steps.map(function(s){
    var title=s.title||s.task||'';
    var desc=s.desc||s.detail||'';
    return'<tr><td class="day">Day '+(s.day||0)+'</td><td class="task"><div style="font-weight:600">'+escHtml(title)+'</div>'+(desc?'<div class="detail">'+escHtml(desc)+'</div>':'')+'</td></tr>';
  }).join('');
  var ingHtml=r.ingredients.map(function(i){
    return'<tr><td class="ing">'+escHtml(i.item)+'</td><td class="amt">'+escHtml(i.amount)+'</td><td class="notes">'+escHtml(i.notes||'')+'</td></tr>';
  }).join('');
  var w=window.open('','_blank','width=850,height=1100');
  if(!w){toast('⚠ Popup blocked');return;}
  var css='@page{size:A4;margin:14mm 12mm}body{margin:0;padding:0;font-family:"EB Garamond",Georgia,serif;color:#2a1810;background:#fbf6e8;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'.page{max-width:186mm;margin:0 auto;padding:0}'
    +'.header{text-align:center;border-bottom:2px solid var(--gold);padding-bottom:10mm;margin-bottom:8mm}'
    +'.brand{font-family:"Cinzel",serif;font-size:14pt;color:#8a6a30;letter-spacing:4px;margin-bottom:4mm}'
    +'.title{font-family:"Cinzel",serif;font-size:26pt;color:#3a2010;letter-spacing:1px;margin-bottom:2mm;line-height:1.1}'
    +'.style{font-style:italic;font-size:13pt;color:#6a4a20}'
    +'.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin:6mm 0}'
    +'.meta-cell{text-align:center;padding:3mm;background:#f0e6ce;border-radius:2mm}'
    +'.meta-val{font-family:"Cinzel",serif;font-size:14pt;color:var(--gold);font-weight:600}'
    +'.meta-lbl{font-family:"Cinzel",serif;font-size:8pt;color:#6a4a20;letter-spacing:2px;text-transform:uppercase;margin-top:1mm}'
    +'.description{margin:5mm 0;padding:4mm;background:#f5ebd4;border-left:3px solid var(--gold);font-size:11pt;line-height:1.5}'
    +'.section-title{font-family:"Cinzel",serif;font-size:13pt;color:#8a6a30;letter-spacing:3px;border-bottom:1px solid var(--gold);padding-bottom:1mm;margin:6mm 0 3mm}'
    +'table{width:100%;border-collapse:collapse;font-size:10pt}'
    +'th{text-align:left;padding:2mm 3mm;background:var(--gold);color:#fff;font-family:"Cinzel",serif;font-size:9pt;letter-spacing:2px;text-transform:uppercase}'
    +'td{padding:2mm 3mm;border-bottom:1px solid #e0d4b0;vertical-align:top}'
    +'tr:nth-child(even) td{background:rgba(201,168,76,0.06)}'
    +'.ing{font-weight:600;width:30%}.amt{font-family:"Cinzel",serif;color:#8a6a30;width:25%}.notes{font-style:italic;color:#6a4a20;font-size:9.5pt}'
    +'.day{font-family:"Cinzel",serif;color:var(--gold);font-weight:600;width:18%}.task{}'
    +'.detail{font-style:italic;color:#6a4a20;font-size:9.5pt;margin-top:1mm}'
    +'.footer{margin-top:6mm;text-align:center;font-family:"Cinzel",serif;font-size:8pt;color:#8a6a30;letter-spacing:3px;border-top:1px solid var(--gold);padding-top:3mm}'
    +'.tags{display:flex;gap:2mm;flex-wrap:wrap;margin-top:3mm}'
    +'.tag{padding:1mm 3mm;background:#e8d9a7;border-radius:3mm;font-size:9pt;color:#3a2010}';
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+escHtml(r.name)+' — Recipe</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=EB+Garamond:ital@0;1&display=swap" rel="stylesheet">'
    +'<style>'+css+'</style></head><body><div class="page">'
    +'<div class="header">'
    +'<div class="brand">'+escHtml(brand.toUpperCase())+'</div>'
    +'<div class="title">'+escHtml(r.name)+'</div>'
    +'<div class="style">'+escHtml(r.style)+(r.category&&r.category!==r.style?' · '+escHtml(r.category):'')+'</div>'
    +'</div>'
    +'<div class="meta">'
    +'<div class="meta-cell"><div class="meta-val">'+(r.volume||'?')+' L</div><div class="meta-lbl">Volume</div></div>'
    +'<div class="meta-cell"><div class="meta-val">'+(r.ogTarget||'?')+'</div><div class="meta-lbl">Target OG</div></div>'
    +'<div class="meta-cell"><div class="meta-val">~'+(r.abvTarget||'?')+'%</div><div class="meta-lbl">Target ABV</div></div>'
    +'<div class="meta-cell"><div class="meta-val">'+escHtml(r.difficulty||'?')+'</div><div class="meta-lbl">Difficulty</div></div>'
    +'</div>'
    +(r.description?'<div class="description">'+escHtml(r.description)+'</div>':'')
    +'<div class="section-title">Ingredients</div>'
    +'<table><thead><tr><th>Item</th><th>Amount</th><th>Notes</th></tr></thead><tbody>'+ingHtml+'</tbody></table>'
    +(stepsHtml?'<div class="section-title">Schedule</div>'
      +'<table><thead><tr><th>When</th><th>Task</th></tr></thead><tbody>'+stepsHtml+'</tbody></table>':'')
    +(r.tags&&r.tags.length?'<div class="tags">'+r.tags.map(function(t){return'<span class="tag">'+escHtml(t)+'</span>';}).join('')+'</div>':'')
    +'<div class="footer">PRINTED FROM MEADOS · '+new Date().toLocaleDateString()+'</div>'
    +'</div></body></html>');
  w.document.close();
  setTimeout(function(){w.print();},300);
}

// ==================== GIFT CARD MODE ====================
// A 6×9 cm printable card. Front: label artwork + brewer's compliments.
// Back: tasting notes, ABV, sweetness, food pairings, brew story.
function openGiftCardModal(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var bot=APP.bottling[b.id]||{};
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  var ageDays=bot.date?Math.floor((new Date()-new Date(bot.date))/86400000):0;
  var pairings=suggestFoodPairings({sw:bot.sweetness,cat:recipe?recipe.category:'',abv:bot.abv});
  var snap={ag:ageDays};  // used below for the "30d aged" display
  var tastings=APP.tastings[b.id]||[];
  var notes=tastings.slice(-2).map(function(t){return t.note||t.notes||'';}).filter(Boolean).join(' / ').slice(0,200);
  var labelImg=getLabelImage(b.recipeId);
  // Unified overlay layer — respects per-recipe customizations
  var overlay=(typeof renderOverlayLayer==='function')
    ?renderOverlayLayer(recipe,b,bot.abv||'',{qr:false,bestDrink:false})
    :'';
  var brand=APP.settings.brewerName||'MeadOS';
  var brandLogo=(typeof getBrandLogoSrc==='function')?getBrandLogoSrc():'';
  if(!/^(data:|https?:|\/)/.test(brandLogo||''))brandLogo='';
  // Long brewery names overflow the 45mm text column at the fixed 11pt size —
  // scale type and tracking down with name length instead of clipping.
  var bnLen=brand.length;
  var brandFont=bnLen>26?'7.5pt':bnLen>18?'8.5pt':bnLen>12?'9.5pt':'11pt';
  var brandSpacing=bnLen>18?'1.5px':'3px';
  // Batch names also vary wildly in length — scale so 3-line wraps can't
  // push the gift message off the 60mm card.
  var batchFont=b.name.length>22?'10pt':b.name.length>14?'11.5pt':'14.5pt';

  var w=window.open('','_blank','width=700,height=900');
  if(!w){toast('⚠ Popup blocked');return;}
  // 6×9 cm card front+back side by side for double-sided printing
  var css='@page{size:landscape;margin:8mm}'
    +'*{box-sizing:border-box}'
    +'body{margin:0;padding:0;font-family:"EB Garamond",Georgia,serif;color:#2a1810;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'.controls{padding:14px;background:#222;color:#ddd;text-align:center;font-family:sans-serif;font-size:13px}'
    +'.controls button{margin:0 6px;padding:8px 16px;border:none;border-radius:4px;background:var(--gold);color:#000;font-weight:600;cursor:pointer}'
    +'.cards{display:flex;gap:6mm;flex-wrap:wrap;justify-content:center;padding:6mm}'
    +'.card{width:90mm;height:60mm;background:#fbf6e8;border:1px dashed #aaa;border-radius:3mm;overflow:hidden;display:flex;position:relative}'
    +'.front{flex-direction:row}.back{flex-direction:column;padding:5mm;position:relative;overflow:hidden}'
    +'.back .wm{position:absolute;inset:0;background-position:center;background-repeat:no-repeat;background-size:42mm;opacity:0.09;pointer-events:none}'
    +'.front .label-side{flex:1;display:flex;align-items:center;justify-content:center;padding:3mm;background:#fff;border-right:1px solid #e0d4b0}'
    +'.front .label-side svg,.front .label-side img{max-width:100%;max-height:100%}'
    +'.front .text-side{flex:1;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;padding:2.4mm 3.5mm;text-align:center;background:linear-gradient(135deg,#f5ebd4,#fbf6e8);overflow:hidden}'
    +'.front .brand-name{font-family:"Cinzel",serif;font-size:11pt;color:#8a6a30;letter-spacing:3px;margin-bottom:0.8mm}'
    +'.front .batch-name{font-family:"Cinzel",serif;font-size:16pt;color:#3a2010;font-weight:700;margin-bottom:1mm;line-height:1.05}'
    +'.front .style{font-style:italic;font-size:8.5pt;color:#6a4a20;margin-bottom:1.2mm}'
    +'.front .meta{font-family:"Cinzel",serif;font-size:9pt;color:var(--gold);letter-spacing:2px}'
    +'.front .gift-msg{margin-top:auto;font-style:italic;font-size:6.5pt;color:#6a4a20;line-height:1.2;padding-top:1mm;border-top:1px solid #e0d4b0;width:100%}'
    +'.back .title{font-family:"Cinzel",serif;font-size:9pt;color:#8a6a30;letter-spacing:3px;text-align:center;border-bottom:1px solid var(--gold);padding-bottom:1.5mm;margin-bottom:2mm}'
    +'.back .stats{display:flex;justify-content:space-around;margin-bottom:2.5mm;font-size:9pt}'
    +'.back .stat-val{font-family:"Cinzel",serif;color:var(--gold);font-weight:700}'
    +'.back .stat-lbl{font-size:7pt;color:#6a4a20;letter-spacing:1.5px;text-transform:uppercase}'
    +'.back .notes{font-style:italic;font-size:8.5pt;color:#3a2010;line-height:1.3;margin-bottom:2.5mm;padding:2mm;background:rgba(201,168,76,0.08);border-radius:1mm}'
    +'.back .pairing-title{font-family:"Cinzel",serif;font-size:7.5pt;color:#8a6a30;letter-spacing:2px;text-transform:uppercase;margin-bottom:1mm}'
    +'.back .pairing-list{font-size:8.5pt;color:#3a2010;line-height:1.4;padding-left:4mm}'
    +'.back .pairing-list li{margin-bottom:0.5mm}'
    +'.back .footer{margin-top:auto;text-align:center;font-family:"Cinzel",serif;font-size:6pt;color:#8a6a30;letter-spacing:2px;padding-top:1.5mm;border-top:1px solid #e0d4b0}'
    +'@media print{.controls{display:none}}';
  var labelInnerHtml='';
  if(labelImg){
    labelInnerHtml='<svg viewBox="0 0 900 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><image href="'+labelImg+'" x="0" y="0" width="900" height="900"/>'
      +overlay
      +'</svg>';
  }
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+escHtml(b.name)+' Gift Card</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=EB+Garamond:ital@0;1&display=swap" rel="stylesheet">'
    +'<style>'+css+'</style></head><body>'
    +'<div class="controls">📄 Two cards per page (front + back). Print double-sided on cardstock, then cut along dashed lines. <button onclick="window.print()">Print</button> <button onclick="window.close()">Close</button></div>'
    +'<div class="cards">'
    +'<div class="card front">'
    +'<div class="label-side">'+labelInnerHtml+'</div>'
    +'<div class="text-side">'
    +(brandLogo?'<img src="'+brandLogo+'" style="height:8mm;max-width:24mm;object-fit:contain;margin-bottom:0.8mm;flex-shrink:0" alt="">':'')
    +'<div class="brand-name" style="font-size:'+brandFont+';letter-spacing:'+brandSpacing+';line-height:1.25">'+escHtml(brand.toUpperCase())+'</div>'
    +'<div style="color:var(--gold);font-size:6pt;letter-spacing:4px;margin-bottom:0.8mm">— ❦ —</div>'
    +'<div class="batch-name" style="font-size:'+batchFont+'">'+escHtml(b.name)+'</div>'
    +'<div class="style">'+escHtml(recipe?recipe.style:(b.style||'Mead'))+'</div>'
    +'<div class="meta">'+(bot.abv?bot.abv.toFixed(1)+'%':'?')+(bot.sweetness?' · '+escHtml(bot.sweetness):'')+(snap.ag?' · '+snap.ag+'d aged':'')+'</div>'
    +'<div class="gift-msg">Crafted with care — enjoy at your leisure.</div>'
    +'</div></div>'
    +'<div class="card back">'
    +(brandLogo?'<div class="wm" style="background-image:url('+brandLogo+')"></div>':'')
    +'<div class="title">❦&nbsp; ABOUT THIS MEAD &nbsp;❦</div>'
    +'<div class="stats">'
    +'<div><div class="stat-val">'+(bot.abv?bot.abv.toFixed(1)+'%':'?')+'</div><div class="stat-lbl">ABV</div></div>'
    +'<div><div class="stat-val">'+escHtml(bot.sweetness||'?')+'</div><div class="stat-lbl">Sweetness</div></div>'
    +'<div><div class="stat-val">'+(b.honeyType||'?').split(' ')[0]+'</div><div class="stat-lbl">Honey</div></div>'
    +'<div><div class="stat-val">'+(bot.date?bot.date.split('-')[0]:'?')+'</div><div class="stat-lbl">Vintage</div></div>'
    +'</div>'
    +(notes?'<div class="notes">"'+escHtml(notes)+'"</div>':'')
    +'<div class="pairing-title">Pairs well with</div>'
    +(pairings.length?'<ul class="pairing-list">'+pairings.slice(0,3).map(function(p){return'<li>'+escHtml(p)+'</li>';}).join('')+'</ul>':'<div style="font-size:8pt;color:#6a4a20;font-style:italic">Sip and enjoy on its own.</div>')
    +'<div class="footer" style="font-size:'+(bnLen>18?'5.5pt':'6pt')+';letter-spacing:'+(bnLen>18?'1px':'2px')+';white-space:normal;line-height:1.5">'+escHtml(brand.toUpperCase())+' · BOTTLED '+(bot.date?escHtml(bot.date):'')+'</div>'
    +'</div>'
    +'</div></body></html>');
  w.document.close();
}

// ==================== 3D BOTTLE PREVIEW ====================
// All-SVG render: realistic wine/mead bottle silhouette with multi-stop glass
// gradients and a label that wraps around the cylinder (clip-path with curved
// edges + cylinder-shadow overlay). Click to rotate 180° showing the back.

var _bottle3DAngle=-12;
function rotate3DBottle(){
  var el=document.getElementById('bottle-3d');
  if(!el)return;
  _bottle3DAngle+=180;
  el.style.transform='rotateY('+_bottle3DAngle+'deg)';
}

// Small standalone QR-code <svg> for inline HTML print pages (as opposed to
// buildBatchQRSVG in 10b-labels-print.js, which draws into the bottle label's
// fixed 900-viewBox coordinate space). Returns '' if the QR lib is unavailable.
function _inlineQrSVG(url,sizePx,fg,bg){
  if(typeof QR==='undefined')return'';
  var qr;
  try{qr=QR.generate(url,{ecLevel:'M'});}catch(e){return'';}
  var n=qr.size,cell=sizePx/n,rects='';
  for(var r=0;r<n;r++){
    for(var c=0;c<n;c++){
      if(qr.matrix[r][c])rects+='<rect x="'+(c*cell)+'" y="'+(r*cell)+'" width="'+(cell*1.04)+'" height="'+(cell*1.04)+'" fill="'+(fg||'#1a1208')+'"/>';
    }
  }
  return'<svg width="'+sizePx+'" height="'+sizePx+'" viewBox="0 0 '+sizePx+' '+sizePx+'" xmlns="http://www.w3.org/2000/svg" style="background:'+(bg||'#fff')+'">'+rects+'</svg>';
}

// ==================== FERMENTER CARD (PRINT) ====================
// A landscape A6-ish card to stick on or near the fermenter. Shows batch name,
// recipe, OG, milestone dates ("add nutrients", "rack", "expected end of
// fermentation", "ready to bottle window"), and a 2cm-wide handwriting strip
// for jotting hydrometer readings.
function printFermenterCard(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  if(!recipe){toast('⚠ Recipe not found');return;}
  var startDate=b.startDate?new Date(b.startDate):new Date();
  function dateOffset(days){
    var d=new Date(startDate.getTime()+days*86400000);
    var dd=String(d.getDate()).padStart(2,'0');
    var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return dd+' '+months[d.getMonth()]+' '+d.getFullYear();
  }
  // Build the milestone list from recipe.steps (skip the brew day itself)
  var milestones=(recipe.steps||[]).filter(function(s){return s.day>0;}).map(function(s){
    return{day:s.day,date:dateOffset(s.day),title:s.title,desc:s.desc};
  });
  var fermentEnd=recipe.fermentDays||42;
  var endOfFermentation=dateOffset(fermentEnd);
  var readyToBottleStart=dateOffset(fermentEnd-3);
  var readyToBottleEnd=dateOffset(fermentEnd+14);
  var color=recipe.brandColor||'#c9a84c';
  var brand=(APP.settings&&APP.settings.brewerName)||'MeadOS';

  var w=window.open('','_blank','width=1100,height=800');
  if(!w){toast('⚠ Popup blocked');return;}
  var css='@page{size:A4 landscape;margin:8mm}'
    +'body{margin:0;padding:0;font-family:Georgia,"Times New Roman",serif;color:#1a1208;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    // Use min-height so it always FILLS the page but never overflows. Padding
    // tightened from 12mm/14mm to 7mm/10mm so content fits the 281mm × 194mm
    // printable area without spilling onto page 2.
    +'.card{box-sizing:border-box;width:281mm;min-height:194mm;padding:7mm 10mm;display:grid;grid-template-columns:1fr 1.35fr;gap:10mm;border:1px solid #1a1208}'
    +'.header{grid-column:1/-1;border-bottom:2px solid '+color+';padding-bottom:5px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:baseline}'
    +'.brewer{font-size:10px;letter-spacing:3px;color:#6a4a20;text-transform:uppercase}'
    +'.batch-name{font-family:"Times New Roman",serif;font-size:24px;font-weight:700;color:#1a1208;letter-spacing:0.5px;line-height:1.1}'
    +'.recipe-name{font-style:italic;color:'+color+';font-size:13px;margin-top:2px}'
    +'.section-title{font-size:10px;letter-spacing:2.5px;color:#8a6a30;text-transform:uppercase;border-bottom:1px solid #d0c094;padding-bottom:2px;margin:6px 0 4px;font-family:Georgia,serif}'
    +'.kv{display:flex;justify-content:space-between;font-size:11px;padding:2.5px 0;border-bottom:1px dotted #d8cca8}'
    +'.kv .k{color:#6a4a20}'
    +'.kv .v{font-weight:700;color:#1a1208;font-family:Menlo,monospace;font-size:11px}'
    +'.milestone{display:grid;grid-template-columns:34mm 1fr;gap:5px;padding:2.5px 0;border-bottom:1px dotted #d8cca8;font-size:10.5px;line-height:1.3}'
    +'.milestone .when{font-family:Menlo,monospace;font-size:10px;color:'+color+';font-weight:700;line-height:1.3}'
    +'.milestone .what{color:#1a1208;font-weight:600}'
    +'.milestone .what .desc{font-size:9.5px;color:#6a4a20;font-style:italic;margin-top:1px;line-height:1.35;font-weight:400}'
    +'.log-strip{margin-top:4px}'
    +'.log-strip table{width:100%;border-collapse:collapse}'
    +'.log-strip th{font-size:9.5px;color:#8a6a30;letter-spacing:1.5px;text-align:left;padding:3px 4px;border-bottom:1px solid #b0a070}'
    +'.log-strip td{border-bottom:1px solid #d8cca8;height:8mm;padding:0 4px}'
    +'.window-box{margin-top:5px;border:1.5px solid '+color+';padding:6px 8px;border-radius:3px;background:#fcf6e8}'
    +'.window-box .lbl{font-size:9.5px;letter-spacing:2px;color:#6a4a20;text-transform:uppercase;margin-bottom:2px}'
    +'.window-box .val{font-family:Menlo,monospace;font-size:11.5px;color:#1a1208;font-weight:700}'
    +'.print-btn{position:fixed;top:10px;right:10px;padding:8px 14px;background:'+color+';color:#fff;border:none;border-radius:3px;cursor:pointer;font-family:Georgia,serif;font-size:13px}'
    +'.qr-block{display:flex;align-items:center;gap:8px}'
    +'.qr-block .cap{font-size:8.5px;color:#6a4a20;text-align:right;line-height:1.3;max-width:22mm}'
    +'@media print{.print-btn{display:none}html,body{margin:0;padding:0}.card{border:1px solid #1a1208;page-break-inside:avoid;break-inside:avoid}}';

  // QR → this batch's live Advisor tab (health, readiness, recommendations),
  // so the paper card by the fermenter always points at the current data —
  // no need to hand-copy readings anywhere for the app to know about them.
  var advisorUrl=appBaseUrl()+'#batch='+(b.serial||b.id)+'&tab=coach';
  var qrSVG=_inlineQrSVG(advisorUrl,64,'#1a1208','#fcf6e8');

  var leftHtml=
    '<div class="section-title">Batch</div>'
    +'<div class="kv"><span class="k">Started</span><span class="v">'+dateOffset(0)+'</span></div>'
    +'<div class="kv"><span class="k">Volume</span><span class="v">'+(b.volume||recipe.volume)+' L</span></div>'
    +(b.og?'<div class="kv"><span class="k">OG</span><span class="v">'+b.og.toFixed(3)+'</span></div>':'<div class="kv"><span class="k">OG</span><span class="v">________</span></div>')
    +'<div class="kv"><span class="k">Target FG</span><span class="v">'+(recipe.fgTarget||'1.010').toString()+'</span></div>'
    +'<div class="kv"><span class="k">Target ABV</span><span class="v">~'+recipe.abvTarget+'%</span></div>'
    +(b.honeyType?'<div class="kv"><span class="k">Honey</span><span class="v">'+escHtml(b.honeyType)+'</span></div>':'')
    +(b.yeast?'<div class="kv"><span class="k">Yeast</span><span class="v">'+escHtml(b.yeast.toUpperCase())+'</span></div>':'')
    +'<div class="section-title" style="margin-top:8px">Hydrometer log</div>'
    +'<div class="log-strip"><table>'
    +'<tr><th style="width:30mm">Date</th><th style="width:18mm">SG</th><th style="width:14mm">°C</th><th>Notes</th></tr>'
    +'<tr><td></td><td></td><td></td><td></td></tr>'
    +'<tr><td></td><td></td><td></td><td></td></tr>'
    +'<tr><td></td><td></td><td></td><td></td></tr>'
    +'<tr><td></td><td></td><td></td><td></td></tr>'
    +'<tr><td></td><td></td><td></td><td></td></tr>'
    +'<tr><td></td><td></td><td></td><td></td></tr>'
    +'<tr><td></td><td></td><td></td><td></td></tr>'
    +'</table></div>';

  var rightHtml=
    '<div class="section-title">Milestones</div>'
    +(milestones.length?milestones.map(function(m){
      // A4 landscape has room for full descriptions
      return'<div class="milestone"><div class="when">Day '+m.day+'<br/><span style="color:#1a1208;font-weight:400">'+m.date+'</span></div><div class="what"><div>'+escHtml(m.title)+'</div>'+(m.desc?'<div class="desc">'+escHtml(m.desc)+'</div>':'')+'</div></div>';
    }).join(''):'<div style="font-size:11px;color:#6a4a20;font-style:italic">No milestones defined for this recipe.</div>')
    +'<div class="window-box">'
    +'<div class="lbl">Expected end of fermentation</div>'
    +'<div class="val">~ Day '+fermentEnd+' · '+endOfFermentation+'</div>'
    +'</div>'
    +'<div class="window-box" style="margin-top:6px">'
    +'<div class="lbl">Bottling window</div>'
    +'<div class="val">'+readyToBottleStart+' → '+readyToBottleEnd+'</div>'
    +'<div style="font-size:10px;color:#6a4a20;margin-top:3px;font-style:italic">Two identical SG readings 3-7 days apart = stable. Bottle then.</div>'
    +'</div>';

  var html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+escHtml(b.name||'Mead')+' — Fermenter Card</title><style>'+css+'</style></head><body>'
    +'<button class="print-btn" onclick="window.print()">🖨 Print</button>'
    +'<div class="card">'
    +'<div class="header"><div><div class="brewer">'+escHtml(brand)+'</div><div class="batch-name">'+escHtml(b.name||'Mead')+'</div><div class="recipe-name">'+escHtml(recipe.name)+'</div></div>'
    +'<div class="qr-block">'
      +'<div class="cap">Card printed<br/>'+dateOffset(daysSince(b.startDate))+'</div>'
      +(qrSVG?'<div><div class="cap" style="font-weight:700;margin-bottom:2px">Scan for<br/>live Advisor</div>'+qrSVG+'</div>':'')
    +'</div></div>'
    +'<div>'+leftHtml+'</div>'
    +'<div>'+rightHtml+'</div>'
    +'</div></body></html>';

  w.document.write(html);
  w.document.close();
}
