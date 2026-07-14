// ==========================================================================
// Stuck-ferment diagnosis modal, cost leaderboard, templates section, recipe scaling wizard.
// Split out of the former 13-labels-share.js. Globals, no behaviour change.
// ==========================================================================

// ==================== STUCK FERM DIAGNOSIS MODAL ====================
function showStuckFermDiagnosis(batchId){
  var d=diagnoseStuckFermentation(batchId);
  if(!d){toast('⚠ Batch not found');return;}
  var sevColor={'critical':'var(--red2)','high':'var(--red2)','medium':'var(--honey)','low':'var(--blue2)','info':'var(--text2)'};
  var sevBg={'critical':'#3a1010','high':'#2a1010','medium':'#2a2010','low':'#102030','info':'var(--bg4)'};
  var diagHtml=d.diagnoses.map(function(x){
    return'<div style="padding:12px;background:'+sevBg[x.severity]+';border-left:3px solid '+sevColor[x.severity]+';border-radius:var(--radius);margin-bottom:8px">'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:'+sevColor[x.severity]+';letter-spacing:2px;margin-bottom:4px">'+x.severity.toUpperCase()+'</div>'
      +'<div style="font-weight:600;color:var(--text);margin-bottom:4px">'+escHtml(x.title)+'</div>'
      +'<div style="font-size:13px;color:var(--text2);line-height:1.5">'+escHtml(x.detail)+'</div></div>';
  }).join('');
  var actionHtml=d.actions.length
    ?'<div style="margin-top:10px;padding:12px;background:#102818;border-left:3px solid var(--green2);border-radius:var(--radius)">'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--green2);letter-spacing:2px;margin-bottom:6px">RECOMMENDED ACTIONS</div>'
      +'<ol style="margin:0;padding-left:18px;font-size:13px;color:var(--text2);line-height:1.7">'
      +d.actions.map(function(a){return'<li>'+escHtml(a)+'</li>';}).join('')
      +'</ol></div>'
    :'';
  var html='<div class="modal-overlay"><div class="modal" style="max-width:600px">'
    +'<div class="modal-title">🔬 FERMENTATION DIAGNOSIS</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'
    +'<div style="padding:10px;background:var(--bg3);border-radius:var(--radius);text-align:center"><div style="font-family:var(--font-display);font-size:20px;color:var(--gold2)">'+d.daysSinceStart+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">DAYS</div></div>'
    +'<div style="padding:10px;background:var(--bg3);border-radius:var(--radius);text-align:center"><div style="font-family:var(--font-display);font-size:20px;color:var(--gold2)">'+(d.attenuation*100).toFixed(0)+'%</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">ATTENUATION</div></div>'
    +'<div style="padding:10px;background:var(--bg3);border-radius:var(--radius);text-align:center"><div style="font-family:var(--font-display);font-size:20px;color:var(--gold2)">'+d.currentAbv.toFixed(1)+'%</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">ABV</div></div>'
    +'</div>'
    +(diagHtml||'<div style="padding:12px;background:var(--bg4);border-radius:var(--radius);color:var(--text3);font-style:italic">No diagnostic findings — fermentation may be proceeding normally.</div>')
    +actionHtml
    +'<div class="modal-actions"><button class="btn btn-secondary" data-action="closeModal">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// ==================== COST LEADERBOARD ====================
function renderCostLeaderboard(){
  var data=computeCostEffectiveness();
  if(!data.length)return'';
  var ccy=APP.settings.currency||'€';
  // Sort by costPerBottle ascending (most efficient first)
  data.sort(function(a,b){return a.costPerBottle-b.costPerBottle;});
  var rows=data.slice(0,15).map(function(d){
    var color=getBatchColor(d.batch);
    var ratingDisplay=d.avgRating?d.avgRating.toFixed(1)+'★':'<span style="color:var(--text3)">—</span>';
    var valueScore=d.avgRating&&d.costPerBottle?(d.avgRating/d.costPerBottle).toFixed(2):'—';
    return'<tr style="cursor:pointer" data-action="showView" data-args=\''+JSON.stringify(['batch',d.batch.id])+'\'>'
      +'<td style="color:'+color+';font-family:var(--font-display);padding:8px 10px">'+escHtml(d.batch.name)+'</td>'
      +'<td style="text-align:right;font-family:var(--font-mono)">'+ccy+d.totalCost.toFixed(2)+'</td>'
      +'<td style="text-align:right;font-family:var(--font-mono)">'+d.bottles+'</td>'
      +'<td style="text-align:right;font-family:var(--font-mono);color:var(--gold2)">'+ccy+d.costPerBottle.toFixed(2)+'</td>'
      +'<td style="text-align:right;font-family:var(--font-mono)">'+ccy+d.costPerLitre.toFixed(2)+'/L</td>'
      +'<td style="text-align:right;font-family:var(--font-mono)">'+ratingDisplay+'</td>'
      +'<td style="text-align:right;font-family:var(--font-mono);color:var(--green2)" title="Rating per €">'+valueScore+'</td>'
      +'</tr>';
  }).join('');
  return'<div class="card" style="margin-bottom:14px">'
    +'<div class="card-header"><div class="card-title">💰 COST EFFECTIVENESS</div></div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:10px;font-style:italic">Ranked by cost per bottle (most efficient first). "Value" = rating ÷ total cost — higher is better.</div>'
    +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'
    +'<thead><tr style="border-bottom:1px solid var(--border);color:var(--text3);font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px">'
    +'<th style="text-align:left;padding:8px 10px">BATCH</th>'
    +'<th style="text-align:right">TOTAL</th>'
    +'<th style="text-align:right">BOTTLES</th>'
    +'<th style="text-align:right">PER BOTTLE</th>'
    +'<th style="text-align:right">PER L</th>'
    +'<th style="text-align:right">RATING</th>'
    +'<th style="text-align:right">VALUE</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'</div>';
}

// ==================== TEMPLATES VIEW SECTION ====================
function renderTemplatesSection(){
  var tpls=APP.templates||[];
  if(!tpls.length)return'';
  return'<div class="card" style="margin-bottom:14px"><div class="card-header"><div class="card-title">💾 BATCH TEMPLATES</div></div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:10px;font-style:italic">Saved batch configurations. Click "Apply" to start a new batch pre-filled with these values.</div>'
    +tpls.map(function(t){
      var recipe=getRecipe(t.recipeId);
      var ccy=APP.settings.currency||'€';
      return'<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:var(--radius);margin-bottom:8px;flex-wrap:wrap">'
        +'<div style="flex:1;min-width:240px"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(t.name)+'</div>'
        +'<div style="font-size:12px;color:var(--text3);font-family:var(--font-mono);margin-top:2px">'
        +(recipe?escHtml(recipe.name):'Unknown recipe')+' · '+(t.volume||'?')+'L · OG '+(t.og||'?')+(t.honeyType?' · '+escHtml(t.honeyType):'')+(t.yeast?' · '+escHtml((getYeastById(t.yeast)||{}).name||'').split('—')[0].trim():'')
        +(t.costPerLitre?' · '+ccy+t.costPerLitre.toFixed(2)+'/L':'')
        +'</div></div>'
        +'<div style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" data-action="applyTemplate" data-args=\''+JSON.stringify([t.id])+'\'>Apply</button>'
        +'<button class="btn btn-danger btn-sm" data-action="deleteTemplate" data-args=\''+JSON.stringify([t.id])+'\'>✕</button></div>'
        +'</div>';
    }).join('')
    +'</div>';
}

// ==================== RECIPE SCALING WIZARD ====================
function openRecipeScalingWizard(recipeId){
  closeModal();
  var r=getRecipe(recipeId);
  if(!r){toast('⚠ Recipe not found');return;}
  var defaultVol=r.volume||5;
  var html='<div class="modal-overlay"><div class="modal" style="max-width:560px">'
    +'<div class="modal-title">📐 SCALE RECIPE</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px">'+(appLang()==='nl'?'<strong>'+escHtml(r.name)+'</strong> is ontworpen voor <strong>'+defaultVol+'L</strong>. Voer je doelvolume in om alle ingrediënten proportioneel te schalen.':'<strong>'+escHtml(r.name)+'</strong> is designed for <strong>'+defaultVol+'L</strong>. Enter your target volume to scale all ingredients proportionally.')+'</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Original Volume (L)</label><input class="form-input" id="rs-orig" type="number" value="'+defaultVol+'" step="0.1" disabled style="opacity:0.7"></div>'
    +'<div class="form-group"><label class="form-label">Target Volume (L)</label><input class="form-input" id="rs-target" type="number" value="'+defaultVol+'" step="0.1" oninput="updateRecipeScaling(\''+recipeId+'\')" autofocus></div></div>'
    +'<div id="rs-output" style="margin-top:10px"></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" data-action="closeModal">Cancel</button>'
    +'<button class="btn btn-primary" data-action="startScaledBatch" data-args=\''+JSON.stringify([recipeId])+'\'>Start Batch with This Scaling</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  updateRecipeScaling(recipeId);
}

function updateRecipeScaling(recipeId){
  var r=getRecipe(recipeId);
  if(!r)return;
  var targetVol=parseFloat(document.getElementById('rs-target').value)||r.volume;
  var ratio=targetVol/r.volume;
  var outEl=document.getElementById('rs-output');
  var ogPoints=(r.ogTarget-1)*1000;
  var honeyKg=(ogPoints*targetVol/292).toFixed(2);
  var ccy=APP.settings.currency||'€';
  var costEst=APP.settings.honeyPricePerKg?(parseFloat(honeyKg)*APP.settings.honeyPricePerKg).toFixed(2):'';
  // Scale yeast pitch
  var pitch=calcPitchAmount(r.yeast||'m05',targetVol,r.ogTarget);
  outEl.innerHTML='<div style="background:var(--bg3);padding:14px;border-radius:var(--radius);border:1px solid var(--border)">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    +'<div style="text-align:center;padding:10px;background:var(--bg4);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)">'+honeyKg+' kg</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">HONEY</div></div>'
    +'<div style="text-align:center;padding:10px;background:var(--bg4);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)">'+targetVol+' L</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">FINAL VOLUME</div></div>'
    +'</div>'
    +'<div style="font-family:var(--font-mono);font-size:12px;color:var(--text2);line-height:1.8">'
    +'<div><strong>Water:</strong> ~'+(targetVol-honeyKg*0.7).toFixed(2)+'L (honey displaces ~0.7L/kg)</div>'
    +(pitch?'<div><strong>Yeast:</strong> '+pitch.sachetsRounded+' sachets ('+pitch.totalGrams.toFixed(1)+' g) · '+pitch.yeast.name.split('—')[0].trim()+'</div>':'')
    +'<div><strong>Target OG:</strong> '+r.ogTarget+'</div>'
    +(costEst?'<div><strong>Est. honey cost:</strong> '+ccy+costEst+'</div>':'')
    +'<div><strong>Scaling factor:</strong> ×'+ratio.toFixed(3)+'</div>'
    +'</div></div>';
}

function startScaledBatch(recipeId){
  var targetVol=parseFloat(document.getElementById('rs-target').value);
  closeModal();
  if(!targetVol||targetVol<=0)return;
  // Open new-batch modal with scaled volume
  openNewBatchModal(recipeId,targetVol);
}

// Wire scale button into recipe detail view
function recipeDetailScaleButton(recipeId){
  return'<button class="btn btn-secondary btn-sm" data-action="openRecipeScalingWizard" data-args=\''+JSON.stringify([recipeId])+'\'>📐 Scale to Volume</button>';
}