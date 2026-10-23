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
for(const selected of ['leo','gus'])for(const kind of ['turtle','crab','snake','scorpion']){
 e=reset(kind,selected);player.y=e.y-player.h+1;player.vy=100;updateEnemies(0,e.y);
 check(e.sleep===4&&e.vx===0&&e.alive&&coins===0,'landing sleeps animal without coins or damage');
 const restingX=e.x,restingAge=e.age;player.x=298;player.y=384;player.vy=0;player.inv=0;
 for(let frame=0;frame<20;frame++)updateEnemies(.025,416);check(Math.abs(e.sleep-3.5)<.00001&&e.x===restingX&&e.age===restingAge&&lives===3,'sleep pauses movement and prevents contact damage');
 state='pause';update(.5);check(Math.abs(e.sleep-3.5)<.00001,'pause freezes sleep timer');state='play';
 coins=23;e.observed=true;saveGame(false);continueGame();e=enemies[0];check(Math.abs(e.sleep-3.5)<.00001&&e.observed&&coins===23,'save preserves sleep and discovery');
 player.star=12;player.examine=0;e.observed=false;e.explorerNearby=false;updateEnemies(0,416);check(Math.abs(e.sleep-3.5)<.00001&&e.observed&&coins===28,'sleeping animals can be observed');
 player.x=100;player.star=0;for(let frame=0;frame<72;frame++)updateEnemies(.05,416);check(e.sleep===0&&e.alive&&e.age>restingAge,'animal wakes and resumes patrol');
 player.x=e.x-12;player.y=384;player.inv=0;player.vy=0;const beforeWake=lives;updateEnemies(0,416);check(lives===beforeWake-1,'normal contact returns after waking');
}
for(const selected of ['leo','gus']){
 e=reset('crab',selected);player.x=60;enemies=[];collectItem({kind:'feather'});
 check(player.cape&&player.flight===6&&notice.text.includes('PARAPENTE'),'paraglider pickup equips six seconds');
 player.on=false;player.y=250;player.vy=80;player.jumpHeld=true;player.jumps=2;keys.Space=true;update(.025);check(player.flight<6&&player.vy<80,'holding jump deploys flight');
 const usedFlight=player.flight;keys.Space=false;update(.025);check(player.flight===usedFlight,'release stops consuming flight');
 state='pause';update(.1);check(player.flight===usedFlight,'pause preserves flight');state='play';
 player.on=false;player.y=416-player.h-1;player.vy=100;update(.025);check(player.on&&player.flight===6,'landing refills flight');
 player.on=false;player.y=50;player.vy=0;player.jumpHeld=true;keys.Space=true;update(.025);check(player.y>50&&player.y<51,'gliding descends without teleporting at top of screen');
 player.on=false;player.y=250;player.vy=0;player.jumpHeld=true;player.flight=.01;update(.025);check(player.flight===0,'flight energy cannot be negative');
 player.flight=2.3;saveGame(false);continueGame();check(player.cape&&player.flight===2.3,'legacy cape save retains paraglider and energy');
}
for(const selected of ['leo','gus'])for(const kind of ['red','star','feather','green']){
 reset('crab',selected);enemies=[];const block={x:300,y:300,w:32,h:32,type:'question',used:false,item:kind};platforms.push(block);
 const price=SHOP_ITEMS[kind].price;coins=price-1;
 check(!purchaseBlock(block)&&coins===price-1&&!block.used,'insufficient funds keep block available');
 check(notice.text.includes('TE FALTAN 1'),'shortfall is explained');
 coins=price;const beforeLives=lives;check(purchaseBlock(block)&&coins===0&&block.used,'exact balance purchases once');
 check(kind==='red'?player.big:kind==='star'?player.star===12:kind==='feather'?player.cape&&player.flight===6:lives===beforeLives+1,'purchased effect applies immediately');
 check(!purchaseBlock(block)&&coins===0,'used block cannot charge twice');
 const saved=readSave();check(saved.coins===0&&saved.platforms.find(p=>p.item===kind&&p.x===300).used,'purchase persisted');
 continueGame();check(coins===0&&platforms.find(p=>p.item===kind&&p.x===300).used,'reload keeps balance and sold block');
}
reset();enemies=[];gold=[];coins=10;const shop={x:300,y:300,w:32,h:32,type:'question',used:false,item:'star'};platforms.push(shop);
player.x=304;player.y=333;player.vy=-100;player.on=false;player.jumps=1;update(.025);
check(shop.used&&coins===0&&player.star>11,'head collision purchases explorer');
reset();enemies=[];gold=[];coins=9;const unaffordable={x:300,y:300,w:32,h:32,type:'question',used:false,item:'star'};platforms.push(unaffordable);
player.x=304;player.y=333;player.vy=-100;player.on=false;player.jumps=1;update(.025);
check(!unaffordable.used&&coins===9&&player.star===0,'head collision cannot grant unpaid gear');
reset();const invalid={x:300,y:300,w:32,h:32,type:'brick',used:false,item:'star'};coins=30;check(!purchaseBlock(invalid)&&coins===30,'bricks cannot charge money');
reset();const pausedShop={x:300,y:300,w:32,h:32,type:'question',used:false,item:'star'};coins=30;state='pause';check(!purchaseBlock(pausedShop)&&coins===30,'paused game cannot charge money');
for(const kind of ['red','feather']){
 reset();coins=50;player.big=kind==='red';player.cape=kind==='feather';const owned={x:300,y:300,w:32,h:32,type:'question',used:false,item:kind};
 check(!purchaseBlock(owned)&&coins===50&&!owned.used,'owned equipment cannot waste coins');
}
for(const selected of ['leo','gus'])for(const fps of [30,60,120]){
 reset('crab',selected);platforms=[];enemies=[];gold=[];player.x=100;player.y=100;player.on=false;player.vy=500;player.cape=true;player.flight=6;player.jumpHeld=true;player.jumps=2;keys.Space=true;keys.ArrowRight=true;
 const startX=player.x,startY=player.y;
 for(let frame=0;frame<fps*2;frame++)update(1/fps);
 check(player.y>startY&&player.y<=startY+131,'gliding always descends slowly at '+fps+' fps');
 check(player.x>startX&&Math.abs(player.flight-4)<.001,'horizontal control and duration retained');
 keys.Space=false;const descent=player.vy;update(1/fps);check(player.vy>descent,'release restores gravity');
 keys.Space=true;player.jumpHeld=true;player.flight=0;player.vy=100;update(1/fps);check(player.vy>100,'empty glider cannot slow fall');
 player.y=200;player.vy=-300;player.flight=6;const energy=player.flight;update(1/fps);check(player.y<200&&player.vy>-300&&player.flight===energy,'rising jump remains ballistic and consumes no glide energy');
}
console.log(checks+' wildlife checks passed.');
`,sandbox);
