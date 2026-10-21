import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const VERSION='4.95';
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
  SCAN:'components/ScanTool.js',
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

check(editor.includes('editorExportDock'),'EDITOR: persistent export dock missing');
check(editor.includes("EDITOR_HUD_STORAGE_VERSION='v479'"),'EDITOR: HUD state namespace not reset');
check(editor.includes("scale:kind==='png'?EDITOR_PNG_EXPORT_SCALE:1"),'EDITOR: 2x PNG export missing');
check(editor.includes("text:'1337'"),'EDITOR: Stamp default text is not 1337');
check(editor.includes('updateStampedShape'),'EDITOR: stamped shape style updater missing');
check(editor.includes('value={stamp.fill}')&&editor.includes('value={stamp.stroke}'),'EDITOR: Stamp shape Fill/Stroke controls missing');
check((editor.match(/function clearCanvas\s*\(/g)||[]).length===1,'EDITOR: duplicate clearCanvas handler');
check(!/<small>\s*4\./.test(editor),'EDITOR: version/suffix still present beside brand');
check(editor.includes('isEditableTarget'),'EDITOR: editable-target keyboard guard missing');
check(editor.includes('commitCurrent'),'EDITOR: async-safe scene commit missing');
check(editor.includes('sceneRef.current'),'EDITOR: async scene ref missing');

const shell=read('components/AppShell.js');
check(shell.includes('<span>4.95</span>'),'INDEX: version is not 4.92');
check((shell.match(/4\.95/g)||[]).length===1,'INDEX: version should appear only once in AppShell');
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
check(entry.includes('<span className="brand1337"><span className="brandOneNudge">1</span>337</span>'),'ENTRY: 1-only nudge markup missing');

const hover=read('components/ModeHoverLabel.js');
check(!hover.includes('requestAnimationFrame')&&!hover.includes('<canvas'),'INDEX: static hover labels must not create canvas/RAF loops');
check(hover.includes('modeFxBase'),'INDEX: static text labels missing');

const css=read('app/globals.css');
check(css.includes('.editorExportDock{'),'EDITOR: export dock CSS missing');
check(css.includes('.creditsScreen'),'CREDITS: styles missing');
check(css.includes('letter-spacing:-0.115em!important'),'BRAND: final main tracking override missing');
check(css.includes('letter-spacing:-0.105em!important'),'CREDITS: final credits tracking override missing');
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
check(css.includes('/* v4.85 — restore tactile card motion'),'INDEX: tactile card hover rule missing');
check(css.includes('transform:translate3d(-4px,-4px,0)!important'),'INDEX: card translation missing');
check(css.includes('box-shadow:6px 6px 0 rgba(255,255,255,.42)!important'),'INDEX: original offset shadow missing');


check(css.includes('--brand-tools-gap:2px'),'BRAND: tools gap is not restored');
check(css.includes('--brand-main-tracking:-0.072em'),'BRAND: main single-string tracking missing');
check(css.includes('--credits-tracking:-0.058em'),'BRAND: credits single-string tracking missing');
check(shell.includes('<span className="brand1337"><span className="brandOneNudge">1</span>337</span>'),'BRAND: AppShell 1-only nudge markup missing');
check(shell.includes('<b className="credits1337"><span className="creditsOneNudge">1</span>337</b>'),'CREDITS: credits 1-only nudge markup missing');
check(css.includes('.brand::after'),'BRAND: top icon pseudo-element missing');
check(css.includes('entryStaticWordmark::after'),'BRAND: splash icon suppression missing');
check(css.includes('.creditsWordmark{'),'CREDITS: credits wordmark rule missing');
check(css.includes('gap:0!important'),'CREDITS: credits wordmark gap override missing');
check(css.includes("font-weight:200!important")&&css.includes('.credits1337'),'CREDITS: 1337 is not light like tools');
check(shell.includes("import { track } from '@vercel/analytics';"),'ANALYTICS: custom tool event import missing');
check(shell.includes("track('tool_open',{tool})"),'ANALYTICS: tool_open event missing');
check(shell.includes('const tool=TOOL_NAMES[screen]'),'ANALYTICS: tool event screen mapping missing');
check(css.includes('radial-gradient(circle,var(--yellow) 0 1.45px'),'HUD: dotted section marker missing');
check(css.includes('box-shadow:none!important'),'INDEX: idle card underlay is not disabled');
check(css.includes('box-shadow:6px 6px 0 rgba(255,255,255,.42)!important'),'INDEX: hover card underlay missing');
const rangeInputs=read('components/RangeInputs.js');
check(rangeInputs.includes('editing.current'),'HUD: shared range draft guard missing');
check(rangeInputs.includes('Number.isFinite'),'HUD: shared range finite-number guard missing');
check(rangeInputs.includes('Math.round((out-lo)/inc)'),'HUD: shared range step normalization missing');
for(const file of ['components/SliceTool.js','components/AsciiTool.js','components/EchoTool.js','components/FieldTool.js','components/ScanTool.js']){
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
check(visualAudit.includes('<span>4.95</span>'),'QA: static visual audit has stale version');
check(visualAudit.includes('data-mode="scan"'),'SCAN: static visual audit catalog tile missing');
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
check(layout.includes("metadataBase:new URL('https://1337tools.vercel.app')"),'SEO: production metadataBase missing');
for(const icon of ['app/favicon.ico','app/icon.png','app/apple-icon.png'])check(exists(icon),`ICONS: missing canonical ${icon}`);
for(const stale of ['public/favicon.ico','public/icon-48.png','public/icon-192.png','public/icon-512.png','public/apple-icon.png','public/safari-pinned-tab.svg'])check(!exists(stale),`ICONS: stale duplicate still exists ${stale}`);
check(!layout.includes('icons:{'),'ICONS: manual metadata.icons should be removed');
check(!layout.includes('rel="icon"')&&!layout.includes('rel="apple-touch-icon"')&&!layout.includes('rel="mask-icon"'),'ICONS: manual icon link declarations should be removed');
check(manifest.includes("'/icon.png'")&&manifest.includes("sizes:'512x512'"),'ICONS: manifest should use canonical Next icon');
check(css.includes('/* 4.48 — overlapping tool-to-tool entry transitions + cross-browser icon release */'),'QA: 4.48 release marker missing');


check(!exists('components/WeaveTool.js')&&!exists('lib/weaveEngine.js'),'WEAVE: removed tool files remain');
check(!shell.includes('weave')&&!read('components/ContinuePanel.js').includes('weave'),'WEAVE: route or continue entry remains');
check(!css.includes('data-mode="weave"')&&!css.includes('.weaveShell'),'WEAVE: stale CSS remains');
check(css.includes('.toolCard[data-mode]{'),'INDEX: mobile single-column override missing');
check((shell.match(/id:'(?:field|slice|ascii|editor|echo|scan|glass)',n:/g)||[]).length===7,'INDEX: expected exactly 7 tools');
const pkg=JSON.parse(read('package.json'));
check(pkg.version==='0.4.95','package.json: stale version');
check(pkg.dependencies?.['@vercel/analytics']==='2.0.1','ANALYTICS: @vercel/analytics 2.0.1 missing');
check(layout.includes("import { Analytics } from '@vercel/analytics/next';"),'ANALYTICS: Next.js Analytics import missing');
check(layout.includes('<Analytics />'),'ANALYTICS: Analytics component is not mounted in RootLayout');
check(pkg.scripts?.audit==='node scripts/audit.mjs','package.json: audit script missing');

// 4.74 HQ PNG export regression checks
const fieldTool=read('components/FieldTool.js');
check(fieldTool.includes('FIELD_PNG_EXPORT_SCALE=2'),'FIELD HQ: 2x PNG export scale missing');
check(fieldTool.includes('processedSource(Math.max(w,h))'),'FIELD HQ: export still caps processed source resolution');
check(fieldTool.includes('scale:FIELD_PNG_EXPORT_SCALE'),'FIELD HQ: high-resolution render is not used for output/handoff');
check(editor.includes('EDITOR_PNG_EXPORT_SCALE=2'),'EDITOR HQ: 2x PNG export scale missing');
check(editor.includes("scale:kind==='png'?EDITOR_PNG_EXPORT_SCALE:1"),'EDITOR HQ: PNG-only export scale missing');
const exportSceneSource=read('lib/exportScene.js');
check(exportSceneSource.includes('scale=1}={}'),'EDITOR HQ: scale-aware exportScene signature missing');
check(exportSceneSource.includes('outWidth=Math.max(1,Math.round(docWidth*renderScale))'),'EDITOR HQ: scaled canvas dimensions missing');
check(exportSceneSource.includes('layerRasterSize'),'EDITOR HQ: adaptive text/shape rasterization missing');
check(exportSceneSource.includes("imageSmoothingQuality='high'"),'EDITOR HQ: high-quality image smoothing missing');

// 4.79 SCAN v1 integration / regression checks
const scan=read('components/ScanTool.js');
const scanEngine=read('lib/scanEngine.js');
check(shell.includes("import ScanTool from './ScanTool'"),'SCAN: AppShell import missing');
check(shell.includes("id:'scan',n:'07'"),'SCAN: catalog tile missing');
check(shell.includes("scan:'SCAN'"),'SCAN: analytics label missing');
check(shell.includes("screen==='scan'"),'SCAN: route missing');
check(shell.includes("onSendToEditor={(f,r)=>openEditor(f,r"),'SCAN: Editor handoff not wired');
check(read("components/ContinuePanel.js").includes("id:'scan',label:'TO SCAN'"),'SCAN: CONTINUE option missing');
check(shell.includes("id:'scan',n:'07'"),'SCAN: catalog entry missing');
check(scan.includes("onContinue?.('scan',target,"),'SCAN: outgoing CONTINUE missing');
check(scan.includes('loadSeq.current'),'SCAN: stale image loading guard missing');
check(scan.includes('jobRef.current'),'SCAN: overlapping export/copy race guard missing');
check(scan.includes('scannedRef.current')&&scan.includes('samplesRef.current'),'SCAN: recorded scan strips missing');
check(scan.includes('CLEAR PASS'),'SCAN: clear scan pass action missing');
check(scan.includes("title=\"OUTPUT\""),'SCAN: visible OUTPUT section missing');
check(scan.includes('SEND TO EDITOR')&&scan.includes('PNG α'),'SCAN: output actions missing');
check(scanEngine.includes('renderScanSnapshot'),'SCAN: high-resolution snapshot render missing');
check(scanEngine.includes('paintScanBand'),'SCAN: per-scanline capture missing');
check(scanEngine.includes('SCAN_DIRECTIONS')&&scanEngine.includes('randomizeScanParams'),'SCAN: interactive directions/randomize missing');
check(!scan.includes('DitherTool')&&!scanEngine.includes('DitherTool'),'SCAN: removed DITHER referenced');
check(css.includes('.scanShell:before'),'SCAN: workspace reset styles missing');

// DITHER must not ship in the clean five-tool build
check(!exists('components/DitherTool.js'),'CLEANUP: DitherTool still exists');
check(!shell.includes("id:'dither'")&&!shell.includes("screen==='dither'")&&!shell.includes("dither:'DITHER'"),'CLEANUP: DITHER remains in AppShell');
const continuePanel=read('components/ContinuePanel.js');
check(!continuePanel.includes('dither')&&!continuePanel.includes('DITHER'),'CLEANUP: DITHER remains in CONTINUE');
check(!css.includes('data-mode="dither"')&&!css.includes('.ditherStage')&&!css.includes('.ditherCanvas'),'CLEANUP: DITHER styles remain');
check(!hover.includes("mode==='dither'")&&!hover.includes('ditherSample'),'CLEANUP: DITHER hover logic remains');
check(!visualAudit.includes('DITHER'),'CLEANUP: DITHER remains in static visual audit');

// 4.79 regression: independently positioned ECHO and SCAN cards
check(css.includes('/* v4.79: 6-card catalog system'),'INDEX: 6-card catalog grid rules missing');
check(css.includes('data-mode="echo"]{grid-column:1/span 6!important;grid-row:3!important}')&&css.includes('data-mode="scan"]{grid-column:7/span 6!important;grid-row:3!important}'),'INDEX: ECHO and SCAN must occupy separate tiles');
check(scan.includes('RANDOMIZE ↯')&&scan.includes('start(true)'),'SCAN: randomize must start a new scan');
check(scanEngine.includes('function finishBand')&&scanEngine.includes('SCAN-GRAIN')===false,'SCAN: missing grain engine or legacy grain remains');
check(css.includes('.toolCard[data-mode="echo"] {\n    grid-column: 1 / span 6;\n    grid-row: 3;'),'INDEX: ECHO not positioned in its own desktop cell');
check(css.includes('.toolCard[data-mode="scan"] {\n    grid-column: 7 / span 6;\n    grid-row: 3;'),'INDEX: SCAN not positioned in its own desktop cell');
check(css.includes('@media (max-width: 760px) {\n  .catalogIndex .minimalModes.toolGrid > .minimalMode.toolCard[data-mode="echo"],'),'INDEX: ECHO/SCAN mobile stacking missing');
check(shell.includes("{id:'echo',n:'06'")&&shell.includes("{id:'scan',n:'07'"),'INDEX: both ECHO and SCAN must remain in catalog');

// v4.80: regression tests for scrolling and genuine opaque strip capture
check(css.includes('.catalogIndex.indexMinimal{animation:none!important;transform:none!important}'),'SCROLL: animated containing block still traps wheel over catalog cards');
check(css.includes('overscroll-behavior:auto!important'),'SCROLL: nested catalog overscroll fix missing');
check(shell.includes('const [hovered,setHovered]=useState(null)'),'INDEX: hovered tool state missing');
check(shell.includes('const active=MODES.find(m=>m.id===hovered)||MODES[0]'),'INDEX: dynamic background word missing');
check(shell.includes('onMouseEnter={()=>setHovered(m.id)}')&&shell.includes('onFocus={()=>setHovered(m.id)}'),'INDEX: background word does not respond to hovered/focused cards');
check(shell.includes('onMouseLeave={()=>setHovered(null)}'),'INDEX: background word does not reset when leaving the catalog');
check(shell.includes('onWheelCapture={()=>setHovered(null)}'),'SCROLL: background hover state should clear on wheel scroll');
check(!hover.includes('getImageData')&&!hover.includes('requestAnimationFrame('),'SCROLL: expensive hover loops still present');
check(scanEngine.includes('ctx.fillStyle=SCAN_PAPER')&&scanEngine.includes('ctx.fillRect(lo,0,hi-lo,h)'),'SCAN: scanned strips must overwrite old pixels');
check(!scanEngine.includes('ctx.globalAlpha=.85'),'SCAN: original still previewed as transparent ghost');
check(!scanEngine.includes('b[pos+k]*(1-mix)'),'SCAN: blended original still visible behind captured image');
check(scanEngine.includes('const effect=pct(params.effect);')&&scanEngine.includes('effectiveView'),'SCAN: effect strength not applied to geometric motion');
check(scanEngine.includes('baseView});'),'SCAN: high-resolution output missing same base motion reference');



// v4.85: GLASS texture cleanup preserved + tactile CSS hover
const glass=read('components/GlassTool.js');
const glassEngine=read('lib/glassEngine.js');
check(shell.includes("import GlassTool from './GlassTool'"),'GLASS: AppShell import missing');
check(shell.includes("id:'glass',n:'05'"),'GLASS: catalog renumbering missing');
check(shell.includes("screen==='glass'"),'GLASS: route missing');
check(shell.includes("glass:'GLASS'"),'GLASS: analytics event mapping missing');
check(read('components/ContinuePanel.js').includes("id:'glass',label:'TO GLASS'"),'GLASS: CONTINUE target missing');
check(glass.includes("onContinue?.('glass',target"),'GLASS: outgoing CONTINUE missing');
check(glass.includes('SEND TO EDITOR')&&glass.includes('PNG α'),'GLASS: export or editor handoff missing');
check(glass.includes('showGuides')&&glassEngine.includes('if(!showGuides)return;'),'GLASS: lens overlay toggle missing');
check(glassEngine.includes('exportGlassCanvas')&&!glassEngine.includes('FROSTED'),'GLASS: FROSTED still available');
check(!glass.includes('GLASS_MODES')&&!glassEngine.includes('SATIN')&&!glassEngine.includes('PRISM')&&!glassEngine.includes('LIQUID'),'GLASS: retired modes still active');
check(glassEngine.includes('showSurface:showGuides')&&glass.includes('showSurface:showGuidesRef.current'),'GLASS: clean HUD must affect preview and export');
check(glass.includes('sourceHasAlpha')&&glassEngine.includes('transparent,showSurface:showGuides'),'GLASS: transparent image preview missing');
check(!glass.includes("track('tool_open'"),'ANALYTICS: GLASS double-counts tool opens');
check(visualAudit.includes('data-mode="glass"'),'QA: static catalog audit missing GLASS');
check(css.includes('.catalogIndex .minimalModes.toolGrid>.toolCard:is(:hover,:focus-visible)'),'INDEX: shared light hover missing');
check(css.includes('transform:translate3d(-4px,-4px,0)!important')&&css.includes('transition:transform .18s cubic-bezier(.2,.8,.2,1)'),'INDEX: catalog card movement/transition mismatch');

// v4.87: visual and internal numbering of the three last tools.
const numbered=[['glass','05','GLASS','components/GlassTool.js'],['echo','06','ECHO','components/EchoTool.js'],['scan','07','SCAN','components/ScanTool.js']];
for(const [id,n,label,file] of numbered){
  check(shell.includes(`id:'${id}',n:'${n}'`),`${label}: catalog number must be ${n}`);
  check(read(file).includes(`1337TOOLS / ${n} ${label} /`),`${label}: workspace header must be ${n}`);
  check(visualAudit.includes(`data-mode="${id}"><span class="modeNo">${n}</span>`),`${label}: visual audit number must be ${n}`);
}
check(shell.indexOf("id:'glass',n:'05'")<shell.indexOf("id:'echo',n:'06'") && shell.indexOf("id:'echo',n:'06'")<shell.indexOf("id:'scan',n:'07'"),'INDEX: GLASS, ECHO, SCAN should follow visual order');

// v4.86 user feedback: maintain separate entry/return paths and true-blue palette.
check(shell.includes("const [indexOrigin,setIndexOrigin]=useState('tool')"),'ENTRY: navigation-origin state missing');
check(shell.includes("function showIndex(){setIndexOrigin('tool');setScreen('index')}"),'ENTRY: fast tool → index route missing');
check(shell.includes("setIndexOrigin('entry')")&&shell.includes('className="indexEntryCurtain"'),'ENTRY: gradual landing reveal not wired');
check(css.includes('animation:indexEntryReveal .46s')&&css.includes('pointer-events:none;'),'ENTRY: delayed non-blocking reveal not configured');
check(css.includes('--blue:#0038ff;--blue-dark:#0028c8;--blue-deep:#001a86'),'COLOR: primary palette not fixed');
check(read('app/manifest.js').includes("theme_color:'#0038ff'"),'COLOR: PWA theme not synced');
check(read('app/layout.js').includes("themeColor:'#0038ff'"),'COLOR: browser theme not synced');
check(css.includes('.catalogIndex.indexMinimal{animation:none!important;transform:none!important}'),'SCROLL: catalog transform animation must remain disabled');

// v4.92: deeper blue palette and BLUE background preset consistency.
for(const file of ['components/CollageEditor.js','components/EchoTool.js','components/FieldTool.js']){
  check(read(file).includes("'#0038ff'"),`${file}: BLUE preset not synchronized`);
}
check(!read('app/globals.css').includes('--blue:#0052f5'),'COLOR: old primary blue still active');


// v4.92: visual brand consistency and proper null paints.
check(css.includes('/* v4.90 — one canonical cobalt across splash, catalog and tool chrome.'),'BLUE: canonical site-wide override missing');
check(!css.includes('.catalogIndex .minimalModes.toolGrid>.toolCard:not(:hover):not(:focus-visible)'),'INDEX: solid blue fill override still active');
check(css.includes('.catalogIndex .catalogAtmosphere{opacity:0!important}'),'BLUE: old overlay haze still active');
check(css.includes('/* v4.91 — restore translucent catalog surfaces from v4.82–v4.88.'),'INDEX: translucent card restore marker missing');
check(css.includes('background:rgba(255,255,255,.065)!important'),'INDEX: missing translucent base fill');
check(css.includes('backdrop-filter:blur(5px) saturate(105%)!important'),'INDEX: missing glass treatment');
check(css.includes('toolCard[data-mode="editor"]{'),'INDEX: editor card should retain individual tint');
check(editor.includes('function ColorControl')&&editor.includes('>NONE</button>')&&editor.includes('>COLOR</button>'),'EDITOR PAINT: explicit COLOR / NONE picker actions missing');
check(editor.includes('onClick={()=>setPaint(null)}'),'EDITOR PAINT: null selection missing');
check(editor.includes("('fill' in patch?patch.fill:l.fill)")&&editor.includes("('stroke' in patch?patch.stroke:l.stroke)"),'EDITOR PAINT: stamped NONE becomes old color on edits');
check(editor.includes('value={f.halftoneColor}'),'EDITOR PAINT: halftone NONE erroneously coerced to black');
check(read('components/layers/TextLayer.js').includes('<TextLines l={l} fill="none" stroke={outline}'),'EDITOR PAINT: outside stroke fills glyphs when fill is NONE');
check(read('lib/effects.js').includes("opts.color===null"),'EDITOR PAINT: halftone NONE fallback not fixed');
if(failures.length){
  console.error(`AUDIT FAILED (${failures.length})`);
  for(const f of failures)console.error(`- ${f}`);
  process.exit(1);
}
console.log(`AUDIT OK · ${VERSION} · ${jsFiles.length} JS files · ${Object.keys(tools).length+2} tools checked`);

