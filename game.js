'use strict';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),overlay=document.querySelector('#overlay'),pauseLayer=document.querySelector('#pauseLayer');
const keys={};let hero='leo',state='menu',level=1,score=0,lives=3,coins=0,timer=180,camera=0,last=0,clock=0,muted=false,audio,platforms=[],gold=[],enemies=[],particles=[],items=[],notice=null,player,world=3600,goal=null;
const POLE_TOP=220,POLE_BOTTOM=416;
function flagPoints(y){const height=Math.max(0,Math.min(1,(POLE_BOTTOM-y)/(POLE_BOTTOM-POLE_TOP)));return height>=.95?5000:height>=.7?2000:height>=.45?800:height>=.2?400:100;}
function captureFlag(){if(state!=='play')return;const bonus=flagPoints(player.y),timeBonus=Math.max(0,Math.floor(timer))*10;score+=bonus+timeBonus;goal={bonus,timeBonus,elapsed:0,flagY:227};state='goal';player.x=world-135-player.w;player.vx=0;player.vy=0;document.querySelector('#pause').style.display='none';beep(800,.3);}
const sprites={leo:['000rrrrr0000','00rrrrrrrr00','00hhhssks000','0hshsssksss0','0hshhssskss0','00hsssskkk00','000ssssss000','00rrbrrb0000','0rrrbrrbrrr0','rrrrbbbbrrrr','ssrbybbybrss','sssbbbbbbsss','00bbbbbbbb00','00bbb00bbb00','0hhh0000hhh0','hhhh0000hhhh'],goomba:['0000bbbb0000','00bbbbbbbb00','0bbbbbbbbbb0','bbwwbbbbwwbb','bbwkbbbbkwbb','bbbbbbbbbbbb','00ssssssss00','0ssssssssss0','hhhsssss hhh','hhhh0000hhhh']};
const walkFrames=[
 ['00rrbrrb0000','0rrrbrrbrr00','ssrrbbbbrrr0','ssrbybbybrss','00bbbbbb00ss','0bbbbbbbb000','0bbb000bbb00','hhhh0000hh00','hhh00000hhhh'],
 ['00rrbrrb0000','00rrbrrbrr00','0srrbbbbrrs0','0srbybbybrs0','00bbbbbbbb00','000bbbbbb000','0000bbbb0000','000hhhhhh000','000hhhhhh000'],
 ['00rrbrrb0000','00rrbrrbrrr0','0rrrbbbbrrss','ssrbybbybrss','ss00bbbbbb00','000bbbbbbbb0','00bbb000bbb0','00hh0000hhhh','hhhh00000hhh']
].map(body=>sprites.leo.slice(0,7).concat(body));
const jumpFrame=sprites.leo.slice(0,7).concat(['ssrrbrrbrrss','ssrrbrrbrrss','0rrrbbbbrrr0','00rbybbybr00','00bbbbbbbb00','0bbbb00bbbb0','0hhh0000hhh0','hhhh0000hhhh','000000000000']);
function playerPose(){if(!player.on)return jumpFrame;if(Math.abs(player.vx)<1)return sprites.leo;return walkFrames[[0,1,2,1][Math.floor((player.walkDistance||0)/12)%4]];}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function sprite(pattern,x,y,scale=2,gus=false){const colors={r:gus?'#64ad43':'#568fc2',h:'#613e2c',s:'#ffd394',k:'#252728',b:'#4b5d91',y:'#ffe181',w:'#fff1c5'};pattern.forEach((row,j)=>[...row].forEach((v,i)=>{if(colors[v])rect(x+i*scale,y+j*scale,scale,scale,colors[v])}))}
// Original two-voice chiptune, synthesized locally so it also works offline.
let musicBus,masterBus,musicTimer,nextNote=0,musicStep=0;
const tune=[76,0,79,83,81,79,76,72,74,0,77,81,79,77,74,71,72,76,79,84,83,79,76,0,74,77,81,86,84,81,77,0,79,0,83,86,88,86,83,79,77,0,81,84,86,84,81,77,76,79,84,83,81,79,76,72,74,77,79,71,72,0,0,0];
function ensureAudio(){
 try{if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;audio=new Audio();masterBus=audio.createGain();masterBus.gain.value=muted?0:1;masterBus.connect(audio.destination);musicBus=audio.createGain();musicBus.gain.value=0;musicBus.connect(masterBus);musicTimer=setInterval(scheduleMusic,75);}audio.resume().catch(()=>{});return true;}catch{return false;}
}
function musicNote(midi,time,duration,type,volume){if(!midi)return;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=type;oscillator.frequency.value=440*Math.pow(2,(midi-69)/12);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.008);gain.gain.setValueAtTime(volume,time+duration*.6);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);oscillator.connect(gain).connect(musicBus);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};oscillator.start(time);oscillator.stop(time+duration+.01);}
function scheduleMusic(){
 if(!audio)return;const active=!muted&&state==='play'&&!document.hidden;
 musicBus.gain.setTargetAtTime(active?1:0,audio.currentTime,.025);
 if(!active){nextNote=0;return;}
 if(!nextNote||nextNote<audio.currentTime)nextNote=audio.currentTime+.025;
 const stepDuration=60/140/2;
 while(nextNote<audio.currentTime+.16){musicNote(tune[musicStep%tune.length],nextNote,stepDuration*.82,'square',.025);if(musicStep%2===0){const bass=[48,53,48,55][Math.floor(musicStep/16)%4];musicNote(bass+(musicStep%4===2?12:0),nextNote,stepDuration*1.6,'triangle',.065);}musicStep++;nextNote+=stepDuration;}
}
function syncSound(){const button=document.querySelector('#sound');document.querySelector('#sound span').textContent=muted?'SONIDO OFF':'SONIDO ON';button.setAttribute('aria-label',muted?'Activar música y efectos':'Silenciar música y efectos');button.setAttribute('aria-pressed',String(!muted));if(audio){masterBus.gain.setTargetAtTime(muted?0:1,audio.currentTime,.015);scheduleMusic();}}
function beep(freq,dur=.1,type='square'){if(muted||!ensureAudio())return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g).connect(masterBus);o.onended=()=>{o.disconnect();g.disconnect()};o.start();o.stop(audio.currentTime+dur)}

function heroHeight(big=false){return (hero==='gus'?38:32)*(big?1.5:1);}
function setup(){const retained=player?{big:player.big,cape:player.cape,star:player.star}:{};goal=null;items=[];notice=null;world=3600+level*260;platforms=[];gold=[];enemies=[];particles=[];const gaps=[[780,890],[1650,1770],[2650,2780]];let start=0;for(const [a,b]of gaps){platforms.push({x:start,y:416,w:a-start,h:64,type:'ground'});start=b}platforms.push({x:start,y:416,w:world-start,h:64,type:'ground'});for(let i=0;i<13;i++){const x=330+i*245,y=300-(i%3)*35;for(let offset=0;offset<(i%3===0?128:96);offset+=32)platforms.push({x:x+offset,y,w:32,h:24,type:'brick'});for(let j=0;j<3;j++)gold.push({x:x+j*30+14,y:y-32,taken:false});if(i%2===0)platforms.push({x:x+32,y:y-105,w:32,h:32,type:'question',used:false,item:['red','star','feather','green'][(i/2)%4]})}for(let x=490;x<world-360;x+=280)enemies.push({x,y:384,w:24,h:32,vx:-(40+level*8),vy:0,kind:'turtle',alive:true});for(let x=130;x<world-180;x+=120)if(!gaps.some(([a,b])=>x>a-20&&x<b+20))gold.push({x,y:365,taken:false});player={x:60,y:380,w:24,h:32,vx:0,vy:0,on:false,jumps:0,jumpHeld:false,walkDistance:0,inv:1.2,big:false,cape:false,star:0,flight:6,...retained};player.h=heroHeight(player.big);player.y=412-player.h;camera=0;timer=180;clock=0;notice={text:region().name+' · '+region().caption,time:4}}
function begin(){document.querySelector('#screen').classList.add('is-playing');score=0;coins=0;lives=3;level=1;player=null;setup();state='play';overlay.style.display='none';document.querySelector('#pause').style.display='block';pauseLayer.hidden=true;musicStep=0;nextNote=0;if(!muted)ensureAudio();syncSound();beep(440)}
function die(){lives--;beep(130,.3,'sawtooth');if(lives<=0){finish(false);return}player.x=Math.max(60,player.x-160);player.y=200;player.vx=0;player.vy=0;player.inv=2;player.big=false;player.cape=false;player.star=0;player.h=heroHeight();player.on=false;player.jumps=1;}
function finish(win){document.querySelector('#screen').classList.remove('is-playing');state='end';overlay.style.display='flex';document.querySelector('#message').textContent=win?'¡AVENTURA COMPLETADA! · '+score+' PUNTOS':'FIN DE LA PARTIDA · '+score+' PUNTOS';document.querySelector('#start').innerHTML='↻ VOLVER A JUGAR <span>ENTER ↵</span>';document.querySelector('#pause').style.display='none';}
function pause(){if(state==='play'){state='pause';pauseLayer.hidden=false}else if(state==='pause'){state='play';pauseLayer.hidden=true}scheduleMusic();}
function breakBrick(block){block.broken=true;score+=50;beep(160,.12,'sawtooth');for(let i=0;i<4;i++)particles.push({type:'debris',x:block.x+(i%2)*16+4,y:block.y+Math.floor(i/2)*12,vx:i%2?95:-95,vy:i<2?-240:-150,life:.75});}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function update(dt){if(state==='goal'){goal.elapsed+=dt;goal.flagY=Math.min(POLE_BOTTOM-35,227+goal.elapsed*80);player.y=Math.min(POLE_BOTTOM-player.h,player.y+100*dt);if(goal.elapsed>=2.6){if(level<3){level++;setup();state='play';document.querySelector('#pause').style.display='block'}else finish(true)}return}if(state!=='play')return;const previousX=player.x,previousBottom=player.y+player.h;clock+=dt;timer-=dt;if(timer<=0){die();timer=180}player.inv=Math.max(0,player.inv-dt);player.star=Math.max(0,player.star-dt);if(notice)notice.time-=dt;const direction=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);player.vx=direction*(hero==='leo'?260:220);if(direction)player.facing=direction;if((keys.Space||keys.ArrowUp||keys.KeyW)&&!player.jumpHeld&&(player.on||player.jumps<2)){const airJump=!player.on;player.jumps=airJump?2:1;player.vy=airJump?(hero==='gus'?-300:-275):(hero==='gus'?-560:-510);player.on=false;beep(airJump?740:550,.12)}player.jumpHeld=keys.Space||keys.ArrowUp||keys.KeyW;
player.x+=player.vx*dt;for(const p of platforms)if(hit(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w}player.x=Math.max(0,player.x);if(!player.on&&player.jumps===0)player.jumps=1;const flying=player.cape&&!player.on&&player.jumpHeld&&player.flight>0;if(flying){player.flight=Math.max(0,player.flight-dt);player.vy=Math.max(-200,player.vy-1800*dt)}player.vy+=(flying?500:1350)*dt;player.y+=player.vy*dt;player.on=false;for(const p of platforms)if(hit(player,p)){if(player.vy>0){player.y=p.y-player.h;player.vy=0;player.on=true;player.jumps=0;player.flight=6}else if(player.vy<0){player.y=p.y+p.h;player.vy=0;if(p.type==='brick'){breakBrick(p)}else if(p.type==='question'&&!p.used){p.used=true;items.push({kind:p.item||'red',x:p.x+4,y:p.y-24,w:24,h:24,vx:0,vy:0,age:0});beep(1000,.15)}}}platforms=platforms.filter(p=>!p.broken);if(player.y>520)die();
for(const c of gold)if(!c.taken&&Math.abs(player.x+12-c.x)<23&&Math.abs(player.y+16-c.y)<29){c.taken=true;coins++;score+=100;beep(900,.06)}
if(player.on&&Math.abs(player.vx)>0)player.walkDistance=(player.walkDistance||0)+Math.abs(player.x-previousX);updateItems(dt);if(player.big&&player.h<heroHeight(true))resizePlayer(heroHeight(true));if(player.cape&&player.y<60){player.y=60;player.vy=Math.max(0,player.vy)}updateEnemies(dt,previousBottom);
for(const p of particles){if(p.type==='debris'){p.x+=p.vx*dt;p.vy+=850*dt;p.y+=p.vy*dt}else p.y-=65*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);camera=Math.max(0,Math.min(world-960,player.x-300));const poleX=world-135;if(Math.min(previousX,player.x)<=poleX+4&&Math.max(previousX+player.w,player.x+player.w)>=poleX&&player.y+player.h>=POLE_TOP&&player.y<=POLE_BOTTOM)captureFlag();player.x=Math.min(player.x,world-player.w);}
function resizePlayer(height){const bottom=player.y+player.h,next={...player,y:bottom-height,h:height};if(height>player.h&&platforms.some(p=>hit(next,p)))return false;player.y=next.y;player.h=height;return true;}
function hurt(){if(player.inv||player.star)return;if(player.big||player.cape){player.big=false;player.cape=false;resizePlayer(heroHeight());player.inv=2;beep(180,.2);notice={text:'¡CUIDADO! HAS PERDIDO EL PODER',time:2};}else die();}
function collectItem(item){score+=1000;beep(1100,.2);const messages={red:'HONGO ROJO · ¡AHORA ERES GRANDE!',star:'ESTRELLA · INMUNIDAD 12 S',feather:'CAPA · MANTÉN SALTO PARA VOLAR',green:'HONGO VERDE · ¡VIDA EXTRA!'};notice={text:messages[item.kind],time:3};if(item.kind==='red'){player.big=true;resizePlayer(heroHeight(true))}if(item.kind==='star')player.star=12;if(item.kind==='feather'){player.cape=true;player.flight=6}if(item.kind==='green')lives++;}
function updateItems(dt){for(const item of items){if(item.taken)continue;item.age+=dt;if(item.age<.35)continue;if(item.age-dt<.35)item.vx=item.kind==='feather'?0:55;const oldY=item.y;item.x+=item.vx*dt;for(const p of platforms)if(hit(item,p)){item.x=item.vx>0?p.x-item.w:p.x+p.w;item.vx=-item.vx;break}item.vy+=700*dt;item.y+=item.vy*dt;for(const p of platforms)if(hit(item,p)&&item.vy>0&&oldY+item.h<=p.y+2){item.y=p.y-item.h;item.vy=item.kind==='star'?-260:0;break}if(hit(player,item)){item.taken=true;collectItem(item)}}items=items.filter(i=>!i.taken&&i.y<540);}
function drawItem(item){const x=item.x,y=item.y;if(item.kind==='red'||item.kind==='green'){const color=item.kind==='red'?'#f16b4e':'#8bdb65';rect(x+4,y,16,4,color);rect(x,y+4,24,10,color);rect(x+3,y+5,5,5,'#fff4cf');rect(x+15,y+3,5,5,'#fff4cf');rect(x+6,y+14,12,10,'#ffe1a1');rect(x+8,y+16,2,4,'#273d32');rect(x+14,y+16,2,4,'#273d32')}else if(item.kind==='star'){ctx.fillStyle=Math.floor(clock*10)%2?'#ffe079':'#fff8cf';ctx.beginPath();for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,r=i%2?6:13;const px=x+12+Math.cos(angle)*r,py=y+12+Math.sin(angle)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.closePath();ctx.fill();rect(x+8,y+9,2,5,'#33452c');rect(x+14,y+9,2,5,'#33452c')}else{rect(x+12,y,8,6,'#fff6cd');rect(x+7,y+5,12,7,'#ffdd71');rect(x+4,y+11,12,6,'#f3b65d');rect(x+9,y+8,3,16,'#fff0af')}}
function capeShape(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();}
function drawCape(flying){
 const wave=Math.round(Math.sin(clock*(flying?15:8))*2);
 if(flying){
  // Fixed shoulder attachment at the back of the neck; only the hem ripples.
  capeShape([[20,10],[12,9],[0,8],[-13,7+wave],[-19,10+wave],[-13,13],[-20,17+wave],[-6,15+wave],[9,15],[19,14]],'#b77c32');
  capeShape([[20,10],[12,10],[0,9],[-12,8+wave],[-17,10+wave],[-11,12],[-17,15+wave],[-5,13+wave],[9,13],[19,13]],'#f3c65b');
  capeShape([[17,11],[5,10],[-11,9+wave],[-5,11+wave],[10,12]],'#ffe397');
  capeShape([[17,13],[4,12],[-10,13+wave],[-4,14+wave],[9,14]],'#d79b3e');
 }else{
  // The standing sprite's shoulders start at y=15, below the head.
  capeShape([[8,15],[3,16],[0,21],[-5,29+wave],[0,28],[4,32+wave],[8,30],[13,31+wave],[14,17]],'#ad7733');
  capeShape([[8,15],[4,17],[2,22],[-3,28+wave],[1,27],[5,30+wave],[9,28],[12,29+wave],[13,17]],'#f3c65b');
  capeShape([[7,17],[4,23],[1,28+wave],[6,26],[10,17]],'#ffe397');
  capeShape([[11,18],[8,27],[10,29],[12,25]],'#d79b3e');
 }
}

function drawFlyingHero(){
 const shirt=hero==='gus'?'#64ad43':'#568fc2';
 // Boots and straight trailing legs, torso, forward arm, then face and cap.
 rect(-12,13,7,5,'#613e2c');rect(-9,19,7,5,'#613e2c');
 rect(-6,12,15,6,'#4b5d91');rect(-3,18,14,5,'#4b5d91');
 rect(6,10,16,11,shirt);rect(6,11,5,10,'#4b5d91');rect(10,12,3,3,'#ffe181');
 rect(17,13,15,5,shirt);rect(31,12,8,6,'#ffd394');rect(37,13,3,4,'#fff1d0');
 rect(20,4,12,10,'#ffd394');rect(19,5,4,8,'#613e2c');rect(28,6,2,3,'#252728');
 rect(30,9,5,3,'#ffd394');rect(27,11,7,2,'#613e2c');
 rect(19,1,12,4,shirt);rect(18,4,17,3,shirt);
}
function drawPlayer(){
 ctx.save();ctx.translate(player.x+player.w/2,player.y);ctx.scale(player.facing===-1?-1:1,player.h/32);ctx.translate(-12,0);
 if(player.star>0){ctx.shadowColor=['#ffdd71','#a7ffcf','#e7adff'][Math.floor(clock*12)%3];ctx.shadowBlur=14;}
 const flying=player.cape&&!player.on&&player.jumpHeld&&player.flight>0&&state==='play';
 if(player.cape)drawCape(flying);
 if(flying)drawFlyingHero();else sprite(playerPose(),0,0,2,hero==='gus');
 ctx.restore();
}

function shellDirection(e){
 const offset=player.x+player.w/2-(e.x+e.w/2);
 if(Math.abs(offset)>2)return offset<0?1:-1;
 if(Math.abs(player.vx)>1)return Math.sign(player.vx);
 return player.facing||1;
}
function updateEnemies(dt,previousBottom){
 for(const e of enemies){
  if(!e.alive)continue;
  const oldY=e.y;
  e.x+=e.vx*dt;
  for(const p of platforms)if(hit(e,p)){if(e.vx>0)e.x=p.x-e.w;else if(e.vx<0)e.x=p.x+p.w;e.vx=-e.vx;break;}
  if(e.x<0){e.x=0;e.vx=Math.abs(e.vx)}else if(e.x+e.w>world){e.x=world-e.w;e.vx=-Math.abs(e.vx)}
  e.vy=(e.vy||0)+1350*dt;e.y+=e.vy*dt;
  let grounded=false;
  for(const p of platforms)if(hit(e,p)&&e.vy>0&&oldY+e.h<=p.y+2){e.y=p.y-e.h;e.vy=0;grounded=true;break;}
  if(e.kind==='turtle'&&grounded){const ahead=e.vx<0?e.x-2:e.x+e.w+2;if(!platforms.some(p=>ahead>=p.x&&ahead<=p.x+p.w&&Math.abs(p.y-(e.y+e.h))<3))e.vx=-e.vx;}
  if(e.y>540){e.alive=false;continue;}
  const overlapX=player.x<e.x+e.w&&player.x+player.w>e.x;
  const stomp=player.vy>0&&overlapX&&previousBottom<=oldY+7&&player.y+player.h>=e.y&&player.y<e.y+e.h;
  if(hit(player,e)&&player.star>0){e.alive=false;score+=200;beep(850,.08);continue;}
  if(stomp){
   player.y=e.y-player.h;player.vy=-330;
   if(e.kind==='turtle'){e.kind='shell';e.y+=e.h-16;e.h=16;e.vx=0;score+=200;}
   else if(e.vx===0){e.vx=shellDirection(e)*360;score+=50;}
   else e.vx=0;
   beep(e.vx?440:240,.12);
  }else if(hit(player,e)&&!player.inv&&(e.kind==='turtle'||e.vx!==0))hurt();
 }
 // Moving shells knock out other enemies; stationary shells remain harmless.
 for(const shell of enemies){if(!shell.alive||shell.kind!=='shell'||shell.vx===0)continue;
  for(const other of enemies){if(other===shell||!other.alive||!hit(shell,other))continue;other.alive=false;score+=200;beep(180,.07);}
 }
}
function drawTurtle(e){
 const x=e.x,y=e.y;
 if(e.kind==='turtle'){
  const head=e.vx<0?x-2:x+14;
  rect(head,y,12,12,'#c4d780');rect(head+(e.vx<0?2:8),y+3,2,3,'#203f32');
  rect(x+2,y+10,20,16,'#3d8554');rect(x+5,y+11,14,3,'#a0cb70');rect(x+10,y+14,3,11,'#24583e');rect(x+2,y+24,22,3,'#e5d6a0');
  const step=Math.floor(clock*9)%2?3:0;rect(x+step,y+27,9,5,'#c6a55f');rect(x+15-step,y+27,9,5,'#c6a55f');
 }else{
  rect(x+5,y,14,3,'#a3ce77');rect(x+2,y+3,20,9,'#3d8554');rect(x+8,y+3,8,8,'#5b9b5a');rect(x+10,y+3,3,9,'#24583e');rect(x,y+12,24,4,'#e4d5a1');rect(x+6,y+13,12,3,'#273d32');
 }
}
function cloud(x,y){rect(x,y,72,20,'#e5f1da');rect(x+12,y-12,24,14,'#e5f1da');rect(x+32,y-20,24,22,'#e5f1da');rect(x+8,y+20,65,5,'#bddbd2')}
function mountain(x,y,w,h){ctx.fillStyle='#87ae9c';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w/2,y-h);ctx.lineTo(x+w,y);ctx.fill();ctx.fillStyle='#9cc0a6';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w/2,y-h);ctx.lineTo(x+w/2,y);ctx.fill()}
const REGIONS=[
 {name:'BAJA CALIFORNIA SUR',short:'BCS',sky:'#8ac9d5',soil:'#b98a5d',edge:'#e3c184',speck:'#d3aa73',shadow:'#946b4c',caption:'Cardones · costa · ballena gris'},
 {name:'BAJA CALIFORNIA',short:'BC',sky:'#b7c9d1',soil:'#9d795c',edge:'#b7b17c',speck:'#bf9c78',shadow:'#765a47',caption:'Cirios · viñedos · borrego cimarrón'},
 {name:'CHIHUAHUA',short:'CHIH.',sky:'#d5c7b5',soil:'#b57652',edge:'#d3a46a',speck:'#d19b71',shadow:'#8c553d',caption:'Sotol · dunas · venado bura'}
];
function region(){return REGIONS[level-1]||REGIONS[0];}
function sceneryLayer(spacing,speed,drawObject){const first=Math.floor(camera*speed/spacing)-1;for(let i=first;i<first+Math.ceil(960/spacing)+3;i++)drawObject(i*spacing-camera*speed,((i%6)+6)%6,i);}
function desertRidge(x,y,w,h,color,light){capeShape([[x,y],[x+w*.2,y-h*.4],[x+w*.42,y-h],[x+w*.55,y-h*.86],[x+w*.7,y-h*.3],[x+w,y]],color);capeShape([[x+w*.42,y-h],[x+w*.55,y-h*.86],[x+w*.7,y-h*.3],[x+w,y],[x+w*.52,y]],light);}
function drawCardon(x,base,height=95){
 const top=base-height;rect(x+17,top,14,height,'#748e73');rect(x+21,top+5,3,height-5,'#9bab80');
 rect(x,top+26,10,35,'#748e73');rect(x+4,top+61,20,10,'#748e73');rect(x+4,top+29,2,29,'#9bab80');
 rect(x+37,top+13,10,37,'#748e73');rect(x+28,top+48,17,10,'#748e73');rect(x+41,top+17,2,28,'#9bab80');
}
function drawCirio(x,base,height=115){capeShape([[x+13,base],[x+15,base-height*.7],[x+27,base-height],[x+26,base-height+18],[x+23,base-height*.6],[x+23,base]],'#9d9f78');for(let j=18;j<height-15;j+=15){rect(x+11,base-j,16,2,'#b9b393');}rect(x+24,base-height-5,6,8,'#c5b18a');}
function drawSotol(x,y){const leaf='#889474';for(const [dx,dy]of [[-24,-25],[-17,-34],[-7,-37],[5,-39],[16,-33],[26,-22]])capeShape([[x,y],[x+dx,y+dy],[x+dx*.5+2,y+dy*.3]],leaf);rect(x-1,y-64,3,64,'#a29874');for(let j=0;j<5;j++)rect(x-4-j%2*2,y-67+j*6,9+j%2*3,3,'#c3b18c');}
function drawBarrelCactus(x,y){rect(x+3,y-24,22,24,'#83916b');rect(x+7,y-29,14,5,'#83916b');for(let j=6;j<24;j+=5)rect(x+j,y-22,2,22,'#b2b080');rect(x+12,y-32,5,4,'#d6b26e');}
function drawPelican(x,y){const wing=Math.floor(clock*3)%2?4:0;rect(x,y,17,4,'#7b999d');rect(x+12,y-3,5,4,'#7b999d');rect(x+17,y-1,11,2,'#c4b78d');capeShape([[x+6,y+2],[x-5,y-7-wing],[x+10,y-2]],'#7b999d');}
function drawBighorn(x,y){const c='#9b9c86';rect(x+8,y+9,32,15,c);rect(x+37,y+3,12,15,c);rect(x+9,y+23,4,14,c);rect(x+33,y+23,4,14,c);rect(x+3,y+11,8,3,c);rect(x+37,y,14,4,'#c1b998');rect(x+47,y+3,5,10,'#c1b998');rect(x+40,y+12,10,4,'#c1b998');rect(x+40,y+7,4,6,'#c1b998');rect(x+46,y+7,2,2,'#666e61');}
function drawDeer(x,y){const c='#b5a184';rect(x+8,y+13,32,13,c);rect(x+35,y+4,8,17,c);rect(x+39,y+2,13,7,c);rect(x+10,y+25,3,16,c);rect(x+33,y+25,3,16,c);rect(x+3,y+11,7,4,'#e1cbb0');rect(x+38,y-8,3,12,c);rect(x+45,y-10,3,13,c);rect(x+33,y-5,7,2,c);rect(x+46,y-6,6,2,c);}
function drawRegionalBackground(){
 const theme=region();rect(0,0,960,480,theme.sky);
 rect(800,82,32,32,level===3?'#ecdbc0':'#e7dca9');rect(795,88,42,20,level===3?'#ecdbc0':'#e7dca9');
 sceneryLayer(290,.07,(x,v)=>{ctx.save();ctx.translate(x+50,95+v%3*24);ctx.scale(.5+v%3*.15,.5+v%3*.15);cloud(0,0);ctx.restore();});
 if(level===1){
  // Coastal BCS: islands, Gulf/Pacific water, granite arch and gray-whale silhouettes.
  rect(0,307,960,109,'#79b5bd');rect(0,331,960,85,'#7bbcc0');
  sceneryLayer(420,.12,(x,v)=>desertRidge(x,321,280,75+v*8,'#b2b39a','#c3bba0'));
  sceneryLayer(560,.16,(x,v)=>{
   if(v%2===0){rect(x+95,276,22,66,'#c4b28f');rect(x+172,286,20,56,'#c4b28f');rect(x+109,266,63,18,'#c4b28f');rect(x+119,281,52,9,'#c4b28f');rect(x+102,275,10,26,'#d3c5a4');}
   else{rect(x+80,347,48,7,'#799fa7');rect(x+85,342,27,6,'#799fa7');capeShape([[x+125,350],[x+139,338],[x+139,351],[x+151,342],[x+144,358]],'#799fa7');rect(x+88,331,2,10,'#c0dddd');rect(x+84,328,10,2,'#c0dddd');}
   drawPelican(x+260,210+v%2*40);
  });
  sceneryLayer(330,.29,(x,v)=>{desertRidge(x-30,416,360,45+v*5,'#c0b08c','#ccb997');drawCardon(x+100,410,85+v%3*20);if(v%2)drawCardon(x+220,416,55);});
 }else if(level===2){
  // Baja California: coastal sierras, cirio desert and the northern vineyard valleys.
  sceneryLayer(300,.13,(x,v)=>desertRidge(x,388,370,100+v%3*25,'#a1aaa3','#b3b4a3'));
  rect(0,382,960,34,'#b6b592');
  sceneryLayer(390,.24,(x,v)=>{
   if(v%2===0){for(let row=0;row<3;row++){for(let post=0;post<5;post++){const px=x+post*40+row*10,py=360+row*14;rect(px,py,3,35,'#a59a78');rect(px-2,py+7,42,2,'#a0a282');rect(px-5,py+2,21,12,'#8fa17d');rect(px+5,py+12,3,4,'#a69caa');}}}
   else{drawBighorn(x+70,362);desertRidge(x+160,416,120,55,'#b8ae91','#c4b79c');}
  });
  sceneryLayer(260,.38,(x,v)=>{if(v%2)drawCirio(x+100,416,100+v*8);else{drawBarrelCactus(x+60,416);drawCirio(x+170,416,85);}});
 }else{
  // Chihuahua: pale dunes, copper-toned sierras, sotol and a distant railway.
  sceneryLayer(330,.12,(x,v)=>desertRidge(x,385,410,105+v%3*25,'#b59b89','#c6aa91'));
  sceneryLayer(290,.2,(x,v)=>capeShape([[x-80,416],[x+40,362-v*3],[x+130,351-v*3],[x+280,416]],'#d4b58d'));
  sceneryLayer(1050,.25,(x,v)=>{
   rect(x+210,380,220,3,'#b09e87');rect(x+220,353,56,25,'#a39580');rect(x+224,346,40,8,'#a39580');rect(x+281,354,55,24,'#a39580');rect(x+342,354,55,24,'#a39580');
   for(let j=0;j<3;j++){rect(x+228+j*60,358,14,8,'#cfb99b');rect(x+230+j*60,376,10,6,'#8d877a');rect(x+252+j*60,376,10,6,'#8d877a');}
   drawDeer(x+650,366);
  });
  sceneryLayer(230,.38,(x,v)=>{if(v%2===0)drawSotol(x+90,416);else{drawBarrelCactus(x+60,416);drawSotol(x+175,416);}});
 }
 // Small desert scrub and stones use a separate, faster parallax layer.
 sceneryLayer(100,.58,(x,v)=>{rect(x+10,411,22,5,level===1?'#b3b692':'#c0ab87');if(v%2){rect(x+16,406,12,5,level===1?'#c2c3a1':'#cfb996');}else{rect(x+16,397,3,19,'#989d77');rect(x+8,405,10,3,'#989d77');rect(x+19,402,11,3,'#989d77');}});
}

function draw(){drawRegionalBackground();const theme=region();
ctx.save();ctx.translate(-Math.round(camera),0);for(const p of platforms){if(p.x+p.w<camera||p.x>camera+960)continue;if(p.type==='ground'){rect(p.x,p.y,p.w,p.h,theme.soil);rect(p.x,p.y,p.w,9,theme.edge);rect(p.x,p.y,p.w,3,theme.speck);for(let x=p.x+6;x<p.x+p.w;x+=32){rect(x,p.y+19,13,5,theme.speck);rect(x+17,p.y+43,8,6,theme.shadow)}}else if(p.type==='brick'){rect(p.x,p.y,p.w,p.h,'#ad7952');for(let x=p.x;x<p.x+p.w;x+=32){rect(x,p.y,32,2,'#e0ad72');rect(x,p.y+12,32,2,'#654733');rect(x,p.y,2,12,'#654733');rect(x+16,p.y+12,2,12,'#654733')}}else{rect(p.x,p.y,32,32,p.used?'#8a7957':'#e7b74e');rect(p.x+3,p.y+3,26,2,'#ffe29a');rect(p.x+3,p.y+28,26,3,'#a77432');ctx.fillStyle=p.used?'#a99b7e':'#80542a';ctx.font='bold 24px monospace';ctx.fillText(p.used?'·':'?',p.x+8,p.y+25)}}
for(const c of gold)if(!c.taken){const w=6+Math.abs(Math.sin(performance.now()/200+c.x))*5;rect(c.x-w/2,c.y-10,w,19,'#e9a93d');rect(c.x-w/2+2,c.y-8,3,14,'#ffe5a0')}
for(const item of items)drawItem(item);for(const e of enemies)if(e.alive)drawTurtle(e);
const flag=world-135;rect(flag,220,4,196,'#ece4bd');rect(flag-4,213,12,12,'#e6c269');const flagY=goal?goal.flagY:227;rect(flag+4,flagY,49,31,hero==='leo'?'#568fc2':'#55b84c');ctx.fillStyle='#fff2d4';ctx.font='bold 17px monospace';ctx.fillText(hero==='leo'?'L':'G',flag+19,flagY+22);rect(world-80,352,70,64,'#b4a07b');rect(world-65,376,24,40,'#3b5147');for(let i=0;i<4;i++)rect(world-80+i*20,340,12,15,'#b4a07b');
if(state==='menu'){sprite(sprites.leo,170,384,2);ctx.save();ctx.translate(205,378);ctx.scale(1,38/32);sprite(sprites.leo,0,0,2,true);ctx.restore()}else if(player&&(player.inv<=0||Math.floor(performance.now()/85)%2===0))drawPlayer();for(const p of particles)if(p.life>0){if(p.type==='debris'){rect(p.x,p.y,10,8,'#ad7952');rect(p.x,p.y,10,2,'#e0ad72')}else{ctx.font='bold 16px monospace';ctx.fillStyle='#fff4ab';ctx.fillText('+200',p.x,p.y)}}ctx.restore();if(state!=='menu'){rect(0,0,960,55,'#173c3bcc');ctx.font='bold 13px monospace';ctx.fillStyle='#f5efce';ctx.fillText(hero.toUpperCase(),26,22);ctx.fillText(String(score).padStart(6,'0'),26,41);ctx.fillStyle='#ffdc79';ctx.fillText('● × '+String(coins).padStart(2,'0'),255,34);ctx.fillStyle='#f5efce';ctx.fillText('NIVEL '+level+' · '+theme.short,440,34);ctx.font='bold 12px monospace';ctx.fillStyle='#fff0cd';ctx.fillText(theme.name,26,471);ctx.fillText('♥ × '+lives,657,34);ctx.fillText('TIEMPO '+Math.ceil(timer),795,34);if(player.star>0||player.cape||player.big){ctx.fillStyle='#ffdf79';ctx.font='bold 12px monospace';ctx.fillText(player.star>0?'★ INMUNE '+Math.ceil(player.star)+'s':player.cape?'CAPA · VUELO '+Math.ceil(player.flight)+'s':'SUPER '+hero.toUpperCase(),26,75)}if(notice&&notice.time>0){rect(180,83,600,30,'#173c3bdd');ctx.textAlign='center';ctx.fillStyle='#ffdf79';ctx.font='bold 13px monospace';ctx.fillText(notice.text,480,103);ctx.textAlign='start'}}}
function drawGoal(){if(state!=='goal')return;rect(245,105,470,175,'#132c28ed');ctx.textAlign='center';ctx.fillStyle='#c1f463';ctx.font='bold 24px monospace';ctx.fillText(region().name,480,145);ctx.fillStyle='#ffdd7c';ctx.font='bold 29px monospace';ctx.fillText('BANDERA +'+goal.bonus,480,191);ctx.fillStyle='#eef0d8';ctx.font='16px monospace';ctx.fillText('TIEMPO +'+goal.timeBonus,480,222);ctx.font='12px monospace';ctx.fillText(level<3?'SIGUIENTE: '+REGIONS[level].name:'¡RECORRIDO COMPLETADO!',480,254);ctx.textAlign='start';}
function frame(t){const dt=Math.min((t-last)/1000,.025);last=t;update(dt);draw();drawGoal();requestAnimationFrame(frame)}
setup();requestAnimationFrame(frame);document.querySelector('#start').onclick=begin;document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{hero=b.dataset.hero;document.querySelectorAll('[data-hero]').forEach(x=>{x.classList.toggle('chosen',x===b);x.setAttribute('aria-pressed',String(x===b))})});document.querySelector('#pause').onclick=pause;pauseLayer.onclick=pause;document.querySelector('#sound').onclick=()=>{muted=!muted;if(!muted)ensureAudio();syncSound();beep(600)};syncSound();document.addEventListener('visibilitychange',scheduleMusic);window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!e.repeat){if(e.code==='Enter'&&(state==='menu'||state==='end'))begin();if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='KeyR'&&state!=='menu')begin()}keys[e.code]=true});window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);if(state==='play')pause()});document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys[b.dataset.key]=false});

// Keep touch controls inside the element promoted to the fullscreen top layer.
const gameScreen=document.querySelector('#screen'),touchControls=document.querySelector('.touch');
const touchHome=document.createComment('touch-controls-home');touchControls.before(touchHome);
let fallbackFullscreen=false;
function syncFullscreen(){
 const active=document.fullscreenElement===gameScreen||document.webkitFullscreenElement===gameScreen||fallbackFullscreen;
 Object.keys(keys).forEach(k=>keys[k]=false);
 gameScreen.classList.toggle('immersive',active);document.body.classList.toggle('game-fullscreen',active);
 if(active)gameScreen.append(touchControls);else touchHome.after(touchControls);
}
async function toggleFullscreen(){
 if(document.fullscreenElement){await document.exitFullscreen();return;}
 if(document.webkitFullscreenElement){document.webkitExitFullscreen();return;}
 if(fallbackFullscreen){fallbackFullscreen=false;syncFullscreen();return;}
 try{if(gameScreen.requestFullscreen)await gameScreen.requestFullscreen();else if(gameScreen.webkitRequestFullscreen)gameScreen.webkitRequestFullscreen();else{fallbackFullscreen=true;syncFullscreen();}}
 catch{fallbackFullscreen=true;syncFullscreen();}
}
document.querySelector('#full').onclick=toggleFullscreen;
document.querySelector('#exit-full').onclick=toggleFullscreen;
document.addEventListener('fullscreenchange',syncFullscreen);
document.addEventListener('webkitfullscreenchange',syncFullscreen);
window.addEventListener('keydown',event=>{if(event.code==='Escape'&&fallbackFullscreen){fallbackFullscreen=false;syncFullscreen();}});
