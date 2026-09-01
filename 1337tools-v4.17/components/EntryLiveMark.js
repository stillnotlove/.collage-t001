'use client';

import {useEffect,useRef} from 'react';
import {hashSeed,mulberry32} from '../lib/editorCore';

const EFFECTS=['ascii','slice','scan','distress','echo'];

function makeCanvas(w,h){
  const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c;
}
function smoothstep(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
function easePulse(t){return Math.sin(Math.PI*Math.max(0,Math.min(1,t)))}

export default function EntryLiveMark(){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    let raf=0,ro=null,disposed=false;
    let size={w:1,h:1,dpr:1};
    let base=makeCanvas(1,1),fx=makeCanvas(1,1);
    let sessionSeed=Math.floor(Math.random()*1e9);
    let state={effect:'ascii',seed:sessionSeed,start:performance.now()+620,duration:1850,index:0};
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    function resize(){
      const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return;
      const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
      if(w===size.w&&h===size.h&&dpr===size.dpr)return;
      size={w,h,dpr};canvas.width=w;canvas.height=h;base=makeCanvas(w,h);fx=makeCanvas(w,h);drawBase();
    }

    function drawBase(){
      const {w,h}=size,ctx=base.getContext('2d');ctx.clearRect(0,0,w,h);
      let fs=Math.min(h*.56,w*.16),measure,total;
      for(let n=0;n<5;n++){
        ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
        const one=ctx.measureText('1').width,rest=ctx.measureText('337').width,kern=-fs*.038;
        ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
        const tools=ctx.measureText('tools').width,gap=fs*.055;
        total=one+rest+kern+gap+tools;
        if(total<=w*.82)break;fs*=w*.82/total;
      }
      ctx.textBaseline='alphabetic';ctx.fillStyle='#fff';
      const baseline=h*.64;
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      const oneW=ctx.measureText('1').width,restW=ctx.measureText('337').width,kern=-fs*.038;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      const toolsW=ctx.measureText('tools').width,gap=fs*.055;
      total=oneW+restW+kern+gap+toolsW;
      let x=(w-total)/2;
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;ctx.fillText('1',x,baseline);x+=oneW+kern;ctx.fillText('337',x,baseline);x+=restW+gap;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;ctx.fillText('tools',x,baseline);
      // small yellow process marker; deliberately rendered in-canvas so it cannot be clipped.
      const d=Math.max(7,Math.min(14,fs*.045));ctx.save();ctx.translate(Math.min(w-d*2,x+toolsW+d*2.2),baseline+d*.75);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffd800';ctx.fillRect(-d/2,-d/2,d,d);ctx.restore();
    }

    function renderAscii(target,seed,time){
      const {w,h}=size,ctx=target.getContext('2d'),src=base.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,w,h);
      const rnd=mulberry32(hashSeed(`${seed}:ascii`));
      const straight=rnd()>.48,cell=Math.max(5,Math.round((6+rnd()*7)*size.dpr));
      const chars=[...(straight?'|/\\+-:.':'@#%*+=-:.')];
      const img=src.getImageData(0,0,w,h).data;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font=`700 ${cell*(straight?1.12:1.02)}px IBM Plex Mono, Courier New, monospace`;
      const phase=time*.0012;
      for(let y=cell/2;y<h;y+=cell){
        for(let x=cell/2;x<w;x+=cell){
          const ix=Math.min(w-1,Math.max(0,Math.floor(x))),iy=Math.min(h-1,Math.max(0,Math.floor(y))),a=img[(iy*w+ix)*4+3]/255;
          if(a<.08)continue;
          const noise=.12*Math.sin(x*.018+y*.013+phase)+.09*(rnd()-.5),density=Math.max(0,Math.min(1,a+noise));
          if(rnd()>density*.97)continue;
          const ch=chars[Math.min(chars.length-1,Math.floor((1-density)*(chars.length-1)+rnd()*1.4))]||chars[0];
          const j=straight?0:(rnd()-.5)*cell*.18;ctx.globalAlpha=.62+.38*density;ctx.fillText(ch,x+j,y+(straight?0:(rnd()-.5)*cell*.08));
        }
      }
      ctx.globalAlpha=1;
    }

    function renderSlice(target,seed,time){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);const rnd=mulberry32(hashSeed(`${seed}:slice`));
      const bands=9+Math.floor(rnd()*15),bh=h/bands,amp=w*(.012+rnd()*.035),phase=time*.0015;
      for(let i=0;i<bands;i++){
        const y=i*bh,offset=Math.sin(i*1.73+phase)*(amp*.35)+(rnd()-.5)*amp;
        ctx.globalAlpha=.88+rnd()*.12;ctx.drawImage(base,0,y,w,bh,offset,y,w,bh);
      }
      // sparse echo slices rather than a full-screen glitch.
      ctx.globalAlpha=.18;for(let i=0;i<3;i++){const y=rnd()*h,hh=bh*(.3+rnd()*.7);ctx.drawImage(base,0,y,w,hh,(rnd()-.5)*amp*2.4,y,w,hh)}ctx.globalAlpha=1;
    }

    function renderScan(target,seed,time){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);const rnd=mulberry32(hashSeed(`${seed}:scan`));
      const strip=Math.max(2,Math.round((2+rnd()*3)*size.dpr)),gap=Math.max(1,Math.round((1+rnd()*2)*size.dpr));
      for(let x=0;x<w;x+=strip+gap){
        const sway=Math.sin(x*.021+time*.002)*size.dpr*(.8+rnd()*1.7);ctx.globalAlpha=.42+rnd()*.58;ctx.drawImage(base,x,0,strip,h,x+sway,0,strip,h);
      }
      const scanY=((time*.11+seed)%Math.max(1,h+h*.25))-h*.12,grad=ctx.createLinearGradient(0,scanY-h*.08,0,scanY+h*.08);grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(.5,'rgba(255,255,255,.28)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.globalAlpha=1;ctx.fillStyle=grad;ctx.fillRect(0,scanY-h*.08,w,h*.16);
    }

    function renderDistress(target,seed,time){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(base,0,0);const rnd=mulberry32(hashSeed(`${seed}:distress:${Math.floor(time/190)}`));
      ctx.globalCompositeOperation='destination-out';
      const cuts=28+Math.floor(rnd()*42);for(let i=0;i<cuts;i++){
        const horizontal=rnd()>.28,x=rnd()*w,y=rnd()*h,ww=horizontal?w*(.008+rnd()*.07):size.dpr*(1+rnd()*3),hh=horizontal?size.dpr*(1+rnd()*4):h*(.01+rnd()*.09);ctx.globalAlpha=.28+rnd()*.72;ctx.fillRect(x,y,ww,hh);
      }
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.18;const shift=Math.sin(time*.004)*w*.006;ctx.drawImage(base,shift,0);ctx.globalAlpha=1;
    }

    function renderEcho(target,seed,time){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);const rnd=mulberry32(hashSeed(`${seed}:echo`));
      const copies=2+Math.floor(rnd()*4),amp=w*(.002+rnd()*.006);for(let i=copies;i>=1;i--){const p=i/copies,dx=Math.sin(time*.0014+i*1.7)*amp*i,dy=Math.cos(time*.001+i*.8)*amp*.35*i;ctx.globalAlpha=.08+.1*(1-p);ctx.drawImage(base,dx,dy)}
      ctx.globalAlpha=.88;ctx.drawImage(base,0,0);ctx.globalAlpha=1;
    }

    function pickNext(now){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${state.index}:next`));let next=EFFECTS[Math.floor(rnd()*EFFECTS.length)];if(next===state.effect)next=EFFECTS[(EFFECTS.indexOf(next)+1+Math.floor(rnd()*(EFFECTS.length-1)))%EFFECTS.length];
      state={effect:next,seed:Math.floor(rnd()*1e9),start:now,duration:1450+rnd()*1550,index:state.index+1};
    }

    function renderEffect(now){
      const name=state.effect;if(name==='ascii')renderAscii(fx,state.seed,now);else if(name==='slice')renderSlice(fx,state.seed,now);else if(name==='scan')renderScan(fx,state.seed,now);else if(name==='distress')renderDistress(fx,state.seed,now);else renderEcho(fx,state.seed,now);
    }

    function frame(now){
      if(disposed)return;resize();const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);
      if(reduced){ctx.drawImage(base,0,0);raf=requestAnimationFrame(frame);return}
      if(now<state.start){ctx.drawImage(base,0,0);raf=requestAnimationFrame(frame);return}
      if(now>state.start+state.duration)pickNext(now);
      const p=(now-state.start)/state.duration,pulse=easePulse(p),strength=.18+.82*smoothstep(pulse);
      renderEffect(now);
      // Clean is never fully lost: random transformations feel like a live process, not a slideshow.
      ctx.globalAlpha=1-strength*.88;ctx.drawImage(base,0,0);ctx.globalAlpha=strength;ctx.drawImage(fx,0,0);ctx.globalAlpha=1;
      raf=requestAnimationFrame(frame);
    }

    resize();drawBase();raf=requestAnimationFrame(frame);
    if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(()=>{resize();drawBase()});ro.observe(canvas)}
    window.addEventListener('resize',resize);
    return()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',resize)};
  },[]);

  return <canvas ref={ref} className="entryLiveCanvas" aria-hidden="true"/>;
}
