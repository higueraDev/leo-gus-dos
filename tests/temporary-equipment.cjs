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
for(const selected of ['leo','gus'])for(let stage=1;stage<32;stage++){
 expedition=freshExpedition();hero=selected;level=stage;player=null;setup();state='play';lives=3;coins=0;
 earnCoins(32);check(purchaseBlock(platforms.find(p=>p.item==='binoculars')),'buy binoculars');check(purchaseBlock(platforms.find(p=>p.item==='feather')),'buy paraglider');
 check(expedition.binoculars&&player.cape&&player.flight===6,'equipment active');
 const inspect=id=>{const entry=fieldEntries().find(e=>e.id===id);player.x=entry.x;player.y=416-player.h;player.on=true;discoverField();};
 inspect('flora');inspect('landscape');const journal=JSON.stringify(expedition.journal[region().id]),id=region().id;
 check(saveGame(false),'equipped save');continueGame();check(expedition.binoculars&&player.cape,'resume keeps equipment in current region');
 die();check(expedition.binoculars&&!player.cape&&JSON.stringify(expedition.journal[id])===journal,'death preserves binoculars and journal but removes paraglider');
 earnCoins(20);check(purchaseBlock(platforms.filter(p=>p.item==='feather'&&!p.used)[0]),'paraglider can be reacquired');
 check(purchaseBlock(platforms.find(p=>p.item==='key')),'reserved inspection money buys key');player.x=world-280;player.y=416-player.h;updateChest();captureFlag();check(state==='goal','complete equipped level');update(2.7);
 check(level===stage+1&&!expedition.binoculars&&!player.cape,'equipment expires on new region');
 check(JSON.stringify(expedition.journal[id])===journal,'previous region inspections preserved');
 check(saveGame(false),'expired equipment saves');continueGame();check(!expedition.binoculars&&!player.cape,'reload cannot restore expired equipment');
 const entry=fieldEntries()[0];player.x=entry.x;player.y=416-player.h;player.on=true;discoverField();check(inspectedSites().length===0,'must buy binoculars again to inspect');
 earnCoins(32);check(purchaseBlock(platforms.find(p=>p.item==='binoculars'))&&purchaseBlock(platforms.find(p=>p.item==='feather')),'shops allow purchase in next region');
 discoverField();check(inspectedSites().includes('flora'),'repurchased binoculars work');
}
console.log(checks+' temporary equipment checks passed.');
`,sandbox);
