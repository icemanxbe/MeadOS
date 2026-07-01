// MeadOS — © 2026 icemanxbe · PolyForm Noncommercial 1.0.0
// label designer, media resolver, HA websocket, image upload/picker, sharing, PDF, gift card
// Plain script, shared global scope; loaded in order (see index.html).
'use strict';
// ==================== LABEL DESIGNER (Phase 2) ====================
// Modal UI for customizing the per-recipe overlay layout. Two columns:
// a live label preview on the left, element controls on the right. Changes
// flow through window._designerState (working copy) into the preview in
// real time; nothing hits APP.settings until the user clicks Save.

// Friendly font choices surfaced in the picker. Match the keys to the
// overlayFontStack() map so the rendered output uses the right CSS stack.
var DESIGNER_FONTS=['Cinzel','Georgia','Crimson Pro','JetBrains Mono','serif','sans','mono'];

// Element tabs — order matters for UI flow (top-down on a label).
var DESIGNER_ELEMENTS=[
  {key:'style',    label:'Recipe Style',    text:true,  desc:'Top caps line (e.g. "BOCHET")'},
  {key:'name',     label:'Recipe Name',     text:true,  desc:'Italic title (e.g. "Caramelized Honey Mead")'},
  {key:'batchName',label:'Batch Name',      text:true,  desc:'Your batch name in the cream band'},
  {key:'abv',      label:'ABV',             text:true,  desc:'Alcohol percentage'},
  {key:'qr',       label:'QR Code',         text:false, desc:'Scannable share-link QR'},
  {key:'bestDrink',label:'Best-Drink Box',  text:false, desc:'Drinking-window date card'}
];

// Public entry: open the designer for the given recipe.
function openLabelDesigner(recipeId){
  var recipe=(APP.recipes||[]).find(function(r){return r.id===recipeId;});
  if(!recipe){toast('⚠ Recipe not found');return;}
  // Snapshot the current overlay config into a working state — Save commits,
  // Cancel discards.
  window._designerState={
    recipeId:recipeId,
    workingOverlays:JSON.parse(JSON.stringify(getRecipeOverlays(recipeId))),
    selectedElement:'batchName'
  };
  document.body.insertAdjacentHTML('beforeend',renderLabelDesignerModal());
}

// Render the entire designer modal. Called once on open + whenever a control
// change requires re-rendering the right column (element switch, etc.).
function renderLabelDesignerModal(){
  var s=window._designerState;
  var recipe=(APP.recipes||[]).find(function(r){return r.id===s.recipeId;});
  var color=recipe.brandColor||'#c9a350';
  var preview=renderDesignerPreview();
  var tabs=DESIGNER_ELEMENTS.map(function(el){
    var active=s.selectedElement===el.key;
    var cfg=s.workingOverlays[el.key];
    var dotColor=cfg.show?color:'var(--text3)';
    return'<button onclick="selectDesignerElement(\''+el.key+'\')" class="designer-tab'+(active?' active':'')+'" '
      +'style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid '+(active?color:'var(--border)')+';'
      +'background:'+(active?'rgba(201,163,80,0.08)':'transparent')+';color:var(--text);'
      +'border-radius:4px;cursor:pointer;font-family:var(--font-mono);font-size:11px;'
      +'letter-spacing:0.5px;text-align:left;width:100%;margin-bottom:4px">'
      +'<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:'+dotColor+'"></span>'
      +'<span style="flex:1">'+escHtml(el.label)+'</span>'
      +(cfg.show?'':'<span style="font-size:9px;color:var(--text3);font-style:italic">hidden</span>')
      +'</button>';
  }).join('');
  var controls=renderDesignerControls();
  // Flex column with a pinned header + footer and a scrolling middle — if the
  // whole modal scrolls instead, the Save/Cancel footer ends up clipped below
  // the 92vh cutoff on short viewports (e.g. inside an HA iframe) where the
  // overlay scrollbar is invisible, making Save effectively unclickable.
  return'<div class="modal-overlay modal-static" id="designer-overlay" onclick="if(event.target===this)closeLabelDesigner()">'
    +'<div class="modal" style="max-width:980px;width:96vw;background:var(--bg2);border:1px solid '+color+';max-height:92vh;display:flex;flex-direction:column">'
    +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;padding-bottom:10px;border-bottom:1px solid var(--border)">'
    +'<div class="modal-title" style="color:'+color+';margin:0">🎨 LABEL DESIGNER</div>'
    +'<div style="font-family:var(--font-display);font-size:14px;color:var(--text2);font-style:italic">'+escHtml(recipe.name)+'</div>'
    +'</div>'
    +'<div style="flex:1;overflow-y:auto;min-height:0;padding-right:4px">'
    +'<div style="display:grid;grid-template-columns:340px 1fr;gap:24px;align-items:start;margin-top:14px">'
    // Left: preview + background image picker
    +'<div>'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">LIVE PREVIEW</div>'
    +'<div id="designer-preview" style="border-radius:6px;overflow:hidden">'+preview+'</div>'
    +'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:8px;text-align:center">Sample batch "Demo Mead" at 11.5% ABV</div>'
    +renderDesignerBackgroundCard()
    +'</div>'
    // Right: tabs + controls
    +'<div>'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-bottom:8px">OVERLAY ELEMENTS</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px">'+tabs+'</div>'
    +'<div id="designer-controls">'+controls+'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    // Footer — pinned below the scroll area so Save/Cancel are always visible
    +'<div style="display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);flex-shrink:0">'
    +'<button class="btn btn-danger btn-sm" onclick="resetDesignerOverlays()" title="Discard all customizations for this recipe">↺ Reset to defaults</button>'
    +'<button class="btn btn-secondary btn-sm" onclick="applyDesignerToAll()" title="Use this layout for every recipe">≡ Apply to all recipes</button>'
    +'<div style="flex:1"></div>'
    +'<button class="btn btn-secondary" onclick="closeLabelDesigner()">Cancel</button>'
    +'<button class="btn btn-primary" onclick="saveDesignerOverlays()">Save</button>'
    +'</div>'
    +'</div></div>';
}

// Render the live label preview with current working overlays.
function renderDesignerPreview(){
  var s=window._designerState;
  var recipe=(APP.recipes||[]).find(function(r){return r.id===s.recipeId;});
  // Build a sample batch object so users can see the batchName/ABV slots in action
  var sampleBatch={id:'__designer-sample',name:'Demo Mead',recipeId:s.recipeId,startDate:'2025-06-01'};
  // Provide a fake bottling so best-drink box renders
  var origBot=APP.bottling[sampleBatch.id];
  APP.bottling[sampleBatch.id]={date:'2025-06-01',fg:1.010,abv:11.5};
  var html=renderLabelWithABV(s.recipeId,'11.5',{batch:sampleBatch,qr:true,overlays:s.workingOverlays});
  // Tidy up
  if(origBot===undefined)delete APP.bottling[sampleBatch.id];
  else APP.bottling[sampleBatch.id]=origBot;
  return html;
}

// Render the control panel for the currently selected element.
function renderDesignerControls(){
  var s=window._designerState;
  var elKey=s.selectedElement;
  var el=DESIGNER_ELEMENTS.find(function(e){return e.key===elKey;});
  var cfg=s.workingOverlays[elKey];
  var recipe=(APP.recipes||[]).find(function(r){return r.id===s.recipeId;});
  var color=recipe.brandColor||'#c9a350';
  // Show/hide toggle
  var showToggle='<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;background:var(--bg);border-radius:4px;margin-bottom:14px">'
    +'<input type="checkbox" '+(cfg.show?'checked':'')+' onchange="updateDesigner(\''+elKey+'\',\'show\',this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:'+color+'">'
    +'<span style="flex:1;font-size:13px;color:var(--text);font-weight:600">'+escHtml(el.label)+(cfg.show?'':' <span style="color:var(--text3);font-style:italic;font-weight:400">(hidden)</span>')+'</span>'
    +'<span style="font-size:11px;color:var(--text3);font-style:italic">'+escHtml(el.desc)+'</span>'
    +'</label>';
  // Position section: 9-grid + sliders
  var gridButtons='';
  ['T','M','B'].forEach(function(row){
    ['L','C','R'].forEach(function(col){
      var key=row+col;
      var gp=OVERLAY_GRID[key];
      var matches=Math.abs(cfg.x-gp.x)<2&&Math.abs(cfg.y-gp.y)<2;
      gridButtons+='<button onclick="snapDesigner(\''+elKey+'\',\''+key+'\')" '
        +'style="aspect-ratio:1;background:'+(matches?color:'var(--bg)')+';color:'+(matches?'#000':'var(--text2)')+';'
        +'border:1px solid '+(matches?color:'var(--border)')+';border-radius:3px;cursor:pointer;'
        +'font-family:var(--font-mono);font-size:10px;letter-spacing:0.5px" '
        +'title="'+key+' — '+gp.x+'%, '+gp.y+'%">'+key+'</button>';
    });
  });
  var positionSection='<div style="margin-bottom:14px;padding:12px;background:var(--bg);border-radius:4px;border:1px solid var(--border)">'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:8px">POSITION</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;max-width:180px;margin-bottom:12px">'+gridButtons+'</div>'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">'
    +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);width:18px">X</div>'
    +'<input type="range" min="0" max="100" step="0.5" value="'+cfg.x+'" oninput="liveSliderPct(this,\''+elKey+'\',\'x\')" onchange="refreshDesigner()" style="flex:1;accent-color:'+color+'">'
    +'<div id="rd-x-'+elKey+'" style="font-family:var(--font-mono);font-size:11px;color:var(--text);width:44px;text-align:right">'+cfg.x.toFixed(1)+'%</div>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:10px">'
    +'<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);width:18px">Y</div>'
    +'<input type="range" min="0" max="100" step="0.5" value="'+cfg.y+'" oninput="liveSliderPct(this,\''+elKey+'\',\'y\')" onchange="refreshDesigner()" style="flex:1;accent-color:'+color+'">'
    +'<div id="rd-y-'+elKey+'" style="font-family:var(--font-mono);font-size:11px;color:var(--text);width:44px;text-align:right">'+cfg.y.toFixed(1)+'%</div>'
    +'</div>'
    +'</div>';
  // Typography section (text elements only)
  var typoSection='';
  if(el.text){
    var fontOpts=DESIGNER_FONTS.map(function(f){
      return'<option value="'+f+'"'+(cfg.font===f?' selected':'')+'>'+f+'</option>';
    }).join('');
    typoSection='<div style="margin-bottom:14px;padding:12px;background:var(--bg);border-radius:4px;border:1px solid var(--border)">'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:10px">TYPOGRAPHY</div>'
      // Font + size on one row
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
      +'<div>'
      +'<label style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;display:block;margin-bottom:4px">FONT</label>'
      +'<select onchange="updateDesigner(\''+elKey+'\',\'font\',this.value)" class="form-input" style="font-size:12px;padding:5px 8px">'+fontOpts+'</select>'
      +'</div>'
      +'<div>'
      +'<label style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;display:block;margin-bottom:4px">SIZE · <span id="rd-size-'+elKey+'">'+cfg.size+'px</span></label>'
      +'<input type="range" min="8" max="80" step="1" value="'+cfg.size+'" oninput="liveSliderInt(this,\''+elKey+'\',\'size\')" onchange="refreshDesigner()" style="width:100%;accent-color:'+color+'">'
      +'</div>'
      +'</div>'
      // Color + weight + italic on one row
      +'<div style="display:grid;grid-template-columns:90px 1fr 1fr;gap:10px;margin-bottom:10px;align-items:end">'
      +'<div>'
      +'<label style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;display:block;margin-bottom:4px">COLOR</label>'
      +'<input type="color" value="'+cfg.color+'" oninput="liveColor(this,\''+elKey+'\',\'color\')" onchange="refreshDesigner()" style="width:100%;height:30px;border:1px solid var(--border);border-radius:3px;cursor:pointer;background:transparent">'
      +'</div>'
      +'<div>'
      +'<label style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;display:block;margin-bottom:4px">WEIGHT</label>'
      +'<button onclick="updateDesigner(\''+elKey+'\',\'weight\','+(cfg.weight>=600?400:700)+')" '
      +'style="width:100%;padding:6px 8px;background:'+(cfg.weight>=600?color:'var(--bg2)')+';color:'+(cfg.weight>=600?'#000':'var(--text)')+';'
      +'border:1px solid '+(cfg.weight>=600?color:'var(--border)')+';border-radius:3px;cursor:pointer;'
      +'font-family:var(--font);font-size:13px;font-weight:700">'+(cfg.weight>=600?'Bold':'Regular')+'</button>'
      +'</div>'
      +'<div>'
      +'<label style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;display:block;margin-bottom:4px">STYLE</label>'
      +'<button onclick="updateDesigner(\''+elKey+'\',\'italic\','+(!cfg.italic)+')" '
      +'style="width:100%;padding:6px 8px;background:'+(cfg.italic?color:'var(--bg2)')+';color:'+(cfg.italic?'#000':'var(--text)')+';'
      +'border:1px solid '+(cfg.italic?color:'var(--border)')+';border-radius:3px;cursor:pointer;'
      +'font-family:var(--font);font-size:13px;font-style:italic">Italic</button>'
      +'</div>'
      +'</div>'
      // Letter spacing
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;min-width:90px">LETTER SPACING</div>'
      +'<input type="range" min="0" max="20" step="0.5" value="'+(cfg.spacing||0)+'" oninput="liveSliderFloat(this,\''+elKey+'\',\'spacing\')" onchange="refreshDesigner()" style="flex:1;accent-color:'+color+'">'
      +'<div id="rd-spacing-'+elKey+'" style="font-family:var(--font-mono);font-size:11px;color:var(--text);min-width:32px;text-align:right">'+(cfg.spacing||0).toFixed(1)+'</div>'
      +'</div>'
      +'</div>';
  }else{
    // QR / Best-Drink — card theme picker. Position controls above already
    // move the card; theme controls how the backing card looks.
    var themeOpts=[
      {key:'light',label:'Light',swatch:'#faf3e0'},
      {key:'dark',label:'Dark',swatch:'#1a1208'},
      {key:'transparent',label:'None',swatch:'transparent'}
    ];
    var themeBtns=themeOpts.map(function(t){
      var active=(cfg.theme||'light')===t.key;
      var swatchStyle=t.key==='transparent'
        ?'background:repeating-conic-gradient(#444 0% 25%,#777 0% 50%) 50% / 8px 8px;'
        :'background:'+t.swatch+';';
      return'<button onclick="updateDesigner(\''+elKey+'\',\'theme\',\''+t.key+'\')" '
        +'style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 6px;'
        +'background:'+(active?'rgba(201,163,80,0.1)':'var(--bg2)')+';'
        +'border:1px solid '+(active?color:'var(--border)')+';border-radius:3px;cursor:pointer;color:var(--text);'
        +'font-family:var(--font);font-size:11px">'
        +'<div style="width:30px;height:18px;border-radius:3px;border:1px solid var(--border);'+swatchStyle+'"></div>'
        +'<span>'+escHtml(t.label)+'</span>'
        +'</button>';
    }).join('');
    var scaleVal=(cfg.scale!=null?parseFloat(cfg.scale):1);
    typoSection='<div style="margin-bottom:14px;padding:12px;background:var(--bg);border-radius:4px;border:1px solid var(--border)">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text3);letter-spacing:0.5px;min-width:90px">SIZE</div>'
      +'<input type="range" min="0.5" max="2" step="0.05" value="'+scaleVal+'" oninput="liveSliderScale(this,\''+elKey+'\')" onchange="refreshDesigner()" style="flex:1;accent-color:'+color+'">'
      +'<div id="rd-scale-'+elKey+'" style="font-family:var(--font-mono);font-size:11px;color:var(--text);min-width:38px;text-align:right">'+Math.round(scaleVal*100)+'%</div>'
      +'</div></div>'
      +'<div style="margin-bottom:14px;padding:12px;background:var(--bg);border-radius:4px;border:1px solid var(--border)">'
      +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:10px">CARD THEME</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">'+themeBtns+'</div>'
      +'<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:8px">'
      +(cfg.theme==='transparent'?'Transparent — only the contents render, no card behind.'
        :cfg.theme==='dark'?'Dark card — good for light/colorful label artwork.'
        :'Light card — the default, works on most labels.')
      +'</div>'
      +'</div>';
  }
  return showToggle+positionSection+typoSection;
}

// Snap an element to one of the 9-grid positions
function snapDesigner(elKey,gridKey){
  var s=window._designerState;
  var gp=OVERLAY_GRID[gridKey];
  s.workingOverlays[elKey].x=gp.x;
  s.workingOverlays[elKey].y=gp.y;
  refreshDesigner();
}

// Update a single field on the working state and refresh
function updateDesigner(elKey,field,value){
  var s=window._designerState;
  s.workingOverlays[elKey][field]=value;
  refreshDesigner();
}

// ── Continuous-input fast path ──────────────────────────────────────────
// Sliders and the color picker fire input events many times per second while
// the user drags. The full refreshDesigner() rebuilds the modal's outerHTML
// which destroys the in-flight slider element — so dragging feels janky and
// the thumb resets. liveDesigner() updates the working state + preview ONLY,
// leaving the controls panel untouched. Discrete inputs (font dropdown,
// weight/italic toggles, grid snaps, theme picks, show/hide checkbox) still
// use updateDesigner() since their visual state changes the controls layout.
function liveDesigner(elKey,field,value){
  var s=window._designerState;
  if(!s)return;
  s.workingOverlays[elKey][field]=value;
  var preview=document.getElementById('designer-preview');
  if(preview)preview.innerHTML=renderDesignerPreview();
}

// Slider helpers — also update the inline readout in place
function liveSliderPct(input,elKey,field){
  var v=parseFloat(input.value);
  liveDesigner(elKey,field,v);
  var rd=document.getElementById('rd-'+field+'-'+elKey);
  if(rd)rd.textContent=v.toFixed(1)+'%';
}
// QR / best-drink card size (cfg.scale), shown as a percentage.
function liveSliderScale(input,elKey){
  var v=parseFloat(input.value);
  liveDesigner(elKey,'scale',v);
  var rd=document.getElementById('rd-scale-'+elKey);
  if(rd)rd.textContent=Math.round(v*100)+'%';
}
function liveSliderInt(input,elKey,field){
  var v=parseInt(input.value,10);
  liveDesigner(elKey,field,v);
  var rd=document.getElementById('rd-'+field+'-'+elKey);
  if(rd)rd.textContent=v+'px';
}
function liveSliderFloat(input,elKey,field){
  var v=parseFloat(input.value);
  liveDesigner(elKey,field,v);
  var rd=document.getElementById('rd-'+field+'-'+elKey);
  if(rd)rd.textContent=v.toFixed(1);
}
function liveColor(input,elKey,field){
  liveDesigner(elKey,field,input.value);
}

// Switch the active element tab
function selectDesignerElement(elKey){
  window._designerState.selectedElement=elKey;
  refreshDesigner();
}

// Re-render the controls + preview in place. Cheaper than full modal rebuild
// since we don't touch the outer chrome / element tabs.
function refreshDesigner(){
  // Re-render the controls AND tabs (tabs reflect show/hide state)
  var overlay=document.getElementById('designer-overlay');
  if(!overlay)return;
  // Rebuild the whole modal — simpler than surgical updates and fast enough
  overlay.outerHTML=renderLabelDesignerModal();
}

// Persist working state to APP.settings.recipeOverlays and close.
// Only stores entries that DIFFER from the default to keep state lean.
function saveDesignerOverlays(){
  var s=window._designerState;
  if(!s){toast('⚠ Designer state lost — reopen the designer');return;}
  if(!APP.settings.recipeOverlays)APP.settings.recipeOverlays={};
  // Diff working state against defaults — only keep changed fields per element
  var diff={};
  ['style','name','batchName','abv','qr','bestDrink'].forEach(function(elKey){
    var working=s.workingOverlays[elKey]||{};
    var def=defaultOverlayFor(elKey,s.recipeId);
    var changed={};
    var hasChange=false;
    Object.keys(working).forEach(function(k){
      if(working[k]!==def[k]){changed[k]=working[k];hasChange=true;}
    });
    if(hasChange)diff[elKey]=changed;
  });
  if(Object.keys(diff).length){
    APP.settings.recipeOverlays[s.recipeId]=diff;
  }else{
    // No changes from default — remove any existing override
    delete APP.settings.recipeOverlays[s.recipeId];
  }
  scheduleSave();
  closeLabelDesigner();
  toast('✦ Label saved');
  renderMain();
}

function resetDesignerOverlays(){
  if(!confirm('Discard all customizations for this recipe and revert to defaults?'))return;
  var s=window._designerState;
  if(APP.settings.recipeOverlays&&APP.settings.recipeOverlays[s.recipeId]){
    delete APP.settings.recipeOverlays[s.recipeId];
  }
  // Persist immediately — the user confirmed a destructive action and would
  // be surprised if a tab reload brought the old overrides back.
  scheduleSave();
  // Reload working state from defaults
  s.workingOverlays=JSON.parse(JSON.stringify(getRecipeOverlays(s.recipeId)));
  refreshDesigner();
  toast('↺ Reset to defaults');
}

function applyDesignerToAll(){
  if(!confirm('Apply this layout to every recipe? Existing per-recipe customizations will be replaced.'))return;
  var s=window._designerState;
  if(!APP.settings.recipeOverlays)APP.settings.recipeOverlays={};
  // Build a diff against PER-RECIPE defaults (since photographic vs generic
  // recipes have different defaults — we want to preserve "show=false on
  // batch name for photo labels" by storing the diff appropriately).
  // The simpler choice: store the working state as-is across all recipes.
  // This means a designer change applies uniformly, which is what "Apply to
  // all" should do.
  (APP.recipes||[]).forEach(function(r){
    APP.settings.recipeOverlays[r.id]={};
    ['style','name','batchName','abv','qr','bestDrink'].forEach(function(elKey){
      var def=defaultOverlayFor(elKey,r.id);
      var working=s.workingOverlays[elKey];
      var changed={};
      var hasChange=false;
      Object.keys(working).forEach(function(k){
        if(working[k]!==def[k]){changed[k]=working[k];hasChange=true;}
      });
      if(hasChange)APP.settings.recipeOverlays[r.id][elKey]=changed;
    });
    // Trim empty
    if(!Object.keys(APP.settings.recipeOverlays[r.id]).length){
      delete APP.settings.recipeOverlays[r.id];
    }
  });
  scheduleSave();
  toast('✦ Applied to '+(APP.recipes||[]).length+' recipes');
}

function closeLabelDesigner(){
  var overlay=document.getElementById('designer-overlay');
  if(overlay)overlay.remove();
  window._designerState=null;
}
