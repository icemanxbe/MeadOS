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
