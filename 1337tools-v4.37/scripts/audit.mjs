import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const VERSION='4.37';
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
check(shell.includes('<span>4.37</span>'),'INDEX: version is not 4.37');
check((shell.match(/4\.37/g)||[]).length===1,'INDEX: version should appear only once in AppShell');
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
for(const fx of ['asciiSquare','asciiBraille','asciiBlock','outline','tiles'])check(entry.includes(fx),`ENTRY: ${fx} route/effect missing`);
check(entry.includes('commitStage'),'ENTRY: completed-stage cache optimization missing');

const hover=read('components/ModeHoverLabel.js');
check(hover.includes('if(!active)return;'),'INDEX hover effects: idle RAF guard missing');
check(hover.includes('asciiSample'),'INDEX hover ASCII: sample canvas reuse missing');

const css=read('app/globals.css');
check(css.includes('.creditsScreen'),'CREDITS: styles missing');
check(css.includes('.catalogFooter'),'INDEX: credits footer styles missing');


check(css.includes('/* 4.37 — interaction cleanup / stable controls */'),'VISUAL: 4.37 interaction marker missing');
check(css.includes('.minimalMode.toolCard:last-child:nth-child(odd)'),'INDEX: odd last card full-row rule missing');
check(css.includes('.microHudGroup.open>.microHudToggle span'),'HUD: editorial active-section label missing');
check(css.includes('/* Sliders: ordinary, static and consistent everywhere. */'),'HUD: static slider system missing');

check(shell.includes('className="catalogAtmosphere"'),'VISUAL: layered catalog atmosphere missing');
check(shell.includes('className="modeMeta"'),'INDEX: editorial tool metadata missing');
check(css.includes('.minimalMode.toolCard:before,.minimalMode.toolCard:after{content:none!important}'),'INDEX: old corner decorations not disabled');
check(css.includes('.fieldShell:before{content:"FIELD"}'),'HUD: large background tool typography missing');
check(css.includes('fieldHero::after'),'HUD: stripe cleanup selectors missing');
check(!shell.includes('choose a mode / break a layout / keep moving'),'INDEX: secondary catalog tagline still present');
check(shell.includes('visual processing system'),'INDEX: visual processing system descriptor missing');
check(hover.includes("ctx.fillStyle='#ffffff'"),'INDEX: hover transformation is not white');
check(!entry.includes("const EFFECTS=['slice','ascii','asciiSquare','asciiBraille','asciiBlock','distress','echo','pixel','columns','outline','tiles','scan']"),'ENTRY: unstable scan-heavy grammar still active');

const pkg=JSON.parse(read('package.json'));
check(pkg.version==='0.4.37','package.json: stale version');
check(pkg.scripts?.audit==='node scripts/audit.mjs','package.json: audit script missing');

if(failures.length){
  console.error(`AUDIT FAILED (${failures.length})`);
  for(const f of failures)console.error(`- ${f}`);
  process.exit(1);
}
console.log(`AUDIT OK · ${VERSION} · ${jsFiles.length} JS files · ${Object.keys(tools).length+1} tools checked`);
