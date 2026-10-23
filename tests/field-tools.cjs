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
muted=true;begin();let checks=0;
function check(value,label){assert.ok(value,label);checks++;}
openField('binoculars');check(fieldMode===null,'unowned binoculars unavailable');
earnCoins(12);const block=platforms.find(p=>p.item==='binoculars');
check(purchaseBlock(block)&&coins===0&&expedition.binoculars,'purchase equipment');
const duplicate={...block,used:false};earnCoins(12);check(!purchaseBlock(duplicate)&&coins===12&&!duplicate.used,'cannot charge owned equipment');
openField('binoculars');const x=player.x,t=timer;keys.ArrowRight=true;update(1);check(player.x===x&&timer===t&&camera>x,'inspection freezes world');closeField();check(!keys.ArrowRight&&camera===0,'close clears movement');
player.x=600;player.on=true;discoverField();discoverField();check(coins===15&&expedition.journal.bcs.length===1,'flora reward unique');player.on=false;player.x=1250;discoverField();check(coins===15,'cannot record from air');player.on=true;discoverField();check(coins===18&&expedition.journal.bcs.length===2,'landscape reward');
check(saveGame(false),'journal saves');continueGame();check(expedition.binoculars&&expedition.journal.bcs.length===2,'tools restored');
level=2;setup();state='play';player.x=600;player.on=true;discoverField();check(expedition.journal.bc.length===1&&expedition.journal.bcs.length===2,'regional records separated');
const old=readSave();delete old.expedition.journal;delete old.expedition.binoculars;localStorage.setItem(SAVE_KEY,JSON.stringify(old));continueGame();check(!expedition.binoculars&&Object.keys(expedition.journal).length===0,'old saves migrate');
check(!validJournal({bcs:[{id:'flora',name:'<script>'}]}),'unsafe journal rejected');
openField('journal');pause();check(fieldMode===null&&state==='pause','pause closes field view');
console.log(checks+' field tool checks passed.');
`,sandbox);
