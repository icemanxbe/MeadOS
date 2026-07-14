// ==========================================================================
// Tasting wheel, calendar .ics export, batch certificate.
// Split out of the former 11-features.js. Globals, no behaviour change.
// ==========================================================================

// ==================== TASTING WHEEL ====================
var TASTING_AXES=[
  {key:'sweetness',label:'Sweetness',hint:'Dry → Sweet'},
  {key:'body',label:'Body',hint:'Light → Full'},
  {key:'acidity',label:'Acidity',hint:'Soft → Sharp'},
  {key:'honey',label:'Honey',hint:'Faint → Forward'},
  {key:'fruit',label:'Fruit',hint:'Absent → Bold'},
  {key:'spice',label:'Spice',hint:'None → Pronounced'},
  {key:'finish',label:'Finish',hint:'Short → Long'},
  {key:'warmth',label:'Warmth',hint:'Cool → Hot (alcohol heat)'}
];

// ---- BJCP scoresheet --------------------------------------------------------
// The five weighted categories of a standard BJCP mead scoresheet (max 50).
// Stored on a tasting as t.bjcp = {aroma,appearance,flavor,mouthfeel,overall,
// total,descriptor}. Optional — a tasting can have free-text notes, a 1-5
// wheel, a star rating, a formal scoresheet, or any mix.
var BJCP_CATEGORIES=[
  {key:'aroma',label:'Aroma',max:12,hint:'Honey character, fermentation, hops/special ingredients, faults'},
  {key:'appearance',label:'Appearance',max:3,hint:'Color, clarity, head/carbonation where appropriate'},
  {key:'flavor',label:'Flavor',max:20,hint:'Honey, balance, sweetness/dryness, special ingredients, finish'},
  {key:'mouthfeel',label:'Mouthfeel',max:5,hint:'Body, carbonation, warmth, astringency, creaminess'},
  {key:'overall',label:'Overall Impression',max:10,hint:'Overall drinking pleasure, intangibles'}
];
var BJCP_MAX=BJCP_CATEGORIES.reduce(function(s,c){return s+c.max;},0); // 50
// Official BJCP descriptor bands (scaled here to the 50-point sheet).
function bjcpDescriptor(total){
  if(total>=45)return{label:'Outstanding',color:'#c9a84c',note:'World-class example of style'};
  if(total>=38)return{label:'Excellent',color:'#7aa850',note:'Exemplifies style well, requires minor fine-tuning'};
  if(total>=30)return{label:'Very Good',color:'#7aa8c0',note:'Generally within style parameters, some minor flaws'};
  if(total>=21)return{label:'Good',color:'#a8a050',note:'Misses the mark on style and/or minor flaws'};
  if(total>=14)return{label:'Fair',color:'#c87850',note:'Off flavors/aromas or major style deficiencies'};
  return{label:'Problematic',color:'#a05050',note:'Major off flavors and aromas dominate'};
}
// Build the collapsible scoresheet inputs for the New Tasting form.
function renderBJCPScoresheet(){
  var rows=BJCP_CATEGORIES.map(function(c){
    return'<div style="display:flex;align-items:center;gap:10px;padding:5px 0">'
      +'<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--text2)">'+c.label+'</div>'
      +'<div style="font-size:10.5px;color:var(--text3);line-height:1.3">'+c.hint+'</div></div>'
      +'<input class="form-input" id="bjcp-'+c.key+'" type="number" min="0" max="'+c.max+'" step="0.5" oninput="updateBJCPTotal()" style="width:64px;text-align:center;flex-shrink:0">'
      +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);width:30px;flex-shrink:0">/ '+c.max+'</div></div>';
  }).join('');
  return'<details style="margin-top:4px;border:1px solid var(--border);border-radius:var(--radius);padding:0 12px"><summary style="cursor:pointer;padding:10px 0;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--text2)">📋 BJCP SCORESHEET <span style="color:var(--text3)">· optional formal scoring (50 pts)</span></summary>'
    +'<div style="padding-bottom:10px">'+rows
    +'<div id="bjcp-total-line" style="display:flex;justify-content:space-between;align-items:baseline;padding-top:8px;margin-top:6px;border-top:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Total</span><span style="font-family:var(--font-mono);font-size:13px;color:var(--text3)">— / '+BJCP_MAX+'</span></div>'
    +'</div></details>';
}
function readBJCPScore(){
  var score={},any=false,total=0;
  BJCP_CATEGORIES.forEach(function(c){
    var el=document.getElementById('bjcp-'+c.key);
    var v=el?parseFloat(el.value):NaN;
    if(!isNaN(v)){v=Math.max(0,Math.min(c.max,v));score[c.key]=v;total+=v;any=true;}
  });
  if(!any)return null;
  score.total=Math.round(total*2)/2;
  var d=bjcpDescriptor(score.total);
  score.descriptor=d.label;
  return score;
}
function updateBJCPTotal(){
  var line=document.getElementById('bjcp-total-line');
  if(!line)return;
  var s=readBJCPScore();
  if(!s){line.children[1].textContent='— / '+BJCP_MAX;line.children[1].style.color='var(--text3)';return;}
  var d=bjcpDescriptor(s.total);
  line.children[1].innerHTML=s.total+' / '+BJCP_MAX+' · <span style="color:'+d.color+'">'+d.label+'</span>';
  line.children[1].style.color='var(--text)';
}
// Compact read-only render of a saved scoresheet for the tasting journal.
function renderBJCPBadge(bjcp){
  if(!bjcp||bjcp.total==null)return'';
  var d=bjcpDescriptor(bjcp.total);
  var bars=BJCP_CATEGORIES.map(function(c){
    var v=bjcp[c.key]||0,pct=Math.round(v/c.max*100);
    return'<div style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--text3);font-family:var(--font-mono)"><span style="width:78px;flex-shrink:0">'+c.label+'</span>'
      +'<span style="flex:1;height:5px;background:var(--bg);border-radius:3px;overflow:hidden;display:inline-block"><span style="display:block;width:'+pct+'%;height:100%;background:'+d.color+'"></span></span>'
      +'<span style="width:40px;text-align:right">'+v+'/'+c.max+'</span></div>';
  }).join('');
  return'<div style="margin:8px 0;padding:8px 10px;background:var(--bg);border-radius:6px;border-left:3px solid '+d.color+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span style="font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--text3)">BJCP SCORE</span>'
    +'<span style="font-family:var(--font-display);font-size:16px;color:'+d.color+'">'+bjcp.total+'<span style="font-size:11px;color:var(--text3)">/'+BJCP_MAX+'</span> · '+d.label+'</span></div>'
    +'<div style="display:flex;flex-direction:column;gap:3px">'+bars+'</div></div>';
}

function renderTastingWheel(currentValues,onChange){
  return'<div class="tw-grid">'
    +TASTING_AXES.map(function(ax){
      var val=(currentValues&&currentValues[ax.key])||0;
      var dots=[1,2,3,4,5].map(function(n){
        return'<div class="tw-dot '+(n<=val?'active':'')+'" data-action="setTastingAxis" data-args=\''+JSON.stringify([ax.key,n])+'\' title="'+ax.hint+'">'+n+'</div>';
      }).join('');
      return'<div class="tw-axis"><div class="tw-axis-label" title="'+ax.hint+'">'+ax.label+'</div><div class="tw-axis-dots">'+dots+'</div></div>';
    }).join('')
    +'</div>';
}

function setTastingAxis(key,n){
  if(!window._tastingWheel)window._tastingWheel={};
  // Toggle off if clicking same value
  if(window._tastingWheel[key]===n)window._tastingWheel[key]=0;
  else window._tastingWheel[key]=n;
  // Re-render just the wheel section
  var container=document.getElementById('tasting-wheel-container');
  if(container)container.innerHTML=renderTastingWheel(window._tastingWheel);
}

function getTastingWheelRadarHTML(values){
  // Render a small SVG radar chart from values {sweetness:3, body:4, ...}
  var size=240;
  var cx=size/2,cy=size/2;
  var r=size/2-30;
  var n=TASTING_AXES.length;
  var points=TASTING_AXES.map(function(ax,i){
    var v=(values&&values[ax.key])||0;
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var dist=r*(v/5);
    return{x:cx+Math.cos(angle)*dist,y:cy+Math.sin(angle)*dist,axis:ax,angle:angle};
  });
  var labels=TASTING_AXES.map(function(ax,i){
    var angle=(Math.PI*2*i/n)-Math.PI/2;
    var lx=cx+Math.cos(angle)*(r+18);
    var ly=cy+Math.sin(angle)*(r+18)+4;
    var axl=(typeof appLang==='function'&&appLang()==='nl')?({Sweetness:'Zoetheid',Body:'Body',Acidity:'Zuurgraad',Honey:'Honing',Fruit:'Fruit',Spice:'Specerij',Finish:'Afdronk',Warmth:'Warmte'}[ax.label]||ax.label):ax.label;
    return'<text x="'+lx+'" y="'+ly+'" text-anchor="middle" fill="#a89880" font-family="var(--font-mono)" font-size="9" style="text-transform:uppercase;letter-spacing:1px">'+axl+'</text>';
  }).join('');
  // Grid rings
  var rings=[1,2,3,4,5].map(function(level){
    var pts=TASTING_AXES.map(function(ax,i){
      var angle=(Math.PI*2*i/n)-Math.PI/2;
      var dist=r*(level/5);
      return(cx+Math.cos(angle)*dist)+','+(cy+Math.sin(angle)*dist);
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
  // Data polygon
  var dataPolyPts=points.map(function(p){return p.x+','+p.y;}).join(' ');
  // viewBox expanded by ~36 on left/right and ~8 top/bottom so the side labels
  // (FINISH on left at x≈12, ACIDITY on right at x≈228, both with text-anchor
  // middle) aren't clipped when the SVG has an explicit width. overflow:visible
  // is a belt-and-braces safety net for embedders that constrain the SVG box.
  return'<svg viewBox="-36 -8 312 256" overflow="visible" style="display:block;margin:0 auto;overflow:visible" width="100%" preserveAspectRatio="xMidYMid meet">'
    +rings+axes
    +'<polygon points="'+dataPolyPts+'" fill="rgba(201,168,76,0.25)" stroke="#c9a84c" stroke-width="1.5"/>'
    +points.map(function(p){return'<circle cx="'+p.x+'" cy="'+p.y+'" r="2.5" fill="#e8c46a"/>';}).join('')
    +labels
    +'</svg>';
}

// ==================== CALENDAR EXPORT (.ics) ====================
function exportCalendarICS(){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  var isCider=(typeof activeBevMode==='function')&&activeBevMode()==='cider';
  var active=(typeof visibleBatches==='function'?visibleBatches():APP.batches).filter(function(b){var s=getBatchStatus(b);return s!=='complete'&&s!=='bottled'&&s!=='failed';});
  if(!active.length){toast(nl?'⚠ Geen actieve partijen met stappen om te exporteren':'⚠ No active batches with steps to export');return;}
  var ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//'+(isCider?'CiderOS//CiderOS':'MeadOS//MeadOS')+'//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+(isCider?'CiderOS Cidermaking Schedule':'MeadOS Brewing Schedule'),'X-WR-TIMEZONE:Europe/Brussels'];
  function pad(n){return String(n).padStart(2,'0');}
  function fmtICSDate(d){return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());}
  function fmtICSDT(d){return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+pad(d.getUTCMinutes())+'00Z';}
  function escICS(s){return(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');}
  var now=new Date();
  var dtstamp=fmtICSDT(now);
  active.forEach(function(b){
    var recipe=getRecipe(b.recipeId);
    if(!recipe)return;
    var startDate=new Date(b.startDate);
    var steps=(typeof getEffectiveSteps==='function')?getEffectiveSteps(b,recipe):recipe.steps;
    steps.forEach(function(s){
      if(s.day<0)return;
      var taskDate=new Date(startDate.getTime()+s.day*86400000);
      if(taskDate<now&&Math.abs(taskDate-now)>2*86400000)return; // skip past tasks >2 days old
      var uid='meados-'+b.id+'-step-'+s.day+'@meados';
      var bCider=(b.beverageType||'mead')==='cider';
      ics.push('BEGIN:VEVENT');
      ics.push('UID:'+uid);
      ics.push('DTSTAMP:'+dtstamp);
      ics.push('DTSTART;VALUE=DATE:'+fmtICSDate(taskDate));
      var endDate=new Date(taskDate.getTime()+86400000);
      ics.push('DTEND;VALUE=DATE:'+fmtICSDate(endDate));
      ics.push('SUMMARY:'+escICS((bCider?'🍎 ':'⚗ ')+b.name+' — '+s.title));
      ics.push('DESCRIPTION:'+escICS(annotateNutrientDesc(s.desc)+'\n\nBatch: '+b.name+' (Day '+s.day+' of '+recipe.fermentDays+')'));
      ics.push('CATEGORIES:'+(bCider?'Cider Brewing,CiderOS':'Mead Brewing,MeadOS'));
      ics.push('END:VEVENT');
    });
  });
  ics.push('END:VCALENDAR');
  var blob=new Blob([ics.join('\r\n')],{type:'text/calendar'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download=(isCider?'cideros-schedule-':'meados-schedule-')+today()+'.ics';a.click();
  URL.revokeObjectURL(url);
  toast(nl?'📅 Agenda geëxporteerd — open in je agenda-app':'📅 Calendar exported — open in your calendar app');
}

// ==================== BATCH CERTIFICATE (printable) ====================
function printBatchCertificate(batchId){
  var b=getBatch(batchId);
  if(!b){toast('⚠ Batch not found');return;}
  var recipe=getRecipe(b.recipeId);
  var bot=APP.bottling[b.id]||{};
  var logs=getBatchLogs(b.id);
  var tastings=APP.tastings[b.id]||[];
  var lastG=logs.length?logs[logs.length-1].gravity:null;
  var abv=bot.abv||(b.og&&bot.fg?calcABV(b.og,bot.fg):(b.og&&lastG?calcABV(b.og,lastG):null));
  var labelImg=getLabelImage(b.recipeId);
  var color=getBatchColor(b);
  var ccy=APP.settings.currency||'€';
  var totalCost=b.cost?((b.cost.honey||0)+(b.cost.extras||0)):0;
  var perBottle=totalCost&&totalBottles(bot)>0?totalCost/totalBottles(bot):0;
  
  var logsTable=logs.map(function(l){
    return'<tr><td>'+fmtDate(l.date)+'</td><td>'+l.gravity+'</td><td>'+(l.temp!=null?l.temp+'°C':'—')+'</td><td>'+(b.og?calcABV(b.og,l.gravity)+'%':'—')+'</td></tr>';
  }).join('');
  
  var tastingsHtml=tastings.map(function(t){
    return'<div style="border-left:3px solid '+color+';padding:8px 14px;margin:8px 0;background:#fafaf6">'
      +'<div style="display:flex;justify-content:space-between"><strong>'+fmtDate(t.date)+'</strong><span>'+'★'.repeat(t.rating||0)+'☆'.repeat(5-(t.rating||0))+'</span></div>'
      +(t.color?'<div><em>Color:</em> '+escHtml(t.color)+'</div>':'')
      +(t.aroma?'<div><em>Aroma:</em> '+escHtml(t.aroma)+'</div>':'')
      +(t.flavor?'<div><em>Flavor:</em> '+escHtml(t.flavor)+'</div>':'')
      +(t.finish?'<div><em>Finish:</em> '+escHtml(t.finish)+'</div>':'')
      +(t.note?'<div style="margin-top:4px;font-style:italic">'+escHtml(t.note)+'</div>':'')
      +'</div>';
  }).join('');
  
  var w=window.open('','_blank','width=900,height=1200');
  if(!w){toast('⚠ Pop-up blocked');return;}
  w.document.write('<!DOCTYPE html><html><head><title>'+escHtml(b.name)+' — Certificate</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=EB+Garamond:ital@0;1&display=swap" rel="stylesheet">'
    +'<style>'
    +'@page{size:A4;margin:5mm}'
    +'*{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}'
    +'html,body{margin:0;padding:0;font-family:"EB Garamond",Georgia,serif;color:#1a1a1f;background:#fff;line-height:1.5;width:100%;overflow-x:hidden}'
    +'.cert{width:100%;padding:14mm 12mm 12mm;margin:0}'
    +'.header{display:flex;align-items:center;gap:12px;border-bottom:2px solid '+color+';padding-bottom:14px;margin-bottom:18px}'
    +'.label-img{width:35%;max-width:80mm;flex-shrink:0;position:relative}'
    +'.label-img svg{width:100%;height:auto;display:block}'
    +'.title-block{flex:1;min-width:0;overflow:hidden}'
    +'.title-block h1{font-family:Cinzel,Georgia,serif;font-size:22px;color:'+color+';margin:0 0 4px;letter-spacing:1.5px;word-break:break-word;line-height:1.15}'
    +'.title-block .style{font-style:italic;color:#666;font-size:13px}'
    +'.title-block .meta{margin-top:10px;font-size:11px;color:#444;line-height:1.7}'
    +'.section{margin:14px 0}'
    +'.section h2{font-family:Cinzel,Georgia,serif;font-size:12px;letter-spacing:2.5px;color:'+color+';border-bottom:1px solid #ddd;padding-bottom:4px;margin:0 0 10px}'
    +'table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}'
    +'th{text-align:left;background:#f5f3ee;padding:5px 8px;font-family:Cinzel,serif;letter-spacing:1px;font-size:10px;color:#666}'
    +'td{padding:4px 8px;border-bottom:1px solid #eee;word-wrap:break-word}'
    +'.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}'
    +'.stat{text-align:center;padding:10px 6px;background:#faf8f3;border:1px solid #eaddd0;border-radius:4px}'
    +'.stat-val{font-family:Cinzel,serif;font-size:18px;color:'+color+'}'
    +'.stat-lbl{font-size:9px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-top:2px}'
    +'.footer{margin-top:18px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#888;text-align:center;font-style:italic}'
    +'.toolbar{padding:14px;background:#222;color:#fff;text-align:center;position:sticky;top:0;z-index:10}'
    +'.toolbar button{padding:10px 20px;font-size:14px;cursor:pointer;border:0;border-radius:4px;background:'+color+';color:#fff;font-weight:600;margin:0 4px}'
    +'@media print{.toolbar{display:none!important}body{background:#fff}.cert{padding:0}}'
    +'</style></head><body>'
    +'<div class="toolbar"><button onclick="window.print()">🖨 Print Certificate</button><button onclick="window.close()" style="background:#666">Close</button></div>'
    +'<div class="cert">'
    +'<div class="header">'
    +(labelImg?'<div class="label-img"><svg viewBox="0 0 900 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">'
      +'<image href="'+labelImg+'" x="0" y="0" width="900" height="900" preserveAspectRatio="xMidYMid meet"/>'
      +((typeof renderOverlayLayer==='function')?renderOverlayLayer(recipe,b,abv||'',{qr:false,bestDrink:false}):'')
      +'</svg></div>':'')
    +'<div class="title-block">'
    +'<h1>'+escHtml(b.name)+'</h1>'
    +'<div class="style">'+escHtml(recipe?recipe.style:(b.style||'Custom Mead'))+'</div>'
    +'<div class="meta">'
    +'Brewed by <strong>'+escHtml(APP.settings.brewerName||'MeadOS')+'</strong><br>'
    +'Started: '+fmtDate(b.startDate)+'<br>'
    +(bot.date?'Bottled: '+fmtDate(bot.date)+'<br>':'')
    +'Volume: '+(b.volume||'?')+' L'
    +(b.honey?' &nbsp;·&nbsp; '+b.honey+' kg honey':'')
    +'</div></div></div>'
    +'<div class="section"><h2>VITAL STATISTICS</h2>'
    +'<div class="grid-3">'
    +'<div class="stat"><div class="stat-val">'+(b.og||'—')+'</div><div class="stat-lbl">Original Gravity</div></div>'
    +'<div class="stat"><div class="stat-val">'+(bot.fg||lastG||'—')+'</div><div class="stat-lbl">Final Gravity</div></div>'
    +'<div class="stat"><div class="stat-val">'+(abv?abv+'%':'—')+'</div><div class="stat-lbl">ABV</div></div>'
    +'</div></div>'
    +(logs.length?'<div class="section"><h2>FERMENTATION LOG</h2>'
      +'<table><thead><tr><th>Date</th><th>SG</th><th>Temp</th><th>Est. ABV</th></tr></thead><tbody>'+logsTable+'</tbody></table>'
      +'</div>':'')
    +(tastings.length?'<div class="section"><h2>TASTING NOTES</h2>'+tastingsHtml+'</div>':'')
    +(b.cost&&totalCost?'<div class="section"><h2>ECONOMICS</h2>'
      +'<div class="grid-3">'
      +'<div class="stat"><div class="stat-val">'+ccy+totalCost.toFixed(2)+'</div><div class="stat-lbl">Total Cost</div></div>'
      +(perBottle>0?'<div class="stat"><div class="stat-val">'+ccy+perBottle.toFixed(2)+'</div><div class="stat-lbl">Per Bottle</div></div>':'')
      +'<div class="stat"><div class="stat-val">'+totalBottles(bot)+'</div><div class="stat-lbl">Bottles</div></div>'
      +'</div></div>':'')
    +(b.notes||bot.notes?'<div class="section"><h2>NOTES</h2><div style="font-style:italic;color:#555">'+escHtml(b.notes||bot.notes||'')+'</div></div>':'')
    +'<div class="footer">Crafted with patience · MeadOS · '+new Date().toLocaleDateString(_dloc(),{day:'numeric',month:'long',year:'numeric'})+'</div>'
    +'</div></body></html>');
  w.document.close();
}
