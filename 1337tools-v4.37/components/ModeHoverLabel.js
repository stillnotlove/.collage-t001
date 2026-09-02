'use client';

import {useEffect,useRef} from 'react';
import {hashSeed,mulberry32} from '../lib/editorCore';

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function ease(v){v=clamp01(v);return v*v*(3-2*v)}

export default function ModeHoverLabel({mode,label,active}){
  const wrapRef=useRef(null),canvasRef=useRef(null),seedRef=useRef(Math.floor(Math.random()*1e9)),wasActive=useRef(false);

  useEffect(()=>{
    if(active&&!wasActive.current)seedRef.current=Math.floor(Math.random()*1e9);
    wasActive.current=active;
  },[active]);

  useEffect(()=>{
    const wrap=wrapRef.current,canvas=canvasRef.current;if(!wrap||!canvas)return;
    let raf=0,ro=null,start=performance.now(),disposed=false;
    let source=makeCanvas(1,1),mask=makeCanvas(1,1),asciiSample=makeCanvas(1,1),size={w:1,h:1,dpr:1};

    function resize(){
      const r=wrap.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(w===size.w&&h===size.h)return false;
      size={w,h,dpr};canvas.width=w;canvas.height=h;source=makeCanvas(w,h);mask=makeCanvas(w,h);drawSource();return true;
    }
    function drawSource(){
      const {w,h}=size,ctx=source.getContext('2d');ctx.clearRect(0,0,w,h);
      let fs=h*.88;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle='#ffffff';
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      let m=ctx.measureText(label);if(m.width>w*.985){fs*=w*.985/m.width;ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;m=ctx.measureText(label)}
      const ascent=m.actualBoundingBoxAscent||fs*.72,descent=m.actualBoundingBoxDescent||fs*.12;
      const y=h/2+(ascent-descent)*.04;
      ctx.fillText(label,0,y);
      const mx=mask.getContext('2d');mx.clearRect(0,0,w,h);mx.drawImage(source,0,0);
    }

    function drawAscii(ctx,p,time){
      const {w,h,dpr}=size,rnd=mulberry32(hashSeed(`${seedRef.current}:${mode}:ascii`));
      const variants=[
        {id:'ASCII',chars:[...'@#%*+=-:.'],cell:7.8,weight:700},
        {id:'BLOCKS',chars:[...'█▓▒░'],cell:8.8,weight:700},
        {id:'SQUARES',chars:[...'■□▪▫'],cell:10.4,weight:700},
        {id:'BRAILLE',chars:[...'⣿⣷⣯⣟⣛⣚⣀'],cell:7.4,weight:700},
        {id:'CODE',chars:[...'01/\\[]{}<>+=-'],cell:8.2,weight:700},
      ];
      const v=variants[Math.floor(rnd()*variants.length)],cell=Math.max(5,Math.round(v.cell*dpr));
      const cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell));
      if(asciiSample.width!==cols||asciiSample.height!==rows){asciiSample.width=cols;asciiSample.height=rows}
      const sx=asciiSample.getContext('2d',{willReadFrequently:true});sx.clearRect(0,0,cols,rows);sx.drawImage(mask,0,0,cols,rows);
      const px=sx.getImageData(0,0,cols,rows).data;
      ctx.globalAlpha=1-p;ctx.drawImage(source,0,0);ctx.globalAlpha=p;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';ctx.font=`${v.weight} ${cell*(v.id==='SQUARES'?1.06:1.12)}px IBM Plex Mono, Courier New, monospace`;
      const phase=Math.floor(time/180);
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const q=(y*cols+x)*4,a=px[q+3]/255;if(a<.14)continue;
        // Keep the glyph mask dense so ASCII stays legible. Pattern family changes on every hover.
        const local=mulberry32(hashSeed(`${seedRef.current}:${v.id}:${x}:${y}:${phase}`));
        let keep=.97;
        if(v.id==='SQUARES')keep=((x+y)%3===0?.9:1);
        else if(v.id==='BRAILLE')keep=.985;
        else if(v.id==='CODE')keep=.94;
        if(local()>keep*a)continue;
        let idx=0;
        if(v.id==='BLOCKS')idx=(x+Math.floor(y*.55)+Math.floor(local()*2))%v.chars.length;
        else if(v.id==='SQUARES')idx=(x*3+y*5+Math.floor(local()*v.chars.length))%v.chars.length;
        else if(v.id==='BRAILLE')idx=(x+y*2+Math.floor(local()*3))%v.chars.length;
        else idx=Math.floor(local()*v.chars.length);
        const ch=v.chars[idx]||v.chars[0];
        ctx.globalAlpha=p*(.78+.22*a);
        const ox=v.id==='SQUARES'&&((x+y)&1)?cell*.08:0;
        const oy=v.id==='BRAILLE'?(x%2?cell*.04:-cell*.03):0;
        ctx.fillText(ch,(x+.5)*cell+ox,(y+.5)*cell+oy);
      }
      ctx.globalAlpha=1;
    }

    function drawSlice(ctx,p){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${seedRef.current}:${mode}:slice`));
      const cutY=h*(.46+rnd()*.08),shift=w*(.018+rnd()*.03)*p,gap=Math.max(0.5,h*.012*p);
      const dir=rnd()>.5?1:-1;
      // A deliberately straight horizontal cut: top and bottom remain parallel, only their offsets differ.
      ctx.save();ctx.beginPath();ctx.rect(0,0,w,Math.max(0,cutY-gap/2));ctx.clip();ctx.drawImage(source,shift*dir,-gap*.15);ctx.restore();
      ctx.save();ctx.beginPath();ctx.rect(0,cutY+gap/2,w,Math.max(0,h-cutY-gap/2));ctx.clip();ctx.drawImage(source,-shift*dir,gap*.15);ctx.restore();
      if(p>.35){ctx.save();ctx.globalAlpha=.12*p;ctx.fillStyle='#ffffff';ctx.fillRect(0,cutY-gap*.15,w,Math.max(1,gap*.3));ctx.restore()}
    }

    function drawEditor(ctx,p,time){
      const {w,h,dpr}=size,rnd=mulberry32(hashSeed(`${seedRef.current}:${mode}:editor`));
      const rot=(rnd()-.5)*.018*p,scaleX=1+(rnd()>.5?1:-1)*.018*p,scaleY=1-(rnd()>.5?1:-1)*.008*p;
      ctx.save();ctx.translate(w/2,h/2);ctx.rotate(rot);ctx.scale(scaleX,scaleY);ctx.drawImage(source,-w/2,-h/2);ctx.restore();
      const boxX=w*.002,boxY=h*.07,boxH=h*.86,boxRight=w*.945,boxW=boxRight-boxX;
      ctx.save();ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(1,1.25*dpr);ctx.globalAlpha=.3+.7*p;ctx.setLineDash([Math.max(3,5*dpr),Math.max(2,3*dpr)]);ctx.strokeRect(boxX,boxY,boxW,boxH);ctx.setLineDash([]);
      const s=Math.max(3,5*dpr),pts=[[boxX,boxY],[boxRight,boxY],[boxX,boxY+boxH],[boxRight,boxY+boxH],[(boxX+boxRight)/2,boxY],[(boxX+boxRight)/2,boxY+boxH]];
      ctx.fillStyle='#ffffff';for(const [x,y] of pts){ctx.fillRect(x-s/2,y-s/2,s,s)}
      ctx.restore();
    }

    function drawField(ctx,p,time){
      const {w,h,dpr}=size,rnd=mulberry32(hashSeed(`${seedRef.current}:${mode}:field`)),cols=18+Math.floor(rnd()*10),rows=7+Math.floor(rnd()*5),cw=w/cols,ch=h/rows,attractor={x:w*(.55+rnd()*.22),y:h*(.42+rnd()*.18)};
      ctx.globalAlpha=.24*(1-p);ctx.drawImage(source,0,0);ctx.globalAlpha=1;
      const phase=time*.0012;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const sx=gx*cw,sy=gy*ch,cx=sx+cw/2,cy=sy+ch/2,dx=attractor.x-cx,dy=attractor.y-cy,dist=Math.max(1,Math.hypot(dx,dy)),pull=(.018+.055*(1-dist/Math.hypot(w,h)))*p,wave=Math.sin(gx*.7+gy*.41+phase)*cw*.13*p,ox=dx*pull+wave,oy=dy*pull*.55;
        ctx.save();ctx.translate(cx+ox,cy+oy);ctx.rotate(Math.atan2(dy,dx)*.025*p);ctx.globalAlpha=.72+.28*(1-p);ctx.drawImage(source,sx,sy,cw+.7*dpr,ch+.7*dpr,-cw/2,-ch/2,cw+.7*dpr,ch+.7*dpr);ctx.restore();
      }
    }

    function drawEcho(ctx,p,time){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${seedRef.current}:${mode}:echo`)),copies=4+Math.floor(rnd()*5),ampX=w*(.008+rnd()*.016)*p,ampY=h*(.015+rnd()*.028)*p;
      ctx.globalAlpha=.18*(1-p);ctx.drawImage(source,0,0);
      for(let i=copies;i>=1;i--){
        const t=i/copies,phase=time*.0011+i*.8,dx=Math.cos(phase)*ampX*i*.42,dy=Math.sin(phase*.83)*ampY*i*.25,sc=1-(.008+.012*rnd())*i*p;
        ctx.save();ctx.translate(w/2+dx,h/2+dy);ctx.scale(sc,sc);ctx.globalAlpha=p*(.08+.12*(1-t));ctx.drawImage(source,-w/2,-h/2);ctx.restore();
      }
      ctx.globalAlpha=.72+.28*(1-p);ctx.drawImage(source,0,0);ctx.globalAlpha=1;
    }

    function frame(now){
      if(disposed)return;resize();const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);
      const elapsed=now-start,p=active?ease(Math.min(1,elapsed/320)):0;
      if(!active){raf=requestAnimationFrame(frame);return}
      if(mode==='ascii')drawAscii(ctx,p,now);else if(mode==='slice')drawSlice(ctx,p);else if(mode==='editor')drawEditor(ctx,p,now);else if(mode==='echo')drawEcho(ctx,p,now);else drawField(ctx,p,now);
      raf=requestAnimationFrame(frame);
    }

    resize();
    // Idle menu labels must be truly idle. Previously every non-hovered tool kept its
    // own requestAnimationFrame loop alive, wasting CPU/GPU on the index screen.
    if(!active)return;
    start=performance.now();raf=requestAnimationFrame(frame);
    if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(()=>resize());ro.observe(wrap)}
    return()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect()};
  },[active,label,mode]);

  return <span className={`modeFxLabel ${active?'isActive':''}`} ref={wrapRef}>
    <span className="modeFxBase">{label}</span>
    <canvas ref={canvasRef} className="modeFxCanvas" aria-hidden="true"/>
  </span>;
}
