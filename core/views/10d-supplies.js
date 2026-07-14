// ==========================================================================
// Supplies, supplier rolodex & 'brew again'.
// Split out of the former 10-cellar-supplies.js. Globals, no behaviour change.
// ==========================================================================

// ==================== SUPPLIES VIEW ====================
// Each supply item: {id, name, type, qty, unit, openDate, expiryDate, notes}
var SUPPLY_TYPES=[
  {key:'yeast',label:'Yeast Packets',icon:'✦',unit:'packets',defaultName:"Mangrove Jack's M05"},
  {key:'nutrient',label:'Yeast Nutrient',icon:'⚡',unit:'packets',defaultName:"M.J. Mead Yeast Nutrient"},
  {key:'sanitizer',label:'Sanitizer (no-rinse)',icon:'🧼',unit:'ml',defaultName:''},
  {key:'cleaner',label:'Cleaner (oxygen-based)',icon:'🧴',unit:'g',defaultName:'Chemipro OXI'},
  {key:'sulfite',label:'Potassium Metabisulfite',icon:'🧪',unit:'g',defaultName:'Potassium Metabisulfite'},
  {key:'sorbate',label:'Potassium Sorbate',icon:'🧪',unit:'g',defaultName:'Potassium Sorbate'},
  {key:'pectic',label:'Pectic Enzyme',icon:'🧪',unit:'g',defaultName:'Pectic Enzyme'},
  {key:'bottle750',label:'Bottles · 750 ml',icon:'🍷',unit:'pcs',defaultName:'750 ml bottles'},
  {key:'bottle500',label:'Bottles · 500 ml',icon:'🍶',unit:'pcs',defaultName:'500 ml bottles'},
  {key:'cork',label:'Corks',icon:'🪵',unit:'pcs',defaultName:'Natural corks'},
  {key:'crowncap',label:'Crown Caps',icon:'⭕',unit:'pcs',defaultName:'Crown caps (26mm)'},
  {key:'honey',label:'Honey',icon:'🍯',unit:'kg',defaultName:'Wildflower Honey'},
  {key:'juice',label:'Apple Juice / Must',icon:'🧃',unit:'L',defaultName:'Fresh-Pressed Apple Juice'},
  {key:'other',label:'Other',icon:'📦',unit:'',defaultName:''}
];

function renderSupplies(){
  var items=APP.supplies||[];
  var byType={};
  SUPPLY_TYPES.forEach(function(t){byType[t.key]=[];});
  items.forEach(function(it){
    var k=it.type||'other';
    if(!byType[k])byType[k]=[];
    byType[k].push(it);
  });
  // Compute total inventory value across all supplies that have a price set
  var totalValue=0,pricedCount=0;
  items.forEach(function(it){
    var price=parseFloat(it.pricePerUnit)||0;
    var qty=parseFloat(it.qty)||0;
    if(price>0){totalValue+=price*qty;pricedCount++;}
  });
  var currency=APP.settings.currency||'€';
  var inventoryCard=pricedCount?'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">💰 INVENTORY VALUE</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;text-align:center">'
    +'<div><div style="font-family:var(--font-display);font-size:24px;color:var(--gold2)">'+currency+totalValue.toFixed(2)+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">CURRENT VALUE ON HAND</div></div>'
    +'<div><div style="font-family:var(--font-display);font-size:24px;color:var(--text)">'+pricedCount+'/'+items.length+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">PRICED SUPPLIES</div></div>'
    +'<div><div style="font-family:var(--font-display);font-size:24px;color:var(--text)">'+items.length+'</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);letter-spacing:1.5px;margin-top:2px">TOTAL TRACKED</div></div>'
    +'</div></div>':'';
  var sections=SUPPLY_TYPES.map(function(t){
    var arr=byType[t.key]||[];
    var rows=arr.length?arr.map(function(it){
      var expired=it.expiryDate&&new Date(it.expiryDate)<new Date();
      var low=parseFloat(it.qty)<=0.5;
      var cls=(expired?'expired ':'')+(low?'low':'');
      var price=parseFloat(it.pricePerUnit)||0;
      var qty=parseFloat(it.qty)||0;
      var lineValue=price*qty;
      var priceLine=price>0?'<span style="color:var(--gold2);font-family:var(--font-mono);font-size:11px">'+currency+price.toFixed(2)+'/'+escHtml(it.unit||'unit')+(qty>0?' · '+currency+lineValue.toFixed(2)+' total':'')+'</span>':'';
      return'<div class="supplies-row '+cls+'">'
        +'<div class="qty">'+(it.qty||'0')+'<span style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-left:2px">'+(it.unit||'')+'</span></div>'
        +'<div class="info">'
        +'<div class="name">'+escHtml(it.name)+(it.brand?' <span style="color:var(--text3);font-size:12px;font-style:italic">· '+escHtml(it.brand)+'</span>':'')+'</div>'
        +'<div class="meta">'
        +(it.openDate?'Opened '+fmtDate(it.openDate)+' · ':'')
        +(it.expiryDate?'<span style="color:'+(expired?'var(--red2)':'var(--text3)')+'">Expires '+fmtDate(it.expiryDate)+'</span>':'')
        +(priceLine?(it.openDate||it.expiryDate?' · ':'')+priceLine:'')
        +(it.notes?' · '+escHtml(it.notes):'')
        +'</div></div>'
        +'<div style="display:flex;gap:4px"><button class="cellar-mini-btn" data-action="adjustSupply" data-args=\''+JSON.stringify([it.id,-1])+'\' title="Use one">−</button>'
        +'<button class="cellar-mini-btn" data-action="adjustSupply" data-args=\''+JSON.stringify([it.id,1])+'\' title="Add one">+</button>'
        +'<button class="cellar-mini-btn" data-action="useSupplyAmount" data-args=\''+JSON.stringify([it.id])+'\' title="Use a specific amount">±</button>'
        +'<button class="btn-icon" style="width:26px;height:26px" data-action="openSupplyEditModal" data-args=\''+JSON.stringify([it.id])+'\' title="Edit">✏</button>'
        +'<button class="btn-icon" style="width:26px;height:26px;border-color:var(--red);color:var(--red2)" data-action="deleteSupply" data-args=\''+JSON.stringify([it.id])+'\' title="Delete">🗑</button></div>'
        +'</div>';
    }).join(''):'<div style="font-size:13px;color:var(--text3);font-style:italic;padding:8px 0">None tracked</div>';
    return'<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">'+t.icon+' '+t.label.toUpperCase()+' · '+arr.length+'</div><button class="btn btn-secondary btn-sm" data-action="openSupplyEditModal" data-args=\''+JSON.stringify([null,t.key])+'\'>＋ Add</button></div>'+rows+'</div>';
  }).join('');
  return'<div class="page-title">Supplies</div><div class="page-subtitle">Inventory of yeast, chemicals, and consumables · '+items.length+' tracked · stored in the shared server database</div>'
    +renderShoppingListCard()
    +renderBrewWhatYouHaveCard()
    +inventoryCard
    +sections;
}

// ==================== SUPPLIER ROLODEX ====================
// Lightweight contact-book of beekeepers, mead shops, brewing-supply stores.
// Each entry: name, type (beekeeper/shop/online), location, honey/product
// specialties as a free-text tag list, opening hours / contact, notes, and
// "rating" (1-5 stars) for personal quality ranking.
//
// Cross-linked with the Honey Library: when viewing a honey type, suppliers
// who carry it appear in the sources section.

// Supply categories a supplier can carry — so the rolodex isn't honey-only.
var SUPPLY_CATEGORIES=['Honey','Bottles','Crown caps','Corks','Yeast','Nutrient','Fruit & adjuncts','Spices & herbs','Oak','Acids & chemicals','Equipment','Other'];
function _openHoneyFromSupplier(name){
  currentHoneyName=name;
  showView('honey-detail');
}
function renderSuppliersView(){
  var suppliers=APP.suppliers||[];
  // Sort: rated > unrated, then by name
  suppliers=suppliers.slice().sort(function(a,b){
    if(b.rating!==a.rating)return(b.rating||0)-(a.rating||0);
    return(a.name||'').localeCompare(b.name||'');
  });
  var rows=suppliers.map(function(s){
    var stars=s.rating?'★'.repeat(s.rating)+'<span style="color:var(--bg4)">'+'★'.repeat(5-s.rating)+'</span>':'<span style="color:var(--text3);font-size:11px">unrated</span>';
    var typeBadge='<span style="font-family:var(--font-mono);font-size:9px;color:var(--gold2);background:rgba(232,196,106,0.12);border:1px solid var(--gold2);padding:2px 7px;border-radius:8px;letter-spacing:1px">'+escHtml((s.type||'shop').toUpperCase())+'</span>';
    var honeyTags=(s.honeys||[]).map(function(h){
      var prof=HONEY_PROFILES[h];
      var color=(prof&&prof.color)||'var(--gold)';
      return'<span data-action="_openHoneyFromSupplier" data-args=\''+JSON.stringify([h])+'\' style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-family:var(--font-mono);font-size:9.5px;background:rgba(0,0,0,0.20);color:'+color+';border:1px solid '+color+'66;padding:1px 6px;border-radius:6px;margin:2px 3px 2px 0">'+escHtml(h)+'</span>';
    }).join('');
    var catTags=(s.categories||[]).map(function(c){
      return'<span style="font-family:var(--font-mono);font-size:9px;color:var(--text2);background:var(--bg3);border:1px solid var(--border);padding:1px 7px;border-radius:6px;margin:2px 3px 2px 0;letter-spacing:0.5px">'+escHtml(c)+'</span>';
    }).join('');
    var contactLine=[s.location,s.hours,s.contact,s.url].filter(Boolean).join(' · ');
    return'<div class="card" style="margin-bottom:10px;cursor:default;padding:0;overflow:hidden">'
      +'<div style="display:flex;align-items:stretch">'
      +'<div style="width:4px;background:var(--gold)"></div>'
      +'<div style="flex:1;padding:12px 16px">'
      +'<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
      +'<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><div style="font-family:var(--font-display);font-size:15px;color:var(--gold2)">'+escHtml(s.name)+'</div>'+typeBadge+'<div>'+stars+'</div></div>'
      +'<div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" data-action="openEditSupplierModal" data-args=\''+JSON.stringify([s.id])+'\'>✏</button><button class="btn btn-secondary btn-sm" data-action="deleteSupplier" data-args=\''+JSON.stringify([s.id])+'\' style="color:var(--red2)">✕</button></div>'
      +'</div>'
      +(contactLine?'<div style="font-size:11.5px;color:var(--text3);margin-bottom:6px;font-style:italic">'+escHtml(contactLine)+(s.url?' <a href="'+escHtml(s.url)+'" target="_blank" rel="noopener" style="color:var(--gold2);text-decoration:none;margin-left:4px">↗</a>':'')+'</div>':'')
      +(catTags?'<div style="margin:6px 0">'+catTags+'</div>':'')
      +(honeyTags?'<div style="margin:6px 0">'+honeyTags+'</div>':'')
      +(s.notes?'<div style="font-size:12.5px;color:var(--text2);line-height:1.55;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">'+escHtml(s.notes)+'</div>':'')
      +'</div></div></div>';
  }).join('');
  return'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:8px"><div><div class="page-title" style="margin-bottom:0">Suppliers</div></div>'
    +'<button class="btn btn-primary btn-sm" data-action="openEditSupplierModal">＋ Add Supplier</button>'
    +'</div>'
    +'<div class="page-subtitle">Beekeepers, mead shops, brewing-supply stores · '+suppliers.length+' entries</div>'
    +(suppliers.length
      ?rows
      :'<div class="empty-state"><div class="es-icon">🏪</div><p>No suppliers yet. Add your trusted beekeepers and brewing-supply shops to keep track of where to source each honey type and ingredient.</p></div>');
}

function openEditSupplierModal(id){
  closeModal();
  var s=id?(APP.suppliers||[]).find(function(x){return x.id===id;}):null;
  var isNew=!s;
  if(isNew)s={name:'',type:'shop',location:'',hours:'',contact:'',url:'',rating:0,categories:[],honeys:[],notes:''};
  // Supply-category checkboxes (bottles, caps, yeast, additions, …) — what they sell.
  var catChecks=SUPPLY_CATEGORIES.map(function(c){
    var sel=(s.categories||[]).indexOf(c)>=0;
    return'<label style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;margin:2px 4px 2px 0;cursor:pointer;background:'+(sel?'rgba(232,196,106,0.15)':'var(--bg)')+';border:1px solid '+(sel?'var(--gold)':'var(--border)')+';padding:3px 7px;border-radius:6px;color:'+(sel?'var(--gold2)':'var(--text2)')+'"><input type="checkbox" data-cat="'+escHtml(c)+'" '+(sel?'checked':'')+' style="margin:0;cursor:pointer;accent-color:var(--gold2)">'+escHtml(c)+'</label>';
  }).join('');
  // Pre-build honey-variety checkboxes from HONEY_TYPES (for honey sellers)
  var honeyChecks=HONEY_TYPES.filter(function(h){return h!=='Mixed'&&h!=='Other';}).map(function(h){
    var sel=(s.honeys||[]).indexOf(h)>=0;
    return'<label style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;margin:2px 4px 2px 0;cursor:pointer;background:'+(sel?'rgba(232,196,106,0.15)':'var(--bg)')+';border:1px solid '+(sel?'var(--gold)':'var(--border)')+';padding:3px 7px;border-radius:6px;color:'+(sel?'var(--gold2)':'var(--text2)')+'"><input type="checkbox" data-honey="'+escHtml(h)+'" '+(sel?'checked':'')+' style="margin:0;cursor:pointer;accent-color:var(--gold2)">'+escHtml(h)+'</label>';
  }).join('');
  var html='<div class="modal-overlay"><div class="modal" style="max-width:640px;max-height:92vh;display:flex;flex-direction:column">'
    +'<div class="modal-title">'+(isNew?'＋ ADD SUPPLIER':'✏ EDIT SUPPLIER')+'</div>'
    +'<div style="flex:1;overflow-y:auto;padding-right:4px">'
    +'<div class="form-row"><div class="form-group" style="flex:2"><label class="form-label">Name</label><input class="form-input" id="sup-name" value="'+escHtml(s.name)+'" placeholder="e.g. Local Beekeeper Co / Homebrew Shop / Online Apiary"></div>'
    +'<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="sup-type">'
    +['beekeeper','shop','online','market','other'].map(function(t){return'<option value="'+t+'"'+(s.type===t?' selected':'')+'>'+t+'</option>';}).join('')
    +'</select></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Location</label><input class="form-input" id="sup-location" value="'+escHtml(s.location||'')+'" placeholder="e.g. city / region / online only"></div>'
    +'<div class="form-group"><label class="form-label">Hours / Availability</label><input class="form-input" id="sup-hours" value="'+escHtml(s.hours||'')+'" placeholder="e.g. Sat 9-13 / mail-order"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Contact (phone/email)</label><input class="form-input" id="sup-contact" value="'+escHtml(s.contact||'')+'" placeholder="email or phone"></div>'
    +'<div class="form-group"><label class="form-label">Website</label><input class="form-input" id="sup-url" value="'+escHtml(s.url||'')+'" placeholder="https://…" style="font-family:var(--font-mono);font-size:12px"></div></div>'
    +'<div class="form-group"><label class="form-label">Rating</label><div style="display:flex;gap:4px" id="sup-rating-row">'
    +[1,2,3,4,5].map(function(n){return'<span data-action="_setSupRating" data-args=\''+JSON.stringify([n])+'\' style="font-size:24px;cursor:pointer;color:'+(s.rating>=n?'var(--gold2)':'var(--bg4)')+';transition:color 0.15s" class="sup-star" data-n="'+n+'">★</span>';}).join('')
    +'<input type="hidden" id="sup-rating" value="'+(s.rating||0)+'"></div></div>'
    +'<div class="form-group"><label class="form-label">What they supply <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">click to toggle</span></label><div id="sup-cats" style="line-height:2">'+catChecks+'</div></div>'
    +'<div class="form-group"><label class="form-label">Honey varieties <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px">if they sell honey · click to toggle</span></label><div id="sup-honeys" style="line-height:2">'+honeyChecks+'</div></div>'
    +'<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="sup-notes" placeholder="What\'s the best they sell? Pricing notes? Any quality remarks?" style="min-height:90px">'+escHtml(s.notes||'')+'</textarea></div>'
    +'</div>'
    +'<div class="modal-actions" style="border-top:1px solid var(--border);padding-top:14px;margin-top:14px"><button class="btn btn-secondary" data-action="closeModal">Cancel</button>'
    +'<button class="btn btn-primary" data-action="saveSupplier" data-args=\''+JSON.stringify([isNew?null:s.id])+'\'>'+(isNew?'Add Supplier':'Save')+'</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(function(){var el=document.getElementById('sup-name');if(el&&isNew)el.focus();},50);
}

function renderSupRatingStars(){
  var n=parseInt(document.getElementById('sup-rating').value)||0;
  document.querySelectorAll('.sup-star').forEach(function(el){
    var v=parseInt(el.dataset.n);
    el.style.color=v<=n?'var(--gold2)':'var(--bg4)';
  });
}
function _setSupRating(n){
  document.getElementById('sup-rating').value=n;
  renderSupRatingStars();
}

function saveSupplier(id){
  var honeys=[];
  document.querySelectorAll('#sup-honeys input[type=checkbox]:checked').forEach(function(cb){
    honeys.push(cb.dataset.honey);
  });
  var categories=[];
  document.querySelectorAll('#sup-cats input[type=checkbox]:checked').forEach(function(cb){
    categories.push(cb.dataset.cat);
  });
  var data={
    name:document.getElementById('sup-name').value.trim(),
    type:document.getElementById('sup-type').value,
    categories:categories,
    location:document.getElementById('sup-location').value.trim(),
    hours:document.getElementById('sup-hours').value.trim(),
    contact:document.getElementById('sup-contact').value.trim(),
    url:document.getElementById('sup-url').value.trim(),
    rating:parseInt(document.getElementById('sup-rating').value)||0,
    honeys:honeys,
    notes:document.getElementById('sup-notes').value.trim()
  };
  if(!data.name){toast('⚠ Name required');return;}
  if(!Array.isArray(APP.suppliers))APP.suppliers=[];
  if(id){
    var idx=APP.suppliers.findIndex(function(x){return x.id===id;});
    if(idx>=0)APP.suppliers[idx]=Object.assign(APP.suppliers[idx],data);
  }else{
    data.id=genId();
    APP.suppliers.push(data);
  }
  scheduleSave();closeModal();toast('✦ Supplier saved');renderMain();
}

function deleteSupplier(id){
  if(!confirm('Remove this supplier from the rolodex?'))return;
  APP.suppliers=(APP.suppliers||[]).filter(function(x){return x.id!==id;});
  scheduleSave();toast('Supplier removed');renderMain();
}

// Partial-consumption entry — the ±1 mini-buttons only cover whole units,
// this covers "used 1.7 kg from a 3 kg bucket" without opening the full edit
// modal and doing the subtraction by hand.
function useSupplyAmount(id){
  var it=APP.supplies.find(function(x){return x.id===id;});
  if(!it)return;
  var raw=prompt('Use how much '+(it.unit||'')+' of '+it.name+'?','1');
  if(raw==null)return;
  var amt=parseFloat(raw);
  if(!amt||amt<=0)return;
  adjustSupply(id,-amt);
}
function adjustSupply(id,delta){
  var it=APP.supplies.find(function(x){return x.id===id;});
  if(!it)return;
  var q=parseFloat(it.qty)||0;
  var nq=Math.max(0,q+delta);
  it.qty=nq;
  scheduleSave();
  if(nq===0)toast('⚠ '+it.name+' is out — order more');
  renderMain();
}

function openSupplyEditModal(id,defaultType){
  closeModal();
  var it=id?APP.supplies.find(function(x){return x.id===id;}):null;
  var isNew=!it;
  var typeKey=isNew?(defaultType||'other'):(it.type||'other');
  var typeInfo=SUPPLY_TYPES.find(function(t){return t.key===typeKey;})||SUPPLY_TYPES[SUPPLY_TYPES.length-1];
  var typeOpts=SUPPLY_TYPES.map(function(t){return'<option value="'+t.key+'"'+(typeKey===t.key?' selected':'')+'>'+t.icon+' '+t.label+'</option>';}).join('');
  // Datalist of honey varieties — only suggests when type=honey and user is typing
  var honeyVarietyOpts=(typeof HONEY_TYPES!=='undefined'&&HONEY_TYPES.length)?
    '<datalist id="honey-variety-list">'+HONEY_TYPES.map(function(h){return'<option value="'+escHtml(h)+'"></option>';}).join('')+'</datalist>':'';
  // Yeast variety datalist — same idea, suggests yeast strains
  var yeastVarietyOpts=(typeof YEAST_STRAINS!=='undefined'&&YEAST_STRAINS.length)?
    '<datalist id="yeast-variety-list">'+YEAST_STRAINS.map(function(y){return'<option value="'+escHtml(y.name)+'"></option>';}).join('')+'</datalist>':'';
  var html='<div class="modal-overlay"><div class="modal">'
    +'<div class="modal-title">'+(isNew?'ADD':'EDIT')+' SUPPLY</div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Type</label><select class="form-select" id="sup-type" onchange="onSupplyTypeChange()">'+typeOpts+'</select></div>'
    +'<div class="form-group"><label class="form-label" id="sup-name-label">Name</label>'
    +'<input class="form-input" id="sup-name" value="'+escHtml(it?it.name:(typeKey==='sanitizer'?getSanitizer().name:typeInfo.defaultName))+'" list="'+(typeKey==='honey'?'honey-variety-list':typeKey==='yeast'?'yeast-variety-list':'')+'" placeholder="'+(typeKey==='honey'?'e.g. Wildflower, Buckwheat, Acacia':typeKey==='yeast'?'e.g. M05, EC-1118':'')+'">'
    +honeyVarietyOpts+yeastVarietyOpts
    +'<div id="sup-name-hint" style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">'+(typeKey==='honey'?'Pick a variety from the suggestions or type your own. Track each honey separately.':(typeKey==='yeast'?'Start typing to pick a yeast strain. Track each strain separately.':''))+'</div>'
    +'</div></div>'
    +'<div class="form-row-3"><div class="form-group"><label class="form-label">Quantity</label><input class="form-input" type="number" step="0.01" id="sup-qty" value="'+(it?it.qty:1)+'"></div>'
    +'<div class="form-group"><label class="form-label">Unit</label><input class="form-input" id="sup-unit" value="'+escHtml(it?it.unit:typeInfo.unit)+'"></div>'
    +'<div class="form-group"><label class="form-label">Brand (optional)</label><input class="form-input" id="sup-brand" value="'+escHtml(it&&it.brand||'')+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Opened Date</label><input class="form-input" type="date" id="sup-opened" value="'+(it&&it.openDate?it.openDate:'')+'"></div>'
    +'<div class="form-group"><label class="form-label">Expiry Date</label><input class="form-input" type="date" id="sup-expiry" value="'+(it&&it.expiryDate?it.expiryDate:'')+'"></div></div>'
    +'<div class="form-row"><div class="form-group"><label class="form-label">Price per '+escHtml(it?it.unit:typeInfo.unit)+' ('+(APP.settings.currency||'€')+', optional)</label><input class="form-input" type="number" step="0.01" id="sup-price" value="'+(it&&it.pricePerUnit||'')+'" placeholder="e.g. 3.50"></div>'
    +'<div class="form-group"><label class="form-label">Low-Stock Threshold (optional)</label><input class="form-input" type="number" step="0.5" id="sup-threshold" value="'+(it&&it.threshold||'')+'" placeholder="Alert at this level"></div></div>'
    // Packet-size field — visible for yeast and nutrient supplies, where
    // packets/sachets are the natural unit but recipes scale in grams.
    // The displayed packet count in recipe scaling uses this value.
    +'<div class="form-row" id="sup-packet-row" style="display:'+((typeKey==='yeast'||typeKey==='nutrient')?'grid':'none')+'">'
    +'<div class="form-group"><label class="form-label" id="sup-packet-label">Packet size (g)</label>'
    +'<input class="form-input" type="number" step="0.5" min="0" id="sup-packet-size" value="'+(it&&it.packetSize||'')+'" placeholder="'+(typeKey==='yeast'?'e.g. 10 for M05':typeKey==='nutrient'?'e.g. 12 for MJ':'10')+'">'
    +'<div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">Grams per packet/sachet. Recipes show grams + computed packet count using this. Defaults to 10g (yeast) or 12g (nutrient) if left blank.</div>'
    +'</div><div class="form-group"></div></div>'
    +'<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="sup-notes">'+escHtml(it&&it.notes||'')+'</textarea></div>'
    +'<div class="modal-actions"><button class="btn btn-secondary" data-action="closeModal">Cancel</button><button class="btn btn-primary" data-action="saveSupply" data-args=\''+JSON.stringify([it?it.id:''])+'\'>Save</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

// When the user changes the supply type in the modal, swap the autocomplete
// list and helper hint so honey/yeast supplies get useful suggestions while
// other types remain free-text.
function onSupplyTypeChange(){
  var typeKey=document.getElementById('sup-type').value;
  var nameInput=document.getElementById('sup-name');
  var hint=document.getElementById('sup-name-hint');
  var unitInput=document.getElementById('sup-unit');
  var typeInfo=SUPPLY_TYPES.find(function(t){return t.key===typeKey;})||SUPPLY_TYPES[SUPPLY_TYPES.length-1];
  if(typeKey==='honey'){
    nameInput.setAttribute('list','honey-variety-list');
    nameInput.placeholder='e.g. Wildflower, Buckwheat, Acacia';
    hint.textContent='Pick a variety from the suggestions or type your own. Track each honey separately.';
  }else if(typeKey==='yeast'){
    nameInput.setAttribute('list','yeast-variety-list');
    nameInput.placeholder='e.g. M05, EC-1118';
    hint.textContent='Start typing to pick a yeast strain. Track each strain separately.';
  }else{
    nameInput.removeAttribute('list');
    nameInput.placeholder='';
    hint.textContent='';
  }
  // Default unit for the type if user hasn't customized it
  if(unitInput&&typeInfo.unit&&!unitInput.dataset.touched){unitInput.value=typeInfo.unit;}
  unitInput.addEventListener('input',function(){this.dataset.touched='1';},{once:true});
  // Show/hide packet-size row + update placeholder based on type
  var packetRow=document.getElementById('sup-packet-row');
  var packetInput=document.getElementById('sup-packet-size');
  if(packetRow){
    if(typeKey==='yeast'){
      packetRow.style.display='grid';
      if(packetInput)packetInput.placeholder='e.g. 10 for M05';
    }else if(typeKey==='nutrient'){
      packetRow.style.display='grid';
      if(packetInput)packetInput.placeholder='e.g. 12 for MJ';
    }else{
      packetRow.style.display='none';
    }
  }
}

function saveSupply(id){
  var packetSizeEl=document.getElementById('sup-packet-size');
  var packetSize=packetSizeEl?(parseFloat(packetSizeEl.value)||0):0;
  var data={
    id:id||genId(),
    type:document.getElementById('sup-type').value,
    name:document.getElementById('sup-name').value.trim(),
    qty:parseFloat(document.getElementById('sup-qty').value)||0,
    unit:document.getElementById('sup-unit').value.trim(),
    brand:document.getElementById('sup-brand').value.trim(),
    openDate:document.getElementById('sup-opened').value||null,
    expiryDate:document.getElementById('sup-expiry').value||null,
    pricePerUnit:parseFloat((document.getElementById('sup-price')||{}).value)||0,
    threshold:parseFloat(document.getElementById('sup-threshold').value)||0,
    packetSize:packetSize>0?packetSize:undefined,
    notes:document.getElementById('sup-notes').value.trim()
  };
  if(!data.name){toast('⚠ Name required');return;}
  var idx=APP.supplies.findIndex(function(x){return x.id===data.id;});
  if(idx>=0)APP.supplies[idx]=data;
  else APP.supplies.push(data);
  closeModal();scheduleSave();
  toast('✦ Supply saved');renderMain();
}

function deleteSupply(id){
  var it=APP.supplies.find(function(x){return x.id===id;});
  if(!it)return;
  if(!confirm('Delete "'+it.name+'"?'))return;
  APP.supplies=APP.supplies.filter(function(x){return x.id!==id;});
  scheduleSave();toast('Deleted');renderMain();
}

// ==================== BREW AGAIN ====================
function brewAgain(originalBatchId){
  var ob=getBatch(originalBatchId);
  if(!ob){toast('⚠ Source batch not found');return;}
  // Pre-populate the new batch modal with values from the original
  openNewBatchModal(ob.recipeId);
  setTimeout(function(){
    var nameField=document.getElementById('nb-name');
    if(nameField){
      // Append batch number / increment
      var baseName=ob.name.replace(/\s*#\d+\s*$/,'').trim();
      var existing=APP.batches.filter(function(b){return b.name.startsWith(baseName);}).length;
      nameField.value=baseName+' #'+(existing+1);
    }
    var volField=document.getElementById('nb-vol');
    if(volField&&ob.volume)volField.value=ob.volume;
    var ogField=document.getElementById('nb-og');
    if(ogField&&ob.og)ogField.value=ob.og;
    var honeyField=document.getElementById('nb-honey');
    if(honeyField&&ob.honey)honeyField.value=ob.honey;
    // Carry over the qualitative choices too — honey variety, yeast strain,
    // and nutrient amount — so "Brew Again" actually reproduces the batch
    // instead of resetting to recipe defaults.
    var honeyTypeField=document.getElementById('nb-honey-type');
    if(honeyTypeField&&ob.honeyType)honeyTypeField.value=ob.honeyType;
    var yeastField=document.getElementById('nb-yeast');
    if(yeastField&&ob.yeast)yeastField.value=ob.yeast;
    var nutrientField=document.getElementById('nb-nutrient');
    if(nutrientField&&ob.nutrient)nutrientField.value=ob.nutrient;
    var notesField=document.getElementById('nb-notes');
    var carryLines=[];
    if(ob.lessonsLearned)carryLines.push('🔄 Lessons from last time: '+ob.lessonsLearned);
    if(ob.notes)carryLines.push('Previous batch notes:\n'+ob.notes);
    if(notesField&&carryLines.length)notesField.value=carryLines.join('\n\n');
  },50);
}
