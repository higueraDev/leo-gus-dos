'use strict';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),overlay=document.querySelector('#overlay'),pauseLayer=document.querySelector('#pauseLayer');
const keys={};let hero='leo',state='menu',level=1,lives=3,coins=0,timer=180,camera=0,last=0,clock=0,muted=false,audio,platforms=[],gold=[],enemies=[],particles=[],items=[],notice=null,player,world=3600,goal=null;
const POLE_TOP=220,POLE_BOTTOM=416;
const SHOP_ITEMS={red:{name:'HONGO ROJO',price:5},star:{name:'EXPLORADOR',price:10},feather:{name:'PARAPENTE',price:20},green:{name:'VIDA EXTRA',price:15},binoculars:{name:'BINOCULARES',price:12}};
const RECORDS_KEY='higueradev.leo-gus.expeditions.v1';
const SPECIES_NAMES={turtle:'Tortuga',crab:'Cangrejo',snake:'Serpiente de cascabel',scorpion:'Alacrán'};
let expedition=freshExpedition();
function freshExpedition(){return {startedAt:Date.now(),progress:{},completedRegions:[],species:[],earnedCoins:0,spentCoins:0,partial:false,binoculars:false,journal:{}}; }
let fieldMode=null;
const FIELD_FLORA={coast:'Vegetación costera',desert:'Vegetación del desierto',forest:'Vegetación del bosque',highland:'Vegetación de altura',farmland:'Cultivos regionales',city:'Áreas verdes urbanas',volcano:'Vegetación volcánica',jungle:'Vegetación de selva',wetland:'Vegetación de humedal'};
function fieldEntries(){return [{id:'flora',name:FIELD_FLORA[region().biome]||'Vegetación regional',x:600},{id:'landscape',name:'Paisaje de '+region().name,x:1250}];}
function journalEntry(id,name,reward=0){
 const entries=expedition.journal[region().id]||(expedition.journal[region().id]=[]);
 if(entries.some(entry=>entry.id===id))return false;
 entries.push({id,name});if(reward)earnCoins(reward);
 notice={text:'CUADERNO: '+name.toUpperCase()+(reward?' · +'+reward+' MONEDAS':''),time:3};return true;
}
function discoverField(){for(const entry of fieldEntries())if(Math.abs(player.x-entry.x)<55&&player.on)journalEntry(entry.id,entry.name,3);}
function closeField(){fieldMode=null;document.querySelector('#field-panel').hidden=true;Object.keys(keys).forEach(k=>keys[k]=false);camera=Math.max(0,Math.min(world-960,player.x-300));scheduleMusic();}
function openField(mode){
 if(fieldMode){closeField();return;}
 if(state!=='play'&&state!=='end')return;
 if(mode==='binoculars'&&(state!=='play'||!expedition.binoculars)){notice={text:'BINOCULARES · DISPONIBLES EN BLOQUES · 12 MONEDAS',time:3};return;}
 fieldMode=mode;document.querySelector('#field-panel').classList.toggle('is-binoculars',mode==='binoculars');Object.keys(keys).forEach(k=>keys[k]=false);saveGame(false);
 const panel=document.querySelector('#field-panel');panel.hidden=false;
 document.querySelector('#field-title').textContent=mode==='journal'?'CUADERNO DE CAMPO':'BINOCULARES · RUTA POR DELANTE';
 document.querySelector('#field-content').innerHTML=mode==='journal'?REGIONS.map(r=>{const entries=expedition.journal[r.id]||[];return entries.length?'<article><h3>'+r.name+'</h3><ul>'+entries.map(e=>'<li>'+e.name+'</li>').join('')+'</ul></article>':'';}).join('')||'<p>Acércate a los letreros de vegetación y paisaje. Usa la lupa del equipo explorador para registrar animales. Cada ficha de flora o paisaje da 3 monedas una sola vez por estado.</p>':'<p>La expedición está detenida. Inspecciona plataformas, animales y huecos antes de continuar.</p>';
 if(mode==='binoculars')camera=Math.max(0,Math.min(world-960,player.x+250));
 document.querySelector('#field-close').focus();scheduleMusic();
}
function expeditionKm(){return Object.values(expedition.progress).reduce((total,value)=>total+value,0)/1000;}
function recordTravel(x){
 if(state!=='play')return;
 const id=region().id,progress=Math.max(0,Math.min(world-135-player.w,x)-60);
 expedition.progress[id]=Math.max(expedition.progress[id]||0,progress);
}
function earnCoins(amount){coins+=amount;expedition.earnedCoins+=amount;}
function validJournal(journal){return journal&&typeof journal==='object'&&!Array.isArray(journal)&&Object.entries(journal).every(([id,entries])=>REGIONS.some(r=>r.id===id)&&Array.isArray(entries)&&entries.length<=6&&new Set(entries.map(e=>e.id)).size===entries.length&&entries.every(e=>e&&['flora','landscape',...Object.keys(SPECIES_NAMES)].includes(e.id)&&typeof e.name==='string'&&e.name.length<=100&&!/[<>&]/.test(e.name)));}
function validExpedition(data){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,unique=(list,allowed)=>Array.isArray(list)&&list.length<=allowed.length&&new Set(list).size===list.length&&list.every(value=>allowed.includes(value));
 const ids=REGIONS.map(r=>r.id);
 return data&&Number.isFinite(data.startedAt)&&data.startedAt>0&&typeof data.partial==='boolean'&&integer(data.earnedCoins)&&integer(data.spentCoins)&&unique(data.species,Object.keys(SPECIES_NAMES))&&unique(data.completedRegions,ids)&&(data.binoculars===undefined||typeof data.binoculars==='boolean')&&(data.journal===undefined||validJournal(data.journal))&&data.progress&&typeof data.progress==='object'&&!Array.isArray(data.progress)&&Object.entries(data.progress).every(([id,value])=>ids.includes(id)&&Number.isFinite(value)&&value>=0&&value<=13000);
}
function restoreExpedition(data){
 if(data.version>=4)return {...freshExpedition(),...JSON.parse(JSON.stringify(data.expedition))};
 const restored=freshExpedition(),stage=savedStage(data),legacy=['bcs','bc','chih'];
 const oldChihuahua=data.regionId==='chih'&&data.world===4380;
 restored.completedRegions=data.version<3?legacy.slice(0,data.level-1):oldChihuahua?legacy.slice(0,2):REGIONS.slice(0,stage-1).map(r=>r.id);
 for(const id of restored.completedRegions){const index=REGIONS.findIndex(r=>r.id===id);restored.progress[id]=levelLength(index+1)-219;}
 const width=data.version<3?3600+data.level*260:data.world;
 restored.progress[REGIONS[stage-1].id]=Math.max(0,Math.min(width-159,data.player.x)-60);
 restored.species=[...new Set(data.enemies.filter(e=>e.observed).map(e=>e.kind==='shell'?'turtle':e.kind))];
 restored.earnedCoins=data.coins;restored.partial=true;return restored;
}
function validRecord(record){
 const date=record&&record.endedAt;
 return record&&typeof record.id==='string'&&record.id.length<100&&Number.isFinite(date)&&date>0&&date<=8640000000000000&&['leo','gus'].includes(record.hero)&&typeof record.won==='boolean'&&Number.isFinite(record.km)&&record.km>=0&&record.km<=1000&&Number.isSafeInteger(record.balance)&&record.balance>=0&&validExpedition(record.expedition);
}
function readRecords(){
 try{const raw=localStorage.getItem(RECORDS_KEY);if(!raw||raw.length>200000)return [];const list=JSON.parse(raw);return Array.isArray(list)?list.filter(validRecord).slice(0,20):[];}catch{return [];}
}
function renderRecords(){
 const records=readRecords().sort((a,b)=>b.expedition.completedRegions.length-a.expedition.completedRegions.length||b.expedition.species.length-a.expedition.species.length||b.km-a.km||b.expedition.earnedCoins-a.expedition.earnedCoins||b.endedAt-a.endedAt);
 document.querySelector('#records-empty').hidden=records.length>0;
 document.querySelector('#records-body').innerHTML=records.map((record,index)=>'<tr><td>'+(index+1)+'</td><td>'+record.hero.toUpperCase()+'<small>'+new Date(record.endedAt).toLocaleDateString('es-MX')+' · '+(record.won&&record.expedition.completedRegions.length===32?'Guardianes de México':record.won?'Completada':'Finalizada')+(record.expedition.partial?' · Parcial':'')+'</small></td><td>'+record.km.toFixed(2)+'</td><td>'+record.expedition.earnedCoins+'<small>Saldo: '+record.balance+'</small></td><td>'+record.expedition.species.length+'</td><td>'+record.expedition.completedRegions.length+'/32</td></tr>').join('');
}
function saveResult(won){
 const record={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),endedAt:Date.now(),hero,won,km:Number(expeditionKm().toFixed(3)),balance:coins,expedition:JSON.parse(JSON.stringify(expedition))};
 try{localStorage.setItem(RECORDS_KEY,JSON.stringify([record,...readRecords()].slice(0,20)));record.persisted=true;}catch{record.persisted=false;}
 renderRecords();return record;
}
function showResult(record){
 const data=record.expedition,complete=record.won&&data.completedRegions.length===REGIONS.length;
 document.querySelector('#result-km').textContent=record.km.toFixed(2);
 document.querySelector('#result-coins').textContent=String(data.earnedCoins);
 document.querySelector('#result-species').textContent=String(data.species.length);
 document.querySelector('#result-balance').textContent='Saldo final: '+record.balance+' · Gastadas en equipo: '+data.spentCoins;
 document.querySelector('#result-regions').textContent='Entidades completadas: '+data.completedRegions.length+' / '+REGIONS.length;
 document.querySelector('#result-species-list').textContent=data.species.length?'Especies observadas: '+data.species.map(kind=>SPECIES_NAMES[kind]).join(' · '):'Aún no se registraron especies con la lupa.';
 document.querySelector('#result-recognition').textContent=complete?'Por explorar las 32 entidades de México respetando la flora y fauna de cada región.':record.won?'Llegaste al Caribe. Cada región explorada y cada animal observado forman parte de tu aventura.':'Tu expedición terminó en '+region().name+'. Gracias por recorrer México y observar su fauna sin dañarla.';
 document.querySelector('#result-badge').hidden=!complete;
 document.querySelector('#result-storage').textContent=(record.persisted?'Marcador guardado en este navegador.':'No se pudo guardar el marcador en este navegador.')+(data.partial?' Los registros anteriores a esta versión son parciales.':'');
 document.querySelector('#expedition-summary').hidden=false;
 document.querySelector('.characters').hidden=true;
 document.querySelector('.tag').textContent='RESUMEN DE EXPEDICIÓN';
 document.querySelector('#screen').classList.add('has-result');
}
function chooseHero(){
 state='menu';document.querySelector('#screen').classList.remove('has-result');document.querySelector('#expedition-summary').hidden=true;document.querySelector('.characters').hidden=false;document.querySelector('.tag').textContent='SELECCIONAR JUGADOR';document.querySelector('#message').textContent='ELIGE A TU HERMANO Y COMIENZA LA AVENTURA';document.querySelector('#start').innerHTML='[ EJECUTAR ] <span>ENTER ↵</span>';
}
function flagCoins(y){const height=Math.max(0,Math.min(1,(POLE_BOTTOM-y)/(POLE_BOTTOM-POLE_TOP)));return height>=.95?50:height>=.7?20:height>=.45?8:height>=.2?4:1;}
function captureFlag(){if(state!=='play')return;recordTravel(player.x);if(!expedition.completedRegions.includes(region().id))expedition.completedRegions.push(region().id);const bonus=flagCoins(player.y),timeBonus=Math.max(0,Math.floor(timer/10));earnCoins(bonus+timeBonus);goal={bonus,timeBonus,elapsed:0,flagY:227};state='goal';player.x=world-135-player.w;player.vx=0;player.vy=0;document.querySelector('#pause').style.display='none';beep(800,.3);}
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
 const track=STATE_MUSIC[region().music]||STATE_MUSIC[0],stepDuration=60/track.bpm/2;
 while(nextNote<audio.currentTime+.16){playMusicStep(track,musicStep,nextNote,stepDuration);musicStep++;nextNote+=stepDuration;}

}
function syncSound(){const button=document.querySelector('#sound');document.querySelector('#sound span').textContent=muted?'SONIDO OFF':'SONIDO ON';button.setAttribute('aria-label',muted?'Activar música y efectos':'Silenciar música y efectos');button.setAttribute('aria-pressed',String(!muted));if(audio){masterBus.gain.setTargetAtTime(muted?0:1,audio.currentTime,.015);scheduleMusic();}}
function beep(freq,dur=.1,type='square'){if(muted||!ensureAudio())return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g).connect(masterBus);o.onended=()=>{o.disconnect();g.disconnect()};o.start();o.stop(audio.currentTime+dur)}

function levelLength(stage){return 3860+(stage-1)%4*120;}
function stagePlatform(index){
 const original=['bcs','bc','chih'].includes(region().id),shift=original?0:(level%3-1)*12;
 return {x:330+index*245+(index%2===0?shift:-shift),y:300-((index+(original?0:level-1))%3)*35,w:index%3===0?128:96};
}
function stageGaps(){return [[780,890],[1650,1770],[2650,2780]].map(([a,b],index)=>{const shift=['bcs','bc','chih'].includes(region().id)?0:((level+index)%3-1)*16;return [a+shift,b+shift];});}
function syncJourney(){document.querySelectorAll('[data-region]').forEach((node,index)=>{node.classList.toggle('visited',index<level-1);if(index===level-1)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');});}
function heroHeight(big=false){return (hero==='gus'?38:32)*(big?1.5:1);}
function setup(){const retained=player?{big:player.big,cape:player.cape,star:player.star}:{};goal=null;items=[];notice=null;world=levelLength(level);platforms=[];gold=[];enemies=[];particles=[];const gaps=stageGaps();let start=0;for(const [a,b]of gaps){platforms.push({x:start,y:416,w:a-start,h:64,type:'ground'});start=b}platforms.push({x:start,y:416,w:world-start,h:64,type:'ground'});for(let i=0;i<13;i++){const {x,y,w}=stagePlatform(i);for(let offset=0;offset<w;offset+=32)platforms.push({x:x+offset,y,w:32,h:24,type:'brick'});for(let j=0;j<3;j++)gold.push({x:x+j*30+14,y:y-32,taken:false});if(i%2===0)platforms.push({x:x+32,y:y-105,w:32,h:32,type:'question',used:false,item:i===8?'binoculars':['red','star','feather','green'][(i/2)%4]})}if(region().id==='bcs')enemies.push({x:230,y:384,w:24,h:32,vx:0,vy:0,kind:'turtle',alive:true,age:0,direction:1,homeMin:180,homeMax:270});spawnRegionalEnemies();for(let x=130;x<world-180;x+=120)if(!gaps.some(([a,b])=>x>a-20&&x<b+20))gold.push({x,y:365,taken:false});player={x:60,y:380,w:24,h:32,vx:0,vy:0,on:false,jumps:0,jumpHeld:false,walkDistance:0,inv:1.2,big:false,cape:false,star:0,flight:6,...retained};player.h=heroHeight(player.big);player.y=412-player.h;camera=0;timer=180;clock=0;notice={text:region().name+' · '+region().caption,time:4};syncJourney();}
function begin(){closeField();expedition=freshExpedition();document.querySelector('#screen').classList.remove('has-result');document.querySelector('#expedition-summary').hidden=true;document.querySelector('.characters').hidden=false;document.querySelector('.tag').textContent='SELECCIONAR JUGADOR';document.querySelector('#screen').classList.add('is-playing');coins=0;lives=3;level=1;player=null;setup();state='play';overlay.style.display='none';document.querySelector('#pause').style.display='block';pauseLayer.hidden=true;musicStep=0;nextNote=0;if(!muted)ensureAudio();syncSound();beep(440);saveGame(false)}
function die(){lives--;beep(130,.3,'sawtooth');if(lives<=0){finish(false);return}player.x=Math.max(60,player.x-160);player.y=200;player.vx=0;player.vy=0;player.inv=2;player.big=false;player.cape=false;player.star=0;player.h=heroHeight();player.on=false;player.jumps=1;}
function finish(win){if(state==='end')return;const result=saveResult(win);clearSave();document.querySelector('#screen').classList.remove('is-playing');state='end';overlay.style.display='flex';document.querySelector('#message').textContent=win?'¡AVENTURA COMPLETADA!':'FIN DE LA EXPEDICIÓN';showResult(result);document.querySelector('#start').innerHTML='↻ NUEVA EXPEDICIÓN <span>ENTER ↵</span>';document.querySelector('#pause').style.display='none';}
function pause(){if(fieldMode)closeField();if(state==='play'){state='pause';pauseLayer.hidden=false;saveGame(false)}else if(state==='pause'){state='play';pauseLayer.hidden=true}scheduleMusic();}
function breakBrick(block){block.broken=true;beep(160,.12,'sawtooth');for(let i=0;i<4;i++)particles.push({type:'debris',x:block.x+(i%2)*16+4,y:block.y+Math.floor(i/2)*12,vx:i%2?95:-95,vy:i<2?-240:-150,life:.75});}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function update(dt){if(fieldMode)return;if(state==='goal'){goal.elapsed+=dt;goal.flagY=Math.min(POLE_BOTTOM-35,227+goal.elapsed*80);player.y=Math.min(POLE_BOTTOM-player.h,player.y+100*dt);if(goal.elapsed>=2.6){if(level<REGIONS.length){level++;setup();state='play';document.querySelector('#pause').style.display='block';saveGame(false)}else finish(true)}return}if(state!=='play')return;const previousX=player.x,previousBottom=player.y+player.h;clock+=dt;timer-=dt;if(timer<=0){die();timer=180;if(state!=='play')return;}player.inv=Math.max(0,player.inv-dt);player.star=Math.max(0,player.star-dt);player.examine=player.star>0?Math.max(0,(player.examine||0)-dt):0;if(notice)notice.time-=dt;const direction=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);player.vx=direction*(hero==='leo'?260:220);if(direction)player.facing=direction;if((keys.Space||keys.ArrowUp||keys.KeyW)&&!player.jumpHeld&&(player.on||player.jumps<2)){const airJump=!player.on;player.jumps=airJump?2:1;const jumpSpeed=hero==='gus'?-560:-510,airJumpSpeed=hero==='gus'?-620:-600;player.vy=airJump?Math.min(player.vy,airJumpSpeed):jumpSpeed;player.on=false;beep(airJump?740:550,.12)}player.jumpHeld=keys.Space||keys.ArrowUp||keys.KeyW;
player.x+=player.vx*dt;for(const p of platforms)if(hit(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w}player.x=Math.max(0,player.x);recordTravel(player.x);if(!player.on&&player.jumps===0)player.jumps=1;const flying=player.cape&&!player.on&&player.jumpHeld&&player.flight>0&&player.vy>=0;if(flying){player.flight=Math.max(0,player.flight-dt);player.vy=Math.min(65,player.vy+180*dt)}else player.vy+=1350*dt;player.y+=player.vy*dt;player.on=false;for(const p of platforms)if(hit(player,p)){if(player.vy>0){player.y=p.y-player.h;player.vy=0;player.on=true;player.jumps=0;player.flight=6}else if(player.vy<0){player.y=p.y+p.h;player.vy=0;if(p.type==='brick'){breakBrick(p)}else if(p.type==='question'&&!p.used)purchaseBlock(p)}}platforms=platforms.filter(p=>!p.broken);if(player.y>520){die();if(state!=='play')return;}
for(const c of gold)if(!c.taken&&Math.abs(player.x+12-c.x)<23&&Math.abs(player.y+16-c.y)<29){c.taken=true;earnCoins(1);beep(900,.06)}
if(player.on&&Math.abs(player.vx)>0)player.walkDistance=(player.walkDistance||0)+Math.abs(player.x-previousX);updateItems(dt);discoverField();if(player.big&&player.h<heroHeight(true))resizePlayer(heroHeight(true));updateEnemies(dt,previousBottom);if(state!=='play')return;
for(const p of particles){if(p.type==='debris'){p.x+=p.vx*dt;p.vy+=850*dt;p.y+=p.vy*dt}else p.y-=65*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);camera=Math.max(0,Math.min(world-960,player.x-300));const poleX=world-135;if(Math.min(previousX,player.x)<=poleX+4&&Math.max(previousX+player.w,player.x+player.w)>=poleX&&player.y+player.h>=POLE_TOP&&player.y<=POLE_BOTTOM)captureFlag();player.x=Math.min(player.x,world-player.w);}
function resizePlayer(height){const bottom=player.y+player.h,next={...player,y:bottom-height,h:height};if(height>player.h&&platforms.some(p=>hit(next,p)))return false;player.y=next.y;player.h=height;return true;}
function hurt(){if(player.inv||player.star)return;lives--;if(lives<=0){finish(false);return;}player.inv=1.6;beep(180,.15);notice={text:'¡CUIDADO! DALE ESPACIO A LA FAUNA',time:1.6};}
function purchaseBlock(block){
 if(state!=='play'||block.type!=='question'||block.used)return false;
 const kind=Object.hasOwn(SHOP_ITEMS,block.item)?block.item:'red',product=SHOP_ITEMS[kind];
 if((kind==='red'&&player.big)||(kind==='feather'&&player.cape)||(kind==='binoculars'&&expedition.binoculars)){notice={text:'YA TIENES '+product.name+' · CONSERVAS TUS MONEDAS',time:2};return false;}
 if(coins<product.price){notice={text:product.name+' · CUESTA '+product.price+' MONEDAS · TE FALTAN '+(product.price-coins),time:2};beep(180,.1);return false;}
 coins-=product.price;expedition.spentCoins+=product.price;block.used=true;collectItem({kind});
 notice={text:'COMPRADO: '+product.name+' · −'+product.price+' MONEDAS',time:2};
 saveGame(false);return true;
}
function collectItem(item){if(item.kind==='binoculars')expedition.binoculars=true;beep(1100,.2);const messages={red:'HONGO ROJO · ¡AHORA ERES GRANDE!',star:'EXPLORADOR · OBSERVA SIN DAÑO · 12 S',feather:'PARAPENTE · MANTÉN SALTO AL CAER',green:'HONGO VERDE · ¡VIDA EXTRA!',binoculars:'BINOCULARES · B PARA INSPECCIONAR EL CAMINO'};notice={text:messages[item.kind],time:3};if(item.kind==='red'){player.big=true;resizePlayer(heroHeight(true))}if(item.kind==='star'){player.star=12;player.examine=0;for(const e of enemies)e.explorerNearby=false;}if(item.kind==='feather'){player.cape=true;player.flight=6}if(item.kind==='green')lives++;}
function updateItems(dt){for(const item of items){if(item.taken)continue;item.age+=dt;if(item.age<.35)continue;if(item.age-dt<.35)item.vx=item.kind==='feather'?0:55;const oldY=item.y;item.x+=item.vx*dt;for(const p of platforms)if(hit(item,p)){item.x=item.vx>0?p.x-item.w:p.x+p.w;item.vx=-item.vx;break}item.vy+=700*dt;item.y+=item.vy*dt;for(const p of platforms)if(hit(item,p)&&item.vy>0&&oldY+item.h<=p.y+2){item.y=p.y-item.h;item.vy=item.kind==='star'?-260:0;break}if(hit(player,item)){item.taken=true;collectItem(item)}}items=items.filter(i=>!i.taken&&i.y<540);}
function drawExplorerHelmet(x,y){
 rect(x+7,y-4,10,2,'#d8c08a');rect(x+4,y-2,16,5,'#c4a66b');
 rect(x+5,y-2,4,3,'#ead6a3');rect(x+4,y+1,16,2,'#736b48');
 rect(x,y+3,25,2,'#c4a66b');rect(x+2,y+3,21,1,'#ead6a3');
}
function drawMagnifier(x,y){
 rect(x+2,y+10,3,9,'#725536');rect(x+3,y+10,1,7,'#b58b51');
 pixelShape([[x,y+2],[x+3,y],[x+9,y],[x+12,y+3],[x+12,y+9],[x+9,y+12],[x+3,y+12],[x,y+9]],'#263d42');
 pixelShape([[x+2,y+3],[x+4,y+2],[x+8,y+2],[x+10,y+4],[x+10,y+8],[x+8,y+10],[x+4,y+10],[x+2,y+8]],'#c4e2d8');
 rect(x+4,y+3,2,2,'#edf3dc');
}
function drawItem(item){const x=item.x,y=item.y;if(item.kind==='red'||item.kind==='green'){const color=item.kind==='red'?'#f16b4e':'#8bdb65';rect(x+4,y,16,4,color);rect(x,y+4,24,10,color);rect(x+3,y+5,5,5,'#fff4cf');rect(x+15,y+3,5,5,'#fff4cf');rect(x+6,y+14,12,10,'#ffe1a1');rect(x+8,y+16,2,4,'#273d32');rect(x+14,y+16,2,4,'#273d32')}else if(item.kind==='star'){drawExplorerHelmet(x,y+5);rect(x+4,y+11,15,13,'#9f8a55');rect(x+10,y+11,2,13,'#efe1b1');rect(x+5,y+15,4,4,'#c5b17b');rect(x+14,y+15,4,4,'#c5b17b');}else if(item.kind==='binoculars'){rect(x+2,y+5,8,17,'#2c514b');rect(x+14,y+5,8,17,'#2c514b');rect(x+8,y+10,8,5,'#b79a68');rect(x+3,y+17,6,5,'#b8e4d9');rect(x+15,y+17,6,5,'#b8e4d9');}else{drawParagliderWing(x+12,y,.3);rect(x+5,y+9,14,14,'#69583e');rect(x+7,y+10,10,11,'#b79a68');rect(x+11,y+10,2,13,'#e9d5a5');rect(x+9,y+15,6,3,'#415b60');}}
function pixelShape(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();}
function drawParagliderWing(x,y,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 const wing=hero==='gus'?'#64ad43':'#568fc2',shade=hero==='gus'?'#437c3d':'#3e6f99';
 pixelShape([[-40,25],[-36,13],[-24,4],[0,0],[24,4],[36,13],[40,25],[20,18],[0,15],[-20,18]],shade);
 pixelShape([[-40,25],[-36,13],[-24,4],[-12,2],[-15,17],[-24,20]],'#df9956');
 pixelShape([[-24,4],[-12,2],[0,0],[12,2],[24,4],[20,18],[0,15],[-20,18]],wing);
 pixelShape([[-6,1],[6,1],[7,16],[-7,16]],'#f5e5b8');
 pixelShape([[24,4],[36,13],[40,25],[24,20],[15,17],[12,2]],'#df9956');
 ctx.restore();
}
function drawParaglider(flying){
 if(!flying){rect(-3,14,7,12,'#69583e');rect(-2,16,4,7,'#b79a68');rect(-3,22,7,2,'#e9d5a5');return;}
 const sway=Math.round(Math.sin(clock*4));
 ctx.strokeStyle='#efe8d4';ctx.lineWidth=1;ctx.beginPath();
 for(const [x,y,hand]of [[-24,-31,-1],[-8,-29,-1],[32,-29,25],[48,-31,25]]){ctx.moveTo(x,y+sway);ctx.lineTo(hand,15);}
 ctx.stroke();drawParagliderWing(12,-47+sway);
}
function drawParagliderHarness(flying){
 rect(4,15,2,9,'#48514b');rect(18,15,2,9,'#48514b');rect(4,23,16,2,'#48514b');
 rect(10,23,4,2,'#e9d5a5');
 if(flying){rect(-2,11,4,7,'#ffd394');rect(22,11,4,7,'#ffd394');rect(-1,10,2,4,'#48514b');rect(23,10,2,4,'#48514b');}
}
function drawExplorer(){
 const x=4,y=14,trim=hero==='gus'?'#64ad43':'#568fc2';
 ctx.save();ctx.globalAlpha=Math.min(1,(12-player.star)/.3);
 rect(x,y,6,12,'#bba06b');rect(x+9,y,7,12,'#bba06b');
 rect(x+1,y+1,4,2,trim);rect(x+10,y+1,5,2,trim);
 rect(x+1,y+6,4,4,'#e0c58c');rect(x+10,y+6,5,4,'#e0c58c');
 rect(x+1,y+6,4,1,'#756746');rect(x+10,y+6,5,1,'#756746');
 ctx.restore();drawExplorerHelmet(0,-1);
 if(player.examine>0){
  const lift=Math.round(Math.min(1,player.examine/.15)*3),handX=20;
  rect(handX,16-lift,9,4,'#ffd394');drawMagnifier(handX+6,3-lift);
 }
}
function drawPlayer(){
 const facing=player.examine>0?player.examineFacing:player.facing;
 ctx.save();ctx.translate(player.x+player.w/2,player.y);ctx.scale(facing===-1?-1:1,player.h/32);ctx.translate(-12,0);
 const flying=player.cape&&!player.on&&player.jumpHeld&&player.flight>0&&player.vy>=0&&state==='play';
 if(player.cape)drawParaglider(flying);
 const pose=playerPose();sprite(player.star>0?pose.map((row,index)=>index<2?'0'.repeat(row.length):row):pose,0,0,2,hero==='gus');
 if(player.star>0)drawExplorer();
 if(player.cape)drawParagliderHarness(flying);
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
 if(!Number.isFinite(e.sleep))e.sleep=0;
 e.sleep=Math.max(0,Math.min(4,e.sleep));
 if(e.direction!==-1&&e.direction!==1)e.direction=Math.sign(e.vx)||1;
 animalHabitat(e);
 return e;
}
function spawnRegionalEnemies(){
 const kind=region().fauna[0],size={crab:[30,20],snake:[30,18],scorpion:[34,24]}[kind];
 for(let i=0;i<12;i+=2){
  const current=stagePlatform(i),left=current.x+current.w,right=stagePlatform(i+1).x,w=size[0];
  const x=(left+right-w)/2;
  const ground=platforms.find(p=>p.type==='ground'&&x>=p.x+96&&x+w<=p.x+p.w-96);
  if(!ground)continue;
  enemies.push({x,y:416-size[1],w,h:size[1],vx:0,vy:0,kind,alive:true,age:i*.27,direction:i%4===0?1:-1,homeMin:left+16,homeMax:right-w-16});
 }
}
function regionalMovement(e,dt){
 if(e.sleep>0){e.sleep=Math.max(0,e.sleep-dt);e.vx=0;e.alert=false;if(e.sleep>0)return;}
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
  rect(9,1,3,7,'#e5b77c');rect(18,1,3,7,'#e5b77c');rect(9,1,e.sleep>0?4:2,e.sleep>0?1:2,'#242b2c');rect(19,1,e.sleep>0?4:2,e.sleep>0?1:2,'#242b2c');
  rect(2,15,8,3,'#b55e3d');rect(21,15,7,3,'#b55e3d');rect(4+step,18,6,2,'#b55e3d');rect(20-step,18,6,2,'#b55e3d');
 }else if(e.kind==='snake'){
  // Sand-colored coils with diamond markings, a raised head and rattling tail.
  rect(4,11-step,17,5,'#b78c49');rect(12,7,10,9,'#cfaa68');rect(19,3,10,7,'#d5b576');rect(26,7,4,3,'#d5b576');
  rect(14,8,4,3,'#72513d');rect(8,11-step,4,3,'#72513d');rect(23,4,e.sleep>0?4:2,e.sleep>0?1:2,'#282c2c');rect(29,8,3,1,'#b96d5b');
  const rattle=e.alert?Math.floor(e.age*24)%2*2:0;rect(1,7-step-rattle,4,5,'#e2cf94');rect(0,5-step-rattle,3,3,'#b7985d');rect(4,15,20,3,'#b78c49');
 }else{
  // Low armored body with pincers and a distinctly curled tail.
  rect(9,12,17,8,'#976b49');rect(11,11,13,3,'#ba8957');rect(25,11,6,5,'#ba8957');
  rect(29,8,5,4,'#b58250');rect(30,16,4,4,'#b58250');
  rect(5,8,5,9,'#a3764d');rect(2,3,5,8,'#a3764d');rect(5,0,9,4,'#a3764d');rect(12,2,5,4,'#a3764d');rect(15,5,3,4,'#e0b779');
  for(let j=0;j<3;j++)rect(10+j*5,20+(j+step)%2,3,3,'#79563e');rect(25,12,e.sleep>0?4:2,e.sleep>0?1:2,'#272b2b');
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
 if(!expedition.species.includes(e.kind))expedition.species.push(e.kind);
 if(first)earnCoins(5);journalEntry(e.kind,SPECIES_NAMES[e.kind]);
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
   if(!platforms.some(p=>hit(next,p))){player.y=next.y;player.vy=-230;player.on=false;player.jumps=Math.max(1,player.jumps);e.sleep=4;e.vx=0;e.alert=false;}
   player.inv=Math.max(player.inv,.35);beep(330,.06,'triangle');
  }else if(hit(player,e)&&!player.inv&&e.sleep<=0){hurt();if(state!=='play')return;separateFromAnimal(e);}
 }
}
function drawTurtle(e){
 const x=e.x,y=e.y;
  const head=e.direction===-1?x-2:x+14;
  rect(head,y,12,12,'#c4d780');rect(head+(e.direction===-1?2:8),y+(e.sleep>0?5:3),e.sleep>0?4:2,e.sleep>0?1:3,'#203f32');
  rect(x+2,y+10,20,16,'#3d8554');rect(x+5,y+11,14,3,'#a0cb70');rect(x+10,y+14,3,11,'#24583e');rect(x+2,y+24,22,3,'#e5d6a0');
  const step=e.vx!==0&&Math.floor(e.age*9)%2?3:0;rect(x+step,y+27,9,5,'#c6a55f');rect(x+15-step,y+27,9,5,'#c6a55f');
}
function drawAnimalSleep(e){
 if(!(e.sleep>0))return;
 ctx.font='bold 13px monospace';ctx.fillStyle='#edf3dc';
 ctx.fillText('Z',e.x+e.w/2,e.y-8-Math.floor(clock*2)%2*2);
 ctx.font='bold 10px monospace';ctx.fillText('z',e.x+e.w/2+10,e.y-15);
}
function cloud(x,y){rect(x,y,72,20,'#e5f1da');rect(x+12,y-12,24,14,'#e5f1da');rect(x+32,y-20,24,22,'#e5f1da');rect(x+8,y+20,65,5,'#bddbd2')}
function mountain(x,y,w,h){ctx.fillStyle='#87ae9c';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w/2,y-h);ctx.lineTo(x+w,y);ctx.fill();ctx.fillStyle='#9cc0a6';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w/2,y-h);ctx.lineTo(x+w/2,y);ctx.fill()}
const REGIONS=[
 {"id":"bcs","name":"BAJA CALIFORNIA SUR","short":"BCS","biome":"coast","fauna":["crab"],"caption":"Cardones · costa · ballena gris","landmark":"arch","music":0,"sky":"#8ac9d5","soil":"#b98a5d","edge":"#e3c184","speck":"#d3aa73","shadow":"#946b4c","far":"#8ea99b","near":"#759c88"},
 {"id":"bc","name":"BAJA CALIFORNIA","short":"BC","biome":"desert","fauna":["snake"],"caption":"Cirios · viñedos · borrego cimarrón","landmark":"vineyard","music":1,"sky":"#b7c9d1","soil":"#9d795c","edge":"#b7b17c","speck":"#bf9c78","shadow":"#765a47","far":"#b59b89","near":"#c6aa91"},
 {"id":"son","name":"SONORA","short":"SON.","biome":"desert","fauna":["scorpion"],"caption":"Desierto · sierras · cardones","landmark":"cactus","music":2,"sky":"#d5c7b5","soil":"#b57652","edge":"#d3a46a","speck":"#d19b71","shadow":"#8c553d","far":"#b59b89","near":"#c6aa91"},
 {"id":"sin","name":"SINALOA","short":"SIN.","biome":"farmland","fauna":["crab"],"caption":"Costa · campos · valles","landmark":"fields","music":0,"sky":"#aacfd2","soil":"#a38b58","edge":"#b8be78","speck":"#cab781","shadow":"#77683e","far":"#a8b995","near":"#8a9d70"},
 {"id":"nay","name":"NAYARIT","short":"NAY.","biome":"coast","fauna":["crab"],"caption":"Islas · esteros · palmeras","landmark":"islands","music":0,"sky":"#8ac9d5","soil":"#b98a5d","edge":"#e3c184","speck":"#d3aa73","shadow":"#946b4c","far":"#8ea99b","near":"#759c88"},
 {"id":"dgo","name":"DURANGO","short":"DGO.","biome":"forest","fauna":["snake"],"caption":"Sierra · pinos · ferrocarril","landmark":"bridge","music":1,"sky":"#a8c5c8","soil":"#8c7458","edge":"#9eaf75","speck":"#b89c74","shadow":"#66523e","far":"#8aa79c","near":"#557c69"},
 {"id":"chih","name":"CHIHUAHUA","short":"CHIH.","biome":"desert","fauna":["scorpion"],"caption":"Sotol · dunas · venado bura","landmark":"railway","music":2,"sky":"#d5c7b5","soil":"#b57652","edge":"#d3a46a","speck":"#d19b71","shadow":"#8c553d","far":"#b59b89","near":"#c6aa91"},
 {"id":"coah","name":"COAHUILA","short":"COAH.","biome":"desert","fauna":["scorpion"],"caption":"Dunas · sierras · paisajes fósiles","landmark":"dunes","music":2,"sky":"#d5c7b5","soil":"#b57652","edge":"#d3a46a","speck":"#d19b71","shadow":"#8c553d","far":"#b59b89","near":"#c6aa91"},
 {"id":"nl","name":"NUEVO LEÓN","short":"NL","biome":"highland","fauna":["snake"],"caption":"Cerro de la Silla · montañas","landmark":"saddle","music":1,"sky":"#b7c9d1","soil":"#9d795c","edge":"#b7b17c","speck":"#bf9c78","shadow":"#765a47","far":"#a1aaa3","near":"#839487"},
 {"id":"tamps","name":"TAMAULIPAS","short":"TAMPS.","biome":"wetland","fauna":["crab"],"caption":"Lagunas · costa · llanuras","landmark":"lagoon","music":0,"sky":"#a7c8c6","soil":"#96825b","edge":"#a9b27c","speck":"#b8ad80","shadow":"#6d6245","far":"#88aca0","near":"#648d7a"},
 {"id":"slp","name":"SAN LUIS POTOSÍ","short":"SLP","biome":"jungle","fauna":["snake"],"caption":"Huasteca · cascadas · sierras","landmark":"waterfall","music":1,"sky":"#9dc8bd","soil":"#92734e","edge":"#9eb76b","speck":"#b5a26d","shadow":"#615838","far":"#7ba38b","near":"#4d8069"},
 {"id":"zac","name":"ZACATECAS","short":"ZAC.","biome":"highland","fauna":["scorpion"],"caption":"Cantera · cerros · acueducto","landmark":"aqueduct","music":2,"sky":"#b7c9d1","soil":"#9d795c","edge":"#b7b17c","speck":"#bf9c78","shadow":"#765a47","far":"#a1aaa3","near":"#839487"},
 {"id":"ags","name":"AGUASCALIENTES","short":"AGS.","biome":"city","fauna":["scorpion"],"caption":"Jardines · plazas · ferrocarril","landmark":"plaza","music":1,"sky":"#c0c6d0","soil":"#a18e79","edge":"#cfba91","speck":"#c6b098","shadow":"#776353","far":"#a99daa","near":"#8b8e9c"},
 {"id":"jal","name":"JALISCO","short":"JAL.","biome":"farmland","fauna":["snake"],"caption":"Agaves · valles · arquitectura","landmark":"agave","music":1,"sky":"#aacfd2","soil":"#a38b58","edge":"#b8be78","speck":"#cab781","shadow":"#77683e","far":"#a8b995","near":"#8a9d70"},
 {"id":"col","name":"COLIMA","short":"COL.","biome":"volcano","fauna":["snake"],"caption":"Volcán · palmares · costa","landmark":"volcano","music":0,"sky":"#b0c6d7","soil":"#8e8174","edge":"#b4b48e","speck":"#b2a08b","shadow":"#62594f","far":"#9da7b2","near":"#7f9295"},
 {"id":"mich","name":"MICHOACÁN","short":"MICH.","biome":"forest","fauna":["snake"],"caption":"Lagos · bosques · pueblos","landmark":"lake","music":1,"sky":"#a8c5c8","soil":"#8c7458","edge":"#9eaf75","speck":"#b89c74","shadow":"#66523e","far":"#8aa79c","near":"#557c69"},
 {"id":"gto","name":"GUANAJUATO","short":"GTO.","biome":"city","fauna":["scorpion"],"caption":"Callejones · cantera · cerros","landmark":"town","music":1,"sky":"#c0c6d0","soil":"#a18e79","edge":"#cfba91","speck":"#c6b098","shadow":"#776353","far":"#a99daa","near":"#8b8e9c"},
 {"id":"qro","name":"QUERÉTARO","short":"QRO.","biome":"highland","fauna":["snake"],"caption":"Acueducto · Sierra Gorda","landmark":"aqueduct","music":1,"sky":"#b7c9d1","soil":"#9d795c","edge":"#b7b17c","speck":"#bf9c78","shadow":"#765a47","far":"#a1aaa3","near":"#839487"},
 {"id":"hgo","name":"HIDALGO","short":"HGO.","biome":"highland","fauna":["snake"],"caption":"Prismas · barrancas · magueyes","landmark":"basalt","music":1,"sky":"#b7c9d1","soil":"#9d795c","edge":"#b7b17c","speck":"#bf9c78","shadow":"#765a47","far":"#a1aaa3","near":"#839487"},
 {"id":"tlax","name":"TLAXCALA","short":"TLAX.","biome":"forest","fauna":["snake"],"caption":"Bosques · plazas · La Malinche","landmark":"tower","music":1,"sky":"#a8c5c8","soil":"#8c7458","edge":"#9eaf75","speck":"#b89c74","shadow":"#66523e","far":"#8aa79c","near":"#557c69"},
 {"id":"pue","name":"PUEBLA","short":"PUE.","biome":"volcano","fauna":["snake"],"caption":"Volcanes · cúpulas · azulejos","landmark":"domes","music":1,"sky":"#b0c6d7","soil":"#8e8174","edge":"#b4b48e","speck":"#b2a08b","shadow":"#62594f","far":"#9da7b2","near":"#7f9295"},
 {"id":"mex","name":"ESTADO DE MÉXICO","short":"EDOMEX","biome":"volcano","fauna":["snake"],"caption":"Nevado · bosques · valles","landmark":"snowcap","music":1,"sky":"#b0c6d7","soil":"#8e8174","edge":"#b4b48e","speck":"#b2a08b","shadow":"#62594f","far":"#9da7b2","near":"#7f9295"},
 {"id":"cdmx","name":"CIUDAD DE MÉXICO","short":"CDMX","biome":"city","fauna":["snake"],"caption":"Lagos · canales · gran ciudad","landmark":"skyline","music":1,"sky":"#c0c6d0","soil":"#a18e79","edge":"#cfba91","speck":"#c6b098","shadow":"#776353","far":"#a99daa","near":"#8b8e9c"},
 {"id":"mor","name":"MORELOS","short":"MOR.","biome":"jungle","fauna":["snake"],"caption":"Jardines · cerros · flores","landmark":"gardens","music":0,"sky":"#9dc8bd","soil":"#92734e","edge":"#9eb76b","speck":"#b5a26d","shadow":"#615838","far":"#7ba38b","near":"#4d8069"},
 {"id":"gro","name":"GUERRERO","short":"GRO.","biome":"coast","fauna":["crab"],"caption":"Acantilados · bahías · palmeras","landmark":"cliffs","music":0,"sky":"#8ac9d5","soil":"#b98a5d","edge":"#e3c184","speck":"#d3aa73","shadow":"#946b4c","far":"#8ea99b","near":"#759c88"},
 {"id":"oax","name":"OAXACA","short":"OAX.","biome":"highland","fauna":["snake"],"caption":"Valles · magueyes · Monte Albán","landmark":"terraces","music":1,"sky":"#b7c9d1","soil":"#9d795c","edge":"#b7b17c","speck":"#bf9c78","shadow":"#765a47","far":"#a1aaa3","near":"#839487"},
 {"id":"ver","name":"VERACRUZ","short":"VER.","biome":"coast","fauna":["crab"],"caption":"Puerto · fortaleza · palmares","landmark":"fort","music":0,"sky":"#8ac9d5","soil":"#b98a5d","edge":"#e3c184","speck":"#d3aa73","shadow":"#946b4c","far":"#8ea99b","near":"#759c88"},
 {"id":"chis","name":"CHIAPAS","short":"CHIS.","biome":"jungle","fauna":["snake"],"caption":"Selva · cascadas · templos","landmark":"temple","music":0,"sky":"#9dc8bd","soil":"#92734e","edge":"#9eb76b","speck":"#b5a26d","shadow":"#615838","far":"#7ba38b","near":"#4d8069"},
 {"id":"tab","name":"TABASCO","short":"TAB.","biome":"wetland","fauna":["crab"],"caption":"Ríos · humedales · cacao","landmark":"river","music":0,"sky":"#a7c8c6","soil":"#96825b","edge":"#a9b27c","speck":"#b8ad80","shadow":"#6d6245","far":"#88aca0","near":"#648d7a"},
 {"id":"camp","name":"CAMPECHE","short":"CAMP.","biome":"coast","fauna":["crab"],"caption":"Murallas · costa · ciudad de colores","landmark":"walls","music":0,"sky":"#8ac9d5","soil":"#b98a5d","edge":"#e3c184","speck":"#d3aa73","shadow":"#946b4c","far":"#8ea99b","near":"#759c88"},
 {"id":"yuc","name":"YUCATÁN","short":"YUC.","biome":"jungle","fauna":["snake"],"caption":"Cenotes · selva · pirámides","landmark":"pyramid","music":0,"sky":"#9dc8bd","soil":"#92734e","edge":"#9eb76b","speck":"#b5a26d","shadow":"#615838","far":"#7ba38b","near":"#4d8069"},
 {"id":"qroo","name":"QUINTANA ROO","short":"Q. ROO","biome":"coast","fauna":["crab"],"caption":"Caribe · lagunas · ruinas costeras","landmark":"ruins","music":0,"sky":"#8ac9d5","soil":"#b98a5d","edge":"#e3c184","speck":"#d3aa73","shadow":"#946b4c","far":"#8ea99b","near":"#759c88"}
];
function region(){return REGIONS[level-1]||REGIONS[0];}
function sceneryLayer(spacing,speed,drawObject){const first=Math.floor(camera*speed/spacing)-1;for(let i=first;i<first+Math.ceil(960/spacing)+3;i++)drawObject(i*spacing-camera*speed,((i%6)+6)%6,i);}
function desertRidge(x,y,w,h,color,light){pixelShape([[x,y],[x+w*.2,y-h*.4],[x+w*.42,y-h],[x+w*.55,y-h*.86],[x+w*.7,y-h*.3],[x+w,y]],color);pixelShape([[x+w*.42,y-h],[x+w*.55,y-h*.86],[x+w*.7,y-h*.3],[x+w,y],[x+w*.52,y]],light);}
function drawCardon(x,base,height=95){
 const top=base-height;rect(x+17,top,14,height,'#748e73');rect(x+21,top+5,3,height-5,'#9bab80');
 rect(x,top+26,10,35,'#748e73');rect(x+4,top+61,20,10,'#748e73');rect(x+4,top+29,2,29,'#9bab80');
 rect(x+37,top+13,10,37,'#748e73');rect(x+28,top+48,17,10,'#748e73');rect(x+41,top+17,2,28,'#9bab80');
}
function drawCirio(x,base,height=115){pixelShape([[x+13,base],[x+15,base-height*.7],[x+27,base-height],[x+26,base-height+18],[x+23,base-height*.6],[x+23,base]],'#9d9f78');for(let j=18;j<height-15;j+=15){rect(x+11,base-j,16,2,'#b9b393');}rect(x+24,base-height-5,6,8,'#c5b18a');}
function drawSotol(x,y){const leaf='#889474';for(const [dx,dy]of [[-24,-25],[-17,-34],[-7,-37],[5,-39],[16,-33],[26,-22]])pixelShape([[x,y],[x+dx,y+dy],[x+dx*.5+2,y+dy*.3]],leaf);rect(x-1,y-64,3,64,'#a29874');for(let j=0;j<5;j++)rect(x-4-j%2*2,y-67+j*6,9+j%2*3,3,'#c3b18c');}
function drawBarrelCactus(x,y){rect(x+3,y-24,22,24,'#83916b');rect(x+7,y-29,14,5,'#83916b');for(let j=6;j<24;j+=5)rect(x+j,y-22,2,22,'#b2b080');rect(x+12,y-32,5,4,'#d6b26e');}
function drawPelican(x,y){const wing=Math.floor(clock*3)%2?4:0;rect(x,y,17,4,'#7b999d');rect(x+12,y-3,5,4,'#7b999d');rect(x+17,y-1,11,2,'#c4b78d');pixelShape([[x+6,y+2],[x-5,y-7-wing],[x+10,y-2]],'#7b999d');}
function drawBighorn(x,y){const c='#9b9c86';rect(x+8,y+9,32,15,c);rect(x+37,y+3,12,15,c);rect(x+9,y+23,4,14,c);rect(x+33,y+23,4,14,c);rect(x+3,y+11,8,3,c);rect(x+37,y,14,4,'#c1b998');rect(x+47,y+3,5,10,'#c1b998');rect(x+40,y+12,10,4,'#c1b998');rect(x+40,y+7,4,6,'#c1b998');rect(x+46,y+7,2,2,'#666e61');}
function drawDeer(x,y){const c='#b5a184';rect(x+8,y+13,32,13,c);rect(x+35,y+4,8,17,c);rect(x+39,y+2,13,7,c);rect(x+10,y+25,3,16,c);rect(x+33,y+25,3,16,c);rect(x+3,y+11,7,4,'#e1cbb0');rect(x+38,y-8,3,12,c);rect(x+45,y-10,3,13,c);rect(x+33,y-5,7,2,c);rect(x+46,y-6,6,2,c);}
function drawPalm(x,y){
 rect(x,y-55,5,55,'#89734d');
 pixelShape([[x+2,y-58],[x-26,y-67],[x-39,y-57],[x-17,y-58],[x+2,y-51]],'#537e61');
 pixelShape([[x+2,y-57],[x+24,y-68],[x+39,y-58],[x+19,y-59],[x+2,y-50]],'#608e68');
 pixelShape([[x+2,y-57],[x-5,y-78],[x+3,y-85],[x+10,y-65]],'#6b986c');
}
function drawPine(x,y,height=76){
 rect(x-2,y-height,5,height,'#76694e');
 for(let i=0;i<3;i++)pixelShape([[x,y-height-i*10],[x-19-i*4,y-25-i*16],[x+19+i*4,y-25-i*16]],i%2?'#527d68':'#638b70');
}
function drawNationalLandmark(theme,x){
 const kind=theme.landmark;
 if(['aqueduct','bridge'].includes(kind)){
  rect(x,310,260,9,'#a69378');
  for(let i=0;i<7;i++){rect(x+i*39,319,10,84,'#b5a184');pixelShape([[x+i*39+10,319],[x+i*39+20,330],[x+i*39+29,319]],'#b5a184');}
  if(kind==='bridge'){rect(x,298,260,5,'#787f7a');for(let i=0;i<12;i++)rect(x+i*23,303,3,7,'#787f7a');}
 }else if(['pyramid','temple','terraces','ruins'].includes(kind)){
  const steps=kind==='pyramid'?6:kind==='terraces'?3:4;
  for(let i=0;i<steps;i++)rect(x+i*13,400-i*13,200-i*26,14,'#acaa8a');
  rect(x+91,400-steps*13,17,steps*13,'#d0c7a6');
  if(kind!=='terraces'){rect(x+70,385-steps*13,60,16,'#aaa88c');rect(x+91,388-steps*13,17,12,'#667c6e');}
  if(kind==='ruins'){rect(x+226,349,12,55,'#bbb69a');rect(x+260,345,12,59,'#bbb69a');rect(x+226,340,46,10,'#cac1a0');}
 }else if(['volcano','snowcap','domes'].includes(kind)){
  pixelShape([[x-35,406],[x+99,235],[x+230,406]],'#87969b');
  pixelShape([[x+99,235],[x+230,406],[x+134,406]],'#74888e');
  pixelShape([[x+75,266],[x+99,235],[x+123,266],[x+108,262],[x+97,271],[x+89,261]],'#e1e4db');
  if(kind==='domes'){rect(x+250,354,82,52,'#bdaf91');rect(x+260,344,62,12,'#cfc09e');pixelShape([[x+259,344],[x+290,321],[x+323,344]],'#b6967e');rect(x+285,371,14,35,'#7b8a83');}
 }else if(kind==='lake'){
  rect(x-20,367,275,39,'#80b3b9');rect(x,381,235,3,'#bdd6c8');
  for(let i=0;i<4;i++){rect(x+25+i*48,351,38,19,'#bca98a');pixelShape([[x+21+i*48,351],[x+44+i*48,338],[x+67+i*48,351]],'#a38b78');}
 }else if(kind==='waterfall'){
  rect(x,286,190,120,'#819980');rect(x+60,276,67,130,'#83bac0');
  for(let i=0;i<4;i++)rect(x+66+i*15,286,5,112,'#c1dcd6');rect(x+20,395,160,12,'#7eafb4');
 }else if(kind==='basalt'){
  for(let i=0;i<13;i++){const height=45+(i%4)*14;rect(x+i*13,406-height,11,height,i%2?'#9a9f98':'#808c88');rect(x+i*13+1,406-height,9,3,'#bbc0b2');}
 }else if(['fort','walls'].includes(kind)){
  rect(x,350,245,56,'#b9b69b');for(let i=0;i<13;i++)rect(x+i*20,342,12,10,'#c6bea0');
  for(const dx of [0,210]){rect(x+dx,328,35,78,'#b1b29a');rect(x+dx-4,326,43,9,'#c7c0a3');}
  rect(x+109,371,25,35,'#748e84');
 }else if(['town','plaza','skyline','tower'].includes(kind)){
  const colors=kind==='town'?['#b18c83','#cfb18b','#9da491','#c39c88']:['#a7a59b','#b4b3a4','#98a39e','#c3b59c'];
  for(let i=0;i<6;i++){const height=kind==='skyline'?55+i%3*25:35+i%3*12;rect(x+i*39,406-height,36,height,colors[i%4]);for(let k=0;k<3;k++)rect(x+i*39+6+k*10,415-height,5,9,'#d9d5b6');rect(x+i*39+13,386,11,20,'#788b84');}
  if(kind!=='skyline'){rect(x+104,286,26,89,'#baa98b');pixelShape([[x+100,286],[x+117,264],[x+134,286]],'#a88e78');rect(x+112,306,10,17,'#788b84');}
 }else if(kind==='saddle'){
  pixelShape([[x-50,405],[x+45,279],[x+95,320],[x+150,260],[x+260,405]],'#8b9f9c');
  pixelShape([[x+150,260],[x+260,405],[x+185,405]],'#758e89');
 }else if(kind==='cliffs'){
  pixelShape([[x,406],[x+5,330],[x+80,300],[x+110,406]],'#a8a68d');pixelShape([[x+160,406],[x+190,314],[x+260,339],[x+275,406]],'#b4ac8e');
 }else if(['fields','agave','gardens','vineyard'].includes(kind)){
  for(let i=0;i<7;i++){const px=x+i*32;rect(px,373,3,33,'#8a9770');if(kind==='agave')drawSotol(px,406);else{pixelShape([[px,389],[px-12,374],[px,381],[px+12,368]],'#81a172');if(kind==='gardens')rect(px-3,369,7,7,i%2?'#d3aa91':'#d0bf83');}}
 }else if(kind==='cactus'){drawCardon(x+30,406,105);drawCardon(x+145,406,75);}
 else if(kind==='dunes'){desertRidge(x,406,290,55,'#c8b28d','#d7c398');drawBarrelCactus(x+180,406);}
 else if(['islands','lagoon','river'].includes(kind)){
  rect(x,387,270,18,'#79aeb2');desertRidge(x+80,387,140,38,theme.far,theme.near);drawPalm(x+200,385);
 }
}
function drawNationalScenery(theme){
 const lush=['forest','jungle','wetland'].includes(theme.biome),coast=['coast','wetland'].includes(theme.biome);
 const variant=REGIONS.indexOf(theme)%5;
 sceneryLayer(360,.12,(x,v)=>desertRidge(x,384,450,70+(v+variant)%3*25,theme.far,theme.near));
 if(coast){rect(0,348,960,68,'#77adb5');rect(0,388,960,28,'#8bbfc2');}
 if(theme.biome==='wetland')for(let i=0;i<4;i++)rect(0,354+i*16,960,3,'#a7ccc0');
 sceneryLayer(650,.23,(x)=>drawNationalLandmark(theme,x+85));
 sceneryLayer(190,.4,(x,v)=>{
  if(theme.biome==='forest')drawPine(x+70,416,70+v%3*12);
  else if(['jungle','coast','wetland'].includes(theme.biome))drawPalm(x+85,416);
  else if(theme.biome==='desert'){if(v%2)drawCardon(x+70,416,65);else drawBarrelCactus(x+90,416);}
  else if(['farmland','highland'].includes(theme.biome))drawSotol(x+75,416);
  else{rect(x+65,387,5,29,'#8b8068');rect(x+55,375,26,18,lush?'#668b70':'#8b9e7b');}
 });
}
function drawRegionalBackground(){
 const theme=region();rect(0,0,960,480,theme.sky);
 rect(800,82,32,32,theme.biome==='desert'?'#ecdbc0':'#e7dca9');rect(795,88,42,20,theme.biome==='desert'?'#ecdbc0':'#e7dca9');
 sceneryLayer(290,.07,(x,v)=>{ctx.save();ctx.translate(x+50,95+v%3*24);ctx.scale(.5+v%3*.15,.5+v%3*.15);cloud(0,0);ctx.restore();});
 if(!['bcs','bc','chih'].includes(theme.id)){drawNationalScenery(theme);return;}
 if(theme.id==='bcs'){
  // Coastal BCS: islands, Gulf/Pacific water, granite arch and gray-whale silhouettes.
  rect(0,307,960,109,'#79b5bd');rect(0,331,960,85,'#7bbcc0');
  sceneryLayer(420,.12,(x,v)=>desertRidge(x,321,280,75+v*8,'#b2b39a','#c3bba0'));
  sceneryLayer(560,.16,(x,v)=>{
   if(v%2===0){rect(x+95,276,22,66,'#c4b28f');rect(x+172,286,20,56,'#c4b28f');rect(x+109,266,63,18,'#c4b28f');rect(x+119,281,52,9,'#c4b28f');rect(x+102,275,10,26,'#d3c5a4');}
   else{rect(x+80,347,48,7,'#799fa7');rect(x+85,342,27,6,'#799fa7');pixelShape([[x+125,350],[x+139,338],[x+139,351],[x+151,342],[x+144,358]],'#799fa7');rect(x+88,331,2,10,'#c0dddd');rect(x+84,328,10,2,'#c0dddd');}
   drawPelican(x+260,210+v%2*40);
  });
  sceneryLayer(330,.29,(x,v)=>{desertRidge(x-30,416,360,45+v*5,'#c0b08c','#ccb997');drawCardon(x+100,410,85+v%3*20);if(v%2)drawCardon(x+220,416,55);});
 }else if(theme.id==='bc'){
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
  sceneryLayer(290,.2,(x,v)=>pixelShape([[x-80,416],[x+40,362-v*3],[x+130,351-v*3],[x+280,416]],'#d4b58d'));
  sceneryLayer(1050,.25,(x,v)=>{
   rect(x+210,380,220,3,'#b09e87');rect(x+220,353,56,25,'#a39580');rect(x+224,346,40,8,'#a39580');rect(x+281,354,55,24,'#a39580');rect(x+342,354,55,24,'#a39580');
   for(let j=0;j<3;j++){rect(x+228+j*60,358,14,8,'#cfb99b');rect(x+230+j*60,376,10,6,'#8d877a');rect(x+252+j*60,376,10,6,'#8d877a');}
   drawDeer(x+650,366);
  });
  sceneryLayer(230,.38,(x,v)=>{if(v%2===0)drawSotol(x+90,416);else{drawBarrelCactus(x+60,416);drawSotol(x+175,416);}});
 }
 // Small desert scrub and stones use a separate, faster parallax layer.
 sceneryLayer(100,.58,(x,v)=>{rect(x+10,411,22,5,theme.id==='bcs'?'#b3b692':'#c0ab87');if(v%2){rect(x+16,406,12,5,theme.id==='bcs'?'#c2c3a1':'#cfb996');}else{rect(x+16,397,3,19,'#989d77');rect(x+8,405,10,3,'#989d77');rect(x+19,402,11,3,'#989d77');}});
}

function drawShopBlock(block){
 const product=SHOP_ITEMS[block.item]||SHOP_ITEMS.red;
 rect(block.x,block.y,32,32,block.used?'#8a7957':'#e7b74e');
 rect(block.x+3,block.y+3,26,2,'#ffe29a');rect(block.x+3,block.y+28,26,3,'#a77432');
 if(block.used){ctx.fillStyle='#d0bf92';ctx.font='bold 18px monospace';ctx.fillText('·',block.x+11,block.y+22);return;}
 ctx.save();ctx.translate(block.x+8,block.y+6);ctx.scale(.65,.65);drawItem({kind:block.item||'red',x:0,y:0});ctx.restore();
 const affordable=coins>=product.price;
 rect(block.x-48,block.y-38,128,34,'#173c3bf0');
 ctx.textAlign='center';ctx.fillStyle='#f5efce';ctx.font='bold 10px monospace';ctx.fillText(product.name,block.x+16,block.y-25);
 ctx.fillStyle=affordable?'#ffdc79':'#ff9ba1';ctx.font='bold 13px monospace';ctx.fillText(product.price+' MONEDAS',block.x+16,block.y-10);ctx.textAlign='start';
}
function draw(){drawRegionalBackground();const theme=region();
ctx.save();ctx.translate(-Math.round(camera),0);for(const p of platforms){if(p.x+p.w<camera||p.x>camera+960)continue;if(p.type==='ground'){rect(p.x,p.y,p.w,p.h,theme.soil);rect(p.x,p.y,p.w,9,theme.edge);rect(p.x,p.y,p.w,3,theme.speck);for(let x=p.x+6;x<p.x+p.w;x+=32){rect(x,p.y+19,13,5,theme.speck);rect(x+17,p.y+43,8,6,theme.shadow)}}else if(p.type==='brick'){rect(p.x,p.y,p.w,p.h,'#ad7952');for(let x=p.x;x<p.x+p.w;x+=32){rect(x,p.y,32,2,'#e0ad72');rect(x,p.y+12,32,2,'#654733');rect(x,p.y,2,12,'#654733');rect(x+16,p.y+12,2,12,'#654733')}}else drawShopBlock(p);}
for(const c of gold)if(!c.taken){const w=6+Math.abs(Math.sin(performance.now()/200+c.x))*5;rect(c.x-w/2,c.y-10,w,19,'#e9a93d');rect(c.x-w/2+2,c.y-8,3,14,'#ffe5a0')}
for(const entry of fieldEntries()){const logged=(expedition.journal[theme.id]||[]).some(e=>e.id===entry.id);rect(entry.x+10,379,4,37,'#6d563b');rect(entry.x-9,365,43,20,logged?'#386b56':'#e7cc87');ctx.fillStyle=logged?'#ecf4cb':'#294c43';ctx.font='bold 10px monospace';ctx.fillText(entry.id==='flora'?'FLORA':'VISTA',entry.x-5,379);}for(const item of items)drawItem(item);for(const e of enemies)if(e.alive){if(e.kind==='turtle')drawTurtle(e);else drawRegionalEnemy(e);drawAnimalSleep(e);}
const flag=world-135;rect(flag,220,4,196,'#ece4bd');rect(flag-4,213,12,12,'#e6c269');const flagY=goal?goal.flagY:227;rect(flag+4,flagY,49,31,hero==='leo'?'#568fc2':'#55b84c');ctx.fillStyle='#fff2d4';ctx.font='bold 17px monospace';ctx.fillText(hero==='leo'?'L':'G',flag+19,flagY+22);rect(world-80,352,70,64,'#b4a07b');rect(world-65,376,24,40,'#3b5147');for(let i=0;i<4;i++)rect(world-80+i*20,340,12,15,'#b4a07b');
if(state==='menu'){sprite(sprites.leo,170,384,2);ctx.save();ctx.translate(205,378);ctx.scale(1,38/32);sprite(sprites.leo,0,0,2,true);ctx.restore()}else if(player&&(player.inv<=0||Math.floor(performance.now()/85)%2===0))drawPlayer();for(const p of particles)if(p.life>0){if(p.type==='debris'){rect(p.x,p.y,10,8,'#ad7952');rect(p.x,p.y,10,2,'#e0ad72')}}ctx.restore();if(state!=='menu'){drawHud(theme);ctx.font='bold 12px monospace';ctx.fillStyle='#f5efce';ctx.fillText('ESPECIES '+expedition.species.length,795,75);if(player.star>0||player.cape||player.big){ctx.fillStyle='#ffdf79';ctx.font='bold 12px monospace';ctx.fillText(player.star>0?'EXPLORADOR · INMUNE '+Math.ceil(player.star)+'s':player.cape?'PARAPENTE · PLANEO '+Math.ceil(player.flight)+'s':'SUPER '+hero.toUpperCase(),26,75)}if(notice&&notice.time>0){rect(180,430,600,28,'#173c3bdd');ctx.textAlign='center';ctx.fillStyle='#ffdf79';ctx.font='bold 13px monospace';ctx.fillText(notice.text,480,449);ctx.textAlign='start'}}}
function drawHeart(x,y,color='#f34d57'){
 const rows=['0110110','1111111','1111111','0111110','0011100','0001000'];
 rows.forEach((row,j)=>[...row].forEach((pixel,i)=>{if(pixel==='1')rect(x+i*3,y+j*3,3,3,color);}));
 rect(x+3,y+3,3,3,'#ff9ba1');
}
function drawHud(theme){
 rect(0,0,960,61,'#173c3bf0');
 ctx.font='bold 13px monospace';ctx.fillStyle='#f5efce';ctx.fillText(hero.toUpperCase(),26,25);ctx.font='bold 12px monospace';ctx.fillText(expeditionKm().toFixed(2)+' KM',26,45);
 ctx.font='bold 11px monospace';ctx.fillStyle='#ffdc79';ctx.fillText('SALDO · MONEDAS',180,17);
 rect(180,26,13,19,'#e9a93d');rect(183,28,3,14,'#ffe5a0');
 ctx.font='bold 24px monospace';ctx.fillText(String(coins),204,45);
 ctx.font='bold 13px monospace';ctx.fillStyle='#f5efce';ctx.fillText(level+'/'+REGIONS.length+' · '+theme.short,400,35);
 ctx.font='bold 11px monospace';ctx.fillStyle='#ff9ba1';ctx.fillText('VIDAS',610,17);
 if(lives<=5){for(let i=0;i<Math.max(0,lives);i++)drawHeart(610+i*28,27);}
 else{drawHeart(610,27);ctx.font='bold 24px monospace';ctx.fillStyle='#ff6973';ctx.fillText('× '+lives,640,46);}
 ctx.font='bold 13px monospace';ctx.fillStyle='#f5efce';ctx.fillText('TIEMPO '+Math.ceil(timer),795,35);
 ctx.font='bold 12px monospace';ctx.fillStyle='#fff0cd';ctx.fillText(theme.name,26,471);
}
function drawGoal(){if(state!=='goal')return;rect(245,105,470,175,'#132c28ed');ctx.textAlign='center';ctx.fillStyle='#c1f463';ctx.font='bold '+(region().name.length>22?16:22)+'px monospace';ctx.fillText(region().name,480,145);ctx.fillStyle='#ffdd7c';ctx.font='bold 29px monospace';ctx.fillText('BANDERA +'+goal.bonus+' MONEDAS',480,191);ctx.fillStyle='#eef0d8';ctx.font='16px monospace';ctx.fillText('TIEMPO +'+goal.timeBonus+' MONEDAS',480,222);ctx.font='12px monospace';ctx.fillText(level<REGIONS.length?'SIGUIENTE: '+REGIONS[level].name:'¡RECORRIDO COMPLETADO!',480,254);ctx.textAlign='start';}
function frame(t){const dt=Math.min((t-last)/1000,.025);last=t;update(dt);draw();drawGoal();saveTick(dt);requestAnimationFrame(frame)}
const SAVE_KEY='higueradev.leo-gus.save.v1';
let saveElapsed=0;
const saveStatus=document.querySelector('#save-status'),continueButton=document.querySelector('#continue');
function validSave(data){
 const finite=(n)=>typeof n==='number'&&Number.isFinite(n),box=o=>o&&['x','y','w','h'].every(k=>finite(o[k]))&&o.w>0&&o.h>0;
 return data&&[1,2,3,4].includes(data.version)&&['leo','gus'].includes(data.hero)&&Number.isInteger(data.level)&&data.level>=1&&data.level<=(data.version<3?3:REGIONS.length)&&(data.version<3||(data.regionId===REGIONS[data.level-1].id&&finite(data.world)&&data.world>=3500&&data.world<=13000))&&(data.version<4||validExpedition(data.expedition))&&Number.isInteger(data.lives)&&data.lives>0&&data.lives<10000&&[data.coins,data.timer,data.clock,data.savedAt].every(finite)&&data.timer>0&&data.timer<=180&&Number.isInteger(data.coins)&&data.coins>=0&&box(data.player)&&['vx','vy','inv','star','flight','jumps'].every(k=>finite(data.player[k]))&&['big','cape','on'].every(k=>typeof data.player[k]==='boolean')&&['platforms','gold','enemies','items'].every(k=>Array.isArray(data[k])&&data[k].length<1000)&&data.platforms.every(p=>box(p)&&['ground','brick','question'].includes(p.type))&&data.gold.every(c=>c&&finite(c.x)&&finite(c.y))&&data.enemies.every(e=>box(e)&&finite(e.vx)&&finite(e.vy)&&['turtle','shell','crab','snake','scorpion'].includes(e.kind))&&data.items.every(i=>box(i)&&finite(i.vx)&&finite(i.vy)&&finite(i.age)&&Object.hasOwn(SHOP_ITEMS,i.kind));
}
function readSave(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw||raw.length>500000)return null;const data=JSON.parse(raw);return validSave(data)?data:null;}catch{return null;}}
function savedStage(data){return data.version<3?REGIONS.findIndex(r=>r.id===['bcs','bc','chih'][data.level-1])+1:data.level;}
function refreshContinue(){const data=readSave();continueButton.hidden=!data;if(data){continueButton.textContent='[ CONTINUAR · '+data.hero.toUpperCase()+' · '+REGIONS[savedStage(data)-1].short+' ]';document.querySelector('#start').innerHTML='[ NUEVA PARTIDA ] <span>ENTER ↵</span>';document.querySelector('#save-hint').textContent='Partida del '+new Date(data.savedAt).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})+' · guardada en este navegador.';}}
function saveGame(manual=false){
 if(state!=='play'&&state!=='pause')return false;
 saveElapsed=0;
 try{
  const data={version:4,expedition,regionId:region().id,world,savedAt:Date.now(),hero,level,lives,coins,timer,clock,player:{...player},platforms,gold,enemies,items};
  if(!validSave(data))throw Error('Invalid state');localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  saveStatus.textContent=manual?'Partida guardada.':'Guardado automático · '+new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  refreshContinue();return true;
 }catch{saveStatus.textContent='No se pudo guardar. Comprueba que el navegador permita almacenamiento local.';return false;}
}
function clearSave(){try{localStorage.removeItem(SAVE_KEY)}catch{}continueButton.hidden=true;document.querySelector('#save-hint').textContent='Guardado local en este navegador y dispositivo.';saveStatus.textContent='Partida terminada.';}
function continueGame(){
 const data=readSave();if(!data){saveStatus.textContent='No se encontró una partida compatible.';refreshContinue();return;}
 hero=data.hero;level=savedStage(data);expedition=restoreExpedition(data);lives=data.lives;coins=data.coins;timer=data.timer;clock=data.clock;
 player={...data.player};platforms=data.platforms;gold=data.gold;enemies=data.enemies.map(restoreAnimal);items=data.items;
 world=data.version<3?3600+data.level*260:data.world;camera=Math.max(0,Math.min(world-960,player.x-300));particles=[];goal=null;state='play';saveElapsed=0;syncJourney();
 Object.keys(keys).forEach(k=>keys[k]=false);player.jumpHeld=false;
 notice={text:'PARTIDA RECUPERADA · '+region().name,time:3};
 overlay.style.display='none';pauseLayer.hidden=true;document.querySelector('#screen').classList.remove('has-result');document.querySelector('#expedition-summary').hidden=true;document.querySelector('#screen').classList.add('is-playing');document.querySelector('#pause').style.display='block';
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
document.querySelector('#field-close').onclick=closeField;document.querySelector('#journal').onclick=()=>openField('journal');document.querySelector('#binoculars').onclick=()=>openField('binoculars');
renderRecords();document.querySelector('#choose-hero').onclick=chooseHero;
refreshContinue();

setup();requestAnimationFrame(frame);document.querySelector('#start').onclick=begin;document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{hero=b.dataset.hero;document.querySelectorAll('[data-hero]').forEach(x=>{x.classList.toggle('chosen',x===b);x.setAttribute('aria-pressed',String(x===b))})});document.querySelector('#pause').onclick=pause;pauseLayer.onclick=pause;document.querySelector('#sound').onclick=()=>{muted=!muted;if(!muted)ensureAudio();syncSound();beep(600)};syncSound();document.addEventListener('visibilitychange',scheduleMusic);window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!e.repeat){if(e.code==='Enter'&&(state==='menu'||state==='end'))begin();if(e.code==='KeyB')openField('binoculars');if(e.code==='KeyN')openField('journal');if(e.code==='Escape'&&fieldMode)closeField();else if(e.code==='KeyP'||e.code==='Escape'){if(fieldMode)closeField();pause();}if(e.code==='KeyR'&&state!=='menu')begin()}keys[e.code]=true});window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);if(state==='play')pause()});document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys[b.dataset.key]=false});

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
