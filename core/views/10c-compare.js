// ==========================================================================
// Compare view — side-by-side batch comparison.
// Split out of the former 10-cellar-supplies.js. Globals, no behaviour change.
// ==========================================================================

// ==================== COMPARE VIEW ====================
function renderCompare(){
  var selected=APP.compareSelection||[];
  var modeBatches=visibleBatches();
  // Filter out batches that no longer exist, or belong to the other beverage
  // mode (switching modes shouldn't leave a stale, invisible cider batch
  // silently occupying a comparison slot while browsing mead).
  selected=selected.filter(function(id){return modeBatches.find(function(b){return b.id===id;});});
  APP.compareSelection=selected;
  // Build selection grid
  var cards=modeBatches.map(function(b){
    var color=getBatchColor(b);
    var sel=selected.indexOf(b.id)!==-1;
    var status=getBatchStatus(b);
    var logs=APP.logs[b.id]||[];
    var lastG=logs.length?logs[logs.length-1].gravity:b.og;
    return'<div class="compare-card '+(sel?'selected':'')+'" onclick="toggleCompare(\''+b.id+'\')" style="border-left:3px solid '+color+'">'
      +'<div class="check">✓</div>'
      +'<div style="font-family:var(--font-display);font-size:14px;color:'+color+';margin-bottom:4px;padding-right:24px">'+escHtml(b.name)+'</div>'
      +'<div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">'+(b.style||'Custom')+' · '+(b.og||'?')+' → '+(lastG||'?')+' · '+(b.volume||'?')+'L</div>'
      +'<div style="margin-top:6px">'+statusBadge(status)+'</div>'
      +'</div>';
  }).join('');

  // Build comparison panel
  var comparisonHtml='';
  if(selected.length>=1){
    var selBatches=selected.map(function(id){return APP.batches.find(function(b){return b.id===id;});});
    // Value helpers
    function lastG(b){var lg=APP.logs[b.id]||[];return lg.length?lg[lg.length-1].gravity:null;}
    function protoLabel(b){
      var pr=b.nutrientProtocol;
      var map={tosca2:'TOSCA 2.0',tosna2:'TOSNA',tiosna:'TiOSNA',sna:'SNA','sna-high':'SNA (high-gravity)'};
      if(pr&&map[pr])return map[pr];
      var p=getNutrientById(b.nutrient);
      return p?(p.protocol==='tosna'?'TOSNA / TOSCA':p.protocol==='goferm'?'Rehydration':'SNA'):'—';
    }
    function honeyRisk(b){
      var hp=HONEY_PROFILES[b.honeyType];var t=hp&&hp.tech;
      if(!t)return'—';
      return (t.fgRatio?t.fgRatio.toFixed(2)+':1':'?')+' · '+(t.fructoseRisk||'—');
    }
    var ccy=APP.settings.currency||'€';
    // Comprehensive, grouped rows. {section} = sub-header; [label,fn] = data.
    var statRows=[
      {section:'🍯 Recipe & ingredients'},
      ['Recipe',function(b){var r=APP.recipes.find(function(x){return x.id===b.recipeId;});return r?r.name:(b.style||'—');}],
      ['Style',function(b){var r=APP.recipes.find(function(x){return x.id===b.recipeId;});return(r&&r.style)||b.style||'—';}],
      ['Honey type',function(b){return b.honeyType||'—';}],
      ['Honey amount',function(b){return b.honey?fmtWt(b.honey):'—';}],
      ['F:G · stall risk',honeyRisk],
      ['Yeast',function(b){var y=getYeastById(b.yeast);return y?y.name.split('—')[0].trim():(b.yeast||'—');}],
      ['Nutrient',function(b){var p=getNutrientById(b.nutrient);return p?p.name:(b.nutrient||'—');}],
      ['Schedule',protoLabel],
      {section:'⚗ Fermentation'},
      ['Volume',function(b){return fmtVol(b.volume||0);}],
      ['OG',function(b){return b.og||'—';}],
      ['Current / Final',function(b){return lastG(b)||b.og||'—';}],
      ['Est. ABV',function(b){var g=lastG(b);return b.og&&g?calcABV(b.og,g)+'%':'—';}],
      ['Attenuation',function(b){var g=lastG(b);return b.og&&g?((b.og-g)/(b.og-1)*100).toFixed(1)+'%':'—';}],
      ['Fermenter',function(b){var f=getFermenter&&getFermenter(b.fermenterId);return f?f.name:'—';}],
      ['Readings logged',function(b){return(APP.logs[b.id]||[]).length;}],
      ['Status',function(b){return getBatchStatus(b);}],
      {section:'🍾 Outcome'},
      ['Bottled',function(b){var bo=APP.bottling[b.id];return bo&&bo.date?fmtDate(bo.date):'—';}],
      ['Final gravity',function(b){var bo=APP.bottling[b.id];return bo&&bo.fg?bo.fg:'—';}],
      ['Final ABV',function(b){var bo=APP.bottling[b.id];return bo&&bo.abv?bo.abv+'%':'—';}],
      ['Sweetness',function(b){var bo=APP.bottling[b.id];return(bo&&bo.sweetness)||'—';}],
      ['Bottles',function(b){var bo=APP.bottling[b.id];if(!bo)return'—';var sz=fmtBottleSizes((bo.countsAtBottling?(function(){var m={};(bo.bottleSizes||Object.keys(bo.countsAtBottling)).forEach(function(s){m[parseInt(s)]=bottlesOriginalBySize(bo,s);});return m;})():{}));return bottlesOriginal(bo)+(sz?' ('+sz+')':'');}],
      ['Brew → bottle',function(b){var bo=APP.bottling[b.id];if(!bo||!bo.date||!b.startDate)return'—';return Math.round((new Date(bo.date)-new Date(b.startDate))/86400000)+' days';}],
      ['Cost',function(b){return(b.cost&&(b.cost.honey||0)+(b.cost.extras||0))?ccy+((b.cost.honey||0)+(b.cost.extras||0)).toFixed(2):'—';}],
      ['Cost / bottle',function(b){var bo=APP.bottling[b.id];var tot=b.cost?(b.cost.honey||0)+(b.cost.extras||0):0;var n=bo?bottlesOriginal(bo):0;return(tot&&n)?ccy+(tot/n).toFixed(2):'—';}],
      ['Tastings',function(b){var ts=APP.tastings[b.id]||[];if(!ts.length)return'0';var avg=ts.reduce(function(s,t){return s+(t.rating||0);},0)/ts.length;return ts.length+(avg>0?' · ★'+avg.toFixed(1):'');}]
    ];
    // A data row is a "difference" when its values aren't all identical.
    function rowDiffers(fn){
      if(selBatches.length<2)return false;
      var first=String(fn(selBatches[0]));
      return selBatches.some(function(b){return String(fn(b))!==first;});
    }
    comparisonHtml='<div class="card" style="margin-top:20px"><div class="card-header"><div class="card-title">SIDE BY SIDE</div><div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:1px">◆ = differs</div></div>'
      +'<div style="overflow-x:auto"><table class="data-table" style="min-width:600px"><thead><tr><th></th>'
      +selBatches.map(function(b){return'<th style="color:'+getBatchColor(b)+'">'+escHtml(b.name)+'</th>';}).join('')
      +'</tr></thead><tbody>'
      +statRows.map(function(row){
        if(row.section){
          return'<tr><td colspan="'+(selBatches.length+1)+'" style="padding-top:12px;color:var(--gold);font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;border-bottom:1px solid var(--border)">'+row.section+'</td></tr>';
        }
        var differs=rowDiffers(row[1]);
        return'<tr'+(differs?' style="background:rgba(201,168,76,0.05)"':'')+'><td style="color:'+(differs?'var(--gold2)':'var(--text3)')+';font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:1px">'+(differs?'◆ ':'')+row[0]+'</td>'
          +selBatches.map(function(b){return'<td>'+escHtml(String(row[1](b)))+'</td>';}).join('')
          +'</tr>';}).join('')
      +'</tbody></table></div></div>';
    if(selected.length>=2){
      comparisonHtml+='<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">GRAVITY OVERLAY</div></div><div style="position:relative;height:300px"><canvas id="compare-gravity"></canvas></div></div>';
      comparisonHtml+='<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">ABV OVERLAY</div></div><div style="position:relative;height:300px"><canvas id="compare-abv"></canvas></div></div>';
      // Tasting wheel overlay — pulls each batch's latest tasting wheel and
      // draws them all on a single radar with different colors.
      var batchesWithTasting=selBatches.filter(function(b){
        var ts=APP.tastings[b.id];
        if(!ts||!ts.length)return false;
        var latest=ts[ts.length-1];
        return latest&&latest.wheel&&Object.values(latest.wheel).some(function(v){return v>0;});
      });
      if(batchesWithTasting.length>=2){
        comparisonHtml+='<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">TASTING WHEEL OVERLAY</div></div>'
          +'<div style="font-size:12px;color:var(--text3);margin-bottom:12px;font-style:italic">Comparing the latest tasting profile of each batch. Each color is a batch — see which dimensions diverge.</div>'
          +renderTastingOverlayRadar(batchesWithTasting)
          +'</div>';
      }else if(selected.length>=2){
        comparisonHtml+='<div class="info-box" style="margin-top:16px;border-left-color:var(--text3)"><div style="font-size:12px;color:var(--text3)">💡 Add tasting notes to at least 2 selected batches to see the tasting wheel overlay.</div></div>';
      }
    }
  }

  return'<div class="page-title">Compare</div><div class="page-subtitle">Side-by-side analysis · select 2-4 batches to overlay gravity curves and stats'+(selected.length?' · '+selected.length+' selected':'')+'</div>'
    +(selected.length>0?'<div style="margin-bottom:12px"><button class="btn btn-secondary btn-sm" onclick="APP.compareSelection=[];renderMain()">Clear Selection</button></div>':'')
    +(modeBatches.length?'<div class="grid-3" style="gap:10px">'+cards+'</div>':'<div class="empty-state"><p>No batches to compare yet.</p></div>')
    +comparisonHtml;
}

function toggleCompare(id){
  var sel=APP.compareSelection||[];
  var idx=sel.indexOf(id);
  if(idx>=0)sel.splice(idx,1);
  else{
    if(sel.length>=4){toast('⚠ Max 4 batches for comparison');return;}
    sel.push(id);
  }
  APP.compareSelection=sel;
  renderMain();
}

function initCompareCharts(){
  setTimeout(function(){
    var sel=APP.compareSelection||[];
    if(sel.length<2)return;
    var selBatches=sel.map(function(id){return APP.batches.find(function(b){return b.id===id;});}).filter(Boolean);
    // Days-since-start as x axis for fair overlay
    function buildSeries(b){
      var og=b.og||1.095;
      var logs=APP.logs[b.id]||[];
      var data=[{x:0,y:og}].concat(logs.map(function(l){return{x:daysSince(b.startDate)-daysSince(l.date)+daysSince(l.date)-daysSince(b.startDate),y:l.gravity};}));
      // Recompute x properly: days from batch start to reading date
      var startMs=new Date(b.startDate).getTime();
      data=[{x:0,y:og}].concat(logs.map(function(l){return{x:Math.max(0,Math.round((new Date(l.date)-startMs)/86400000)),y:l.gravity};}));
      return data;
    }
    function buildAbv(b){
      var og=b.og||1.095;
      var logs=APP.logs[b.id]||[];
      var startMs=new Date(b.startDate).getTime();
      return[{x:0,y:0}].concat(logs.map(function(l){return{x:Math.max(0,Math.round((new Date(l.date)-startMs)/86400000)),y:l.gravity?parseFloat(calcABV(og,l.gravity)):0};}));
    }
    var gctx=document.getElementById('compare-gravity');
    if(gctx){
      makeChart(gctx,{
        type:'line',
        data:{datasets:selBatches.map(function(b){return{label:b.name,data:buildSeries(b),borderColor:getBatchColor(b),backgroundColor:'transparent',tension:0.3,pointRadius:3,borderWidth:2};})},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:true,labels:{color:'#a89880',font:{size:11}}}},
          scales:{x:{type:'linear',title:{display:true,text:'Days since brew day',color:'#6a5f50'},ticks:{color:'#6a5f50',font:{size:10}},grid:{color:'#2a2a35'}},
            y:{title:{display:true,text:'Gravity (SG)',color:'#6a5f50'},ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v.toFixed(3);}},grid:{color:'#2a2a35'}}}}
      });
    }
    var actx=document.getElementById('compare-abv');
    if(actx){
      makeChart(actx,{
        type:'line',
        data:{datasets:selBatches.map(function(b){return{label:b.name,data:buildAbv(b),borderColor:getBatchColor(b),backgroundColor:'transparent',tension:0.3,pointRadius:3,borderWidth:2};})},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:true,labels:{color:'#a89880',font:{size:11}}}},
          scales:{x:{type:'linear',title:{display:true,text:'Days since brew day',color:'#6a5f50'},ticks:{color:'#6a5f50',font:{size:10}},grid:{color:'#2a2a35'}},
            y:{beginAtZero:true,title:{display:true,text:'ABV %',color:'#6a5f50'},ticks:{color:'#6a5f50',font:{size:10},callback:function(v){return v.toFixed(1)+'%';}},grid:{color:'#2a2a35'}}}}
      });
    }
  },100);
}
