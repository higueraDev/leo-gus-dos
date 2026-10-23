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
muted=true;let checks=0;
function check(ok,label){assert.ok(ok,label);checks++;}
function resetRun(){expedition=freshExpedition();hero='leo';level=1;player=null;setup();state='play';lives=3;coins=0;Object.keys(keys).forEach(k=>keys[k]=false);}
resetRun();recordTravel(1060);check(expeditionKm()===1,'1000 pixels count as one adventure km');recordTravel(500);recordTravel(1060);check(expeditionKm()===1,'backtracking does not inflate distance');player.x=1060;die();recordTravel(player.x);check(expeditionKm()===1,'respawn does not add distance');
resetRun();player.y=384;player.on=true;platforms.push({x:84,y:300,w:32,h:116,type:'brick'});keys.ArrowRight=true;update(.025);check(expeditionKm()===0&&player.x===60,'blocked movement earns no distance');keys.ArrowRight=false;
resetRun();recordTravel(1060);earnCoins(20);const block={x:300,y:300,w:32,h:32,type:'question',item:'red',used:false};platforms.push(block);purchaseBlock(block);check(expedition.earnedCoins===20&&expedition.spentCoins===5&&coins===15,'spending does not erase earned coin score');
player.x=298;player.y=384;player.h=32;player.star=12;
for(const kind of ['crab','crab','snake'])examineEnemy({x:310,y:384,w:24,h:32,kind,observed:false,explorerNearby:false});
check(expedition.species.length===2&&expedition.species.includes('crab')&&expedition.species.includes('snake'),'unique species across different individuals');
check(expedition.earnedCoins===35&&coins===30,'individual observation rewards still pay');
const expected=JSON.stringify(expedition);check(saveGame(false)&&readSave().version===4,'new save stores expedition');expedition=freshExpedition();continueGame();check(JSON.stringify(expedition)===expected,'resume restores all metrics');
level=2;setup();state='play';recordTravel(560);check(expeditionKm()===1.5&&expedition.species.length===2,'cross-level distance and species persist');
localStorage.removeItem(RECORDS_KEY);lives=1;player.star=0;player.inv=0;hurt();let records=readRecords();check(records.length===1&&!records[0].won&&records[0].km===1.5&&records[0].balance===30,'loss writes durable result');
check(records[0].expedition.earnedCoins===35&&records[0].expedition.species.length===2,'saved result includes income and unique species');
check(document.querySelector('#expedition-summary').hidden===false&&document.querySelector('#result-badge').hidden,'loss shows summary without national award');
finish(false);check(readRecords().length===1,'ending is idempotent');begin();check(readRecords().length===1&&expeditionKm()===0&&expedition.species.length===0&&coins===0,'new game clears run but preserves records');
localStorage.removeItem(RECORDS_KEY);resetRun();level=32;setup();state='play';captureFlag();update(2.7);check(readRecords()[0].won&&document.querySelector('#result-badge').hidden,'finishing only final stage cannot claim all 32');
localStorage.removeItem(RECORDS_KEY);resetRun();expedition.species=Object.keys(SPECIES_NAMES);
for(let stage=1;stage<=32;stage++){level=stage;player=null;setup();state='play';player.x=world-159;captureFlag();update(2.7);}
records=readRecords();const fullDistance=REGIONS.reduce((sum,r,index)=>sum+levelLength(index+1)-219,0)/1000;
check(records.length===1&&records[0].won&&records[0].expedition.completedRegions.length===32,'full journey saved with all entities');
check(Math.abs(records[0].km-fullDistance)<.001&&records[0].expedition.species.length===Object.keys(SPECIES_NAMES).length,'full distance and distinct species saved');
check(!document.querySelector('#result-badge').hidden&&document.querySelector('#result-recognition').textContent.includes('flora y fauna'),'full journey receives ecological recognition');
const allEarned=records[0].expedition.earnedCoins;check(allEarned>0&&allEarned===records[0].balance,'flag rewards count as income');
resetRun();coins=12;enemies.forEach(e=>e.observed=true);saveGame(false);const old=readSave();old.version=3;delete old.expedition;localStorage.setItem(SAVE_KEY,JSON.stringify(old));continueGame();check(expedition.partial&&expedition.earnedCoins===12&&new Set(expedition.species).size===expedition.species.length,'legacy statistics marked partial and deduplicated');
for(let i=0;i<22;i++){resetRun();recordTravel(160+i);finish(false);}check(readRecords().length===20,'history retains last twenty expeditions');
localStorage.setItem(RECORDS_KEY,'invalid');check(readRecords().length===0,'corrupt history handled');
const invalid=records[0];invalid.expedition.species.push('unknown');localStorage.setItem(RECORDS_KEY,JSON.stringify([invalid]));check(readRecords().length===0,'invalid species rejected');
resetRun();const write=localStorage.setItem;localStorage.setItem=()=>{throw Error('blocked');};finish(false);check(document.querySelector('#result-storage').textContent.includes('No se pudo'),'storage failure is visible');localStorage.setItem=write;
console.log(checks+' expedition record checks passed.');
`,sandbox);
