'use strict';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),overlay=document.querySelector('#overlay'),pauseLayer=document.querySelector('#pauseLayer');
const keys={};let hero='leo',state='menu',level=1,lives=3,coins=0,timer=180,camera=0,last=0,clock=0,muted=false,audio,platforms=[],gold=[],enemies=[],particles=[],items=[],notice=null,player,world=3600,goal=null;
const POLE_TOP=220,POLE_BOTTOM=416;
function flagCoins(y){const height=Math.max(0,Math.min(1,(POLE_BOTTOM-y)/(POLE_BOTTOM-POLE_TOP)));return height>=.95?50:height>=.7?20:height>=.45?8:height>=.2?4:1;}
function captureFlag(){if(state!=='play')return;const bonus=flagCoins(player.y),timeBonus=Math.max(0,Math.floor(timer/10));coins+=bonus+timeBonus;goal={bonus,timeBonus,elapsed:0,flagY:227};state='goal';player.x=world-135-player.w;player.vx=0;player.vy=0;document.querySelector('#pause').style.display='none';beep(800,.3);}
const sprites={leo:['0000hhhh0000','000hhhhhh000','00hhhssks000','0hshsssksss0','0hshhssskss0','00hsssskkk00','000ssssss000','00rrccrr0000','0rrrdrrrrrr0','rrrrdrrrrrrr','ssrrdrrrrrss','sssppyyppsss','00ttuttutt00','00ttt00ttt00','0ooo0000ooo0','oooo0000oooo']};
const walkFrames=[
 ['00rrccrr0000','0rrrdrrrrr00','ssrrdrrrrrr0','ssrrppyyppss','00tttttt00ss','0tttutttt000','0ttt000ttt00','oooo0000oo00','ooo00000oooo'],
 ['00rrccrr0000','00rrdrrrrr00','0srrdrrrrrs0','0srrppyypps0','00ttuttutt00','000tttttt000','0000tttt0000','000oooooo000','000oooooo000'],
 ['00rrccrr0000','00rrdrrrrrr0','0rrrdrrrrrss','ssrrppyyppss','ss00tttttt00','000tttutttt0','00ttt000ttt0','00oo0000oooo','oooo00000ooo']
].map(body=>sprites.leo.slice(0,7).concat(body));
const jumpFrame=sprites.leo.slice(0,7).concat(['ssrrccrrrrss','ssrrdrrrrrss','0rrrppyyprr0','00ttuttutt00','00tttttttt00','0tttt00tttt0','0ooo0000ooo0','oooo0000oooo','000000000000']);
function playerPose(){if(!player.on)return jumpFrame;if(Math.abs(player.vx)<1)return sprites.leo;return walkFrames[[0,1,2,1][Math.floor((player.walkDistance||0)/12)%4]];}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function sprite(pattern,x,y,scale=2,gus=false){const colors={r:gus?'#64ad43':'#568fc2',h:'#613e2c',s:'#ffd394',k:'#252728',d:gus?'#437c3d':'#3e6f99',c:gus?'#d9bb68':'#d59a58',t:'#b79a68',u:'#8b734d',p:'#574736',o:'#594733',y:'#e1bc64',w:'#fff1c5'};pattern.forEach((row,j)=>[...row].forEach((v,i)=>{if(colors[v])rect(x+i*scale,y+j*scale,scale,scale,colors[v])}))}
// Original two-voice chiptune, synthesized locally so it also works offline.
let musicBus,masterBus,musicTimer,nextNote=0,musicStep=0;
// Original melodies inspired by regional dance rhythms, rendered as chiptunes.
const STATE_MUSIC=[
 {name:'Polca sudcaliforniana',bpm:120,beats:2,gate:.72,thirds:false,
  melody:[72,76,79,76,74,77,79,0,76,79,84,83,81,79,76,0,77,81,84,81,79,76,74,0,74,77,83,81,79,77,76,0,72,76,79,84,83,81,79,76,77,81,84,86,84,81,79,0,76,79,84,83,81,79,77,74,76,74,71,74,72,0,72,0],
  roots:[48,48,53,55,48,53,55,48]},
 {name:'Corrido fronterizo',bpm:108,beats:3,gate:.88,thirds:false,
  melody:[67,0,71,74,76,74,71,0,67,69,71,0,69,0,72,76,77,76,72,0,69,71,72,0,71,0,74,79,78,76,74,0,71,72,74,0,71,74,72,69,66,69,67,0,67,0,0,0],
  roots:[43,43,48,48,50,50,50,43]},
 {name:'Polca chihuahuense',bpm:152,beats:2,gate:.57,thirds:true,
  melody:[74,78,81,86,85,86,81,78,79,83,86,88,86,83,79,0,81,85,88,90,88,85,81,79,78,81,86,85,86,81,78,0,86,85,83,81,79,78,76,74,76,79,83,86,85,83,81,0,78,81,86,90,88,86,85,81,83,79,76,73,74,0,74,0],
  roots:[38,43,45,38,38,43,45,38]}
];
let musicLevel=0;
function playMusicStep(track,step,time,duration){
 const note=track.melody[step%track.melody.length];
 musicNote(note,time,duration*track.gate,'square',.022);
 // A second, softer voice suggests accordion reeds in the brisk Chihuahua polca.
 if(note&&track.thirds)musicNote(note-((note%12===6||note%12===1)?3:4),time,duration*.5,'square',.008);
 const position=step%(track.beats*2);
 const root=track.roots[Math.floor(step/(track.beats*4))%track.roots.length];
 if(position===0){musicNote(root,time,duration*1.45,'triangle',.065);musicNote(36,time,.055,'sine',.025);}
 else if(track.beats===2&&position===2)musicNote(root+7,time,duration*1.35,'triangle',.055);
 // Offbeat accompaniment in 2/4; strummed beats two and three in 3/4.
 if(track.beats===2?position%2===1:position===2||position===4){
  musicNote(root+12,time,duration*.48,'triangle',.028);
  musicNote(root+16,time,duration*.43,'triangle',.02);
  musicNote(root+19,time,duration*.4,'triangle',.018);
 }
}

function ensureAudio(){
 try{if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;audio=new Audio();masterBus=audio.createGain();masterBus.gain.value=muted?0:1;masterBus.connect(audio.destination);musicBus=audio.createGain();musicBus.gain.value=0;musicBus.connect(masterBus);musicTimer=setInterval(scheduleMusic,75);}audio.resume().catch(()=>{});return true;}catch{return false;}
}
function musicNote(midi,time,duration,type,volume){if(!midi)return;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=type;oscillator.frequency.value=440*Math.pow(2,(midi-69)/12);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.008);gain.gain.setValueAtTime(volume,time+duration*.6);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);oscillator.connect(gain).connect(musicBus);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};oscillator.start(time);oscillator.stop(time+duration+.01);}
function scheduleMusic(){
 if(!audio)return;const active=!muted&&state==='play'&&!document.hidden;
 musicBus.gain.setTargetAtTime(active?1:0,audio.currentTime,.025);
 if(!active){nextNote=0;return;}
 if(musicLevel!==level){musicLevel=level;musicStep=0;nextNote=0;}
 if(!nextNote||nextNote<audio.currentTime)nextNote=audio.currentTime+.025;
 const track=STATE_MUSIC[level-1]||STATE_MUSIC[0],stepDuration=60/track.bpm/2;
 while(nextNote<audio.currentTime+.16){playMusicStep(track,musicStep,nextNote,stepDuration);musicStep++;nextNote+=stepDuration;}

}
function syncSound(){const button=document.querySelector('#sound');document.querySelector('#sound span').textContent=muted?'SONIDO OFF':'SONIDO ON';button.setAttribute('aria-label',muted?'Activar música y efectos':'Silenciar música y efectos');button.setAttribute('aria-pressed',String(!muted));if(audio){masterBus.gain.setTargetAtTime(muted?0:1,audio.currentTime,.015);scheduleMusic();}}
function beep(freq,dur=.1,type='square'){if(muted||!ensureAudio())return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g).connect(masterBus);o.onended=()=>{o.disconnect();g.disconnect()};o.start();o.stop(audio.currentTime+dur)}

function heroHeight(big=false){return (hero==='gus'?38:32)*(big?1.5:1);}
function setup(){const retained=player?{big:player.big,cape:player.cape,star:player.star}:{};goal=null;items=[];notice=null;world=3600+level*260;platforms=[];gold=[];enemies=[];particles=[];const gaps=[[780,890],[1650,1770],[2650,2780]];let start=0;for(const [a,b]of gaps){platforms.push({x:start,y:416,w:a-start,h:64,type:'ground'});start=b}platforms.push({x:start,y:416,w:world-start,h:64,type:'ground'});for(let i=0;i<13;i++){const x=330+i*245,y=300-(i%3)*35;for(let offset=0;offset<(i%3===0?128:96);offset+=32)platforms.push({x:x+offset,y,w:32,h:24,type:'brick'});for(let j=0;j<3;j++)gold.push({x:x+j*30+14,y:y-32,taken:false});if(i%2===0)platforms.push({x:x+32,y:y-105,w:32,h:32,type:'question',used:false,item:['red','star','feather','green'][(i/2)%4]})}if(level===1)enemies.push({x:230,y:384,w:24,h:32,vx:0,vy:0,kind:'turtle',alive:true,age:0,direction:1,homeMin:180,homeMax:270});spawnRegionalEnemies();for(let x=130;x<world-180;x+=120)if(!gaps.some(([a,b])=>x>a-20&&x<b+20))gold.push({x,y:365,taken:false});player={x:60,y:380,w:24,h:32,vx:0,vy:0,on:false,jumps:0,jumpHeld:false,walkDistance:0,inv:1.2,big:false,cape:false,star:0,flight:6,...retained};player.h=heroHeight(player.big);player.y=412-player.h;camera=0;timer=180;clock=0;notice={text:region().name+' · '+region().caption,time:4}}
function begin(){document.querySelector('#screen').classList.add('is-playing');coins=0;lives=3;level=1;player=null;setup();state='play';overlay.style.display='none';document.querySelector('#pause').style.display='block';pauseLayer.hidden=true;musicStep=0;nextNote=0;if(!muted)ensureAudio();syncSound();beep(440);saveGame(false)}
function die(){lives--;beep(130,.3,'sawtooth');if(lives<=0){finish(false);return}player.x=Math.max(60,player.x-160);player.y=200;player.vx=0;player.vy=0;player.inv=2;player.big=false;player.cape=false;player.star=0;player.h=heroHeight();player.on=false;player.jumps=1;}
function finish(win){clearSave();document.querySelector('#screen').classList.remove('is-playing');state='end';overlay.style.display='flex';document.querySelector('#message').textContent=win?'¡AVENTURA COMPLETADA! · '+coins+' MONEDAS':'FIN DE LA PARTIDA · '+coins+' MONEDAS';document.querySelector('#start').innerHTML='↻ VOLVER A JUGAR <span>ENTER ↵</span>';document.querySelector('#pause').style.display='none';}
function pause(){if(state==='play'){state='pause';pauseLayer.hidden=false;saveGame(false)}else if(state==='pause'){state='play';pauseLayer.hidden=true}scheduleMusic();}
function breakBrick(block){block.broken=true;beep(160,.12,'sawtooth');for(let i=0;i<4;i++)particles.push({type:'debris',x:block.x+(i%2)*16+4,y:block.y+Math.floor(i/2)*12,vx:i%2?95:-95,vy:i<2?-240:-150,life:.75});}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function update(dt){if(state==='goal'){goal.elapsed+=dt;goal.flagY=Math.min(POLE_BOTTOM-35,227+goal.elapsed*80);player.y=Math.min(POLE_BOTTOM-player.h,player.y+100*dt);if(goal.elapsed>=2.6){if(level<3){level++;setup();state='play';document.querySelector('#pause').style.display='block';saveGame(false)}else finish(true)}return}if(state!=='play')return;const previousX=player.x,previousBottom=player.y+player.h;clock+=dt;timer-=dt;if(timer<=0){die();timer=180}player.inv=Math.max(0,player.inv-dt);player.star=Math.max(0,player.star-dt);player.examine=player.star>0?Math.max(0,(player.examine||0)-dt):0;if(notice)notice.time-=dt;const direction=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);player.vx=direction*(hero==='leo'?260:220);if(direction)player.facing=direction;if((keys.Space||keys.ArrowUp||keys.KeyW)&&!player.jumpHeld&&(player.on||player.jumps<2)){const airJump=!player.on;player.jumps=airJump?2:1;const jumpSpeed=hero==='gus'?-560:-510,airJumpSpeed=hero==='gus'?-620:-600;player.vy=airJump?Math.min(player.vy,airJumpSpeed):jumpSpeed;player.on=false;beep(airJump?740:550,.12)}player.jumpHeld=keys.Space||keys.ArrowUp||keys.KeyW;
player.x+=player.vx*dt;for(const p of platforms)if(hit(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w}player.x=Math.max(0,player.x);if(!player.on&&player.jumps===0)player.jumps=1;const flying=player.cape&&!player.on&&player.jumpHeld&&player.flight>0;if(flying){player.flight=Math.max(0,player.flight-dt);player.vy=Math.max(-200,player.vy-1800*dt)}player.vy+=(flying?500:1350)*dt;player.y+=player.vy*dt;player.on=false;for(const p of platforms)if(hit(player,p)){if(player.vy>0){player.y=p.y-player.h;player.vy=0;player.on=true;player.jumps=0;player.flight=6}else if(player.vy<0){player.y=p.y+p.h;player.vy=0;if(p.type==='brick'){breakBrick(p)}else if(p.type==='question'&&!p.used){p.used=true;items.push({kind:p.item||'red',x:p.x+4,y:p.y-24,w:24,h:24,vx:0,vy:0,age:0});beep(1000,.15)}}}platforms=platforms.filter(p=>!p.broken);if(player.y>520)die();
for(const c of gold)if(!c.taken&&Math.abs(player.x+12-c.x)<23&&Math.abs(player.y+16-c.y)<29){c.taken=true;coins++;beep(900,.06)}
if(player.on&&Math.abs(player.vx)>0)player.walkDistance=(player.walkDistance||0)+Math.abs(player.x-previousX);updateItems(dt);if(player.big&&player.h<heroHeight(true))resizePlayer(heroHeight(true));if(player.cape&&player.y<60){player.y=60;player.vy=Math.max(0,player.vy)}updateEnemies(dt,previousBottom);
for(const p of particles){if(p.type==='debris'){p.x+=p.vx*dt;p.vy+=850*dt;p.y+=p.vy*dt}else p.y-=65*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);camera=Math.max(0,Math.min(world-960,player.x-300));const poleX=world-135;if(Math.min(previousX,player.x)<=poleX+4&&Math.max(previousX+player.w,player.x+player.w)>=poleX&&player.y+player.h>=POLE_TOP&&player.y<=POLE_BOTTOM)captureFlag();player.x=Math.min(player.x,world-player.w);}
function resizePlayer(height){const bottom=player.y+player.h,next={...player,y:bottom-height,h:height};if(height>player.h&&platforms.some(p=>hit(next,p)))return false;player.y=next.y;player.h=height;return true;}
function hurt(){if(player.inv||player.star)return;lives--;if(lives<=0){finish(false);return;}player.inv=1.6;beep(180,.15);notice={text:'¡CUIDADO! DALE ESPACIO A LA FAUNA',time:1.6};}
function collectItem(item){beep(1100,.2);const messages={red:'HONGO ROJO · ¡AHORA ERES GRANDE!',star:'EXPLORADOR · OBSERVA SIN DAÑO · 12 S',feather:'CAPA · MANTÉN SALTO PARA VOLAR',green:'HONGO VERDE · ¡VIDA EXTRA!'};notice={text:messages[item.kind],time:3};if(item.kind==='red'){player.big=true;resizePlayer(heroHeight(true))}if(item.kind==='star'){player.star=12;player.examine=0;for(const e of enemies)e.explorerNearby=false;}if(item.kind==='feather'){player.cape=true;player.flight=6}if(item.kind==='green')lives++;}
function updateItems(dt){for(const item of items){if(item.taken)continue;item.age+=dt;if(item.age<.35)continue;if(item.age-dt<.35)item.vx=item.kind==='feather'?0:55;const oldY=item.y;item.x+=item.vx*dt;for(const p of platforms)if(hit(item,p)){item.x=item.vx>0?p.x-item.w:p.x+p.w;item.vx=-item.vx;break}item.vy+=700*dt;item.y+=item.vy*dt;for(const p of platforms)if(hit(item,p)&&item.vy>0&&oldY+item.h<=p.y+2){item.y=p.y-item.h;item.vy=item.kind==='star'?-260:0;break}if(hit(player,item)){item.taken=true;collectItem(item)}}items=items.filter(i=>!i.taken&&i.y<540);}
function drawExplorerHelmet(x,y){
 rect(x+7,y-4,10,2,'#d8c08a');rect(x+4,y-2,16,5,'#c4a66b');
 rect(x+5,y-2,4,3,'#ead6a3');rect(x+4,y+1,16,2,'#736b48');
 rect(x,y+3,25,2,'#c4a66b');rect(x+2,y+3,21,1,'#ead6a3');
}
function drawMagnifier(x,y){
 rect(x+2,y+10,3,9,'#725536');rect(x+3,y+10,1,7,'#b58b51');
 capeShape([[x,y+2],[x+3,y],[x+9,y],[x+12,y+3],[x+12,y+9],[x+9,y+12],[x+3,y+12],[x,y+9]],'#263d42');
 capeShape([[x+2,y+3],[x+4,y+2],[x+8,y+2],[x+10,y+4],[x+10,y+8],[x+8,y+10],[x+4,y+10],[x+2,y+8]],'#c4e2d8');
 rect(x+4,y+3,2,2,'#edf3dc');
}
function drawItem(item){const x=item.x,y=item.y;if(item.kind==='red'||item.kind==='green'){const color=item.kind==='red'?'#f16b4e':'#8bdb65';rect(x+4,y,16,4,color);rect(x,y+4,24,10,color);rect(x+3,y+5,5,5,'#fff4cf');rect(x+15,y+3,5,5,'#fff4cf');rect(x+6,y+14,12,10,'#ffe1a1');rect(x+8,y+16,2,4,'#273d32');rect(x+14,y+16,2,4,'#273d32')}else if(item.kind==='star'){drawExplorerHelmet(x,y+5);rect(x+4,y+11,15,13,'#9f8a55');rect(x+10,y+11,2,13,'#efe1b1');rect(x+5,y+15,4,4,'#c5b17b');rect(x+14,y+15,4,4,'#c5b17b');}else{rect(x+12,y,8,6,'#fff6cd');rect(x+7,y+5,12,7,'#ffdd71');rect(x+4,y+11,12,6,'#f3b65d');rect(x+9,y+8,3,16,'#fff0af')}}
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
 rect(-6,12,15,6,'#b79a68');rect(-3,18,14,5,'#b79a68');rect(-2,13,4,3,'#8b734d');
 rect(6,10,16,11,shirt);rect(8,11,10,2,hero==='gus'?'#437c3d':'#3e6f99');rect(5,12,3,10,'#574736');rect(5,15,3,3,'#e1bc64');rect(19,10,3,8,hero==='gus'?'#d9bb68':'#d59a58');
 rect(17,13,15,5,shirt);rect(31,12,8,6,'#ffd394');rect(37,13,3,4,'#fff1d0');
 rect(20,4,12,10,'#ffd394');rect(19,5,4,8,'#613e2c');rect(28,6,2,3,'#252728');
 rect(30,9,5,3,'#ffd394');rect(27,11,7,2,'#613e2c');
 if(player.star<=0){rect(19,1,12,4,'#613e2c');rect(18,4,6,3,'#613e2c');}
}
function drawExplorer(flying){
 const x=flying?8:4,y=flying?11:14,trim=hero==='gus'?'#64ad43':'#568fc2';
 ctx.save();ctx.globalAlpha=Math.min(1,(12-player.star)/.3);
 rect(x,y,6,12,'#bba06b');rect(x+9,y,7,12,'#bba06b');
 rect(x+1,y+1,4,2,trim);rect(x+10,y+1,5,2,trim);
 rect(x+1,y+6,4,4,'#e0c58c');rect(x+10,y+6,5,4,'#e0c58c');
 rect(x+1,y+6,4,1,'#756746');rect(x+10,y+6,5,1,'#756746');
 ctx.restore();drawExplorerHelmet(flying?13:0,-1);
 if(player.examine>0){
  const lift=Math.round(Math.min(1,player.examine/.15)*3),handX=flying?31:20;
  rect(handX,16-lift,9,4,'#ffd394');drawMagnifier(handX+6,3-lift);
 }
}
function drawPlayer(){
 const facing=player.examine>0?player.examineFacing:player.facing;
 ctx.save();ctx.translate(player.x+player.w/2,player.y);ctx.scale(facing===-1?-1:1,player.h/32);ctx.translate(-12,0);
 const flying=player.cape&&!player.on&&player.jumpHeld&&player.flight>0&&state==='play';
 if(player.cape)drawCape(flying);
 if(flying)drawFlyingHero();else{const pose=playerPose();sprite(player.star>0?pose.map((row,index)=>index<2?'0'.repeat(row.length):row):pose,0,0,2,hero==='gus');}
 if(player.star>0)drawExplorer(flying);
 ctx.restore();
}

function animalHabitat(e){
 let ground=platforms.find(p=>p.type==='ground'&&e.x+e.w>p.x&&e.x<p.x+p.w);
 if(!ground){
  const grounds=platforms.filter(p=>p.type==='ground'&&p.w>e.w+80);
  ground=grounds.reduce((nearest,p)=>!nearest||Math.abs(p.x+p.w/2-e.x)<Math.abs(nearest.x+nearest.w/2-e.x)?p:nearest,null);
  if(!ground)return;
  e.x=Math.max(ground.x+40,Math.min(e.x,ground.x+ground.w-e.w-40));e.y=Math.min(e.y,ground.y-e.h);e.vy=0;
 }
 if(!Number.isFinite(e.homeMin))e.homeMin=Math.max(ground.x+40,e.x-64);
 if(!Number.isFinite(e.homeMax))e.homeMax=Math.min(ground.x+ground.w-e.w-40,e.x+64);
 e.homeMin=Math.max(ground.x+8,Math.min(e.homeMin,ground.x+ground.w-e.w-8));
 e.homeMax=Math.max(e.homeMin,Math.min(e.homeMax,ground.x+ground.w-e.w-8));
}
function restoreAnimal(e){
 if(e.kind==='shell'){const bottom=e.y+e.h;e.kind='turtle';e.w=24;e.h=32;e.y=bottom-e.h;e.vx=0;e.vy=0;}
 if(!Number.isFinite(e.age))e.age=0;
 if(e.direction!==-1&&e.direction!==1)e.direction=Math.sign(e.vx)||1;
 animalHabitat(e);
 return e;
}
function spawnRegionalEnemies(){
 const kind=['crab','snake','scorpion'][level-1],size={crab:[30,20],snake:[30,18],scorpion:[34,24]}[kind];
 for(let i=0;i<12;i+=2){
  const left=330+i*245+(i%3===0?128:96),right=330+(i+1)*245,w=size[0];
  const x=(left+right-w)/2;
  const ground=platforms.find(p=>p.type==='ground'&&x>=p.x+96&&x+w<=p.x+p.w-96);
  if(!ground)continue;
  enemies.push({x,y:416-size[1],w,h:size[1],vx:0,vy:0,kind,alive:true,age:i*.27,direction:i%4===0?1:-1,homeMin:left+16,homeMax:right-w-16});
 }
}
function regionalMovement(e,dt){
 e.age+=dt;
 let speed=0;e.alert=false;
 if(e.kind==='turtle')speed=e.age%3.4<2.2?20:0;
 else if(e.kind==='crab')speed=e.age%2.2<1.2?42:0;
 else if(e.kind==='snake'){const phase=e.age%2.8;e.alert=phase>=1.5&&phase<1.9;speed=phase>=1.9?58:0;}
 else if(e.kind==='scorpion'){const phase=e.age%2.5;speed=phase<.8?48:0;}
 e.vx=e.direction*speed;
}
function drawRegionalEnemy(e){
 ctx.save();ctx.translate(e.x,e.y);if(e.direction===-1){ctx.translate(e.w,0);ctx.scale(-1,1)}
 const step=e.vx!==0&&Math.floor(e.age*9)%2?2:0;
 if(e.kind==='crab'){
  // Broad orange shell, raised claws, stalked eyes and sideways legs.
  rect(5,7,20,10,'#d8764c');rect(8,5,14,3,'#f1aa69');
  rect(0,2,6,7,'#df8952');rect(24,2,6,7,'#df8952');rect(2,8,4,5,'#d8764c');rect(24,8,4,5,'#d8764c');
  rect(9,1,3,7,'#e5b77c');rect(18,1,3,7,'#e5b77c');rect(9,1,2,2,'#242b2c');rect(19,1,2,2,'#242b2c');
  rect(2,15,8,3,'#b55e3d');rect(21,15,7,3,'#b55e3d');rect(4+step,18,6,2,'#b55e3d');rect(20-step,18,6,2,'#b55e3d');
 }else if(e.kind==='snake'){
  // Sand-colored coils with diamond markings, a raised head and rattling tail.
  rect(4,11-step,17,5,'#b78c49');rect(12,7,10,9,'#cfaa68');rect(19,3,10,7,'#d5b576');rect(26,7,4,3,'#d5b576');
  rect(14,8,4,3,'#72513d');rect(8,11-step,4,3,'#72513d');rect(23,4,2,2,'#282c2c');rect(29,8,3,1,'#b96d5b');
  const rattle=e.alert?Math.floor(e.age*24)%2*2:0;rect(1,7-step-rattle,4,5,'#e2cf94');rect(0,5-step-rattle,3,3,'#b7985d');rect(4,15,20,3,'#b78c49');
 }else{
  // Low armored body with pincers and a distinctly curled tail.
  rect(9,12,17,8,'#976b49');rect(11,11,13,3,'#ba8957');rect(25,11,6,5,'#ba8957');
  rect(29,8,5,4,'#b58250');rect(30,16,4,4,'#b58250');
  rect(5,8,5,9,'#a3764d');rect(2,3,5,8,'#a3764d');rect(5,0,9,4,'#a3764d');rect(12,2,5,4,'#a3764d');rect(15,5,3,4,'#e0b779');
  for(let j=0;j<3;j++)rect(10+j*5,20+(j+step)%2,3,3,'#79563e');rect(25,12,2,2,'#272b2b');
 }
 ctx.restore();
}

function examineEnemy(e){
 const horizontal=Math.max(0,e.x-player.x-player.w,player.x-e.x-e.w);
 const vertical=Math.max(0,e.y-player.y-player.h,player.y-e.y-e.h);
 if(horizontal>64||vertical>40)e.explorerNearby=false;
 if(horizontal>36||vertical>18||e.explorerNearby)return;
 e.explorerNearby=true;player.examine=.7;
 player.examineFacing=e.x+e.w/2<player.x+player.w/2?-1:1;
 const names={turtle:'TORTUGA',crab:'CANGREJO',snake:'SERPIENTE DE CASCABEL',scorpion:'ALACRÁN'};
 const first=!e.observed;e.observed=true;
 if(first)coins+=5;
 notice={text:'OBSERVANDO: '+names[e.kind]+(first?' · +5 MONEDAS':''),time:1.4};
 beep(660,.07,'triangle');
}
function separateFromAnimal(e){
 const direction=player.x+player.w/2<e.x+e.w/2?-1:1;
 const supported=platforms.some(p=>p.type==='ground'&&player.x+player.w/2>=p.x&&player.x+player.w/2<=p.x+p.w&&Math.abs(player.y+player.h-p.y)<4);
 const next={...player,x:direction<0?e.x-player.w-2:e.x+e.w+2};
 const safeGround=!supported||platforms.some(p=>p.type==='ground'&&next.x>=p.x&&next.x+next.w<=p.x+p.w);
 if(next.x>=0&&next.x+next.w<=world&&safeGround&&!platforms.some(p=>hit(next,p)))player.x=next.x;
}
function updateEnemies(dt,previousBottom){
 for(const e of enemies){
  if(!e.alive)continue;
  restoreAnimal(e);
  const oldY=e.y;
  regionalMovement(e,dt);
  e.x+=e.vx*dt;
  if(Number.isFinite(e.homeMin)&&e.x<e.homeMin){e.x=e.homeMin;e.direction=1;e.vx=Math.abs(e.vx);}
  if(Number.isFinite(e.homeMax)&&e.x>e.homeMax){e.x=e.homeMax;e.direction=-1;e.vx=-Math.abs(e.vx);}
  for(const p of platforms)if(hit(e,p)){if(e.vx>0)e.x=p.x-e.w;else if(e.vx<0)e.x=p.x+p.w;e.direction=-e.direction;e.vx=-e.vx;break;}
  e.vy+=1350*dt;e.y+=e.vy*dt;
  for(const p of platforms)if(hit(e,p)&&e.vy>0&&oldY+e.h<=p.y+2){e.y=p.y-e.h;e.vy=0;break;}
  if(player.star>0){examineEnemy(e);continue;}
  e.explorerNearby=false;
  const overlapX=player.x<e.x+e.w&&player.x+player.w>e.x;
  const landing=player.vy>0&&overlapX&&previousBottom<=oldY+7&&player.y+player.h>=e.y&&player.y<e.y+e.h;
  if(landing){
   const next={...player,y:e.y-player.h};
   if(!platforms.some(p=>hit(next,p))){player.y=next.y;player.vy=-230;player.on=false;player.jumps=Math.max(1,player.jumps);}
   player.inv=Math.max(player.inv,.35);beep(330,.06,'triangle');
  }else if(hit(player,e)&&!player.inv){hurt();if(state!=='play')return;separateFromAnimal(e);}
 }
}
function drawTurtle(e){
 const x=e.x,y=e.y;
  const head=e.direction===-1?x-2:x+14;
  rect(head,y,12,12,'#c4d780');rect(head+(e.direction===-1?2:8),y+3,2,3,'#203f32');
  rect(x+2,y+10,20,16,'#3d8554');rect(x+5,y+11,14,3,'#a0cb70');rect(x+10,y+14,3,11,'#24583e');rect(x+2,y+24,22,3,'#e5d6a0');
  const step=e.vx!==0&&Math.floor(e.age*9)%2?3:0;rect(x+step,y+27,9,5,'#c6a55f');rect(x+15-step,y+27,9,5,'#c6a55f');
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
for(const item of items)drawItem(item);for(const e of enemies)if(e.alive){if(e.kind==='turtle')drawTurtle(e);else drawRegionalEnemy(e);}
const flag=world-135;rect(flag,220,4,196,'#ece4bd');rect(flag-4,213,12,12,'#e6c269');const flagY=goal?goal.flagY:227;rect(flag+4,flagY,49,31,hero==='leo'?'#568fc2':'#55b84c');ctx.fillStyle='#fff2d4';ctx.font='bold 17px monospace';ctx.fillText(hero==='leo'?'L':'G',flag+19,flagY+22);rect(world-80,352,70,64,'#b4a07b');rect(world-65,376,24,40,'#3b5147');for(let i=0;i<4;i++)rect(world-80+i*20,340,12,15,'#b4a07b');
if(state==='menu'){sprite(sprites.leo,170,384,2);ctx.save();ctx.translate(205,378);ctx.scale(1,38/32);sprite(sprites.leo,0,0,2,true);ctx.restore()}else if(player&&(player.inv<=0||Math.floor(performance.now()/85)%2===0))drawPlayer();for(const p of particles)if(p.life>0){if(p.type==='debris'){rect(p.x,p.y,10,8,'#ad7952');rect(p.x,p.y,10,2,'#e0ad72')}}ctx.restore();if(state!=='menu'){drawHud(theme);if(player.star>0||player.cape||player.big){ctx.fillStyle='#ffdf79';ctx.font='bold 12px monospace';ctx.fillText(player.star>0?'EXPLORADOR · INMUNE '+Math.ceil(player.star)+'s':player.cape?'CAPA · VUELO '+Math.ceil(player.flight)+'s':'SUPER '+hero.toUpperCase(),26,75)}if(notice&&notice.time>0){rect(180,83,600,30,'#173c3bdd');ctx.textAlign='center';ctx.fillStyle='#ffdf79';ctx.font='bold 13px monospace';ctx.fillText(notice.text,480,103);ctx.textAlign='start'}}}
function drawHeart(x,y,color='#f34d57'){
 const rows=['0110110','1111111','1111111','0111110','0011100','0001000'];
 rows.forEach((row,j)=>[...row].forEach((pixel,i)=>{if(pixel==='1')rect(x+i*3,y+j*3,3,3,color);}));
 rect(x+3,y+3,3,3,'#ff9ba1');
}
function drawHud(theme){
 rect(0,0,960,61,'#173c3bf0');
 ctx.font='bold 13px monospace';ctx.fillStyle='#f5efce';ctx.fillText(hero.toUpperCase(),26,25);
 ctx.font='bold 11px monospace';ctx.fillStyle='#ffdc79';ctx.fillText('MONEDAS',180,17);
 rect(180,26,13,19,'#e9a93d');rect(183,28,3,14,'#ffe5a0');
 ctx.font='bold 24px monospace';ctx.fillText(String(coins),204,45);
 ctx.font='bold 13px monospace';ctx.fillStyle='#f5efce';ctx.fillText('NIVEL '+level+' · '+theme.short,400,35);
 ctx.font='bold 11px monospace';ctx.fillStyle='#ff9ba1';ctx.fillText('VIDAS',610,17);
 if(lives<=5){for(let i=0;i<Math.max(0,lives);i++)drawHeart(610+i*28,27);}
 else{drawHeart(610,27);ctx.font='bold 24px monospace';ctx.fillStyle='#ff6973';ctx.fillText('× '+lives,640,46);}
 ctx.font='bold 13px monospace';ctx.fillStyle='#f5efce';ctx.fillText('TIEMPO '+Math.ceil(timer),795,35);
 ctx.font='bold 12px monospace';ctx.fillStyle='#fff0cd';ctx.fillText(theme.name,26,471);
}
function drawGoal(){if(state!=='goal')return;rect(245,105,470,175,'#132c28ed');ctx.textAlign='center';ctx.fillStyle='#c1f463';ctx.font='bold 24px monospace';ctx.fillText(region().name,480,145);ctx.fillStyle='#ffdd7c';ctx.font='bold 29px monospace';ctx.fillText('BANDERA +'+goal.bonus+' MONEDAS',480,191);ctx.fillStyle='#eef0d8';ctx.font='16px monospace';ctx.fillText('TIEMPO +'+goal.timeBonus+' MONEDAS',480,222);ctx.font='12px monospace';ctx.fillText(level<3?'SIGUIENTE: '+REGIONS[level].name:'¡RECORRIDO COMPLETADO!',480,254);ctx.textAlign='start';}
function frame(t){const dt=Math.min((t-last)/1000,.025);last=t;update(dt);draw();drawGoal();saveTick(dt);requestAnimationFrame(frame)}
const SAVE_KEY='higueradev.leo-gus.save.v1';
let saveElapsed=0;
const saveStatus=document.querySelector('#save-status'),continueButton=document.querySelector('#continue');
function validSave(data){
 const finite=(n)=>typeof n==='number'&&Number.isFinite(n),box=o=>o&&['x','y','w','h'].every(k=>finite(o[k]))&&o.w>0&&o.h>0;
 return data&&[1,2].includes(data.version)&&['leo','gus'].includes(data.hero)&&Number.isInteger(data.level)&&data.level>=1&&data.level<=3&&Number.isInteger(data.lives)&&data.lives>0&&data.lives<10000&&[data.coins,data.timer,data.clock,data.savedAt].every(finite)&&data.timer>0&&data.timer<=180&&Number.isInteger(data.coins)&&data.coins>=0&&box(data.player)&&['vx','vy','inv','star','flight','jumps'].every(k=>finite(data.player[k]))&&['big','cape','on'].every(k=>typeof data.player[k]==='boolean')&&['platforms','gold','enemies','items'].every(k=>Array.isArray(data[k])&&data[k].length<1000)&&data.platforms.every(p=>box(p)&&['ground','brick','question'].includes(p.type))&&data.gold.every(c=>c&&finite(c.x)&&finite(c.y))&&data.enemies.every(e=>box(e)&&finite(e.vx)&&finite(e.vy)&&['turtle','shell','crab','snake','scorpion'].includes(e.kind))&&data.items.every(i=>box(i)&&finite(i.vx)&&finite(i.vy)&&finite(i.age)&&['red','green','star','feather'].includes(i.kind));
}
function readSave(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw||raw.length>500000)return null;const data=JSON.parse(raw);return validSave(data)?data:null;}catch{return null;}}
function refreshContinue(){const data=readSave();continueButton.hidden=!data;if(data){continueButton.textContent='[ CONTINUAR · '+data.hero.toUpperCase()+' · '+REGIONS[data.level-1].short+' ]';document.querySelector('#start').innerHTML='[ NUEVA PARTIDA ] <span>ENTER ↵</span>';document.querySelector('#save-hint').textContent='Partida del '+new Date(data.savedAt).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})+' · guardada en este navegador.';}}
function saveGame(manual=false){
 if(state!=='play'&&state!=='pause')return false;
 saveElapsed=0;
 try{
  const data={version:2,savedAt:Date.now(),hero,level,lives,coins,timer,clock,player:{...player},platforms,gold,enemies,items};
  if(!validSave(data))throw Error('Invalid state');localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  saveStatus.textContent=manual?'Partida guardada.':'Guardado automático · '+new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  refreshContinue();return true;
 }catch{saveStatus.textContent='No se pudo guardar. Comprueba que el navegador permita almacenamiento local.';return false;}
}
function clearSave(){try{localStorage.removeItem(SAVE_KEY)}catch{}continueButton.hidden=true;document.querySelector('#save-hint').textContent='Guardado local en este navegador y dispositivo.';saveStatus.textContent='Partida terminada.';}
function continueGame(){
 const data=readSave();if(!data){saveStatus.textContent='No se encontró una partida compatible.';refreshContinue();return;}
 hero=data.hero;level=data.level;lives=data.lives;coins=data.coins;timer=data.timer;clock=data.clock;
 player={...data.player};platforms=data.platforms;gold=data.gold;enemies=data.enemies.map(restoreAnimal);items=data.items;
 world=3600+level*260;camera=Math.max(0,Math.min(world-960,player.x-300));particles=[];goal=null;state='play';saveElapsed=0;
 Object.keys(keys).forEach(k=>keys[k]=false);player.jumpHeld=false;
 notice={text:'PARTIDA RECUPERADA · '+region().name,time:3};
 overlay.style.display='none';pauseLayer.hidden=true;document.querySelector('#screen').classList.add('is-playing');document.querySelector('#pause').style.display='block';
 document.querySelectorAll('[data-hero]').forEach(b=>{const chosen=b.dataset.hero===hero;b.classList.toggle('chosen',chosen);b.setAttribute('aria-pressed',String(chosen))});
 musicStep=0;nextNote=0;musicLevel=0;if(!muted)ensureAudio();syncSound();saveStatus.textContent='Partida recuperada.';
}
function saveTick(dt){
 const enabled=state==='play'||state==='pause';document.querySelector('#save').disabled=!enabled;
 if(state==='play'){saveElapsed+=dt;if(saveElapsed>=5)saveGame(false);}
}
document.querySelector('#save').onclick=()=>saveGame(true);
document.querySelector('#save-pause').onclick=event=>{event.stopPropagation();saveGame(true);};
continueButton.onclick=continueGame;
window.addEventListener('pagehide',()=>saveGame(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame(false);});
refreshContinue();

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
