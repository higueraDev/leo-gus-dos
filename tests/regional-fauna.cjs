const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const nodes=new Map(),storage=new Map();
function element(){return {focus(){},style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},before(){},after(){},append(){},getContext(){return {}},textContent:'',innerHTML:'',hidden:false};}
const sandbox={assert,console,performance:{now:()=>0},requestAnimationFrame(){},setInterval(){},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},window:{addEventListener(){}},document:{querySelector(selector){if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);},querySelectorAll:()=>[],createComment:element,addEventListener(){},body:element()}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../game.js'),'utf8'),sandbox);
vm.runInContext(`
muted=true;let checks=0;
function check(ok,label){assert.ok(ok,label);checks++;}
check(Object.keys(SPECIES_NAMES).length===14,'four legacy and ten additional animal kinds');
const seen=new Set();
for(level=1;level<=REGIONS.length;level++){
 expedition=freshExpedition();player=null;setup();state='play';
 const profile=region().population;
 check(region().fauna.length>=4&&region().fauna.length<=6,'regional diversity '+region().id);
 check(enemies.length>=7&&enemies.length<=10,'bounded encounter density '+region().id);
 check(new Set(enemies.map(e=>e.homeMin)).size===enemies.length,'separate patrol habitats');
 for(const [kind,count]of Object.entries(profile)){
  seen.add(kind);check(enemies.filter(e=>e.kind===kind).length===count,'exact regional encounters '+region().id+' '+kind);
 }
 check(enemies.every(e=>e.x>=180&&e.homeMax>e.homeMin&&!platforms.some(p=>p.type==='brick'&&p.y+p.h>416-e.h&&p.y<416&&e.homeMin<p.x+p.w&&e.homeMax+e.w>p.x)),'safe patrol placement');
 const snapshot=JSON.stringify(enemies);check(saveGame(false),'population saves');continueGame();check(JSON.stringify(enemies)===snapshot,'resume preserves individuals and positions');
 player.star=1000;
 for(let frame=0;frame<600;frame++)updateEnemies(1/30,player.y+player.h);
 check(enemies.every(e=>e.alive&&e.x>=e.homeMin-.01&&e.x<=e.homeMax+.01&&Math.abs(e.y+e.h-416)<.1),'twenty seconds on safe ground '+region().id);
}
check(seen.size===14,'all catalog animals appear during journey');
for(const heroName of ['leo','gus'])for(const kind of Object.keys(SPECIES_NAMES)){
 hero=heroName;level=1;expedition=freshExpedition();player=null;setup();state='play';lives=3;coins=0;
 const [w,h]=ANIMAL_SIZES[kind];const e={kind,x:310,y:416-h,w,h,vx:0,vy:0,alive:true,age:0,direction:1,homeMin:280,homeMax:380};enemies=[e];
 player.x=300;player.y=416-player.h;player.inv=0;updateEnemies(0,416);
 check(lives===2&&e.alive,'side contact preserves animal '+kind);
 player.inv=0;player.star=12;updateEnemies(0,416);updateEnemies(0,416);
 check(lives===2&&coins===5&&expedition.species.length===1&&expedition.journal.bcs.length===1,'unique harmless observation '+kind);
 player.star=0;player.inv=0;player.x=310;player.y=e.y-player.h+2;player.vy=100;updateEnemies(0,e.y-1);
 check(e.sleep===4&&e.alive&&lives===2,'landing sleeps new animal '+kind);
 const saved=JSON.stringify(expedition);check(saveGame(false),'new species accepted in save');continueGame();check(JSON.stringify(expedition)===saved&&enemies[0].sleep===4,'species and sleep survive reload');
}
level=1;hero='leo';expedition=freshExpedition();player=null;setup();state='play';lives=3;coins=0;
for(const kind of Object.keys(SPECIES_NAMES)){player.x=300;player.y=380;examineEnemy({x:310,y:384,w:24,h:32,kind,observed:false});}
journalEntry('flora','Vegetación');journalEntry('landscape','Paisaje');check(expedition.journal.bcs.length===16&&saveGame(false),'expanded notebook capacity');
check(validRecord(saveResult(false)),'expanded unique species stored in history');
const old=readSave();delete old.faunaRevision;old.enemies=old.enemies.filter(e=>e.kind==='crab');old.enemies.forEach(e=>e.observed=true);localStorage.setItem(SAVE_KEY,JSON.stringify(old));const balance=coins;continueGame();
check(enemies.length===9&&enemies.filter(e=>e.kind==='crab').every(e=>e.observed)&&coins===balance,'legacy population upgraded without losing observation or minting coins');
check(saveGame(false),'upgraded population saves');const upgraded=JSON.stringify(enemies);continueGame();check(JSON.stringify(enemies)===upgraded,'upgrade applied only once');
const bad=readSave();bad.enemies[0].kind='alien';check(!validSave(bad),'unknown animal rejected');
localStorage.removeItem(RECORDS_KEY);expedition=freshExpedition();expedition.species=Object.keys(SPECIES_NAMES);for(const r of REGIONS)expedition.journal[r.id]=[...Object.keys(SPECIES_NAMES),'flora','landscape'].map(id=>({id,name:'Registro de campo: '+id}));for(let i=0;i<20;i++)check(saveResult(false).persisted,'full notebooks persist');check(readRecords().length===20,'twenty expanded notebooks retained');
console.log(checks+' regional fauna checks passed.');
`,sandbox);
