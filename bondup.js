// Bond-up scene (game_design/bond_up.md v0.1): ~6.3 s, 76 frames at 12 fps, all pixel effects in code on one 180x320 canvas.
// Beats: A dim, B iris + integer zoom snaps, C sparkle gather, D silhouette glow (outside-in), E squash + stage swap + one warm flash
// (inside-out reveal), F burst + hearts + hop, G back to x1, banner + line; holds until tap or 4 s. Reduced effects: dither cross-fade.
(function(root){
const NIGHT=[0x1E,0x16,0x38],CREAM='#FFF1C4',GOLD='#FFD27A',AMBER='#F7A85A',FLASH=[0xFF,0xE9,0xB8];
const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const FLASH_RAMP=[0,.20,.42,.42,.28,.15,.06,0];   // f34..41, one ramped event (WCAG 2.3.1)
const NAMES={2:'Early bond',3:'Growing',4:'Bonded',5:'Ready to sing'};
function sparkle(cx,x,y,ph,col){x|=0;y|=0;cx.fillStyle=col||'#FFFFFF';
  if(ph===0){cx.fillRect(x,y,1,1);return}
  if(ph===3){for(const [a,b] of [[0,0],[-1,-1],[1,1],[-1,1],[1,-1]])cx.fillRect(x+a,y+b,1,1);return}
  const r=ph===1?1:2;cx.fillRect(x-r,y,2*r+1,1);cx.fillRect(x,y-r,1,2*r+1);if(ph===2){cx.fillStyle=GOLD;cx.fillRect(x,y,1,1)}}
function heartsHTML(n){let h='';for(let i=0;i<n;i++){const c=document.createElement('canvas');c.width=7;c.height=6;heart(c.getContext('2d'),0,0);h+=`<img class="buheart" alt="" src="${c.toDataURL()}">`}return h}
function heart(cx,x,y){x|=0;y|=0;cx.fillStyle='#FF8FB8';const H=['.##.##.','#######','#######','.#####.','..###..','...#...'];
  H.forEach((r,j)=>[...r].forEach((c,i)=>{if(c==='#')cx.fillRect(x+i,y+j,1,1)}))}
function play(o){
  const scr=o.parent,lowfx=!!o.lowfx,short=!!o.short;
  const cv=document.createElement('canvas');cv.width=180;cv.height=320;cv.className='bondup';cv.setAttribute('aria-label','Closer');scr.appendChild(cv);
  const cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
  const world=document.createElement('canvas');world.width=180;world.height=320;const wx=world.getContext('2d');wx.imageSmoothingEnabled=false;
  const ui=document.createElement('div');ui.className='bondup-ui';scr.appendChild(ui);
  const ex=o.echo.x,ey=o.echo.y,fcx=ex+24,fcy=ey+18;   // the Echo's 48x48 box + face centre (reveal origin)
  const sheet=o.sheet,col=11;   // happy-eyes column
  const frameData=st=>{const c=document.createElement('canvas');c.width=48;c.height=48;const k=c.getContext('2d');k.drawImage(sheet,col*48,0,48,48,0,0,48,48);return k.getImageData(0,0,48,48)};
  const oldF=frameData(o.from),newF=frameData(o.to);
  const dist=(x,y)=>{const d=Math.hypot(x+ex-fcx,y+ey-fcy)/34;return Math.min(1,d)};
  const tmp=document.createElement('canvas');tmp.width=48;tmp.height=48;const tk=tmp.getContext('2d');
  function echoImg(mode,p,pulse){   // mode: 'old' | 'sil' (outside-in by p) | 'reveal' (inside-out by p) | 'new' | 'xfade'
    const out=tk.createImageData(48,48),od=out.data,A=oldF.data,N=newF.data;
    for(let y=0;y<48;y++)for(let x=0;x<48;x++){const i=(y*48+x)*4,b=BAYER[y&3][x&3]/16,d=dist(x,y);let src=null,cream=false;
      if(mode==='old')src=A;else if(mode==='new')src=N;
      else if(mode==='sil'){src=A;if(A[i+3]&&d+b*.25>1.15-p*1.3)cream=true}
      else if(mode==='reveal'){src=N;if(N[i+3]&&!(d+b*.25<p*1.3-.1))cream=true}
      else if(mode==='xfade'){src=b<p?N:A}
      if(src[i+3]){if(cream){od[i]=0xFF;od[i+1]=0xF1;od[i+2]=0xC4}else{od[i]=src[i];od[i+1]=src[i+1];od[i+2]=src[i+2]}od[i+3]=255}}
    tk.putImageData(out,0,0);
    if(mode==='sil'&&p>=1||mode==='reveal'&&p<=0){   // gold 1px rim + dithered amber outer rim pulsing 3 on / 3 off
      const m=mode==='sil'?A:N,solid=(x,y)=>x>=0&&y>=0&&x<48&&y<48&&m[(y*48+x)*4+3];
      for(let y=0;y<48;y++)for(let x=0;x<48;x++){if(solid(x,y))continue;const n=solid(x+1,y)||solid(x-1,y)||solid(x,y+1)||solid(x,y-1);
        if(n){tk.fillStyle=GOLD;tk.fillRect(x,y,1,1)}else if(pulse&&(x+y)%2===0&&(solid(x+2,y)||solid(x-2,y)||solid(x,y+2)||solid(x,y-2))){tk.fillStyle=AMBER;tk.fillRect(x,y,1,1)}}}
    return tmp}
  const bg=o.bg;   // canvas with the frozen Home scene minus the Echo
  const gather=Array.from({length:16},(_,i)=>({a:i/16*Math.PI*2,ph:i%4}));
  const burst=Array.from({length:lowfx?8:24},(_,i)=>({a:i/(lowfx?8:24)*Math.PI*2+.1,s:1.6+(i%3)*.5}));
  const hearts=Array.from({length:5},(_,i)=>({x:fcx-16+i*8,d:i*2}));
  const notes=root.NoteFX&&o.fam?NoteFX.burst({fam:o.fam,seed:o.seed,lowfx:lowfx||short,pal:o.pal,img:sheet,sx:col*48,sy:0}):null,N0=lowfx||short?8:42;   // Batch C1: note burst on every bond-up
  let f=0,timer=null,done=false,started=performance.now();const END=lowfx||short?30:76;
  function drawFrame(){
    wx.clearRect(0,0,180,320);wx.drawImage(bg,0,0);
    let dim=0;if(lowfx||short)dim=f<2?.18*(f+1):.36;else dim=f<2?0:f<4?.18:f<5?.36:f<52?.5:Math.max(0,.5-(f-52)*.05);
    if(dim){wx.fillStyle=`rgba(${NIGHT},${dim})`;wx.fillRect(0,0,180,320)}
    let img,dy=0,sx=1,sy=1;
    if(lowfx||short){   // reduced: 4-frame dither cross-fade, 8 sparkles, banner
      const p=Math.max(0,Math.min(1,(f-4)/4));img=echoImg(p<=0?'old':p>=1?'new':'xfade',p);
      if(f>=8&&f<16)burst.forEach(s=>{const r=(f-8)*3;sparkle(wx,fcx+Math.cos(s.a)*r,fcy+Math.sin(s.a)*r,(f>>1)%4)})}
    else if(f<26)img=echoImg('old');
    else if(f<34)img=echoImg('sil',Math.min(1,(f-26)/6),(f-26)%6<3);
    else if(f<42){img=f<35?echoImg('sil',1,true):echoImg('reveal',Math.min(1,(f-35)/6));if(f===34||f===35){sx=f===34?1.08:.94;sy=f===34?.92:1.08}}
    else img=echoImg('new');
    if(!lowfx&&!short&&f>=42&&f<49)dy=-[1,3,5,6,5,3,1][f-42];   // 7-frame hop
    const w=Math.round(48*sx),h=Math.round(48*sy);{const au=o.aura&&o.aura(col);if(au)wx.drawImage(au,(ex+(48-w)/2|0)-Math.round(13*w/48),ey+48-h+dy-Math.round(13*h/48),Math.round(au.width*w/48),Math.round(au.height*h/48))}wx.drawImage(img,ex+(48-w)/2|0,ey+48-h+dy,w,h);   // glow v1: the aura rides on the same frame/transform
    if(!lowfx&&!short){
      if(f>=14&&f<26){const t=(f-14)/11,r=42-34*t;gather.forEach((s,i)=>sparkle(wx,fcx+Math.cos(s.a+t*3)*r,fcy+Math.sin(s.a+t*3)*r,(s.ph+(f>>1))%4))}
      if(f>=42&&f<52){const t=f-42;burst.forEach(s=>sparkle(wx,fcx+Math.cos(s.a)*t*s.s*3,fcy+Math.sin(s.a)*t*s.s*3,t<3?2:(t>>1)%4));hearts.forEach(hh=>{if(t>=hh.d)heart(wx,hh.x,ey-(t-hh.d)*3)})}
    }
    if(notes&&f>=N0&&f<N0+notes.len)NoteFX.drawBurst(wx,notes,f-N0,fcx,fcy);   // world space like the hearts/sparkles: x3 under the zoom, x1 after
    if(!lowfx&&!short){
      if(f>=6&&f<14){const r=Math.max(30,120-(f-6)*14);for(let y=0;y<320;y+=1)for(let x=(y&1);x<180;x+=2){const d=Math.hypot(x-fcx,y-fcy);if(d>r&&d<r+40&&BAYER[y&3][x&3]/16<(d-r)/40){wx.fillStyle='#1E1638';wx.fillRect(x,y,1,1)}}}
    }
    // zoom: crop around the Echo, integer scale x1 -> x2 -> x3 (one snap every 4 frames), back to x1 at beat G
    let z=1;if(!lowfx&&!short){z=f<8?1:f<12?2:f<52?3:1}
    cx.clearRect(0,0,180,320);
    if(z===1)cx.drawImage(world,0,0);else{const cw=180/z,ch=320/z,x0=Math.max(0,Math.min(180-cw,fcx-cw/2)),y0=Math.max(0,Math.min(320-ch,fcy+6-ch/2));cx.drawImage(world,x0,y0,cw,ch,0,0,180,320)}
    if(!lowfx&&!short&&(f===8||f===12||f===52)){for(let i=0;i<12;i++)sparkle(cx,90+Math.cos(i/12*6.283)*50,160+Math.sin(i/12*6.283)*50,2)}
    if(!lowfx&&!short&&f>=34&&f<42){const a=FLASH_RAMP[f-34];if(a){cx.fillStyle=`rgba(${FLASH},${a})`;cx.fillRect(0,0,180,320)}}
    if(f===(lowfx||short?10:52))showBanner();
  }
  function showBanner(){   // A3 (bondup_lines_v1): the family's bond_up_title line; empty text = wordless cheer (3 pixel hearts + a chirp)
    const t=o.title||{text:'Closer!'},word=t.text?t.text:`<span class="buhearts" aria-label="hearts">${heartsHTML(3)}</span>`;
    ui.innerHTML=`<div class="bubanner"><b>${word}</b><span>${NAMES[o.to]||''}</span></div><div class="bubble buline">${o.line.text}</div>`;
    if(!t.text&&o.chirp)o.chirp();o.onTitle&&o.onTitle(t);o.onLine&&o.onLine(o.line)}
  function tick(){if(done)return;drawFrame();f++;if(f<END)timer=setTimeout(tick,83);else{timer=setTimeout(finish,4000)}}
  function finish(){if(done)return;done=true;clearTimeout(timer);cv.remove();ui.remove();scr.removeEventListener('pointerdown',skip,true);document.removeEventListener('keydown',skip,true);o.onDone&&o.onDone()}
  function skip(e){if(performance.now()-started<1000){e.stopPropagation();return}   // the tap that ended a game can't skip it
    e.stopPropagation();e.preventDefault&&e.preventDefault();
    if(f<END){f=END-1;clearTimeout(timer);if(!ui.innerHTML)showBanner();drawFrame();f=END;timer=setTimeout(finish,4000)}else finish()}
  scr.addEventListener('pointerdown',skip,true);document.addEventListener('keydown',skip,true);
  tick();return {skip:()=>skip({stopPropagation(){}}),get frame(){return f},finish}
}
const API={play,NAMES,FLASH_RAMP};root.BondUp=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
