import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const VERSION='4.61';
const failures=[];
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const exists=p=>fs.existsSync(path.join(ROOT,p));
const check=(ok,msg)=>{if(!ok)failures.push(msg)};

function walk(dir){
  const abs=path.join(ROOT,dir);if(!fs.existsSync(abs))return [];
  return fs.readdirSync(abs,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
}

const jsFiles=[...walk('app'),...walk('components'),...walk('lib')].filter(f=>f.endsWith('.js'));
for(const file of jsFiles){
  const txt=read(file);
  for(const m of txt.matchAll(/from\s+['"](\.[^'"]+)['"]/g)){
    const base=path.normalize(path.join(path.dirname(file),m[1]));
    check(exists(base)||exists(`${base}.js`)||exists(path.join(base,'index.js')),`${file}: missing local import ${m[1]}`);
  }
}

const tools={
  FIELD:'components/FieldTool.js',
  SLICE:'components/SliceTool.js',
  ASCII:'components/AsciiTool.js',
  ECHO:'components/EchoTool.js',
};
for(const [name,file] of Object.entries(tools)){
  const txt=read(file);
  check(!/<small>\s*4\./.test(txt),`${name}: version/suffix still present beside brand`);
  check(txt.includes('MicroHudGroup'),`${name}: missing collapsible HUD groups`);
  check(txt.includes('ContinuePanel'),`${name}: missing CONTINUE`);
  check(txt.includes('PNG α'),`${name}: missing transparent PNG action`);
  check(txt.includes('RATIOS'),`${name}: missing shared ratio contract`);
  check(txt.includes('onHome'),`${name}: missing home navigation`);
  check(txt.includes('loadSeq'),`${name}: missing image-load race guard`);
}

const editor=read('components/CollageEditor.js');
check(editor.includes("text:'1337'"),'EDITOR: Stamp default text is not 1337');
check(editor.includes('updateStampedShape'),'EDITOR: stamped shape style updater missing');
check(editor.includes('value={stamp.fill}')&&editor.includes('value={stamp.stroke}'),'EDITOR: Stamp shape Fill/Stroke controls missing');
check((editor.match(/function clearCanvas\s*\(/g)||[]).length===1,'EDITOR: duplicate clearCanvas handler');
check(!/<small>\s*4\./.test(editor),'EDITOR: version/suffix still present beside brand');
check(editor.includes('isEditableTarget'),'EDITOR: editable-target keyboard guard missing');
check(editor.includes('commitCurrent'),'EDITOR: async-safe scene commit missing');
check(editor.includes('sceneRef.current'),'EDITOR: async scene ref missing');

const shell=read('components/AppShell.js');
check(shell.includes('<span>4.61</span>'),'INDEX: version is not 4.61');
check((shell.match(/4\.61/g)||[]).length===1,'INDEX: version should appear only once in AppShell');
check(shell.includes('className="minimalModes toolGrid"'),'INDEX: scalable tool grid missing');
check(!shell.includes('className="catalogMeta"'),'INDEX: TOOLS/count metadata should be removed');
check(shell.includes('CREDITS'),'INDEX: credits entry missing');
check(shell.includes("screen==='credits'"),'CREDITS: route missing');
check(shell.includes('className="creditsWordmark"'),'CREDITS: title wordmark missing');
check(shell.includes('https://t.me/stillnotlove'),'CREDITS: Telegram link missing');
check(shell.includes('https://www.instagram.com/stillnotlove'),'CREDITS: Instagram link missing');
check(shell.includes('all rights fucked.'),'CREDITS: rights line missing or missing period');
check(shell.includes('design is your privellege.'),'CREDITS: design line missing or missing period');

const entry=read('components/EntryLiveMark.js');
check(entry.includes('entryStaticWordmark'),'ENTRY: static wordmark missing');
check(entry.includes('brand1337'),'ENTRY: 1337 wordmark missing');
check(entry.includes('brandTools'),'ENTRY: tools wordmark missing');
check(!entry.includes('<canvas'),'ENTRY: splash canvas should be removed');
check(!entry.includes('useEffect'),'ENTRY: splash animation/effect lifecycle should be removed');
check(!entry.includes('requestAnimationFrame'),'ENTRY: splash animation loop should be removed');
check(!entry.includes('ASCII'),'ENTRY: splash ASCII logic should be removed');

const hover=read('components/ModeHoverLabel.js');
check(hover.includes('if(!active)return;'),'INDEX hover effects: idle RAF guard missing');
check(hover.includes('asciiSample'),'INDEX hover ASCII: sample canvas reuse missing');

const css=read('app/globals.css');
check(css.includes('.creditsScreen'),'CREDITS: styles missing');
check(css.includes('.catalogFooter'),'INDEX: credits footer styles missing');


check(css.includes('/* 4.42 — exact three dots under visual processing system */'),'VISUAL: 4.42 visual marker missing');
check(css.includes('.minimalMode.toolCard:last-child:nth-child(odd)'),'INDEX: odd last card full-row rule missing');
check(css.includes('.microHudGroup.open>.microHudToggle span'),'HUD: editorial active-section label missing');
check(css.includes('border-radius:50%!important'),'HUD: circular static slider thumbs missing');

check(shell.includes('className="catalogAtmosphere"'),'VISUAL: layered catalog atmosphere missing');
check(!shell.includes('atmoType'),'INDEX: obsolete grey PROCESS / IMAGE / SYSTEM / 1337 line remains');
check(shell.includes('className="modeMeta"'),'INDEX: editorial tool metadata missing');
check(css.includes('.minimalMode.toolCard:before,.minimalMode.toolCard:after{content:none!important}'),'INDEX: old corner decorations not disabled');
check(css.includes('/* 4.46 — clean workspaces + three-effect randomized main loop */'),'WORKSPACE: 4.46 cleanup marker missing');
check(css.includes('/* 4.47 — keep catalog background typography fully inside the viewport */'),'INDEX: 4.47 background typography fix missing');
check(css.includes('left:50%!important')&&css.includes('translateX(-50%) rotate(-1.5deg)!important'),'INDEX: background typography is not viewport-centered');
check(css.includes('.shell:before')&&css.includes('content:none!important'),'WORKSPACE: giant background tool typography is not disabled');
check(!css.includes('content:"EDITOR"')&&!css.includes('content:"FIELD"')&&!css.includes('content:"SLICE"')&&!css.includes('content:"ASCII"')&&!css.includes('content:"ECHO"'),'WORKSPACE: stale giant tool labels remain in CSS');
check(css.includes('fieldHero::after'),'HUD: stripe cleanup selectors missing');
check(!shell.includes('choose a mode / break a layout / keep moving'),'INDEX: secondary catalog tagline still present');
check(shell.includes('visual processing system'),'INDEX: visual processing system descriptor missing');
check(hover.includes("ctx.fillStyle='#ffffff'"),'INDEX: hover transformation is not white');


check(css.includes('--brand-tools-gap:2px'),'BRAND: tools gap is not restored');
check(css.includes('--brand-digit-kern:-0.055em'),'BRAND: tight 1337 digit kern variable missing');
check(css.includes('.credits337{'),'BRAND: credits 337 spacing rule missing');
check(css.includes('margin-left:var(--brand-digit-kern)!important'),'BRAND: equal tight digit kern override missing');
check(css.includes("font-weight:200!important")&&css.includes('.credits1337'),'CREDITS: 1337 is not light like tools');
check(css.includes('radial-gradient(circle,var(--yellow) 0 1.45px'),'HUD: dotted section marker missing');
check(css.includes('box-shadow:none!important'),'INDEX: idle card underlay is not disabled');
check(css.includes('box-shadow:6px 6px 0 rgba(255,255,255,.42)!important'),'INDEX: hover card underlay missing');
const rangeInputs=read('components/RangeInputs.js');
check(rangeInputs.includes('editing.current'),'HUD: shared range draft guard missing');
check(rangeInputs.includes('Number.isFinite'),'HUD: shared range finite-number guard missing');
check(rangeInputs.includes('Math.round((out-lo)/inc)'),'HUD: shared range step normalization missing');
for(const file of ['components/SliceTool.js','components/AsciiTool.js','components/EchoTool.js','components/FieldTool.js']){
  const txt=read(file);
  check(txt.includes("import RangeInputs from './RangeInputs'"),`${file}: shared RangeInputs not used`);
  check(txt.includes('isEditableTarget'),`${file}: editable-target paste guard missing`);
  check(!/function (?:SliceRange|AsciiRange|EchoRange|SimpleRange)[\s\S]{0,220}<b>\{value\}<\/b>/.test(txt),`${file}: duplicated range value remains in header`);
}

const echo=read('components/EchoTool.js');
check(echo.includes('cutoutSeq'),'ECHO: async cutout race guard missing');
check(echo.includes('operation!==cutoutSeq.current'),'ECHO: stale cutout result guard missing');
check(css.includes('/* 4.45 — technical QA pass; no visual changes */'),'QA: 4.45 technical marker missing');

const visualAudit=read('_visual_audit.html');
check(visualAudit.includes('<span>4.61</span>'),'QA: static visual audit has stale version');
check(visualAudit.includes('visual processing system'),'QA: static visual audit has stale descriptor');
check(!visualAudit.includes('choose a mode / break a layout / keep moving'),'QA: static visual audit has stale tagline');
check(!css.includes('entryBrandCycle')&&!css.includes('entryBrandFx')&&!css.includes('entryPhaseDot'),'QA: obsolete phase-entry CSS remains');
for(const file of jsFiles.filter(f=>f!=='components/RangeInputs.js'))check(!read(file).includes('<input type="range"'),`${file}: direct range input bypasses shared RangeInputs`);

check(editor.includes('function changeBg(nextBg)'),'EDITOR: background history/preset updater missing');
check(editor.includes("'--canvas-bg':bg"),'EDITOR: canvas background CSS variable missing');
check(editor.includes('editorBgPresets'),'EDITOR: canvas background presets missing');
check(css.includes('background:var(--canvas-bg,#f0ede4)!important'),'EDITOR: canvas background is still visually overridden');
check(css.includes('.catalogPrelude:after')&&css.includes('radial-gradient(circle,var(--white)'),'INDEX: descriptor dots missing');

check(css.includes('/* 4.44 — globally locked numeric value column for every range */'),'HUD: 4.44 numeric-column marker missing');
check(css.includes('grid-template-columns:minmax(0,1fr) 48px!important'),'HUD: range value column width is not locked');
check(css.includes("font-feature-settings:'tnum' 1,'lnum' 1!important"),'HUD: tabular numeric alignment missing');
check(css.includes('border-bottom:0!important'),'HUD: value input underline still present');

const layout=read('app/layout.js');
const manifest=read('app/manifest.js');
check(!exists('app/favicon.ico'),'ICONS: conflicting App Router favicon.ico still present');
for(const icon of ['app/icon.png','app/apple-icon.png','public/favicon.ico','public/icon-48.png','public/icon-192.png','public/icon-512.png','public/apple-icon.png','public/safari-pinned-tab.svg'])check(exists(icon),`ICONS: missing ${icon}`);
check(layout.includes("'/favicon.ico?v=48'"),'ICONS: versioned favicon metadata missing');
check(layout.includes("'/icon-48.png?v=48'"),'ICONS: 48px search/browser icon missing from metadata');
check(layout.includes('rel="mask-icon"'),'ICONS: Safari pinned-tab icon link missing');
check(layout.includes("metadataBase:new URL('https://1337tools.vercel.app')"),'SEO: production metadataBase missing');
check(manifest.includes("'/icon-48.png?v=48'"),'ICONS: 48px manifest icon missing');
check(css.includes('/* 4.48 — overlapping tool-to-tool entry transitions + cross-browser icon release */'),'QA: 4.48 release marker missing');

const pkg=JSON.parse(read('package.json'));
check(pkg.version==='0.4.61','package.json: stale version');
check(pkg.scripts?.audit==='node scripts/audit.mjs','package.json: audit script missing');

if(failures.length){
  console.error(`AUDIT FAILED (${failures.length})`);
  for(const f of failures)console.error(`- ${f}`);
  process.exit(1);
}
console.log(`AUDIT OK · ${VERSION} · ${jsFiles.length} JS files · ${Object.keys(tools).length+1} tools checked`);
