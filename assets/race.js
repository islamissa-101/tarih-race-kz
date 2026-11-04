// Тарих Race KZ · ойын клиенті
// Клиент тек ойынды көрсетеді: сұрақтар, жауапты тексеру және ұпай — серверде (Supabase Edge Functions).
(function () {
'use strict';
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TR=window.TR,UI=window.UI;if(!TR||!UI)return;
const CHARS=UI.CHARS;
const TYPE_LABEL={single:'① Бір дұрыс жауап',match:'② Сәйкестендіру',order:'③ Хронологиялық рет',map:'④ Карта бойынша',image:'⑤ Сурет / артефакт',fill:'⑥ Бос орынды толтыру'};

/* ================= ENGINE CONSTANTS ================= */
const TT=window.TR_TRACKS;
const SEG=200,RUMBLE=3,ROADW=2000,LANES=3,FOV=100,CAMH=1000,DRAW=260;
const camDepth=1/Math.tan(FOV/2*Math.PI/180);
const playerZ=CAMH*camDepth;
const CENTRIF=0.3,PLAYER_W=0.3,BASE_MAX=12000;
const LANE_X=[-0.66,0,0.66];
let GATE_IDX=[];
let TC=TT.TRACKS[0];

const cv=$('#game'),ctx=cv.getContext('2d');TT.setCtx(ctx);
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(window.devicePixelRatio||1,1.5);W=Math.floor(window.innerWidth*DPR);H=Math.floor(window.innerHeight*DPR);cv.width=W;cv.height=H;}
window.addEventListener('resize',resize);resize();

function seeded(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=seeded(1);
function shuffleDiff(a){const o=a.slice();let r;let k=0;do{r=shuffle(a.slice());k++;}while(k<20&&r.every((v,i)=>v===o[i]));return r;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ================= TRACK ================= */
let segs=[],finishIdx=0,gates=[],cars=[];
function lastY(){return segs.length?segs[segs.length-1].p2.world.y:0;}
function addSeg(curve,y){const n=segs.length;segs.push({index:n,p1:{world:{x:0,y:lastY(),z:n*SEG},camera:{},screen:{}},p2:{world:{x:0,y:y,z:(n+1)*SEG},camera:{},screen:{}},curve:curve,sprites:[],cars:[],dark:Math.floor(n/RUMBLE)%2===1,clip:0,mark:null});}
const easeIn=(a,b,p)=>a+(b-a)*p*p,easeInOut=(a,b,p)=>a+(b-a)*((-Math.cos(p*Math.PI)/2)+0.5);
function addRoad(e,h,l,curve,y){const sY=lastY(),eY=sY+y*SEG,t=e+h+l;for(let i=0;i<e;i++)addSeg(easeIn(0,curve,i/e),easeInOut(sY,eY,i/t));for(let i=0;i<h;i++)addSeg(curve,easeInOut(sY,eY,(e+i)/t));for(let i=0;i<l;i++)addSeg(easeInOut(curve,0,i/l),easeInOut(sY,eY,(e+h+i)/t));}
function findSeg(z){let i=Math.floor(z/SEG);if(i<0)i=0;if(i>=segs.length)i=segs.length-1;return segs[i];}
function nearGate(n,d){return GATE_IDX.some(g=>Math.abs(g-n)<d);}
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));

// Трасса процедуралық түрде құрылады: әр дәуірдің өз seed-і, иілімі мен төбелері
function buildTrack(){
 const T=TC;segs=[];gates=[];cars=[];rnd=seeded(1000+T.n*7919);
 addRoad(50,50,50,0,0);
 while(segs.length<3150){
  const len=[25,40,50,50,75][ri(0,4)];
  const dir=rnd()<0.5?-1:1,straight=rnd()<0.22;
  const curve=straight?0:dir*(1.5+rnd()*4.5)*T.curve;
  const hill=rnd()<0.35?0:(rnd()-0.5)*2*40*T.hill;
  addRoad(len,len,len,curve,hill);
  if(lastY()>14000)addRoad(50,50,50,0,-30);else if(lastY()<-14000)addRoad(50,50,50,0,30);
 }
 addRoad(100,100,100,0,-lastY()/SEG);addRoad(0,80,0,0,0);
 finishIdx=segs.length-80;
 GATE_IDX=[];for(let i=1;i<=T.gates;i++)GATE_IDX.push(Math.round(finishIdx*i/(T.gates+1)));
 for(let i=6;i<9;i++)segs[i].mark='start';
 for(let i=finishIdx;i<finishIdx+3;i++)segs[i].mark='finish';
 segs[finishIdx].sprites.push({t:'finish',offset:0});
 GATE_IDX.forEach((g,i)=>{const gate={idx:g,n:i+1,done:false};gates.push(gate);segs[g].sprites.push({t:'gate',offset:0,gate:gate});segs[g].mark='gate';segs[g-1].mark='gate';});
 // декорациялар
 for(let n=10;n<segs.length;n+=8+ri(0,17)){
  const side=rnd()<0.5?-1:1;const t=T.decor[ri(0,T.decor.length-1)];const big=(t==='tower'||t==='building'||t==='baiterek');
  segs[n].sprites.push({t:t,offset:side*((big?2.2:1.45)+rnd()*(big?2.5:1.8)),seed:ri(0,99)});
 }
 // монеталар
 for(let n=60;n<finishIdx-30;n+=55+ri(0,49)){
  if(nearGate(n,25))continue;const lane=LANE_X[ri(0,2)];
  for(let k=0;k<5;k++)segs[n+k*4].sprites.push({t:'coin',offset:lane,phase:rnd()*6});
 }
 // тастар (қиындық өскен сайын жиілейді)
 for(let n=140;n<finishIdx-40;n+=ri(T.rockGap[0],T.rockGap[1])){
  if(nearGate(n,35))continue;
  segs[n].sprites.push({t:'rock',offset:LANE_X[ri(0,2)]});
 }
 // тарихи артефактілер: 3 дана
 T.artifacts.forEach((fact,i)=>{let n=Math.round(finishIdx*(0.18+i*0.3));while(nearGate(n,30))n+=20;segs[n].sprites.push({t:'artifact',offset:LANE_X[ri(0,2)],fact:fact});});
 // қарсыластар
 for(let i=0;i<T.rivals;i++){
  const z=(80+rnd()*(finishIdx-400))*SEG;const p=TT.RIVAL_COLORS[i%TT.RIVAL_COLORS.length];
  const car={z:z,offset:LANE_X[ri(0,2)]+(rnd()-0.5)*0.2,speed:BASE_MAX*(T.rivalSpd[0]+rnd()*(T.rivalSpd[1]-T.rivalSpd[0])),color:p[0],dark:p[1],kind:T.rival};
  cars.push(car);findSeg(z).cars.push(car);
 }
 if(T.boss){const boss={z:260*SEG,offset:0,speed:BASE_MAX*0.6,color:'#101826',dark:'#B23A48',kind:'boss',boss:true};cars.push(boss);findSeg(boss.z).cars.push(boss);}
}

/* ================= STATE ================= */
const G={state:'menu',pos:0,px:0,speed:0,t:0,charIdx:0,track:1,name:'',mOff:0,hOff:0,steerVis:0,shake:0};
const keys={};let touchMode=false;
function resetRace(){
 TC=TT.TRACKS[G.track-1];buildTrack();
 const c=CHARS[G.charIdx];G.char=c;
 G.maxSpd=8500+c.spd*700;G.accel=G.maxSpd/5;G.brakeA=-G.maxSpd;G.decel=-G.maxSpd/5;G.offDecel=-G.maxSpd/2;G.offLimit=G.maxSpd/4;
 G.pos=0;G.px=0;G.speed=0;G.time=0;G.lives=c.passive==='life'?4:3;G.maxLives=G.lives;
 G.coins=0;G.correct=0;G.wrong=0;G.nitro=50;G.nitroOn=false;G.invuln=0;G.shieldT=0;G.ramT=0;G.abCd=0;G.fiftyUsed=false;G.artifacts=0;
 G.medUsed=0;G.asked=new Set();G.retry=[];G.gateN=0;G.lastIdx=findSeg(playerZ).index;G.penT=0;G.cd=0;G.finished=false;G.bossPassed=false;
 buildProgress();
}

/* ================= PROJECTION & RENDER ================= */
function project(p,cx,cy,cz){p.camera.x=(p.world.x||0)-cx;p.camera.y=p.world.y-cy;p.camera.z=p.world.z-cz;const sc=camDepth/p.camera.z;p.screen.scale=sc;p.screen.x=Math.round(W/2+sc*p.camera.x*W/2);p.screen.y=Math.round(H/2-sc*p.camera.y*H/2);p.screen.w=Math.round(sc*ROADW*W/2);}
function poly(x1,y1,x2,y2,x3,y3,x4,y4,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);ctx.lineTo(x4,y4);ctx.closePath();ctx.fill();}
function renderSeg(s){
 const P=TC.pal;
 const x1=s.p1.screen.x,y1=s.p1.screen.y,w1=s.p1.screen.w,x2=s.p2.screen.x,y2=s.p2.screen.y,w2=s.p2.screen.w;
 const d=s.dark;
 ctx.fillStyle=d?P.grass[1]:P.grass[0];ctx.fillRect(0,y2,W,y1-y2);
 const r1=w1/6,r2=w2/6;const rum=d?P.rumble[1]:P.rumble[0];
 poly(x1-w1-r1,y1,x1-w1,y1,x2-w2,y2,x2-w2-r2,y2,rum);poly(x1+w1+r1,y1,x1+w1,y1,x2+w2,y2,x2+w2+r2,y2,rum);
 let road=d?P.road[1]:P.road[0];
 if(s.mark==='gate')road='#B08A35';
 if(s.mark==='start'||s.mark==='finish')road=(s.index%2)?'#F3EEE4':'#101826';
 poly(x1-w1,y1,x1+w1,y1,x2+w2,y2,x2-w2,y2,road);
 if(!d&&!s.mark){const l1=w1/32,l2=w2/32,lw1=w1*2/LANES,lw2=w2*2/LANES;
  for(let k=1;k<LANES;k++){const lx1=x1-w1+lw1*k,lx2=x2-w2+lw2*k;poly(lx1-l1/2,y1,lx1+l1/2,y1,lx2+l2/2,y2,lx2-l2/2,y2,P.lane);}}
}
const MT1=[],MT2=[],STARS=[];(function(){const r=seeded(7);for(let i=0;i<=16;i++)MT1.push(0.06+r()*0.14);MT1[16]=MT1[0];for(let i=0;i<=24;i++)MT2.push(0.015+r()*0.04);MT2[24]=MT2[0];for(let i=0;i<70;i++)STARS.push([r(),r()*0.45,r()]);})();
function layer(pts,off,base,amp,fill){const P=W*1.6;const o=((off%1)+1)%1;for(let k=-1;k<2;k++){const x0=k*P-o*P;ctx.beginPath();ctx.moveTo(x0,base);for(let j=0;j<pts.length;j++){ctx.lineTo(x0+j/(pts.length-1)*P,base-pts[j]*amp);}ctx.lineTo(x0+P,base);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}}
function drawBg(){
 const P=TC.pal;
 const g=ctx.createLinearGradient(0,0,0,H*0.52);g.addColorStop(0,P.sky[0]);g.addColorStop(0.55,P.sky[1]);g.addColorStop(1,P.sky[2]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(TC.night){ctx.fillStyle='#F3EEE4';STARS.forEach(([x,y,b])=>{ctx.globalAlpha=0.4+0.6*Math.abs(Math.sin(G.t*1.5+b*9));ctx.fillRect(x*W,y*H,DPR*1.5,DPR*1.5);});ctx.globalAlpha=1;}
 const sx=W*0.72-(((G.mOff%1)+1)%1)*W*0.3,sy=H*0.3,sr=Math.min(W,H)*(TC.night?0.045:0.07);
 if(!TC.night){const sg=ctx.createRadialGradient(sx,sy,sr*0.2,sx,sy,sr*3);sg.addColorStop(0,'rgba(255,236,180,.9)');sg.addColorStop(1,'rgba(255,236,180,0)');ctx.fillStyle=sg;ctx.fillRect(sx-sr*3,sy-sr*3,sr*6,sr*6);}
 ctx.fillStyle=TC.sun;ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
 if(TC.night){ctx.fillStyle=P.sky[1];ctx.beginPath();ctx.arc(sx+sr*0.4,sy-sr*0.2,sr*0.85,0,Math.PI*2);ctx.fill();}
 const base=H*0.5;
 const mg=ctx.createLinearGradient(0,base-H*0.2,0,base);mg.addColorStop(0,P.mount[0]);mg.addColorStop(0.35,P.mount[1]);mg.addColorStop(1,P.mount[2]);
 layer(MT1,G.mOff,base+2,H,mg);
 layer(MT2,G.hOff,base+4,H,P.hills);
 ctx.fillStyle=P.grass[1];ctx.fillRect(0,base+3,W,H-base);
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function drawYurt(x,y,w,h){
 const cx=x+w/2;ctx.fillStyle='#F3EEE4';ctx.fillRect(x+w*0.08,y+h*0.46,w*0.84,h*0.54);
 ctx.beginPath();ctx.ellipse(cx,y+h*0.48,w*0.46,h*0.44,0,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillStyle='#DCD3C0';ctx.fillRect(x+w*0.08,y+h*0.85,w*0.84,h*0.15);
 ctx.fillStyle='#B23A48';ctx.fillRect(x+w*0.08,y+h*0.52,w*0.84,h*0.07);
 ctx.fillStyle='#8A5A00';ctx.fillRect(cx-w*0.09,y+h*0.64,w*0.18,h*0.36);
 ctx.fillStyle='#5A4630';ctx.fillRect(cx-w*0.06,y+h*0.02,w*0.12,h*0.06);
}
function drawFlag(x,y,w,h){
 ctx.fillStyle='#5A4630';ctx.fillRect(x+w*0.47,y,w*0.05,h);
 ctx.fillStyle='#00AFCA';ctx.fillRect(x+w*0.52,y+h*0.03,w*0.48,h*0.26);
 ctx.fillStyle='#F2C230';ctx.beginPath();ctx.arc(x+w*0.76,y+h*0.16,Math.min(w*0.1,h*0.07),0,Math.PI*2);ctx.fill();
}
function drawStone(x,y,w,h){ctx.fillStyle='#8E877C';ctx.beginPath();ctx.ellipse(x+w/2,y+h*0.6,w/2,h*0.42,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(x,y+h*0.58,w,h*0.42);}
function drawRock(x,y,w,h){
 ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(x+w/2,y+h*0.96,w*0.55,h*0.1,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#5E5A55';ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x+w*0.08,y+h*0.45);ctx.lineTo(x+w*0.35,y+h*0.08);ctx.lineTo(x+w*0.7,y);ctx.lineTo(x+w*0.95,y+h*0.4);ctx.lineTo(x+w,y+h);ctx.closePath();ctx.fill();
 ctx.fillStyle='#7B766F';ctx.beginPath();ctx.moveTo(x+w*0.35,y+h*0.08);ctx.lineTo(x+w*0.7,y);ctx.lineTo(x+w*0.6,y+h*0.5);ctx.lineTo(x+w*0.3,y+h*0.55);ctx.closePath();ctx.fill();
}
function drawCoin(x,y,w,h,o){const k=Math.max(0.12,Math.abs(Math.cos(G.t*4+o.phase)));const cx=x+w/2,cy=y+h/2;
 ctx.fillStyle='#8A5A00';ctx.beginPath();ctx.ellipse(cx,cy,w/2*k,h/2,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#E8B84A';ctx.beginPath();ctx.ellipse(cx,cy,w/2*k*0.86,h/2*0.86,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#F8DA8A';ctx.beginPath();ctx.ellipse(cx,cy,w/2*k*0.5,h/2*0.5,0,0,Math.PI*2);ctx.fill();}
function banner(x,y,w,h,fill,text,tcol){
 const pw=Math.max(2,w*0.022);ctx.fillStyle='#101826';ctx.fillRect(x,y,pw,h);ctx.fillRect(x+w-pw,y,pw,h);
 ctx.fillStyle=fill;ctx.fillRect(x,y,w,h*0.22);ctx.fillStyle='#E8B84A';ctx.fillRect(x,y+h*0.22,w,Math.max(1,h*0.02));
 const fs=h*0.11;if(fs>5){ctx.fillStyle=tcol||'#FBF8F2';ctx.font='900 '+fs+'px Montserrat, Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x+w/2,y+h*0.115);}
}
function drawGate(x,y,w,h,o){const g=o.gate;banner(x,y,w,h,!g.done?'#C8643B':(g.ok?'#2C7FA6':'#6E2A33'),!g.done?'ТАРИХИ КЕДЕРГІ · '+g.n:(g.ok?'✓ ӨТТІҢІЗ':'АЙЫППҰЛ'));}
function drawFinish(x,y,w,h){
 const pw=Math.max(2,w*0.022);ctx.fillStyle='#101826';ctx.fillRect(x,y,pw,h);ctx.fillRect(x+w-pw,y,pw,h);
 const n=20,cw=w/n,ch=h*0.11;for(let i=0;i<n;i++)for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%2?'#101826':'#F3EEE4';ctx.fillRect(x+i*cw,y+j*ch,cw+1,ch+1);}
 const fs=h*0.1;if(fs>5){ctx.fillStyle='#E8B84A';ctx.fillRect(x+w*0.38,y+h*0.02,w*0.24,h*0.18);ctx.fillStyle='#101826';ctx.font='900 '+fs+'px Montserrat, Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('МӘРЕ',x+w/2,y+h*0.115);}
}
const SPR={
 yurt:{w:1300,h:950,solid:true,draw:drawYurt},flag:{w:800,h:1500,solid:true,draw:drawFlag},stone:{w:520,h:300,solid:true,draw:drawStone},
 rock:{w:560,h:400,draw:drawRock},coin:{w:280,h:280,lift:140,draw:drawCoin},
 artifact:{w:340,h:340,lift:200,draw:(x,y,w,h)=>TT.drawArtifact(x,y,w,h,G.t)},
 gate:{w:ROADW*2.4,h:1800,draw:drawGate},finish:{w:ROADW*2.4,h:1800,draw:drawFinish},
 car:{w:560,h:300,draw:(x,y,w,h,o)=>TT.drawRival(o.kind||'car',x,y,w,h,o,G.t)},
 boss:{w:760,h:400,draw:(x,y,w,h,o)=>TT.drawRival('boss',x,y,w,h,o,G.t)},
};
Object.keys(TT.DECOR).forEach(k=>{const d=TT.DECOR[k];SPR[k]={w:d.w,h:d.h,solid:d.solid,draw:(x,y,w,h,o)=>d.draw(x,y,w,h,o,TC)};});
function drawSprite(t,sx,sy,scale,clip,o){
 const d=SPR[t];const w=scale*d.w*W/2,h=scale*d.h*W/2;if(w<1||w>W*6)return;
 const x=sx-w/2,y=sy-h-(d.lift?scale*d.lift*W/2:0);if(y>=clip)return;
 ctx.save();if(y+h>clip){ctx.beginPath();ctx.rect(0,0,W,clip);ctx.clip();}d.draw(x,y,w,h,o);ctx.restore();
}
function render(){
 drawBg();
 const baseSeg=findSeg(G.pos),basePct=(G.pos%SEG)/SEG;
 const pSeg=findSeg(G.pos+playerZ),pPct=((G.pos+playerZ)%SEG)/SEG;
 const playerY=pSeg.p1.world.y+(pSeg.p2.world.y-pSeg.p1.world.y)*pPct;
 let maxy=H,x=0,dx=-(baseSeg.curve*basePct);
 const camX=G.px*ROADW,camY=playerY+CAMH;
 for(let n=0;n<DRAW;n++){
  const idx=baseSeg.index+n;if(idx>=segs.length)break;const s=segs[idx];s.clip=maxy;
  project(s.p1,camX-x,camY,G.pos);project(s.p2,camX-x-dx,camY,G.pos);
  x+=dx;dx+=s.curve;
  if(s.p1.camera.z<=camDepth||s.p2.screen.y>=s.p1.screen.y||s.p2.screen.y>=maxy)continue;
  renderSeg(s);maxy=s.p1.screen.y;
 }
 for(let n=DRAW-1;n>0;n--){
  const idx=baseSeg.index+n;if(idx>=segs.length)continue;const s=segs[idx];
  if(s.p1.camera.z<250)continue;const near=s.p1.camera.z<playerZ*0.85;
  for(const c of s.cars){const pct=(c.z%SEG)/SEG;const sc=s.p1.screen.scale+(s.p2.screen.scale-s.p1.screen.scale)*pct;
   const sx=s.p1.screen.x+(s.p2.screen.x-s.p1.screen.x)*pct+sc*c.offset*ROADW*W/2;const sy=s.p1.screen.y+(s.p2.screen.y-s.p1.screen.y)*pct;
   drawSprite(c.boss?'boss':'car',sx,sy,sc,s.clip,c);}
  for(const sp of s.sprites){if(near&&(sp.t==='coin'||sp.t==='rock'||sp.t==='artifact'))continue;const sc=s.p1.screen.scale;drawSprite(sp.t,s.p1.screen.x+sc*sp.offset*ROADW*W/2,s.p1.screen.y,sc,s.clip,sp);}
 }
 drawPlayer();
}
function drawPlayer(){
 const c=CHARS[G.charIdx];const v=TT.VEHICLE[G.charIdx];
 const w=Math.min(W*0.3,H*0.42*(v.asp<1?1:0.75)),h=w*v.asp;
 const sp=G.maxSpd?G.speed/G.maxSpd:0;
 const bounce=(G.state==='race'?Math.sin(G.t*30)*sp*h*0.015:0)+(G.shake>0?Math.sin(G.t*90)*h*0.05:0);
 const x=W/2-w/2+G.steerVis*w*0.05,y=H-h-(touchMode&&H>W?Math.min(H*0.16,100*DPR):H*0.03)+bounce;
 if(G.nitroOn&&G.state==='race'){const f=0.6+Math.random()*0.5;ctx.fillStyle='rgba(255,138,61,.9)';
  [0.3,0.7].forEach(k=>{ctx.beginPath();ctx.moveTo(x+w*k-w*0.05,y+h*0.85);ctx.lineTo(x+w*k+w*0.05,y+h*0.85);ctx.lineTo(x+w*k,y+h*(0.85+0.3*f));ctx.closePath();ctx.fill();});}
 const blink=G.invuln>0&&G.shieldT<=0&&G.ramT<=0&&Math.floor(G.t*12)%2===0;
 if(!blink)TT.drawVehicle(G.charIdx,x,y,w,h,c,G.state==='race'?G.t*(0.4+sp):G.t*0.3,keys.brake&&G.state==='race');
 if(G.shieldT>0||G.ramT>0){ctx.strokeStyle=G.ramT>0?'rgba(200,100,59,.9)':'rgba(63,169,214,.9)';ctx.lineWidth=Math.max(3,w*0.02);ctx.beginPath();ctx.ellipse(W/2,y+h*0.55,w*0.62,h*0.62,0,0,Math.PI*2);ctx.stroke();}
}

/* ================= UPDATE ================= */
function overlap(x1,w1,x2,w2){return Math.abs(x1-x2)<(w1+w2)/2;}
function hit(n){
 if(G.invuln>0)return;
 G.lives-=n||1;G.invuln=1+0.3*G.char.def;G.speed*=0.2+0.08*G.char.def;G.shake=0.4;
 toast((n||1)>1?'BOSS! −2 өмір':'−1 өмір');
 if(G.lives<=0){G.lives=0;onDeath();}
}
function update(dt){
 G.t+=dt;
 if(G.shake>0)G.shake-=dt;
 const target=keys.left?-1:keys.right?1:0;G.steerVis+=(target-G.steerVis)*Math.min(1,dt*10);
 if(G.state==='menu'){
  G.pos+=5500*dt;if(G.pos>(finishIdx-20)*SEG)G.pos=0;const ps=findSeg(G.pos+playerZ);
  G.mOff+=0.0018*ps.curve*dt*27;G.hOff+=0.0036*ps.curve*dt*27;G.px*=0.95;return;
 }
 if(G.state==='countdown'){G.cd-=dt;const n=Math.ceil(G.cd);center(n>0?String(n):'БАСТА!');if(G.cd<=-0.6){center('');G.state='race';}return;}
 if(G.state==='question'){if(G.qActive){G.qTime-=dt;$('#qBar').style.width=clamp(G.qTime/G.qMax*100,0,100)+'%';if(G.qTime<=0&&G.qTimeout)G.qTimeout();}return;}
 if(G.state==='penalty'){G.time+=dt;G.penT-=dt;center(Math.max(0,G.penT).toFixed(1),'АЙЫППҰЛ');if(G.penT<=0){center('');G.state='race';}return;}
 if(G.state!=='race')return;

 G.time+=dt;
 if(G.invuln>0)G.invuln-=dt;if(G.shieldT>0)G.shieldT-=dt;if(G.ramT>0)G.ramT-=dt;if(G.abCd>0)G.abCd-=dt;
 const c=G.char;
 const pSeg=findSeg(G.pos+playerZ);const spPct=G.speed/G.maxSpd;
 const dx=dt*2*Math.min(1,spPct);
 const gas=keys.gas||touchMode;
 if(keys.left)G.px-=dx;else if(keys.right)G.px+=dx;
 G.px-=dx*spPct*pSeg.curve*CENTRIF;
 G.nitroOn=!!keys.nitro&&G.nitro>0&&gas;
 if(G.nitroOn){G.nitro-=dt*(35-c.nit*4)*(c.passive==='nitro2'?0.5:1);if(G.nitro<0)G.nitro=0;}
 const curMax=G.nitroOn?G.maxSpd*1.4:G.maxSpd;
 if(keys.brake)G.speed+=G.brakeA*dt;else if(gas)G.speed+=G.accel*(G.nitroOn?1.8:1)*dt;else G.speed+=G.decel*dt;
 if(G.speed>curMax)G.speed=Math.max(curMax,G.speed+G.decel*2*dt);
 if((G.px<-1||G.px>1)&&G.speed>G.offLimit)G.speed+=G.offDecel*dt;
 G.px=clamp(G.px,-2.4,2.4);G.speed=Math.max(0,G.speed);
 G.mOff+=0.0018*pSeg.curve*spPct*dt*27;G.hOff+=0.0036*pSeg.curve*spPct*dt*27;
 for(const car of cars){const o=findSeg(car.z);
  if(car.boss){const ahead=car.z-(G.pos+playerZ);car.speed=ahead>SEG*60?BASE_MAX*0.45:BASE_MAX*0.62;if(!G.bossPassed&&ahead<-SEG*2){G.bossPassed=true;toast('BOSS-ты басып оздыңыз!');}}
  car.z=Math.min(car.z+dt*car.speed,(finishIdx+40)*SEG);const nw=findSeg(car.z);if(o!==nw){o.cars.splice(o.cars.indexOf(car),1);nw.cars.push(car);}}
 G.pos+=G.speed*dt;
 const nSeg=findSeg(G.pos+playerZ);
 for(let i=G.lastIdx+1;i<=nSeg.index;i++){
  const s=segs[i];
  for(let k=s.sprites.length-1;k>=0;k--){const o=s.sprites[k];
   if(o.t==='coin'){const cw=c.passive==='magnet'?1.0:0.16;if(overlap(G.px,PLAYER_W,o.offset,cw)){s.sprites.splice(k,1);G.coins+=c.passive==='coin2'?2:1;G.nitro=Math.min(100,G.nitro+3);}}
   else if(o.t==='artifact'){if(overlap(G.px,PLAYER_W,o.offset,0.3)){s.sprites.splice(k,1);G.artifacts++;G.nitro=Math.min(100,G.nitro+30);toast('Артефакт: '+o.fact);}}
   else if(o.t==='rock'){if(overlap(G.px,PLAYER_W,o.offset,0.24)){s.sprites.splice(k,1);if(G.invuln>0)toast('Тас қиратылды');else hit();if(G.state!=='race')break;}}
   else if(SPR[o.t]&&SPR[o.t].solid&&Math.abs(G.px)>1){if(overlap(G.px,PLAYER_W,o.offset,SPR[o.t].w/ROADW*0.7)){G.speed=Math.min(G.speed,G.maxSpd*0.2);G.px+=G.px>0?-0.2:0.2;}}
  }
  if(G.state!=='race'){G.lastIdx=i;return;}
 }
 G.lastIdx=nSeg.index;
 for(const car of nSeg.cars){
  const cw=car.boss?0.4:PLAYER_W*0.9;
  if(G.speed>car.speed&&overlap(G.px,PLAYER_W,car.offset,cw)){
   if((G.ramT>0||G.invuln>0)&&!car.boss){car.offset=clamp(car.offset+(car.offset>=G.px?0.6:-0.6),-0.95,0.95);if(G.ramT>0)toast('Орда күші!');}
   else if(G.invuln<=0){G.speed=car.speed*0.6;G.pos=car.z-playerZ-SEG*0.6;hit(car.boss?2:1);}
   break;
  }
 }
 if(G.state!=='race')return;
 for(const g of gates){if(!g.done&&nSeg.index>=g.idx-7){G.pos=(g.idx-7)*SEG-playerZ;G.lastIdx=g.idx-8;openGate(g);return;}}
 if(nSeg.index>=finishIdx){G.finished=true;endRace(true);}
}

/* ================= ABILITY ================= */
function useAbility(){
 if(G.state!=='race'||!G.char.active||G.abCd>0)return;
 const a=G.char.active;
 if(a==='shield'){G.shieldT=3;G.invuln=Math.max(G.invuln,3);toast('Алтын қалқан!');}
 else if(a==='ram'){G.ramT=4;G.invuln=Math.max(G.invuln,4);toast('Орда күші!');}
 else if(a==='arrow'){const start=findSeg(G.pos+playerZ).index;let done=false;
  for(let i=start;i<Math.min(segs.length,start+120)&&!done;i++){const s=segs[i];const k=s.sprites.findIndex(o=>o.t==='rock');if(k>=0){s.sprites.splice(k,1);done=true;}}
  toast(done?'Садақ: тас жойылды':'Алда тас жоқ');}
 G.abCd=20;
}

/* ================= QUESTIONS (сервермен) ================= */
function pickGateQ(n){
 const due=G.retry.findIndex(r=>r.due<=n);
 if(due>=0){const q=G.retry.splice(due,1)[0].q;return Object.assign({},q,{_repeat:true});}
 return G.gateQ[n-1];
}
function pickDeathQ(){return G.medQ.find(q=>!G.asked.has(q.id))||null;}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
let qKeyHandler=null;
function showQuestion(q,mode,done){
 G.state='question';G.asked.add(q.id);
 G.qMax=G.qTime=TC.qTime+(G.char.passive==='time'?5:0);G.qActive=true;
 $('#qTag').textContent=mode==='death'?'МЕДИЦИНАЛЫҚ КӨМЕК':('ТАРИХИ КЕДЕРГІ · '+G.gateN+'/'+TC.gates+(q._repeat?' · ҚАЙТАЛАУ':''));
 $('#qType').textContent=TYPE_LABEL[q.type]||q.type;
 $('#qText').textContent=q.prompt;
 const body=$('#qBody');body.innerHTML='';
 const fb=$('#qFb');fb.className='fb hidden';fb.textContent='';
 const next=$('#qNext');next.classList.add('hidden');
 const wait=$('#qWait');wait.classList.add('hidden');
 let sent=false;const pen=G.char.passive==='penalty'?1.5:3;
 let optBtns=[];
 const lock=()=>body.querySelectorAll('button,input').forEach(b=>b.disabled=true);
 const submit=async(answer,timeout)=>{
  if(sent)return;sent=true;G.qActive=false;G.qTimeout=null;lock();
  wait.textContent='Сервер тексеруде…';wait.classList.remove('hidden');
  let res;
  try{res=await TR.fn('submit-answer',{race_id:G.raceId,question_id:q.id,kind:mode==='death'?'med':'gate',gate:mode==='death'?undefined:G.gateN,answer:answer});}
  catch(e){
   wait.textContent=e.message;
   const retry=el('button','btn','Қайталау');retry.onclick=()=>{retry.remove();sent=false;submit(answer,timeout);};
   wait.appendChild(document.createTextNode(' '));wait.appendChild(retry);return;
  }
  wait.classList.add('hidden');
  const ok=!!res.correct;
  if(q.type==='single'||q.type==='image'||q.type==='map')optBtns.forEach(b=>{const ca=res.correct_answer.split(' — ')[0];const hit=q.type==='map'?b.textContent.startsWith(ca+' '):b.textContent.endsWith(ca);if(hit)b.classList.add('ok');else if(b._picked)b.classList.add('bad');});
  fb.className='fb '+(ok?'ok':'bad');
  fb.appendChild(el('b',null,ok?'Дұрыс!':(timeout?'Уақыт бітті!':'Қате!')));
  let msg;
  if(ok)msg=mode==='death'?'+1 өмір. Жарыс жалғасады.':'+100 ұпай, нитро +20%. Қақпа ашылды.';
  else msg='Дұрыс жауап: '+res.correct_answer+(mode==='death'?'':'. Айыппұл: '+String(pen).replace('.',',')+' сек. Бұл сұрақ кейін қайта шығады.');
  fb.appendChild(el('span',null,msg));
  next.classList.remove('hidden');next.focus();
  next.onclick=()=>{qKeyHandler=null;hideScreens();done(ok,q);};
 };
 G.qTimeout=()=>submit({timeout:true},true);
 qKeyHandler=null;
 if(q.type==='map'||q.type==='image'){
  const fig=el('div','qfig');fig.innerHTML=q.type==='map'?TT.mapSVG(q.data.points||[]):TT.artSVG(q.data.img);body.appendChild(fig);
 }
 if(q.type==='single'||q.type==='map'||q.type==='image'){
  const wrap=el('div','opts'+(q.type==='map'?' opts4':''));const base=(q.data.options||[]).map((t,i)=>({t,i}));const opts=q.type==='map'?base:shuffle(base);
  opts.forEach((o,k)=>{const b=el('button','opt',q.type==='map'?o.t+' нүктесі':'ABCD'[k]+')  '+o.t);b._i=o.i;b.onclick=()=>{b._picked=true;submit({index:o.i});};optBtns.push(b);wrap.appendChild(b);});
  body.appendChild(wrap);
  qKeyHandler=e=>{const i=['1','2','3','4'].indexOf(e.key)>=0?['1','2','3','4'].indexOf(e.key):['a','b','c','d'].indexOf(String(e.key).toLowerCase());if(i>=0&&optBtns[i]&&!optBtns[i].disabled)optBtns[i].click();};
  if(G.char.passive==='fifty'&&!G.fiftyUsed){const f=el('button','btn ghost','50/50 · Хан жарлығы');f.style.marginTop='12px';
   f.onclick=async()=>{f.disabled=true;try{const r=await TR.fn('submit-answer',{action:'fifty',race_id:G.raceId,question_id:q.id});G.fiftyUsed=true;f.remove();
    optBtns.filter(x=>r.remove.includes(x._i)).forEach(x=>{x.disabled=true;x.classList.add('gone');});}catch(e){toast(e.message);f.disabled=false;}};
   body.appendChild(f);}
 }else if(q.type==='fill'){
  const f=el('form','row');const inp=el('input','txt');inp.maxLength=40;inp.placeholder='Жауапты жазыңыз';inp.autocomplete='off';
  const b=el('button','btn','Тексеру');b.type='submit';f.appendChild(inp);f.appendChild(b);
  f.onsubmit=e=>{e.preventDefault();const v=inp.value.slice(0,40);if(!v.trim()){inp.focus();return;}submit({text:v});};
  body.appendChild(f);setTimeout(()=>{if(!touchMode)inp.focus();},50);
 }else if(q.type==='order'){
  const slots=el('div','slots'),chips=el('div','chips');const picked=[];const items=shuffleDiff(q.data.items||[]);const n=items.length;let chk;
  const draw=()=>{slots.innerHTML='';for(let i=0;i<n;i++)slots.appendChild(el('div','slot'+(picked[i]?' f':''),(i+1)+'. '+(picked[i]||'…')));chk.disabled=picked.length<n;};
  items.forEach(t=>{const b=el('button','chipb',t);b.onclick=()=>{if(picked.length>=n)return;picked.push(t);b.disabled=true;draw();};chips.appendChild(b);});
  const row=el('div','row');const clr=el('button','btn ghost','Тазалау');chk=el('button','btn','Тексеру');
  clr.onclick=()=>{picked.length=0;chips.querySelectorAll('button').forEach(b=>b.disabled=false);draw();};
  chk.onclick=()=>submit({items:picked.slice()});
  row.appendChild(clr);row.appendChild(chk);body.appendChild(slots);body.appendChild(chips);body.appendChild(row);draw();
 }else if(q.type==='match'){
  const COLS=['#E8B84A','#3FA9D6','#C8643B','#59C795'];
  const cols=el('div','mcols'),L=el('div'),R=el('div');cols.appendChild(L);cols.appendChild(R);
  const lefts=(q.data.left||[]).slice(),rights=shuffleDiff(q.data.right||[]);const map=new Map();let sel=null;const lb={},rb={};let chk;
  const draw=()=>{lefts.forEach((l,i)=>{const b=lb[l];b.classList.toggle('sel',sel===l);b.style.borderColor=map.has(l)?COLS[i%4]:'transparent';});
   rights.forEach(r=>{const b=rb[r];let ci=-1;map.forEach((v,k)=>{if(v===r)ci=lefts.indexOf(k);});b.style.borderColor=ci>=0?COLS[ci%4]:'transparent';});chk.disabled=map.size<lefts.length;};
  lefts.forEach(l=>{const b=el('button','mb',l);b.onclick=()=>{if(map.has(l)){map.delete(l);sel=null;}else sel=(sel===l?null:l);draw();};lb[l]=b;L.appendChild(b);});
  rights.forEach(r=>{const b=el('button','mb',r);b.onclick=()=>{map.forEach((v,k)=>{if(v===r)map.delete(k);});if(sel){map.set(sel,r);sel=null;}draw();};rb[r]=b;R.appendChild(b);});
  const row=el('div','row');chk=el('button','btn','Тексеру');chk.onclick=()=>submit({pairs:[...map.entries()]});row.appendChild(chk);
  body.appendChild(el('p','note','Алдымен сол жақтағыны, сосын оған сәйкес оң жақтағыны басыңыз.'));body.appendChild(cols);body.appendChild(row);draw();
 }else{
  body.appendChild(el('p','note','Бұл тапсырма түрі толық нұсқада қосылады.'));G.qTimeout=null;
  const b=el('button','btn','Өткізу');b.onclick=()=>submit({skip:true});body.appendChild(b);
 }
 showScreen('question');
}
function openGate(g){
 G.gateN=g.n;const q=pickGateQ(g.n);G.speed=0;
 showQuestion(q,'gate',(ok,qq)=>{
  g.done=true;g.ok=ok;markGate(g.n,ok);
  if(ok){G.correct++;G.nitro=Math.min(100,G.nitro+20);G.speed=G.maxSpd*0.55;G.state='race';toast('+100 ұпай');}
  else{G.wrong++;const base=G.gateQ.concat(G.medQ).find(x=>x.id===qq.id)||qq;if(!qq._repeat)G.retry.push({q:base,due:g.n+2});G.state='penalty';G.penT=G.char.passive==='penalty'?1.5:3;G.speed=0;}
 });
}
function onDeath(){
 G.state='death';G.speed=0;const left=Math.min(2-G.medUsed,G.medQ.filter(q=>!G.asked.has(q.id)).length);
 $('#dYes').classList.toggle('hidden',left<=0);$('#dNo').textContent=left>0?'Жоқ':'Нәтижені сақтау';
 $('#dLeft').textContent=left>0?('Қалған көмек: '+left+' / 2'):'Көмек лимиті бітті. Бір жарыста екі реттен артық көмек берілмейді.';
 showScreen('death');
}
$('#dYes').onclick=()=>{const q=pickDeathQ();if(!q){onDeath();return;}hideScreens();
 showQuestion(q,'death',ok=>{G.medUsed++;if(ok){G.correct++;G.lives=1;G.invuln=3;G.state='race';toast('+1 өмір!');}else{G.wrong++;G.state='death';showScreen('nohelp');}});};
$('#dNo').onclick=()=>endRace(false);
$('#nhRestart').onclick=()=>startRace();
$('#nhSave').onclick=()=>endRace(false);

/* ================= FLOW ================= */
function score(){return G.correct*100+G.coins*5;}
function fmtTime(t){const m=Math.floor(t/60),s=t-m*60;return String(m).padStart(2,'0')+':'+s.toFixed(1).padStart(4,'0');}
let starting=false;
async function startRace(){
 if(starting)return;starting=true;
 showScreen('loading');$('#loadMsg').textContent='Сервер жарысты дайындауда…';$('#loadBtns').classList.add('hidden');
 let data;
 try{data=await TR.fn('start-race',{char_idx:G.charIdx,track:G.track});}
 catch(e){starting=false;
  if(e.code==='unauthorized'){location.href=TR.hubUrl();return;}
  $('#loadMsg').textContent=e.code==='track_locked'?'Бұл трасса әлі жабық: алдымен алдыңғы трассаны мәреге дейін өтіңіз.':e.code==='rate_limit'?'Жаңа жарысты 15 секундта бір рет бастауға болады. Сәл күтіп, қайталаңыз.':e.message;
  $('#loadBtns').classList.remove('hidden');return;}
 starting=false;
 hideScreens();resetRace();
 G.raceId=data.race_id;$('#pLabel').textContent=TC.n+'-ТРАССА · '+TC.name.toUpperCase()+' · МӘРЕГЕ ДЕЙІН';G.gateQ=data.gates;G.medQ=data.med;
 $('#hud').classList.remove('hidden');$('#hudBottom').classList.remove('hidden');$('#touch').classList.toggle('hidden',!touchMode);G.state='countdown';G.cd=3;updateAbilityBtn();
}
async function endRace(finished){
 G.state='result';G.finished=finished;center('');
 showScreen('loading');$('#loadMsg').textContent='Нәтиже серверде есептелуде…';$('#loadBtns').classList.add('hidden');
 let r;
 try{r=await TR.fn('finish-race',{race_id:G.raceId,finished:finished,coins:G.coins,lives:G.lives,time_ms:Math.round(G.time*1000)});}
 catch(e){$('#loadMsg').textContent='Нәтиже сақталмады: '+e.message;$('#loadBtns').classList.remove('hidden');return;}
 $('#rEyebrow').textContent='Нәтиже · '+TC.n+'-трасса «'+TC.name+'»';
 $('#rTitle').textContent=finished?'Мәреге жеттіңіз!':'Жарыс аяқталды';
 const st=$('#rStats');st.innerHTML='';
 [['Жалпы ұпай',r.score],['Рейтингтегі орын',r.rank],['Уақыт',fmtTime(r.time_ms/1000)],['Дұрыс жауап',r.correct],['Қате жауап',r.wrong],['Монета',r.coins],['Қалған өмір',r.lives],['Артефакт',G.artifacts+' / 3']].forEach(([a,b])=>{const d=el('div','st');d.appendChild(el('small',null,a));d.appendChild(el('b',null,String(b)));st.appendChild(d);});
 if(finished&&G.track<10){unlocked=Math.max(unlocked,G.track+1);}
 $('#rNote').textContent=(r.new_best?'Жаңа рекорд! ':'')+(finished&&G.track<10?(G.track+1)+'-трасса ашылды! ':'')+'Ұпайды сервер есептеді: дұрыс жауап × 100 + монета × 5'+(finished?' + қалған өмір × 100 + уақыт бонусы ('+r.time_bonus+')':'')+'.';
 renderBoard();
 showScreen('result');
}
async function renderBoard(){
 const box=$('#rBoard');box.innerHTML='';box.appendChild(el('p','note','Жүктелуде…'));
 const s=await TR.session();
 const {data,error}=await TR.sb.from('leaderboard').select('user_id,full_name,best_score,best_level').eq('game',TR.CFG.GAME).order('best_score',{ascending:false}).limit(10);
 box.innerHTML='';
 if(error||!data){box.appendChild(el('p','err','Рейтингті жүктеу мүмкін болмады.'));return;}
 box.appendChild(UI.table(['Орын','Студент','Ұпай','Деңгей'],data.map((x,i)=>({_cls:s&&x.user_id===s.user.id?'me':null,cells:[i+1,x.full_name,x.best_score,x.best_level||'—']})),{num:[2,3]}));
}
function goMenu(){G.state='menu';$('#hud').classList.add('hidden');$('#hudBottom').classList.add('hidden');$('#touch').classList.add('hidden');center('');buildTrack();G.pos=0;}

/* ================= UI ================= */
const SCREENS=['select','loading','question','death','nohelp','pause','result'];
function showScreen(n){$('#overlay').classList.remove('hidden');SCREENS.forEach(s=>$('#scr-'+s).classList.toggle('hidden',s!==n));}
function hideScreens(){$('#overlay').classList.add('hidden');}
function center(t,small){const c=$('#center');c.innerHTML='';if(!t)return;if(small)c.appendChild(el('small',null,small));c.appendChild(document.createTextNode(t));}
function toast(t){const d=el('div',null,t);$('#toast').appendChild(d);setTimeout(()=>d.remove(),2400);}
let unlocked=1,isAdmin=false;
function buildTracks(){
 const box=$('#tracks');box.innerHTML='';
 TT.TRACKS.forEach(T=>{const open=isAdmin||T.n<=unlocked;const b=el('button','trk'+(T.n===G.track?' sel':'')+(open?'':' locked'));
  b.appendChild(el('div','tn',T.n+(T.n===10?' · BOSS':'')));b.appendChild(el('div','tt',T.name));b.appendChild(el('div','te',open?T.era+' · '+'★'.repeat(Math.min(5,Math.ceil(T.n/2))):'Жабық'));
  b.style.background='linear-gradient(160deg,'+T.pal.sky[0]+','+T.pal.grass[1]+')';
  b.onclick=()=>{if(!open){toast('Алдымен '+(T.n-1)+'-трассаны өтіңіз');return;}G.track=T.n;TC=T;try{localStorage.setItem('tarihRaceTrack',String(T.n));}catch(e){}buildTracks();buildTrack();G.pos=0;};
  box.appendChild(b);});
}
async function loadProgress(){
 try{const p=await TR.profile();isAdmin=!!(p&&p.is_admin);
  const s=await TR.session();const {data}=await TR.sb.from('races').select('track').eq('user_id',s.user.id).eq('status','finished');
  const best=(data||[]).reduce((m,r)=>Math.max(m,r.track),0);unlocked=Math.min(10,best+1);}catch(e){}
 if(!isAdmin&&G.track>unlocked)G.track=unlocked;TC=TT.TRACKS[G.track-1];buildTracks();buildTrack();
}
function buildChars(){
 const box=$('#chars');box.innerHTML='';
 CHARS.forEach((c,i)=>{const b=el('button','char'+(i===G.charIdx?' sel':''));
  const nm=el('div','nm');const dot=el('span','dot');dot.style.background=c.color;nm.appendChild(dot);nm.appendChild(document.createTextNode((i+1)+'. '+c.name));b.appendChild(nm);
  b.appendChild(el('div','vh',c.veh));
  [['Жыл.',c.spd],['Нитро',c.nit],['Қорғ.',c.def]].forEach(([l,v])=>{const s=el('div','stat');s.appendChild(el('b',null,l));const bar=el('i');const u=el('u');u.style.width=(v*20)+'%';bar.appendChild(u);s.appendChild(bar);b.appendChild(s);});
  b.appendChild(el('div','ab',(c.active?'Белсенді · ':'Пассив · ')+c.ab));
  b.onclick=()=>{G.charIdx=i;try{localStorage.setItem('tarihRaceChar',String(i));}catch(e){}buildChars();};
  box.appendChild(b);});
}
function buildProgress(){const p=$('#pbar');p.querySelectorAll('.gm').forEach(e=>e.remove());GATE_IDX.forEach((g,i)=>{const m=el('div','gm');m.id='gm'+(i+1);m.style.left=(g/finishIdx*100)+'%';p.appendChild(m);});}
function markGate(n,ok){const m=$('#gm'+n);if(m){m.classList.add('done');if(!ok)m.style.background='#FF8A7A';}}
function updateAbilityBtn(){
 const c=G.char||CHARS[G.charIdx];const b=$('#abilityBtn');b.innerHTML='';
 b.appendChild(el('b',null,c.active?('Қабілет'+(G.abCd>0?' · '+Math.ceil(G.abCd)+' с':(touchMode?' · басыңыз':' · E'))):'Пассив қабілет'));b.appendChild(el('div',null,c.ab));
 b.disabled=!c.active||G.abCd>0;
}
let hudT=0;
function updateHud(dt){
 hudT+=dt;if(hudT<0.08)return;hudT=0;
 if(G.state==='menu'||!G.char)return;
 $('#hLives').textContent='♥'.repeat(G.lives)+'♡'.repeat(Math.max(0,G.maxLives-G.lives));
 $('#hCoins').textContent=G.coins;$('#hScore').textContent=score();$('#hTime').textContent=fmtTime(G.time);
 $('#hSpeed').textContent=Math.round(G.speed/BASE_MAX*220);
 $('#pfill').style.width=clamp((G.pos+playerZ)/(finishIdx*SEG)*100,0,100)+'%';
 $('#hNitro').style.width=G.nitro+'%';
 updateAbilityBtn();
}
$('#startBtn').onclick=()=>startRace();
$('#loadRetry').onclick=()=>{if(G.state==='result')endRace(G.finished);else startRace();};
$('#loadMenu').onclick=()=>{goMenu();buildChars();buildTracks();showScreen('select');};
$('#againBtn').onclick=()=>startRace();
$('#changeBtn').onclick=()=>{goMenu();buildChars();buildTracks();showScreen('select');};
let pausedFrom=null;
function pause(){if(['race','countdown','penalty'].includes(G.state)){pausedFrom=G.state;G.state='pause';showScreen('pause');}}
$('#pauseBtn').onclick=pause;
$('#resumeBtn').onclick=()=>{hideScreens();G.state=pausedFrom||'race';};
$('#restartBtn').onclick=()=>startRace();
$('#menuBtn').onclick=()=>{goMenu();buildChars();buildTracks();showScreen('select');};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
const KEYMAP={ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'nitro'};
window.addEventListener('keydown',e=>{
 if(G.state==='question'){if(qKeyHandler&&document.activeElement.tagName!=='INPUT')qKeyHandler(e);if(e.key==='Enter'&&!$('#qNext').classList.contains('hidden')&&document.activeElement!==$('#qNext'))$('#qNext').click();return;}
 const k=KEYMAP[e.code];if(k){keys[k]=true;if(G.state!=='menu')e.preventDefault();}
 if(e.code==='KeyE')useAbility();
 if(e.code==='KeyP'||e.code==='Escape'){if(G.state==='pause'){hideScreens();G.state=pausedFrom||'race';}else pause();}
});
window.addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k)keys[k]=false;});
$('#abilityBtn').onclick=()=>useAbility();
function hold(id,k){const b=$(id);const on=e=>{e.preventDefault();keys[k]=true;b.classList.add('on');};const off=e=>{e.preventDefault();keys[k]=false;b.classList.remove('on');};
 b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off);}
hold('#tLeft','left');hold('#tRight','right');hold('#tBrake','brake');hold('#tNitro','nitro');
touchMode=('ontouchstart' in window)||(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
if(touchMode)document.body.classList.add('touch');

/* ================= LOOP ================= */
let last=performance.now();
function frame(now){const dt=Math.min(0.05,(now-last)/1000);last=now;update(dt);render();updateHud(dt);requestAnimationFrame(frame);}
(async function boot(){
 const s=await TR.session();
 if(!s){location.href=TR.hubUrl();return;}
 const p=await TR.profile();G.name=TR.displayName(p,s);$('#playerName').textContent=G.name;
 try{const ci=parseInt(localStorage.getItem('tarihRaceChar')||'0',10);if(ci>=0&&ci<CHARS.length)G.charIdx=ci;const tr=parseInt(localStorage.getItem('tarihRaceTrack')||'1',10);if(tr>=1&&tr<=10)G.track=tr;}catch(e){}
 buildChars();await loadProgress();showScreen('select');
})();
buildTrack();
requestAnimationFrame(frame);
})();
