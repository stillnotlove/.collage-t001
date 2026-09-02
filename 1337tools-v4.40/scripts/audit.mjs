import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const VERSION='4.40';
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

const shell=read('components/AppShell.js');
check(shell.includes('<span>4.40</span>'),'INDEX: version is not 4.40');
check((shell.match(/4\.40/g)||[]).length===1,'INDEX: version should appear only once in AppShell');
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
check(entry.includes("const ASCII_VARIANTS=['glyph','block','braille','square']"),'ENTRY: ASCII variant pool missing');
check(entry.includes("phase='sliceIn'"),'ENTRY: animated SLICE phase missing');
check(entry.includes("phase='sliceToAscii'"),'ENTRY: SLICE → ASCII transition missing');
check(entry.includes("phase='asciiToAscii'"),'ENTRY: ASCII → ASCII transition missing');
check(entry.includes("phase='returnClean'"),'ENTRY: final return-to-clean phase missing');
check(entry.includes('renderSlice(canvas,cycleData.sliceSeed,p)'),'ENTRY: SLICE does not animate progressively');
check(entry.includes('renderAscii(asciiA')&&entry.includes('renderAscii(asciiB'),'ENTRY: two pre-rendered ASCII states missing');
check(!entry.includes('renderOutline'),'ENTRY: heavy outline renderer returned');
check(!entry.includes('renderTiles'),'ENTRY: heavy tiles renderer returned');
check(!entry.includes("'echo'")&&!entry.includes("'pixel'")&&!entry.includes("'columns'")&&!entry.includes("'distress'"),'ENTRY: non-requested main effects remain');
check(entry.includes('ctx.clearRect(0,0,size.w,size.h)'),'ENTRY: frame-level canvas clear missing');
check(entry.includes("phase='cleanHold'"),'ENTRY: clean hold state missing');

const hover=read('components/ModeHoverLabel.js');
check(hover.includes('if(!active)return;'),'INDEX hover effects: idle RAF guard missing');
check(hover.includes('asciiSample'),'INDEX hover ASCII: sample canvas reuse missing');

const css=read('app/globals.css');
check(css.includes('.creditsScreen'),'CREDITS: styles missing');
check(css.includes('.catalogFooter'),'INDEX: credits footer styles missing');


check(css.includes('/* 4.40 — smooth entry sequence / editable editor canvas / dotted descriptor */'),'VISUAL: 4.40 marker missing');
check(css.includes('.minimalMode.toolCard:last-child:nth-child(odd)'),'INDEX: odd last card full-row rule missing');
check(css.includes('.microHudGroup.open>.microHudToggle span'),'HUD: editorial active-section label missing');
check(css.includes('border-radius:50%!important'),'HUD: circular static slider thumbs missing');

check(shell.includes('className="catalogAtmosphere"'),'VISUAL: layered catalog atmosphere missing');
check(shell.includes('className="modeMeta"'),'INDEX: editorial tool metadata missing');
check(css.includes('.minimalMode.toolCard:before,.minimalMode.toolCard:after{content:none!important}'),'INDEX: old corner decorations not disabled');
check(css.includes('.fieldShell:before{content:"FIELD"}'),'HUD: large background tool typography missing');
check(css.includes('fieldHero::after'),'HUD: stripe cleanup selectors missing');
check(!shell.includes('choose a mode / break a layout / keep moving'),'INDEX: secondary catalog tagline still present');
check(shell.includes('visual processing system'),'INDEX: visual processing system descriptor missing');
check(hover.includes("ctx.fillStyle='#ffffff'"),'INDEX: hover transformation is not white');


check(css.includes('--brand-tools-gap:2px'),'BRAND: tools gap is not restored');
check(css.includes("font-weight:200!important")&&css.includes('.credits1337'),'CREDITS: 1337 is not light like tools');
check(css.includes('radial-gradient(circle,var(--yellow) 0 1.45px'),'HUD: dotted section marker missing');
check(css.includes('box-shadow:none!important'),'INDEX: idle card underlay is not disabled');
check(css.includes('box-shadow:6px 6px 0 rgba(255,255,255,.42)!important'),'INDEX: hover card underlay missing');
for(const file of ['components/SliceTool.js','components/AsciiTool.js','components/EchoTool.js','components/FieldTool.js']){
  const txt=read(file);
  check(!/function (?:SliceRange|AsciiRange|EchoRange|SimpleRange)[\s\S]{0,220}<b>\{value\}<\/b>/.test(txt),`${file}: duplicated range value remains in header`);
}

check(editor.includes('function changeBg(nextBg)'),'EDITOR: background history/preset updater missing');
check(editor.includes("'--canvas-bg':bg"),'EDITOR: canvas background CSS variable missing');
check(editor.includes('editorBgPresets'),'EDITOR: canvas background presets missing');
check(css.includes('background:var(--canvas-bg,#f0ede4)!important'),'EDITOR: canvas background is still visually overridden');
check(css.includes('.catalogPrelude:after')&&css.includes('radial-gradient(circle,var(--white)'),'INDEX: descriptor dots missing');

const pkg=JSON.parse(read('package.json'));
check(pkg.version==='0.4.40','package.json: stale version');
check(pkg.scripts?.audit==='node scripts/audit.mjs','package.json: audit script missing');

if(failures.length){
  console.error(`AUDIT FAILED (${failures.length})`);
  for(const f of failures)console.error(`- ${f}`);
  process.exit(1);
}
console.log(`AUDIT OK · ${VERSION} · ${jsFiles.length} JS files · ${Object.keys(tools).length+1} tools checked`);
