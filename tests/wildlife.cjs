const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const nodes=new Map(),storage=new Map();
function element(){return {style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},before(){},after(){},append(){},getContext(){return {}},textContent:'',innerHTML:'',hidden:false};}
const sandbox={assert,console,performance:{now:()=>0},requestAnimationFrame(){},setInterval(){},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},window:{addEventListener(){}},document:{querySelector(selector){if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);},querySelectorAll:()=>[],createComment:element,addEventListener(){},body:element()}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../game.js'),'utf8'),sandbox);
vm.runInContext(`
muted=true;
let checks=0;
function check(condition,message){assert.ok(condition,message);checks++;}
function reset(kind='crab',selected='leo'){
 hero=selected;level=1;player=null;setup();state='play';lives=3;coins=0;
 Object.keys(keys).forEach(k=>keys[k]=false);
 player.x=298;player.y=384;player.h=32;player.on=true;player.inv=0;
 const e={x:310,y:384,w:24,h:32,vx:0,vy:0,kind,alive:true,age:0,direction:1,homeMin:250,homeMax:400};
 enemies=[e];return e;
}
for(const selected of ['leo','gus'])for(const kind of ['turtle','crab','snake','scorpion']){
 let e=reset(kind,selected);player.big=true;player.cape=true;
 updateEnemies(0,416);
 check(lives===2&&player.inv===1.6,'one heart lost on side contact');
 check(e.alive&&e.kind===kind&&player.big&&player.cape,'animal and powers preserved');
 check(!hit(player,e)&&player.y===384,'separated locally without respawn');
 player.x=298;updateEnemies(0,416);check(lives===2,'protection prevents repeated damage');
 e=reset(kind,selected);player.y=e.y-player.h+1;player.vy=100;
 updateEnemies(0,e.y);
 check(e.alive&&e.kind===kind&&lives===3,'landing harms nobody');
 check(player.vy===-230&&player.y+player.h===e.y&&player.inv>=.35,'gentle bounce and protection');
 e=reset(kind,selected);player.star=12;player.vy=100;
 updateEnemies(0,380);
 check(e.alive&&lives===3&&player.vy===100,'explorer contact harmless without bounce');
 check(coins===5&&e.observed&&player.examine===.7,'first observation pays five');
 player.examine=.2;updateEnemies(0,380);check(coins===5&&player.examine===.2,'no repeat while remaining close');
 player.x=100;updateEnemies(0,380);player.x=298;updateEnemies(0,380);
 check(coins===5&&player.examine===.7,'reentry observes without duplicate payment');
}
let e=reset();enemies.push({...e},{...e});updateEnemies(0,416);check(lives===2,'multiple overlaps cost one heart');
e=reset();lives=1;enemies.push({...e});updateEnemies(0,416);check(lives===0&&state==='end','final contact ends once');
e=reset();player.x=900;player.y=384;e.x=892;e.homeMin=890;e.homeMax=1000;separateFromAnimal(e);check(player.x>=890,'separation cannot push player into gap');
e=reset();player.star=.01;player.examine=.7;enemies=[];update(.02);check(player.star===0&&player.examine===0,'exploration expires');
player.star=12;player.y=530;update(.01);check(lives===2,'immunity does not protect from pits');
e=reset('shell');e.h=16;e.y=400;e.vx=360;e.observed=true;coins=37;saveGame(false);continueGame();
check(enemies[0].kind==='turtle'&&enemies[0].h===32&&enemies[0].y+32===416,'old shell restored as turtle');
check(enemies[0].observed&&coins===37,'migration preserves coins and observations');
e=reset('shell');e.x=850;e.y=450;restoreAnimal(e);check(platforms.some(p=>p.type==='ground'&&e.x>=p.x&&e.x+e.w<=p.x+p.w),'old airborne shell placed on safe ground');
for(const fps of [30,60,120])for(const stage of [1,2,3]){
 player=null;level=stage;setup();state='play';player.x=60;player.star=1000;
 check(enemies.filter(a=>a.kind==='turtle').length===(stage===1?1:0),'turtles limited to coastal level');
 check(enemies.some(a=>a.kind===['crab','snake','scorpion'][stage-1]),'regional fauna present');
 check(enemies.every(a=>!platforms.some(p=>p.type==='brick'&&a.homeMin<p.x+p.w&&a.homeMax+a.w>p.x)),'patrol outside brick landing areas');
 let safe=true;
 for(let frame=0;frame<fps*60;frame++){
  updateEnemies(1/fps,player.y+player.h);
  if(!enemies.every(a=>a.alive&&a.x>=a.homeMin-.01&&a.x<=a.homeMax+.01&&Math.abs(a.y+a.h-416)<.1))safe=false;
 }
 check(safe,'one-minute patrol stays alive, within habitat and away from gaps at '+fps+' fps');
}
e=reset('snake');e.age=1.6;regionalMovement(e,0);check(e.alert&&e.vx===0,'snake warns before moving');e.age=2;regionalMovement(e,0);check(!e.alert&&e.vx>0,'snake moves after warning');
e=reset('scorpion');e.age=.3;player.x=310;regionalMovement(e,0);const nearSpeed=e.vx;player.x=2000;regionalMovement(e,0);check(e.vx===nearSpeed,'scorpion does not chase player');
for(const kind of ['turtle','crab','snake','scorpion']){e=reset(kind);e.age=kind==='turtle'?2.5:kind==='crab'?1.5:1;regionalMovement(e,0);check(e.vx===0,'recognizable rest phase for '+kind);}
console.log(checks+' wildlife checks passed.');
`,sandbox);
