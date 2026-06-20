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
  return'<div class="modal-overlay" id="designer-overlay" onclick="if(event.target===this)closeLabelDesigner()">'
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

// ==================== MEDIA SOURCE RESOLVER (Phase 3) ====================
// Custom label images and the brand logo can be either:
//   1. A data URL (uploaded from device) — used directly as <img src>
//   2. A media-source:// identifier (picked from /config/media/) — must be
//      resolved against HA's media_source API to get a signed playable URL
//
// Resolved URLs are time-limited (~10min). We keep an in-memory cache and
// prefetch all known IDs at app boot. Cache misses cause getResolvedMediaUrl
// to return null (callers fall back to procedural/baked label) while an
// async resolution kicks off for next render.

if(typeof window._mediaResolveCache==='undefined')window._mediaResolveCache={};

// Determine the format of a stored label reference.
//   'data'    — data:image/...;base64,...  (use directly)
//   'media'   — media-source://...         (needs resolve)
//   'url'     — http(s) URL or /local/...  (use directly)
//   'none'    — null/empty/unknown
function classifyLabelRef(ref){
  if(!ref||typeof ref!=='string')return'none';
  if(ref.indexOf('data:')===0)return'data';
  if(ref.indexOf('media-source://')===0)return'media';
  if(/^https?:\/\//.test(ref)||ref.charAt(0)==='/')return'url';
  return'none';
}

// Synchronously resolve a label reference to a URL usable in <img src>.
// For data: URLs and direct URLs, returns the value unchanged. For
// media-source: refs, returns the cached resolved URL if fresh, else null
// (and schedules an async re-resolve so the cache fills for next render).
function getResolvedMediaUrl(ref){
  var kind=classifyLabelRef(ref);
  if(kind==='data'||kind==='url')return ref;
  if(kind==='media'){
    var cached=window._mediaResolveCache[ref];
    var now=Date.now();
    if(cached&&cached.expiresAt>now+30000)return cached.url;
    // Cache miss or near expiry — kick off async re-resolve in background
    if(!cached||!cached.refreshing){
      window._mediaResolveCache[ref]={url:cached?cached.url:null,expiresAt:cached?cached.expiresAt:0,refreshing:true};
      resolveMediaSourceId(ref).then(function(url){
        // Signed URLs typically last ~10 minutes; refresh at 8min to be safe
        window._mediaResolveCache[ref]={url:url,expiresAt:Date.now()+8*60*1000,refreshing:false};
        // Trigger re-renders so the new URL shows up immediately. We refresh
        // BOTH the main view (in case a label is visible there) AND the
        // designer modal if it's open (since renderMain doesn't touch the
        // designer's preview). Without the designer refresh, picking an HA
        // Media file would show the fallback label until the user reopened
        // the designer.
        if(!APP._shareMode&&typeof renderMain==='function')renderMain();
        if(window._designerState&&typeof refreshDesigner==='function')refreshDesigner();
        // Also refresh the topbar crest if this resolve was for the brand
        // logo — renderMain doesn't touch the topbar.
        if(APP.settings&&APP.settings.brandLogo===ref){
          var crest=document.getElementById('topbar-crest');
          if(crest&&typeof getBrandLogoSrc==='function'){
            crest.innerHTML='<img src="'+getBrandLogoSrc()+'" alt="MeadOS">';
          }
        }
      }).catch(function(err){
        console.warn('Media resolve failed for',ref,err);
        window._mediaResolveCache[ref]={url:null,expiresAt:0,refreshing:false,failed:true};
      });
    }
    return cached?cached.url:null;
  }
  return null;
}

// ==================== HA WEBSOCKET ====================
// HA's media_source/browse_media and media_source/resolve_media are exposed
// via the WebSocket API only — they are NOT REST endpoints. Earlier
// versions of this code POSTed to /api/media_source/browse_media which always
// failed with 404/405. The picker now talks WebSocket for these calls.
//
// One connection is maintained per session, authenticated once. Each call
// uses an incrementing id and resolves when the matching 'result' arrives.

if(typeof window._haWS==='undefined')window._haWS=null;
if(typeof window._haWSReady==='undefined')window._haWSReady=null;
if(typeof window._haWSPending==='undefined')window._haWSPending={};
if(typeof window._haWSId==='undefined')window._haWSId=0;

// The media-browser WebSocket needs the raw token (it can't go through the
// HTTP proxy). Fetch it on demand from the server — it isn't kept in app state.
function fetchHAToken(){
  return fetch('/api/ha-token')
    .then(function(r){return r.ok?r.json():null;})
    .then(function(j){return(j&&j.token)||null;})
    .catch(function(){return null;});
}

function ensureHAWebSocket(){
  if(window._haWSReady)return window._haWSReady;
  window._haWSReady=fetchHAToken().then(function(token){return new Promise(function(resolve,reject){
    if(!token){reject(new Error('No HA token'));return;}
    var base=(typeof haBaseUrl==='function'?haBaseUrl():'')||'';
    if(!base){reject(new Error('No HA URL configured'));return;}
    // http→ws, https→wss
    base=base.replace(/^http/,'ws');
    if(base.slice(-1)==='/')base=base.slice(0,-1);
    var url=base+'/api/websocket';
    console.log('[MeadOS] HA WebSocket connecting to',url);
    var ws;
    try{ws=new WebSocket(url);}catch(e){reject(e);return;}
    var settled=false;
    ws.onmessage=function(ev){
      var msg;
      try{msg=JSON.parse(ev.data);}catch(e){return;}
      if(msg.type==='auth_required'){
        ws.send(JSON.stringify({type:'auth',access_token:token}));
      }else if(msg.type==='auth_ok'){
        console.log('[MeadOS] HA WebSocket authenticated');
        window._haWS=ws;
        settled=true;
        resolve(ws);
      }else if(msg.type==='auth_invalid'){
        console.warn('[MeadOS] HA WebSocket auth invalid:',msg.message);
        settled=true;
        window._haWSReady=null;
        reject(new Error('HA token rejected: '+(msg.message||'auth_invalid')));
        try{ws.close();}catch(e){}
      }else if(msg.type==='result'){
        var pending=window._haWSPending[msg.id];
        if(pending){
          delete window._haWSPending[msg.id];
          if(msg.success)pending.resolve(msg.result);
          else pending.reject(new Error((msg.error&&msg.error.message)||'WS error'));
        }
      }
    };
    ws.onerror=function(ev){
      console.warn('[MeadOS] HA WebSocket error',ev);
      if(!settled){settled=true;window._haWSReady=null;reject(new Error('WebSocket connection error'));}
    };
    ws.onclose=function(){
      console.log('[MeadOS] HA WebSocket closed');
      window._haWS=null;
      window._haWSReady=null;
      // Reject any still-pending calls
      Object.keys(window._haWSPending).forEach(function(id){
        window._haWSPending[id].reject(new Error('WebSocket closed'));
        delete window._haWSPending[id];
      });
    };
    // 8-second connect timeout
    setTimeout(function(){
      if(!settled){settled=true;window._haWSReady=null;try{ws.close();}catch(e){}reject(new Error('WebSocket connect timeout'));}
    },8000);
  });});
  return window._haWSReady;
}

async function haWSCall(cmd){
  var ws=await ensureHAWebSocket();
  var id=++window._haWSId;
  return new Promise(function(resolve,reject){
    window._haWSPending[id]={resolve:resolve,reject:reject};
    try{ws.send(JSON.stringify(Object.assign({id:id},cmd)));}
    catch(e){delete window._haWSPending[id];reject(e);return;}
    // 15s timeout per call
    setTimeout(function(){
      if(window._haWSPending[id]){
        delete window._haWSPending[id];
        reject(new Error('WebSocket call timeout: '+(cmd.type||'?')));
      }
    },15000);
  });
}

// Resolve a media-source ID to a playable URL via WebSocket.
async function resolveMediaSourceId(mediaContentId){
  var result=await haWSCall({type:'media_source/resolve_media',media_content_id:mediaContentId});
  var base=(typeof haBaseUrl==='function'?haBaseUrl():'')||'';
  if(base.slice(-1)==='/')base=base.slice(0,-1);
  // HA returns either an absolute URL or a relative path like /api/media_source_proxy/...
  if(result.url&&result.url.charAt(0)==='/')return base+result.url;
  return result.url;
}

// Browse a folder via WebSocket. Returns {children:[...]} structure.
async function browseMediaSource(mediaContentId){
  return haWSCall({type:'media_source/browse_media',media_content_id:mediaContentId||null});
}

// Pre-resolve all known media-source IDs at app boot so cache is warm.
// Failures are non-fatal — callers fall back to procedural labels.
// Skipped entirely when HA is not configured/enabled, since media-source
// resolution requires the HA WebSocket which would otherwise time out for
// each stored ID (8s × N IDs of wasted connect attempts).
function prefetchAllMediaUrls(){
  if(typeof haConfigured!=='function'||!haConfigured())return;
  var ids=[];
  var cl=APP.settings.customLabels||{};
  Object.keys(cl).forEach(function(k){
    if(classifyLabelRef(cl[k])==='media')ids.push(cl[k]);
  });
  if(classifyLabelRef(APP.settings.brandLogo)==='media'){
    ids.push(APP.settings.brandLogo);
  }
  // De-dup
  ids=ids.filter(function(v,i,a){return a.indexOf(v)===i;});
  ids.forEach(function(id){getResolvedMediaUrl(id);});
}

// ==================== IMAGE UPLOAD UTILITY ====================
// Reads a File from <input type="file"> and returns a resized data URL.
// Resize keeps images under reasonable storage size — labels can be 900×900
// max (matches label spec); logos cap at 256×256. Output is JPEG @ quality
// 0.85 to balance fidelity with localStorage budget. PNG kept for images
// with transparency (logos often have it).
// Push a data-URL image to the server, which stores it as a plain file in
// the labels/ folder next to index.html and returns a tiny '/labels/<hash>'
// URL. Keeping URLs instead of megabytes of base64 in the state blob is what
// keeps page loads fast. Falls back to the data URL when the server can't
// store it (offline, etc.) — heavier but functional.
async function storeImageAsset(dataUrl,kind){
  try{
    var res=await apiFetch('/api/asset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:dataUrl,kind:kind||'labels'})});
    if(res&&res.ok){
      var j=await res.json();
      if(j&&j.url)return j.url;
    }
  }catch(e){}
  return dataUrl;
}

// Build a square, dark-background app icon from the brand logo and store it as
// settings.appIcon. The OS masks the home-screen icon to a circle/squircle, so
// compositing the (often round/transparent) logo onto a padded dark square keeps
// it from being clipped. No image library needed — the browser canvas does it.
// Falls back to leaving appIcon unset (server then uses the raw logo) if the
// logo can't be drawn (e.g. a cross-origin source that taints the canvas).
async function regenerateAppIcon(){
  var prev=APP.settings&&APP.settings.appIcon;
  try{
    var brand=APP.settings&&APP.settings.brandLogo;
    if(!brand){APP.settings.appIcon=null;}
    else{
      var src=(typeof getBrandLogoSrc==='function')?getBrandLogoSrc():brand;
      var img=await new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im);};im.onerror=function(){rej(new Error('load failed'));};im.src=src;});
      var iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
      if(!iw||!ih)throw new Error('no dimensions');
      var S=512,box=Math.round(S*0.78); // content in the central ~78% (maskable safe zone)
      var scale=Math.min(box/iw,box/ih),w=iw*scale,h=ih*scale;
      var cv=document.createElement('canvas');cv.width=S;cv.height=S;
      var ctx=cv.getContext('2d');
      ctx.fillStyle='#0a0a0b';ctx.fillRect(0,0,S,S);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,(S-w)/2,(S-h)/2,w,h);
      APP.settings.appIcon=await storeImageAsset(cv.toDataURL('image/png'),'brand');
    }
  }catch(e){APP.settings.appIcon=null;}
  if(prev&&prev!==APP.settings.appIcon&&typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(prev);
}

// Is a stored /labels/ asset URL still referenced ANYWHERE in app state?
// Assets are content-addressed, so one file can back several references
// (two batches photographed with the same image, a label reused as a logo…).
// We only delete the file once the last reference is gone. Call this AFTER
// removing the reference from APP, so the scan reflects the post-delete state.
function assetUrlReferenced(url){
  if(!url)return true; // unknown → treat as in use (never delete)
  // Photos
  var photos=APP.photos||{};
  for(var bid in photos){
    if((photos[bid]||[]).some(function(p){return p.url===url;}))return true;
  }
  // Custom labels + brand logo
  var labels=(APP.settings&&APP.settings.customLabels)||{};
  for(var k in labels){if(labels[k]===url)return true;}
  if(APP.settings&&APP.settings.brandLogo===url)return true;
  if(APP.settings&&APP.settings.appIcon===url)return true;
  return false;
}

// Delete the underlying asset file IF it's a server-stored /labels/ asset and
// nothing else references it. Safe to call with any ref (data:/media:/empty —
// it no-ops). Best-effort: a failed delete just leaves the file (no orphan
// guarantee, but no user-facing error either).
async function deleteAssetIfUnused(url){
  if(classifyLabelRef(url)!=='url')return;       // only our own stored URLs
  if(url.indexOf('/labels/')!==0&&url.indexOf('/assets/')!==0)return; // not an uploaded asset
  if(assetUrlReferenced(url))return;              // still in use elsewhere
  try{
    await apiFetch('/api/asset/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url})});
  }catch(e){/* best-effort */}
}

// One-time migration: older versions embedded uploaded images as base64
// inside settings (and therefore inside every save/load of the state blob),
// which ballooned page loads to multiple seconds. Move them to the labels/
// folder and keep only the URLs.
async function migrateInlineImagesToAssets(){
  if(APP._shareMode)return;
  var jobs=[];
  var labels=APP.settings.customLabels||{};
  Object.keys(labels).forEach(function(k){
    if(typeof classifyLabelRef==='function'&&classifyLabelRef(labels[k])==='data')jobs.push({kind:'label',key:k,data:labels[k]});
  });
  if(typeof classifyLabelRef==='function'&&classifyLabelRef(APP.settings.brandLogo)==='data')jobs.push({kind:'logo',data:APP.settings.brandLogo});
  if(!jobs.length)return;
  var moved=0;
  for(var i=0;i<jobs.length;i++){
    var ref=await storeImageAsset(jobs[i].data,jobs[i].kind==='label'?'labels':'brand');
    if(ref!==jobs[i].data){
      if(jobs[i].kind==='label')APP.settings.customLabels[jobs[i].key]=ref;
      else APP.settings.brandLogo=ref;
      moved++;
    }
  }
  if(moved){
    scheduleSave();
    toast('🚀 Moved '+moved+' image'+(moved===1?'':'s')+' to the labels/ folder — page loads will be much faster');
  }
}

function readImageAsDataUrl(file,opts,callback){
  opts=opts||{};
  var maxDim=opts.maxDim||900;
  var preferPng=opts.preferPng===true;
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var w=img.width,h=img.height;
      if(w>maxDim||h>maxDim){
        var scale=Math.min(maxDim/w,maxDim/h);
        w=Math.round(w*scale);
        h=Math.round(h*scale);
      }
      var canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      var ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      // Use PNG if requested OR if file already had transparency (heuristic
      // via the source mime type)
      var usePng=preferPng||/\.(png|svg)$/i.test(file.name||'')||(file.type||'').indexOf('png')>=0;
      var dataUrl=canvas.toDataURL(usePng?'image/png':'image/jpeg',0.85);
      callback(null,dataUrl,{w:w,h:h,bytes:dataUrl.length});
    };
    img.onerror=function(){callback(new Error('Image failed to load'));};
    img.src=e.target.result;
  };
  reader.onerror=function(){callback(new Error('File read failed'));};
  reader.readAsDataURL(file);
}

// ==================== IMAGE PICKER MODAL ====================
// Lets the user choose an image via:
//   • File upload from device (always available)
//   • HA Media Source browser (available when HA is configured)
//   • Direct URL paste (escape hatch)
//
// On selection, calls the provided callback with the stored reference (data
// URL string for uploads, media-source ID for HA picks, URL string for paste).

function openImagePicker(opts){
  opts=opts||{};
  var title=opts.title||'Pick an image';
  var callback=opts.onPick||function(){};
  var maxDim=opts.maxDim||900;
  var preferPng=opts.preferPng===true;
  var folder=opts.mediaFolder||'media-source://media_source/local';
  var canHA=(typeof haConfigured==='function')&&haConfigured();
  window._pickerState={
    title:title,
    callback:callback,
    kind:opts.kind||'labels',  // assets/<kind>/ subdir for uploads
    maxDim:maxDim,
    preferPng:preferPng,
    folder:folder,
    canHA:canHA,
    mode:canHA?'media':'upload',
    mediaItems:null,
    mediaLoading:false,
    mediaError:null,
    currentFolder:folder
  };
  document.body.insertAdjacentHTML('beforeend',renderImagePickerModal());
  if(canHA)loadMediaFolder(folder);
}

function renderImagePickerModal(){
  var s=window._pickerState;
  var tabBtn=function(key,label,enabled){
    var active=s.mode===key;
    return'<button onclick="setPickerMode(\''+key+'\')" '+(enabled?'':'disabled')+' '
      +'style="padding:8px 14px;border:1px solid '+(active?'var(--gold)':'var(--border)')+';'
      +'background:'+(active?'rgba(201,163,80,0.1)':'transparent')+';'
      +'color:'+(enabled?'var(--text)':'var(--text3)')+';'
      +'border-radius:4px;cursor:'+(enabled?'pointer':'not-allowed')+';'
      +'font-family:var(--font-mono);font-size:11px;letter-spacing:0.5px;margin-right:4px">'
      +escHtml(label)+'</button>';
  };
  var body='';
  if(s.mode==='upload')body=renderPickerUpload();
  else if(s.mode==='media')body=renderPickerMedia();
  else body=renderPickerUrl();
  return'<div class="modal-overlay" id="picker-overlay" onclick="if(event.target===this)closeImagePicker()">'
    +'<div class="modal" style="max-width:760px;width:94vw;max-height:88vh;overflow:auto;background:var(--bg2)">'
    +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px">'
    +'<div class="modal-title" style="margin:0">🖼 '+escHtml(s.title)+'</div>'
    +'<button class="btn btn-secondary btn-sm" onclick="closeImagePicker()">✕</button>'
    +'</div>'
    +'<div style="display:flex;margin-bottom:14px;border-bottom:1px solid var(--border);padding-bottom:10px">'
    +tabBtn('upload','📤 Upload',true)
    +tabBtn('media','🗂 HA Media',s.canHA)
    +tabBtn('url','🔗 URL',true)
    +(!s.canHA?'<span style="margin-left:8px;font-size:11px;color:var(--text3);font-style:italic;align-self:center">HA media browsing requires the optional Home Assistant connection (Settings)</span>':'')
    +'</div>'
    +'<div id="picker-body">'+body+'</div>'
    +'</div></div>';
}

function setPickerMode(mode){
  window._pickerState.mode=mode;
  // Re-render in place
  var overlay=document.getElementById('picker-overlay');
  if(overlay)overlay.outerHTML=renderImagePickerModal();
  if(mode==='media'&&!window._pickerState.mediaItems&&!window._pickerState.mediaLoading){
    loadMediaFolder(window._pickerState.currentFolder);
  }
}

function renderPickerUpload(){
  return'<div style="text-align:center;padding:30px 20px;border:2px dashed var(--border);border-radius:6px">'
    +'<div style="font-size:32px;margin-bottom:8px">📤</div>'
    +'<div style="font-family:var(--font-display);font-size:16px;color:var(--text);margin-bottom:8px">Upload from device</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:18px">PNG, JPEG, WEBP, or SVG · auto-resized to '+window._pickerState.maxDim+'px max</div>'
    +'<input type="file" id="picker-file-input" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange="handlePickerUpload(this)" style="display:none">'
    +'<button class="btn btn-primary" onclick="document.getElementById(\'picker-file-input\').click()">Choose image…</button>'
    +'<div id="picker-upload-status" style="margin-top:14px;font-size:12px;color:var(--text3)"></div>'
    +'</div>';
}

function handlePickerUpload(input){
  var file=input.files&&input.files[0];
  if(!file)return;
  var status=document.getElementById('picker-upload-status');
  if(status)status.textContent='Processing '+file.name+'…';
  var s=window._pickerState;
  readImageAsDataUrl(file,{maxDim:s.maxDim,preferPng:s.preferPng},function(err,dataUrl,info){
    if(err){
      if(status){status.style.color='var(--red2)';status.textContent='⚠ '+err.message;}
      return;
    }
    if(status){
      status.style.color='var(--green2)';
      status.textContent='✓ Loaded '+info.w+'×'+info.h+' · '+(info.bytes/1024).toFixed(0)+'KB';
    }
    if(status)status.textContent='✓ Loaded '+info.w+'×'+info.h+' · storing on server…';
    storeImageAsset(dataUrl,s.kind||'labels').then(function(ref){
      var cb=s.callback;closeImagePicker();cb(ref);
    });
  });
}

function renderPickerUrl(){
  return'<div style="padding:20px">'
    +'<div style="font-family:var(--font-display);font-size:16px;color:var(--text);margin-bottom:8px">Paste an image URL</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:14px">A direct URL to a PNG/JPEG/SVG. Works for /local/… paths inside HA or external https URLs.</div>'
    +'<div style="display:flex;gap:8px">'
    +'<input type="text" id="picker-url-input" class="form-input" style="flex:1" placeholder="/local/labels/my-mead.png or https://...">'
    +'<button class="btn btn-primary" onclick="confirmPickerUrl()">Use URL</button>'
    +'</div>'
    +'</div>';
}

function confirmPickerUrl(){
  var inp=document.getElementById('picker-url-input');
  if(!inp||!inp.value.trim())return;
  var url=inp.value.trim();
  var s=window._pickerState;var cb=s.callback;closeImagePicker();cb(url);
}

function renderPickerMedia(){
  var s=window._pickerState;
  if(s.mediaLoading)return'<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">Loading folder…</div>';
  if(s.mediaError)return'<div style="padding:20px;color:var(--red2);font-size:13px">⚠ '+escHtml(s.mediaError)+'<div style="margin-top:10px;color:var(--text3);font-size:12px">Make sure your HA <code>/config/media/labels/</code> folder exists and has images. If you haven\'t set up the folder, the Files addon can create it.</div></div>';
  if(!s.mediaItems)return'<div style="padding:20px;color:var(--text3)">No data</div>';
  var children=s.mediaItems.children||[];
  if(!children.length){
    // Convert media-source ID into a friendly /config/media-relative path.
    var friendly=s.currentFolder
      .replace('media-source://media_source/local/','/config/media/')
      .replace('media-source://media_source/local','/config/media');
    return'<div style="padding:30px;text-align:center;color:var(--text3);font-style:italic">'
      +'Empty folder. Drop images into <code>'+escHtml(friendly)+'</code> on your HA.'
      +(s.currentFolder!=='media-source://media_source/local'?'<div style="margin-top:10px;font-size:11px"><button class="btn btn-secondary btn-sm" onclick="loadMediaFolder(\'media-source://media_source/local\')">↰ Back to /config/media</button></div>':'')
      +'</div>';
  }
  // Path breadcrumb
  var path=s.currentFolder.replace('media-source://media_source/local/','/config/media/')
    .replace('media-source://media_source/local','/config/media');
  var crumb='<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);margin-bottom:10px;padding:6px 10px;background:var(--bg);border-radius:4px">📂 '+escHtml(path)+'</div>';
  var grid=children.map(function(c){
    var isFolder=c.media_class==='directory';
    var isImage=c.media_class==='image'||/\.(png|jpe?g|webp|svg)$/i.test(c.title||'');
    if(isFolder){
      return'<button onclick="loadMediaFolder(\''+escHtml(c.media_content_id).replace(/'/g,"\\'")+'\')" '
        +'style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;background:var(--bg);'
        +'border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text);font-family:var(--font);font-size:12px">'
        +'<div style="font-size:28px">📁</div>'
        +'<div style="text-align:center;word-break:break-word">'+escHtml(c.title||'(folder)')+'</div>'
        +'</button>';
    }
    if(!isImage)return'';
    // Image item — show thumbnail if available, else filename
    return'<button onclick="confirmPickerMedia(\''+escHtml(c.media_content_id).replace(/'/g,"\\'")+'\')" '
      +'style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;background:var(--bg);'
      +'border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text)" '
      +'onmouseenter="this.style.borderColor=\'var(--gold)\'" onmouseleave="this.style.borderColor=\'var(--border)\'">'
      +(c.thumbnail?'<img src="'+escHtml(c.thumbnail)+'" style="width:100%;height:90px;object-fit:cover;border-radius:3px" loading="lazy">':'<div style="width:100%;height:90px;display:flex;align-items:center;justify-content:center;font-size:32px;background:var(--bg2);border-radius:3px">🖼</div>')
      +'<div style="font-size:11px;text-align:center;word-break:break-word;width:100%">'+escHtml(c.title||'(image)')+'</div>'
      +'</button>';
  }).filter(Boolean).join('');
  return crumb
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">'+grid+'</div>'
    +(s.currentFolder!=='media-source://media_source/local'?'<div style="margin-top:14px"><button class="btn btn-secondary btn-sm" onclick="loadMediaFolder(\'media-source://media_source/local\')">↰ Up to /config/media</button></div>':'');
}

function loadMediaFolder(mediaContentId){
  var s=window._pickerState;
  if(!s)return;
  s.currentFolder=mediaContentId;
  s.mediaLoading=true;
  s.mediaError=null;
  s.mediaItems=null;
  refreshPickerBody();
  browseMediaSource(mediaContentId).then(function(data){
    s.mediaLoading=false;
    s.mediaItems=data;
    refreshPickerBody();
  }).catch(function(err){
    s.mediaLoading=false;
    s.mediaError=err.message||String(err);
    refreshPickerBody();
  });
}

function refreshPickerBody(){
  var body=document.getElementById('picker-body');
  if(body)body.innerHTML=renderPickerMedia();
}

function confirmPickerMedia(mediaContentId){
  var s=window._pickerState;var cb=s.callback;closeImagePicker();cb(mediaContentId);
}

function closeImagePicker(){
  var overlay=document.getElementById('picker-overlay');
  if(overlay)overlay.remove();
  window._pickerState=null;
}

// Render the BACKGROUND IMAGE card in the Label Designer's left column.
// Shows what artwork the label is currently using and provides upload/clear.
function renderDesignerBackgroundCard(){
  var s=window._designerState;
  if(!s)return'';
  var customRef=(APP.settings.customLabels||{})[s.recipeId];
  var kind=classifyLabelRef(customRef);
  var source,sourceColor;
  if(kind==='data'){source='Uploaded image';sourceColor='var(--green2)';}
  else if(kind==='media'){source='HA media · '+(customRef.replace(/^media-source:\/\/[^\/]+\/[^\/]+\//,''));sourceColor='var(--blue2)';}
  else if(kind==='url'){source='URL';sourceColor='var(--blue2)';}
  else{
    var isGen=(typeof recipeUsesGenericLabel==='function')&&recipeUsesGenericLabel(s.recipeId);
    source=isGen?'Generated artwork':'Built-in image';
    sourceColor='var(--text3)';
  }
  return'<div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:4px;border:1px solid var(--border)">'
    +'<div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1px;margin-bottom:8px">BACKGROUND IMAGE</div>'
    +'<div style="font-size:12px;color:'+sourceColor+';margin-bottom:10px;word-break:break-all">'+escHtml(source)+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
    +'<button class="btn btn-secondary btn-sm" onclick="pickDesignerBackground()" style="flex:1">🖼 Pick image…</button>'
    +(kind!=='none'?'<button class="btn btn-secondary btn-sm" onclick="clearDesignerBackground()">Clear</button>':'')
    +'</div>'
    +'</div>';
}

// Opens the image picker, on selection stores the ref in customLabels and
// refreshes the designer preview.
function pickDesignerBackground(){
  var s=window._designerState;
  openImagePicker({
    title:'Pick background image for label',
    maxDim:900,
    onPick:function(ref){
      if(!APP.settings.customLabels)APP.settings.customLabels={};
      var prev=APP.settings.customLabels[s.recipeId];
      APP.settings.customLabels[s.recipeId]=ref;
      // If it's a media-source ID, kick off resolution immediately
      if(classifyLabelRef(ref)==='media')getResolvedMediaUrl(ref);
      // Save right away so it survives a Cancel
      scheduleSave();
      // The replaced background's file is orphaned if nothing else uses it.
      if(prev&&prev!==ref&&typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(prev);
      refreshDesigner();
      toast('✦ Background updated');
    }
  });
}

function clearDesignerBackground(){
  var s=window._designerState;
  var prev=APP.settings.customLabels&&APP.settings.customLabels[s.recipeId];
  if(APP.settings.customLabels)delete APP.settings.customLabels[s.recipeId];
  scheduleSave();
  if(typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(prev);
  refreshDesigner();
  toast('Background reverted to default');
}

// ==================== BRAND LOGO PICKER ====================
// Wraps the image picker for the topbar/dashboard logo. Stored server-side as
// an asset at the same 900px/PNG detail as bottle labels — the 200px preview is
// retina/HiDPI, so a smaller source visibly pixelates.
function pickBrandLogo(){
  openImagePicker({
    title:'Pick brand logo',
    kind:'brand',
    maxDim:900,
    preferPng:true,
    onPick:function(ref){
      var prev=APP.settings.brandLogo;
      APP.settings.brandLogo=ref;
      if(classifyLabelRef(ref)==='media')getResolvedMediaUrl(ref);
      scheduleSave();
      if(prev&&prev!==ref&&typeof deleteAssetIfUnused==='function')deleteAssetIfUnused(prev);
      // Rebuild the square dark-background PWA/app icon from the new logo.
      regenerateAppIcon().then(function(){scheduleSave();});
      // Refresh the topbar logo immediately (renderMain doesn't touch it)
      var crest=document.getElementById('topbar-crest');
      if(crest){
        var src=getBrandLogoSrc();
        crest.innerHTML='<img src="'+src+'" alt="MeadOS">';
      }
      renderMain();
      toast('✦ Brand logo updated');
    }
  });
}

function clearBrandLogo(){
  if(!confirm('Restore the default brand logo?'))return;
  var prev=APP.settings.brandLogo;
  var prevIcon=APP.settings.appIcon;
  APP.settings.brandLogo=null;
  APP.settings.appIcon=null;  // revert PWA/app icon to the bundled default too
  scheduleSave();
  if(typeof deleteAssetIfUnused==='function'){deleteAssetIfUnused(prev);if(prevIcon)deleteAssetIfUnused(prevIcon);}
  var crest=document.getElementById('topbar-crest');
  if(crest){
    crest.innerHTML='<img src="'+MEADOS_LOGO+'" alt="MeadOS">';
  }
  renderMain();
  toast('Brand logo reverted');
}

// Returns the URL to use as <img src> for the brand logo. Prefers the user's
// custom logo (APP.settings.brandLogo) — data URL, media-source ID, or direct
// URL — falling back to the bundled MEADOS_LOGO when none is set or the
// media-source ID hasn't yet been resolved.
function getBrandLogoSrc(){
  var custom=(APP.settings&&APP.settings.brandLogo)||null;
  if(custom&&typeof getResolvedMediaUrl==='function'){
    var resolved=getResolvedMediaUrl(custom);
    if(resolved)return resolved;
  }
  return(typeof MEADOS_LOGO!=='undefined')?MEADOS_LOGO:'';
}
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
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:600px">'
    +'<div class="modal-title">🔬 FERMENTATION DIAGNOSIS</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'
    +'<div style="padding:10px;background:var(--bg3);border-radius:var(--radius);text-align:center"><div style="font-family:var(--font-display);font-size:20px;color:var(--gold2)">'+d.daysSinceStart+'</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">DAYS</div></div>'
    +'<div style="padding:10px;background:var(--bg3);border-radius:var(--radius);text-align:center"><div style="font-family:var(--font-display);font-size:20px;color:var(--gold2)">'+(d.attenuation*100).toFixed(0)+'%</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">ATTENUATION</div></div>'
    +'<div style="padding:10px;background:var(--bg3);border-radius:var(--radius);text-align:center"><div style="font-family:var(--font-display);font-size:20px;color:var(--gold2)">'+d.currentAbv.toFixed(1)+'%</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">ABV</div></div>'
    +'</div>'
    +(diagHtml||'<div style="padding:12px;background:var(--bg4);border-radius:var(--radius);color:var(--text3);font-style:italic">No diagnostic findings — fermentation may be proceeding normally.</div>')
    +actionHtml
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>'
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
    return'<tr style="cursor:pointer" onclick="showView(\'batch\',\''+d.batch.id+'\')">'
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
      var recipe=APP.recipes.find(function(r){return r.id===t.recipeId;});
      var ccy=APP.settings.currency||'€';
      return'<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:var(--radius);margin-bottom:8px;flex-wrap:wrap">'
        +'<div style="flex:1;min-width:240px"><div style="font-family:var(--font-display);font-size:14px;color:var(--gold2)">'+escHtml(t.name)+'</div>'
        +'<div style="font-size:12px;color:var(--text3);font-family:var(--font-mono);margin-top:2px">'
        +(recipe?escHtml(recipe.name):'Unknown recipe')+' · '+(t.volume||'?')+'L · OG '+(t.og||'?')+(t.honeyType?' · '+escHtml(t.honeyType):'')+(t.yeast?' · '+escHtml((getYeastById(t.yeast)||{}).name||'').split('—')[0].trim():'')
        +(t.costPerLitre?' · '+ccy+t.costPerLitre.toFixed(2)+'/L':'')
        +'</div></div>'
        +'<div style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" onclick="applyTemplate(\''+t.id+'\')">Apply</button>'
        +'<button class="btn btn-danger btn-sm" onclick="deleteTemplate(\''+t.id+'\')">✕</button></div>'
        +'</div>';
    }).join('')
    +'</div>';
}

// ==================== RECIPE SCALING WIZARD ====================
function openRecipeScalingWizard(recipeId){
  closeModal();
  var r=APP.recipes.find(function(x){return x.id===recipeId;});
  if(!r){toast('⚠ Recipe not found');return;}
  var defaultVol=r.volume||5;
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:560px">'
    +'<div class="modal-title">📐 SCALE RECIPE</div>'
    +'<div style="font-size:13px;color:var(--text2);margin-bottom:14px"><strong>'+escHtml(r.name)+'</strong> is designed for <strong>'+defaultVol+'L</strong>. Enter your target volume to scale all ingredients proportionally.</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Original Volume (L)</label><input class="form-input" id="rs-orig" type="number" value="'+defaultVol+'" step="0.1" disabled style="opacity:0.7"></div>'
    +'<div class="form-group"><label class="form-label">Target Volume (L)</label><input class="form-input" id="rs-target" type="number" value="'+defaultVol+'" step="0.1" oninput="updateRecipeScaling(\''+recipeId+'\')" autofocus></div></div>'
    +'<div id="rs-output" style="margin-top:10px"></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
    +'<button class="btn btn-primary" onclick="startScaledBatch(\''+recipeId+'\')">Start Batch with This Scaling</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  updateRecipeScaling(recipeId);
}

function updateRecipeScaling(recipeId){
  var r=APP.recipes.find(function(x){return x.id===recipeId;});
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
  return'<button class="btn btn-secondary btn-sm" onclick="openRecipeScalingWizard(\''+recipeId+'\')">📐 Scale to Volume</button>';
}
// ==================== PUBLIC BATCH URL SHARING ====================
// Strategy: the QR encodes a SHORT URL with just the batch ID.
// When the recipient opens it, MeadOS loads the live data from the server
// and renders a static read-only "share" page — no sidebar, no nav, no
// modify UI.
//
// Why this approach: the alternative (encoding the full snapshot in the URL
// hash) blows up the QR to an unscannable density. By loading live data, we
// keep the QR small AND get always-current age/gravity/tasting info.
//
// Access model: anyone who can reach the MeadOS server can read its data.
// The standalone share view has no UI for editing, so casual recipients
// can't change anything.

// Base URL used for every generated link (share links, QR codes, the HA
// companion card). Defaults to wherever the app is currently being browsed,
// but Settings → Public URL overrides it — essential behind a reverse proxy,
// where the address YOU browse on (LAN IP) isn't the address recipients can
// reach. The override is stored in the shared blob so every device generates
// identical links.
function appBaseUrl(){
  var ext=((APP.settings&&APP.settings.externalUrl)||'').trim();
  if(ext)return ext.replace(/\/+$/,'')+'/';
  return window.location.origin+window.location.pathname.replace(/index\.html$/,'');
}

// Mint (or reuse) an unguessable share token for a batch. Tokens are stored in
// APP.shareTokens {token:batchId} and ride the state blob. One stable token per
// batch so re-copying a link doesn't spawn duplicates. ~128 bits of entropy.
function shareTokenForBatch(batchId){
  if(!APP.shareTokens||typeof APP.shareTokens!=='object')APP.shareTokens={};
  // Reuse an existing token for this batch if one was already minted.
  var existing=Object.keys(APP.shareTokens).find(function(t){return APP.shareTokens[t]===batchId;});
  if(existing)return existing;
  var tok='';
  try{
    var arr=new Uint8Array(16);(window.crypto||window.msCrypto).getRandomValues(arr);
    tok=Array.prototype.map.call(arr,function(x){return('0'+x.toString(16)).slice(-2);}).join('');
  }catch(e){
    tok=(Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).slice(0,32);
  }
  APP.shareTokens[tok]=batchId;
  // Persist the new token so the link resolves on the server. Never write from
  // a guest's share-mode page (it has no business saving state).
  if(!APP._shareMode&&typeof scheduleSave==='function')scheduleSave();
  return tok;
}

function buildShareURL(batch){
  if(!batch||!batch.id)return null;
  var base=appBaseUrl();
  // Tokenised path form: /share/<token>. The token resolves server-side to a
  // single sanitized batch — no serial or internal id is exposed in the URL,
  // and a leaked link reveals only that one batch. The /share path is exempt
  // from the external-access password so guests never hit a login prompt.
  var tok=shareTokenForBatch(batch.id);
  return base+'share/'+tok;
}

// Food pairing heuristic based on sweetness + style category + ABV
function suggestFoodPairings(s){
  var pairings=[];
  var sw=s.sw||s.sweetness||'';
  var cat=s.cat||s.category||'';
  var abv=s.abv||0;
  if(sw==='Bone Dry'||sw==='Dry'){
    pairings.push('Aged cheeses (gouda, manchego, parmesan)');
    pairings.push('Charcuterie boards — saucisson, prosciutto, jamón');
    pairings.push('Grilled or roasted meats');
  }else if(sw==='Off-Dry'||sw==='Semi-Sweet'){
    pairings.push('Soft cheeses (brie, camembert)');
    pairings.push('Spicy Asian dishes — Thai curry, Korean BBQ');
    pairings.push('Mild creamy sauces over poultry');
  }else if(sw==='Sweet'||sw==='Dessert'){
    pairings.push('Blue cheeses (roquefort, gorgonzola, stilton)');
    pairings.push('Fruit-based desserts — tarte tatin, fruit pies');
    pairings.push('Dark chocolate and chocolate-based desserts');
    pairings.push('Foie gras and rich pâtés');
  }
  if(cat==='Bochet')pairings.push('Caramel desserts, crème brûlée, vanilla ice cream');
  if(cat==='Cyser')pairings.push('Pork dishes, especially with apples or root vegetables');
  if(cat==='Pyment')pairings.push('Match its body to the dish like a wine');
  if(cat==='Melomel')pairings.push('Same fruit desserts especially');
  if(cat==='Metheglin')pairings.push('Mulled cider season — spiced cookies, gingerbread');
  if(cat==='Braggot')pairings.push('Pub fare — sausages, hearty stews, smoked meats');
  if(cat==='Specialty')pairings.push('Match the dominant flavor (chili → spicy, coffee → desserts)');
  if(abv>=13)pairings.push('Sipped on its own — treat like a digestif');
  return pairings.slice(0,5);
}

// Copy share URL for a batch to clipboard
async function copyShareLink(batchId){
  var b=APP.batches.find(function(x){return x.id===batchId;});
  if(!b){toast('⚠ Batch not found');return;}
  var url=buildShareURL(b);
  if(!url){toast('⚠ Failed to build share link');return;}
  // Make sure the freshly-minted token is on the server BEFORE handing out the
  // link, otherwise the recipient could 404 on a token the server hasn't seen.
  try{if(typeof saveData==='function')await saveData();}catch(e){}
  try{
    navigator.clipboard.writeText(url);
    toast('✦ Share link copied');
  }catch(e){
    window.prompt('Copy this share link:',url);
  }
}

// Render the standalone read-only share page for a batch.
// REPLACES the entire <body> — no sidebar, no topbar, no app shell.
// Operates on the live batch object from APP state, so age/gravity/tastings
// are always current as of page load.
// ===== Public share view — extra info sections =====
// Honey weight for the bee fun-fact: prefer the batch's logged kg, else parse
// the recipe's honey ingredient line ("1.7 kg").
function shareHoneyKg(b,recipe){
  if(b&&typeof b.honey==='number'&&b.honey>0)return b.honey;
  if(recipe&&recipe.ingredients){
    for(var i=0;i<recipe.ingredients.length;i++){
      var it=recipe.ingredients[i];
      if(/honey/i.test(it.item||'')){
        var m=String(it.amount||'').match(/([\d.]+)\s*kg/i);
        if(m)return parseFloat(m[1]);
      }
    }
  }
  return 0;
}

function renderShareIngredients(b,recipe){
  var ing=(recipe&&recipe.ingredients)||[];
  var adds=(APP.additions&&APP.additions[b.id])||[];
  if(!ing.length&&!adds.length)return'';
  var rows=ing.map(function(it){
    var item=it.item||'';
    // Reflect the batch's actual honey variety on the honey line.
    if(b.honeyType&&/honey\s*$/i.test(item)&&item.toLowerCase().indexOf(String(b.honeyType).toLowerCase())<0){
      item=b.honeyType+' Honey';
    }
    // Reflect the batch's actual yeast strain on the yeast line.
    if(b.yeast&&/yeast\s*$/i.test(item)&&typeof getYeastById==='function'){
      var yn=yeastShortName(getYeastById(b.yeast));
      if(yn&&item.toLowerCase().indexOf(yn.toLowerCase())<0)item=yn+' Yeast';
    }
    return'<li><span class="ing-item">'+escHtml(item)+'</span>'+(it.amount?'<span class="ing-amt">'+escHtml(it.amount)+'</span>':'')+'</li>';
  }).join('');
  // The batch's own logged additions (fruit, spices, oak, etc.) — what actually
  // went into THIS batch beyond the base recipe. Removed items are still shown
  // (they shaped the mead), flagged so the reader knows they're no longer in it.
  rows+=adds.map(function(a){
    var label=(a.item||'addition')+(a.removedDate?' · removed':'');
    return'<li><span class="ing-item">'+escHtml(label)+'</span>'+(a.amount?'<span class="ing-amt">'+escHtml(a.amount)+'</span>':'')+'</li>';
  }).join('');
  return'<section class="section"><div class="section-title">What’s Inside</div>'
    +'<ul class="share-ingredients">'+rows+'</ul>'
    +'<div class="ing-note">Honey, water and yeast are the heart of every mead — the nutrients and finishing aids are consumed during fermentation or settle out, leaving no meaningful trace in the glass.</div>'
    +'</section>';
}

// Scan ingredients + style for the allergens that actually apply to mead.
function shareDietaryData(b,recipe){
  var ing=(recipe&&recipe.ingredients)||[];
  var adds=(APP.additions&&APP.additions[b.id])||[];
  var hay=(ing.map(function(i){return(i.item||'')+' '+(i.notes||'');}).join(' ')+' '
    +adds.map(function(a){return(a.item||'')+' '+(a.notes||'');}).join(' ')+' '
    +(b.honeyType||'')+' '+((recipe&&recipe.category)||'')+' '+((recipe&&recipe.name)||'')+' '
    +((recipe&&recipe.style)||'')+' '+(b.name||'')).toLowerCase();
  var contains=[];
  var gluten=/\bmalt|barley|\bwheat|braggot|\bdme\b|\brye\b|\bgrain/.test(hay);
  if(/almond|walnut|pecan|hazelnut|cashew|pistachio|chestnut|\bnut\b|praline|marzipan/.test(hay))contains.push({k:'tree nuts',d:'used as an ingredient'});
  if(/\bmilk\b|cream|lactose|\bwhey\b|\bdairy/.test(hay))contains.push({k:'milk',d:'a dairy ingredient is used'});
  if(/\begg|albumen|isinglass/.test(hay))contains.push({k:'egg or fish',d:'a possible fining agent'});
  var sulfites=/metabisul|campden|k-?meta|sulph?ite|\bso2\b|sorbate/.test(hay);
  return{contains:contains,sulfites:sulfites,gluten:gluten};
}

function renderShareDietary(b,recipe,bot){
  if(!recipe)return'';
  var d=shareDietaryData(b,recipe);
  function badge(txt,tone){
    var c=tone==='good'?'#7cc87c':tone==='warn'?'#e8a050':'#c9a84c';
    return'<span class="diet-badge" style="color:'+c+';border-color:'+c+'55;background:'+c+'14">'+escHtml(txt)+'</span>';
  }
  var badges=[];
  if(bot.abv)badges.push(badge(bot.abv.toFixed(1)+'% alcohol','warn'));
  badges.push(d.gluten?badge('Contains gluten','warn'):badge('Gluten-free','good'));
  badges.push(badge('Vegetarian','good'));
  badges.push(badge('Not vegan · honey','base'));
  var lines=[];
  lines.push(d.sulfites?'<strong>Contains sulfites</strong> — added as an antioxidant and stabiliser.':'<strong>No sulfites added</strong> — though fermentation itself can leave trace amounts.');
  d.contains.forEach(function(c){lines.push('<strong>Contains '+escHtml(c.k)+'</strong> — '+escHtml(c.d)+'.');});
  if(!d.gluten)lines.push('<strong>Naturally gluten-free</strong> — mead is fermented from honey, not grain.');
  return'<section class="section"><div class="section-title">Allergens &amp; Dietary</div>'
    +'<div class="diet-badges">'+badges.join('')+'</div>'
    +'<ul class="allergen-list">'+lines.map(function(l){return'<li>'+l+'</li>';}).join('')+'</ul>'
    +'<div class="ing-note">Homemade — not produced in an allergen-controlled facility. Contains alcohol; not for anyone under legal drinking age, pregnant, or avoiding alcohol.</div>'
    +'</section>';
}

// Public photo journal on the share page — a gallery of the batch's photos
// (oldest → newest), each opening the same lightbox the app uses. Only the
// whitelisted /labels/ asset URLs ship in the share payload.
function renderSharePhotos(b){
  var photos=(APP.photos&&APP.photos[b.id])||[];
  if(!photos.length)return'';
  var sorted=photos.slice().sort(function(a,c){return(a.date||'').localeCompare(c.date||'');});
  var thumbs=sorted.map(function(p){
    var st=(typeof photoStage==='function')?photoStage(p.stage):{label:'',color:'#c9a84c'};
    var src=(typeof getResolvedMediaUrl==='function'&&getResolvedMediaUrl(p.url))||p.url;
    return'<figure class="share-photo" onclick="openPhotoLightbox(\''+b.id+'\',\''+p.id+'\')">'
      +'<span class="share-photo-stage" style="background:'+st.color+'">'+escHtml((st.label||'').toUpperCase())+'</span>'
      +'<img src="'+escHtml(src)+'" alt="'+escHtml(p.caption||st.label||'Batch photo')+'" loading="lazy">'
      +(p.caption?'<figcaption>'+escHtml(p.caption)+'</figcaption>':'')
      +'</figure>';
  }).join('');
  return'<section class="section"><div class="section-title">Photo Journal</div><div class="share-gallery">'+thumbs+'</div></section>';
}

function renderShareFunFacts(b,recipe,bot,ageDays){
  var cat=(recipe&&recipe.category)||'';
  var style=(recipe&&recipe.style)||'';
  var f=[];
  var meaning={
    Bochet:'A bochet is made from honey caramelised before fermenting — that’s where its toffee, marshmallow and dark-chocolate notes come from.',
    Cyser:'A cyser is a mead fermented with apples or apple juice — a honey-and-orchard hybrid.',
    Pyment:'A pyment is a mead made with grapes or grape juice — the point where mead and wine meet.',
    Melomel:'A melomel is simply a mead made with fruit; the name covers everything from berry to stone-fruit meads.',
    Metheglin:'A metheglin is a spiced or herbed mead — the word shares a root with “medicine”, as these were once brewed as tonics.',
    Braggot:'A braggot is an ancient mead-and-ale hybrid, brewed with both honey and malt.',
    Acerglyn:'An acerglyn is a mead made with maple syrup alongside the honey.',
    Sack:'A “sack” mead is a deliberately strong, sweet style, traditionally aged for years before drinking.'
  };
  // Recipes carry the style word in either `category` or `style`.
  var styleFact=meaning[cat]||meaning[style];
  if(styleFact)f.push(styleFact);
  else if(/show|traditional/i.test(style+' '+cat))f.push('A “show mead” (or traditional) contains nothing but honey, water and yeast — it’s judged purely on the character of the honey, with nowhere to hide.');
  f.push('Mead is widely considered humanity’s oldest fermented drink — residue on pottery in northern China dates a honey-based brew to roughly 7000 BCE, predating both wine and beer.');
  var kg=shareHoneyKg(b,recipe);
  if(kg>0){
    var flowers=Math.round(kg*4.4);
    var km=Math.round(kg*120000/1000)*1000;
    var laps=(kg*120000/40075).toFixed(1);
    var kgStr=(kg%1===0)?String(kg):kg.toFixed(1);
    f.push('The '+kgStr+' kg of honey in this batch took bees roughly '+flowers+' million flower visits to gather — about '+km.toLocaleString()+' km of flight, the equivalent of circling the Earth around '+laps+' times.');
  }
  if(bot.abv){
    var a=bot.abv;
    var ctx=a>=14?'stronger than most wine':a>=11?'right in wine territory':a>=8?'between a strong beer and a light wine':'around the strength of a beer';
    f.push('At '+a.toFixed(1)+'% ABV this mead is '+ctx+'. Honey has no vintage: the very same honey can ferment bone-dry or lusciously sweet depending only on the yeast and the brewer.');
  }
  var hp=(typeof HONEY_PROFILES!=='undefined'&&b.honeyType)?HONEY_PROFILES[b.honeyType]:null;
  var honeyHistory=hp&&((hp.details&&hp.details.history)||hp.history);
  if(honeyHistory){
    var first=String(honeyHistory).split('. ')[0];
    if(first)f.push(escHtmlStrip(b.honeyType)+' honey: '+first+'.');
  }
  f.push('The word “honeymoon” may trace back to mead — a tradition of newlyweds drinking honey wine for one moon (a month) after the wedding to bless the union.');
  if(!f.length)return'';
  return'<section class="section"><div class="section-title">Fun Facts</div><ul class="facts-list">'+f.map(function(x){return'<li>'+escHtml(x)+'</li>';}).join('')+'</ul></section>';
}
// Tiny helper: strip any stray markup from a label before re-escaping in context.
function escHtmlStrip(s){return String(s||'').replace(/<[^>]*>/g,'');}

function renderPublicShareView(b){
  if(!b||!b.id){
    document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;color:#888;background:#1a0f08;font-size:18px;padding:20px;text-align:center">This batch was not found.</div>';
    return;
  }
  var bot=APP.bottling[b.id]||{};
  var recipe=APP.recipes.find(function(r){return r.id===b.recipeId;});
  var tastings=APP.tastings[b.id]||[];
  var logs=APP.logs[b.id]||[];
  var avgRating=tastings.length
    ?tastings.reduce(function(s,t){return s+(t.rating||0);},0)/tastings.length
    :0;
  var ageDays=bot.date?Math.floor((new Date()-new Date(bot.date))/86400000):0;
  var brewerName=(APP.settings&&APP.settings.brewerName)||'MeadOS';
  var recipeName=recipe?recipe.name:(b.style||'');
  if(recipeName.indexOf('·')>0)recipeName=recipeName.split('·')[0].trim();

  // Aging window
  var minDays=recipe?(recipe.minAgeDays||30):30;
  var peakDays=recipe?(recipe.peakAgeDays||180):180;
  var maxDays=recipe?(recipe.maxAgeDays||peakDays*3):peakDays*3;

  // Gravity chart data: build a list of [days_from_start, gravity]
  var startDate=b.startDate?new Date(b.startDate):null;
  var chartData=[];
  if(startDate){
    if(b.og)chartData.push([0,b.og]);
    logs.filter(function(l){return l.gravity;}).sort(function(a,b){return a.date.localeCompare(b.date);}).forEach(function(l){
      var d=Math.floor((new Date(l.date)-startDate)/86400000);
      if(d>0&&!chartData.some(function(p){return p[0]===d;})){
        chartData.push([d,l.gravity]);
      }
    });
    if(bot.fg&&bot.date){
      var bdDays=Math.floor((new Date(bot.date)-startDate)/86400000);
      if(!chartData.some(function(p){return p[0]===bdDays;})){
        chartData.push([bdDays,bot.fg]);
      }
    }
  }

  // Most recent tasting note (with full notes, not truncated)
  var lastTasting=null;
  if(tastings.length){
    var sortedT=tastings.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
    lastTasting=sortedT[0];
  }

  // Food pairings
  var pairings=suggestFoodPairings({sw:bot.sweetness,cat:recipe?recipe.category:'',abv:bot.abv});

  // Build the sections
  var agingHtml=renderShareAgingTimeline(ageDays,minDays,peakDays,maxDays);
  var gravityHtml=renderShareGravityChart(chartData,b.og);
  var tastingHtml=renderShareTastingNotes(lastTasting);
  var ingredientsHtml=renderShareIngredients(b,recipe);
  var allergensHtml=renderShareDietary(b,recipe,bot);
  var photosHtml=renderSharePhotos(b);
  var factsHtml=renderShareFunFacts(b,recipe,bot,ageDays);

  var html=''
    +'<style>'
    +'*{box-sizing:border-box}'
    // The main-app stylesheet sets html,body{height:100%;overflow:hidden} for the
    // grid layout. Override here so the share page can scroll naturally.
    +'html,body{height:auto!important;overflow:auto!important;overflow-x:hidden}'
    +'body{margin:0;padding:0;background:linear-gradient(180deg,#1a0f08,#2a1810 40%,#1f1408);color:#e0d6b8;font-family:"EB Garamond",Georgia,"Times New Roman",serif;min-height:100vh;line-height:1.5;-webkit-font-smoothing:antialiased}'
    // Faint honeycomb texture over the page gradient — fixed so it doesn't
    // scroll, pointer-events off so it never eats clicks.
    +'body:before{content:"";position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2756%27 height=%27100%27%3E%3Cpath d=%27M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100%27 fill=%27none%27 stroke=%27%23c9a84c%27 stroke-width=%271%27/%3E%3Cpath d=%27M28 0L28 34L0 50L0 84L28 100L56 84L56 50%27 fill=%27none%27 stroke=%27%23c9a84c%27 stroke-width=%271%27/%3E%3C/svg%3E");background-size:56px 100px;opacity:0.045;pointer-events:none;z-index:0}'
    +'.share-container{position:relative;z-index:1;max-width:600px;margin:22px auto;padding:38px 26px 46px;border:1px solid rgba(201,168,76,0.30);border-radius:8px;background:rgba(22,12,5,0.72);box-shadow:inset 0 0 0 3px rgba(26,15,8,0.95),inset 0 0 0 4px rgba(201,168,76,0.16),0 20px 60px rgba(0,0,0,0.5)}'
    +'.share-container:before{content:"❦";position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#1f1207;padding:0 12px;color:var(--gold);font-size:15px;line-height:1.5}'
    +'.share-header{text-align:center;padding:10px 0 26px;border-bottom:1px solid rgba(201,168,76,0.25)}'
    +'.brewed-by{font-family:"Cinzel","EB Garamond",serif;font-size:11px;color:var(--gold);letter-spacing:4px;margin-bottom:10px;text-transform:uppercase}'
    +'.brewer-name{font-family:"Cinzel","Times New Roman",serif;font-size:24px;color:#e8c878;letter-spacing:1px;line-height:1.2}'
    +'.batch-card{padding:28px 0 18px;text-align:center}'
    +'.batch-name{font-family:"Cinzel","Times New Roman",serif;font-size:34px;color:#e8c878;line-height:1.15;margin-bottom:6px;letter-spacing:0.5px}'
    +'.batch-style{font-style:italic;font-size:14px;color:#a0937a;letter-spacing:1.5px;margin-bottom:22px}'
    +'.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}'
    +'.stat{padding:14px 6px;background:linear-gradient(180deg,rgba(201,168,76,0.12),rgba(201,168,76,0.03));border:1px solid rgba(201,168,76,0.28);border-radius:6px;position:relative;overflow:hidden}'
    +'.stat:before{content:"";position:absolute;top:0;left:18%;right:18%;height:1px;background:linear-gradient(90deg,transparent,#e8c878,transparent)}'
    +'.stat-val{font-family:"Cinzel","Times New Roman",serif;font-size:22px;color:#e8c878;line-height:1.1}'
    +'.stat-lbl{font-family:"Cinzel",serif;font-size:9px;color:#8a7d68;letter-spacing:2px;margin-top:5px;text-transform:uppercase}'
    +'.meta-line{color:#a0937a;font-size:14px;margin:6px 0}'
    +'.meta-line strong{color:var(--gold);font-weight:500}'
    +'.section{margin-top:26px}'
    +'.section-title{display:flex;align-items:center;gap:14px;justify-content:center;text-align:center;font-family:"Cinzel",serif;font-size:11px;color:var(--gold);letter-spacing:3.5px;margin-bottom:16px;text-transform:uppercase}'
    +'.section-title:before,.section-title:after{content:"";height:1px;flex:1;min-width:20px}'
    +'.section-title:before{background:linear-gradient(90deg,transparent,rgba(201,168,76,0.45))}'
    +'.section-title:after{background:linear-gradient(90deg,rgba(201,168,76,0.45),transparent)}'
    +'.share-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px}'
    +'.share-photo{position:relative;margin:0;cursor:pointer;border:1px solid rgba(201,168,76,0.28);border-radius:5px;overflow:hidden;background:rgba(0,0,0,0.28);transition:border-color .2s}'
    +'.share-photo:hover{border-color:rgba(201,168,76,0.6)}'
    +'.share-photo img{width:100%;height:108px;object-fit:cover;display:block}'
    +'.share-photo-stage{position:absolute;top:6px;left:6px;font-family:ui-monospace,Menlo,monospace;font-size:8px;letter-spacing:1px;padding:2px 6px;border-radius:7px;color:#1a0f08}'
    +'.share-photo figcaption{font-size:10.5px;color:#b8a87d;padding:5px 8px;line-height:1.35}'
    +'.share-chart-wrap{padding:16px 14px;background:rgba(0,0,0,0.18);border-radius:6px;border:1px solid rgba(201,168,76,0.1)}'
    // Thin horizontal aging bar — matches MeadOS .aging-bar-bg/.aging-bar-fill style
    +'.dw-wrap{padding:22px 18px 18px}'
    +'.dw-headline{display:flex;align-items:center;justify-content:center;gap:9px;font-family:"Cinzel",serif;font-size:16.5px;letter-spacing:0.4px}'
    +'.dw-icon{font-size:17px}'
    +'.dw-sub{text-align:center;font-size:12.5px;color:#a99a80;font-style:italic;margin:8px auto 22px;line-height:1.55;max-width:34em}'
    +'.dw-track{position:relative;height:20px;margin:0 7px}'
    +'.dw-rail{position:absolute;top:8px;left:0;right:0;height:5px;border-radius:3px;background:rgba(0,0,0,0.55);border:1px solid rgba(201,168,76,0.12)}'
    +'.dw-fill{position:absolute;top:8px;left:0;height:5px;border-radius:3px;box-shadow:0 0 8px rgba(201,168,76,0.25);transition:width .8s ease}'
    +'.dw-tick{position:absolute;top:4px;width:2px;height:13px;background:rgba(232,200,120,0.55);border-radius:1px;transform:translateX(-1px)}'
    +'.dw-now{position:absolute;top:1px;transform:translateX(-50%)}'
    +'.dw-now-dot{display:block;width:13px;height:13px;border-radius:50%;border:2px solid #1f1408}'
    +'.dw-milestones{display:flex;justify-content:space-between;gap:8px;margin-top:18px}'
    +'.dw-ms{flex:1;text-align:center;padding:9px 4px;border-radius:7px;border:1px solid rgba(201,168,76,0.12);background:rgba(0,0,0,0.16);transition:border-color .3s,background .3s}'
    +'.dw-ms-on{border-color:rgba(201,168,76,0.5);background:rgba(201,168,76,0.1)}'
    +'.dw-ms-v{display:block;font-family:"Cinzel",serif;font-size:14px;color:#e8c878}'
    +'.dw-ms-k{display:block;font-family:ui-monospace,Menlo,monospace;font-size:8.5px;color:#8a7d68;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px}'
    +'.tasting-quote{background:rgba(201,168,76,0.06);border-left:3px solid var(--gold);padding:16px 18px;border-radius:0 6px 6px 0}'
    +'.tasting-quote .q{font-style:italic;color:#e0d6b8;font-size:15px;line-height:1.6}'
    +'.tasting-quote .attrib{margin-top:10px;font-size:11px;color:#8a7d68;font-family:"Cinzel",serif;letter-spacing:1.5px}'
    +'.pairings ul{padding-left:22px;line-height:1.85;margin:0}'
    +'.pairings li{margin-bottom:6px;color:#c9b990}'
    +'.share-ingredients{list-style:none;padding:0;margin:0}'
    +'.share-ingredients li{display:flex;justify-content:space-between;gap:14px;padding:9px 2px;border-bottom:1px solid rgba(201,168,76,0.1)}'
    +'.share-ingredients li:last-child{border-bottom:none}'
    +'.ing-item{color:#e0d6b8}'
    +'.ing-amt{color:var(--gold);font-family:ui-monospace,Menlo,monospace;font-size:13px;white-space:nowrap}'
    +'.ing-note{font-size:12px;color:#8a7d68;font-style:italic;line-height:1.6;margin-top:12px}'
    +'.diet-badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}'
    +'.diet-badge{font-family:"Cinzel",serif;font-size:10px;letter-spacing:1px;padding:5px 11px;border:1px solid;border-radius:20px;text-transform:uppercase;white-space:nowrap}'
    +'.allergen-list{list-style:none;padding:0;margin:0}'
    +'.allergen-list li{padding:6px 0 6px 18px;position:relative;color:#c9b990;font-size:13.5px;line-height:1.55}'
    +'.allergen-list li:before{content:"•";position:absolute;left:2px;color:var(--gold)}'
    +'.allergen-list strong{color:#e0d6b8;font-weight:500}'
    +'.facts-list{list-style:none;padding:0;margin:0}'
    +'.facts-list li{padding:10px 0 10px 26px;position:relative;color:#c9b990;font-size:13.5px;line-height:1.62;border-bottom:1px solid rgba(201,168,76,0.08)}'
    +'.facts-list li:last-child{border-bottom:none}'
    +'.facts-list li:before{content:"❦";position:absolute;left:0;top:9px;color:var(--gold);font-size:13px}'
    +'.footer{margin-top:38px;text-align:center;font-size:10px;color:#5e533f;font-family:"Cinzel",serif;letter-spacing:2.5px;padding-top:18px;border-top:1px solid rgba(201,168,76,0.12)}'
    +'.share-crest{width:200px;height:200px;object-fit:contain;margin:0 auto 18px;display:block;filter:drop-shadow(0 0 28px rgba(201,168,76,0.5))}'
    +'.share-orn{display:flex;align-items:center;gap:14px;color:var(--gold);font-size:14px;margin-top:18px}'
    +'.share-orn:before,.share-orn:after{content:"";height:1px;flex:1}'
    +'.share-orn:before{background:linear-gradient(90deg,transparent,rgba(201,168,76,0.5))}'
    +'.share-orn:after{background:linear-gradient(90deg,rgba(201,168,76,0.5),transparent)}'
    +'.label-frame{width:190px;margin:4px auto 22px;padding:9px;background:linear-gradient(150deg,#2c1a0c,#190f07);border:1px solid rgba(201,168,76,0.35);border-radius:8px;box-shadow:0 14px 34px rgba(0,0,0,0.55),inset 0 0 14px rgba(0,0,0,0.5)}'
    +'.label-frame img{width:100%;display:block;border-radius:4px}'
    +'.batch-desc{font-style:italic;font-size:14px;color:#bfae8a;line-height:1.7;max-width:430px;margin:0 auto 22px}'
    +'.seal{width:90px;height:90px;border-radius:50%;margin:6px auto 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:1px solid rgba(201,168,76,0.55);box-shadow:inset 0 0 0 3px #1a0f08,inset 0 0 0 4px rgba(201,168,76,0.3),0 6px 16px rgba(0,0,0,0.45);background:radial-gradient(circle at 35% 28%,#3a2410,#231304 70%)}'
    +'.seal .s1{font-family:"Cinzel",serif;font-size:8px;color:var(--gold);letter-spacing:2.5px}'
    +'.seal .s2{font-family:"Cinzel",serif;font-size:14px;color:#e8c878;letter-spacing:1px}'
    +'.footer-orn{color:var(--gold);font-size:14px;margin-bottom:8px;letter-spacing:8px}'
    +'.footer-tag{margin-top:7px;font-style:italic;font-family:"EB Garamond",Georgia,serif;font-size:11px;color:#8a7d68;letter-spacing:1px;text-transform:none}'
    +'@media (max-width:480px){'
    +'  .share-container{margin:10px;padding:28px 14px 40px}'
    +'  .label-frame{width:150px}'
    +'  .share-crest{width:150px;height:150px}'
    +'  .batch-name{font-size:26px}'
    +'  .brewer-name{font-size:20px}'
    +'  .stats{gap:6px}'
    +'  .stat{padding:10px 4px}'
    +'  .stat-val{font-size:18px}'
    +'  .stat-lbl{font-size:8px;letter-spacing:1.5px}'
    +'}'
    +'</style>'
    +'<div class="share-container">'
    +'<header class="share-header">'
    +(function(){
      var lg=(typeof getBrandLogoSrc==='function')?getBrandLogoSrc():'';
      // Only embed directly displayable refs (custom logos are data: URLs;
      // unresolved media-source:// refs would render a broken image).
      return(lg&&/^(data:|https?:|\/)/.test(lg))?'<img class="share-crest" src="'+escHtml(lg)+'" alt="">':'';
    }())
    +'<div class="brewed-by">Brewed by</div>'
    +'<div class="brewer-name">'+escHtml(brewerName)+'</div>'
    +'<div class="share-orn">❦</div>'
    +'</header>'
    +'<section class="batch-card">'
    +(function(){
      // Bottle label, rendered through the SAME path as the Label Maker (art +
      // the recipe's overlay config) so it looks exactly as designed — just with
      // the QR code and drinking-window box suppressed for the public page.
      if(!window._shareLabelImage||typeof renderLabelWithABV!=='function')return'';
      var abvText=(bot&&bot.abv!=null)?String(bot.abv):'';
      return'<div class="label-frame">'+renderLabelWithABV(b.recipeId,abvText,{batch:b,qr:false,bestDrink:false})+'</div>';
    }())
    +'<div class="batch-name">'+escHtml(b.name||'')+'</div>'
    +'<div class="batch-style">'+escHtml(recipeName||'')+(recipe&&recipe.category&&recipe.category!==recipeName?' · '+escHtml(recipe.category):'')+'</div>'
    +(recipe&&recipe.description?'<div class="batch-desc">“'+escHtml(recipe.description)+'”</div>':'')
    +'<div class="stats">'
    +'<div class="stat"><div class="stat-val">'+(bot.abv?bot.abv.toFixed(1)+'%':'—')+'</div><div class="stat-lbl">ABV</div></div>'
    +'<div class="stat"><div class="stat-val">'+escHtml(bot.sweetness||'—')+'</div><div class="stat-lbl">Sweetness</div></div>'
    +'<div class="stat"><div class="stat-val">'+(bot.date?(typeof fmtDurationCompact==='function'?fmtDurationCompact(ageDays):ageDays+'d'):'—')+'</div><div class="stat-lbl">Bottle Age</div></div>'
    +'</div>'
    +(b.honeyType?'<div class="meta-line"><strong>Honey:</strong> '+escHtml(b.honeyType)+'</div>':'')
    +(bot.date?'<div class="meta-line"><strong>Bottled:</strong> '+escHtml(typeof fmtDate==='function'?fmtDate(bot.date):bot.date)+'</div>':'')
    +(avgRating>0&&tastings.length?'<div class="meta-line"><strong>Brewer\'s rating:</strong> '+(Math.round(avgRating*10)/10)+'★ ('+tastings.length+' tasting'+(tastings.length!==1?'s':'')+')</div>':'')
    +(b.serial?'<div class="seal"><div class="s1">BATCH</div><div class="s2">'+escHtml(b.serial)+'</div></div>':'')
    +'</section>'
    +ingredientsHtml
    +allergensHtml
    +agingHtml
    +gravityHtml
    +tastingHtml
    +photosHtml
    +(pairings.length?'<section class="section"><div class="section-title">Suggested Pairings</div><div class="pairings"><ul>'+pairings.map(function(p){return'<li>'+escHtml(p)+'</li>';}).join('')+'</ul></div></section>':'')
    +factsHtml
    +'<footer class="footer"><div class="footer-orn">❦</div>'+escHtml(brewerName)+(bot.date?' · '+escHtml(typeof fmtDate==='function'?fmtDate(bot.date):bot.date):'')+'<div class="footer-tag">Crafted with patience</div></footer>'
    +'</div>';
  document.body.innerHTML=html;
  document.title=(b.name||'Mead')+' · '+brewerName;
}

// Aging timeline: matches the MeadOS .aging-bar style — thin horizontal bar
// with gradient progress fill, vertical line markers at Ready/Peak, label row
// below, status sentence underneath.
function renderShareAgingTimeline(ageDays,minD,peakD,maxD){
  if(ageDays==null||!minD)return'';
  peakD=peakD||(minD*3);
  maxD=maxD||(peakD*2);
  var displayMax=Math.max(maxD,ageDays,1);
  var pct=Math.min(100,(ageDays/displayMax)*100);
  var minPct=(minD/displayMax)*100;
  var peakPct=(peakD/displayMax)*100;
  // Status, colour, gradient + a premium headline/sub by aging position.
  var gradient,statusColor,icon,head,sub;
  if(ageDays<minD){
    gradient='linear-gradient(90deg,#7a5e2a,#c9a84c)';statusColor='#c9a84c';icon='⏳';
    head='Still maturing';sub='About '+fmtDuration(minD-ageDays)+' until it’s ready to pour — patience rewards a mead.';
  }else if(ageDays<peakD){
    gradient='linear-gradient(90deg,#c9a84c,#7cc87c)';statusColor='#7cc87c';icon='✦';
    head='In its drinking window';sub='Lovely to drink now — about '+fmtDuration(peakD-ageDays)+' until its estimated peak.';
  }else if(ageDays<maxD){
    gradient='linear-gradient(90deg,#c9a84c,#7cc87c,#e8a050)';statusColor='#e8a050';icon='★';
    head='At its peak';sub='Right in the sweet spot — flavour will ease gently from here, so enjoy it before too long.';
  }else{
    gradient='linear-gradient(90deg,#c9a84c,#e8a050,#d06060)';statusColor='#d06060';icon='⚜';
    head='Beyond the usual window';sub='Older than the typical window — taste before sharing; a well-kept bottle can still surprise.';
  }
  function on(lo,hi){return ageDays>=lo&&ageDays<hi?' dw-ms-on':'';}
  return'<section class="section"><div class="section-title">Drinking Window</div>'
    +'<div class="share-chart-wrap dw-wrap">'
    +'<div class="dw-headline"><span class="dw-icon" style="color:'+statusColor+'">'+icon+'</span><span style="color:'+statusColor+'">'+escHtml(head)+'</span></div>'
    +'<div class="dw-sub">'+escHtml(sub)+'</div>'
    +'<div class="dw-track">'
    +'<div class="dw-rail"></div>'
    +'<div class="dw-fill" style="width:'+pct.toFixed(1)+'%;background:'+gradient+'"></div>'
    +'<div class="dw-tick" style="left:'+minPct.toFixed(1)+'%"></div>'
    +'<div class="dw-tick" style="left:'+peakPct.toFixed(1)+'%"></div>'
    +'<div class="dw-now" style="left:'+pct.toFixed(1)+'%"><span class="dw-now-dot" style="background:'+statusColor+';box-shadow:0 0 0 3px '+statusColor+'33,0 0 12px '+statusColor+'"></span></div>'
    +'</div>'
    +'<div class="dw-milestones">'
    +'<div class="dw-ms'+on(0,minD)+'"><span class="dw-ms-v">'+fmtDurationCompact(minD)+'</span><span class="dw-ms-k">Ready</span></div>'
    +'<div class="dw-ms'+on(minD,peakD)+'"><span class="dw-ms-v">'+fmtDurationCompact(peakD)+'</span><span class="dw-ms-k">Peak</span></div>'
    +'<div class="dw-ms'+on(peakD,1e12)+'"><span class="dw-ms-v">'+fmtDurationCompact(maxD)+'</span><span class="dw-ms-k">Best by</span></div>'
    +'</div>'
    +'</div></section>';
}

// Compact SVG line chart of the gravity readings, with the estimated ABV drawn
// on a second (right) axis so the ABV rise as gravity falls is visible. Takes an
// array of [days, gravity_float] and the original gravity (for the ABV scale).
function renderShareGravityChart(data,og){
  if(!data||data.length<2)return'';
  var w=440,h=210,padL=46,padR=44,padT=16,padB=28;
  var maxDay=Math.max.apply(null,data.map(function(p){return p[0];}));
  var grav=data.map(function(p){return p[1];});
  var minG=Math.min.apply(null,grav),maxG=Math.max.apply(null,grav);
  // Round to 3 decimals
  minG=Math.floor((minG-0.005)*1000)/1000;
  maxG=Math.ceil((maxG+0.005)*1000)/1000;
  if(maxG-minG<0.030)maxG=minG+0.030;
  // ABV axis (right): 0 → ABV at the lowest gravity, using OG.
  var ogVal=og||(data[0]&&data[0][0]===0?data[0][1]:null);
  var showAbv=!!ogVal&&(ogVal-minG)>0;
  var maxA=showAbv?Math.max(1,Math.ceil((ogVal-minG)*131.25)):0;
  var sx=function(d){return padL+(d/(maxDay||1))*(w-padL-padR);};
  var sy=function(g){return padT+((maxG-g)/(maxG-minG))*(h-padT-padB);};
  var ay=function(a){return padT+((maxA-a)/(maxA||1))*(h-padT-padB);};
  var pathD=data.map(function(p,i){return(i===0?'M':'L')+' '+sx(p[0]).toFixed(1)+' '+sy(p[1]).toFixed(1);}).join(' ');
  var fillD=pathD+' L '+sx(maxDay).toFixed(1)+' '+(h-padB)+' L '+padL+' '+(h-padB)+' Z';
  var dots=data.map(function(p){return'<circle cx="'+sx(p[0]).toFixed(1)+'" cy="'+sy(p[1]).toFixed(1)+'" r="3.5" fill="#e8c878" stroke="#1f1408" stroke-width="1.5"/>';}).join('');
  // ABV line + dots + right-axis %
  var abvPath='',abvDots='',abvLabels='';
  if(showAbv){
    abvPath='<path d="'+data.map(function(p,i){var a=(ogVal-p[1])*131.25;return(i===0?'M':'L')+' '+sx(p[0]).toFixed(1)+' '+ay(a).toFixed(1);}).join(' ')+'" stroke="#7cc87c" stroke-width="2" fill="none" stroke-linejoin="round"/>';
    abvDots=data.map(function(p){var a=(ogVal-p[1])*131.25;return'<circle cx="'+sx(p[0]).toFixed(1)+'" cy="'+ay(a).toFixed(1)+'" r="3" fill="#7cc87c" stroke="#1f1408" stroke-width="1.2"/>';}).join('');
    for(var j=0;j<=3;j++){var av=(maxA*j)/3;var yy=ay(av);abvLabels+='<text x="'+(w-padR+6)+'" y="'+(yy+3.5).toFixed(1)+'" font-family="monospace" font-size="9" fill="#7ca87c" text-anchor="start">'+av.toFixed(0)+'%</text>';}
  }
  var yLabels='';
  for(var i=0;i<=3;i++){
    var val=minG+((maxG-minG)*i)/3;
    var y=sy(val);
    yLabels+='<line x1="'+padL+'" y1="'+y.toFixed(1)+'" x2="'+(w-padR)+'" y2="'+y.toFixed(1)+'" stroke="rgba(201,168,76,0.1)" stroke-dasharray="2,3"/>'
      +'<text x="'+(padL-6)+'" y="'+(y+3.5).toFixed(1)+'" font-family="monospace" font-size="9" fill="#8a7d68" text-anchor="end">'+val.toFixed(3)+'</text>';
  }
  var xLabels='';
  var xStep=maxDay>60?Math.ceil(maxDay/4/10)*10:Math.max(1,Math.ceil(maxDay/4));
  for(var d=0;d<=maxDay;d+=xStep){
    xLabels+='<text x="'+sx(d).toFixed(1)+'" y="'+(h-padB+14)+'" font-family="monospace" font-size="9" fill="#8a7d68" text-anchor="middle">'+d+'d</text>';
  }
  return'<section class="section"><div class="section-title">Fermentation Curve</div><div class="share-chart-wrap">'
    // Safari/WebKit collapses SVGs with bare height:auto + no width/height
    // attrs to wrong intrinsic dimensions, which made the chart caption render
    // ON TOP OF the next section title. Belt-and-braces: explicit width/height
    // attributes + aspect-ratio CSS so the browser computes the right box.
    +'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" style="width:100%;max-width:'+w+'px;height:auto;aspect-ratio:'+w+'/'+h+';display:block;margin:0 auto">'
    +yLabels+xLabels+abvLabels
    +'<path d="'+fillD+'" fill="rgba(201,168,76,0.08)"/>'
    +'<path d="'+pathD+'" stroke="#c9a84c" stroke-width="2" fill="none" stroke-linejoin="round"/>'
    +dots
    +abvPath+abvDots
    +'</svg>'
    +'<div style="text-align:center;font-size:10px;color:#8a7d68;letter-spacing:1.5px;margin-top:6px;font-family:Cinzel,serif">'+(showAbv?'<span style="color:#c9a84c">●</span> GRAVITY &nbsp;·&nbsp; <span style="color:#7cc87c">●</span> ABV % &nbsp;·&nbsp; OVER FERMENTATION DAYS':'SPECIFIC GRAVITY OVER FERMENTATION DAYS')+'</div>'
    +'</div></section>';
}

// Tasting Journal — matches MeadOS batch view: date + stars header, radar
// chart + 5-dot bar list if wheel data exists, then color/aroma/flavor/finish/notes.
function renderShareTastingNotes(t){
  if(!t)return'';
  // Build star display
  var stars='';
  for(var i=1;i<=5;i++)stars+='<span style="color:'+(i<=t.rating?'#e8c878':'rgba(201,168,76,0.2)')+';font-size:18px">★</span>';
  // Wheel section
  var wheelSection='';
  if(t.wheel&&typeof TASTING_AXES!=='undefined'&&typeof getTastingWheelRadarHTML==='function'){
    var hasAny=Object.values(t.wheel).some(function(v){return v>0;});
    if(hasAny){
      var bars=TASTING_AXES.filter(function(ax){return t.wheel[ax.key]>0;}).map(function(ax){
        var filled=t.wheel[ax.key];
        return'<div style="display:flex;justify-content:space-between;font-family:ui-monospace,monospace;font-size:11px;color:#a0937a;line-height:1.9"><span>'+ax.label+'</span><span><span style="color:var(--gold)">'+'●'.repeat(filled)+'</span><span style="color:rgba(201,168,76,0.15)">'+'●'.repeat(5-filled)+'</span></span></div>';
      }).join('');
      // Cap the radar's max-width so it doesn't grow huge in narrow grids, and
      // give the inner SVG room to render its labels (which extend past the
      // circle on left/right) without clipping.
      wheelSection='<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:center;margin:14px 0 10px"><div style="max-width:220px;margin:0 auto;width:100%;overflow:visible">'+getTastingWheelRadarHTML(t.wheel)+'</div><div>'+bars+'</div></div>';
    }
  }
  // Optional text fields
  function fieldRow(label,val){return val?'<div style="font-size:13px;color:#c9b990;margin:4px 0"><strong style="color:var(--gold)">'+label+':</strong> '+escHtml(val)+'</div>':'';}
  var fields=fieldRow('Color',t.color)+fieldRow('Aroma',t.aroma)+fieldRow('Flavor',t.flavor)+fieldRow('Finish',t.finish);
  // Notes can be in `notes` or `note` depending on schema vintage
  var notes=t.notes||t.note||'';
  return'<section class="section"><div class="section-title">Tasting Journal</div>'
    +'<div class="tasting-quote">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;flex-wrap:wrap;gap:6px"><div style="font-family:ui-monospace,monospace;font-size:12px;color:#8a7d68">'+escHtml(t.date||'')+'</div><div>'+stars+'</div></div>'
    +wheelSection
    +fields
    +(notes?'<div style="font-style:italic;color:#e0d6b8;font-size:14px;line-height:1.6;margin-top:10px">"'+escHtml(notes)+'"</div>':'')
    +'</div></section>';
}
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
    +'@media print{.print-btn{display:none}html,body{margin:0;padding:0}.card{border:1px solid #1a1208;page-break-inside:avoid;break-inside:avoid}}';

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
    +'<div class="header"><div><div class="brewer">'+escHtml(brand)+'</div><div class="batch-name">'+escHtml(b.name||'Mead')+'</div><div class="recipe-name">'+escHtml(recipe.name)+'</div></div><div style="font-family:Menlo,monospace;font-size:10px;color:#8a6a30;text-align:right">Card printed<br/>'+dateOffset(daysSince(b.startDate))+'</div></div>'
    +'<div>'+leftHtml+'</div>'
    +'<div>'+rightHtml+'</div>'
    +'</div></body></html>';

  w.document.write(html);
  w.document.close();
}
