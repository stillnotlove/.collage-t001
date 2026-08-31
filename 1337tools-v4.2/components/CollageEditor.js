'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,blends,shapes,fonts,uid,clamp,randSigned,snap,nextOrder,normalizeOrder,getBounds,intersectsMarquee} from '../lib/editorCore';
import {fx0,experimentalCutout} from '../lib/effects';
import {exportScene} from '../lib/exportScene';
import ImageLayer from './layers/ImageLayer';
import ShapeLayer from './layers/ShapeLayer';
import TextLayer from './layers/TextLayer';

export default function CollageEditor({initialFile=null,onSwitchField}){
  const [layers,setLayers]=useState([]);
  const [selectedIds,setSelectedIds]=useState([]);
  const [primaryId,setPrimaryId]=useState(null);
  const [ratio,setRatio]=useState('4 / 5');
  const [bg,setBg]=useState('#f0ede4');
  const [tool,setTool]=useState('select');
  const [history,setHistory]=useState([]);
  const [future,setFuture]=useState([]);
  const [dragOver,setDragOver]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [cutting,setCutting]=useState(false);
  const [repeat,setRepeat]=useState({count:8,spacing:7,angle:0,scale:0,opacity:0,chaos:10});
  const [randomSelectedChaos,setRandomSelectedChaos]=useState(45);
  const [stamp,setStamp]=useState({type:'text',text:'VOID',size:22,spacing:18,chaos:10,rotationJitter:20,scaleJitter:0,opacityJitter:0,follow:false,fontFamily:fonts[1][0],fontWeight:700,color:'#111111',tracking:0,outline:0,outlineColor:'#111111'});
  const [marquee,setMarquee]=useState(null);

  const canvas=useRef(null),fileRef=useRef(null),gesture=useRef(null),before=useRef(null),brush=useRef(null),variationBase=useRef(null),controlBefore=useRef(null),ownedUrls=useRef(new Set()),keyActions=useRef(null),marqueeLive=useRef(null),suppressCanvasClick=useRef(false),initialLoaded=useRef(false);
  const selected=useMemo(()=>layers.find(l=>l.id===primaryId)||null,[layers,primaryId]);
  const selectedLayers=useMemo(()=>layers.filter(l=>selectedIds.includes(l.id)),[layers,selectedIds]);
  const multiBounds=useMemo(()=>getBounds(selectedLayers),[selectedLayers]);
  const doc=RATIOS[ratio]||RATIOS['4 / 5'];
  const imageEffectKeys=['threshold','grain','noise','halftone','xerox','fade'];

  const currentSnap=()=>snap(layers,selectedIds,primaryId);
  const ownUrl=blob=>{const url=URL.createObjectURL(blob);ownedUrls.current.add(url);return url};
  const restore=s=>{setLayers(s.layers||[]);setSelectedIds(s.selectedIds||[]);setPrimaryId(s.primaryId||null);variationBase.current=null};
  const setSelection=(ids,primary=ids.at(-1)||null)=>{setSelectedIds(ids);setPrimaryId(primary)};

  function commit(next,nextSelection=selectedIds,nextPrimary=primaryId,{preserveVariation=false}={}){
    const prev=currentSnap(),after=snap(next,nextSelection,nextPrimary);
    if(prev!==after){setHistory(h=>[...h.slice(-39),prev]);setFuture([])}
    setLayers(next);setSelectedIds(nextSelection);setPrimaryId(nextPrimary);
    if(!preserveVariation)variationBase.current=null;
  }
  function patchLive(id,p){variationBase.current=null;setLayers(ls=>ls.map(l=>l.id===id?{...l,...p}:l))}
  function patchFxLive(id,k,v){variationBase.current=null;setLayers(ls=>ls.map(l=>l.id===id?{...l,fx:{...fx0,...l.fx,[k]:v}}:l))}
  function patchSelectedLive(fn){variationBase.current=null;setLayers(ls=>ls.map(l=>selectedIds.includes(l.id)?fn(l):l))}
  function beginControl(){if(!controlBefore.current)controlBefore.current=currentSnap()}
  function endControl(){
    if(!controlBefore.current)return;
    const prev=controlBefore.current,now=currentSnap();controlBefore.current=null;
    if(prev!==now){setHistory(h=>[...h.slice(-39),prev]);setFuture([])}
  }
  function undo(){if(!history.length)return;const p=JSON.parse(history.at(-1));setFuture(f=>[currentSnap(),...f].slice(0,40));setHistory(h=>h.slice(0,-1));restore(p)}
  function redo(){if(!future.length)return;const n=JSON.parse(future[0]);setHistory(h=>[...h,currentSnap()].slice(-40));setFuture(f=>f.slice(1));restore(n)}
  function selectAll(){const ids=layers.filter(l=>!l.hidden).map(l=>l.id);setSelection(ids,ids.at(-1)||null)}

  keyActions.current={selectAll,undo,redo,duplicate,remove,clearSelection:()=>setSelection([])};
  useEffect(()=>{
    const fn=e=>{
      const meta=e.metaKey||e.ctrlKey,tag=document.activeElement?.tagName,a=keyActions.current;
      if(meta&&e.key.toLowerCase()==='a'&&!['INPUT','TEXTAREA','SELECT'].includes(tag)){e.preventDefault();a.selectAll()}
      if(meta&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?a.redo():a.undo()}
      if(meta&&e.key.toLowerCase()==='d'){e.preventDefault();a.duplicate()}
      if((e.key==='Delete'||e.key==='Backspace')&&!['INPUT','TEXTAREA'].includes(tag)){e.preventDefault();a.remove()}
      if(e.key==='Escape')a.clearSelection();
    };
    window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);
  },[]);

  useEffect(()=>{
    const onPaste=async e=>{
      const tag=document.activeElement?.tagName;
      if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;
      const dt=e.clipboardData;if(!dt)return;
      const files=[...dt.files].filter(f=>f.type.startsWith('image/'));
      if(files.length){e.preventDefault();await addFiles(files);return}
      const items=[...dt.items];
      const imageItem=items.find(i=>i.type.startsWith('image/'));
      if(imageItem){const file=imageItem.getAsFile();if(file){e.preventDefault();await addFiles([file]);return}}
      const html=dt.getData('text/html')||'';
      const src=(html.match(/<img[^>]+src=["']([^"']+)["']/i)||[])[1]||'';
      const url=(src||dt.getData('text/plain')||'').trim();
      if(/^https?:/i.test(url) && /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(url)){
        try{e.preventDefault();const r=await fetch(url);const b=await r.blob();const ext=(b.type.split('/')[1]||'png').replace('jpeg','jpg');const f=new File([b],`pasted.${ext}`,{type:b.type||'image/png'});await addFiles([f]);}catch(err){console.warn('paste image fetch failed',err)}
      }
    };
    window.addEventListener('paste',onPaste);return()=>window.removeEventListener('paste',onPaste);
  },[layers]);

  useEffect(()=>()=>{for(const url of ownedUrls.current)URL.revokeObjectURL(url);ownedUrls.current.clear()},[]);

  useEffect(()=>{if(initialFile&&!initialLoaded.current){initialLoaded.current=true;addFiles([initialFile])}},[initialFile]);

  async function addFiles(list){
    const files=[...(list||[])].filter(f=>f.type.startsWith('image/')),adds=[];let order=nextOrder(layers);
    for(const f of files){
      const src=ownUrl(f);
      try{
        const d=await imgSize(src),ar=d.width/d.height;
        adds.push({id:uid(),type:'image',name:f.name,src,originalSrc:src,local:true,x:50,y:50,width:ar>=1?38:clamp(38*ar,16,38),height:ar>=1?clamp(38/ar,16,38):38,rotation:0,opacity:1,blend:'normal',hidden:false,locked:false,order:order++,fit:'cover',radius:0,fx:{...fx0},fxSeed:Math.floor(Math.random()*1e9)});
      }catch{URL.revokeObjectURL(src);ownedUrls.current.delete(src)}
    }
    if(adds.length){const ids=adds.map(a=>a.id);commit([...layers,...adds],ids,ids.at(-1))}
  }
  function addText(text='YOUR TEXT'){
    const l={id:uid(),type:'text',text,x:50,y:50,width:55,height:18,rotation:0,opacity:1,blend:'normal',hidden:false,locked:false,order:nextOrder(layers),color:'#111111',fontFamily:fonts[0][0],fontSize:64,fontWeight:800,tracking:-2,lineHeight:.9,scaleX:1,scaleY:1,outline:0,outlineColor:'#111111',outlineMode:'center'};
    commit([...layers,l],[l.id],l.id);
  }
  function addShape(shape='rect'){
    const l={id:uid(),type:'shape',shape,x:50,y:50,width:shape==='line'?44:28,height:shape==='line'?7:28,rotation:0,opacity:1,blend:'normal',hidden:false,locked:false,order:nextOrder(layers),fill:'#111111',stroke:'#111111',strokeWidth:0,lineCap:'round'};
    commit([...layers,l],[l.id],l.id);
  }
  function remove(){
    if(!selectedIds.length)return;
    commit(normalizeOrder(layers.filter(l=>!selectedIds.includes(l.id))),[],null);
  }
  function duplicate(){
    if(!selectedIds.length)return;
    const chosen=layers.filter(l=>selectedIds.includes(l.id)).sort((a,b)=>a.order-b.order),base=nextOrder(layers);
    const copies=chosen.map((l,i)=>({...l,id:uid(),x:clamp(l.x+4,-20,120),y:clamp(l.y+4,-20,120),order:base+i,fxSeed:l.fxSeed?l.fxSeed+i+1:l.fxSeed}));
    const ids=copies.map(c=>c.id);commit([...layers,...copies],ids,ids.at(-1));
  }
  function front(){
    if(!selectedIds.length)return;const sorted=[...layers].sort((a,b)=>a.order-b.order),set=new Set(selectedIds);
    commit(normalizeOrder([...sorted.filter(l=>!set.has(l.id)),...sorted.filter(l=>set.has(l.id))]),selectedIds,primaryId);
  }
  function back(){
    if(!selectedIds.length)return;const sorted=[...layers].sort((a,b)=>a.order-b.order),set=new Set(selectedIds);
    commit(normalizeOrder([...sorted.filter(l=>set.has(l.id)),...sorted.filter(l=>!set.has(l.id))]),selectedIds,primaryId);
  }
  function moveSelectionStep(dir){
    if(!selectedIds.length)return;
    const s=[...layers].sort((a,b)=>a.order-b.order),set=new Set(selectedIds);
    if(dir>0){for(let i=s.length-2;i>=0;i--)if(set.has(s[i].id)&&!set.has(s[i+1].id))[s[i],s[i+1]]=[s[i+1],s[i]]}
    else{for(let i=1;i<s.length;i++)if(set.has(s[i].id)&&!set.has(s[i-1].id))[s[i],s[i-1]]=[s[i-1],s[i]]}
    commit(normalizeOrder(s),selectedIds,primaryId);
  }
  function reorder(id,dir){
    const s=[...layers].sort((a,b)=>a.order-b.order),i=s.findIndex(l=>l.id===id),j=clamp(i+dir,0,s.length-1);if(i===j)return;
    [s[i],s[j]]=[s[j],s[i]];commit(normalizeOrder(s),selectedIds.includes(id)?selectedIds:[id],selectedIds.includes(id)?primaryId:id);
  }
  function repeatSelected(params=repeat){
    if(!selected)return;const copies=[],c=Math.pow(params.chaos/100,.72),base=nextOrder(layers);
    for(let i=1;i<=params.count;i++){
      const progress=i/params.count,scatter=2+20*c*c,scaleChaos=1+randSigned()*.65*c*c;
      copies.push({...selected,id:uid(),x:clamp(selected.x+i*params.spacing/2+randSigned()*scatter,-20,120),y:clamp(selected.y+randSigned()*scatter,-20,120),rotation:selected.rotation+i*params.angle+randSigned()*170*c*c,width:clamp(selected.width*(1+params.scale*progress/100)*scaleChaos,2,160),height:clamp(selected.height*(1+params.scale*progress/100)*scaleChaos,2,160),opacity:clamp((selected.opacity-params.opacity*progress/100)*(1-Math.random()*.6*c*c),.05,1),order:base+i-1,fxSeed:selected.fxSeed?selected.fxSeed+i:selected.fxSeed});
    }
    const ids=copies.map(c=>c.id);commit([...layers,...copies],ids,ids.at(-1)||primaryId);
  }
  function randomRepeat(){
    const params={
      count:Math.round(4+Math.random()*20),
      spacing:Math.round(-8+Math.random()*22),
      angle:Math.round(-24+Math.random()*48),
      scale:Math.round(-40+Math.random()*140),
      opacity:Math.round(Math.random()*75),
      chaos:Math.round(15+Math.random()*85)
    };
    setRepeat(params);repeatSelected(params);
  }
  function randomizeSelected(){
    if(!selectedIds.length)return;
    const c=clamp(randomSelectedChaos/100,0,1),strong=c*c,palette=['#111111','#ffffff','#0038ff','#ffd800'];
    const pick=a=>a[Math.floor(Math.random()*a.length)];
    const next=layers.map(l=>{
      if(!selectedIds.includes(l.id)||l.locked)return l;
      const scale=Math.exp(randSigned()*(.04+.52*c));
      const base={
        ...l,
        x:clamp(l.x+randSigned()*(1.5+20*strong),-20,120),
        y:clamp(l.y+randSigned()*(1.5+20*strong),-20,120),
        rotation:l.rotation+randSigned()*(4+145*strong),
        width:clamp(l.width*scale,2,160),
        height:clamp(l.height*scale,2,160),
        opacity:clamp(l.opacity*(1+randSigned()*(.05+.5*c)),.08,1),
        blend:Math.random()<.58*strong?pick(blends):l.blend
      };
      if(l.type==='image'){
        const f={...fx0,...l.fx};
        return {...base,fxSeed:Math.floor(Math.random()*1e9),fx:{
          ...f,
          exposure:clamp(Math.round(f.exposure+randSigned()*34*c),-50,50),
          contrast:clamp(Math.round(f.contrast+randSigned()*110*c),0,300),
          saturation:clamp(Math.round(f.saturation+randSigned()*105*c),0,250),
          grayscale:Math.random()<.32*strong?Math.round(Math.random()*100):f.grayscale,
          blur:Math.random()<.38*strong?Math.round(Math.random()*12*c):f.blur,
          threshold:Math.random()<.5*strong?Math.round(Math.random()*78):f.threshold,
          grain:Math.random()<.45*strong?Math.round(Math.random()*65):f.grain,
          noise:Math.random()<.72*c?Math.round(5+Math.random()*72):f.noise,
          halftone:Math.random()<.62*strong?Math.round(Math.random()*100):f.halftone,
          halftoneSize:Math.random()<.62*strong?Math.round(3+Math.random()*31):f.halftoneSize,
          halftoneDensity:Math.random()<.62*strong?Math.round(10+Math.random()*88):f.halftoneDensity,
          halftoneOpacity:Math.random()<.62*strong?Math.round(25+Math.random()*75):f.halftoneOpacity,
          halftoneAngle:Math.random()<.62*strong?Math.round(-70+Math.random()*140):f.halftoneAngle,
          halftoneColor:Math.random()<.18*strong?pick(['#000000','#ffffff','#0038ff','#ffd800']):f.halftoneColor,
          xerox:Math.random()<.38*strong?Math.round(Math.random()*65):f.xerox,
          fade:Math.random()<.3*strong?Math.round(Math.random()*42):f.fade
        }};
      }
      if(l.type==='text')return {...base,
        tracking:clamp(Math.round((l.tracking+randSigned()*12*c)*10)/10,-10,30),
        scaleX:clamp((l.scaleX||1)*(1+randSigned()*.42*c),.3,2.5),
        scaleY:clamp((l.scaleY||1)*(1+randSigned()*.42*c),.3,2.5),
        fontWeight:Math.random()<.38*strong?clamp(Math.round((100+Math.random()*800)/100)*100,100,900):l.fontWeight,
        fontFamily:Math.random()<.24*strong?pick(fonts)[0]:l.fontFamily,
        color:Math.random()<.16*strong?pick(palette):l.color,
        outlineColor:Math.random()<.12*strong?pick(palette):l.outlineColor
      };
      if(l.type==='shape')return {...base,
        fill:Math.random()<.2*strong?pick(palette):l.fill,
        stroke:Math.random()<.18*strong?pick(palette):l.stroke,
        strokeWidth:Math.random()<.32*strong?clamp(Math.round(Math.random()*14*c),0,20):l.strokeWidth
      };
      return base;
    });
    commit(next,selectedIds,primaryId);
  }
  function variation(){
    if(!layers.length)return;if(!variationBase.current)variationBase.current=JSON.parse(JSON.stringify(layers));
    const base=variationBase.current;
    const next=base.map(l=>{const scale=Math.exp(randSigned()*.45);return {...l,x:clamp(l.x+randSigned()*22,-20,120),y:clamp(l.y+randSigned()*22,-20,120),rotation:l.rotation+randSigned()*80,width:clamp(l.width*scale,2,160),height:clamp(l.height*scale,2,160)}});
    commit(next,selectedIds,primaryId,{preserveVariation:true});
  }
  function clearCanvas(){if(!layers.length)return;if(!confirm('Erase ALL layers? Ctrl/Cmd+Z restores them. Canvas settings stay.'))return;commit([],[],null)}

  function makeStamp(x,y,angle=0,order=1){
    const c=Math.pow(stamp.chaos/100,.68),strong=c*c,pos=1.5+13*strong,rotRange=stamp.rotationJitter*c+155*strong,scaleRange=(stamp.scaleJitter/100)*c+.72*strong,opacityRange=(stamp.opacityJitter/100)*c+.52*strong;
    const px=clamp(x+randSigned()*pos,-20,120),py=clamp(y+randSigned()*pos,-20,120),rot=angle+randSigned()*rotRange,scale=clamp(1+randSigned()*scaleRange,.18,2.4),opacity=clamp(1-Math.random()*opacityRange,.08,1);
    if(stamp.type==='text')return {id:uid(),type:'text',text:stamp.text||'STAMP',x:px,y:py,width:clamp(stamp.size*scale,2,120),height:10*scale,rotation:rot,opacity,blend:'multiply',hidden:false,locked:false,order,color:stamp.color||'#111111',fontFamily:stamp.fontFamily||fonts[1][0],fontSize:58,fontWeight:stamp.fontWeight||700,tracking:+stamp.tracking||0,lineHeight:.9,scaleX:1,scaleY:1,outline:+stamp.outline||0,outlineColor:stamp.outlineColor||stamp.color||'#111111',outlineMode:'center'};
    return {id:uid(),type:'shape',shape:stamp.type,x:px,y:py,width:clamp(stamp.size/2*scale,2,120),height:clamp(stamp.size/2*scale,2,120),rotation:rot,opacity,blend:'multiply',hidden:false,locked:false,order,fill:'#111',stroke:'#111',strokeWidth:0,lineCap:'round'};
  }
  function brushDown(e){
    if(tool==='select'&&e.target===canvas.current){
      e.preventDefault();const r=canvas.current.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;
      gesture.current={kind:'marquee',r,sx:x,sy:y,add:e.shiftKey,remove:e.altKey};const m={x,y,w:0,h:0};marqueeLive.current=m;setMarquee(m);canvas.current.setPointerCapture?.(e.pointerId);return;
    }
    if(tool!=='stamp')return;e.preventDefault();e.stopPropagation();const r=canvas.current.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100,order=nextOrder(layers),l=makeStamp(x,y,0,order);
    before.current=currentSnap();brush.current={r,lastX:e.clientX,lastY:e.clientY,lastAngle:0,ids:[l.id],nextOrder:order+1};setLayers(ls=>[...ls,l]);setSelection([l.id],l.id);canvas.current.setPointerCapture?.(e.pointerId);
  }
  function onLayerDown(e,l){
    if(tool==='stamp')return;e.stopPropagation();
    if(e.shiftKey){const ids=selectedIds.includes(l.id)?selectedIds.filter(id=>id!==l.id):[...selectedIds,l.id];setSelection(ids,ids.includes(l.id)?l.id:ids.at(-1));return}
    const ids=selectedIds.includes(l.id)?selectedIds:[l.id];setSelection(ids,l.id);if(l.locked)return;
    const r=canvas.current.getBoundingClientRect(),starts={};layers.filter(x=>ids.includes(x.id)&&!x.locked).forEach(x=>starts[x.id]={x:x.x,y:x.y});
    before.current=currentSnap();gesture.current={kind:'moveGroup',ids,sx:e.clientX,sy:e.clientY,starts,r};e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onHandle(e,l,h){
    e.stopPropagation();e.preventDefault();const r=canvas.current.getBoundingClientRect(),cx=r.left+r.width*l.x/100,cy=r.top+r.height*l.y/100;
    before.current=currentSnap();gesture.current={kind:h==='rotate'?'rotate':'resize',h,id:l.id,sx:e.clientX,sy:e.clientY,w:l.width,hgt:l.height,r,cx,cy};
  }
  function onGroupHandle(e,h){
    if(!multiBounds)return;e.stopPropagation();e.preventDefault();const r=canvas.current.getBoundingClientRect(),cx=r.left+r.width*multiBounds.cx/100,cy=r.top+r.height*multiBounds.cy/100,starts={};
    selectedLayers.filter(l=>!l.locked).forEach(l=>starts[l.id]={x:l.x,y:l.y,width:l.width,height:l.height,rotation:l.rotation});
    before.current=currentSnap();gesture.current={kind:h==='rotate'?'groupRotate':'groupResize',h,sx:e.clientX,sy:e.clientY,r,cx,cy,b:{...multiBounds},starts,startAngle:Math.atan2(e.clientY-cy,e.clientX-cx)};
  }
  function move(e){
    const b=brush.current;
    if(b&&tool==='stamp'){
      const dx=e.clientX-b.lastX,dy=e.clientY-b.lastY,dist=Math.hypot(dx,dy);
      if(dist>=stamp.spacing){
        const angle=stamp.follow?Math.atan2(dy,dx)*180/Math.PI:0,steps=Math.max(1,Math.floor(dist/stamp.spacing)),adds=[];
        for(let i=1;i<=steps;i++){const px=b.lastX+dx*i/steps,py=b.lastY+dy*i/steps,x=(px-b.r.left)/b.r.width*100,y=(py-b.r.top)/b.r.height*100;adds.push(makeStamp(x,y,angle,b.nextOrder++))}
        setLayers(ls=>[...ls,...adds]);b.ids.push(...adds.map(a=>a.id));b.lastX=e.clientX;b.lastY=e.clientY;b.lastAngle=angle;
      }
      return;
    }
    const g=gesture.current;if(!g)return;
    if(g.kind==='marquee'){const x=clamp((e.clientX-g.r.left)/g.r.width*100,0,100),y=clamp((e.clientY-g.r.top)/g.r.height*100,0,100),m={x:Math.min(g.sx,x),y:Math.min(g.sy,y),w:Math.abs(x-g.sx),h:Math.abs(y-g.sy)};marqueeLive.current=m;setMarquee(m);return}
    if(g.kind==='moveGroup'){const dx=(e.clientX-g.sx)/g.r.width*100,dy=(e.clientY-g.sy)/g.r.height*100;setLayers(ls=>ls.map(l=>g.starts[l.id]?{...l,x:clamp(g.starts[l.id].x+dx,-20,120),y:clamp(g.starts[l.id].y+dy,-20,120)}:l));return}
    if(g.kind==='groupResize'){
      const dx=(e.clientX-g.sx)/g.r.width*100*(g.h.includes('w')?-2:2),dy=(e.clientY-g.sy)/g.r.height*100*(g.h.includes('n')?-2:2);
      let sx=clamp((g.b.width+dx)/Math.max(g.b.width,.1),.08,8),sy=clamp((g.b.height+dy)/Math.max(g.b.height,.1),.08,8);if(e.shiftKey){const s=Math.abs(dx)>Math.abs(dy)?sx:sy;sx=s;sy=s}
      setLayers(ls=>ls.map(l=>{const s=g.starts[l.id];if(!s)return l;return {...l,x:g.b.cx+(s.x-g.b.cx)*sx,y:g.b.cy+(s.y-g.b.cy)*sy,width:clamp(s.width*sx,1,200),height:clamp(s.height*sy,1,200)}}));return;
    }
    if(g.kind==='groupRotate'){
      const a=Math.atan2(e.clientY-g.cy,e.clientX-g.cx),delta=(a-g.startAngle)*180/Math.PI,rad=delta*Math.PI/180;
      setLayers(ls=>ls.map(l=>{const s=g.starts[l.id];if(!s)return l;const dx=s.x-g.b.cx,dy=s.y-g.b.cy;return {...l,x:g.b.cx+dx*Math.cos(rad)-dy*Math.sin(rad),y:g.b.cy+dx*Math.sin(rad)+dy*Math.cos(rad),rotation:s.rotation+delta}}));return;
    }
    const l=layers.find(x=>x.id===g.id);if(!l||l.locked)return;
    if(g.kind==='resize'){
      let w=clamp(g.w+(e.clientX-g.sx)/g.r.width*100*(g.h.includes('w')?-2:2),2,160),h=clamp(g.hgt+(e.clientY-g.sy)/g.r.height*100*(g.h.includes('n')?-2:2),2,160);
      if(e.shiftKey){const ar=g.w/g.hgt;if(Math.abs(e.clientX-g.sx)>Math.abs(e.clientY-g.sy))h=w/ar;else w=h*ar}
      patchLive(g.id,{width:w,height:h});
    }
    if(g.kind==='rotate')patchLive(g.id,{rotation:Math.atan2(e.clientY-g.cy,e.clientX-g.cx)*180/Math.PI+90});
  }
  function up(){
    if(brush.current){if(before.current&&before.current!==currentSnap()){setHistory(h=>[...h.slice(-39),before.current]);setFuture([])}setSelection(brush.current.ids,brush.current.ids.at(-1));brush.current=null;before.current=null;variationBase.current=null;return}
    if(!gesture.current)return;const g=gesture.current;
    if(g.kind==='marquee'){
      const m=marqueeLive.current;if(m){const hits=layers.filter(l=>!l.hidden&&intersectsMarquee(l,m)).map(l=>l.id);const ids=g.add?[...new Set([...selectedIds,...hits])]:g.remove?selectedIds.filter(id=>!hits.includes(id)):hits;setSelection(ids,ids.at(-1)||null)}
      marqueeLive.current=null;setMarquee(null);gesture.current=null;suppressCanvasClick.current=true;return;
    }
    if(before.current&&before.current!==currentSnap()){setHistory(h=>[...h.slice(-39),before.current]);setFuture([])}gesture.current=null;before.current=null;variationBase.current=null;
  }
  function canvasClick(e){if(suppressCanvasClick.current){suppressCanvasClick.current=false;return}if(tool==='select'&&e.target===canvas.current&&!marquee&&!gesture.current)setSelection([])}

  async function cutout(){
    if(!selected||selected.type!=='image'||cutting)return;setCutting(true);
    try{
      const source=selected.originalSrc||selected.src,seed=Math.floor(Math.random()*1e9),blob=await experimentalCutout(source,seed),url=ownUrl(blob);
      const next=layers.map(l=>l.id===selected.id?{...l,src:url,originalSrc:l.originalSrc||l.src,cutout:true,cutoutSeed:seed}:l);commit(next,selectedIds,primaryId);
    }catch(err){console.error(err);alert('Cutout failed for this image. Try a local image or a clearer background.')}finally{setCutting(false)}
  }
  function restoreBackground(){
    if(!selected||selected.type!=='image'||!selected.originalSrc)return;const next=layers.map(l=>l.id===selected.id?{...l,src:l.originalSrc,cutout:false}:l);commit(next,selectedIds,primaryId);
  }
  function rerollAll(){
    if(!selected||selected.type!=='image')return;
    const chance=(max,p=.72)=>Math.random()<p?Math.round(Math.random()*max):0;
    const nextFx={
      ...fx0,
      exposure:Math.round(-24+Math.random()*48),
      contrast:Math.round(72+Math.random()*118),
      saturation:Math.round(55+Math.random()*135),
      grayscale:chance(100,.35),
      blur:Math.round(Math.random()*7),
      threshold:chance(62,.5),
      grain:chance(46,.55),
      noise:Math.round(6+Math.random()*58),
      halftone:chance(90,.68),
      halftoneSize:Math.round(4+Math.random()*25),
      halftoneDensity:Math.round(18+Math.random()*76),
      halftoneOpacity:Math.round(38+Math.random()*62),
      halftoneAngle:Math.round(-55+Math.random()*110),
      halftoneColor:Math.random()>.72?'#ffffff':'#000000',
      xerox:chance(50,.45),
      fade:chance(34,.35)
    };
    commit(layers.map(l=>l.id===selected.id?{...l,fxSeed:Math.floor(Math.random()*1e9),fx:nextFx}:l),selectedIds,primaryId);
  }

  async function exportImg(kind){
    setExporting(true);
    try{
      const blob=await exportScene(layers,{kind,background:bg,docWidth:doc.width,docHeight:doc.height});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`1337tools-${Date.now()}.${kind}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(err){console.error('1337tools export failed:',err);alert(`Экспорт не удался: ${err?.message||'неизвестная ошибка'}`)}finally{setExporting(false)}
  }

  const compatibleFill=selectedLayers.filter(l=>l.type==='shape'||l.type==='text');
  const compatibleStroke=compatibleFill;
  const imageSelection=selectedLayers.filter(l=>l.type==='image');
  const primaryImage=imageSelection[0];
  const groupFill=compatibleFill.find(l=>l.id===primaryId)||compatibleFill[0];
  const groupStroke=groupFill;
  const setGroupFill=v=>patchSelectedLive(l=>l.type==='shape'?{...l,fill:v}:l.type==='text'?{...l,color:v}:l);
  const setGroupStroke=v=>patchSelectedLive(l=>l.type==='shape'?{...l,stroke:v}:l.type==='text'?{...l,outlineColor:v}:l);
  const setGroupStrokeWidth=v=>patchSelectedLive(l=>l.type==='shape'?{...l,strokeWidth:+v}:l.type==='text'?{...l,outline:+v}:l);

  return <main className="shell">
    <aside className="panel left">
      <div className="brand" aria-label="1337tools"><span className="brand1337">1337</span><span className="brandTools">tools</span><small>LEGACY / STAGE CORE</small></div>{onSwitchField&&<button className="wide fieldBack" onClick={onSwitchField}>← FIELD</button>}
      <div className="toolGrid"><button className={tool==='select'?'active':''} onClick={()=>setTool('select')}>↖ Select</button><button className={tool==='stamp'?'active':''} onClick={()=>setTool('stamp')}>✣ Stamp</button><button onClick={()=>fileRef.current?.click()}>+ Image</button><button onClick={()=>addText()}>+ Text</button></div>
      <input ref={fileRef} hidden type="file" accept="image/*" multiple onChange={e=>{addFiles(e.target.files);e.target.value=''}}/>

      <HudGroup title="Shapes" storageKey="left-shapes">
        <div className="shapeButtons">{shapes.map(s=><button key={s} onClick={()=>addShape(s)}>{s}</button>)}</div>
      </HudGroup>

      {tool==='stamp'&&<HudGroup title="Stamp / Brush" storageKey="left-stamp" defaultOpen accent>
        <label>Source<select value={stamp.type} onChange={e=>setStamp({...stamp,type:e.target.value})}><option value="text">Text</option>{shapes.map(s=><option key={s}>{s}</option>)}</select></label>
        {stamp.type==='text'&&<>
          <label>Word<input value={stamp.text} onChange={e=>setStamp({...stamp,text:e.target.value})}/></label>
          <label>Font<select value={stamp.fontFamily} onChange={e=>setStamp({...stamp,fontFamily:e.target.value})}>{fonts.map(([v,n])=><option value={v} key={n}>{n}</option>)}</select></label>
          <Range label="Weight" min="100" max="900" step="100" value={stamp.fontWeight} onChange={v=>setStamp({...stamp,fontWeight:+v})}/>
          <Range label="Tracking" min="-10" max="30" value={stamp.tracking} onChange={v=>setStamp({...stamp,tracking:+v})}/>
          <Range label="Outline" min="0" max="20" value={stamp.outline} onChange={v=>setStamp({...stamp,outline:+v})}/>
          <div className="two"><ColorControl label="Fill" value={stamp.color} onChange={v=>setStamp({...stamp,color:v})}/><ColorControl label="Outline" value={stamp.outlineColor} onChange={v=>setStamp({...stamp,outlineColor:v})}/></div>
        </>}
        <Range label="Size" min="8" max="80" value={stamp.size} onChange={v=>setStamp({...stamp,size:+v})}/>
        <Range label="Spacing" min="3" max="80" value={stamp.spacing} onChange={v=>setStamp({...stamp,spacing:+v})}/>
        <Range label="Rotation jitter" min="0" max="180" value={stamp.rotationJitter} onChange={v=>setStamp({...stamp,rotationJitter:+v})}/>
        <Range label="Scale jitter" min="0" max="100" value={stamp.scaleJitter} onChange={v=>setStamp({...stamp,scaleJitter:+v})}/>
        <Range label="Opacity jitter" min="0" max="95" value={stamp.opacityJitter} onChange={v=>setStamp({...stamp,opacityJitter:+v})}/>
        <Range label="Order ↔ Chaos" min="0" max="100" value={stamp.chaos} onChange={v=>setStamp({...stamp,chaos:+v})}/>
        <label className="check"><input type="checkbox" checked={stamp.follow} onChange={e=>setStamp({...stamp,follow:e.target.checked})}/> Follow direction</label>
        <div className="note">Paste from clipboard works with Ctrl/Cmd+V. Hold + drag = one Undo.</div>
      </HudGroup>}

      <HudGroup title="Canvas" storageKey="left-canvas">
        <label>Ratio<select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.entries(RATIOS).map(([v,d])=><option value={v} key={v}>{d.label}</option>)}</select></label>
        <div className="note">Document: {doc.width} × {doc.height}px</div>
        <label>Background<input type="color" value={bg} onChange={e=>setBg(e.target.value)}/></label>
      </HudGroup>

      <HudGroup title="System" storageKey="left-system">
        <div className="two"><button onClick={undo} disabled={!history.length}>Undo</button><button onClick={redo} disabled={!future.length}>Redo</button></div>
        <button className="wide" onClick={selectAll} disabled={!layers.length}>Select all · ⌘/Ctrl+A</button>
        <button className="wide" onClick={variation}>Generate variation</button>
        <button className="wide danger eraseAll" onClick={clearCanvas}>ERASE ALL</button>
        <div className="two"><button disabled={exporting} onClick={()=>exportImg('png')}>{exporting?'…':'PNG'}</button><button disabled={exporting} onClick={()=>exportImg('jpg')}>{exporting?'…':'JPEG'}</button></div>
      </HudGroup>
    </aside>

    <section className="workspace">
      <header className="topbar"><span>{layers.length} layers · {selectedIds.length} selected · {doc.width}×{doc.height}</span><b>PROCESS &gt; CONTROL · RANDOMIZE &gt; REROLL &gt; COMPOSE</b></header>
      <div className={`stage ${dragOver?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files)}}>
        <div ref={canvas} className={`canvas ${tool==='stamp'?'stampCursor':''}`} style={{aspectRatio:`${doc.width} / ${doc.height}`,background:bg,'--doc-ratio':doc.width/doc.height}} onClick={canvasClick} onPointerDown={brushDown} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}>
          {!layers.length&&<div className="empty"><strong>DROP / STAMP / TYPE</strong><span>Build a composition, not a template.</span></div>}
          {[...layers].sort((a,b)=>a.order-b.order).map(l=>!l.hidden&&<Layer key={l.id} l={l} selected={selectedIds.includes(l.id)} primary={l.id===primaryId} multi={selectedIds.length>1} onDown={e=>onLayerDown(e,l)} onHandle={(e,h)=>onHandle(e,l,h)}/>)}
          {selectedIds.length>1&&multiBounds&&<MultiBox bounds={multiBounds} onHandle={onGroupHandle}/>} 
          {marquee&&<div className="marquee" style={{left:`${marquee.x}%`,top:`${marquee.y}%`,width:`${marquee.w}%`,height:`${marquee.h}%`}}/>}
        </div>
      </div>
    </section>

    <aside className="panel right">
      <HudGroup title={`Layers · ${layers.length}`} storageKey="right-layers" defaultOpen>
        <div className="layersList">{[...layers].sort((a,b)=>b.order-a.order).map(l=><div key={l.id} className={`layerRow ${selectedIds.includes(l.id)?'active':''}`} onClick={e=>{if(e.shiftKey){const ids=selectedIds.includes(l.id)?selectedIds.filter(id=>id!==l.id):[...selectedIds,l.id];setSelection(ids,ids.includes(l.id)?l.id:ids.at(-1))}else setSelection([l.id],l.id)}}><span>{l.type==='image'?'IMG':l.type==='text'?'TXT':'SHP'}</span><b>{l.name||l.text||l.shape}</b><button onClick={e=>{e.stopPropagation();commit(layers.map(x=>x.id===l.id?{...x,hidden:!x.hidden}:x),selectedIds,primaryId)}}>{l.hidden?'○':'●'}</button><button onClick={e=>{e.stopPropagation();commit(layers.map(x=>x.id===l.id?{...x,locked:!x.locked}:x),selectedIds,primaryId)}}>{l.locked?'⌑':'⌁'}</button><button onClick={e=>{e.stopPropagation();reorder(l.id,1)}}>▲</button><button onClick={e=>{e.stopPropagation();reorder(l.id,-1)}}>▼</button></div>)}</div>
      </HudGroup>

      {!selected?<div className="emptyHud">Select an object. Drag an empty canvas area for marquee selection. Shift adds, Alt removes.</div>:<>
        {selectedIds.length>1?<>
          <HudGroup title={`Multi Selection · ${selectedIds.length}`} storageKey="right-multi-transform" defaultOpen>
            <div className="muted">Transform and appearance changes apply to the temporary selection.</div>
            <Range label="Opacity" min="5" max="100" value={Math.round(selected.opacity*100)} onBegin={beginControl} onEnd={endControl} onChange={v=>patchSelectedLive(l=>({...l,opacity:+v/100}))}/>
            <label>Blend<select value={selected.blend} onFocus={beginControl} onBlur={endControl} onChange={e=>patchSelectedLive(l=>({...l,blend:e.target.value}))}>{blends.map(b=><option key={b}>{b}</option>)}</select></label>
          </HudGroup>
          {compatibleFill.length>0&&<HudGroup title="Group Fill / Stroke" storageKey="right-group-fill">
            <div className="muted">Text + shapes ({compatibleFill.length}/{selectedIds.length}). Images are ignored.</div>
            <div className="two"><ColorControl label="Fill" value={groupFill?.type==='shape'?groupFill.fill:groupFill?.color||'#111111'} onBegin={beginControl} onEnd={endControl} onChange={setGroupFill}/><ColorControl label="Stroke" value={groupStroke?.type==='shape'?groupStroke.stroke:groupStroke?.outlineColor||'#111111'} onBegin={beginControl} onEnd={endControl} onChange={setGroupStroke}/></div>
            <Range label="Stroke width" min="0" max="20" value={groupStroke?.type==='shape'?groupStroke.strokeWidth:groupStroke?.outline||0} onBegin={beginControl} onEnd={endControl} onChange={setGroupStrokeWidth}/>
            {selectedLayers.some(l=>l.type==='text')&&<label>Text outline position<select value={selectedLayers.find(l=>l.type==='text')?.outlineMode||'center'} onFocus={beginControl} onBlur={endControl} onChange={e=>patchSelectedLive(l=>l.type==='text'?{...l,outlineMode:e.target.value}:l)}><option value="inside">Inside</option><option value="center">Center</option><option value="outside">Outside</option></select></label>}
          </HudGroup>}
          {imageSelection.length>0&&<HudGroup title={`Group Effects · ${imageSelection.length} images`} storageKey="right-group-effects">
            <div className="muted">Effects apply only to selected image layers.</div>
            {imageEffectKeys.map(k=><Range key={k} label={k} min="0" max="100" value={Math.round(({...fx0,...primaryImage?.fx}[k])||0)} onBegin={beginControl} onEnd={endControl} onChange={v=>patchSelectedLive(l=>l.type==='image'?{...l,fx:{...fx0,...l.fx,[k]:+v}}:l)}/>)}
          </HudGroup>}
        </>:<HudGroup key={`transform-${selected.type}`} title={`${selected.type} / Transform`} storageKey="right-transform" defaultOpen>
          <Range label="Width" min="2" max="160" value={round1(selected.width)} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{width:+v})}/>
          <Range label="Height" min="2" max="160" value={round1(selected.height)} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{height:+v})}/>
          <Range label="Rotate" min="-180" max="180" value={round1(selected.rotation)} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{rotation:+v})}/>
          <Range label="Opacity" min="5" max="100" value={Math.round(selected.opacity*100)} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{opacity:+v/100})}/>
          <label>Blend<select value={selected.blend} onFocus={beginControl} onBlur={endControl} onChange={e=>patchLive(selected.id,{blend:e.target.value})}>{blends.map(b=><option key={b}>{b}</option>)}</select></label>
        </HudGroup>}

        {selectedIds.length===1&&selected.type==='text'&&<HudGroup key="type-lab" title="Type Lab" storageKey="right-type" defaultOpen>
          <textarea value={selected.text} onFocus={beginControl} onBlur={endControl} onChange={e=>patchLive(selected.id,{text:e.target.value})}/>
          <label>Font<select value={selected.fontFamily} onFocus={beginControl} onBlur={endControl} onChange={e=>patchLive(selected.id,{fontFamily:e.target.value})}>{fonts.map(([v,n])=><option value={v} key={n}>{n}</option>)}</select></label>
          <Range label="Size" min="10" max="180" value={selected.fontSize} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{fontSize:+v})}/>
          <Range label="Weight" min="100" max="900" step="100" value={selected.fontWeight} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{fontWeight:+v})}/>
          <Range label="Tracking" min="-10" max="30" value={selected.tracking} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{tracking:+v})}/>
          <Range label="Line height" min="50" max="180" value={Math.round(selected.lineHeight*100)} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{lineHeight:+v/100})}/>
          <Range label="Stretch X" min="30" max="250" value={Math.round(selected.scaleX*100)} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{scaleX:+v/100})}/>
          <Range label="Stretch Y" min="30" max="250" value={Math.round(selected.scaleY*100)} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{scaleY:+v/100})}/>
          <Range label="Outline" min="0" max="20" value={selected.outline} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{outline:+v})}/>
          <label>Outline position<select value={selected.outlineMode||'center'} onFocus={beginControl} onBlur={endControl} onChange={e=>patchLive(selected.id,{outlineMode:e.target.value})}><option value="inside">Inside</option><option value="center">Center</option><option value="outside">Outside</option></select></label>
          <div className="two"><ColorControl label="Fill" value={selected.color} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{color:v})}/><ColorControl label="Outline" value={selected.outlineColor} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{outlineColor:v})}/></div>
        </HudGroup>}

        {selectedIds.length===1&&selected.type==='shape'&&<HudGroup key="shape-lab" title="Shape" storageKey="right-shape" defaultOpen>
          <div className="two"><ColorControl label="Fill" value={selected.fill} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{fill:v})}/><ColorControl label="Stroke" value={selected.stroke} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{stroke:v})}/></div>
          <Range label="Stroke width" min="0" max="20" value={selected.strokeWidth} onBegin={beginControl} onEnd={endControl} onChange={v=>patchLive(selected.id,{strokeWidth:+v})}/>
          {selected.shape==='line'&&<label>Line cap<select value={selected.lineCap||'round'} onFocus={beginControl} onBlur={endControl} onChange={e=>patchLive(selected.id,{lineCap:e.target.value})}><option value="butt">Butt</option><option value="round">Round</option><option value="square">Square</option></select></label>}
        </HudGroup>}

        {selectedIds.length===1&&selected.type==='image'&&<ImageLab s={selected} patch={patchLive} patchFx={patchFxLive} begin={beginControl} end={endControl} cutting={cutting} cutout={cutout} restore={restoreBackground} rerollAll={rerollAll}/>} 

        {selectedIds.length===1&&<HudGroup title="Repeat / Pattern" storageKey="right-repeat">
          <button className="wide primary randomHero" onClick={randomRepeat}>🎲 Random repeat</button>
          <button className="wide" onClick={()=>repeatSelected()}>Repeat current</button>
          <details className="advanced"><summary>Manual controls</summary><Range label="Count" min="1" max="40" value={repeat.count} onChange={v=>setRepeat({...repeat,count:+v})}/><Range label="Spacing" min="-20" max="20" value={repeat.spacing} onChange={v=>setRepeat({...repeat,spacing:+v})}/><Range label="Angle step" min="-45" max="45" value={repeat.angle} onChange={v=>setRepeat({...repeat,angle:+v})}/><Range label="Scale drift" min="-80" max="150" value={repeat.scale} onChange={v=>setRepeat({...repeat,scale:+v})}/><Range label="Opacity drift" min="0" max="95" value={repeat.opacity} onChange={v=>setRepeat({...repeat,opacity:+v})}/><Range label="Order ↔ Chaos" min="0" max="100" value={repeat.chaos} onChange={v=>setRepeat({...repeat,chaos:+v})}/></details>
        </HudGroup>}

        <HudGroup title="Randomize Selected" storageKey="right-randomize" defaultOpen accent>
          <Range label="Order ↔ Chaos" min="0" max="100" value={randomSelectedChaos} onChange={v=>setRandomSelectedChaos(+v)}/>
          <button className="wide primary randomHero" onClick={randomizeSelected}>🎲 RANDOMIZE SELECTED</button>
          <div className="note">High Chaos can change transform, blend and styling. Locked layers are ignored. One click = one Undo.</div>
        </HudGroup>

        <HudGroup title="Layer actions" storageKey="right-actions">
          <div className="actions"><button onClick={front}>Front</button><button onClick={back}>Back</button><button onClick={()=>moveSelectionStep(1)}>Forward</button><button onClick={()=>moveSelectionStep(-1)}>Backward</button><button onClick={duplicate}>Duplicate</button><button className="danger" onClick={remove}>Delete</button></div>
        </HudGroup>
      </>}
    </aside>
  </main>;
}

function HudGroup({title,children,defaultOpen=false,storageKey,accent=false}){
  const key=`1337tools:hud:${storageKey||String(title)}`;
  const [open,setOpen]=useState(defaultOpen);
  useEffect(()=>{try{const saved=localStorage.getItem(key);if(saved!==null)setOpen(saved==='1')}catch{}},[key]);
  const toggle=()=>setOpen(value=>{const next=!value;try{localStorage.setItem(key,next?'1':'0')}catch{}return next});
  return <section className={`hudGroup ${open?'open':''} ${accent?'accent':''}`}>
    <button type="button" className="hudGroupToggle" onClick={toggle} aria-expanded={open}><span>{title}</span><i>{open?'−':'+'}</i></button>
    <div className="hudGroupClip" aria-hidden={!open}><div className="hudGroupInner">{children}</div></div>
  </section>;
}
function ImageLab({s,patch,patchFx,begin,end,cutting,cutout,restore,rerollAll}){
  const f={...fx0,...s.fx};
  return <>
    <HudGroup title="Image" storageKey="right-image-base" defaultOpen>
      <label>Fit<select value={s.fit} onFocus={begin} onBlur={end} onChange={e=>patch(s.id,{fit:e.target.value})}><option>cover</option><option>contain</option><option>fill</option></select></label>
      <Range label="Corner radius" min="0" max="50" value={s.radius} onBegin={begin} onEnd={end} onChange={v=>patch(s.id,{radius:+v})}/>
      <div className="two"><button className="primary" disabled={cutting} onClick={cutout}>{cutting?'Cutting…':s.cutout?'Re-cut β':'Cutout β'}</button><button disabled={!s.originalSrc||!s.cutout} onClick={restore}>Restore</button></div>
      <div className="note">Cutout β is experimental. Ctrl/Cmd+V pastes images from the clipboard.</div>
    </HudGroup>

    <HudGroup title="Adjust" storageKey="right-image-adjust">
      <Range label="Exposure" min="-50" max="50" value={f.exposure} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'exposure',+v)}/>
      <Range label="Contrast" min="0" max="300" value={f.contrast} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'contrast',+v)}/>
      <Range label="Saturation" min="0" max="250" value={f.saturation} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'saturation',+v)}/>
      <Range label="Grayscale" min="0" max="100" value={f.grayscale} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'grayscale',+v)}/>
      <Range label="Blur" min="0" max="16" value={f.blur} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'blur',+v)}/>
    </HudGroup>

    <HudGroup title="Distress / Random" storageKey="right-image-distress" defaultOpen accent>
      <button className="wide primary randomHero" onClick={rerollAll}>🎲 REROLL ALL</button>
      <div className="note">Generate first, correct with sliders after.</div>
      <Range label="Threshold" min="0" max="100" value={f.threshold} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'threshold',+v)}/>
      <Range label="Grain" min="0" max="100" value={f.grain} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'grain',+v)}/>
      <Range label="Noise" min="0" max="100" value={f.noise} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'noise',+v)}/>
      <Range label="Halftone" min="0" max="100" value={f.halftone} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'halftone',+v)}/>
      <details className="advanced"><summary>Halftone controls</summary><Range label="Dot size" min="2" max="40" value={f.halftoneSize||16} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'halftoneSize',+v)}/><Range label="Dot density" min="5" max="100" value={f.halftoneDensity||55} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'halftoneDensity',+v)}/><Range label="Dot opacity" min="0" max="100" value={f.halftoneOpacity||85} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'halftoneOpacity',+v)}/><Range label="Dot angle" min="-90" max="90" value={f.halftoneAngle||0} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'halftoneAngle',+v)}/><ColorControl label="Dot color" value={f.halftoneColor||'#000000'} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'halftoneColor',v)}/></details>
      <Range label="Xerox" min="0" max="100" value={f.xerox} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'xerox',+v)}/>
      <Range label="Fade" min="0" max="100" value={f.fade} onBegin={begin} onEnd={end} onChange={v=>patchFx(s.id,'fade',+v)}/>
    </HudGroup>
  </>;
}


function Layer({l,selected,primary,multi,onDown,onHandle}){
  const style={left:`${l.x}%`,top:`${l.y}%`,width:`${l.width}%`,height:`${l.height}%`,opacity:l.opacity,zIndex:Math.round(l.order||0),mixBlendMode:l.blend,transform:`translate(-50%,-50%) rotate(${l.rotation}deg)`};
  return <div data-layer-id={l.id} className={`layer ${l.type}Layer ${selected?'selected':''} ${primary?'primarySelected':''} ${l.locked?'locked':''}`} style={style} onPointerDown={onDown}>{l.type==='image'&&<ImageLayer l={l}/>} {l.type==='text'&&<TextLayer l={l}/>} {l.type==='shape'&&<ShapeLayer l={l}/>} {primary&&!multi&&!l.locked&&<Handles onHandle={onHandle}/>}</div>;
}
function MultiBox({bounds,onHandle}){const style={left:`${bounds.cx}%`,top:`${bounds.cy}%`,width:`${bounds.width}%`,height:`${bounds.height}%`};return <div className="multiBox" style={style}><Handles onHandle={onHandle}/></div>}
function Handles({onHandle}){return <>{['nw','ne','sw','se'].map(h=><i key={h} className={`handle ${h}`} onPointerDown={e=>onHandle(e,h)}/>)}<i className="rotateStem"/><i className="handle rotate" onPointerDown={e=>onHandle(e,'rotate')}/></>}
function Title({children}){return <div className="title">{children}</div>}
function Range({label,value,onChange,onBegin,onEnd,...rest}){
  const min=rest.min??0,max=rest.max??100,step=rest.step??1;
  return <label className="range"><span>{label}</span><div className="rangeRow"><input type="range" value={value} onPointerDown={onBegin} onPointerUp={onEnd} onPointerCancel={onEnd} onChange={e=>onChange(e.target.value)} {...rest}/><input className="numberInput" type="number" value={value} min={min} max={max} step={step} onFocus={onBegin} onBlur={onEnd} onChange={e=>{if(e.target.value!=='')onChange(clamp(+e.target.value,+min,+max))}} onDoubleClick={()=>label==='Rotate'&&onChange(0)}/></div></label>;
}
function ColorControl({label,value,onChange,onBegin,onEnd}){return <label>{label}<input type="color" value={value||'#111111'} onPointerDown={onBegin} onFocus={onBegin} onBlur={onEnd} onChange={e=>onChange(e.target.value)}/></label>}
function imgSize(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res({width:i.naturalWidth||1,height:i.naturalHeight||1});i.onerror=rej;i.src=src})}
function round1(v){return Math.round((+v||0)*10)/10}
