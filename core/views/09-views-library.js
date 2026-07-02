// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// honey/yeast/nutrient libraries, settings, fermenter management
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== HONEY LIBRARY ====================
// Full-page Honey Library view (accessible from sidebar)
function renderHoneyLibrary(){
  // In-season + usage-forecast sit side by side (equal-height cells) to save
  // vertical space; either may be empty, so only grid when both are present.
  var inSeason=renderHoneyInSeasonCard();
  var forecast=renderHoneyUsageForecast();
  var banners=(inSeason&&forecast)
    ?'<div class="grid-2" style="align-items:stretch;margin-bottom:16px">'+inSeason+forecast+'</div>'
    :((inSeason||forecast)?'<div style="margin-bottom:16px">'+(inSeason||forecast)+'</div>':'');
  return'<div class="page-title">Honey Library</div>'
    +'<div class="page-subtitle">Choose the honey, shape the mead · '+HONEY_TYPES.length+' varieties</div>'
    +banners
    +renderHoneyLibrarySection();
}

// Surface which honeys are at their freshness peak this month. Groups by
// region (local apiaries vs Mediterranean imports vs everything
// else) since those tell you very different things: local = "go buy it from
// a beekeeper this month for the freshest possible", Mediterranean = "the
// fresh import wave is arriving in shops". Hidden completely in months
// where nothing is in season locally AND nothing imported is at peak.
function renderHoneyInSeasonCard(){
  var now=new Date();
  var monthIdx=now.getMonth()+1;
  var monthName=now.toLocaleDateString(_dloc(),{month:'long'});
  var hits=honeysInSeason(monthIdx);
  if(!hits.length)return''; // nothing fresh this month — quiet
  // Group by region
  var groups={local:[],mediterranean:[],southern:[],global:[],tropical:[]};
  hits.forEach(function(h){if(groups[h.region])groups[h.region].push(h);});
  var regionLabels={
    local:'LOCAL APIARY',
    mediterranean:'MEDITERRANEAN IMPORT',
    southern:'SOUTHERN HEMISPHERE',
    global:'YEAR-ROUND',
    tropical:'TROPICAL'
  };
  var regionHints={
    local:'Bee plants flowering near you this month — freshest if you can buy direct from a beekeeper or local market.',
    mediterranean:'Fresh import wave from Spain / Italy / Greece arriving in shops this month.',
    southern:'Recent Southern Hemisphere harvest arriving in specialty shops.',
    global:'Beekeepers harvest these year-round.',
    tropical:'Multiple flowerings per year — freshness less predictable.'
  };
  var sections=Object.keys(groups).filter(function(r){return groups[r].length;}).map(function(r){
    var rows=groups[r].map(function(h){
      var prof=HONEY_PROFILES[h.name];
      var color=(prof&&prof.color)||'var(--gold)';
      var isPeak=h.proximity>=1.0;
      var peakBadge=isPeak?'<span style="font-family:var(--font-mono);font-size:9px;color:var(--green2);letter-spacing:1.5px;margin-left:8px;background:rgba(122,160,64,0.15);padding:1px 6px;border-radius:6px;border:1px solid rgba(122,160,64,0.3)">PEAK</span>':'';
      return'<span onclick="currentHoneyName=\''+h.name.replace(/\'/g,"\\\'")+'\';showView(\'honey-detail\')" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-family:var(--font-display);font-size:13px;color:'+color+';background:rgba(0,0,0,0.18);border:1px solid '+color+'55;padding:6px 12px;border-radius:14px;margin:3px 4px 3px 0;transition:background 0.15s" onmouseover="this.style.background=\'rgba(0,0,0,0.32)\'" onmouseout="this.style.background=\'rgba(0,0,0,0.18)\'">'+escHtml(h.name)+peakBadge+'</span>';
    }).join('');
    return'<div style="margin-bottom:12px">'
      +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--gold);letter-spacing:2px;margin-bottom:4px">'+regionLabels[r]+'</div>'
      +'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-bottom:6px">'+regionHints[r]+'</div>'
      +'<div style="line-height:2">'+rows+'</div>'
      +'</div>';
  }).join('');
  return'<div class="card" style="border-left:3px solid var(--gold2);height:100%">'
    +'<div class="card-header"><div class="card-title">🌸 IN SEASON — '+monthName.toUpperCase()+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+hits.length+' VARIET'+(hits.length===1?'Y':'IES')+'</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:14px;line-height:1.55">Honeys at their freshness peak this month. Peak-of-season is the best time to source — local apiaries have just harvested, Mediterranean imports are most recent.</div>'
    +sections
    +'</div>';
}

// Honey usage forecast — looks at active batches and their honey types,
// totals projected consumption, and compares against on-hand supplies of
// the same honeys. Surfaces "you'll run out of acacia by August at your
// current pace" warnings, especially valuable for seasonal varieties.
function renderHoneyUsageForecast(){
  // Forecast = honey you still need to BUY, so it's driven by PLANNED (not-yet-
  // brewed) batches. Active batches already had their honey added at brew day.
  var _nl=(typeof appLang==='function'&&appLang()==='nl');
  var planned=APP.plannedBatches||[];
  if(!planned.length)return'';
  var demand={};
  planned.forEach(function(pb){
    var r=APP.recipes.find(function(x){return x.id===pb.recipeId;});
    if(!r)return;
    // Planned batches carry no honey weight — derive it from target OG and
    // volume (~292 SG points per kg per litre).
    var vol=parseFloat(pb.volume)||r.volume||5;
    var honeyKg=(r.ogTarget-1)*1000*vol/292;
    if(honeyKg<=0)return;
    var ht=pb.honeyType||'Wildflower';
    if(!demand[ht])demand[ht]={kg:0,batches:[]};
    demand[ht].kg+=honeyKg;
    demand[ht].batches.push(pb);
  });
  var types=Object.keys(demand);
  if(!types.length)return'';
  // Match against supplies (honey-category items)
  var supplies=APP.supplies||[];
  function findSupplyForHoney(honeyName){
    var nameL=honeyName.toLowerCase();
    return supplies.find(function(s){
      if(!s||s.category&&s.category!=='honey')return false;
      var sn=(s.name||'').toLowerCase();
      return sn.indexOf(nameL)>=0||nameL.indexOf(sn)>=0;
    });
  }
  var rows=types.map(function(ht){
    var d=demand[ht];
    var supply=findSupplyForHoney(ht);
    var onHandKg=supply?(supply.unit==='kg'?supply.qty:supply.unit==='g'?supply.qty/1000:supply.qty):0;
    var shortage=d.kg-onHandKg;
    var profile=HONEY_PROFILES[ht];
    var color=(profile&&profile.color)||'var(--gold)';
    var seasonInfo=HONEY_SEASONS[ht];
    var currentMonth=new Date().getMonth()+1;
    var inSeasonNow=seasonInfo&&seasonInfo.months&&seasonInfo.months.indexOf(currentMonth)>=0;
    var seasonBadge=inSeasonNow?' <span title="Currently in season — best time to source" style="font-family:var(--font-mono);font-size:9px;color:var(--green2);letter-spacing:1px;background:rgba(122,160,64,0.15);padding:1px 5px;border-radius:5px;margin-left:6px;border:1px solid rgba(122,160,64,0.3)">🌸 IN SEASON</span>':'';
    var status;
    if(!supply){
      status='<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">NOT IN SUPPLIES</span>';
    }else if(shortage>0){
      status='<span style="font-family:var(--font-mono);font-size:10px;color:var(--red2);letter-spacing:1px">'+(_nl?'TEKORT ':'SHORT ')+shortage.toFixed(2)+' kg</span>';
    }else{
      var buffer=onHandKg-d.kg;
      status='<span style="font-family:var(--font-mono);font-size:10px;color:var(--green2);letter-spacing:1px">+'+buffer.toFixed(2)+(_nl?' kg MARGE':' kg BUFFER')+'</span>';
    }
    return'<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">'
      +'<div style="width:8px;height:32px;border-radius:2px;background:'+color+';flex-shrink:0"></div>'
      +'<div style="flex:1;min-width:0"><div style="font-family:var(--font-display);font-size:13px;color:'+color+'">'+escHtml(ht)+seasonBadge+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+(_nl?(d.kg.toFixed(2)+' kg nodig voor '+d.batches.length+' geplande partij'+(d.batches.length===1?'':'en')+(supply?' · '+onHandKg.toFixed(2)+' kg op voorraad':'')):(d.kg.toFixed(2)+' kg needed across '+d.batches.length+' planned batch'+(d.batches.length===1?'':'es')+(supply?' · '+onHandKg.toFixed(2)+' kg on hand':'')))+'</div></div>'
      +status
      +'</div>';
  }).join('');
  return'<div class="card" style="border-left:3px solid var(--gold2);height:100%"><div class="card-header"><div class="card-title">'+(_nl?'🍯 HONINGVERBRUIK-PROGNOSE':'🍯 HONEY USAGE FORECAST')+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px">'+planned.length+(_nl?(' GEPLANDE PARTIJ'+(planned.length===1?'':'EN')):(' PLANNED BATCH'+(planned.length===1?'':'ES')))+'</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:10px;line-height:1.55">'+(_nl?'Honing die je <strong>geplande</strong> partijen nodig hebben versus wat in je voorraad zit (al gebrouwen honing telt niet mee). Let op seizoenshoningen (lavendel, kastanje) die je niet zomaar opnieuw kunt inslaan.':'Honey your <strong>planned</strong> batches will need vs. what\'s in your supplies (honey already brewed isn\'t counted). Watch seasonal honeys (lavender, chestnut) you can\'t just restock anytime.')+'</div>'
    +rows
    +'</div>';
}

// Honey Library: rich card grid surfacing each honey type with its profile,
// flavor notes, and which recipes use it.
function renderHoneyLibrarySection(){
  var cards=HONEY_TYPES.map(function(name){
    var p=HONEY_PROFILES[name];
    if(!p)return'';
    var recipes=recipesUsingHoney(name);
    var recipePills=recipes.length?recipes.slice(0,4).map(function(r){
      return'<span onclick="event.stopPropagation();currentRecipeId=\''+r.id+'\';showView(\'recipe-detail\')" style="display:inline-block;font-family:var(--font-mono);font-size:9.5px;background:rgba(0,0,0,0.25);color:'+r.color+';border:1px solid '+r.color+'66;padding:2px 7px;border-radius:8px;margin:2px 3px 2px 0;cursor:pointer">'+escHtml(r.name.substring(0,18))+(r.name.length>18?'…':'')+'</span>';
    }).join('')+(recipes.length>4?'<span style="font-size:10px;color:var(--text3);font-style:italic;margin-left:4px">+'+(recipes.length-4)+' more</span>':''):'<span style="font-size:11px;color:var(--text3);font-style:italic">Not used in built-in recipes</span>';
    return'<div onclick="currentHoneyName=\''+name+'\';showView(\'honey-detail\')" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform 0.15s,border-color 0.15s" onmouseover="this.style.borderColor=\''+p.color+'\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.transform=\'translateY(0)\'">'
      // Color stripe with name
      +'<div style="background:'+p.color+';color:#1a0f08;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">'
      +'<div style="font-family:var(--font-display);font-size:15px;font-weight:600;letter-spacing:0.5px">'+escHtml(name)+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:9px;background:rgba(0,0,0,0.18);padding:2px 8px;border-radius:10px;letter-spacing:1.2px;text-transform:uppercase">'+p.intensity+'</div>'
      +'</div>'
      +'<div style="padding:14px;flex:1;display:flex;flex-direction:column;gap:8px">'
      +'<div style="font-size:13px;color:var(--text2);line-height:1.5">'+escHtml(p.profile)+'</div>'
      +'<div style="font-size:12px;color:var(--text2);line-height:1.5"><strong style="color:var(--gold2)">Pairs with:</strong> '+escHtml(p.pairing)+'</div>'
      +(p.notes?'<div style="font-size:11.5px;color:var(--text3);line-height:1.5;font-style:italic">'+escHtml(p.notes)+'</div>':'')
      +'<div style="margin-top:auto;padding-top:8px;border-top:1px dotted var(--border)">'
      +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:4px">USED IN '+recipes.length+' RECIPE'+(recipes.length===1?'':'S')+'</div>'
      +recipePills
      +'</div>'
      +'</div>'
      +'</div>';
  }).join('');
  return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🍯 YOUR HONEY LIBRARY</div></div>'
    +'<div style="font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:14px">Each honey gives mead a distinct character — color, aroma, body, finish. Match the honey to the style: light honeys (acacia, rapeseed) for delicate spice and floral additions; dark honeys (buckwheat, chestnut) for bold bochets and ports. Tap a honey card for detailed brewing notes, food pairings, and recipe links.</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">'+cards+'</div>'
    +'</div>';
}

// ==================== HONEY DETAIL VIEW ====================
// Rich, single-honey page. Uses the optional `details` object if present;
// falls back to base profile fields otherwise. Sections shown only when
// data is available so honeys without rich details still render cleanly.
function renderHoneyDetail(){
  var name=window.currentHoneyName;
  if(!name||!HONEY_PROFILES[name])return renderHoneyLibrary();
  var p=HONEY_PROFILES[name];
  var d=p.details||null;
  var recipes=recipesUsingHoney(name);
  var intensityWidth={'very light':10,'light':25,'medium':50,'bold':75,'very bold':95,'varies':50}[p.intensity]||50;

  // Hero header — big color swatch + name + intensity indicator. Text colour
  // adapts to the honey's luminance so it stays readable on both pale (acacia)
  // and dark (buckwheat, chestnut, sidr) varieties.
  var heroLum=(function(c){
    var m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(c||'').replace(/^var.*/,''));
    if(!m)return 200; // CSS-var or unknown → assume light, use dark text
    return 0.299*parseInt(m[1],16)+0.587*parseInt(m[2],16)+0.114*parseInt(m[3],16);
  })(p.color);
  var heroDark=heroLum<150; // true → dark background → use light text
  var hText=heroDark?'#f4ecd8':'#1a0f08';
  var hDim=heroDark?'rgba(244,236,216,0.75)':'rgba(26,15,8,0.78)';
  var hero='<div style="position:relative;background:linear-gradient(135deg,'+p.color+','+(heroDark?'rgba(0,0,0,0.55)':'rgba(0,0,0,0.28)')+');border-radius:var(--radius);padding:28px 24px;margin-bottom:16px;overflow:hidden">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap">'
    +'<div style="flex:1;min-width:200px">'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:'+hDim+';letter-spacing:2px;margin-bottom:4px">HONEY VARIETY</div>'
    +'<div style="font-family:var(--font-display);font-size:32px;color:'+hText+';letter-spacing:1px;line-height:1.1;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,'+(heroDark?'0.5':'0.12')+')">'+escHtml(name)+'</div>'
    +'<div style="font-family:var(--font-mono);font-size:11px;color:'+hDim+';letter-spacing:1px;margin-top:6px;text-transform:uppercase">'+p.intensity+'</div>'
    +'</div>'
    // Intensity panel: always a dark glass panel with light text, so it reads
    // regardless of how light or dark the honey colour behind it is.
    +'<div style="background:rgba(18,11,4,0.62);backdrop-filter:blur(2px);border:1px solid rgba(255,255,255,0.12);padding:14px 18px;border-radius:var(--radius);min-width:160px">'
    +'<div style="font-family:var(--font-mono);font-size:9px;color:rgba(244,236,216,0.7);letter-spacing:1.5px;margin-bottom:8px">INTENSITY</div>'
    +'<div style="background:rgba(255,255,255,0.16);height:6px;border-radius:3px;overflow:hidden;margin-bottom:6px">'
    +'<div style="background:linear-gradient(90deg,#c9a350,#e8c878);height:100%;width:'+intensityWidth+'%"></div></div>'
    +'<div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:8px;color:rgba(244,236,216,0.65);letter-spacing:1px">'
    +'<span>DELICATE</span><span>BOLD</span></div>'
    +'</div>'
    +'</div>'
    +'</div>';

  // Profile narrative + base pairing/notes
  var profileBlock='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">FLAVOR PROFILE</div></div>'
    +'<div style="font-size:15px;color:var(--text2);line-height:1.7;margin-bottom:12px">'+escHtml(p.profile)+'</div>'
    +'<div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:8px"><strong style="color:var(--gold2)">Pairs with:</strong> '+escHtml(p.pairing)+'</div>'
    +(p.notes?'<div style="font-size:12.5px;color:var(--text3);line-height:1.6;font-style:italic;padding-top:8px;border-top:1px dotted var(--border)">'+escHtml(p.notes)+'</div>':'')
    +'</div>';

  // Quick facts grid — only renders fields that exist
  var quickFactsBlock='';
  if(d){
    var facts=[
      d.origin?{label:'ORIGIN',body:d.origin}:null,
      d.season?{label:'HARVEST SEASON',body:d.season}:null,
      d.crystallization?{label:'CRYSTALLIZATION',body:d.crystallization}:null,
      d.composition?{label:'COMPOSITION',body:d.composition}:null,
      d.agingPotential?{label:'AGING POTENTIAL',body:d.agingPotential}:null,
      d.pricePoint?{label:'PRICE POINT',body:d.pricePoint}:null
    ].filter(Boolean);
    if(facts.length){
      quickFactsBlock='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🔍 QUICK FACTS</div></div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">'
        +facts.map(function(f){return'<div style="background:var(--bg);padding:12px;border-radius:var(--radius);border-left:3px solid '+p.color+'"><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1.5px;margin-bottom:4px">'+f.label+'</div><div style="font-size:12.5px;color:var(--text2);line-height:1.5">'+escHtml(f.body)+'</div></div>';}).join('')
        +'</div></div>';
    }
  }

  // Fermentation data: F:G ratio, fructose-stall risk,
  // crystallisation, YAN/pH offsets — the numbers that actually decide which
  // yeast you need and how the must behaves. Plus a loud, plain-language
  // fructose-stall warning when the honey is fructose-dominant.
  var fermDataBlock='', fructoseWarnBlock='';
  if(p.tech){
    var t=p.tech;
    var riskMeta={low:{c:'var(--green2)',l:'LOW'},medium:{c:'var(--gold2)',l:'MEDIUM'},high:{c:'#e0843c',l:'HIGH'},critical:{c:'var(--red2)',l:'CRITICAL'}}[t.fructoseRisk]||{c:'var(--text3)',l:(t.fructoseRisk||'—').toUpperCase()};
    var crystLabel={very_slow:'Very slow (stays liquid)',slow:'Slow',moderate:'Moderate',fast:'Fast',very_fast:'Very fast (sets in days)'}[t.crystallises]||(t.crystallises||'—');
    function fcell(lbl,val,col){return'<div style="background:var(--bg);padding:11px 12px;border-radius:var(--radius);border-left:3px solid '+(col||p.color)+'"><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:3px">'+lbl+'</div><div style="font-size:13px;color:var(--text);line-height:1.4">'+val+'</div></div>';}
    var cells=[
      fcell('FRUCTOSE : GLUCOSE',(t.fgRatio?t.fgRatio.toFixed(2):'—')+' : 1'),
      fcell('FRUCTOSE-STALL RISK','<span style="color:'+riskMeta.c+';font-weight:600">'+riskMeta.l+'</span>',riskMeta.c),
      fcell('FRUCTOPHILIC YEAST',t.fructophilic?'<span style="color:var(--red2);font-weight:600">REQUIRED</span>':'Not required',t.fructophilic?'var(--red2)':null),
      fcell('CRYSTALLISATION',escHtml(crystLabel)),
      (t.yanOffset?fcell('NITROGEN (YAN) OFFSET','+'+t.yanOffset+' ppm assumed','var(--blue2)'):''),
      (t.phAdjust?fcell('pH SHIFT',(t.phAdjust>0?'+':'')+t.phAdjust+' vs typical must',(t.phAdjust<0?'#e0843c':'var(--blue2)')):'')
    ].filter(Boolean).join('');
    fermDataBlock='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">⚗ FERMENTATION DATA</div></div>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">'+cells+'</div>'
      +'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:10px;line-height:1.5">'+(appLang()==='nl'?'De fructose:glucose-verhouding bepaalt of een normale gist kan afgisten. De meeste stammen eten eerst glucose; een fructoserijke honing laat een trage, fructoserijke staart achter die rond de <strong>1/3-suikerbreuk</strong> kan stilvallen (het punt waarop een derde van de beschikbare suiker op is). Honingdauw/bos- en eucalyptushoning dragen hun eigen stikstof, dus een YAN-correctie wordt automatisch aangenomen.':'The fructose:glucose ratio decides whether a normal yeast can finish. Most strains eat glucose first; a fructose-heavy honey leaves a sluggish, fructose-rich tail that can stall around the <strong>1/3 sugar break</strong> (the point where one third of the available sugar is gone). Honeydew/forest and eucalyptus honeys carry their own nitrogen, so a YAN offset is assumed automatically.')+'</div>'
      +'</div>';
    if(t.fructoseRisk==='high'||t.fructoseRisk==='critical'){
      var crit=(t.fructoseRisk==='critical');
      fructoseWarnBlock='<div class="card" style="margin-bottom:16px;border-left:4px solid '+(crit?'var(--red2)':'#e0843c')+';background:'+(crit?'rgba(176,58,46,0.08)':'rgba(224,132,60,0.07)')+'">'
        +'<div style="display:flex;gap:12px;align-items:flex-start">'
        +'<div style="font-size:22px;line-height:1">'+(crit?'⛔':'⚠')+'</div>'
        +'<div><div style="font-family:var(--font-display);font-size:15px;color:'+(crit?'var(--red2)':'#e0843c')+';margin-bottom:5px">'+(crit?'Fructophilic yeast required':'High fructose — watch the 1/3 break')+'</div>'
        +'<div style="font-size:12.5px;color:var(--text2);line-height:1.65">'+(appLang()==='nl'
          ?escHtml(name)+' is fructose-dominant (F:G ~'+(t.fgRatio?t.fgRatio.toFixed(2):'?')+'). '
            +(crit
              ?'Een standaard glucose-eerst-stam verbruikt de glucose, raakt de fructoserijke rest, en <strong>valt stil rond de 1/3-suikerbreuk</strong>. Gebruik een fructofiele stam — <strong>K1-V1116</strong>, <strong>Fermentis BC-S103</strong>, of <strong>UVAFERM 43</strong> — het is hier niet optioneel.'
              :'Het kan meestal worden afgegist door een robuuste stam zoals <strong>EC-1118</strong> of <strong>K1-V1116</strong>, maar houd de voeding goed getimed en de temperatuur stabiel, en volg de dichtheid nauwlettend richting de 1/3-suikerbreuk voor het geval het vertraagt.')
          :escHtml(name)+' is fructose-dominant (F:G ~'+(t.fgRatio?t.fgRatio.toFixed(2):'?')+'). '
            +(crit
              ?'A standard glucose-first strain will consume the glucose, hit the fructose-heavy remainder, and <strong>stall around the 1/3 sugar break</strong>. Use a fructophilic strain — <strong>K1-V1116</strong>, <strong>Fermentis BC-S103</strong>, or <strong>UVAFERM 43</strong> — it is not optional here.'
              :'It can usually be finished by a robust strain such as <strong>EC-1118</strong> or <strong>K1-V1116</strong>, but keep nutrients well-timed and the temperature steady, and watch gravity closely as it approaches the 1/3 sugar break in case it slows.'))
        +'</div></div></div></div>';
    }
  }

  // Best-styles tag list
  var stylesBlock='';
  if(d&&d.bestStyles&&d.bestStyles.length){
    stylesBlock='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">✦ BEST IN THESE STYLES</div></div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
      +d.bestStyles.map(function(s){return'<span style="background:'+p.color+'22;border:1px solid '+p.color+';color:'+p.color+';padding:6px 12px;border-radius:14px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.5px">'+escHtml(s)+'</span>';}).join('')
      +'</div></div>';
  }

  // Tips & tricks
  var tipsBlock='';
  if(d&&d.tips&&d.tips.length){
    tipsBlock='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">💡 TIPS &amp; TRICKS</div></div>'
      +d.tips.map(function(t,i){return'<div style="display:grid;grid-template-columns:32px 1fr;gap:10px;padding:10px 0'+(i<d.tips.length-1?';border-bottom:1px dotted var(--border)':'')+'">'
        +'<div style="background:'+p.color+'22;border:1px solid '+p.color+'88;color:'+p.color+';border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:11px;font-weight:600">'+(i+1)+'</div>'
        +'<div><div style="font-family:var(--font-display);font-size:13px;color:var(--gold2);margin-bottom:2px">'+escHtml(t.title)+'</div>'
        +'<div style="font-size:12.5px;color:var(--text2);line-height:1.6">'+escHtml(t.body)+'</div></div>'
        +'</div>';}).join('')
      +'</div>';
  }

  // Pairings detail
  var pairingsBlock='';
  if(d&&d.pairings&&d.pairings.length){
    pairingsBlock='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🍽 FOOD &amp; DRINK PAIRINGS</div></div>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px">'
      +d.pairings.map(function(pa){return'<div style="background:var(--bg);padding:10px 12px;border-radius:var(--radius)">'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:'+p.color+';letter-spacing:1.5px;margin-bottom:4px">'+escHtml(pa.category.toUpperCase())+'</div>'
        +'<div style="font-size:12.5px;color:var(--text2);line-height:1.5">'+escHtml(pa.items)+'</div>'
        +'</div>';}).join('')
      +'</div></div>';
  }

  // Common mistakes
  var mistakesBlock='';
  if(d&&d.commonMistakes&&d.commonMistakes.length){
    mistakesBlock='<div class="card" style="margin-bottom:16px;border-left:3px solid var(--red)"><div class="card-header"><div class="card-title">⚠ COMMON MISTAKES</div></div>'
      +'<ul style="margin:0;padding-left:20px;list-style-type:none">'
      +d.commonMistakes.map(function(m){return'<li style="font-size:12.5px;color:var(--text2);line-height:1.6;padding:4px 0;position:relative"><span style="position:absolute;left:-16px;color:var(--red2)">✗</span>'+escHtml(m)+'</li>';}).join('')
      +'</ul></div>';
  }

  // Where to source — pulls from the user's own supplier rolodex
  // (Suppliers view). Suppliers tagged with this honey type appear here
  // automatically; otherwise a hint nudges toward tagging one.
  var suppliersBlock='';
  if(typeof suppliersForHoney==='function'){
    var sup=suppliersForHoney(name);
    if(sup&&sup.length){
      suppliersBlock='<div class="card" style="margin-bottom:16px;border-left:3px solid '+p.color+'"><div class="card-header"><div class="card-title">🛒 WHERE TO SOURCE</div></div>'
        +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:10px">'+(appLang()==='nl'?'Jouw leveranciers die '+escHtml(name)+'-honing voeren:':'Your suppliers stocking '+escHtml(name)+' honey:')+'</div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px">'
        +sup.map(function(s){
          var stars=s.rating?'★'.repeat(s.rating):'';
          return'<div style="background:var(--bg);padding:12px 14px;border-radius:var(--radius);border-top:2px solid '+p.color+'88">'
            +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">'
              +'<span style="background:rgba(232,196,106,0.12);color:var(--gold2);border:1px solid var(--gold2);padding:2px 7px;border-radius:10px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.5px">'+escHtml((s.type||'shop').toUpperCase())+'</span>'
              +'<div style="font-family:var(--font-display);font-size:14px;color:var(--text)">'+escHtml(s.name)+'</div>'
              +(stars?'<span style="color:var(--gold2);font-size:11px">'+stars+'</span>':'')
            +'</div>'
            +(s.location?'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-bottom:6px;letter-spacing:0.3px">'+escHtml(s.location)+(s.hours?' · '+escHtml(s.hours):'')+'</div>':'')
            +(s.notes?'<div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:8px">'+escHtml(s.notes)+'</div>':'')
            +(s.url?'<a href="'+escHtml(s.url)+'" target="_blank" rel="noopener" style="display:inline-block;padding:5px 12px;background:'+p.color+'22;color:'+p.color+';border:1px solid '+p.color+'88;border-radius:14px;font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.5px;text-decoration:none">VISIT SHOP →</a>':'')
            +'</div>';
        }).join('')
        +'</div></div>';
    }else{
      suppliersBlock='<div class="card" style="margin-bottom:16px;border-left:3px solid var(--text3)"><div class="card-header"><div class="card-title">🛒 WHERE TO SOURCE</div></div>'
        +'<div style="font-size:13px;color:var(--text2);line-height:1.6">'
        +(appLang()==='nl'
          ?'Geen van je leveranciers is nog getagd met '+escHtml(name)+'-honing. Voeg leveranciers toe of bewerk ze in de <span style="color:var(--gold2);cursor:pointer;text-decoration:underline" onclick="showView(\'suppliers\')">Leveranciers</span>-weergave en vink de honingsoorten aan die ze voeren om hier inkooptips te zien.'
          :'None of your suppliers are tagged with '+escHtml(name)+' honey yet. Add or edit suppliers in the <span style="color:var(--gold2);cursor:pointer;text-decoration:underline" onclick="showView(\'suppliers\')">Suppliers</span> view and tick the honey types they stock to see sourcing hints here.')
        +'</div></div>';
    }
  }

  // Recipes using this honey
  var recipesBlock='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🍷 USED IN '+recipes.length+' BUILT-IN RECIPE'+(recipes.length===1?'':'S')+'</div></div>';
  if(recipes.length){
    recipesBlock+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">'
      +recipes.map(function(r){
        var recipe=APP.recipes.find(function(x){return x.id===r.id;});
        var style=recipe?recipe.style:'';
        var diff=recipe?recipe.difficulty:'';
        return'<div onclick="currentRecipeId=\''+r.id+'\';showView(\'recipe-detail\')" style="background:var(--bg);padding:10px 12px;border-radius:var(--radius);cursor:pointer;border-left:3px solid '+r.color+';transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
          +'<div style="font-family:var(--font-display);font-size:13px;color:'+r.color+';margin-bottom:2px">'+escHtml(r.name)+'</div>'
          +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1px;text-transform:uppercase">'+escHtml(style)+(diff?' · '+escHtml(diff):'')+'</div>'
          +'</div>';
      }).join('')
      +'</div>';
  }else{
    recipesBlock+='<div style="font-size:13px;color:var(--text3);font-style:italic">This honey is not used in any built-in recipes — but you can substitute it into any recipe where the character fits, or design a custom recipe around it.</div>';
  }
  recipesBlock+='</div>';

  // Recipes where this honey works as an ALTERNATIVE (i.e. not the recipe's
  // primary honey but a viable substitute with a character shift). Especially
  // useful for under-used varieties — Heather, Pine Honeydew, Coffee Blossom,
  // Manuka, Coriander, etc. — so they have a clear path into your batches.
  var alternativeMatches=(typeof recipesAlternativeForHoney==='function')?recipesAlternativeForHoney(name):[];
  var alternativesBlock='';
  if(alternativeMatches.length){
    alternativesBlock='<div class="card" style="margin-bottom:16px;border-left:3px solid '+p.color+'"><div class="card-header"><div class="card-title">✦ ALSO WORKS AS AN ALTERNATIVE IN '+alternativeMatches.length+' RECIPE'+(alternativeMatches.length===1?'':'S')+'</div></div>'
      +'<div style="font-size:13px;color:var(--text3);margin-bottom:12px;line-height:1.6;font-style:italic">'+(appLang()==='nl'?escHtml(name)+' kan de primaire honing in deze recepten vervangen. Elke vermelding beschrijft hoe het karakter verschuift bij de wissel — zodat je weet wat je kunt verwachten voordat je beslist.':escHtml(name)+' can substitute for the primary honey in these recipes. Each entry describes how the character shifts when you make the swap — so you know what to expect before committing.')+'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;align-items:start">'
      +alternativeMatches.map(function(m){
        return'<div onclick="currentRecipeId=\''+m.recipeId+'\';showView(\'recipe-detail\')" style="background:var(--bg);padding:12px 14px;border-radius:var(--radius);cursor:pointer;border-left:3px solid '+m.recipeColor+';transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
          +'<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px;flex-wrap:wrap">'
          +'<div style="font-family:var(--font-display);font-size:14px;color:'+m.recipeColor+'">'+escHtml(m.recipeName)+'</div>'
          +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.2px;text-transform:uppercase">'+escHtml(m.recipeStyle||'')+'</div>'
          +'</div>'
          +'<div style="font-size:12.5px;color:var(--text2);line-height:1.55">'+escHtml(m.shift)+'</div>'
          +'</div>';
      }).join('')
      +'</div></div>';
  }

  // Similar honeys cross-link
  var similarBlock='';
  if(d&&d.similarTo&&d.similarTo.length){
    var validSimilar=d.similarTo.filter(function(n){return HONEY_PROFILES[n.replace(/\s*\(.+\)\s*/,'')];});
    if(validSimilar.length){
      similarBlock='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">↔ SIMILAR HONEYS</div></div>'
        +'<div style="font-size:13px;color:var(--text3);margin-bottom:10px">'+(appLang()==='nl'?'Als je geen '+escHtml(name)+' kunt vinden, hebben deze een verwant karakter:':'If you cannot find '+escHtml(name)+', these have a related character:')+'</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +validSimilar.map(function(simName){
          var cleanName=simName.replace(/\s*\(.+\)\s*/,'');
          var sp=HONEY_PROFILES[cleanName];
          if(!sp)return'';
          return'<div onclick="currentHoneyName=\''+cleanName+'\';showView(\'honey-detail\')" style="background:'+sp.color+'22;border:1px solid '+sp.color+';color:'+sp.color+';padding:6px 14px;border-radius:14px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.5px;cursor:pointer">'+escHtml(simName)+'</div>';
        }).join('')
        +'</div></div>';
    }
  }

  // History narrative
  var historyBlock=d&&d.history?
    '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📜 HISTORY &amp; CONTEXT</div></div>'
    +'<div style="font-size:13px;color:var(--text2);line-height:1.7;font-style:italic">'+escHtml(d.history)+'</div></div>':'';

  // Action buttons
  var actionsBlock='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">'
    +'<button class="btn btn-secondary btn-sm" onclick="showView(\'honey\')">← All Honeys</button>'
    +'<button class="btn btn-primary btn-sm" onclick="openNewBatchModal();setTimeout(function(){var s=document.getElementById(\'nb-honey-type\');if(s){s.value=\''+name+'\';}},200)">＋ Start Batch With '+escHtml(name)+'</button>'
    +'</div>';

  return'<div class="page-title" style="font-size:18px;margin-bottom:0">Honey Library</div>'
    +'<div class="page-subtitle">'+escHtml(name)+(d?' · in depth':'')+'</div>'
    +actionsBlock
    +hero
    +fructoseWarnBlock
    +profileBlock
    +quickFactsBlock
    +fermDataBlock
    +stylesBlock
    +tipsBlock
    +pairingsBlock
    +mistakesBlock
    +suppliersBlock
    +recipesBlock
    +alternativesBlock
    +historyBlock
    +similarBlock;
}

// ==================== YEAST LIBRARY ====================
// Hub page: grid of all strains with quick-glance info. Click → detail.
// Mirrors the Honey Library architecture but with strain-specific fields.
function renderYeastLibrary(){
  // Group cards: dry yeasts vs liquid (currently just WLP720), then by manufacturer
  var dries=YEAST_STRAINS.filter(function(y){return y.format==='dry';});
  var liquids=YEAST_STRAINS.filter(function(y){return y.format!=='dry';});

  function tempBadge(y){
    return '<span style="font-family:var(--font-mono);font-size:10px;color:var(--text2);background:rgba(201,163,80,0.1);padding:2px 7px;border-radius:8px;letter-spacing:0.5px">🌡 '+y.optimalTempLow+'-'+y.optimalTempHigh+'°C</span>';
  }
  function abvBadge(y){
    var col=y.abvMax>=18?'var(--green2)':(y.abvMax>=15?'var(--gold2)':'var(--text3)');
    return '<span style="font-family:var(--font-mono);font-size:10px;color:'+col+';background:rgba(201,163,80,0.1);padding:2px 7px;border-radius:8px;letter-spacing:0.5px">'+y.abvMax+'% max</span>';
  }
  function attBadge(y){
    var label=y.attenuation>=92?'very dry':y.attenuation>=85?'dry':y.attenuation>=80?'medium':'leaves sweet';
    if(typeof appLang==='function'&&appLang()==='nl')label=({'very dry':'zeer droog','dry':'droog','medium':'medium','leaves sweet':'laat zoet'})[label];
    return '<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:rgba(201,163,80,0.1);padding:2px 7px;border-radius:8px;letter-spacing:0.5px">'+y.attenuation+'% · '+label+'</span>';
  }
  function speedBadge(y){
    var iconMap={'very-fast':'⚡⚡','fast':'⚡','medium-fast':'⚡','medium':'•','slow':'∼'};
    var sp=y.speed.replace('-',' ');
    if(typeof appLang==='function'&&appLang()==='nl')sp=({'very fast':'zeer snel','fast':'snel','medium fast':'gemiddeld snel','medium':'gemiddeld','slow':'langzaam'})[sp]||sp;
    return '<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:rgba(201,163,80,0.1);padding:2px 7px;border-radius:8px;letter-spacing:0.5px">'+iconMap[y.speed]+' '+sp+'</span>';
  }

  function card(y){
    var availDot=y.widelyAvailable?'<span title="Commonly stocked by homebrew shops" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green2);margin-right:5px;vertical-align:middle"></span>':y.euAvailable?'<span title="EU available" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--gold2);margin-right:5px;vertical-align:middle"></span>':'<span title="Import only" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--red2);margin-right:5px;vertical-align:middle"></span>';
    return '<div onclick="currentYeastId=\''+y.id+'\';showView(\'yeast-detail\')" style="cursor:pointer;background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:var(--radius);padding:14px 16px;transition:all 0.15s" onmouseover="this.style.background=\'var(--bg3)\';this.style.transform=\'translateX(2px)\'" onmouseout="this.style.background=\'var(--bg2)\';this.style.transform=\'\'">'
      +'<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">'
        +availDot
        +'<div style="font-family:var(--font-display);font-size:15px;color:var(--gold2);letter-spacing:1px;flex:1">'+escHtml(y.name)+'</div>'
        +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px">'+escHtml(y.manufacturer||'').toUpperCase()+'</div>'
      +'</div>'
      +'<div style="font-style:italic;color:var(--text2);font-size:12.5px;margin-bottom:10px;line-height:1.5">'+escHtml(y.profile)+'</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">'+tempBadge(y)+abvBadge(y)+attBadge(y)+speedBadge(y)+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:0.5px;margin-top:8px"><strong style="color:var(--gold2)">BEST FOR:</strong> '+escHtml((y.recommendedFor||[]).slice(0,3).join(' · '))+'</div>'
    +'</div>';
  }

  var legend='<div style="display:flex;gap:14px;font-family:var(--font-mono);font-size:10px;color:var(--text3);margin-bottom:14px;flex-wrap:wrap"><div><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green2);margin-right:4px;vertical-align:middle"></span>Homebrew-shop staple</div><div><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--gold2);margin-right:4px;vertical-align:middle"></span>EU-available</div><div><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--red2);margin-right:4px;vertical-align:middle"></span>Import only</div></div>';

  return'<div class="page-title">Yeast Library</div>'
    +'<div class="page-subtitle">Strain reference · '+YEAST_STRAINS.length+' yeasts · click any card for the deep-dive</div>'
    +legend
    +'<div class="card" style="margin-bottom:16px;background:linear-gradient(180deg,rgba(201,163,80,0.06),transparent);border-left:3px solid var(--gold)">'
      +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:1.5px;margin-bottom:8px">CHOOSING THE RIGHT STRAIN</div>'
      +'<div style="font-size:13px;color:var(--text2);line-height:1.65">Yeast choice shapes flavor more than any other variable in mead-making. Three questions to ask:</div>'
      +'<div style="margin:10px 0 0;padding-left:18px;font-size:13px;color:var(--text2);line-height:1.7">'
        +'<div style="margin-bottom:6px"><strong style="color:var(--gold2)">1. What ABV?</strong> Anything above 14% rules out D47 and 71B (they stall). Above 16% essentially mandates EC-1118 or K1V.</div>'
        +'<div style="margin-bottom:6px"><strong style="color:var(--gold2)">2. What flavors should dominate?</strong> Honey-forward → M05. Fruit → 71B. Floral/honey amp → K1V. Wine-like body → D47. Neutral → EC-1118.</div>'
        +'<div><strong style="color:var(--gold2)">3. What can you control?</strong> Strict 18°C ferment temp → D47 rewards you. Variable basement temps → K1V is forgiving (10-35°C).</div>'
      +'</div>'
    +'</div>'
    +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:2px;margin:18px 0 10px">DRY YEASTS</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(380px,100%),1fr));gap:10px">'
    +dries.map(card).join('')
    +'</div>'
    +(liquids.length?'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:2px;margin:24px 0 10px">LIQUID YEASTS</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(380px,100%),1fr));gap:10px">'+liquids.map(card).join('')+'</div>':'')
    +'<div style="margin-top:24px;padding:14px 18px;background:var(--bg2);border-radius:var(--radius);border-left:3px solid var(--gold2);font-size:13px;color:var(--text2);line-height:1.6">'
      +'<strong style="color:var(--gold2)">SACHET MATH:</strong> One sachet covers up to <em>sachetCoversL</em> liters at standard OG (≤1.090). High-OG batches (sack mead, OG 1.130+) reduce effective coverage — MeadOS computes this automatically in recipe scaling.'
    +'</div>';
}

// Yeast detail page — comprehensive single-strain view. Shows everything in
// the data record, plus cross-references to recipes that recommend this strain.
window.currentYeastId=null;
function renderYeastDetail(){
  var y=getYeastById(window.currentYeastId);
  if(!y)return renderYeastLibrary();
  var _nl=(typeof appLang==='function'&&appLang()==='nl');
  function section(title,body){if(!body)return'';return'<div class="card" style="margin-bottom:14px"><div class="card-header"><div class="card-title">'+title+'</div></div><div style="font-size:13px;color:var(--text2);line-height:1.65">'+body+'</div></div>';}
  function listBlock(items){if(!items||!items.length)return'';return'<ul style="margin:0;padding-left:18px">'+items.map(function(i){return'<li style="margin-bottom:5px">'+escHtml(i)+'</li>';}).join('')+'</ul>';}
  function pillRow(items,color){
    color=color||'var(--gold)';
    return (items||[]).map(function(t){return'<span style="display:inline-block;background:rgba(201,163,80,0.1);border:1px solid '+color+'55;color:var(--text2);padding:3px 10px;border-radius:12px;margin:2px 3px 2px 0;font-size:11.5px">'+escHtml(t)+'</span>';}).join('');
  }

  // Cross-reference: recipes that recommend this yeast
  var recipesUsing=[];
  Object.keys(RECIPE_YEAST_PAIRINGS).forEach(function(rid){
    var p=RECIPE_YEAST_PAIRINGS[rid];
    var r=APP.recipes.find(function(x){return x.id===rid;});
    if(!r)return;
    if(p.recommended.indexOf(y.id)>=0)recipesUsing.push({recipe:r,tier:'recommended'});
    else if(p.acceptable.indexOf(y.id)>=0)recipesUsing.push({recipe:r,tier:'acceptable'});
  });
  var recipesBlock=recipesUsing.length?
    section('USED IN RECIPES',recipesUsing.map(function(r){
      var color=r.tier==='recommended'?'var(--green2)':'var(--gold2)';
      var label=r.tier==='recommended'?'TOP PICK':'ACCEPTABLE';
      return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)"><div onclick="showView(\'recipes\',\''+r.recipe.id+'\')" style="cursor:pointer;flex:1;color:'+(r.recipe.brandColor||'var(--gold2)')+';font-family:var(--font-display);font-size:13px">'+escHtml(r.recipe.name)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:'+color+';letter-spacing:1.5px">'+label+'</div></div>';
    }).join('')):'';

  // Quick-facts side panel
  var quickFacts='<div class="card" style="margin-bottom:14px"><div class="card-header"><div class="card-title">QUICK FACTS</div></div>'
    +'<table style="width:100%;font-size:13px;color:var(--text2)">'
    +'<tr><td style="padding:4px 0;color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;width:130px">MANUFACTURER</td><td>'+escHtml(y.manufacturer)+'</td></tr>'
    +'<tr><td class="kv-key">STRAIN</td><td><em>'+escHtml(y.strain)+'</em></td></tr>'
    +'<tr><td class="kv-key">FORMAT</td><td>'+escHtml(y.format)+(y.sachetSize?' · '+y.sachetSize+'g sachet':' · liquid pouch')+'</td></tr>'
    +'<tr><td class="kv-key">ABV TOLERANCE</td><td><strong style="color:var(--gold2)">'+y.abvMax+'%</strong></td></tr>'
    +'<tr><td class="kv-key">ATTENUATION</td><td><strong>'+y.attenuation+'%</strong> · '+(_nl?(y.attenuation>=92?'gist zeer droog':y.attenuation>=85?'gist droog':y.attenuation>=80?'medium vergisting':'laat restzoetheid'):(y.attenuation>=92?'ferments very dry':y.attenuation>=85?'ferments dry':y.attenuation>=80?'medium attenuation':'leaves residual sweetness'))+'</td></tr>'
    +'<tr><td class="kv-key">OPTIMAL TEMP</td><td>'+y.optimalTempLow+'-'+y.optimalTempHigh+'°C ('+(_nl?'verdraagt':'tolerates')+' '+y.tempToleranceLow+'-'+y.tempToleranceHigh+'°C)</td></tr>'
    +'<tr><td class="kv-key">SPEED</td><td>'+escHtml(_nl?(({'very fast':'zeer snel','fast':'snel','medium fast':'gemiddeld snel','medium':'gemiddeld','slow':'langzaam'})[y.speed.replace('-',' ')]||y.speed.replace('-',' ')):y.speed.replace('-',' '))+'</td></tr>'
    +'<tr><td class="kv-key">FLOCCULATION</td><td>'+escHtml(y.flocculation)+'</td></tr>'
    +'<tr><td class="kv-key">NITROGEN NEED</td><td>'+escHtml(y.nitrogenNeed)+'</td></tr>'
    +'<tr><td class="kv-key">FRUCTOPHILIC</td><td>'+(y.fructophilic?'<strong style="color:var(--green2)">Yes</strong> — finishes high-fructose honey (acacia, tupelo, lavender)':'<span style="color:var(--text3)">No</span> — may stall on fructose-dominant honey')+'</td></tr>'
    +'<tr><td class="kv-key">FLAVOR IMPACT</td><td>'+escHtml(y.flavorImpact)+'</td></tr>'
    +'<tr><td class="kv-key">COVERAGE</td><td>'+y.sachetCoversL+'L per '+(y.sachetSize?'sachet':'pouch')+' (standard OG)</td></tr>'
    +'<tr><td class="kv-key">AVAILABILITY</td><td>'+(y.widelyAvailable?'✓ Common homebrew stock':y.euAvailable?'EU suppliers':'Import only')+'</td></tr>'
    +'</table></div>';

  var hero='<div class="card" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(201,163,80,0.10),transparent);border-left:3px solid var(--gold)">'
    +'<div style="font-family:var(--font-display);font-size:22px;color:var(--gold2);letter-spacing:2px;margin-bottom:4px">'+escHtml(y.name)+'</div>'
    +'<div style="font-style:italic;color:var(--text2);font-size:14px;margin-bottom:12px">'+escHtml(y.profile)+'</div>'
    +'<div style="font-size:13.5px;color:var(--text2);line-height:1.7">'+escHtml(y.description)+'</div>'
    +'</div>';

  return'<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px">'
      +'<div><div class="page-title" style="margin-bottom:4px">'+escHtml(y.name)+'</div><div class="page-subtitle" style="margin-bottom:0">'+escHtml(y.manufacturer)+' · '+y.format+'</div></div>'
      +'<button class="btn btn-secondary btn-sm" onclick="showView(\'yeast-library\')">← All Yeasts</button>'
    +'</div>'
    +'<div class="grid-2">'
      +'<div>'
        +hero
        +section('AROMA EXPECTATIONS',pillRow(y.expectedAromas,'var(--gold)'))
        +section('FLAVOR EXPECTATIONS',pillRow(y.expectedFlavors,'var(--gold2)'))
        +section('WHY CHOOSE',escHtml(y.whyChoose))
        +section('WHY AVOID',escHtml(y.whyAvoid))
        +section('BEST FOR',pillRow(y.recommendedFor,'var(--green2)'))
        +section('NOT RECOMMENDED FOR',pillRow(y.notRecommendedFor,'var(--red2)'))
      +'</div>'
      +'<div>'
        +quickFacts
        +section('BEST PRACTICES',listBlock(y.bestPractices))
        +section('COMMON MISTAKES',listBlock(y.commonMistakes))
        +(y.historicalNotes?section('BACKGROUND','<em>'+escHtml(y.historicalNotes)+'</em>'):'')
        +recipesBlock
      +'</div>'
    +'</div>';
}

// ==================== NUTRIENT LIBRARY ====================
function renderNutrientLibrary(){
  var visible=NUTRIENT_PRODUCTS.filter(function(n){return n.id!=='other';});

  function protocolBadge(n){
    var col=n.protocol==='tosna'?'var(--green2)':n.protocol==='goferm'?'var(--blue2)':'var(--gold2)';
    var label=n.protocol==='tosna'?'TOSNA':n.protocol==='goferm'?'REHYDRATION':'SNA';
    return '<span style="font-family:var(--font-mono);font-size:10px;color:'+col+';background:rgba(201,163,80,0.1);padding:2px 8px;border-radius:8px;letter-spacing:1px">'+label+'</span>';
  }

  function card(n){
    var availDot=n.widelyAvailable?'<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green2);margin-right:5px;vertical-align:middle"></span>':n.euAvailable?'<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--gold2);margin-right:5px;vertical-align:middle"></span>':'<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--red2);margin-right:5px;vertical-align:middle"></span>';
    var pkg=n.sachetSize?n.sachetSize+'g sachet':'bulk powder';
    return '<div onclick="currentNutrientId=\''+n.id+'\';showView(\'nutrient-detail\')" style="cursor:pointer;background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:var(--radius);padding:14px 16px;transition:all 0.15s" onmouseover="this.style.background=\'var(--bg3)\';this.style.transform=\'translateX(2px)\'" onmouseout="this.style.background=\'var(--bg2)\';this.style.transform=\'\'">'
      +'<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">'
        +availDot
        +'<div style="font-family:var(--font-display);font-size:15px;color:var(--gold2);letter-spacing:1px;flex:1">'+escHtml(n.name)+'</div>'
        +protocolBadge(n)
      +'</div>'
      +'<div style="font-style:italic;color:var(--text2);font-size:12.5px;margin-bottom:8px;line-height:1.5">'+escHtml((n.description||'').split('.')[0])+'.</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:0.5px"><strong style="color:var(--gold2)">'+escHtml(pkg.toUpperCase())+'</strong>'+(n.dosagePerL?' · '+n.dosagePerL+' g/L typical':'')+'</div>'
    +'</div>';
  }

  return'<div class="page-title">Nutrient &amp; Protocol Guide</div>'
    +'<div class="page-subtitle">'+visible.length+' products · what each does, when to use it</div>'
    +'<div class="card" style="margin-bottom:18px;background:linear-gradient(180deg,rgba(201,163,80,0.06),transparent);border-left:3px solid var(--gold)">'
      +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:1.5px;margin-bottom:10px">WHY YEAST NUTRIENT MATTERS</div>'
      +'<div style="font-size:13px;color:var(--text2);line-height:1.7">Honey is naturally <strong>nitrogen-deficient</strong> — typically &lt;30 mg/L YAN (Yeast Assimilable Nitrogen) compared to grape must at 150-300 mg/L. Without supplemental nitrogen, yeast stresses, produces hydrogen sulfide (rotten egg smell), fusel alcohols (harsh solvent notes), and may stall before reaching target ABV. Yeast nutrient supplies what honey doesn\'t.</div>'
      +'<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">'
        +'<button class="btn btn-secondary btn-sm" onclick="showView(\'protocol-guide\')">📖 Nutrient Protocols — Full Guide (SNA · TOSNA · TOSCA · TiOSNA)</button>'
      +'</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(380px,100%),1fr));gap:10px;margin-bottom:24px">'
    +visible.map(card).join('')
    +'</div>';
}

window.currentNutrientId=null;
function renderNutrientDetail(){
  var n=NUTRIENT_PRODUCTS.find(function(x){return x.id===window.currentNutrientId;});
  if(!n)return renderNutrientLibrary();
  function section(title,body){if(!body)return'';return'<div class="card" style="margin-bottom:14px"><div class="card-header"><div class="card-title">'+title+'</div></div><div style="font-size:13px;color:var(--text2);line-height:1.65">'+body+'</div></div>';}
  function listBlock(items){if(!items||!items.length)return'';return'<ul style="margin:0;padding-left:18px">'+items.map(function(i){return'<li style="margin-bottom:5px">'+escHtml(i)+'</li>';}).join('')+'</ul>';}
  function pillRow(items,color){
    color=color||'var(--gold)';
    return (items||[]).map(function(t){return'<span style="display:inline-block;background:rgba(201,163,80,0.1);border:1px solid '+color+'55;color:var(--text2);padding:3px 10px;border-radius:12px;margin:2px 3px 2px 0;font-size:11.5px">'+escHtml(t)+'</span>';}).join('');
  }
  // Cross-reference: recipes where this nutrient is a best/also fit
  var recipesUsingN=[];
  if(typeof RECIPE_NUTRIENT_PAIRINGS!=='undefined'){
    Object.keys(RECIPE_NUTRIENT_PAIRINGS).forEach(function(rid){
      var p=RECIPE_NUTRIENT_PAIRINGS[rid];
      var r=APP.recipes&&APP.recipes.find(function(x){return x.id===rid;});
      if(!r)return;
      if((p.recommended||[]).indexOf(n.id)>=0)recipesUsingN.push({recipe:r,tier:'best',eff:(p.effects&&p.effects[n.id])||''});
      else if((p.acceptable||[]).indexOf(n.id)>=0)recipesUsingN.push({recipe:r,tier:'also',eff:(p.effects&&p.effects[n.id])||''});
    });
  }
  // Go-Ferm is a universal rehydration primer, not recipe-specific — note that.
  var recipesBlock=recipesUsingN.length?
    section('USED IN RECIPES',recipesUsingN.map(function(x){
      var color=x.tier==='best'?'var(--green2)':'var(--gold2)';
      var label=x.tier==='best'?'BEST FIT':'ALSO WORKS';
      return '<div style="padding:7px 0;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:10px"><div onclick="showView(\'recipes\',\''+x.recipe.id+'\')" style="cursor:pointer;flex:1;color:'+(x.recipe.brandColor||'var(--gold2)')+';font-family:var(--font-display);font-size:13px">'+escHtml(x.recipe.name)+'</div><div style="font-family:var(--font-mono);font-size:9.5px;color:'+color+';letter-spacing:1.5px">'+label+'</div></div>'+(x.eff?'<div style="font-size:11.5px;color:var(--text3);font-style:italic;line-height:1.5;margin-top:3px">'+escHtml(x.eff)+'</div>':'')+'</div>';
    }).join('')):
    (n.id==='goferm'?section('USED IN RECIPES','<div style="font-size:12.5px;color:var(--text2);line-height:1.6">Go-Ferm is a <strong>rehydration primer used in every recipe</strong>, not a staggered feed — stir it into the warm rehydration water before pitching, then follow each recipe\'s own nutrient schedule.</div>'):'');
  var protLabel=n.protocol==='tosna'?'TOSNA (organic-only)':n.protocol==='goferm'?'Rehydration nutrient':'SNA (staggered)';
  var quickFacts='<div class="card" style="margin-bottom:14px"><div class="card-header"><div class="card-title">QUICK FACTS</div></div>'
    +'<table style="width:100%;font-size:13px;color:var(--text2)">'
    +'<tr><td style="padding:4px 0;color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;width:130px">PROTOCOL</td><td><strong>'+protLabel+'</strong></td></tr>'
    +'<tr><td class="kv-key">COMPOSITION</td><td>'+escHtml(n.composition||'—')+'</td></tr>'
    +'<tr><td class="kv-key">PACKAGING</td><td>'+(n.sachetSize?n.sachetSize+'g sachet':'bulk powder')+'</td></tr>'
    +(n.dosagePerL!=null?'<tr><td class="kv-key">TYPICAL DOSE</td><td><strong>'+n.dosagePerL+' g/L</strong></td></tr>':'')
    +(n.sachetCoversL?'<tr><td class="kv-key">SACHET COVERS</td><td>~'+n.sachetCoversL+'L per sachet</td></tr>':'')
    +'<tr><td class="kv-key">WHEN TO ADD</td><td>'+escHtml(n.whenToAdd||'—')+'</td></tr>'
    +'<tr><td class="kv-key">AVAILABILITY</td><td>'+(n.widelyAvailable?'✓ Common homebrew stock':n.euAvailable?'EU suppliers':'Import only')+'</td></tr>'
    +'</table></div>';
  var hero='<div class="card" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(201,163,80,0.10),transparent);border-left:3px solid var(--gold)">'
    +'<div style="font-family:var(--font-display);font-size:22px;color:var(--gold2);letter-spacing:2px;margin-bottom:8px">'+escHtml(n.name)+'</div>'
    +'<div style="font-size:13.5px;color:var(--text2);line-height:1.7">'+escHtml(n.description)+'</div>'
  +'</div>';
  return'<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px">'
      +'<div><div class="page-title" style="margin-bottom:4px">'+escHtml(n.name)+'</div><div class="page-subtitle" style="margin-bottom:0">'+protLabel+'</div></div>'
      +'<button class="btn btn-secondary btn-sm" onclick="showView(\'nutrient-library\')">← All Nutrients</button>'
    +'</div>'
    +'<div class="grid-2">'
      +'<div>'
        +hero
        +section('WHY CHOOSE',escHtml(n.whyChoose||''))
        +section('WHY AVOID',escHtml(n.whyAvoid||''))
        +section('BEST FOR',pillRow(n.bestFor,'var(--green2)'))
        +section('NOT RECOMMENDED FOR',pillRow(n.notRecommendedFor,'var(--red2)'))
        +recipesBlock
      +'</div>'
      +'<div>'
        +quickFacts
        +section('PRACTICAL TIPS',listBlock(n.tips))
      +'</div>'
    +'</div>';
}

// ==================== NUTRIENT PROTOCOL GUIDE ====================
function renderProtocolGuide(){
  return'<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px">'
      +'<div><div class="page-title" style="margin-bottom:4px">Nutrient Protocols</div><div class="page-subtitle" style="margin-bottom:0">Every mead feeding schedule — SNA, TOSNA, TOSCA 2.0, TiOSNA — explained</div></div>'
      +'<button class="btn btn-secondary btn-sm" onclick="showView(\'nutrient-library\')">← Nutrients</button>'
    +'</div>'
    +'<div class="card" style="margin-bottom:14px;background:linear-gradient(180deg,rgba(201,163,80,0.05),transparent);border-left:3px solid var(--gold)">'
      +'<div style="font-family:var(--font-display);font-size:16px;color:var(--gold2);letter-spacing:1.5px;margin-bottom:10px">The fundamental problem</div>'
      +'<div style="font-size:13.5px;color:var(--text2);line-height:1.7">Honey is a near-pure carbon source. Yeast needs <strong>nitrogen</strong> (for cell wall synthesis), <strong>amino acids</strong> (for enzymes), <strong>vitamins</strong> (B-complex, especially thiamine), and <strong>micronutrients</strong> (magnesium, sterols). A grape harvest delivers all of this naturally — honey delivers almost none. Mead-makers must supplement, and <em>how</em> we supplement defines the protocol.</div>'
    +'</div>'

    +'<div class="grid-2">'
      // SNA card
      +'<div class="card" style="border-left:3px solid var(--gold2)">'
        +'<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px"><div style="font-family:var(--font-display);font-size:20px;color:var(--gold2);letter-spacing:2px">SNA</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1.5px">STAGGERED NUTRIENT ADDITIONS</div></div>'
        +'<div style="font-size:13px;color:var(--text2);line-height:1.65;margin-bottom:12px">The classical mead protocol. 2-3 nutrient doses spread across the first 3-5 days of fermentation, ALL completed before the <strong>1/3 sugar break</strong> (when gravity has dropped ~33% of the way from OG to expected FG). Uses nutrients containing diammonium phosphate (DAP) for fast nitrogen plus organic sources for amino acids.</div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1.5px;margin-bottom:6px">SCHEDULE</div>'
        +'<div style="font-size:12.5px;color:var(--text2);line-height:1.7;padding-left:12px;border-left:1px solid var(--gold);margin-bottom:12px">'
          +'<div><strong>Day 0:</strong> rehydration with Go-Ferm (optional, recommended)</div>'
          +'<div><strong>Day 1 (24h):</strong> half-dose nutrient</div>'
          +'<div><strong>Day 3 (72h):</strong> half-dose nutrient</div>'
          +'<div><strong>Sugar break check:</strong> verify gravity dropped to 1/3 break point. STOP nutrient additions after this.</div>'
        +'</div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1.5px;margin-bottom:6px">PROS</div>'
        +'<ul style="margin:0 0 12px;padding-left:18px;font-size:12.5px;color:var(--text2);line-height:1.6"><li>Simpler — fewer additions to track</li><li>Fast fermentation (DAP = quick nitrogen)</li><li>Compatible with most readily-available nutrients</li><li>Forgiving timing — 1-day window for each dose</li></ul>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--red2);letter-spacing:1.5px;margin-bottom:6px">CONS</div>'
        +'<ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--text2);line-height:1.6"><li>DAP added LATE = fusel alcohols (the harsh "nail polish" off-flavor)</li><li>Requires hydrometer to verify 1/3 break</li><li>Slightly more fermentation heat → more risk of off-flavors in summer</li></ul>'
      +'</div>'
      // TOSNA card
      +'<div class="card" style="border-left:3px solid var(--green2)">'
        +'<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px"><div style="font-family:var(--font-display);font-size:20px;color:var(--green2);letter-spacing:2px">TOSNA</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1.5px">TAILORED ORGANIC SNA</div></div>'
        +'<div style="font-size:13px;color:var(--text2);line-height:1.65;margin-bottom:12px">The "clean ferment" protocol. <strong>4 doses</strong> of purely <strong>organic nitrogen</strong> (Fermaid-O — yeast hulls, no DAP). The slower nitrogen release produces less fermentation heat, fewer fusel alcohols, and ultimately a cleaner, more elegant mead. Created by Sergio Moutela of Mead Made Right.</div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--green2);letter-spacing:1.5px;margin-bottom:6px">SCHEDULE</div>'
        +'<div style="font-size:12.5px;color:var(--text2);line-height:1.7;padding-left:12px;border-left:1px solid var(--green2);margin-bottom:12px">'
          +'<div><strong>Day 0:</strong> Go-Ferm Protect rehydration (primes the yeast — not one of the 4 doses)</div>'
          +'<div><strong>+24 h:</strong> Fermaid-O dose 1</div>'
          +'<div><strong>+48 h:</strong> Fermaid-O dose 2</div>'
          +'<div><strong>+72 h:</strong> Fermaid-O dose 3</div>'
          +'<div><strong>+96 h (or the 1/3 break, whichever is first):</strong> Fermaid-O dose 4 (final)</div>'
        +'</div>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--green2);letter-spacing:1.5px;margin-bottom:6px">PROS</div>'
        +'<ul style="margin:0 0 12px;padding-left:18px;font-size:12.5px;color:var(--text2);line-height:1.6"><li>Cleaner mead — minimal fusel alcohols</li><li>Less fermentation heat → safer in summer</li><li>Late dose is OK (organic nitrogen doesn\'t produce fusels late)</li><li>Showcase-quality results for traditional/show meads</li></ul>'
        +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--red2);letter-spacing:1.5px;margin-bottom:6px">CONS</div>'
        +'<ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--text2);line-height:1.6"><li>Fermaid-O hard to source in Europe (try Baldinger.biz or browin.pl)</li><li>4 additions vs 2-3 — more involved</li><li>Slower fermentation (adds days)</li><li>More precise dosing required (use the TOSCA / TOSNA scheduler in Brewing Tools)</li></ul>'
      +'</div>'
    +'</div>'

    // ---- The other schedules ---------------------------------------------
    +'<div class="card" style="margin-top:14px;margin-bottom:14px">'
      +'<div class="card-header"><div class="card-title">⚡ THE OTHER SCHEDULES</div></div>'
      +'<div style="font-size:13px;color:var(--text2);line-height:1.65;margin-bottom:14px">SNA and TOSNA are the two families. The schedules below are refinements MeadOS also supports — pick any of them from the nutrient dropdown when you start or edit a batch, and the <a onclick="showView(\'tools\')" style="color:var(--gold2);cursor:pointer">TOSCA / TOSNA scheduler</a> in Brewing Tools will compute the exact grams per dose.</div>'
      +'<div class="grid-3">'
        // TOSCA 2.0
        +'<div style="background:var(--bg2);padding:12px;border-radius:var(--radius);border-left:3px solid var(--green2)">'
          +'<div style="font-family:var(--font-display);font-size:15px;color:var(--green2);letter-spacing:1px">TOSCA 2.0</div>'
          +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">TAILORED ORGANIC · REFINED</div>'
          +'<div style="font-size:12.5px;color:var(--text2);line-height:1.6;margin-bottom:8px">TOSNA, but the total nitrogen target is <strong>scaled by two things TOSNA ignores</strong>: your yeast\'s nitrogen demand and the honey\'s colour (darker honey already carries more nitrogen, so it needs less added). The final dose is timed to land exactly on the 1/3 break instead of a fixed 96h.</div>'
          +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text2);line-height:1.7;padding-left:10px;border-left:1px solid var(--green2)">GoFerm rehydrate<br>+24 h · +48 h · +72 h<br>1/3 BREAK (final)</div>'
          +'<div style="font-size:11.5px;color:var(--text3);margin-top:8px;font-style:italic">Best when you want the most tailored, cleanest organic feed.</div>'
        +'</div>'
        // TiOSNA
        +'<div style="background:var(--bg2);padding:12px;border-radius:var(--radius);border-left:3px solid var(--blue2)">'
          +'<div style="font-family:var(--font-display);font-size:15px;color:var(--blue2);letter-spacing:1px">TiOSNA</div>'
          +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">ORGANIC · FRONT-LOADED</div>'
          +'<div style="font-size:12.5px;color:var(--text2);line-height:1.6;margin-bottom:8px">An organic schedule that <strong>front-loads the nitrogen</strong>: the first dose goes in <em>at pitch</em> rather than waiting 24 h, compressing the whole feed into the yeast\'s earliest growth phase. Still organic (Fermaid-O), still ends on the 1/3 break.</div>'
          +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text2);line-height:1.7;padding-left:10px;border-left:1px solid var(--blue2)">GoFerm rehydrate<br>At pitch · +24 h · +48 h<br>1/3 BREAK (final)</div>'
          +'<div style="font-size:11.5px;color:var(--text3);margin-top:8px;font-style:italic">Best for fast-establishing strains and quick, clean ferments.</div>'
        +'</div>'
        // SNA high-gravity
        +'<div style="background:var(--bg2);padding:12px;border-radius:var(--radius);border-left:3px solid var(--gold2)">'
          +'<div style="font-family:var(--font-display);font-size:15px;color:var(--gold2);letter-spacing:1px">SNA · High-Gravity</div>'
          +'<div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">DAP-BEARING · 3 DOSES</div>'
          +'<div style="font-size:12.5px;color:var(--text2);line-height:1.6;margin-bottom:8px">Standard SNA scaled up for big musts. When OG is above <strong>~1.110</strong> the yeast needs roughly <strong>double the total nitrogen</strong>, split across <strong>three</strong> doses instead of two — but every dose still goes in <strong>before the 1/3 break</strong> (DAP late = fusels).</div>'
          +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text2);line-height:1.7;padding-left:10px;border-left:1px solid var(--gold2)">Day 1 · Day 3 · Day 7<br>(all before 1/3 break)</div>'
          +'<div style="font-size:11.5px;color:var(--text3);margin-top:8px;font-style:italic">Best for sack meads, bochets and big melomels (OG &gt; 1.110).</div>'
        +'</div>'
      +'</div>'
    +'</div>'

    // ---- At-a-glance comparison table ------------------------------------
    +'<div class="card" style="margin-bottom:14px">'
      +'<div class="card-header"><div class="card-title">AT A GLANCE</div></div>'
      +'<div style="overflow-x:auto"><table class="data-table" style="font-size:12.5px;min-width:560px">'
        +'<thead><tr><th>Protocol</th><th>Nitrogen</th><th>Doses</th><th>Timing</th><th>Last dose</th><th>Best for</th></tr></thead><tbody>'
        +'<tr><td style="color:var(--gold2)">SNA</td><td>DAP + organic blend</td><td>2</td><td>Day 1, Day 3</td><td>Before 1/3 break</td><td>Beginners, everyday meads</td></tr>'
        +'<tr><td style="color:var(--gold2)">SNA · high-gravity</td><td>DAP + organic blend</td><td>3</td><td>Day 1, 3, 7</td><td>Before 1/3 break</td><td>OG &gt; 1.110 (sack, bochet)</td></tr>'
        +'<tr><td style="color:var(--green2)">TOSNA</td><td>Organic (Fermaid-O)</td><td>4</td><td>+24/48/72/96 h</td><td>+96 h</td><td>Showcase traditionals</td></tr>'
        +'<tr><td style="color:var(--green2)">TOSCA 2.0</td><td>Organic (Fermaid-O)</td><td>4</td><td>+24/48/72 h + break</td><td>On 1/3 break</td><td>Tailored, cleanest result</td></tr>'
        +'<tr><td style="color:var(--blue2)">TiOSNA</td><td>Organic (Fermaid-O)</td><td>4</td><td>Pitch +24/48 h + break</td><td>On 1/3 break</td><td>Fast, front-loaded ferments</td></tr>'
        +'</tbody></table></div>'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:8px;font-style:italic">All five stop feeding nitrogen at the 1/3 sugar break — only the organic schedules (TOSNA/TOSCA/TiOSNA) can safely place a dose right on it. Grams per dose are computed for your batch in the Brewing Tools scheduler.</div>'
    +'</div>'

    +'<div class="card" style="margin-top:14px;margin-bottom:14px">'
      +'<div class="card-header"><div class="card-title">THE 1/3 SUGAR BREAK — WHY IT MATTERS</div></div>'
      +'<div style="font-size:13px;color:var(--text2);line-height:1.7">'
        +'<p style="margin-bottom:10px">As yeast consumes sugar, alcohol accumulates. After roughly 33% of the available sugar is gone, yeast cell walls become alcohol-permeable in a way that changes how they process nitrogen. From this point forward:</p>'
        +'<ul style="margin:0 0 10px;padding-left:18px"><li><strong>DAP-based nutrients become problematic</strong> — late inorganic nitrogen produces excess higher alcohols (fusels) and ester imbalance</li><li><strong>Organic nutrients are still safe</strong> — yeast hulls don\'t spike the same fusel pathway</li><li><strong>Stress recovery is harder</strong> — if your yeast is going to need help, it needs it BEFORE this point</li></ul>'
        +'<p><strong>How to find your 1/3 break:</strong> If OG was 1.100 and expected FG is 1.000, the total gravity drop is 0.100. One third of that is 0.033. So 1/3 break is at SG = 1.100 - 0.033 = <strong>1.067</strong>. Take a gravity reading daily during early fermentation and stop nutrient additions once you hit this number.</p>'
      +'</div>'
    +'</div>'

    +'<div class="card" style="margin-bottom:14px">'
      +'<div class="card-header"><div class="card-title">WHICH ONE SHOULD YOU USE?</div></div>'
      +'<div style="font-size:13px;color:var(--text2);line-height:1.7">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px">'
          +'<div style="background:var(--bg2);padding:12px;border-radius:var(--radius);border-left:3px solid var(--gold2)">'
            +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:1px;margin-bottom:8px">CHOOSE SNA IF...</div>'
            +'<ul style="margin:0;padding-left:18px"><li>You\'re a beginner</li><li>You\'re in Europe and Fermaid-O is hard to source</li><li>You want a simpler protocol</li><li>You\'re making fast-turnaround meads (cysers, light melomels)</li><li>You\'re using MJ Mead Yeast Nutrient or Vinoferm Nutrivit</li></ul>'
          +'</div>'
          +'<div style="background:var(--bg2);padding:12px;border-radius:var(--radius);border-left:3px solid var(--green2)">'
            +'<div style="font-family:var(--font-display);font-size:14px;color:var(--green2);letter-spacing:1px;margin-bottom:8px">CHOOSE TOSNA IF...</div>'
            +'<ul style="margin:0;padding-left:18px"><li>You\'re making showcase traditional meads</li><li>You want the cleanest possible character</li><li>You can source Fermaid-O</li><li>You\'re fermenting in warm conditions (TOSNA stays cooler)</li><li>You\'re doing long-aging styles (sack mead, bochet)</li></ul>'
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>'

    +'<div class="card" style="margin-bottom:14px">'
      +'<div class="card-header"><div class="card-title">REHYDRATION — THE FORGOTTEN STEP</div></div>'
      +'<div style="font-size:13px;color:var(--text2);line-height:1.7">'
        +'<p style="margin-bottom:10px">Both protocols benefit from <strong>Go-Ferm Protect rehydration</strong>. This is a separate step from must nutrients — it provides sterols and unsaturated fatty acids that dry yeast cells need to rebuild their membranes during the lag phase.</p>'
        +'<div style="background:var(--bg2);padding:12px;border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:10px">'
          +'<strong>1.</strong> Mix Go-Ferm at <strong>1.25× yeast weight</strong> in 43°C water<br>'
          +'<strong>2.</strong> Cool to 35°C (warm tap)<br>'
          +'<strong>3.</strong> Sprinkle dry yeast on surface, wait 15 min<br>'
          +'<strong>4.</strong> Stir gently, wait 5 more min<br>'
          +'<strong>5.</strong> Temper to must temp by adding small amounts of must every 5 min until within 5°C<br>'
          +'<strong>6.</strong> Pitch into the fermenter'
        +'</div>'
        +'<p>Without Go-Ferm: ~50% yeast viability after 30 min in 25°C water. With Go-Ferm: ~95% viability. The difference between a slow start and a confident, clean fermentation.</p>'
      +'</div>'
    +'</div>';
}

// ==================== SETTINGS ====================
function renderSettings(){
  return'<div class="page-title">Settings</div><div class="page-subtitle">Configuration &amp; Data Management</div>'
    +'<div class="grid-2">'
    +'<div>'
    +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🗄 SERVER DATA · SQLITE</div></div>'
    +'<div class="info-box green" style="margin-bottom:14px"><div style="font-size:13px;color:var(--green2)"><strong>Shared storage.</strong> All data lives server-side in an SQLite database (<code>meados.db</code>) managed by <code>server.py</code>. Every browser that opens this page reads and writes the same data — nothing to configure per device.</div></div>'
    +'<div class="form-group"><label class="form-label">Brewer Name (optional)</label><input class="form-input" id="set-brewer" type="text" placeholder="Your meadery name" value="'+escHtml(APP.settings.brewerName||'')+'"></div>'
    +'<div class="form-group"><label class="form-label">Language · Taal</label><select class="form-select" id="set-lang" onchange="setAppLang(this.value)"><option value="en"'+(appLang()==='en'?' selected':'')+'>English</option><option value="nl"'+(appLang()==='nl'?' selected':'')+'>Nederlands</option></select>'
    +'<div style="font-size:12px;color:var(--text3);margin-top:4px">Interface chrome, bottle labels and the public share page.</div></div>'
    +'<div class="form-group"><label class="form-label">Public URL <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">optional — for reverse proxies</span></label><input class="form-input" id="set-external-url" type="text" placeholder="https://mead.example.com" value="'+escHtml(APP.settings.externalUrl||'')+'">'
    +'<div style="font-size:12px;color:var(--text3);margin-top:4px">Share links and QR codes are built from this address instead of the URL you happen to be browsing on. Set it when the server sits behind a reverse proxy or is reachable under several hostnames. Leave blank to use the current address. Applies to all devices.</div></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="btn btn-primary" onclick="saveHASettings()">Save</button>'
    +'<button class="btn btn-secondary" onclick="forceSyncNow()" title="Push local data to the server">⬆ Sync Now</button>'
    +'<button class="btn btn-secondary" onclick="pullFromServer()" title="Replace local data with whatever the server has — useful if another device changed things">⬇ Reload from Server</button>'
    +'<button class="btn btn-secondary" onclick="verifyServerStorage()">Verify Storage</button></div>'
    +'<div id="conn-status" style="margin-top:10px;font-size:13px;color:var(--text3)"></div>'
    +'<div style="margin-top:14px;padding:12px;background:var(--bg);border-radius:var(--radius);border-left:3px solid var(--border2)">'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">🔒 EXTERNAL ACCESS PASSWORD</div>'
    +'<div id="security-status" style="font-size:12.5px;color:var(--text3)">Checking…</div>'
    +'</div>'
    +(lastSyncMeta&&lastSyncMeta.ts?'<div style="margin-top:14px;padding:10px;background:var(--bg4);border-radius:var(--radius);font-family:var(--font-mono);font-size:11px;color:var(--text3)">'
      +'<div>📊 LAST SYNC · '+fmtDateTime(lastSyncMeta.ts)+'</div>'
      +'<div>Mode: <span style="color:var(--text2)">'+lastSyncMeta.mode+'</span></div>'
      +'<div>Size: <span style="color:var(--text2)">'+(lastSyncMeta.bytes/1024).toFixed(1)+' KB</span></div>'
      +'<div>Status: <span style="color:'+(lastSyncMeta.ok?'var(--green2)':'var(--red2)')+'">'+(lastSyncMeta.ok?'✓ '+(lastSyncMeta.detail||'OK'):'✗ '+(lastSyncMeta.detail||'failed'))+'</span></div>'
      +'</div>':'')
    +renderStorageBudgetCard()
    +'</div>'
    +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🏠 HOME ASSISTANT · OPTIONAL</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.55">Completely optional — MeadOS runs fully standalone. Connect a Home Assistant instance to read live temperature &amp; hydrometer sensors, send push notifications via the companion app, browse HA media for label images, and publish a status summary for the dashboard card below.</div>'
    +(function(){
      // Token rotation reminder. If the token decodes as a JWT with an exp
      // claim, show a status pill. <90 days = warning; <30 = critical.
      var info=(typeof getActiveTokenExpiry==='function')?getActiveTokenExpiry():null;
      if(!info)return'';
      var fmtExp=info.expDate.toLocaleDateString(_dloc(),{day:'2-digit',month:'short',year:'numeric'});
      var styles={
        expired:  {bg:'rgba(200,48,32,0.15)',border:'var(--red)',  icon:'⛔',label:'Token EXPIRED on '+fmtExp,sub:'Sensor reads and notifications will fail until you replace it. Generate a new long-lived token in HA → Profile → Security → Long-Lived Access Tokens and paste it below.'},
        critical: {bg:'rgba(200,160,32,0.15)',border:'var(--gold)', icon:'⚠',label:'Token expires in '+info.daysLeft+' day'+(info.daysLeft===1?'':'s')+' ('+fmtExp+')',sub:'Rotate soon. Generate a fresh long-lived token in HA → Profile → Security → Long-Lived Access Tokens.'},
        warning:  {bg:'rgba(200,160,32,0.10)',border:'var(--gold2)',icon:'⌚',label:'Token expires in '+info.daysLeft+' days ('+fmtExp+')',sub:'No action needed yet — but plan a rotation within the next few weeks.'},
        ok:       {bg:'rgba(122,160,64,0.10)',border:'var(--green2)',icon:'✓',label:'Token valid until '+fmtExp+' ('+info.daysLeft+' days)',sub:'No action needed.'}
      };
      var s=styles[info.status]||styles.ok;
      return'<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:'+s.bg+';border-left:3px solid '+s.border+';border-radius:var(--radius);margin-bottom:14px;font-size:12.5px">'
        +'<div style="font-size:18px;line-height:1">'+s.icon+'</div>'
        +'<div><div style="font-weight:600;color:var(--text);margin-bottom:2px">'+escHtml(s.label)+'</div>'
        +'<div style="color:var(--text3);font-style:italic;line-height:1.5">'+s.sub+'</div></div></div>';
    }())
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.6;padding:8px 12px;background:var(--bg);border-left:2px solid var(--green2);border-radius:var(--radius)">The <strong>MeadOS server</strong> talks to Home Assistant on your behalf, so there\'s no browser CORS setup and no mixed-content issue — just make sure the MeadOS server can reach the HA URL below.</div>'
    +'<div class="form-group"><label class="form-label">HA URL — internal / LAN</label><input class="form-input" id="set-url" type="text" placeholder="http://192.168.x.x:8123 (any port works)" value="'+escHtml(APP.settings.haUrl||'')+'"></div>'
    +'<div class="form-group"><label class="form-label">HA URL — external <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">optional</span></label><input class="form-input" id="set-url-external" type="text" placeholder="https://xyz.ui.nabu.casa or https://ha.yourdomain.com" value="'+escHtml(APP.settings.haUrlExternal||'')+'">'
    +'<div style="font-size:12px;color:var(--text3);margin-top:4px">The MeadOS server tries the internal URL first, then the external one. Either field may be left blank.</div></div>'
    +'<div class="form-group"><label class="form-label">Long-Lived Access Token</label><input class="form-input" id="set-token" type="password" autocomplete="off" placeholder="'+(APP._haTokenSet?'•••••••• stored — leave blank to keep it':'HA → Profile → Security → Long-Lived Access Tokens')+'" value="">'
    +'<div style="font-size:12px;color:var(--text3);margin-top:4px">Stored on the MeadOS server only and used via a server-side proxy — it is never sent to other devices or saved in the synced data.'+(APP._haTokenSet?' <a href="#" onclick="clearHAToken();return false" style="color:var(--red2)">Clear stored token</a>':'')+'</div></div>'
    +'<div class="form-group"><label style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text2);cursor:pointer"><input type="checkbox" id="set-useha" '+(APP.settings.useHA?'checked':'')+' style="cursor:pointer"> Enable Home Assistant integration</label></div>'
    +'<div class="form-group"><label style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text2);cursor:pointer"><input type="checkbox" id="set-publish-summary" '+(APP.settings.haPublishSummary?'checked':'')+' style="cursor:pointer"> Publish status summary to <code style="font-size:12px">sensor.meadows_data</code> on every save</label></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" onclick="saveHASettings()">Save &amp; Test</button>'
    +'<button class="btn btn-secondary" onclick="testConnection()">Test Connection</button></div>'
    +'<div id="ha-conn-status" style="margin-top:10px;font-size:13px;color:var(--text3)"></div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🌡 TEMPERATURE SENSORS</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.55">Bind Home Assistant sensor entities so live temperatures show up across the app. Requires the optional Home Assistant connection above. All fields are optional — leave any blank to hide the corresponding display.</div>'
    +'<div class="form-group"><label class="form-label">Fallback fermentation sensor <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">used when a fermenter has no specific binding</span></label><input class="form-input" id="set-temp" type="text" placeholder="sensor.fermentation_temperature" value="'+escHtml(APP.settings.tempSensorEntity||'')+'" style="font-family:var(--font-mono);font-size:12px">'
    +'<div style="font-size:11.5px;color:var(--text3);margin-top:4px;line-height:1.5">Drives the top-bar temp pill and the gravity-log auto-populate when a fermenter has no specific sensor configured. Optimal for M05: 18-22°C.</div></div>'
    +'<div class="form-group"><label class="form-label">Cellar / aging-room sensor <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">storage temperature for bottled mead</span></label><input class="form-input" id="set-cellar-temp" type="text" placeholder="sensor.cellar_temperature (leave blank to hide)" value="'+escHtml(APP.settings.cellarTempSensorEntity||'')+'" style="font-family:var(--font-mono);font-size:12px">'
    +'<div style="font-size:11.5px;color:var(--text3);margin-top:4px;line-height:1.5">Legacy fallback, used only when no cabinet in My Cellar has its own sensor. Prefer binding sensors per cabinet (My Cellar → Configure). Ideal cellar: 10-14°C, stable.</div></div>'
    +'<div style="padding:10px 12px;background:var(--bg);border-radius:var(--radius);font-size:11.5px;color:var(--text3);line-height:1.5;border-left:2px solid var(--gold2)"><strong style="color:var(--gold2)">Per-fermenter bindings:</strong> Each fermenter can have its own sensor — edit a fermenter (in the FERMENTERS card below) to set its <code style="font-family:var(--font-mono);font-size:10px">tempSensorEntity</code>. Per-fermenter bindings take priority over the fallback above.</div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🔔 PUSH NOTIFICATIONS</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Optional. Get phone notifications when brewing steps are due, via the HA Companion App. Requires the Home Assistant connection above.</div>'
    +'<div class="form-group"><label class="form-label">Notification Service</label><input class="form-input" id="set-notify" type="text" placeholder="mobile_app_kim_phone" value="'+escHtml(APP.settings.notificationService||'')+'">'
    +'<div style="font-size:12px;color:var(--text3);margin-top:4px">HA service name (without <code>notify.</code> prefix). Find in HA → Developer Tools → Services → Search for <code>notify.</code></div></div>'
    +'<div class="form-group"><label style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text2);cursor:pointer"><input type="checkbox" id="set-notif-enabled" '+(APP.settings.notificationsEnabled?'checked':'')+' style="cursor:pointer"> Enable daily brewing notifications</label></div>'
    +'<button class="btn btn-secondary btn-sm" onclick="testNotification()">Send Test Notification</button></div>'
    +(function(){
      // Calendar feed — HA-free reminders. Subscribe any phone/desktop calendar
      // to a private .ics URL; no Home Assistant required.
      var tok=getCalendarToken();
      var head='<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📅 CALENDAR FEED</div></div>'
        +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.55">Subscribe your phone or desktop calendar to your brewing schedule — nutrient doses, racking, bottling and ready/peak dates show up as all-day reminders. No Home Assistant needed. The link is private (an unguessable token); anyone with it can read your schedule, so don\'t post it publicly.</div>';
      if(!tok){
        return head+'<button class="btn btn-primary btn-sm" onclick="enableCalendarFeed()">Enable calendar feed</button></div>';
      }
      var webcal=calendarFeedUrl('webcal'), https=calendarFeedUrl();
      return head
        +'<div class="form-group"><label class="form-label">Subscribe URL</label>'
        +'<input class="form-input" readonly onclick="this.select()" value="'+escHtml(https)+'" style="font-family:var(--font-mono);font-size:12px"></div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">'
        +'<a class="btn btn-primary btn-sm" href="'+escHtml(webcal)+'">＋ Subscribe (one-tap)</a>'
        +'<button class="btn btn-secondary btn-sm" onclick="navigator.clipboard&&navigator.clipboard.writeText(\''+https.replace(/'/g,"\\'")+'\');toast(\'✦ Calendar URL copied\')">Copy URL</button>'
        +'<button class="btn btn-danger btn-sm" onclick="if(confirm(\'Disable the feed? The current link will stop working.\'))disableCalendarFeed()">Disable</button>'
        +'</div>'
        +'<div style="font-size:11.5px;color:var(--text3);line-height:1.55">Apple Calendar / Google Calendar / Outlook: add a calendar <em>by URL</em> and paste the link above. It refreshes whenever you save changes in MeadOS.</div>'
        +'</div>';
    }())
    +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">💰 COSTS &amp; SUPPLIES</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Optional defaults for cost tracking and sachet-based ingredient hints. Changes save automatically.</div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Default Honey Price (per kg)</label><input class="form-input" id="set-honey-price" type="number" step="0.1" value="'+(APP.settings.honeyPricePerKg||'')+'" placeholder="12" onchange="saveCostsSettings()"></div>'
    +'<div class="form-group"><label class="form-label">Currency</label><select class="form-select" id="set-currency" onchange="saveCostsSettings()">'
    +['€','$','£','CHF','SEK','NOK','DKK'].map(function(c){return'<option'+(APP.settings.currency===c?' selected':'')+'>'+c+'</option>';}).join('')
    +'</select></div>'
    +'<div class="form-group"><label class="form-label">Nutrient Sachet Size (g)</label><input class="form-input" id="set-sachet" type="number" step="0.5" value="'+(APP.settings.sachetSize||12)+'" placeholder="12" onchange="saveCostsSettings()"></div></div>'
    +'<div class="form-group"><label class="form-label">Preferred Sanitizer</label><select class="form-select" id="set-sanitizer" onchange="saveCostsSettings()">'
    +Object.keys(SANITIZERS).map(function(k){return'<option value="'+k+'"'+(((APP.settings.sanitizer||'chemipro_san')===k)?' selected':'')+'>'+SANITIZERS[k].name+' · '+SANITIZERS[k].mlPerL+' ml/L</option>';}).join('')
    +'</select><div style="font-size:12px;color:var(--text3);margin-top:4px">Used by the Brewing Tools calculator, brew-day checklists, and the bottling workflow.</div></div>'
    +'<div style="font-size:12px;color:var(--text3)">M.J. Mead Yeast Nutrient sachets vary by SKU — current default 12g. The app shows nutrient amounts as both grams and sachet count throughout.</div>'
    +'<div style="margin-top:14px;padding:12px;background:var(--bg);border-radius:var(--radius);border-left:3px solid var(--gold)">'
    +'<label style="display:flex;align-items:center;gap:10px;cursor:pointer">'
    +'<input type="checkbox" id="set-auto-deduct" '+(APP.settings.autoDeductSupplies===false?'':'checked')+' onchange="saveCostsSettings()" style="width:16px;height:16px;accent-color:var(--gold)">'
    +'<span style="flex:1"><strong style="color:var(--gold2);font-size:13px">Auto-deduct supplies when starting a batch</strong>'
    +'<div style="font-size:11.5px;color:var(--text3);margin-top:2px;line-height:1.5">When you create a new batch, MeadOS will automatically subtract the honey (matched by variety), 1 yeast packet, and the nutrient amount from your tracked supplies. Skipped silently if no matching supply exists.</div></span></label>'
    +'</div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🧭 ADVISOR</div></div>'
    +'<div class="form-group"><label class="form-label">Explanation level</label><select class="form-select" id="set-advisor-verbosity" onchange="saveAdvisorVerbosity()">'
    +[['beginner','Beginner — explain everything'],['experienced','Experienced (default)'],['pro','Pro — headlines only']].map(function(o){return'<option value="'+o[0]+'"'+((APP.settings.advisorVerbosity||'experienced')===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')
    +'</select><div style="font-size:12px;color:var(--text3);margin-top:4px">Beginner always explains why a recommendation matters; Pro shows just the headline. Either way, only the top few recommendations show by default — the rest sit behind a "+N more" toggle.</div></div>'
    +'</div>'
    +renderFermentersCard()
    +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🏠 HA COMPANION CARD</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:6px">A rich Lovelace card you can paste into any HA dashboard. Shows your active batches, fermenter status, drinking-window alerts, next milestone, and a button to open MeadOS — all reading from <code style="background:var(--bg);padding:1px 4px;border-radius:3px;font-size:11px">sensor.meadows_data</code> attributes that MeadOS publishes on every save — requires the Home Assistant connection above with “Publish status summary” enabled.</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:14px;font-style:italic">Uses only built-in HA cards (markdown, glance, button, conditional) — no HACS dependencies required.</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="btn btn-primary" onclick="downloadLovelaceCard()">⬇ Download YAML</button>'
    +'<button class="btn btn-secondary" onclick="copyLovelaceCard()">📋 Copy to Clipboard</button>'
    +'<button class="btn btn-secondary" onclick="previewLovelaceCard()">👁 Preview YAML</button>'
    +'</div>'
    +'<div style="margin-top:12px;padding:10px;background:var(--bg);border-radius:var(--radius);border-left:3px solid var(--gold);font-size:12px;color:var(--text2);line-height:1.6">'
    +'<strong style="color:var(--gold2)">How to use:</strong><br>'
    +'1. Click <strong>Copy to Clipboard</strong> above.<br>'
    +'2. In HA, open your dashboard → <strong>Edit Dashboard</strong> → <strong>+ Add Card</strong> → <strong>Manual</strong>.<br>'
    +'3. Paste, save. Done.'
    +'</div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">DATA BACKUP</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:16px">Export all data as JSON for backup, or as CSV for spreadsheet analysis.</div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
    +'<button class="btn btn-secondary" onclick="exportData()">Export Backup</button>'
    +'<button class="btn btn-secondary" onclick="document.getElementById(\'import-file\').click()">Import Backup</button>'
    +'<button class="btn btn-secondary" onclick="exportBatchesCSV()" title="One row per batch">⬇ Batches CSV</button>'
    +'<button class="btn btn-secondary" onclick="exportGravityCSV()" title="One row per gravity reading">⬇ Gravity logs CSV</button>'
    +'<input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(event)"></div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🧹 UNUSED IMAGES</div><button class="btn btn-secondary btn-sm" onclick="scanOrphanImages()">Scan</button></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:8px;line-height:1.55">Uploaded label, brand, and photo images are stored as files on the server (under <code style="font-size:11px">assets/</code>). Over time some stop being referenced by any batch or recipe. Scan to find those orphans and free the space — version history is checked too, so nothing a restorable snapshot still needs is removed.</div>'
    +'<div id="orphan-result" style="font-size:13px;color:var(--text3)">Click <strong>Scan</strong> to check for unused images.</div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">VERSION HISTORY</div><button class="btn btn-secondary btn-sm" onclick="loadHistoryPanel()">↻ Refresh</button></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">The server keeps your recent saved snapshots. Restore one if something got messed up — restoring first saves the current state, so it\'s reversible.</div>'
    +'<div id="history-list" style="font-size:13px;color:var(--text3)">Click <strong>Refresh</strong> to load snapshots.</div></div>'
    +'</div>'
    +'<div>'
    +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">BRAND IDENTITY</div></div>'
    +'<div style="text-align:center" id="brand-logo-preview">'
    +(APP.settings.brandLogo
        ?'<img src="'+escHtml(getResolvedMediaUrl(APP.settings.brandLogo)||APP.settings.brandLogo)+'" style="width:200px;height:200px;object-fit:contain;display:block;margin:0 auto" alt="Custom brand logo">'
        :brandCrestSVG(260))
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-top:12px;justify-content:center">'
    +'<button class="btn btn-secondary btn-sm" onclick="pickBrandLogo()">🖼 '+(APP.settings.brandLogo?'Change logo…':'Use custom logo…')+'</button>'
    +(APP.settings.brandLogo?'<button class="btn btn-secondary btn-sm" onclick="clearBrandLogo()">Restore default</button>':'')
    +'</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-top:10px;text-align:center;font-style:italic">'
    +(APP.settings.brandLogo?'Custom brand logo · shown in the topbar and dashboard.':'Default heraldic crest. Upload a custom image to replace it everywhere.')
    +'</div></div>'
    +'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">🌐 SHARING &amp; HOSTING</div></div>'
    +'<div style="font-size:14px;color:var(--text2);line-height:1.8">'
    +'<strong>Run the server:</strong> <code style="background:var(--bg4);padding:2px 6px;border-radius:3px;font-family:var(--font-mono);font-size:12px">python3 server.py</code> — serves this app and stores all data in <code style="background:var(--bg4);padding:2px 6px;border-radius:3px;font-family:var(--font-mono);font-size:12px">meados.db</code> (SQLite).<br><br>'
    +'<strong>Share with others:</strong> anyone who can reach the machine opens <code style="background:var(--bg4);padding:2px 6px;border-radius:3px;font-family:var(--font-mono);font-size:12px">http://&lt;host&gt;:8080</code> and sees the same shared data.<br><br>'
    +'<strong>Backup:</strong> copy <code style="background:var(--bg4);padding:2px 6px;border-radius:3px;font-family:var(--font-mono);font-size:12px">meados.db</code>, or use Export Backup on the left. The server also keeps the last 50 saves in a history table.<br><br>'
    +'<strong>Embed in Home Assistant (optional):</strong> add a Webpage/iframe card pointing at this app\'s URL.'
    +'</div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">DANGER ZONE</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:16px">Permanently delete all batches, logs, and settings. Cannot be undone.</div>'
    +'<button class="btn btn-danger" onclick="resetAllData()">Reset All Data</button></div>'
    +renderSourcesCard()
    +'</div></div>'
    +'<div style="text-align:center;font-size:11px;color:var(--text3);margin:26px 0 6px;line-height:1.8">MEADŌS · © 2026 <a href="https://github.com/icemanxbe/MeadOS" target="_blank" rel="noopener" style="color:var(--gold2);text-decoration:none">icemanxbe</a><br><a href="https://github.com/icemanxbe/MeadOS/blob/main/LICENSE" target="_blank" rel="noopener" style="color:var(--text3)">PolyForm Noncommercial License 1.0.0</a> — free to use &amp; modify, not to sell</div>';
}

// ==================== SOURCES & CREDITS (Settings card) ====================
// None of MeadOS's brewing maths was invented from scratch — every formula
// traces back to a public reference or another project's published work.
// Listed here (and mirrored in the wiki's Formulas & Methods page) so credit
// goes where it's due, not just buried in code comments.
function renderSourcesCard(){
  var nl=(typeof appLang==='function'&&appLang()==='nl');
  function row(title,body){
    return '<div style="padding:10px 0;border-bottom:1px solid var(--border)">'
      +'<div style="font-family:var(--font-display);font-size:13.5px;color:var(--gold2);margin-bottom:3px">'+title+'</div>'
      +'<div style="font-size:12.5px;color:var(--text2);line-height:1.6">'+body+'</div></div>';
  }
  var link=function(url,label){return '<a href="'+url+'" target="_blank" rel="noopener" style="color:var(--gold2)">'+label+'</a>';};
  var rows=[
    row(nl?'Honing-, gist- en voedingsbibliotheek':'Honey, yeast &amp; nutrient library data',
      (nl?'Onze profielen zijn ter controle vergeleken met de gepubliceerde honing-, gist- en voedingskennis van ':'Our profiles were cross-referenced for parity against the published honey, yeast and nutrient knowledge from ')
        +link('https://www.wyvernmeadery.com/','Wyvern Meadery')+(nl?', inclusief hun TOSCA 2.0-voedingsconstanten.':', including their TOSCA 2.0 nutrient-dosing constants.')),
    row(nl?'Kernformules (bierpunten, ABV, vergisting)':'Core brewing maths (gravity points, ABV, attenuation)',
      (nl?'Standaard homebrouw-formules, zoals beschreven door':'Standard homebrewing formulas, as described by')+' John Palmer, <em>'+link('https://www.howtobrew.com/','How to Brew')+'</em>.'),
    row('TOSNA 2.0',
      (nl?'Het gefaseerde, organische voedingsprotocol, gepopulariseerd door':'The staggered, organic-only nutrient protocol, popularised by')+' Matt Williams / '+link('https://meadmakr.com/','MeadMakr')+'.'),
    row(nl?'Honing/vrucht-°Brix zwaartekrachtmodel &amp; gistafhankelijke stikstofschaal':'Honey/fruit °Brix gravity model &amp; yeast-tier nutrient scaling',
      (nl?'Het idee om elk ingrediënt zijn eigen °Brix-bijdrage te geven (in plaats van aan te nemen dat honing alles levert), en om de gist\'s eigen stikstofbehoefte de voedingsdosis te laten sturen, is geïnspireerd op ':'The approach of giving every ingredient its own °Brix contribution (rather than assuming honey supplies all of it), and letting the yeast\'s own nitrogen demand drive the nutrient dose, is inspired by ')
        +link('https://meadtools.com/','MeadTools')+' (open-source: '+link('https://github.com/ljreaux/MeadTools','github.com/ljreaux/MeadTools')+'). '
        +(nl?'Hun eigen ingrediëntendatabase put op zijn beurt uit de ':'Their own ingredient database in turn draws on the ')+link('https://fdc.nal.usda.gov/','USDA FoodData Central')+(nl?' data van de Amerikaanse overheid.':' public database.')),
    row(nl?'Moleculaire SO₂':'Molecular SO₂',
      (nl?'De pH-afhankelijke dissociatie van zwaveligzuur (pKa₁ ≈ 1,81), zoals gebruikt in wijnbouwreferenties.':'The pH-dependent dissociation of sulfurous acid (pKa₁ ≈ 1.81), as used across winemaking references.')),
    row(nl?'SG ↔ Brix &amp; hydrometer-temperatuurcorrectie':'SG ↔ Brix &amp; hydrometer temperature correction',
      (nl?'De standaard NIST-dichtheids- en refractometrie-polynomen.':'The standard NIST density and refractometry polynomials.')),
    row(nl?'Refractometer-alcoholcorrectie':'Refractometer alcohol correction',
      'Sean Terrill\'s cubic fit.'),
    row(nl?'Restkoolzuur bij bottelen (priming)':'Priming-sugar residual CO₂',
      (nl?'Het standaard temperatuurpolynoom dat vrijwel elke priming-calculator gebruikt.':'The standard temperature polynomial used by nearly every priming calculator.'))
  ].join('');
  return '<div class="card"><div class="card-header"><div class="card-title">📚 '+(nl?'BRONNEN &amp; DANK':'SOURCES &amp; CREDITS')+'</div></div>'
    +'<div style="font-size:12.5px;color:var(--text3);font-style:italic;margin-bottom:4px;line-height:1.55">'
    +(nl?'Geen van de rekenmodellen hieronder is door MeadOS zelf bedacht — elk bouwt voort op gepubliceerd werk. Zie ook de ':'None of the maths below is original to MeadOS — every model builds on published work. See also the ')
    +link('https://github.com/icemanxbe/MeadOS/wiki/Formulas-and-Methods',(nl?'wiki (Formules &amp; Methoden)':'wiki (Formulas &amp; Methods)'))+(nl?' voor de volledige, uitgewerkte wiskunde.':' for the full worked maths.')
    +'</div>'+rows+'</div>';
}

// ==================== FERMENTERS MANAGEMENT (Settings card) ====================
function renderFermentersCard(){
  var ferms=APP.fermenters||[];
  var rows=ferms.map(function(f){
    var occ=fermenterOccupiedBy(f.id);
    var statusBadge=occ
      ?'<span style="font-family:var(--font-mono);font-size:9px;background:rgba(168,80,60,0.15);color:#c87060;border:1px solid #c8706055;padding:2px 7px;border-radius:8px;letter-spacing:1px">OCCUPIED</span>'
      :'<span style="font-family:var(--font-mono);font-size:9px;background:rgba(80,150,90,0.15);color:#7aa850;border:1px solid #7aa85055;padding:2px 7px;border-radius:8px;letter-spacing:1px">FREE</span>';
    // Live temperature pill — only renders when a sensor is bound AND a value
    // is in the cache. Toggleable simply by leaving tempSensorEntity blank.
    var liveTemp=(typeof getFermenterLiveTemp==='function')?getFermenterLiveTemp(f):null;
    var tempPill='';
    if(liveTemp){
      var occForTemp=fermenterOccupiedBy(f.id);
      var evF=fermentTempEval(liveTemp.value,getYeastById((occForTemp&&occForTemp.yeast)||'m05'));
      var pillColor=tempZoneColor(evF.zone);
      tempPill='<span onclick="event.stopPropagation();showFermenterTempAdvice(\''+f.id+'\')" title="'+escHtml(evF.label+' — '+evF.expect)+' · click for detail" style="font-family:var(--font-mono);font-size:10px;background:'+pillColor+'22;color:'+pillColor+';border:1px solid '+pillColor+'55;padding:2px 7px;border-radius:8px;letter-spacing:0.5px;display:inline-flex;align-items:center;gap:3px;cursor:pointer">🌡 '+liveTemp.value.toFixed(1)+liveTemp.unit+(evF.borderline?' ⚠':'')+'</span>';
    }
    var capLabel=f.capacity?fmtVol(f.capacity):'—';
    var occLine=occ?'<div style="font-size:11.5px;color:'+getBatchColor(occ)+';margin-top:3px;font-style:italic">→ '+escHtml(occ.name)+' (day '+daysSince(occ.startDate)+')</div>':'';
    return'<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border)">'
      +'<div style="width:6px;height:38px;border-radius:2px;background:'+(f.color||'#c9a84c')+';flex-shrink:0"></div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><div style="font-family:var(--font-display);font-size:14px;color:var(--text)">'+escHtml(f.name)+'</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">'+capLabel+'</div>'
      +statusBadge
      +tempPill+'</div>'
      +(f.notes?'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+escHtml(f.notes)+'</div>':'')
      +occLine
      +'</div>'
      +'<div style="display:flex;gap:4px;flex-shrink:0">'
      +'<button class="btn btn-secondary btn-sm" onclick="openEditFermenterModal(\''+f.id+'\')" title="Edit">✏</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="confirmDeleteFermenter(\''+f.id+'\')" title="Delete" style="color:var(--red2)">✕</button>'
      +'</div>'
      +'</div>';
  }).join('');
  return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">⚗ FERMENTERS</div><button class="btn btn-primary btn-sm" onclick="openAddFermenterModal()">＋ Add Fermenter</button></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Track each vessel separately. Batches reference a fermenter, and the dashboard surfaces which are free vs occupied. Edit a fermenter to bind it to a Home Assistant temperature sensor — bound fermenters auto-fill the temp field on gravity logs and show a live pill above.</div>'
    +(ferms.length?'<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">'+rows+'</div>':'<div style="padding:14px;text-align:center;color:var(--text3);font-style:italic;font-size:13px">No fermenters yet — add one to start tracking.</div>')
    +'</div>';
}

// Capacity is stored canonically in litres; these let the add/edit forms accept
// and show it in L / US gal / UK gal. The select converts the visible number when
// the unit changes, so the underlying volume can't be silently mis-saved.
function fermCapDefault(litres){var u=currentUnitSystem();return u==='metric'?String(litres):(litres/UNIT_VOL[u].toSI).toFixed(2);}
function fermCapUnitSelect(selId,inputId){
  var cur=currentUnitSystem();
  return '<select class="form-input" id="'+selId+'" data-prev="'+cur+'" onchange="convertFermCap(this,\''+inputId+'\')" style="max-width:108px">'
    +['metric','us','imperial'].map(function(u){return '<option value="'+u+'"'+(u===cur?' selected':'')+'>'+UNIT_VOL[u].label+'</option>';}).join('')
    +'</select>';
}
function convertFermCap(sel,inputId){
  var inp=document.getElementById(inputId);if(!inp)return;
  var from=sel.getAttribute('data-prev')||'metric',to=sel.value,v=parseFloat(inp.value);
  if(!isNaN(v)&&UNIT_VOL[from]&&UNIT_VOL[to]){
    var litres=v*UNIT_VOL[from].toSI;
    inp.value=(to==='metric'?String(Math.round(litres*100)/100):(litres/UNIT_VOL[to].toSI).toFixed(2));
  }
  sel.setAttribute('data-prev',to);
}
// Read a capacity field (number + unit select) back to litres.
function fermCapToLitres(inputId,selId,fallback){
  var v=parseFloat((document.getElementById(inputId)||{}).value);
  if(isNaN(v))return fallback;
  var u=(document.getElementById(selId)||{}).value||'metric';
  return v*(UNIT_VOL[u]?UNIT_VOL[u].toSI:1);
}
function openAddFermenterModal(){
  closeModal();
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">⚗ ADD FERMENTER</div>'
    +'<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="af-name" placeholder="e.g. Fermenter 3, 30L Plastic, Glass Carboy"></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Capacity</label><div style="display:flex;gap:6px"><input class="form-input" id="af-capacity" type="number" step="0.1" value="'+fermCapDefault(7.6)+'" style="flex:1">'+fermCapUnitSelect('af-capunit','af-capacity')+'</div></div>'
    +'<div class="form-group"><label class="form-label">Color</label><input class="form-input" id="af-color" type="color" value="#c9a84c"></div></div>'
    +'<div class="form-group"><label class="form-label">Notes (optional)</label><input class="form-input" id="af-notes" placeholder="material, source, anything worth remembering"></div>'
    +'<div class="form-group"><label class="form-label">HA Temperature Sensor <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">optional</span></label>'
    +'<input class="form-input" id="af-tempsensor" type="text" placeholder="sensor.fermenter_X_temp (leave blank to hide)" style="font-family:var(--font-mono);font-size:12px">'
    +'<div style="font-size:11.5px;color:var(--text3);margin-top:4px;line-height:1.5;font-style:italic">Live readings appear on the fermenter card and auto-fill the gravity-log temp field. Optional.</div></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveAddFermenter()">Add</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(function(){var el=document.getElementById('af-name');if(el)el.focus();},50);
}

function saveAddFermenter(){
  var name=document.getElementById('af-name').value.trim();
  if(!name){toast('⚠ Name required');return;}
  var cap=fermCapToLitres('af-capacity','af-capunit',7.6);
  var notes=document.getElementById('af-notes').value.trim();
  var color=document.getElementById('af-color').value||'#c9a84c';
  var ts=document.getElementById('af-tempsensor');
  addFermenter(name,cap,notes,color,ts?ts.value.trim():'');
  closeModal();
  toast('✦ Fermenter added');
  renderMain();
}

function openEditFermenterModal(id){
  closeModal();
  var f=getFermenter(id);
  if(!f){toast('⚠ Fermenter not found');return;}
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-title">EDIT FERMENTER</div>'
    +'<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="ef-name" value="'+escHtml(f.name)+'"></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Capacity</label><div style="display:flex;gap:6px"><input class="form-input" id="ef-capacity" type="number" step="0.1" value="'+fermCapDefault(f.capacity||7.6)+'" style="flex:1">'+fermCapUnitSelect('ef-capunit','ef-capacity')+'</div></div>'
    +'<div class="form-group"><label class="form-label">Color</label><input class="form-input" id="ef-color" type="color" value="'+escHtml(f.color||'#c9a84c')+'"></div></div>'
    +'<div class="form-group"><label class="form-label">Notes</label><input class="form-input" id="ef-notes" value="'+escHtml(f.notes||'')+'"></div>'
    +'<div class="form-group"><label class="form-label">HA Temperature Sensor <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">optional</span></label>'
    +'<input class="form-input" id="ef-tempsensor" type="text" placeholder="sensor.fermenter_1_temp (leave blank to hide)" value="'+escHtml(f.tempSensorEntity||'')+'" style="font-family:var(--font-mono);font-size:12px">'
    +'<div style="font-size:11.5px;color:var(--text3);margin-top:4px;line-height:1.5;font-style:italic">Bind this fermenter to a Home Assistant sensor entity (Zigbee2MQTT thermo, Aqara, Bluetooth ranges, etc). When set, the live reading auto-fills the temperature field every time you log gravity, and a small temperature pill shows on the fermenter card. Leave blank to disable.</div></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEditFermenter(\''+id+'\')">Save</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function saveEditFermenter(id){
  var name=document.getElementById('ef-name').value.trim();
  if(!name){toast('⚠ Name required');return;}
  updateFermenter(id,{
    name:name,
    capacity:fermCapToLitres('ef-capacity','ef-capunit',undefined),
    notes:document.getElementById('ef-notes').value.trim(),
    color:document.getElementById('ef-color').value,
    tempSensorEntity:document.getElementById('ef-tempsensor').value.trim()
  });
  closeModal();
  toast('✦ Updated');
  renderMain();
}

function confirmDeleteFermenter(id){
  var f=getFermenter(id);
  if(!f){toast('⚠ Fermenter not found');return;}
  var occ=fermenterOccupiedBy(id);
  var batchesAssigned=APP.batches.filter(function(b){return b.fermenterId===id;}).length;
  var warn=occ?'\n\n⚠ '+occ.name+' is currently occupying this fermenter. It will be reassigned to the first remaining fermenter (or unassigned if none).':'';
  if(batchesAssigned)warn=warn||'';
  if(!confirm('Delete '+f.name+'?'+warn+(batchesAssigned?'\n\n('+batchesAssigned+' batch'+(batchesAssigned!==1?'es':'')+' currently or historically used this fermenter — they will be reassigned.)':'')))return;
  deleteFermenter(id);
  toast('✦ Fermenter deleted');
  renderMain();
}
