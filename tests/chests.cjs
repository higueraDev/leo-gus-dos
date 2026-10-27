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
function check(value,label){assert.ok(value,label);checks++;}
for(const fps of [30,60,120])for(const selected of ['leo','gus'])for(let stage=1;stage<=32;stage++){
 expedition=freshExpedition();hero=selected;level=stage;player=null;setup();state='play';coins=0;lives=3;enemies=[];
 Object.keys(keys).forEach(k=>keys[k]=false);
 const key=platforms.find(p=>p.item==='key');
 check(key&&key.x>fieldEntries()[1].x&&key.x<world-235,'key shop between inspections and chest');
 captureFlag();check(state==='play'&&!expedition.completedRegions.includes(region().id),'flag alone cannot finish');
 earnCoins(100);check(!purchaseBlock(key)&&!key.used&&coins===100,'money cannot bypass inspections');coins=0;expedition.earnedCoins=0;
 player.x=world-130;player.y=90;player.vy=-100;update(1/fps);
 check(state==='play'&&player.x+player.w<world-235,'jump cannot bypass locked exit');
 earnCoins(12);check(purchaseBlock(platforms.find(p=>p.item==='binoculars'))&&coins===0,'inspection equipment affordable');
 const inspect=id=>{player.x=fieldEntries().find(e=>e.id===id).x;player.y=416-player.h;player.on=true;discoverField();};
 inspect('flora');check(inspectedSites().length===1&&coins===3&&inspectionReserve()===3,'flora reward reserved');
 check(!purchaseBlock(key),'one inspection insufficient');
 earnCoins(2);const red={type:'question',item:'red',used:false};check(!purchaseBlock(red)&&coins===5,'cannot spend reserved key money');coins-=2;
 inspect('landscape');check(inspectedSites().length===2&&coins===6&&inspectionReserve()===6,'two inspections fund exact key price');
 check(purchaseBlock(key)&&chestState().key&&coins===0&&inspectionReserve()===0,'buy regional key');
 check(!purchaseBlock({...key,used:false})&&coins===0,'no duplicate key charge');
 check(saveGame(false),'key saves');continueGame();check(chestState().key&&inspectedSites().length===2,'key and inspections restore');
 die();check(chestState().key,'key survives life loss');
 player.x=world-280;player.y=416-player.h;player.on=true;player.vy=0;update(1/fps);
 check(chestState().open&&!chestState().key&&coins===12,'chest consumes key and rewards');
 updateChest();check(coins===12,'chest cannot be farmed');
 check(saveGame(false),'open chest saves');continueGame();check(chestState().open&&!chestState().key,'open chest restores');
 player.x=world-150;player.y=416-player.h;captureFlag();check(state==='goal','opened chest permits flag');
 update(2.7);check(stage===32?state==='end':state==='play'&&!chestState().open&&!chestState().key&&inspectedSites().length===0,'requirements reset per region');
}
expedition=freshExpedition();level=1;player=null;setup();state='play';coins=0;lives=3;expedition.binoculars=true;
for(const entry of fieldEntries()){player.x=entry.x;player.y=416-player.h;player.on=true;discoverField();}
check(saveGame(false),'migration fixture saves');const legacy=readSave();delete legacy.expedition.chests;legacy.platforms=legacy.platforms.filter(p=>p.item!=='key');legacy.coins=0;localStorage.setItem(SAVE_KEY,JSON.stringify(legacy));continueGame();
check(platforms.some(p=>p.item==='key')&&coins===6&&inspectedSites().length===2,'old saves receive shop and missing reserved funds');
check(saveGame(false),'migrated save valid');const restored=readSave();restored.expedition.chests.bcs={key:true,open:true};check(!validSave(restored),'reject contradictory chest');
check(!validChests({unknown:{key:false,open:false}}),'reject unknown chest region');
console.log(checks+' chest checks passed.');
`,sandbox);
