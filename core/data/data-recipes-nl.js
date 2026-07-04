// ==========================================================================
// Dutch translations of the built-in recipes (descriptions, display names,
// style words) — split out of data-recipes.js. Keyed by recipe id; used by the
// share page and the Label Studio name/style fields when labelLocale is 'nl'.
// ==========================================================================

// Dutch recipe descriptions — clean, flavour-forward, label-worthy (no process
// instructions). Keyed by recipe id. Used on the share page (and the label
// tasting fallback) when labelLocale is 'nl'. Mirrors the English descriptions.
var RECIPE_DESC_NL={
  r1:'Pure vergiste honing, niets om achter te schuilen. Bloemig, goudkleurig en zacht zoet, met precies het karakter dat jouw honing meebrengt — een helder, eerlijk glas.',
  r2:'Gezellig en herfstig — geperste appelzoetheid omhuld door warme kaneel. Ruikt als een gebakken boomgaard, drinkt soepel op elke temperatuur.',
  r3:'Bleekroze en zacht geurend. De aardbei fluistert in plaats van te schreeuwen — meer vers geplukt veld dan snoep. Fris, licht en het best gekoeld.',
  r36:'De helderste aardbei — het fragiele bessenaroma fris en opgetild gehouden boven een zuivere honingbasis. Bleekroze, delicaat en onmiskenbaar net geplukt.',
  r4:'Een diep robijnpaarse melomel met lagen braam, framboos, bosbes en zwarte bes. Rijk, donker en vol bessenkarakter — een pronkstuk in het glas.',
  r35:'De aromatische bosmelomel: dezelfde donkere bessenmix, maar frisser en geuriger in de neus, met een lichtere robijntint en een helderdere afdronk.',
  r5:'Diep indigo en ingetogen, met geconcentreerde bosbes, een zachte zuurtoets en verrassende aardse diepte. Een stille, sfeervolle klassieker.',
  r38:'Helderder, frisser bosbes — opgetild fruit en wat meer zuur boven een zuivere honingbasis, dat een tikje van de diepe aardse indigo inruilt voor levendige bes.',
  r6:'Diep robijnrood en rijk, ergens tussen kersenwijn en mede. Zure morellen geven het een sappig, zoetzuur hart.',
  r7:'Warm en complex — kaneel, kruidnagel, gember en piment over een vleugje citrus. Een middeleeuwse medicinale mede die simpelweg heerlijk smaakt.',
  r8:'Vloeibaar goud. Veel honing, veel alcohol, weelderig en zoet in de afdronk — een trage, beschouwende dessertmede voor verjaardagen en mijlpalen.',
  r9:'Honing tot toffee gekarameliseerd nog vóór de gisting. Tonen van marshmallow, donkere karamel en crème brûlée; ziet eruit als ahornsiroop, drinkt als dessert.',
  r10:'Honing en appel samen — waar droge cider mede ontmoet. Knisperend boomgaardfruit boven een honingruggengraat, helder en verfrissend.',
  r11:'Dichter bij wijn dan bij mede — druif en honing verstrengeld, tannisch en gastronomisch. Rijk, structuurvol en gebouwd voor bij een goede maaltijd.',
  r12:'De oude brug tussen mede en bier: honing, mout en hop. Moutige body met een zachte hopbeet, ongedwongen en jong te drinken.',
  r37:'Framboos in parfummodus — een intense, bijna bloemige verse-frambozenneus boven levendig magenta. De aromatische tegenhanger van de klassieker.',
  r13:'Briljant magenta en uitbundig fruitig — rijpe framboos in een zoetzure balans. Levendig, sappig en betrouwbaar lekker.',
  r14:'Inktpaars-zwart en intens tannisch — aardse, donkere zwarte bes met echte structuur. Een waardig mede-antwoord op een glas port.',
  r15:'Zachte, geurige verse perzik boven een zuivere honingbasis. Delicaat steenfruitaroma, mild zoet en zomers.',
  r16:'Echte gespleten vanillestokken maken van honingwijn een dessert — zacht, romig en vlaachtig. Puur te drinken of bij cheesecake.',
  r17:'Krachtig en warmend, met geïntegreerde ontbijtkoekhitte. Pittig, levendig en een tikje vurig — gember die zijn plaats verdient.',
  r18:'Prachtig robijnroze, zurig en licht tannisch met een bloemige rand — als veenbes gekust door roos. Helder en mooi in het glas.',
  r19:'Werkelijk delicaat en parfumachtig — zachte roos over honing, met een prachtige blostint. Subtiel, elegant, de klassieke rhodomel.',
  r20:'Honingwijn ontmoet de hoptuin — citrus- en tropisch hoparoma zonder bitterheid. Fris, modern en het best jong en vers genoten.',
  r21:'Eerst zoete honing, daarna een zachte chilibrand — de befaamde zoet-dan-vuur. Fruitige pepers brengen warmte en aroma, niet alleen hitte. Voor de durvers.',
  r22:'Cold-brew-zacht — diep koffiekarakter zonder de bittere rand. Drinkt als een likeur; het perfecte glas na het diner.',
  r23:'Delicaat en parfumachtig — een Provençaalse zomer in een glas. Zachte bloemige lavendel over honing, ingetogen en elegant.',
  r24:'Een chai-kruidenkast in een glas — kardemom, kaneel, gember, kruidnagel en zwarte peper. Warmend en aromatisch, een perfecte wintersipper.',
  r25:'Een robijnport-hommage — hoge dichtheid, donker fruit en een zoete, weelderige afdronk op 14–15%. Diep, fruitig en decadent, met een vleugje eikenhout.',
  r26:'Een geduldsproject dat drinkt naar karamel, gedroogde vijg, walnoot en butterscotch. Gekarameliseerde honing en lange eikenrijping jagen de tijd zelf na — een tawny-port-hommage.',
  r27:'Een dikke, honingachtige dessertmede doorweven met parfumachtige lavendel. Weelderig en digestief-zoet, met bloemen die over de jaren van scherp naar zijdezacht rijpen — een verjaardagsfles.',
  r28:'Honing en ahorn als één vergist — houtige diepte en een vleugje kampvuurrook over bloemige honing. Een bos in vloeibare vorm.',
  r29:'Bos ontmoet kampvuur: gekarameliseerde honing en donkere ahorn diep in toffee- en marshmallowterritorium. Smaakt naar ahornbourbon met een honingruggengraat — diep amber en cadeauwaardig.',
  r30:'Honingchampagne — kurkdroog, fijn bruisend en fris, het honingaroma helder opgetild door de koolzuur. De feestmede.',
  r31:'Knisperende appelbruis, ergens tussen droge cider en lichte mede. Honing rondt de appel af, de bubbels houden het levendig — een moeiteloze publiekslieveling.',
  r32:'Een lichte, alcoholarme honing-spritz — helder, bruisend en verfrissend. De ongedwongen instap-mousserende mede die je jong kunt drinken.',
  r33:'Droog, levendig en boordevol vers bosvruchtenaroma — roze, mousserend en helder. Bessenbruis met een schone, frisse afdronk.',
  r34:'Een volwassen gemberbier met ruggengraat — honing en verse gember, droog vergist en mousserend. Warmend, pittig en gevaarlijk drinkbaar.',
  // ---- cider mode ----
  c1:'De eerlijke, alledaagse cider — gemaakt van keukenappels in plaats van erfgoed-bittersweets. Lagere tannine, helderder zuur, verfrissend en makkelijk jong te drinken. Het meeste van \'s werelds cider wordt eigenlijk zo gemaakt.',
  c2:'Gebouwd op echt ciderappel-karakter in plaats van keukenfruit — Dabinetts betrouwbare bittersweet-ruggengraat opgehelderd met Golden Russets ongewone suiker-en-zuurcombinatie. Schone gisting, geen malolactisch karakter, echte structuur.',
  c3:'Volmondig en droog met een lange tannische afdronk — gebouwd rond Kingston Black, de ene appel waarover men het breed eens is dat hij "de perfecte ciderappel" is vanwege zijn zeldzame balans van hoge tannine ÉN hoog zuur in één vrucht. Optioneel toegestaan malolactisch te gisten voor het klassieke fenolische, boterachtige Engelse karakter.',
  c4:'Medium-tot-zoet, volmondig en rijk, met een fenolisch of boerderij-achtig achtergrondkarakter — de traditionele laag-alcoholische stijl gebouwd rond een van nature trage, koele gisting in plaats van een volledig droge cider terug te zoeten.',
  c5:'Droog, fris en rustiek met heldere zuurgraad en lichte-tot-matige wilde/azijnachtige tonen — een aardse, boerderij-indruk traditioneel bereikt door open, ongecontroleerde gisting in grote vaten.',
  c6:'Een substantiële, historische Amerikaanse stijl opgebouwd met adjuncten — rozijnen zijn traditioneel — soms vatgerijpt. Hoger alcohol en echte body onderscheiden hem van een standaardcider.',
  c7:'Presenteert zich als een droge witte wijn eerder dan een cider — fruitig en bloemig, gebalanceerd, met lage wrangheid en bitterheid. Een hogere-dichtheid, wijngist-gedreven stijl die echte kelder-tijd beloont.',
  c8:'Een dessertstijl-cider van geconcentreerd sap — zacht, rijk en zoet als een dessertwijn, met balancerend zuur. Traditioneel gemaakt door sap te vries-concentreren (cryo-concentratie) in plaats van in te koken, wat verse appelaromatiek behoudt.',
  c9:'Een donkergoud tot bruine cider met een zeer zoete, gekarameliseerde, ahornsiroopachtige indruk — ciders antwoord op een bochet, gebouwd rond een echte karamelisatiestap in plaats van gewoon geconcentreerd sap.',
  c10:'Appelsap en frambozen in echte balans — zowel het appelkarakter als het toegevoegde fruit blijven merkbaar, complementair, en geen van beide overheerst de ander.',
  c11:'Kaneel en kruidnagel geïntegreerd met de cider in plaats van hem te domineren — een warm, herfstig glas. Probeer geen malolactische gisting bij deze stijl; het kruidig/boterachtige karakter zou botsen in plaats van aanvullen.',
  c12:'Een moderne crossover-stijl: een schone cider dry-hoppen met fruitige, citrusachtige hop (in plaats van dank/hars-achtige) voor aroma zonder bitterheid toe te voegen. Het ciderkarakter moet aanwezig blijven — dit is geen bier met appelsap erin.',
  c13:'Gegiste perensap — een eigen, apart ding, niet zomaar "cider gemaakt met peren." Perenrassen voor perry hebben hun eigen tannine/zuur-classificatie en hun eigen gevaren: in tegenstelling tot appelcider moet malolactische gisting hier VERMEDEN worden, aangezien het citroenzuur van peren omzet in azijnzuur (azijn) in plaats van ciders boterachtige melkzuurresultaat.'
};

// Dutch display names per recipe (share page + label name/style), keyed by id.
var RECIPE_NAME_NL={
  r1:'Traditionele Mede', r2:'Appel-Kaneelmede',
  r3:'Aardbeienmede', r36:'Aardbeienmede · Fruit in tweede gisting',
  r4:'Bosvruchtenmede', r35:'Bosvruchtenmede · Fruit in tweede gisting',
  r5:'Bosbessenmede', r38:'Bosbessenmede · Fruit in tweede gisting',
  r6:'Kersenmede', r7:'Gekruide Mede (Metheglin)', r8:'Zware Dessertmede (Sack)',
  r9:'Bochet · Gekarameliseerde Honingmede', r10:'Cyser · Appelmede',
  r11:'Pyment · Druivenmede', r12:'Braggot · Bier-Mede Hybride',
  r13:'Frambozenmelomel', r37:'Frambozenmelomel · Fruit in tweede gisting',
  r14:'Zwartebessenmelomel', r15:'Perzikmelomel', r16:'Vanillemede (Metheglin)',
  r17:'Gembermede (Metheglin)', r18:'Hibiscusmede', r19:'Rozenblaadjesmede (Rhodomel)',
  r20:'Gehopte Mede (Droog Gehopt)', r21:'Capsicumel · Chilimede', r22:'Koffiemede',
  r23:'Lavendelmede (Metheglin)', r24:'Chai-gekruide Mede (Metheglin)',
  r25:'Sack-mede · Portstijl (Ruby)', r26:'Gerijpte Mede · Tawny-portstijl',
  r27:'Sack Lavendel · Lang Gerijpte Zoete Metheglin', r28:'Acerglyn · Ahornmede',
  r29:'Ahorn-Bochet · Gekarameliseerde Bos-Sack', r30:'Mousserende Traditionele Mede',
  r31:'Mousserende Cyser', r32:'Hydromel · Mousserende Sessiemede',
  r33:'Mousserende Bessenmelomel', r34:'Mousserende Gembermede',
  // ---- cider mode ----
  c1:'Gewone Cider', c2:'Erfgoedcider', c3:'Engelse Cider', c4:'Franse Cider',
  c5:'Spaanse Cider (Sidra)', c6:'New England Cider', c7:'Appelwijn', c8:'IJscider',
  c9:'Vuurcider', c10:'Vruchtencider — Framboos', c11:'Kruidencider — Kaneel & Kruidnagel',
  c12:'Experimentele Cider — Droog Gehopt', c13:'Traditionele Perry'
};
// Dutch for the style/category word shown alongside the name.
var RECIPE_STYLE_NL={
  'Show Mead':'Show mede','Mead':'Mede','Traditional':'Traditioneel','Melomel':'Melomel',
  'Cyser':'Cyser','Pyment':'Pyment','Metheglin':'Metheglin','Bochet':'Bochet',
  'Braggot':'Braggot','Acerglyn':'Acerglyn','Sack Mead':'Sack-mede','Sack':'Sack',
  'Specialty':'Specialiteit','Sparkling':'Mousserend','Hydromel':'Hydromel',
  // ---- cider mode ----
  'Common Cider':'Gewone Cider','Heirloom Cider':'Erfgoedcider','English Cider':'Engelse Cider',
  'French Cider':'Franse Cider','Spanish Cider':'Spaanse Cider','New England Cider':'New England Cider',
  'Applewine':'Appelwijn','Ice Cider':'IJscider','Fire Cider':'Vuurcider',
  'Fruit Cider':'Vruchtencider','Spiced Cider':'Kruidencider','Experimental Cider':'Experimentele Cider',
  'Perry':'Perry'
};
