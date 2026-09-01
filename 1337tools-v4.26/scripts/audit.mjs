import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const VERSION='4.26';
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
  check(txt.includes(`4.26 /`),`${name}: stale version label`);
  check(txt.includes('MicroHudGroup'),`${name}: missing collapsible HUD groups`);
  check(txt.includes('ContinuePanel'),`${name}: missing CONTINUE`);
  check(txt.includes("PNG α"),`${name}: missing transparent PNG action`);
  check(txt.includes('RATIOS'),`${name}: missing shared ratio contract`);
  check(txt.includes('onHome'),`${name}: missing home navigation`);
  check(txt.includes('loadSeq'),`${name}: missing image-load race guard`);
}

const editor=read('components/CollageEditor.js');
check(editor.includes("text:'1337'"),'EDITOR: Stamp default text is not 1337');
check(editor.includes('updateStampedShape'),'EDITOR: stamped shape style updater missing');
check(editor.includes('value={stamp.fill}')&&editor.includes('value={stamp.stroke}'),'EDITOR: Stamp shape Fill/Stroke controls missing');
check((editor.match(/function clearCanvas\s*\(/g)||[]).length===1,'EDITOR: duplicate clearCanvas handler');
check(editor.includes('4.26 / 04 EDITOR'),'EDITOR: stale version label');

const shell=read('components/AppShell.js');
check(shell.includes('<div className="indexCredit">by <b>stillnotlove</b></div>'),'INDEX: by stillnotlove credit missing');
check(shell.includes('<span>4.26</span>'),'INDEX: stale version label');

const entry=read('components/EntryLiveMark.js');
for(const fx of ['asciiSquare','asciiBraille','asciiBlock','outline','tiles'])check(entry.includes(fx),`ENTRY: ${fx} route/effect missing`);
check(entry.includes('commitStage'),'ENTRY: completed-stage cache optimization missing');

const hover=read('components/ModeHoverLabel.js');
check(hover.includes('if(!active)return;'),'INDEX hover effects: idle RAF guard missing');
check(hover.includes('asciiSample'),'INDEX hover ASCII: sample canvas reuse missing');

const pkg=JSON.parse(read('package.json'));
check(pkg.version==='0.4.26','package.json: stale version');
check(pkg.scripts?.audit==='node scripts/audit.mjs','package.json: audit script missing');

if(failures.length){
  console.error(`AUDIT FAILED (${failures.length})`);
  for(const f of failures)console.error(`- ${f}`);
  process.exit(1);
}
console.log(`AUDIT OK · ${VERSION} · ${jsFiles.length} JS files · ${Object.keys(tools).length+1} tools checked`);
