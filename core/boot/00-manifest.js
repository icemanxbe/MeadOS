// MeadOS — © 2026 icemanxbe (https://github.com/icemanxbe/MeadOS)
// PolyForm Noncommercial License 1.0.0 — see LICENSE.
//
// Single source of truth for module load order. Both index.html and test.html
// load ONLY this file as a static <script> tag, then call MODULE_MANIFEST_LOAD()
// to inject every other core/ module via document.write (safe here because it
// runs synchronously during initial HTML parsing, in the exact position the
// static <script> tags used to occupy — order is preserved, which the shared
// global scope depends on).
//
// Previously this order was maintained separately in index.html and test.html
// and had already drifted: test.html was missing data-cider.js/data-cider-recipes.js
// and the cider NL data files even though it exercises cider-recipe logic
// (wizBuildCiderRecipe, mwIsSparkling) — a real, silent gap. Editing this one
// array is now the only place load order needs to change.
var MODULE_MANIFEST=[
  'core/data/data-libraries.js',
  'core/data/data-cider.js',
  'core/data/data-cider-recipes.js',
  'core/data/data-recipes.js',
  'core/data/data-recipes-nl.js',
  'core/data/data-libraries-nl.js',
  'core/data/data-cider-nl.js',
  'core/data/data-cider-detail-nl.js',
  'core/data/data-cider-guide-nl.js',
  'core/data/data-recipe-steps-nl.js',
  'core/data/data-recipe-ingredients-nl.js',
  'core/data/data-yeast-nl.js',
  'core/data/data-nutrient-nl.js',
  'core/data/data-honeyfit-nl.js',
  'core/data/data-recipe-guide-nl.js',
  'core/data/data-honeydetail-nl.js',
  'core/state/01-state.js',
  'core/state/i18n.js',
  'core/domain/02-honey-domain.js',
  'core/domain/03-brew-domain.js',
  'core/domain/03d-mead-model.js',
  'core/domain/03e-advisor.js',
  'core/domain/03f-advisor-rules-fermentation.js',
  'core/domain/03g-advisor-rules-packaging.js',
  'core/sync/04-server-ha.js',
  'core/domain/04b-bottle-helpers.js',
  'core/state/05-utils-nav.js',
  'core/state/05b-delegate.js',
  'core/views/06-views-batch.js',
  'core/views/07-views-recipe.js',
  'core/tools/08-tools.js',
  'core/tools/08-guide-scanner.js',
  'core/tools/08-search.js',
  'core/tools/08-record-pdf.js',
  'core/tools/08-beerxml.js',
  'core/tools/08-rehydration.js',
  'core/views/09-views-library.js',
  'core/views/10-cellar.js',
  'core/labels/10b-labels-print.js',
  'core/views/10c-compare.js',
  'core/views/10d-supplies.js',
  'core/views/10e-cellar-misc.js',
  'core/features/11-alerts.js',
  'core/features/11-schedule.js',
  'core/views/11-year-review.js',
  'core/features/11-recipe-designer.js',
  'core/features/11-tasting-exports.js',
  'core/features/11-ha-additions-temp.js',
  'core/views/12-troubleshoot.js',
  'core/views/12-troubleshoot-nl.js',
  'core/views/12-offflavor-nl.js',
  'core/views/12-insights.js',
  'core/views/12-advisor.js',
  'core/features/12-tasting-analysis.js',
  'core/features/12-records.js',
  'core/tools/12-blending-yeast.js',
  'core/features/12-gift-bottling.js',
  'core/share/13-media-ha-ws.js',
  'core/labels/13-image-upload.js',
  'core/labels/13-misc-modals.js',
  'core/share/13-share.js',
  'core/labels/13-exports.js',
  'core/labels/13b-label-studio.js',
  'core/boot/14-schema.js',
  'core/boot/14-storage-budget.js',
  'core/boot/14-modals.js',
  'core/boot/14-bootstrap.js'
];

// Injects every manifest entry as a blocking <script> tag, in order, via
// document.write. Must be called synchronously from a <script> tag placed
// where the module scripts should load (document.write only works during
// initial parsing, which is exactly the case here).
function MODULE_MANIFEST_LOAD(opts){
  var skip=(opts&&opts.skip)||[];
  MODULE_MANIFEST.forEach(function(path){
    if(skip.indexOf(path)!==-1)return;
    document.write('<script src="/'+path+'"><\/script>');
  });
}
