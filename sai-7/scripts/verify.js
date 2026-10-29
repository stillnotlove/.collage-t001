const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname,'../public');
const js = fs.readFileSync(path.join(base,'app.js'),'utf8');
const css = fs.readFileSync(path.join(base,'styles.css'),'utf8');
const html = fs.readFileSync(path.join(base,'index.html'),'utf8');
function assert(cond,message){if(!cond)throw new Error('SAI v7 QA failed: '+message)}
const declared = [...new Set([...js.matchAll(/'([A-Za-z0-9_-]+\.(?:png|webp|svg))'/g)].map(x=>x[1]))];
for(const f of declared){assert(fs.existsSync(path.join(base,'assets',f)),'missing asset '+f)}
for(const f of ['hero-logo.png','favicon.png','apple-touch-icon.png','hero-symbol-mobile.png']) assert(fs.existsSync(path.join(base,'assets',f)),'missing '+f);
assert(js.includes('id="intro-enter"'),'intro click surface missing');
assert(!js.includes('intro-caption'),'old intro subtitle still present');
assert(js.includes('philosophy-next-sentence'),'philosophy line break missing');
assert(js.includes('image-gallery'),'HQ holder gallery missing');
assert(js.includes('collection-grid'),'collection grid missing');
assert(js.includes('philosophy-sections'),'full philosophy content missing');
assert(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),'compact desktop grid missing');
assert(css.includes('overflow-y:auto'),'scroll container missing');
assert(js.includes('class="product-card-media"'),'images missing from collection cards');
assert(js.includes('route-initial') && css.includes('.page.route-exit'),'cross-dissolve transition missing');
assert(!js.includes('philosophy-card quote'),'unwanted philosophy end quote still present');
assert(js.includes("asset('philosophy-steel-detail.png')"),'user-specified philosophy photo missing');
assert((js.match(/cardImage:'sticks-approved.png'/g)||[]).length===6,'six incense cards must reuse same photograph');
assert(js.includes("cardImage:'matches-approved.png'"),'approved matchbox missing');
assert(js.includes("cardImage:'holder-white-smoke-approved.png'"),'approved holder with smoke missing');
assert(!/#[a-f\d]{3,8}\b/gi.test(css.replace(/#(?:dddde0|ffffff|000000)\b/gi,'')),'unexpected hex palette color');
assert(html.includes('favicon.png'),'favicon not linked');
console.log('SAI v7 static checks passed:',declared.length,'images referenced');
