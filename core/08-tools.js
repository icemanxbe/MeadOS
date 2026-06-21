// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// brewing tools, mead guide, bottle scanner, search, BeerXML, rehydration
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== BREWING TOOLS ====================
function renderTools(){
  return'<div class="page-title">Brewing Tools</div><div class="page-subtitle">Calculators &amp; Utilities</div>'
    +renderCostLeaderboard()
    +renderTemplatesSection()
    +'<div class="tools-masonry">'
    +'<div class="card"><div class="card-header"><div class="card-title">🍶 ABV CALCULATOR</div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Original Gravity</label><input class="form-input" id="abv-og" type="number" placeholder="1.095" step="0.001" oninput="calcAbv()"></div>'
    +'<div class="form-group"><label class="form-label">Final Gravity</label><input class="form-input" id="abv-fg" type="number" placeholder="1.010" step="0.001" oninput="calcAbv()"></div></div>'
    +'<div style="text-align:center;padding:16px;background:var(--bg3);border-radius:var(--radius);margin-top:8px">'
    +'<div style="font-family:var(--font-display);font-size:32px;color:var(--gold2);font-weight:500" id="abv-result">—</div>'
    +'<div class="micro-label">ESTIMATED ABV</div>'
    +'</div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🍯 HONEY CALCULATOR</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Calculate honey needed for target gravity. Based on standard yield (~35 PPG). Reference: 5L at OG 1.098 ≈ 1.7 kg honey.</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Target Volume (L)</label><input class="form-input" id="hc-vol" type="number" value="4.5" step="0.5" oninput="calcHoney()"></div>'
    +'<div class="form-group"><label class="form-label">Target OG</label><input class="form-input" id="hc-og" type="number" value="1.098" step="0.001" oninput="calcHoney()"></div></div>'
    +'<div style="text-align:center;padding:16px;background:var(--bg3);border-radius:var(--radius);margin-top:8px">'
    +'<div style="font-family:var(--font-display);font-size:32px;color:var(--gold2);font-weight:500" id="hc-result">—</div>'
    +'<div class="micro-label">HONEY NEEDED</div>'
    +'</div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🧪 SANITIZER MIX</div></div>'
    +'<div class="form-group"><label class="form-label">Product</label><select class="form-select" id="sm-product" onchange="setSanitizerChoice(this.value)">'
    +Object.keys(SANITIZERS).map(function(k){return'<option value="'+k+'"'+(getSanitizer().id===k?' selected':'')+'>'+SANITIZERS[k].name+' · '+SANITIZERS[k].mlPerL+' ml/L</option>';}).join('')
    +'</select></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">'+getSanitizer().name+': '+getSanitizer().mlPerL+' ml per 1L water (= '+(getSanitizer().mlPerL*10)+' ml per 10L). '+getSanitizer().contact+'. '+getSanitizer().notes+' Always <em>clean first</em> with an oxygen-based cleaner like Chemipro OXI (see card below).</div>'
    +'<div class="form-group"><label class="form-label">Water Volume (L)</label><input class="form-input" id="sm-vol" type="number" value="2" step="0.5" oninput="calcSanitizer()"></div>'
    +'<div style="text-align:center;padding:16px;background:var(--bg3);border-radius:var(--radius);margin-top:8px">'
    +'<div style="font-family:var(--font-display);font-size:32px;color:var(--gold2);font-weight:500" id="sm-result">'+(2*getSanitizer().mlPerL).toFixed(1)+' ml</div>'
    +'<div class="micro-label">'+escHtml(getSanitizer().name.toUpperCase())+'</div>'
    +'</div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🧼 CLEANER MIX (CHEMIPRO OXI)</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Chemipro OXI: oxygen-based <em>cleaner</em> — strips residue before sanitizing. 4 g per 1 L warm water, 2-5 min contact, drain well.</div>'
    +'<div class="form-group"><label class="form-label">Water Volume (L)</label><input class="form-input" id="cm-vol" type="number" value="2" step="0.5" oninput="calcCleaner()"></div>'
    +'<div style="text-align:center;padding:16px;background:var(--bg3);border-radius:var(--radius);margin-top:8px">'
    +'<div style="font-family:var(--font-display);font-size:32px;color:var(--gold2);font-weight:500" id="cm-result">8 g</div>'
    +'<div class="micro-label">CHEMIPRO OXI</div>'
    +'</div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🌡 HYDROMETER TEMP CORRECTION</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Hydrometers are calibrated at one temperature (usually 20°C). At other temperatures, density changes — your reading needs correcting. The polynomial formula handles 0-40°C accurately.</div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Measured SG</label><input class="form-input" id="hc-sg" type="number" value="1.050" step="0.001" oninput="calcHydroCorrect()"></div>'
    +'<div class="form-group"><label class="form-label">Sample °C</label><input class="form-input" id="hc-tsample" type="number" value="22" step="0.1" oninput="calcHydroCorrect()"></div>'
    +'<div class="form-group"><label class="form-label">Calibrated at °C</label><input class="form-input" id="hc-tcal" type="number" value="20" step="0.5" oninput="calcHydroCorrect()"></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="hc-corrected">—</div><div class="micro-label">CORRECTED SG</div></div>'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--text)" id="hc-delta">—</div><div class="micro-label">CORRECTION</div></div>'
    +'</div>'
    +'<div style="margin-top:8px;font-size:11px;color:var(--text3);font-style:italic" id="hc-note">Warm sample = artificially low reading; correction adds. Cold sample = artificially high reading; correction subtracts.</div>'
    +'</div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🔁 SG ↔ BRIX CONVERTER</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Hydrometer reads SG, refractometer reads Brix. Fill either side and the other converts in real time. The "OG (for mid-ferment correction)" field handles the alcohol-skew problem when reading a refractometer during fermentation.</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">SG (hydrometer)</label><input class="form-input" id="sb-sg" type="number" step="0.001" placeholder="e.g. 1.045" oninput="calcSGBrix()"></div>'
    +'<div class="form-group"><label class="form-label">Brix (refractometer)</label><input class="form-input" id="sb-brix" type="number" step="0.1" placeholder="e.g. 11.2" oninput="calcSGBrix()"></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="sb-brix-out">—</div><div class="micro-label">FROM SG</div></div>'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="sb-sg-out">—</div><div class="micro-label">FROM BRIX</div></div>'
    +'</div>'
    +'<details style="margin-top:12px"><summary style="cursor:pointer;font-size:12.5px;color:var(--text3);padding:4px 0">+ Mid-fermentation refractometer correction</summary>'
    +'<div style="margin-top:6px"><div class="form-group"><label class="form-label">Original Brix (pre-ferment) <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:4px">optional — only needed if you\'re mid-ferment</span></label><input class="form-input" id="sb-og" type="number" step="0.1" placeholder="e.g. 23.0 (use this WITH the Brix field above)" oninput="calcSGBrix()"></div></div></details>'
    +'<div id="sb-fermenting-note" style="display:none;margin-top:10px;padding:10px;background:var(--bg4);border-radius:var(--radius);font-size:12px;color:var(--text2)"></div>'
    +'</div>'
    +'<div class="card"><div class="card-header"><div class="card-title">⚡ NUTRIENT CALCULATOR</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Mead Yeast Nutrient (SNA). Standard mead needs ~2.4 g/L total, heavy/high-gravity ~4.8 g/L. Split across 2 doses (Day 1 + Day 3).</div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="nc-vol" type="number" value="5" step="0.5" oninput="calcNutrient()"></div>'
    +'<div class="form-group"><label class="form-label">Style</label><select class="form-select" id="nc-style" onchange="calcNutrient()"><option value="2.4">Standard (~12% ABV)</option><option value="3.2">Strong (~14% ABV)</option><option value="4.8">Heavy / Sack (~18% ABV)</option></select></div>'
    +'<div class="form-group"><label class="form-label">Sachet Size (g)</label><input class="form-input" id="nc-sachet" type="number" value="'+(APP.settings.sachetSize||12)+'" step="0.5" oninput="calcNutrient()"></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:24px;color:var(--gold2)" id="nc-total">—</div><div class="micro-label">TOTAL</div></div>'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:24px;color:var(--gold2)" id="nc-sachets">—</div><div class="micro-label">SACHETS</div></div>'
    +'<div style="grid-column:1/-1;text-align:center;padding:12px 8px;background:var(--bg3);border-radius:var(--radius);font-size:13px;color:var(--text2);line-height:1.7" id="nc-dose">—</div>'
    +'</div></div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🧫 YEAST REHYDRATION TIMER</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.55">For yeasts that require rehydration (most champagne strains, EC-1118, K1V-1116, D47, etc.). M05 sprinkles directly — skip this for M05. Go-Ferm Sterol Flash protocol improves viability dramatically.</div>'
    +'<button class="btn btn-primary" onclick="openYeastRehydrationModal()" style="width:100%">Start Rehydration Workflow</button>'
    +'</div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🌾 TOSNA PLANNER</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.55">Generate a 4-dose Fermaid-O TOSNA schedule for an active batch — then apply it. Applying switches the batch\'s nutrient to Fermaid-O and writes the 4 doses into the additions log so they show up in the coach and calendar.</div>'
    +(function(){
      var activeBatches=APP.batches.filter(function(b){var s=getBatchStatus(b);return s!=='bottled'&&s!=='complete'&&s!=='failed';});
      if(!activeBatches.length){
        return'<div style="padding:14px;text-align:center;color:var(--text3);font-style:italic;font-size:13px">No active batches to plan for. Start a batch first, then come back.</div></div>';
      }
      var batchOpts=activeBatches.map(function(b){
        return'<option value="'+b.id+'">'+escHtml(b.name)+' · '+(b.volume||5)+'L · OG '+(b.og||1.095)+'</option>';
      }).join('');
      return'<div class="form-group"><label class="form-label">Batch</label><select class="form-select" id="tp-batch" onchange="renderTOSNAPlan()">'+batchOpts+'</select></div>'
        +'<div id="tp-output"></div>'
        +'</div>';
    }())
    +'<div class="card"><div class="card-header"><div class="card-title">🦠 PITCH CALCULATOR</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">How much yeast for your batch. Higher OG = more stress = more yeast. Output also includes rehydration water amount.</div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Yeast</label><select class="form-select" id="pc-yeast" onchange="calcPitch()">'
    +YEAST_STRAINS.map(function(y){return'<option value="'+y.id+'">'+escHtml(y.name)+'</option>';}).join('')
    +'</select></div>'
    +'<div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="pc-vol" type="number" value="5" step="0.1" oninput="calcPitch()"></div>'
    +'<div class="form-group"><label class="form-label">Target OG</label><input class="form-input" id="pc-og" type="number" value="1.100" step="0.001" oninput="calcPitch()"></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="pc-grams">—</div><div class="micro-label">DRY YEAST</div></div>'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="pc-sachets">—</div><div class="micro-label">SACHETS</div></div>'
    +'</div>'
    +'<div style="margin-top:10px;padding:10px;background:var(--bg4);border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;color:var(--text2);line-height:1.7" id="pc-detail">—</div>'
    +'</div>'
    +'<div class="card"><div class="card-header"><div class="card-title">⚡ TOSCA 2.0 / TOSNA SCHEDULER</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.55">Organic, staggered nutrient scheduling. The YAN target starts from the base (gravity points × 9, Moutela) and is scaled by your <strong>yeast\'s nitrogen demand</strong> and the <strong>honey\'s darkness</strong> — the two factors that change how much nitrogen the must actually needs. GoFerm rehydration plus staggered Fermaid-O doses through the 1/3 sugar break.</div>'
    +'<div class="form-group"><label class="form-label">Protocol</label><select class="form-select" id="ts-protocol" onchange="calcTOSNA()">'
    +'<option value="tosca2" selected>TOSCA 2.0 — GoFerm + 24h / 48h / 72h / 1-3 break</option>'
    +'<option value="tosna">TOSNA (classic Moutela) — GoFerm + 24h / 48h / 72h / 96h</option>'
    +'<option value="tiosna">TiOSNA — GoFerm + at-pitch / 24h / 48h / 1-3 break</option>'
    +'</select><div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">TOSCA 2.0 is a refinement of TOSNA: same staggered-organic idea, but the YAN target is scaled by yeast demand × honey colour and the last dose lands on the 1/3 sugar break.</div></div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="ts-vol" type="number" value="5" step="0.1" oninput="calcTOSNA()"></div>'
    +'<div class="form-group"><label class="form-label">Target OG</label><input class="form-input" id="ts-og" type="number" value="1.100" step="0.001" oninput="calcTOSNA()"></div>'
    +'<div class="form-group"><label class="form-label">Nutrient</label><select class="form-select" id="ts-type" onchange="calcTOSNA()"><option value="fermaid-o" selected>Fermaid-O (organic — TOSNA 2.0)</option><option value="fermaid-k">Fermaid-K (DAP blend — SNA)</option><option value="dap">DAP (inorganic — SNA)</option><option value="mj-mead">M05 / MJ Mead sachet (SNA blend)</option></select></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Yeast nitrogen demand</label><select class="form-select" id="ts-ndemand" onchange="calcTOSNA()"><option value="low">Low (71B, EC-1118, K1V, QA23, D47…)</option><option value="medium" selected>Medium (M05, DV10, Wyeast 4632)</option><option value="high">High (Wyeast 4184 Sweet, hungry strains)</option><option value="extra_high">Extra-high (high-gravity sack / step-feed)</option></select></div>'
    +'<div class="form-group"><label class="form-label">Honey darkness</label><select class="form-select" id="ts-darkness" onchange="calcTOSNA()"><option value="none" selected>Light / blossom (acacia, clover…)</option><option value="light">Amber / wildflower</option><option value="medium">Dark (buckwheat, chestnut)</option><option value="dark">Bochet / caramelised</option></select></div></div>'
    +'<div id="ts-warn"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="ts-yan">—</div><div class="micro-label">YAN TARGET (ppm)</div></div>'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="ts-total">—</div><div class="micro-label">TOTAL NUTRIENT</div></div>'
    +'</div>'
    +'<div style="margin-top:10px;padding:10px;background:var(--bg4);border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;color:var(--text2);line-height:1.8" id="ts-schedule">—</div>'
    +'<div style="margin-top:8px;font-size:11px;color:var(--text3);font-style:italic;line-height:1.55" id="ts-break-note">—</div>'
    +'</div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🍯 BACKSWEETENING CALCULATOR</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Compute honey/sugar to raise FG to a target sweetness, plus stabilization doses. Always stabilize BEFORE backsweetening: sorbate + K-meta together prevent renewed fermentation.</div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Current FG</label><input class="form-input" id="bs-fg" type="number" value="1.000" step="0.001" oninput="calcBacksweet()"></div>'
    +'<div class="form-group"><label class="form-label">Target FG</label><input class="form-input" id="bs-target" type="number" value="1.015" step="0.001" oninput="calcBacksweet()"></div>'
    +'<div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="bs-vol" type="number" value="5" step="0.1" oninput="calcBacksweet()"></div></div>'
    +'<div class="form-group"><label class="form-label">Sweetener</label><select class="form-select" id="bs-type" onchange="calcBacksweet()"><option value="honey">Honey (≈1.42 SG, ~80% sugar)</option><option value="sugar">Table Sugar (sucrose)</option><option value="dme">DME (Dry Malt Extract)</option></select></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">'
    +'<div style="text-align:center;padding:12px 6px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:20px;color:var(--gold2)" id="bs-sweet">—</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">SWEETENER</div></div>'
    +'<div style="text-align:center;padding:12px 6px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:20px;color:var(--text)" id="bs-sorb">—</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">SORBATE</div></div>'
    +'<div style="text-align:center;padding:12px 6px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:20px;color:var(--text)" id="bs-meta">—</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">K-META</div></div>'
    +'</div>'
    +'<div style="margin-top:10px;padding:10px;background:var(--bg4);border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;color:var(--text2);line-height:1.7" id="bs-protocol">—</div>'
    +'<div style="margin-top:8px;font-size:11px;color:var(--text3);font-style:italic">Sorbate alone doesn\'t kill yeast — it blocks reproduction. Must be combined with K-meta (free SO₂) or refrigeration. Wait 48h after stabilizing before adding sweetener.</div>'
    +'</div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🍾 CARBONATION / PRIMING SUGAR</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.55">Priming sugar to bottle-condition a sparkling mead. The mead must be <strong>fully fermented</strong> and <strong>not stabilized</strong> — sorbate/sulfite stop the refermentation that makes the bubbles. Enter the highest temperature the mead has reached since fermentation; that sets how much CO₂ is already dissolved.</div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="cb-vol" type="number" value="5" step="0.1" oninput="calcCarbonation()"></div>'
    +'<div class="form-group"><label class="form-label">Mead temp (°C)</label><input class="form-input" id="cb-temp" type="number" value="20" step="0.5" oninput="calcCarbonation()"></div>'
    +'<div class="form-group"><label class="form-label">Priming sugar</label><select class="form-select" id="cb-sugar" onchange="calcCarbonation()"><option value="4.0">Corn sugar (dextrose)</option><option value="3.8">Table sugar (sucrose)</option><option value="5.0">Honey</option><option value="5.7">DME</option></select></div></div>'
    +'<div class="form-group"><label class="form-label">Style / target carbonation</label><select class="form-select" id="cb-style" onchange="calcCarbonation()">'
    +'<option value="2.0">Lightly sparkling / pétillant (~2.0 vol)</option>'
    +'<option value="2.5" selected>Sparkling (~2.5 vol)</option>'
    +'<option value="3.0">Highly sparkling (~3.0 vol)</option>'
    +'<option value="3.5">Champagne-style (~3.5 vol)</option>'
    +'<option value="custom">Custom…</option></select></div>'
    +'<div class="form-group" id="cb-custom-wrap" style="display:none"><label class="form-label">Custom target CO₂ (volumes)</label><input class="form-input" id="cb-target" type="number" value="2.5" step="0.1" min="0" oninput="calcCarbonation()"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="cb-sugar-out">—</div><div class="micro-label">PRIMING SUGAR</div></div>'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="cb-perL">—</div><div class="micro-label">PER LITER</div></div>'
    +'</div>'
    +'<div style="margin-top:10px;padding:10px;background:var(--bg4);border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;color:var(--text2);line-height:1.7" id="cb-detail">—</div>'
    +'<div id="cb-warn"></div>'
    +'<div style="margin-top:8px;font-size:11px;color:var(--text3);font-style:italic">Bottle-condition only a fully-fermented, un-stabilized mead in pressure-rated bottles (champagne/Belgian + crown caps or wired corks). Keep one PET tester bottle to feel the pressure. Condition 2–3 weeks at 18–22°C, then chill. See Mead Guide → Sparkling &amp; Carbonated Mead.</div>'
    +'</div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🧪 SO₂ / SULFITE CALCULATOR</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.55">Only the <em>molecular</em> fraction of free SO₂ is antimicrobial, and that fraction collapses as pH rises. Enter your pH to see the free SO₂ you must hold to reach the protective molecular target, and the K-meta dose to get there. <strong>Confirm with a free-SO₂ measurement</strong> — this estimates, it doesn\'t replace titration.</div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Must / wine pH</label><input class="form-input" id="so2-ph" type="number" value="3.4" step="0.05" oninput="calcSO2()"></div>'
    +'<div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="so2-vol" type="number" value="5" step="0.1" oninput="calcSO2()"></div>'
    +'<div class="form-group"><label class="form-label">Current free SO₂ (ppm)</label><input class="form-input" id="so2-current" type="number" value="0" step="1" oninput="calcSO2()"></div></div>'
    +'<div class="form-group"><label class="form-label">Target molecular SO₂ (ppm)</label><select class="form-select" id="so2-target" onchange="calcSO2()"><option value="0.5">0.5 — light reds / sweet, minimal</option><option value="0.8" selected>0.8 — standard protective (most mead)</option><option value="1.5">1.5 — sweet, sorbate-free, max stability</option></select></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="so2-free">—</div><div class="micro-label">FREE SO₂ NEEDED</div></div>'
    +'<div style="text-align:center;padding:14px 8px;background:var(--bg3);border-radius:var(--radius)"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)" id="so2-kmeta">—</div><div class="micro-label">K-META TO ADD</div></div>'
    +'</div>'
    +'<div style="margin-top:10px;padding:10px;background:var(--bg4);border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;color:var(--text2);line-height:1.7" id="so2-detail">—</div>'
    +'<div id="so2-warn"></div>'
    +'</div>'
    +'<div class="card"><div class="card-header"><div class="card-title">🍋 ACID / TA ADJUSTMENT</div></div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.55">Mead often finishes flabby (low acid). Enter current and target titratable acidity (TA, g/L as tartaric) to size an acid addition — or a deacidification if you over-shot. <strong>Always bench-trial</strong> on a measured sample before dosing the batch; taste, don\'t just chase a number.</div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Current TA (g/L)</label><input class="form-input" id="ta-current" type="number" value="4.0" step="0.1" oninput="calcAcid()"></div>'
    +'<div class="form-group"><label class="form-label">Target TA (g/L)</label><input class="form-input" id="ta-target" type="number" value="6.0" step="0.1" oninput="calcAcid()"></div>'
    +'<div class="form-group"><label class="form-label">Volume (L)</label><input class="form-input" id="ta-vol" type="number" value="5" step="0.1" oninput="calcAcid()"></div></div>'
    +'<div class="form-group"><label class="form-label">Acid (for additions)</label><select class="form-select" id="ta-acid" onchange="calcAcid()"><option value="tartaric" selected>Tartaric (crisp, wine-like, most stable)</option><option value="malic">Malic (green-apple tartness)</option><option value="citric">Citric (fresh/zesty — can be metabolised)</option><option value="blend">Acid blend (balanced)</option></select></div>'
    +'<div style="text-align:center;padding:16px;background:var(--bg3);border-radius:var(--radius);margin-top:8px"><div style="font-family:var(--font-display);font-size:26px;color:var(--gold2)" id="ta-result">—</div><div class="micro-label" id="ta-result-label">ACID TO ADD</div></div>'
    +'<div style="margin-top:10px;padding:10px;background:var(--bg4);border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;color:var(--text2);line-height:1.7" id="ta-detail">—</div>'
    +'</div>'
    +renderBlendingTool()
    +'</div>';
}

function initTools(){
  calcSanitizer();
  if(typeof calcCleaner==='function')calcCleaner();
  if(typeof calcHydroCorrect==='function')calcHydroCorrect();
  if(typeof calcSGBrix==='function')calcSGBrix();
  calcNutrient();
  calcTOSNA();
  calcBacksweet();
  if(typeof calcCarbonation==='function')calcCarbonation();
  calcPitch();
  if(typeof calcSO2==='function')calcSO2();
  if(typeof calcAcid==='function')calcAcid();
  if(typeof renderTOSNAPlan==='function')renderTOSNAPlan();
}

// SO₂ calculator. Molecular SO₂ = freeSO₂ × 1/(1+10^(pH−pKa)), pKa≈1.81.
// To reach a molecular target you must hold freeSO₂ = target / molecularFraction.
// K-meta (potassium metabisulfite) yields ~57% SO₂ by weight.
function calcSO2(){
  var ph=parseFloat(document.getElementById('so2-ph').value);
  var vol=parseFloat(document.getElementById('so2-vol').value);
  var cur=parseFloat(document.getElementById('so2-current').value)||0;
  var molTarget=parseFloat(document.getElementById('so2-target').value)||0.8;
  var freeEl=document.getElementById('so2-free'),kmEl=document.getElementById('so2-kmeta'),detEl=document.getElementById('so2-detail'),warnEl=document.getElementById('so2-warn');
  if(!ph||!vol||ph<2.5||ph>4.5){
    freeEl.textContent='—';kmEl.textContent='—';detEl.textContent='Enter a pH between 2.8 and 4.0 and a volume.';warnEl.innerHTML='';return;
  }
  var molFraction=1/(1+Math.pow(10,ph-1.81));
  var freeNeeded=molTarget/molFraction;            // ppm = mg/L
  var addPpm=Math.max(0,freeNeeded-cur);
  // K-meta grams: addPpm mg/L × vol L = mg SO₂; ÷0.57 = mg K-meta; ÷1000 = g
  var kmetaG=(addPpm*vol)/0.57/1000;
  var campden=kmetaG/0.44;                          // ~0.44 g K-meta per Campden tablet
  freeEl.textContent=freeNeeded.toFixed(0)+' ppm';
  kmEl.textContent=addPpm>0?kmetaG.toFixed(2)+' g':'0 g';
  detEl.innerHTML='At pH '+ph.toFixed(2)+', molecular fraction ≈ '+(molFraction*100).toFixed(1)+'%.'
    +'<br>Hold <strong>'+freeNeeded.toFixed(0)+' ppm</strong> free SO₂ for '+molTarget+' ppm molecular.'
    +(addPpm>0?'<br>Add <strong>'+addPpm.toFixed(0)+' ppm</strong> ≈ '+kmetaG.toFixed(2)+' g K-meta ('+campden.toFixed(1)+' Campden tablets) to '+vol+' L.':'<br>You\'re already at or above target — no addition needed.');
  var warn='';
  if(ph>3.8)warn='⚠ Above pH 3.8 the molecular fraction is tiny — you\'d need impractically high free SO₂. Lower pH with an acid addition first (see the Acid / TA tool).';
  else if(freeNeeded>50)warn='⚠ '+freeNeeded.toFixed(0)+' ppm free SO₂ is high (sensory threshold ~50 ppm). Consider lowering pH or pairing with sorbate instead of relying on SO₂ alone.';
  warnEl.innerHTML=warn?'<div class="info-box" style="border-left-color:var(--gold);margin-top:10px;font-size:12px;color:var(--text2)">'+warn+'</div>':'';
}

// Acid / TA adjustment. Approx potencies: grams per litre to shift TA (as
// tartaric) by 1 g/L. Additions use the chosen acid; deacidification uses
// potassium bicarbonate. These are starting points — bench-trial to taste.
function calcAcid(){
  var cur=parseFloat(document.getElementById('ta-current').value);
  var tgt=parseFloat(document.getElementById('ta-target').value);
  var vol=parseFloat(document.getElementById('ta-vol').value);
  var acid=document.getElementById('ta-acid').value;
  var resEl=document.getElementById('ta-result'),lblEl=document.getElementById('ta-result-label'),detEl=document.getElementById('ta-detail');
  if(isNaN(cur)||isNaN(tgt)||!vol){resEl.textContent='—';detEl.textContent='Fill current TA, target TA and volume.';return;}
  var delta=tgt-cur;
  // g/L of acid needed to raise TA (as tartaric) by 1 g/L
  var potency={tartaric:1.0,malic:1.0,citric:0.9,blend:1.0};
  if(Math.abs(delta)<0.05){
    resEl.textContent='✓';lblEl.textContent='ALREADY ON TARGET';detEl.textContent='Current TA is within 0.05 g/L of target — leave it alone and taste.';return;
  }
  if(delta>0){
    var gPerL=delta*(potency[acid]||1.0);
    var grams=gPerL*vol;
    var names={tartaric:'tartaric acid',malic:'malic acid',citric:'citric acid',blend:'acid blend'};
    resEl.textContent=grams.toFixed(1)+' g';lblEl.textContent=(names[acid]||'acid').toUpperCase()+' TO ADD';
    detEl.innerHTML='Raise TA by <strong>'+delta.toFixed(1)+' g/L</strong> ('+cur.toFixed(1)+' → '+tgt.toFixed(1)+').'
      +'<br>≈ '+gPerL.toFixed(2)+' g/L × '+vol+' L = <strong>'+grams.toFixed(1)+' g</strong> '+(names[acid]||'acid')+'.'
      +'<br>Dissolve, add ~⅔, re-measure/taste, then titrate the rest. Cold-stabilise after tartaric additions.';
  }else{
    // Deacidify: potassium bicarbonate ~0.67 g/L lowers TA by ~1 g/L; CaCO3 ~0.66 g/L
    var drop=-delta;
    var kbicarb=drop*0.67*vol;
    var caco3=drop*0.66*vol;
    resEl.textContent=kbicarb.toFixed(1)+' g';lblEl.textContent='POTASSIUM BICARBONATE';
    detEl.innerHTML='Lower TA by <strong>'+drop.toFixed(1)+' g/L</strong> ('+cur.toFixed(1)+' → '+tgt.toFixed(1)+').'
      +'<br>≈ <strong>'+kbicarb.toFixed(1)+' g</strong> potassium bicarbonate (or '+caco3.toFixed(1)+' g calcium carbonate) in '+vol+' L.'
      +'<br>Add slowly — it foams. Limit to ~2 g/L per treatment; cold-stabilise, rack off precipitate.';
  }
}

function calcPitch(){
  var yeastId=document.getElementById('pc-yeast').value;
  var vol=parseFloat(document.getElementById('pc-vol').value);
  var og=parseFloat(document.getElementById('pc-og').value);
  var detailEl=document.getElementById('pc-detail');
  if(!vol||!og){
    document.getElementById('pc-grams').textContent='—';
    document.getElementById('pc-sachets').textContent='—';
    detailEl.textContent='—';
    return;
  }
  var r=calcPitchAmount(yeastId,vol,og);
  if(!r){detailEl.textContent='—';return;}
  document.getElementById('pc-grams').textContent=r.totalGrams.toFixed(1)+' g';
  document.getElementById('pc-sachets').textContent=r.sachetsRounded+(r.sachetsRounded===1?' sachet':' sachets')+' ('+r.yeast.sachetSize+'g)';
  var stressTxt=r.stressLevel==='high'?'<span style="color:var(--red2)">HIGH STRESS — high-OG mead</span>':r.stressLevel==='moderate'?'<span style="color:var(--honey)">MODERATE STRESS</span>':'<span style="color:var(--green2)">STANDARD</span>';
  var abvWarn=r.abvHeadroom<2?'<span style="color:var(--red2)"> ⚠ NEAR LIMIT</span>':r.abvHeadroom<0?'<span style="color:var(--red2)"> ⚠ EXCEEDS YEAST TOLERANCE</span>':'';
  detailEl.innerHTML=
    '<div><strong>Rehydrate</strong> in '+r.rehydrateWater+'ml warm water (35-40°C) for 15-20 min before pitching. Stir gently — no shocking.</div>'
    +'<div style="margin-top:4px"><strong>Pitch rate:</strong> '+r.gramsPerL.toFixed(2)+' g/L · '+stressTxt+'</div>'
    +'<div style="margin-top:4px"><strong>ABV headroom:</strong> ~'+r.abvHeadroom.toFixed(1)+'% before hitting '+r.yeast.abvMax+'% tolerance'+abvWarn+'</div>'
    +'<div style="margin-top:4px;color:var(--text3);font-style:italic">'+escHtml(r.yeast.profile)+'</div>'
    +'<div style="margin-top:4px;color:var(--text3)">Optimal temp: '+r.yeast.optimalTempLow+'-'+r.yeast.optimalTempHigh+'°C</div>';
}

// TOSNA 2.0 model:
//   YAN target (ppm) = gravity-points × 9 × N-demand-multiplier × honey-darkness-factor
//   N-demand multiplier: low .75, medium .9, high 1.25, extra-high 1.5
//   darkness factor:     none/light 1, light .93, medium .88, dark .82
//   nutrient YAN strength (% YAN-equivalent): Fermaid-O 40, Fermaid-K 10,
//     DAP 21, MJ/M05 sachet ~13 — grams = (YAN_ppm × L)/(pct × 10), the same
//     validated relationship the original scheduler used (≈10 g Fermaid-O for
//     a 5 L, 1.100 must), so dose magnitudes stay physically sane.
//   1/3 sugar break SG = OG − (OG−1)/3 — the point where ~⅓ of the sugar is gone.
var TOSNA2_NDEMAND={low:0.75,medium:0.9,high:1.25,extra_high:1.5};
var TOSNA2_DARKNESS={none:1,light:0.93,medium:0.88,dark:0.82};
var TOSNA2_YAN_PCT={'fermaid-o':40,'fermaid-k':10,'dap':21,'mj-mead':13};
function calcTOSNA(){
  var vol=parseFloat(document.getElementById('ts-vol').value);
  var og=parseFloat(document.getElementById('ts-og').value);
  var type=document.getElementById('ts-type').value;
  var ndemand=(document.getElementById('ts-ndemand')||{}).value||'medium';
  var darkness=(document.getElementById('ts-darkness')||{}).value||'none';
  var protocol=(document.getElementById('ts-protocol')||{}).value||'tosca2';
  var schedEl=document.getElementById('ts-schedule');
  var warnEl=document.getElementById('ts-warn');
  var breakEl=document.getElementById('ts-break-note');
  if(!vol||!og||og<1||og>1.3){
    document.getElementById('ts-yan').textContent='—';
    document.getElementById('ts-total').textContent='—';
    schedEl.textContent='—';if(warnEl)warnEl.innerHTML='';if(breakEl)breakEl.textContent='—';
    return;
  }
  var ogPoints=Math.round((og-1)*1000);
  var nMult=TOSNA2_NDEMAND[ndemand]||0.9;
  var dFactor=TOSNA2_DARKNESS[darkness]||1;
  var yanTarget=Math.round(ogPoints*9*nMult*dFactor);
  var yanPct=TOSNA2_YAN_PCT[type]||40;
  // grams = (YAN_ppm × volume_L) / (pct × 10) — validated dose magnitude
  var totalG=(yanTarget*vol)/(yanPct*10);
  var isOrganic=(type==='fermaid-o');
  var typeName={'fermaid-o':'Fermaid-O','fermaid-k':'Fermaid-K','dap':'DAP','mj-mead':'MJ Mead/M05 sachet'}[type];
  // DAP-bearing products: schedule 3 doses (all before the break) + organic-style spacing;
  // organic (Fermaid-O): GoFerm rehydration + 4 staggered doses to the 1/3 break.
  var breakSG=og-(og-1)/3;
  document.getElementById('ts-yan').textContent=yanTarget+' ppm';
  document.getElementById('ts-total').textContent=totalG.toFixed(2)+' g '+typeName;
  // ---- dummy-proof compatibility warning ----
  var warnHtml='';
  if(type==='mj-mead'){
    warnHtml='<div style="margin:8px 0;padding:11px 13px;border-radius:var(--radius);border-left:4px solid var(--red2);background:rgba(176,58,46,0.09);font-size:12.5px;color:var(--text2);line-height:1.6">'
      +'<strong style="color:var(--red2)">⛔ Wrong tool for TOSNA 2.0.</strong> The Mangrove Jack\'s / M05 mead-nutrient sachet is a pre-blended <strong>SNA</strong> product (it already contains DAP + dead-yeast organics in one mix). TOSNA 2.0 is an <em>organic-only</em> protocol built around Fermaid-O. Running this sachet on a 4-dose-to-the-break TOSNA schedule over-delivers DAP late and risks fusel/hot off-flavours. '
      +'<br><strong>Do one of:</strong> (a) switch the nutrient to <strong>Fermaid-O</strong> for true TOSNA 2.0, or (b) keep the sachet but follow its own <strong>SNA</strong> instructions — typically the full dose split in 2 (day 1 + day 3), all in before the 1/3 break.</div>';
  }else if(!isOrganic){
    warnHtml='<div style="margin:8px 0;padding:11px 13px;border-radius:var(--radius);border-left:4px solid #e0843c;background:rgba(224,132,60,0.08);font-size:12.5px;color:var(--text2);line-height:1.6">'
      +'<strong style="color:#e0843c">⚠ '+typeName+' contains DAP — not a pure TOSNA 2.0 nutrient.</strong> DAP is inorganic nitrogen yeast can\'t use above ~9% ABV, so <strong>every dose must be in before the 1/3 sugar break</strong> (SG '+breakSG.toFixed(3)+'). This calculator schedules them early for that reason. For the cleanest result with the fewest off-flavours, use <strong>Fermaid-O</strong> (organic, TOSNA 2.0).</div>';
  }
  if(warnEl)warnEl.innerHTML=warnHtml;
  // ---- schedule ----
  if(isOrganic){
    var doseG=totalG/4;
    // Per-protocol dose timings (4 organic doses). TOSCA 2.0 & TiOSNA end on the
    // 1/3 sugar break; classic TOSNA is a fixed 24/48/72/96h cadence.
    var timings={
      tosca2:['+24 h','+48 h','+72 h','1/3 BREAK (SG '+breakSG.toFixed(3)+')'],
      tosna:['+24 h','+48 h','+72 h','+96 h'],
      tiosna:['At pitch','+24 h','+48 h','1/3 BREAK (SG '+breakSG.toFixed(3)+')']
    }[protocol]||['+24 h','+48 h','+72 h','1/3 BREAK (SG '+breakSG.toFixed(3)+')'];
    schedEl.innerHTML=
      '<div style="color:var(--green2);margin-bottom:4px">REHYDRATION → GoFerm Protect ≈ '+(vol*1.25).toFixed(1)+' g in ~'+Math.round(vol*5)+' ml of 43°C water before pitch (primes sterols; not part of the YAN total)</div>'
      +timings.map(function(t,i){
        var last=(i===timings.length-1);
        return '<div><span style="color:var(--gold2);font-weight:600">'+t+'</span> &nbsp;→ '+doseG.toFixed(2)+' g Fermaid-O'+(last?' — the final dose':'')+'</div>';
      }).join('');
  }else{
    var doseG3=totalG/3;
    schedEl.innerHTML=
      '<div><span style="color:var(--gold2);font-weight:600">+24 h</span> &nbsp;→ '+doseG3.toFixed(2)+' g '+typeName+'</div>'
      +'<div><span style="color:var(--gold2);font-weight:600">+48 h</span> &nbsp;→ '+doseG3.toFixed(2)+' g '+typeName+'</div>'
      +'<div><span style="color:var(--gold2);font-weight:600">+72 h / before break</span> → '+doseG3.toFixed(2)+' g '+typeName+' — <span style="color:#e0843c">last DAP dose, must be in before SG '+breakSG.toFixed(3)+'</span></div>';
  }
  // ---- sugar-break explainer ----
  if(breakEl){
    breakEl.innerHTML='<strong style="color:var(--text2)">What\'s the 1/3 sugar break?</strong> It\'s the moment about one-third of the sugar has fermented — at OG '+og.toFixed(3)+' that\'s roughly <strong>SG '+breakSG.toFixed(3)+'</strong> ('+ogPoints+' gravity points → stop adding nitrogen once ~'+Math.round(ogPoints/3)+' points are gone). Yeast take up nitrogen during their early growth phase, so all nutrients go in before this point; dosing later — especially DAP — feeds fusels instead of cells. Degas gently before each addition (nutrients + CO₂ can foam over).';
  }
}

// Priming-sugar calculator for bottle-conditioned sparkling mead.
// Residual CO₂ already in solution depends on temperature (the standard brewing
// polynomial, which takes °F). Sugar to add = (target − residual) volumes ×
// volume × a per-sugar factor (g/L per volume of CO₂): dextrose ~4.0, sucrose
// ~3.8, honey ~5.0 (≈80% fermentable), DME ~5.7.
function calcCarbonation(){
  var volEl=document.getElementById('cb-vol');
  if(!volEl)return; // tools view not mounted
  var vol=parseFloat(volEl.value);
  var temp=parseFloat(document.getElementById('cb-temp').value);
  var factor=parseFloat(document.getElementById('cb-sugar').value)||4.0;
  var sugarLabel=document.getElementById('cb-sugar').selectedOptions[0].text;
  var styleSel=document.getElementById('cb-style').value;
  var customWrap=document.getElementById('cb-custom-wrap');
  var target;
  if(styleSel==='custom'){customWrap.style.display='';target=parseFloat(document.getElementById('cb-target').value);}
  else{customWrap.style.display='none';target=parseFloat(styleSel);}
  var outEl=document.getElementById('cb-sugar-out'),perEl=document.getElementById('cb-perL'),detEl=document.getElementById('cb-detail'),warnEl=document.getElementById('cb-warn');
  if(!vol||vol<=0||isNaN(temp)||!target||target<=0){
    outEl.textContent='—';perEl.textContent='—';detEl.textContent='Enter volume, mead temperature and a target carbonation level.';warnEl.innerHTML='';return;
  }
  var tF=temp*9/5+32;
  var residual=3.0378-0.050062*tF+0.0002655*tF*tF;
  if(residual<0)residual=0;
  var add=target-residual;
  if(add<=0){
    outEl.textContent='0 g';perEl.textContent='0 g/L';
    detEl.textContent='At '+temp+'°C the mead already holds ~'+residual.toFixed(2)+' volumes of CO₂, at or above your '+target.toFixed(1)+'-volume target — no priming sugar needed. (A warmer reading retains less CO₂ and would raise the dose.)';
    warnEl.innerHTML='';return;
  }
  var grams=add*vol*factor;
  outEl.textContent=Math.round(grams)+' g';
  perEl.textContent=(grams/vol).toFixed(1)+' g/L';
  detEl.innerHTML='Target '+target.toFixed(1)+' vol − ~'+residual.toFixed(2)+' vol already dissolved at '+temp+'°C = +'+add.toFixed(2)+' vol to add.<br>≈ <strong>'+Math.round(grams)+' g</strong> '+sugarLabel.toLowerCase()+' total — dissolve in a little warm water and gently mix into the batch at bottling. Per 750 ml bottle: ~'+(grams/vol*0.75).toFixed(1)+' g.';
  var w='';
  if(target>3.0){
    w='<div class="stock-alert" style="margin:10px 0 0"><span class="icon">⚠</span><span><strong>'+target.toFixed(1)+' volumes is high pressure.</strong> Use champagne / Belgian bottles rated for it, with crown caps or corks held by a wire muselet. Never use still-wine bottles above ~2.5 vol — they can fail.</span></div>';
  }else if(target>2.5){
    w='<div class="stock-alert warn" style="margin:10px 0 0"><span class="icon">⚠</span><span>Above ~2.5 volumes, use heavy beer / Belgian bottles with crown caps. Standard wine bottles and swing-tops are borderline.</span></div>';
  }
  warnEl.innerHTML=w;
}

function calcBacksweet(){
  var fg=parseFloat(document.getElementById('bs-fg').value);
  var target=parseFloat(document.getElementById('bs-target').value);
  var vol=parseFloat(document.getElementById('bs-vol').value);
  var type=document.getElementById('bs-type').value;
  var sweetEl=document.getElementById('bs-sweet');
  var sorbEl=document.getElementById('bs-sorb');
  var metaEl=document.getElementById('bs-meta');
  var protoEl=document.getElementById('bs-protocol');
  if(!fg||!target||!vol||target<=fg){
    sweetEl.textContent='—';
    sorbEl.textContent='—';
    metaEl.textContent='—';
    protoEl.textContent=target<=fg?'Target FG must be higher than current FG.':'—';
    return;
  }
  var deltaPoints=Math.round((target-fg)*1000);
  // grams/L per gravity point for each sweetener — kept consistent with the
  // app's honey constant (292 SG-points per kg per L, used by the OG/honey and
  // cost tools): 1 point/L ÷ 292 = 1/0.292 ≈ 3.4 g honey/L.
  //   Honey  ≈ 3.4 g/L per point  (35 PPG, ~80% sugars)
  //   Sucrose ≈ 2.6 g/L per point (100% fermentable sugar)
  //   DME    ≈ 2.9 g/L per point  (~85% fermentable)
  var perPoint={honey:3.4,sugar:2.6,dme:2.9}[type];
  var typeName={honey:'honey',sugar:'table sugar',dme:'DME'}[type];
  var sweetenerG=deltaPoints*perPoint*vol;
  // Stabilization doses
  // Potassium sorbate: ~0.5 g/L for ~12% ABV mead (range 0.3-0.75)
  // K-meta: ~0.05 g/L (50 mg/L) = ~28 ppm SO2 free
  var sorbG=0.5*vol;
  var metaG=0.05*vol;
  sweetEl.textContent=sweetenerG.toFixed(0)+' g '+typeName;
  sorbEl.textContent=sorbG.toFixed(2)+' g';
  metaEl.textContent=metaG.toFixed(2)+' g';
  protoEl.innerHTML='<div style="color:var(--gold2);font-weight:600;margin-bottom:4px">PROTOCOL · STABILIZE BEFORE SWEETENING</div>'
    +'<div>1. Rack off any sediment into a clean vessel.</div>'
    +'<div>2. Dissolve <strong>'+sorbG.toFixed(2)+' g potassium sorbate</strong> + <strong>'+metaG.toFixed(2)+' g potassium metabisulfite</strong> in a little mead, stir into batch.</div>'
    +'<div>3. Wait <strong>24-48 hours</strong>. Yeast activity must be fully stopped.</div>'
    +'<div>4. Warm <strong>'+sweetenerG.toFixed(0)+' g '+typeName+'</strong> gently (don\'t exceed 50°C) and stir in until fully dissolved.</div>'
    +'<div>5. Taste before bottling — adjust if too dry/sweet.</div>'
    +'<div style="margin-top:6px;color:var(--text3)">Final ABV unchanged · estimated final sweetness ≈ '+(target<=1.005?'Bone Dry':target<=1.010?'Off-Dry':target<=1.015?'Semi-Sweet':target<=1.020?'Sweet':'Dessert')+'</div>';
}

function calcNutrient(){
  var vol=parseFloat(document.getElementById('nc-vol').value);
  var ratePerL=parseFloat(document.getElementById('nc-style').value);
  var sachet=parseFloat(document.getElementById('nc-sachet').value);
  if(!vol||!ratePerL||!sachet){
    document.getElementById('nc-total').textContent='—';
    document.getElementById('nc-sachets').textContent='—';
    document.getElementById('nc-dose').textContent='—';
    return;
  }
  var total=vol*ratePerL;
  // Round total to nearest 0.5g for usability
  var totalRounded=Math.round(total*2)/2;
  var sachetsExact=totalRounded/sachet;
  var sachetsRounded=Math.round(sachetsExact*10)/10;
  document.getElementById('nc-total').textContent=totalRounded+' g';
  // Display as "1.5 sachets" or "2 sachets" (integer if exact)
  var sachetStr=Math.abs(sachetsRounded-Math.round(sachetsRounded))<0.05?Math.round(sachetsRounded)+(Math.round(sachetsRounded)===1?' sachet':' sachets'):sachetsRounded+' sachets';
  document.getElementById('nc-sachets').textContent=sachetStr;
  // SNA dose breakdown — 2 equal doses Day 1 + Day 3
  var dose=Math.round(totalRounded/2*2)/2;
  var doseSachet=Math.round(dose/sachet*10)/10;
  document.getElementById('nc-dose').innerHTML=
    '<span style="color:var(--gold2)">SNA · 2 doses</span><br>'
    +'Day 1: '+dose+' g  <span style="color:var(--text3)">(~'+doseSachet+(doseSachet===1?' sachet':' sachets')+')</span><br>'
    +'Day 3: '+dose+' g  <span style="color:var(--text3)">(~'+doseSachet+(doseSachet===1?' sachet':' sachets')+')</span>';
}

function calcAbv(){
  var og=parseFloat(document.getElementById('abv-og').value);
  var fg=parseFloat(document.getElementById('abv-fg').value);
  var el=document.getElementById('abv-result');
  if(og&&fg&&og>fg)el.textContent=calcABV(og,fg)+'%';else el.textContent='—';
}
function calcHoney(){
  var vol=parseFloat(document.getElementById('hc-vol').value);
  var og=parseFloat(document.getElementById('hc-og').value);
  var el=document.getElementById('hc-result');
  if(vol&&og&&og>1){
    var gravityPoints=(og-1)*1000;
    // Honey yields ~35 PPG (points per pound per US gallon) → ~292 SG-points per kg per L of batch
    var honeyKg=(gravityPoints*vol)/292;
    el.textContent=honeyKg.toFixed(2)+' kg';
  }else el.textContent='—';
}
function calcSanitizer(){
  var volEl=document.getElementById('sm-vol');
  var el=document.getElementById('sm-result');
  if(!volEl||!el)return;
  var vol=parseFloat(volEl.value);
  if(vol)el.textContent=(vol*getSanitizer().mlPerL).toFixed(1)+' ml';else el.textContent='—';
}

function setSanitizerChoice(key){
  if(!SANITIZERS[key])return;
  APP.settings.sanitizer=key;
  saveSettings();
  scheduleSave();
  toast('🧪 Sanitizer: '+SANITIZERS[key].name);
  if(currentView==='tools')renderMain();
}
function calcCleaner(){
  var v=document.getElementById('cm-vol');
  var el=document.getElementById('cm-result');
  if(!v||!el)return;
  var vol=parseFloat(v.value);
  if(vol)el.textContent=(vol*4).toFixed(1)+' g';else el.textContent='—';
}

// Hydrometer temperature correction (Brewer's Friend polynomial, 0-40°C range)
// Hydrometers are calibrated to read true SG at one temperature. At others,
// density of water changes, so the reading is off. This formula computes the
// true-at-calibration-temp SG given a reading at sample temp.
function calcHydroCorrect(){
  var sgEl=document.getElementById('hc-sg');
  var tsampleEl=document.getElementById('hc-tsample');
  var tcalEl=document.getElementById('hc-tcal');
  var outEl=document.getElementById('hc-corrected');
  var deltaEl=document.getElementById('hc-delta');
  var noteEl=document.getElementById('hc-note');
  if(!sgEl||!tsampleEl||!tcalEl||!outEl)return;
  var sg=parseFloat(sgEl.value);
  var ts=parseFloat(tsampleEl.value);
  var tc=parseFloat(tcalEl.value);
  if(!sg||isNaN(ts)||isNaN(tc)){outEl.textContent='—';if(deltaEl)deltaEl.textContent='—';return;}
  // Convert to °F for the polynomial (which is specified in Fahrenheit)
  function cToF(c){return c*9/5+32;}
  var tsF=cToF(ts),tcF=cToF(tc);
  function densityFactor(tF){
    return 1.00130346 - 1.34722124e-4*tF + 2.04052596e-6*tF*tF - 2.32820948e-9*tF*tF*tF;
  }
  var corrected=sg*(densityFactor(tsF)/densityFactor(tcF));
  outEl.textContent=corrected.toFixed(4);
  if(deltaEl){
    var delta=corrected-sg;
    var sign=delta>=0?'+':'';
    deltaEl.textContent=sign+delta.toFixed(4);
    deltaEl.style.color=Math.abs(delta)<0.0005?'var(--text)':(delta>0?'var(--green2)':'var(--red2)');
  }
  if(noteEl){
    if(ts>tc+1)noteEl.textContent='Warm sample — true SG is higher than the raw reading (+'+(corrected-sg).toFixed(4)+').';
    else if(ts<tc-1)noteEl.textContent='Cold sample — true SG is lower than the raw reading ('+(corrected-sg).toFixed(4)+').';
    else noteEl.textContent='Within ±1°C of calibration — correction is negligible.';
  }
}

// SG ↔ Brix conversion. Refractometers read Brix; hydrometers read SG. Useful
// when one device is unavailable or you want to cross-check the other.
// Conversion: Brix ≈ (((182.4601·SG − 775.6821)·SG + 1262.7794)·SG − 669.5622)
// (NIST polynomial). Inverse uses a 2nd-order approximation good for mead range.
function sgToBrix(sg){
  if(!sg||sg<0.98||sg>1.20)return null;
  return((182.4601*sg-775.6821)*sg+1262.7794)*sg-669.5622;
}
function brixToSG(brix){
  if(brix==null||brix<0||brix>40)return null;
  // Widely-used homebrewing approximation, accurate to ~0.0005 SG across 0-30°
  // Brix: SG = Brix / (258.6 - (Brix/258.2)·227.1) + 1
  return brix/(258.6-(brix/258.2)*227.1)+1;
}
function calcSGBrix(){
  var sgEl=document.getElementById('sb-sg');
  var brEl=document.getElementById('sb-brix');
  var ogEl=document.getElementById('sb-og');
  var brOut=document.getElementById('sb-brix-out');
  var sgOut=document.getElementById('sb-sg-out');
  var fermentingNote=document.getElementById('sb-fermenting-note');
  if(!sgEl||!brEl||!brOut||!sgOut)return;
  var sg=parseFloat(sgEl.value);
  var br=parseFloat(brEl.value);
  // Show whichever side was filled in, with the conversion on the other
  if(!isNaN(sg)){
    var brConv=sgToBrix(sg);
    brOut.textContent=brConv!=null?brConv.toFixed(1)+'° Bx':'—';
  }else brOut.textContent='—';
  if(!isNaN(br)){
    var sgConv=brixToSG(br);
    sgOut.textContent=sgConv!=null?sgConv.toFixed(4):'—';
  }else sgOut.textContent='—';
  // Mid-ferment refractometer correction. Alcohol skews refractometer Brix
  // readings upward — when fermentation is underway, you need the original
  // pre-ferment Brix (Bi) and the current Brix (Bf) to estimate true SG.
  var og=parseFloat(ogEl?ogEl.value:NaN);
  if(!isNaN(og)&&!isNaN(br)&&og>br){
    // Sean Terrill formula (widely used in homebrewing):
    // SG = 1.0000 - 0.0044993·Bi + 0.011774·Bf + 0.00027581·Bi² - 0.0012717·Bf² - 0.00000728·Bi³ + 0.000007885·Bf³
    var Bi=og, Bf=br;
    var sgEstimate = 1.0000 - 0.0044993*Bi + 0.011774*Bf
      + 0.00027581*Bi*Bi - 0.0012717*Bf*Bf
      - 0.00000728*Bi*Bi*Bi + 0.000007885*Bf*Bf*Bf;
    if(fermentingNote){
      fermentingNote.style.display='block';
      fermentingNote.innerHTML='<strong style="color:var(--gold2)">Alcohol-corrected SG estimate:</strong> '
        +'<span style="font-family:var(--font-mono);color:var(--gold2)">'+sgEstimate.toFixed(4)+'</span>'
        +' · approximate ABV so far: <span style="font-family:var(--font-mono);color:var(--gold2)">'
        +(((Bi-Bf)*0.51)).toFixed(1)+'%</span>'
        +'<div style="font-size:11px;color:var(--text3);margin-top:4px;line-height:1.5">Direct Brix→SG above is only accurate BEFORE fermentation starts. Once alcohol is present, the refractometer over-reads — use this corrected value instead. Best at OG 1.060-1.120.</div>';
    }
  }else if(fermentingNote){
    fermentingNote.style.display='none';
  }
}

// ==================== MEAD GUIDE ====================
// Beginner walkthrough — a complete first batch, empty fermenter to first
// tasting. Featured, always-open at the top of the guide.
var BEGINNER_HOWTO=[
  {t:'Gather your kit',d:'A fermenter with an airlock, a hydrometer + trial jar, an auto-siphon, a long spoon, and a no-rinse sanitiser. For a first 5 L batch: ~1.5–1.7 kg honey, chlorine-free water, a packet of mead yeast (e.g. M05), and yeast nutrient.'},
  {t:'Clean, then sanitise',d:'Clean everything that will touch the must with an oxygen cleaner, then sanitise with a no-rinse acid sanitiser (Chemipro SAN or Star San). Don\'t skip either — wild yeast and bacteria are the #1 cause of off-flavours.'},
  {t:'Mix the must & take OG',d:'Stir the honey into room-temperature water until fully dissolved; top up to your target volume. Take a hydrometer reading — that\'s your Original Gravity (OG), usually 1.090–1.110. Don\'t heat the honey; it drives off the aromatics.'},
  {t:'Pitch the yeast',d:'Sprinkle dry mead yeast over the surface (or rehydrate per the packet). Seal with the airlock filled to the line, and keep it somewhere stable at 18–22 °C.'},
  {t:'Feed it (days 1–3)',d:'Honey is nutrient-poor, so add yeast nutrient in stages over the first few days — see the Nutrient Protocols guide for SNA/TOSNA. All nutrient goes in before the 1/3 sugar break.'},
  {t:'Let it ferment',d:'Bubbling starts within a day or two and slows over 2–4 weeks. Take a gravity reading every few days. Resist opening the vessel — temperature stability matters more than fussing.'},
  {t:'Rack to secondary',d:'When gravity is stable, siphon the mead off the sediment (lees) into a clean vessel, leaving the gunk behind. Optionally add a pinch of K-meta to guard against oxidation.'},
  {t:'Age it',d:'Mead is transformed by time. Leave it months — a year or more for big ones — in a cool, dark place with minimal headspace. It will clear and the harshness will mellow.'},
  {t:'Bottle',d:'Two identical gravity readings a few days apart mean it\'s done. Sanitise bottles, siphon in with minimal headspace, cap, and label with the batch, date, OG/FG and ABV.'},
  {t:'Taste & learn',d:'Pour, observe, smell, taste — and write it down. Most meads keep improving for 6–12 months. Your notes are how the next batch gets better.'}
];
function renderBeginnerHowto(){
  var steps=BEGINNER_HOWTO.map(function(s,i){
    return'<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">'
      +'<div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;background:var(--bg4);border:1px solid var(--gold);color:var(--gold2);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:12px">'+(i+1)+'</div>'
      +'<div><div style="font-size:14px;color:var(--text);font-weight:500;margin-bottom:2px">'+escHtml(s.t)+'</div><div style="font-size:13px;color:var(--text2);line-height:1.6">'+escHtml(s.d)+'</div></div>'
    +'</div>';
  }).join('');
  return'<details class="card" open style="margin-bottom:20px;border-left:3px solid var(--gold)"><summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px"><span style="font-size:22px">🍯</span><div style="flex:1"><div class="card-title" style="font-size:15px">HOW TO MAKE MEAD — A BEGINNER\'S FIRST BATCH</div><div style="font-size:12px;color:var(--text3);font-style:italic;margin-top:2px">A complete walkthrough, from empty fermenter to first tasting</div></div><span style="color:var(--text3);font-size:14px">▾</span></summary>'
    +'<div style="margin-top:12px">'+steps+'</div></details>';
}
// Topic detail opens in a modal so the grid stays a tidy set of small cards.
function openGuideSection(i){
  var s=GUIDE_SECTIONS()[i];
  if(!s)return;
  closeModal();
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:640px">'
    +'<div class="modal-title">'+s.icon+' '+escHtml(s.title.toUpperCase())+'</div>'
    +'<div style="font-size:14px;color:var(--text2);line-height:1.8;white-space:pre-line">'+escHtml(s.content)+'</div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
function renderGuide(){
  var sections=GUIDE_SECTIONS();
  var cards=sections.map(function(s,i){
    if(s.type==='honey-library')return'';
    var teaser=String(s.content||'').replace(/\s+/g,' ').trim().slice(0,104);
    return'<div class="card" style="cursor:pointer;margin:0" onclick="openGuideSection('+i+')">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px"><span style="font-size:20px">'+s.icon+'</span><div class="card-title" style="font-size:12.5px">'+escHtml(s.title.toUpperCase())+'</div></div>'
      +'<div style="font-size:12.5px;color:var(--text3);line-height:1.5">'+escHtml(teaser)+'…</div>'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold2);letter-spacing:1px;margin-top:10px">READ →</div>'
    +'</div>';
  }).join('');
  return'<div class="page-title">Mead Guide</div><div class="page-subtitle">The Beginner Meadwright\'s Compendium</div>'
    +'<div class="ornament">— ⬡ ✦ ⬡ —</div>'
    +renderBeginnerHowto()
    +'<div style="font-family:var(--font-display);font-size:14px;color:var(--gold2);letter-spacing:2px;margin:6px 0 12px">TOPICS · tap to read</div>'
    +'<div class="grid-3">'+cards+'</div>';
}

// ==================== BOTTLE SCANNER ====================
// Opens the camera, watches for a QR code, and routes to the matching batch.
//
// Detection strategy:
//   1. Try the native BarcodeDetector API first (Chrome/Edge on Android,
//      Safari 17+). When available it's faster and more accurate because the
//      browser delegates to the OS image-processing pipeline.
//   2. Fall back to jsQR, a pure-JS QR decoder loaded lazily from a CDN. This
//      works on every browser that supports getUserMedia + canvas — basically
//      everything modern, including desktop Chrome on macOS where
//      BarcodeDetector isn't implemented.
//
// The QR codes on bottle/storage labels contain the full share URL
// (e.g. .../meadows.html#share=2024-001). We extract the batch ref via regex
// and pass it through findBatchByRef so legacy hex-id URLs still work.

function openBottleScanner(){
  closeModal();
  window._bottleScanner={stream:null,active:false,interval:null,detector:null,jsqrLoading:null};
  renderBottleScannerModal();
  setTimeout(startBottleScanner,100);
}

function renderBottleScannerModal(){
  closeModal();
  // Always show the camera UI — we'll figure out which decode path works at
  // runtime. The old "your browser doesn't support" message fired for every
  // desktop Chrome and Firefox user even though jsQR works there fine.
  var html='<div class="modal-overlay" onclick="if(event.target===this){stopBottleScanner();closeModal();}"><div class="modal" style="max-width:560px;display:flex;flex-direction:column">'
    +'<div class="modal-title">📷 SCAN BOTTLE QR</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin-bottom:12px;line-height:1.55">Point your camera at a QR code on a bottle or storage label. The batch opens automatically once detected.</div>'
    +'<div style="position:relative;background:#000;border-radius:var(--radius);overflow:hidden;aspect-ratio:4/3;margin-bottom:14px">'
    +'<video id="bs-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;display:block"></video>'
    // Hidden canvas — used by the jsQR fallback path to extract image data
    // from video frames. Kept out of the DOM flow with display:none.
    +'<canvas id="bs-canvas" style="display:none"></canvas>'
    +'<div id="bs-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">'
    +'<div style="width:60%;aspect-ratio:1;border:2px solid var(--gold2);border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,0.35)"></div>'
    +'</div>'
    +'<div id="bs-status" style="position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:rgba(0,0,0,0.7);color:var(--gold2);font-family:var(--font-mono);font-size:11px;letter-spacing:1px;text-align:center">INITIALISING…</div>'
    +'</div>'
    +'<div style="font-size:11.5px;color:var(--text3);margin-bottom:10px;line-height:1.55;text-align:center">Or paste a share URL if the camera isn\'t cooperating:</div>'
    +'<input type="text" id="bs-fallback-url" placeholder="https://your-meados-server/share/&lt;token&gt;" style="width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:12px;font-family:var(--font-mono);margin-bottom:10px" onkeydown="if(event.key===\'Enter\')handleBottleScannerURL(this.value)">'
    +'<button class="btn btn-secondary btn-sm" onclick="handleBottleScannerURL(document.getElementById(\'bs-fallback-url\').value)" style="width:100%">Open from pasted URL</button>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><button class="btn btn-secondary" onclick="stopBottleScanner();closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// Lazy-load jsQR from a CDN. Pinned version + integrity-by-version so a
// CDN compromise can't silently swap in malicious code. Cached on
// window.jsQR after first load so re-opening the scanner is instant.
function loadJsQR(){
  if(window.jsQR)return Promise.resolve(window.jsQR);
  if(window._bottleScanner&&window._bottleScanner.jsqrLoading)return window._bottleScanner.jsqrLoading;
  var p=new Promise(function(resolve,reject){
    var s=document.createElement('script');
    s.src='/jsQR.min.js';
    s.async=true;
    s.onload=function(){
      if(window.jsQR)resolve(window.jsQR);
      else reject(new Error('jsQR loaded but window.jsQR undefined'));
    };
    s.onerror=function(){reject(new Error('Failed to load jsQR from CDN'));};
    document.head.appendChild(s);
  });
  if(window._bottleScanner)window._bottleScanner.jsqrLoading=p;
  return p;
}

async function startBottleScanner(){
  var video=document.getElementById('bs-video');
  var status=document.getElementById('bs-status');
  if(!video)return;

  // Step 1 — open the camera. This is the same on every code path. If it
  // fails (permission denied, no camera, insecure context), report and stop.
  try{
    var stream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},
      audio:false
    });
    window._bottleScanner.stream=stream;
    video.srcObject=stream;
    await video.play();
  }catch(e){
    if(status){
      // Common cases: NotAllowedError (user denied), NotFoundError (no camera),
      // NotReadableError (camera busy). Insecure context errors have a
      // distinctive message — surface that hint explicitly.
      var msg=String(e&&e.message||e);
      if(/secure context|https/i.test(msg))status.textContent='⚠ Camera needs HTTPS — load this app via your HA URL, not the LAN IP';
      else if(/not allowed|denied/i.test(msg))status.textContent='⚠ Camera access denied — grant permission in browser settings';
      else if(/not found/i.test(msg))status.textContent='⚠ No camera detected on this device';
      else status.textContent='⚠ '+msg;
      status.style.color='var(--red2)';
    }
    return;
  }

  // Step 2 — pick a decoder. Native is faster on supported browsers, jsQR
  // works everywhere else. If neither path can be set up, show the URL paste
  // box as the only option.
  var useNative=false;
  if(typeof BarcodeDetector!=='undefined'){
    try{
      // Some browsers expose BarcodeDetector but throw when you actually try
      // to construct one (e.g. macOS Chrome doesn't bundle the underlying
      // decoder library). Guard with a try/catch and ALSO probe getSupportedFormats.
      window._bottleScanner.detector=new BarcodeDetector({formats:['qr_code']});
      // Probe — does this detector actually do anything?
      if(BarcodeDetector.getSupportedFormats){
        var fmts=await BarcodeDetector.getSupportedFormats();
        if(Array.isArray(fmts)&&fmts.indexOf('qr_code')>=0)useNative=true;
      }else{
        useNative=true; // assume yes if no probe method exists
      }
    }catch(e){useNative=false;}
  }

  if(status){
    status.style.color='var(--gold2)';
    status.textContent=useNative?'SCANNING (native)…':'LOADING DECODER…';
  }

  // Load jsQR up-front even if native is available — gives instant fallback
  // if native silently fails. Non-blocking.
  if(!useNative){
    try{
      await loadJsQR();
      if(status)status.textContent='SCANNING…';
    }catch(e){
      if(status){
        status.textContent='⚠ Couldn\'t load decoder — check network or paste URL below';
        status.style.color='var(--red2)';
      }
      return;
    }
  }

  // Step 3 — start the scan loop.
  window._bottleScanner.active=true;
  window._bottleScanner.interval=setInterval(function(){
    if(!window._bottleScanner.active)return;
    if(useNative)scanFrameNative(video,status);
    else scanFrameJsQR(video,status);
  },350);
}

async function scanFrameNative(video,status){
  try{
    var barcodes=await window._bottleScanner.detector.detect(video);
    if(barcodes&&barcodes.length){
      var qr=barcodes[0].rawValue||'';
      if(status)status.textContent='✓ FOUND — opening';
      handleBottleScannerURL(qr);
    }
  }catch(e){}
}

function scanFrameJsQR(video,status){
  if(!window.jsQR||video.readyState<2)return;
  var canvas=document.getElementById('bs-canvas');
  if(!canvas)return;
  // Match canvas to current video dimensions. Reading these every frame is
  // cheap and handles orientation/zoom changes mid-scan.
  var w=video.videoWidth,h=video.videoHeight;
  if(!w||!h)return;
  canvas.width=w;canvas.height=h;
  var ctx=canvas.getContext('2d');
  ctx.drawImage(video,0,0,w,h);
  try{
    var imageData=ctx.getImageData(0,0,w,h);
    // dontInvert is faster — bottle labels print dark on light, no need
    // to also check the inverted form.
    var result=window.jsQR(imageData.data,imageData.width,imageData.height,{inversionAttempts:'dontInvert'});
    if(result&&result.data){
      if(status)status.textContent='✓ FOUND — opening';
      handleBottleScannerURL(result.data);
    }
  }catch(e){}
}

function stopBottleScanner(){
  if(!window._bottleScanner)return;
  window._bottleScanner.active=false;
  if(window._bottleScanner.interval){clearInterval(window._bottleScanner.interval);window._bottleScanner.interval=null;}
  if(window._bottleScanner.stream){
    window._bottleScanner.stream.getTracks().forEach(function(t){t.stop();});
    window._bottleScanner.stream=null;
  }
  window._bottleScanner.detector=null;
}

function handleBottleScannerURL(url){
  url=String(url||'').trim();
  if(!url){toast('⚠ Nothing to open');return;}
  var batch=null;
  // Current label QR form: /share/<token>. Resolve the token to a batch via the
  // owner's local shareTokens map (the owner is the one scanning in-app).
  var pm=/\/share\/([A-Za-z0-9_-]+)/.exec(url);
  if(pm){
    var bid=(APP.shareTokens||{})[decodeURIComponent(pm[1])];
    if(bid)batch=APP.batches.find(function(b){return b.id===bid;});
  }
  if(!batch){
    // Legacy hash forms: #share=<ref> / #batch=<ref> (serial or hex id).
    var m=/#(?:share|batch)=([^&]+)/.exec(url);
    if(m){
      var ref=decodeURIComponent(m[1]);
      batch=(typeof findBatchByRef==='function')?findBatchByRef(ref):APP.batches.find(function(b){return b.id===ref;});
    }
  }
  if(!batch){toast('⚠ URL doesn\'t match any batch in this database');return;}
  stopBottleScanner();
  closeModal();
  showView('batch',batch.id);
}

// ==================== GLOBAL SEARCH ====================
// Cross-everything search: batches, batch notes, tasting notes, addition
// notes, supply names/notes, custom recipes. Opens as a modal with a single
// input that filters in real time and groups results by type. Pressing Enter
// on the first result (or clicking) navigates to it.
//
// Triggered from the topbar search button or via Ctrl/Cmd-K. State lives on
// window._globalSearch = { query: '' } for the modal's lifetime.

function openGlobalSearch(){
  window._globalSearch={query:''};
  renderGlobalSearchModal();
  setTimeout(function(){
    var el=document.getElementById('gs-input');
    if(el)el.focus();
  },80);
}

function renderGlobalSearchModal(){
  closeModal();
  var q=(window._globalSearch&&window._globalSearch.query)||'';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()" id="gs-overlay">'
    +'<div class="modal" style="max-width:720px;max-height:88vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">🔍 SEARCH EVERYTHING</div>'
    +'<input type="text" id="gs-input" placeholder="Search batches, tastings, notes, additions, supplies, recipes…" '
      +'value="'+escHtml(q)+'" oninput="window._globalSearch.query=this.value;updateGlobalSearchResults()" '
      +'onkeydown="if(event.key===\'Enter\')gsActivateFirstResult();if(event.key===\'Escape\')closeModal()" '
      +'style="width:100%;padding:14px 16px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:15px;font-family:inherit;margin-bottom:12px">'
    +'<div id="gs-hint" style="font-size:11px;color:var(--text3);font-style:italic;margin-bottom:10px;line-height:1.55">Tip: type a couple of words from anywhere in your journal — batch names, tasting flavors, addition notes, supplier names. Results group by type. Press <kbd style="background:var(--bg4);padding:1px 5px;border-radius:3px;font-family:var(--font-mono);font-size:10px">Enter</kbd> to open the top result.</div>'
    +'<div id="gs-results" style="flex:1;overflow-y:auto;min-height:200px"></div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  updateGlobalSearchResults();
}

// Cached "first result" id+kind so Enter can activate it from anywhere
var _gsFirstHit=null;

function updateGlobalSearchResults(){
  var container=document.getElementById('gs-results');
  if(!container)return;
  var q=((window._globalSearch&&window._globalSearch.query)||'').trim().toLowerCase();
  _gsFirstHit=null;
  if(!q){
    container.innerHTML='<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">Start typing to search across your whole journal.</div>';
    return;
  }
  var hits=performGlobalSearch(q);
  var totalCount=hits.batches.length+hits.tastings.length+hits.additions.length+hits.supplies.length+hits.recipes.length+hits.logs.length;
  if(!totalCount){
    container.innerHTML='<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">No matches for "'+escHtml(q)+'".</div>';
    return;
  }

  function highlight(text,query){
    if(!text)return'';
    var t=String(text);
    var ql=query.toLowerCase();
    var idx=t.toLowerCase().indexOf(ql);
    if(idx<0)return escHtml(t);
    // Show ~80 chars of context around the match
    var ctxBefore=40,ctxAfter=60;
    var start=Math.max(0,idx-ctxBefore);
    var end=Math.min(t.length,idx+ql.length+ctxAfter);
    var pre=(start>0?'…':'')+t.slice(start,idx);
    var match=t.slice(idx,idx+ql.length);
    var post=t.slice(idx+ql.length,end)+(end<t.length?'…':'');
    return escHtml(pre)+'<mark style="background:rgba(232,196,106,0.35);color:var(--gold2);padding:0 2px;border-radius:2px">'+escHtml(match)+'</mark>'+escHtml(post);
  }

  function section(label,icon,items,renderItem,emptyText){
    if(!items.length)return'';
    return'<div style="margin-bottom:18px">'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--gold);letter-spacing:2px;margin-bottom:8px">'+icon+' '+label+' · '+items.length+'</div>'
      +items.map(renderItem).join('')
      +'</div>';
  }

  var html='';
  // Capture the first activatable result so Enter knows what to open
  function recordFirst(action){if(!_gsFirstHit)_gsFirstHit=action;}

  html+=section('BATCHES','⚗',hits.batches,function(b){
    var act='showView(\'batch\',\''+b.id+'\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(b)+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px;transition:background 0.15s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13.5px;color:'+getBatchColor(b)+'">'+highlight(b.name,q)+(b.serial?'<span style="font-family:var(--font-mono);font-size:10px;color:var(--text3);background:var(--bg3);border:1px solid var(--border);padding:1px 6px;border-radius:6px;margin-left:8px">#'+highlight(b.serial,q)+'</span>':'')+'</div>'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:2px">'+escHtml(fmtDate(b.startDate))+' · '+escHtml(b.style||(APP.recipes.find(function(r){return r.id===b.recipeId;})||{}).style||'Custom')
      +(b.notes&&b.notes.toLowerCase().indexOf(q)>=0?'<br><span style="font-style:italic">'+highlight(b.notes,q)+'</span>':'')
      +'</div></div>';
  });
  html+=section('TASTING NOTES','🍷',hits.tastings,function(h){
    var act='showView(\'batch\',\''+h.batch.id+'\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(h.batch)+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+getBatchColor(h.batch)+'">'+escHtml(h.batch.name)+' · '+fmtDate(h.tasting.date)+'</div>'
      +'<div style="font-size:11.5px;color:var(--text2);margin-top:3px;line-height:1.5">'+highlight(h.matchedText,q)+'</div>'
      +'</div>';
  });
  html+=section('LOG ENTRIES','📊',hits.logs,function(h){
    var act='showView(\'batch\',\''+h.batch.id+'\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(h.batch)+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+getBatchColor(h.batch)+'">'+escHtml(h.batch.name)+' · '+fmtDate(h.log.date)+(h.log.gravity?' · SG '+h.log.gravity:'')+'</div>'
      +'<div style="font-size:11.5px;color:var(--text2);margin-top:3px;line-height:1.5;font-style:italic">'+highlight(h.log.note||'',q)+'</div>'
      +'</div>';
  });
  html+=section('ADDITIONS','➕',hits.additions,function(h){
    var act='showView(\'batch\',\''+h.batch.id+'\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+getBatchColor(h.batch)+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+getBatchColor(h.batch)+'">'+escHtml(h.batch.name)+' · '+fmtDate(h.addition.date)+'</div>'
      +'<div style="font-size:11.5px;color:var(--text2);margin-top:3px;line-height:1.5">'
      +highlight((h.addition.item||'')+(h.addition.amount?' · '+h.addition.amount:'')+(h.addition.notes?' — '+h.addition.notes:''),q)
      +'</div></div>';
  });
  html+=section('SUPPLIES','📦',hits.supplies,function(s){
    var act='showView(\'supplies\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid var(--gold);border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:var(--gold2)">'+highlight(s.name||'',q)+'</div>'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:2px">'+escHtml((s.qty||0)+' '+(s.unit||''))+(s.notes?' · '+highlight(s.notes,q):'')+'</div>'
      +'</div>';
  });
  html+=section('RECIPES','📜',hits.recipes,function(r){
    var act='currentRecipeId=\''+r.id+'\';showView(\'recipe-detail\');closeModal()';
    recordFirst(act);
    return'<div onclick="'+act+'" style="padding:10px 12px;background:var(--bg);border-left:3px solid '+(r.brandColor||'var(--gold)')+';border-radius:var(--radius);cursor:pointer;margin-bottom:4px" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg)\'">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+(r.brandColor||'var(--gold2)')+'">'+highlight(r.name,q)+'</div>'
      +'<div style="font-size:11.5px;color:var(--text3);margin-top:2px">'+escHtml(r.style+' · '+r.difficulty)+'</div>'
      +'</div>';
  });
  container.innerHTML=html;
}

function performGlobalSearch(q){
  var hits={batches:[],tastings:[],additions:[],supplies:[],recipes:[],logs:[]};
  if(!q)return hits;
  q=q.toLowerCase();
  // Batches — name, notes, style, serial
  (APP.batches||[]).forEach(function(b){
    var hay=(b.name+' '+(b.serial||'')+' '+(b.notes||'')+' '+(b.style||'')+' '+(b.honeyType||'')+' '+(b.yeast||'')).toLowerCase();
    if(hay.indexOf(q)>=0)hits.batches.push(b);
  });
  // Tastings — any text field
  Object.keys(APP.tastings||{}).forEach(function(bid){
    var b=APP.batches.find(function(x){return x.id===bid;});
    if(!b)return;
    (APP.tastings[bid]||[]).forEach(function(t){
      var fields=[t.note,t.notes,t.color,t.aroma,t.flavor,t.finish].filter(Boolean);
      var combined=fields.join(' · ').toLowerCase();
      if(combined.indexOf(q)>=0){
        // Pick the field that contains the match for display
        var matched=fields.find(function(f){return f.toLowerCase().indexOf(q)>=0;})||fields.join(' · ');
        hits.tastings.push({batch:b,tasting:t,matchedText:matched});
      }
    });
  });
  // Log entries — note field
  Object.keys(APP.logs||{}).forEach(function(bid){
    var b=APP.batches.find(function(x){return x.id===bid;});
    if(!b)return;
    (APP.logs[bid]||[]).forEach(function(l){
      if(l.note&&l.note.toLowerCase().indexOf(q)>=0)hits.logs.push({batch:b,log:l});
    });
  });
  // Additions
  Object.keys(APP.additions||{}).forEach(function(bid){
    var b=APP.batches.find(function(x){return x.id===bid;});
    if(!b)return;
    (APP.additions[bid]||[]).forEach(function(a){
      var hay=((a.item||'')+' '+(a.amount||'')+' '+(a.notes||'')).toLowerCase();
      if(hay.indexOf(q)>=0)hits.additions.push({batch:b,addition:a});
    });
  });
  // Supplies
  (APP.supplies||[]).forEach(function(s){
    var hay=((s.name||'')+' '+(s.notes||'')+' '+(s.supplier||'')).toLowerCase();
    if(hay.indexOf(q)>=0)hits.supplies.push(s);
  });
  // Recipes (built-in + custom)
  (APP.recipes||[]).forEach(function(r){
    var hay=(r.name+' '+(r.style||'')+' '+(r.difficulty||'')+' '+(r.description||'')+' '+((r.tags||[]).join(' '))).toLowerCase();
    if(hay.indexOf(q)>=0)hits.recipes.push(r);
  });
  return hits;
}

function gsActivateFirstResult(){
  if(_gsFirstHit){
    // _gsFirstHit is a string of JS to eval (the onclick handler). Safe here
    // because we constructed it ourselves from known-good batch IDs.
    try{(new Function(_gsFirstHit))();}catch(e){console.warn('gs activate failed:',e);}
  }
}

// Keyboard shortcut: Ctrl/Cmd-K opens global search anywhere
if(typeof document!=='undefined'){
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&e.key&&e.key.toLowerCase()==='k'){
      // Don't hijack inside input/textarea where Ctrl-K may mean line-clear etc
      var tag=document.activeElement&&document.activeElement.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA')return;
      e.preventDefault();
      openGlobalSearch();
    }
  });
}


// Generates a 4-dose Fermaid-O TOSNA schedule for a chosen batch and provides
// an "Apply" action that:
//   1. Sets batch.nutrient = 'fermaid-o' so future getEffectiveSteps() calls
//      auto-inject the canonical TOSNA schedule into the coach.
//   2. Writes 4 concrete addition entries (days 1, 2, 3, and either +7 days
//      from batch start OR today+7 if the batch is already past day 7) so
//      the doses show up in the additions log, calendar, and overdue checks.
//
// The function reads the picker value live each call so re-renders during
// batch selection don't lose the user's choice.

// ==================== PERMANENT RECORD (Batch Journal PDF) ====================
// Comprehensive end-of-batch journal: every gravity log, every addition, every
// tasting, full cost breakdown, label preview, signed by brewer name. Print-
// ready single document — the brewing equivalent of a chain-of-custody form
// or a winemaker's logbook page. Archive-quality output.
function openPermanentRecord(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var bot=APP.bottling[b.id]||{};
  var logs=(APP.logs[b.id]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  var additions=(APP.additions[b.id]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  var tastings=(APP.tastings[b.id]||[]).slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  var brandName=APP.settings.brewerName||'MeadOS';
  var ccy=APP.settings.currency||'€';
  var fg=bot.fg||(logs.length?logs[logs.length-1].gravity:null);
  var abv=bot.abv||(b.og&&fg?calcABV(b.og,fg):null);
  var daysToBottle=b.startDate&&bot.date?Math.floor((new Date(bot.date)-new Date(b.startDate))/86400000):null;
  var costH=(b.cost&&b.cost.honey)||0;
  var costE=(b.cost&&b.cost.extras)||0;
  var totalCost=costH+costE;
  var totalBottles=typeof bottlesOriginal==='function'?bottlesOriginal(bot):(bot.bottleCount||0);
  var costPerBottle=totalCost>0&&totalBottles>0?(totalCost/totalBottles):0;

  function row(label,value){
    return'<tr><td style="padding:6px 12px 6px 0;font-family:Inter,sans-serif;font-size:11px;color:#666;letter-spacing:1px;text-transform:uppercase;width:140px;vertical-align:top">'+xmlEscape(label)+'</td><td style="padding:6px 12px;font-family:Cinzel,serif;font-size:13px;color:#1a0f08">'+(value||'—')+'</td></tr>';
  }

  // Profile (drinking window) for sign-off section
  var profile=typeof getAgingProfile==='function'?getAgingProfile(b):null;
  function fmtShort(d){if(!d)return'—';return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
  var readyDate=profile&&bot.date?new Date(new Date(bot.date).getTime()+profile.minDays*86400000):null;
  var peakDate=profile&&bot.date?new Date(new Date(bot.date).getTime()+profile.peakDays*86400000):null;
  var drinkByDate=profile&&bot.date?new Date(new Date(bot.date).getTime()+profile.maxDays*86400000):null;

  // Bottle breakdown
  var counts=bot.countsAtBottling||(bot.locations?bot.locations.cellar:{});
  var contentsParts=[];
  if(counts&&typeof counts==='object'){
    Object.keys(counts).map(Number).sort(function(a,b){return b-a;}).forEach(function(sz){
      if(counts[sz]>0)contentsParts.push(counts[sz]+'×'+sz+'ml');
    });
  }
  var contentsStr=contentsParts.join(' + ')||'—';

  // Logs table
  var logRows=logs.length?logs.map(function(l){
    var abvAtLog=l.gravity&&b.og?calcABV(b.og,l.gravity):'';
    return'<tr><td style="padding:5px 10px 5px 0;font-family:monospace;font-size:11px;color:#666">'+fmtDate(l.date)+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:12px;color:#1a0f08">'+(l.gravity||'—')+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:11px;color:#666">'+(abvAtLog?abvAtLog+'%':'—')+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:11px;color:#666">'+(l.temp!=null?l.temp+'°C':'—')+'</td>'
      +(l.ph!=null?'<td style="padding:5px 10px;font-family:monospace;font-size:11px;color:#666">'+l.ph.toFixed(2)+'</td>':'<td></td>')
      +'<td style="padding:5px 10px;font-style:italic;font-size:11px;color:#666;max-width:280px">'+xmlEscape(l.note||'')+'</td></tr>';
  }).join(''):'<tr><td colspan="6" style="padding:14px;text-align:center;font-style:italic;color:#999">No gravity readings logged</td></tr>';

  // Additions table
  var addRows=additions.length?additions.map(function(a){
    return'<tr><td style="padding:5px 10px 5px 0;font-family:monospace;font-size:11px;color:#666">'+fmtDate(a.date)+'</td>'
      +'<td style="padding:5px 10px;font-family:Cinzel,serif;font-size:12px;color:#1a0f08">'+xmlEscape(a.item||'')+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:11px;color:#1a0f08">'+xmlEscape(a.amount||'')+'</td>'
      +'<td style="padding:5px 10px;font-family:monospace;font-size:10px;color:#666;text-transform:uppercase">'+xmlEscape(a.type||'')+'</td>'
      +'<td style="padding:5px 10px;font-style:italic;font-size:11px;color:#666;max-width:280px">'+xmlEscape(a.notes||'')+'</td></tr>';
  }).join(''):'<tr><td colspan="5" style="padding:14px;text-align:center;font-style:italic;color:#999">No additions recorded</td></tr>';

  // Tastings — one paragraph per tasting
  var tastingBlocks=tastings.length?tastings.map(function(t){
    var stars=t.rating?'★'.repeat(t.rating)+'☆'.repeat(5-t.rating):'';
    var fields=[];
    if(t.color)fields.push({k:'Color',v:t.color});
    if(t.aroma)fields.push({k:'Aroma',v:t.aroma});
    if(t.flavor)fields.push({k:'Flavor',v:t.flavor});
    if(t.finish)fields.push({k:'Finish',v:t.finish});
    if(t.note||t.notes)fields.push({k:'Notes',v:t.note||t.notes});
    return'<div style="margin-bottom:14px;padding:10px 14px;border-left:3px solid var(--gold);background:#faf3e0">'
      +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
        +'<div style="font-family:Cinzel,serif;font-size:13px;font-weight:600;color:#1a0f08">'+fmtDate(t.date)+'</div>'
        +'<div style="color:var(--gold);font-size:14px">'+stars+'</div>'
      +'</div>'
      +fields.map(function(f){return'<div style="font-size:11.5px;line-height:1.6;color:#1a0f08;margin-bottom:2px"><strong style="color:#5a3a20;font-family:Inter,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase">'+f.k+'</strong> '+xmlEscape(f.v)+'</div>';}).join('')
      +'</div>';
  }).join(''):'<div style="padding:14px;text-align:center;font-style:italic;color:#999">No tastings recorded yet</div>';

  // Label preview for the record (small, decorative)
  var labelMini='';
  try{
    if(recipe&&typeof renderLabelWithABV==='function'){
      labelMini=renderBatchLabel(recipe.id,abv||'',{batch:b,maxWidth:'180px'});
    }
  }catch(e){}

  var w=window.open('','_blank','width=900,height=900');
  if(!w){toast('⚠ Popup blocked — allow popups to print');return;}
  w.document.write('<!DOCTYPE html><html><head><title>Complete Record · '+xmlEscape(b.name)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com">'
    +'<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
    +'<style>'
    +'body{margin:0;padding:24px;font-family:Inter,sans-serif;background:#faf3e0;color:#1a0f08;max-width:820px;margin:0 auto;line-height:1.55}'
    +'h1{font-family:Cinzel,serif;font-size:30px;margin:0 0 4px;color:'+((recipe&&recipe.brandColor)||'#c9a84c')+'}'
    +'h2{font-family:Cinzel,serif;font-size:14px;margin:24px 0 10px;color:#5a3a20;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid var(--gold);padding-bottom:4px}'
    +'.brand{font-family:Cinzel,serif;font-size:12px;color:#8a6a30;letter-spacing:4px;text-transform:uppercase;margin-bottom:14px}'
    +'.serial{display:inline-block;font-family:monospace;font-size:11px;color:#666;background:#f3e8c5;padding:2px 8px;border-radius:4px;margin-left:10px;vertical-align:middle}'
    +'.meta{font-size:13px;color:#666;margin-bottom:18px;font-style:italic}'
    +'table{width:100%;border-collapse:collapse;margin-bottom:14px}'
    +'.kv-table tr td{border:none}'
    +'.data-table tr{border-bottom:1px solid #e8d8a8}'
    +'.data-table th{text-align:left;padding:6px 10px 6px 0;font-family:Inter,sans-serif;font-size:10px;letter-spacing:1.5px;color:#5a3a20;text-transform:uppercase;border-bottom:2px solid var(--gold)}'
    +'.flex-row{display:flex;gap:24px;align-items:flex-start}'
    +'.flex-row > div{flex:1}'
    +'.signoff{margin-top:36px;padding-top:18px;border-top:1px solid var(--gold);display:flex;justify-content:space-between;align-items:flex-end;font-size:12px}'
    +'.signoff-line{border-bottom:1px solid #1a0f08;width:240px;margin-bottom:4px;height:30px}'
    +'.btns{margin-bottom:14px}'
    +'.btns button{padding:10px 18px;font-size:13px;cursor:pointer;margin:0 4px;border-radius:4px;border:1px solid #999;background:#fff}'
    +'@page{size:A4 portrait;margin:14mm}'
    +'@media print{.no-print{display:none}body{background:#fff;padding:0}h2{page-break-after:avoid}}'
    +'</style></head><body>'
    +'<div class="btns no-print"><button onclick="window.print()">🖨 Print</button><button onclick="window.close()">Close</button></div>'
    +'<div class="brand">'+xmlEscape(brandName)+'</div>'
    +'<h1>'+xmlEscape(b.name)+(b.serial?'<span class="serial">#'+xmlEscape(b.serial)+'</span>':'')+'</h1>'
    +'<div class="meta">Complete brewing record · Started '+fmtShort(new Date(b.startDate))+(bot.date?' · Bottled '+fmtShort(new Date(bot.date)):'')+(daysToBottle?' ('+daysToBottle+' days)':'')+'</div>'

    +'<h2>Summary</h2>'
    +'<div class="flex-row">'
      +'<div><table class="kv-table">'
        +row('Recipe',recipe?recipe.name:'Custom')
        +row('Style',(recipe&&recipe.style)||b.style||'—')
        +row('Honey',(b.honeyType||'—')+(b.honey?' · '+b.honey+' kg':''))
        +row('Yeast',(typeof YEAST_STRAINS!=='undefined'&&YEAST_STRAINS[b.yeast]&&YEAST_STRAINS[b.yeast].name)||b.yeast||'—')
        +row('Volume',(b.volume||'—')+' L')
        +row('OG',b.og||'—')
        +row('FG',fg||'—')
        +row('ABV',abv?abv+'%':'—')
        +row('Days to bottle',daysToBottle?daysToBottle+' days':'—')
      +'</table></div>'
      +(labelMini?'<div style="flex:0 0 200px">'+labelMini+'</div>':'')
    +'</div>'

    +(totalCost>0?'<h2>Cost</h2>'
      +'<table class="kv-table">'
        +(costH?row('Honey',ccy+costH.toFixed(2)+(b.honey?' ('+ccy+(costH/b.honey).toFixed(2)+'/kg)':'')):'')
        +(costE?row('Extras',ccy+costE.toFixed(2)):'')
        +row('Total',ccy+totalCost.toFixed(2))
        +(costPerBottle?row('Per bottle',ccy+costPerBottle.toFixed(2)+' (of '+totalBottles+')'):'')
      +'</table>':'')

    +'<h2>Gravity log · '+logs.length+' reading'+(logs.length===1?'':'s')+'</h2>'
    +'<table class="data-table"><thead><tr><th style="width:90px">Date</th><th style="width:60px">SG</th><th style="width:50px">ABV</th><th style="width:50px">Temp</th>'+(logs.some(function(l){return l.ph!=null;})?'<th style="width:40px">pH</th>':'<th></th>')+'<th>Notes</th></tr></thead><tbody>'+logRows+'</tbody></table>'

    +'<h2>Additions · '+additions.length+' record'+(additions.length===1?'':'s')+'</h2>'
    +'<table class="data-table"><thead><tr><th style="width:90px">Date</th><th>Item</th><th style="width:80px">Amount</th><th style="width:80px">Type</th><th>Notes</th></tr></thead><tbody>'+addRows+'</tbody></table>'

    +'<h2>Tasting journal · '+tastings.length+' tasting'+(tastings.length===1?'':'s')+'</h2>'
    +tastingBlocks

    +(bot.date?'<h2>Bottling</h2>'
      +'<table class="kv-table">'
        +row('Bottled',fmtShort(new Date(bot.date)))
        +row('Contents',contentsStr)
        // Forward-looking drinking-window estimates are intentionally omitted
        // from the permanent record — it's a factual historical document.
        +(bot.cellarSublocation?row('Stored at',bot.cellarSublocation):'')
        +(bot.sweetness?row('Sweetness',bot.sweetness):'')
        +(bot.notes?row('Notes',bot.notes):'')
      +'</table>':'')

    +'<div class="signoff">'
      +'<div><div class="signoff-line"></div><div style="color:#5a3a20;text-transform:uppercase;letter-spacing:1.5px;font-size:10px">Brewer · '+xmlEscape(brandName)+'</div></div>'
      +'<div style="text-align:right"><div class="signoff-line"></div><div style="color:#5a3a20;text-transform:uppercase;letter-spacing:1.5px;font-size:10px">Date</div></div>'
    +'</div>'

    +'<div style="margin-top:32px;font-size:9.5px;color:#999;text-align:center;font-style:italic;letter-spacing:1px">Generated by MeadŌS · '+fmtShort(new Date())+' · Batch '+(b.serial||b.id.slice(-8))+'</div>'
    +'</body></html>');
  w.document.close();
}
// BeerXML 1.0 is the cross-app standard for recipe interchange. Supported by
// BeerSmith, Brewfather, Grainfather, etc. We map the meadows recipe model
// to BeerXML's RECIPE element, focusing on the parts that survive translation:
// name, style, target OG/FG, ingredients (with honey treated as fermentable),
// yeast strain, fermentation/aging steps as notes.

function xmlEscape(s){
  if(s==null)return'';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

// ==================== BEERXML IMPORT / EXPORT ====================
// BeerXML 1.0 is the cross-app standard for recipe interchange. Supported by
// BeerSmith, Brewfather, Grainfather, etc. We map the meadows recipe model
// to BeerXML's RECIPE element, focusing on the parts that survive translation.

// Build a BeerXML <RECIPE> element string from one of our recipes.
function recipeToBeerXML(r){
  if(!r)return null;
  var vol=r.volume||5;
  var og=r.ogTarget||1.095;
  var fg=r.fgTarget||1.000;
  var abv=((og-fg)*131.25).toFixed(1);
  // Ingredients — honey is the primary fermentable. Other items go to MISCS.
  var fermentables='';
  var miscs='';
  var hops='';
  (r.ingredients||[]).forEach(function(ing){
    var amountG=parseHoneyGrams(ing.amount);
    var nameL=(ing.item||'').toLowerCase();
    if(nameL.indexOf('honey')>=0||nameL.indexOf('mel')>=0){
      var amountKg=amountG/1000;
      fermentables+='<FERMENTABLE>'
        +'<NAME>'+xmlEscape(ing.item)+'</NAME>'
        +'<VERSION>1</VERSION>'
        +'<TYPE>Sugar</TYPE>'
        +'<AMOUNT>'+amountKg.toFixed(3)+'</AMOUNT>'
        +'<YIELD>80.0</YIELD>'  // honey is ~80% fermentable
        +'<COLOR>2.0</COLOR>'
        +(ing.notes?'<NOTES>'+xmlEscape(ing.notes)+'</NOTES>':'')
        +'</FERMENTABLE>';
    }else if(nameL.indexOf('hop')>=0){
      var amountKg2=amountG/1000;
      hops+='<HOP><NAME>'+xmlEscape(ing.item)+'</NAME><VERSION>1</VERSION><AMOUNT>'+amountKg2.toFixed(4)+'</AMOUNT><USE>Aroma</USE><TIME>0</TIME></HOP>';
    }else{
      miscs+='<MISC>'
        +'<NAME>'+xmlEscape(ing.item)+'</NAME>'
        +'<VERSION>1</VERSION>'
        +'<TYPE>Other</TYPE>'
        +'<USE>Primary</USE>'
        +'<TIME>0</TIME>'
        +'<AMOUNT>'+(amountG/1000).toFixed(4)+'</AMOUNT>'
        +'<AMOUNT_IS_WEIGHT>TRUE</AMOUNT_IS_WEIGHT>'
        +(ing.notes?'<NOTES>'+xmlEscape(ing.notes)+'</NOTES>':'')
        +'</MISC>';
    }
  });

  // Yeast — pull strain name from the YEAST_STRAINS lookup if available
  var yeastObj=(typeof YEAST_STRAINS!=='undefined'&&YEAST_STRAINS[r.yeast])||null;
  var yeastName=(yeastObj&&yeastObj.name)||r.yeast||'Mead Yeast (M05)';
  var yeasts='<YEAST>'
    +'<NAME>'+xmlEscape(yeastName)+'</NAME>'
    +'<VERSION>1</VERSION>'
    +'<TYPE>Wine</TYPE>'
    +'<FORM>Dry</FORM>'
    +'<AMOUNT>0.010</AMOUNT>'  // typical 10g packet
    +'<AMOUNT_IS_WEIGHT>TRUE</AMOUNT_IS_WEIGHT>'
    +'<ATTENUATION>95.0</ATTENUATION>'
    +'</YEAST>';

  // Style — BeerXML expects a <STYLE> entry. Map to BJCP M-categories.
  var styleEntry='<STYLE>'
    +'<NAME>'+xmlEscape(r.style||'Mead')+'</NAME>'
    +'<VERSION>1</VERSION>'
    +'<CATEGORY>Mead</CATEGORY>'
    +'<CATEGORY_NUMBER>M</CATEGORY_NUMBER>'
    +'<STYLE_LETTER>'+xmlEscape((r.style||'M').substring(0,1))+'</STYLE_LETTER>'
    +'<STYLE_GUIDE>BJCP 2015</STYLE_GUIDE>'
    +'<TYPE>Mead</TYPE>'
    +'<OG_MIN>'+(og-0.010).toFixed(3)+'</OG_MIN>'
    +'<OG_MAX>'+(og+0.010).toFixed(3)+'</OG_MAX>'
    +'<FG_MIN>'+(fg-0.005).toFixed(3)+'</FG_MIN>'
    +'<FG_MAX>'+(fg+0.005).toFixed(3)+'</FG_MAX>'
    +'<ABV_MIN>'+(parseFloat(abv)-1).toFixed(1)+'</ABV_MIN>'
    +'<ABV_MAX>'+(parseFloat(abv)+1).toFixed(1)+'</ABV_MAX>'
    +'</STYLE>';

  // Steps → notes (BeerXML's notes field carries free text)
  var notes=(r.notes||'')
    +(r.steps&&r.steps.length?'\n\nProcedure:\n'+r.steps.map(function(s){return'Day '+s.day+' — '+s.title+': '+s.desc;}).join('\n'):'');

  var xml='<?xml version="1.0" encoding="UTF-8"?>'
    +'<RECIPES><RECIPE>'
    +'<NAME>'+xmlEscape(r.name)+'</NAME>'
    +'<VERSION>1</VERSION>'
    +'<TYPE>All Grain</TYPE>'  // BeerXML doesn't have a Mead type — All Grain is the convention
    +'<BREWER>'+xmlEscape(APP.settings.brewerName||'MeadOS')+'</BREWER>'
    +'<BATCH_SIZE>'+vol.toFixed(1)+'</BATCH_SIZE>'
    +'<BOIL_SIZE>'+vol.toFixed(1)+'</BOIL_SIZE>'
    +'<BOIL_TIME>0</BOIL_TIME>'
    +'<EFFICIENCY>100.0</EFFICIENCY>'
    +'<OG>'+og.toFixed(3)+'</OG>'
    +'<FG>'+fg.toFixed(3)+'</FG>'
    +'<EST_ABV>'+abv+'</EST_ABV>'
    +'<NOTES>'+xmlEscape(notes)+'</NOTES>'
    +'<TASTE_NOTES>'+xmlEscape(r.description||'')+'</TASTE_NOTES>'
    +styleEntry
    +(fermentables?'<FERMENTABLES>'+fermentables+'</FERMENTABLES>':'')
    +(hops?'<HOPS>'+hops+'</HOPS>':'')
    +(miscs?'<MISCS>'+miscs+'</MISCS>':'')
    +'<YEASTS>'+yeasts+'</YEASTS>'
    +'</RECIPE></RECIPES>';
  return xml;
}

// Parse honey amount strings — "1.5 kg" → 1500 g, "200 g" → 200 g, "200ml" → 200 (approximate)
function parseHoneyGrams(amountStr){
  if(!amountStr)return 0;
  var m=/^(\d+(?:\.\d+)?)\s*(\w+)?/.exec(String(amountStr));
  if(!m)return 0;
  var n=parseFloat(m[1]);
  var unit=(m[2]||'g').toLowerCase();
  if(unit.indexOf('kg')===0)return n*1000;
  if(unit.indexOf('lb')===0)return n*453.6;
  if(unit.indexOf('oz')===0)return n*28.35;
  return n; // assume grams or ml (close enough for honey)
}

// Parse a BeerXML <RECIPE> element into our recipe shape.
function beerXMLToRecipe(xmlText){
  var parser=new DOMParser();
  var doc=parser.parseFromString(xmlText,'text/xml');
  // Check for parse errors
  if(doc.querySelector('parsererror'))return null;
  var recipeEl=doc.querySelector('RECIPE');
  if(!recipeEl)return null;
  function txt(node,sel){var el=node.querySelector(sel);return el?el.textContent.trim():'';}
  function num(node,sel,d){var v=parseFloat(txt(node,sel));return isNaN(v)?d:v;}
  var name=txt(recipeEl,'NAME');
  if(!name)return null;
  var vol=num(recipeEl,'BATCH_SIZE',5);
  var og=num(recipeEl,'OG',1.095);
  var fg=num(recipeEl,'FG',1.000);
  var style=txt(recipeEl,'STYLE > NAME')||'Custom';
  var notes=txt(recipeEl,'NOTES');
  var description=txt(recipeEl,'TASTE_NOTES')||(notes.split('\n')[0]||'');

  // Ingredients — pull from fermentables (treat as honey), miscs, hops
  var ingredients=[];
  recipeEl.querySelectorAll('FERMENTABLE').forEach(function(f){
    var amountKg=num(f,'AMOUNT',0);
    ingredients.push({
      item:txt(f,'NAME'),
      amount:amountKg>=1?amountKg.toFixed(2)+' kg':(amountKg*1000).toFixed(0)+' g',
      notes:txt(f,'NOTES')||'fermentable'
    });
  });
  recipeEl.querySelectorAll('MISC').forEach(function(f){
    var amountKg=num(f,'AMOUNT',0);
    var isWeight=txt(f,'AMOUNT_IS_WEIGHT').toLowerCase()==='true';
    ingredients.push({
      item:txt(f,'NAME'),
      amount:isWeight?(amountKg>=1?amountKg.toFixed(2)+' kg':(amountKg*1000).toFixed(0)+' g'):(amountKg*1000).toFixed(0)+' ml',
      notes:txt(f,'NOTES')||txt(f,'USE')||''
    });
  });
  recipeEl.querySelectorAll('HOP').forEach(function(f){
    var amountKg=num(f,'AMOUNT',0);
    ingredients.push({
      item:txt(f,'NAME')+' hops',
      amount:(amountKg*1000).toFixed(1)+' g',
      notes:'hop addition · '+txt(f,'USE')
    });
  });

  // Yeast — map to our internal yeast IDs where possible
  var yeastName=txt(recipeEl,'YEAST > NAME').toLowerCase();
  var yeast='m05';
  if(yeastName.indexOf('ec-1118')>=0||yeastName.indexOf('ec1118')>=0)yeast='ec-1118';
  else if(yeastName.indexOf('71b')>=0)yeast='71b';
  else if(yeastName.indexOf('d-47')>=0||yeastName.indexOf('d47')>=0)yeast='d47';
  else if(yeastName.indexOf('k1v')>=0||yeastName.indexOf('k1-v1116')>=0)yeast='k1v';

  return{
    id:'r-imported-'+genId().slice(0,8),
    name:name,
    style:style,
    difficulty:'Intermediate',
    brandName:name,
    brandColor:'#c9a350',
    description:description||'Imported BeerXML recipe',
    volume:vol,
    ogTarget:og,
    fgTarget:fg,
    honey:null,
    honeyType:'Wildflower',
    yeast:yeast,
    nutrient:'mj-mead',
    tags:['imported','beerxml'],
    ingredients:ingredients,
    steps:[
      {day:0,title:'Day 0 — Brew',desc:'Imported recipe. Combine honey + water + nutrients per the ingredient list, pitch yeast, attach airlock. Set OG '+og.toFixed(3)+'.'},
      {day:14,title:'Day 14 — Check gravity',desc:'Target FG around '+fg.toFixed(3)+'. Take readings every few days until stable.'}
    ],
    notes:notes,
    // Imported recipes are user-owned like forks/designs — mark them so they
    // get the "MINE" badge and the Edit/Delete affordances (not just Fork).
    isCustom:true
  };
}

// Browser file picker for BeerXML import
function importBeerXMLClick(){
  var input=document.createElement('input');
  input.type='file';
  input.accept='.xml,application/xml,text/xml';
  input.style.display='none';
  input.onchange=function(e){
    var file=e.target.files&&e.target.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var xml=ev.target.result;
        // BeerXML files can contain multiple <RECIPE> elements
        var parser=new DOMParser();
        var doc=parser.parseFromString(xml,'text/xml');
        if(doc.querySelector('parsererror')){
          toast('⚠ Invalid XML file');
          return;
        }
        var recipeEls=doc.querySelectorAll('RECIPE');
        if(!recipeEls.length){toast('⚠ No RECIPE elements found');return;}
        var imported=0;
        recipeEls.forEach(function(rEl){
          // Build a partial document just for this RECIPE so beerXMLToRecipe can use querySelector
          var wrapper='<?xml version="1.0" encoding="UTF-8"?><RECIPES>'+(new XMLSerializer()).serializeToString(rEl)+'</RECIPES>';
          var recipe=beerXMLToRecipe(wrapper);
          if(recipe){
            APP.customRecipes.push(recipe);
            imported++;
          }
        });
        if(imported){
          // Recipe list cache needs rebuilding
          APP.recipes=BUILTIN_RECIPES().concat(APP.customRecipes);
          scheduleSave();
          toast('✦ Imported '+imported+' recipe'+(imported===1?'':'s'));
          renderMain();
        }else{
          toast('⚠ Could not parse recipe(s)');
        }
      }catch(err){
        console.error(err);
        toast('⚠ Import failed: '+err.message);
      }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(input);
  input.click();
  setTimeout(function(){input.remove();},100);
}

function exportRecipeBeerXML(recipeId){
  var r=APP.recipes.find(function(x){return x.id===recipeId;});
  if(!r){toast('⚠ Recipe not found');return;}
  var xml=recipeToBeerXML(r);
  if(!xml){toast('⚠ Could not generate XML');return;}
  var blob=new Blob([xml],{type:'application/xml;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=(r.name||'recipe').replace(/[^\w-]+/g,'_')+'.beerxml.xml';
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},100);
  toast('✦ BeerXML exported');
}

function exportAllCustomRecipesBeerXML(){
  var custom=APP.customRecipes||[];
  if(!custom.length){toast('⚠ No custom recipes to export');return;}
  // Concatenate all into one <RECIPES> document
  var inner=custom.map(function(r){
    var xml=recipeToBeerXML(r);
    if(!xml)return'';
    // Strip the outer <?xml...?><RECIPES>...</RECIPES> wrap and just keep <RECIPE>...</RECIPE>
    var m=/<RECIPE>[\s\S]*<\/RECIPE>/.exec(xml);
    return m?m[0]:'';
  }).filter(Boolean).join('');
  var combined='<?xml version="1.0" encoding="UTF-8"?><RECIPES>'+inner+'</RECIPES>';
  var blob=new Blob([combined],{type:'application/xml;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='meadows_custom_recipes.beerxml.xml';
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},100);
  toast('✦ '+custom.length+' recipe'+(custom.length===1?'':'s')+' exported');
}

// ==================== YEAST REHYDRATION TIMER ====================
// Go-Ferm Sterol Flash protocol: rehydrate yeast in 43°C water with Go-Ferm
// to maximize viability, then cool to within 10°C of must temp before pitching.
// Improves yeast health significantly for high-OG batches and stressed
// fermentation conditions. M05 sprinkles directly — skip for M05.
//
// State machine: 6 steps, each with checklist + optional timer. State persists
// to localStorage so reloading doesn't lose the in-flight workflow.

function openYeastRehydrationModal(){
  // Restore in-flight workflow if present (<2h old)
  var saved=null;
  try{
    var raw=localStorage.getItem('meadows_yeastRehydration');
    if(raw){
      var parsed=JSON.parse(raw);
      if(parsed&&parsed.startedAt&&(Date.now()-parsed.startedAt)<7200000)saved=parsed;
      else localStorage.removeItem('meadows_yeastRehydration');
    }
  }catch(e){}
  window._yeastRehydration=saved||{
    startedAt:Date.now(),
    yeastGrams:5,       // typical sachet sub-dose
    mustTemp:20,        // target must temp °C
    stepIdx:0,
    stepStartTimes:{}   // ts when each timed step started
  };
  renderYeastRehydrationModal();
}

function persistYeastRehydration(){
  try{localStorage.setItem('meadows_yeastRehydration',JSON.stringify(window._yeastRehydration));}catch(e){}
}

function setYeastRehydrationStep(stepIdx){
  window._yeastRehydration.stepIdx=stepIdx;
  // Stamp the start of this step (used to drive timers)
  if(!window._yeastRehydration.stepStartTimes[stepIdx]){
    window._yeastRehydration.stepStartTimes[stepIdx]=Date.now();
  }
  persistYeastRehydration();
  renderYeastRehydrationModal();
}

function resetYeastRehydration(){
  if(!confirm('Reset the rehydration workflow? In-progress state will be lost.'))return;
  try{localStorage.removeItem('meadows_yeastRehydration');}catch(e){}
  window._yeastRehydration=null;
  closeModal();
}

function renderYeastRehydrationModal(){
  closeModal();
  var s=window._yeastRehydration;
  if(!s)return;
  // Compute Go-Ferm dose: 1.25 g per g of yeast
  var goferm=(s.yeastGrams*1.25).toFixed(1);
  // Water volume: 20× yeast weight (so 5g yeast → 100ml water)
  var waterMl=(s.yeastGrams*20).toFixed(0);

  var steps=[
    {
      title:'Confirm inputs',
      detail:'Adjust if you\'re rehydrating a different amount of yeast or pitching to a different temperature.',
      content:function(){
        return'<div class="form-row">'
          +'<div class="form-group"><label class="form-label">Yeast (grams)</label><input class="form-input" type="number" min="1" max="30" step="0.5" value="'+s.yeastGrams+'" oninput="window._yeastRehydration.yeastGrams=parseFloat(this.value)||5;persistYeastRehydration();renderYeastRehydrationModal()"></div>'
          +'<div class="form-group"><label class="form-label">Target must temp (°C)</label><input class="form-input" type="number" min="10" max="30" step="0.5" value="'+s.mustTemp+'" oninput="window._yeastRehydration.mustTemp=parseFloat(this.value)||20;persistYeastRehydration()"></div>'
          +'</div>'
          +'<div style="background:var(--bg);border-radius:var(--radius);padding:12px;margin-top:8px;font-size:13px;line-height:1.7">'
          +'<div><strong>Computed doses:</strong></div>'
          +'<div>· Water: <span style="font-family:var(--font-mono);color:var(--gold2)">'+waterMl+' ml</span> heated to <span style="font-family:var(--font-mono);color:var(--gold2)">43°C</span></div>'
          +'<div>· Go-Ferm Protect: <span style="font-family:var(--font-mono);color:var(--gold2)">'+goferm+' g</span> (1.25 g per g of yeast)</div>'
          +'<div>· Yeast: <span style="font-family:var(--font-mono);color:var(--gold2)">'+s.yeastGrams+' g</span></div>'
          +'</div>';
      },
      timer:null
    },
    {
      title:'Heat water + dissolve Go-Ferm',
      detail:'Heat '+waterMl+' ml of filtered/dechlorinated water to 43°C (109°F). Stir in '+goferm+' g of Go-Ferm Protect until fully dissolved. Temperature precision matters here — use a thermometer.',
      content:function(){
        return'<div class="info-box" style="border-left-color:var(--gold2)"><div style="font-size:13px;line-height:1.65"><strong>Why 43°C?</strong> Below 40°C the cell membranes won\'t become permeable enough to absorb Go-Ferm\'s sterols. Above 46°C cell death starts. The window is tight.</div></div>';
      },
      timer:null
    },
    {
      title:'Sprinkle yeast on water',
      detail:'Gently sprinkle '+s.yeastGrams+' g of yeast across the entire surface of the Go-Ferm water. Do NOT stir yet. Let it sit undisturbed for 15 minutes.',
      content:function(){
        return'<div class="info-box" style="border-left-color:var(--gold2)"><div style="font-size:13px;line-height:1.65">The yeast will absorb water and bloom. Disturbing it early prevents proper rehydration.</div></div>';
      },
      timer:15*60 // 15 min in seconds
    },
    {
      title:'Stir gently',
      detail:'After 15 minutes of resting, swirl the container gently to form a uniform slurry. Should be creamy, not chunky.',
      content:function(){
        return'<div class="info-box" style="border-left-color:var(--gold2)"><div style="font-size:13px;line-height:1.65">If you see chunks or dry yeast, give it another 5 minutes — yeast must be fully hydrated before the next step.</div></div>';
      },
      timer:null
    },
    {
      title:'Acclimate to must temperature',
      detail:'Your slurry is at ~38°C; your must is at '+s.mustTemp+'°C. You need to close that gap to within 10°C BEFORE pitching, or thermal shock kills 20-50% of the yeast. Add a splash of cool must to the slurry every 5 minutes, gently mixing each time.',
      content:function(){
        var deltaTime=Math.ceil(Math.max(0,(38-s.mustTemp-10))/2)*5; // rough estimate
        return'<div class="info-box" style="border-left-color:var(--gold2)"><div style="font-size:13px;line-height:1.65"><strong>Suggested protocol:</strong> add ~50 ml of must to the slurry every 5 minutes for ~'+deltaTime+' minutes (until slurry is within 10°C of must temp). Then pitch.</div></div>';
      },
      timer:20*60
    },
    {
      title:'Pitch + done',
      detail:'Pour the acclimated slurry into the must. Stir gently to incorporate. Cap the fermenter, attach the airlock. First signs of fermentation should appear in 12-48 hours.',
      content:function(){
        return'<div class="info-box" style="border-left-color:var(--green2);background:rgba(122,160,64,0.10)"><div style="font-size:13px;line-height:1.65"><strong>You\'re done.</strong> Log your batch start now if you haven\'t — and remember to schedule the first SNA / TOSNA dose for 24h from now.</div></div>'
          +'<div style="margin-top:14px;text-align:center"><button class="btn btn-secondary btn-sm" onclick="resetYeastRehydration()">↻ Reset workflow</button></div>';
      },
      timer:null
    }
  ];

  var step=steps[s.stepIdx];
  var stepStart=s.stepStartTimes[s.stepIdx];
  var timerBlock='';
  if(step.timer&&stepStart){
    var elapsed=Math.floor((Date.now()-stepStart)/1000);
    var remaining=Math.max(0,step.timer-elapsed);
    var mins=Math.floor(remaining/60),secs=remaining%60;
    var done=remaining===0;
    timerBlock='<div style="background:'+(done?'rgba(122,160,64,0.12)':'rgba(232,196,106,0.10)')+';border-left:3px solid '+(done?'var(--green2)':'var(--gold2)')+';border-radius:var(--radius);padding:12px;margin:14px 0;text-align:center">'
      +'<div style="font-family:var(--font-display);font-size:36px;color:'+(done?'var(--green2)':'var(--gold2)')+';font-variant-numeric:tabular-nums">'+(done?'✓':String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0'))+'</div>'
      +'<div class="micro-label">'+(done?'TIMER ELAPSED — PROCEED':'TIMER RUNNING')+'</div>'
      +'</div>';
    // Auto-refresh while timer is running
    if(!done){
      setTimeout(function(){
        if(window._yeastRehydration&&window._yeastRehydration.stepIdx===s.stepIdx&&document.querySelector('.modal'))renderYeastRehydrationModal();
      },1000);
    }
  }else if(step.timer){
    timerBlock='<button class="btn btn-secondary" onclick="window._yeastRehydration.stepStartTimes['+s.stepIdx+']=Date.now();persistYeastRehydration();renderYeastRehydrationModal()" style="width:100%;margin:12px 0">▶ Start '+(step.timer/60)+'-minute timer</button>';
  }

  // Step pip strip
  var pips=steps.map(function(_,i){
    var isActive=i===s.stepIdx;
    var isDone=i<s.stepIdx;
    return'<div onclick="setYeastRehydrationStep('+i+')" style="flex:1;height:6px;background:'+(isDone?'var(--green2)':isActive?'var(--gold2)':'var(--bg4)')+';border-radius:3px;cursor:pointer;transition:background 0.2s" title="Step '+(i+1)+': '+escHtml(steps[i].title)+'"></div>';
  }).join('');

  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:680px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">🧫 YEAST REHYDRATION · STEP '+(s.stepIdx+1)+' OF '+steps.length+'</div>'
    +'<div style="display:flex;gap:4px;margin-bottom:14px">'+pips+'</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'
    +'<div style="font-family:var(--font-display);font-size:18px;color:var(--gold2);margin-bottom:8px">'+escHtml(step.title)+'</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.65">'+escHtml(step.detail)+'</div>'
    +step.content()
    +timerBlock
    +'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px;gap:8px">'
    +(s.stepIdx>0?'<button class="btn btn-secondary" onclick="setYeastRehydrationStep('+(s.stepIdx-1)+')">← Back</button>':'<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>')
    +(s.stepIdx<steps.length-1?'<button class="btn btn-primary" onclick="setYeastRehydrationStep('+(s.stepIdx+1)+')">Next →</button>':'<button class="btn btn-primary" onclick="resetYeastRehydration()">Finish</button>')
    +'</div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function computeTOSNADoses(volumeL,og){
  // Match the same rule used by getEffectiveSteps so the plan you see matches
  // the schedule the coach will produce: ~1 g per L at OG 1.100, scaled.
  var totalGrams=Math.max(2,volumeL*(og-1)*10);
  var perDose=Math.round((totalGrams/4)*10)/10;
  return{totalGrams:Math.round(totalGrams*10)/10,perDose:perDose};
}

function renderTOSNAPlan(){
  var sel=document.getElementById('tp-batch');
  var out=document.getElementById('tp-output');
  if(!sel||!out)return;
  var batchId=sel.value;
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){out.innerHTML='';return;}
  var vol=parseFloat(b.volume)||5;
  var og=parseFloat(b.og)||1.095;
  var doses=computeTOSNADoses(vol,og);

  // Build the schedule dates. Day 0 = batch.startDate. We compute calendar
  // dates so the user can read "Wed 12 Jun" etc.
  var startDate=new Date(b.startDate);
  var dayLabel=function(d){
    var dt=new Date(startDate.getTime()+d*86400000);
    return dt.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'});
  };
  var daysSinceStart=Math.floor((Date.now()-startDate.getTime())/86400000);

  var schedule=[
    {day:1,title:'Dose 1/4',rationale:'24h after pitch — yeast is in active growth phase, needs nitrogen.'},
    {day:2,title:'Dose 2/4',rationale:'Vigorous fermentation now visible. Organic N is absorbed slowly so daily spacing avoids overwhelming.'},
    {day:3,title:'Dose 3/4',rationale:'Take a gravity reading. Looking for the 1/3 sugar break for the final dose.'},
    {day:7,title:'Dose 4/4',rationale:'Last dose at 1/3 sugar break or day 7 (whichever comes first). Sustains yeast through alcohol stress.'}
  ];

  var currentNutrient=b.nutrient||'mj-mead';
  var alreadyTOSNA=currentNutrient==='fermaid-o';

  var rows=schedule.map(function(s){
    var isPast=s.day<=daysSinceStart;
    return'<div style="display:flex;gap:10px;padding:8px 10px;border-bottom:1px solid var(--border);align-items:flex-start">'
      +'<div style="width:60px;flex-shrink:0;font-family:var(--font-mono);font-size:11px;color:'+(isPast?'var(--text3)':'var(--gold2)')+';letter-spacing:0.5px">DAY '+s.day+(isPast?' ⏪':'')+'</div>'
      +'<div style="flex:1">'
      +'<div style="font-family:var(--font-display);font-size:13px;color:'+(isPast?'var(--text3)':'var(--text)')+'">'+s.title+' · '+doses.perDose+' g Fermaid-O</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px;line-height:1.5">'+dayLabel(s.day)+' · '+s.rationale+'</div>'
      +'</div></div>';
  }).join('');

  out.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:12px">'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)">'+doses.totalGrams+' g</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:4px">TOTAL Fermaid-O</div></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)">'+doses.perDose+' g</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:4px">PER DOSE</div></div>'
    +'<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-family:var(--font-display);font-size:22px;color:var(--gold2)">4</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:4px">DOSES</div></div>'
    +'</div>'
    +'<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;overflow:hidden">'+rows+'</div>'
    +(alreadyTOSNA
      ?'<div style="padding:10px 12px;background:rgba(122,160,64,0.12);border-left:3px solid var(--green2);border-radius:var(--radius);font-size:12px;color:var(--green2)">✓ This batch is already on the TOSNA protocol — Fermaid-O is the configured nutrient. Use the button below to <em>also</em> write explicit doses into the additions log for tracking.</div>'
      :'<div style="padding:10px 12px;background:rgba(200,160,64,0.10);border-left:3px solid var(--gold2);border-radius:var(--radius);font-size:12px;color:var(--text2)">Applying will switch this batch\'s nutrient from <strong>'+escHtml((getNutrientById(currentNutrient)||{}).name||currentNutrient)+'</strong> to <strong>Fermaid-O (TOSNA)</strong> and write the 4 doses above into the additions log.</div>')
    +'<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="btn btn-primary" onclick="applyTOSNAToBatch(\''+batchId+'\')">Apply TOSNA plan to this batch</button>'
    +'<button class="btn btn-secondary" onclick="showView(\'batch\',\''+batchId+'\')">Open batch →</button>'
    +'</div>';
}

function applyTOSNAToBatch(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  if(!confirm('Apply TOSNA schedule to "'+b.name+'"?\n\nThis will:\n  • Set the nutrient to Fermaid-O (TOSNA protocol)\n  • Write 4 dose entries into the additions log\n\nExisting additions are untouched.'))return;
  b.nutrient='fermaid-o';
  var vol=parseFloat(b.volume)||5;
  var og=parseFloat(b.og)||1.095;
  var doses=computeTOSNADoses(vol,og);
  var startDate=new Date(b.startDate);
  if(!APP.additions)APP.additions={};
  if(!APP.additions[batchId])APP.additions[batchId]=[];

  function addEntryIfMissing(dayOffset,label){
    var dt=new Date(startDate.getTime()+dayOffset*86400000);
    var iso=dt.toISOString().slice(0,10);
    // Dedup: don't add if an identical TOSNA dose for this day+amount already exists
    var exists=APP.additions[batchId].some(function(a){
      return a.item&&a.item.indexOf('Fermaid-O')!==-1&&a.date===iso;
    });
    if(exists)return false;
    APP.additions[batchId].push({
      id:genId(),
      type:'primary',
      date:iso,
      item:'Fermaid-O · '+label,
      amount:doses.perDose+' g',
      removeBy:'',
      removedDate:iso, // Nutrients dissolve — mark "removed" on the same day so they don't show as pending
      notes:'TOSNA dose. Hydrate in a splash of room-temp must, stir gently into the fermenter.'
    });
    return true;
  }

  var added=0;
  if(addEntryIfMissing(1,'Dose 1/4'))added++;
  if(addEntryIfMissing(2,'Dose 2/4'))added++;
  if(addEntryIfMissing(3,'Dose 3/4'))added++;
  if(addEntryIfMissing(7,'Dose 4/4 (at 1/3 sugar break)'))added++;

  scheduleSave();
  toast('✦ TOSNA applied · '+added+' new dose'+(added===1?'':'s')+' written');
  renderTOSNAPlan();
}
