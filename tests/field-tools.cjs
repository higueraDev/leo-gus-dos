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
const flora=fieldEntries()[0],view=fieldEntries()[1];player.x=flora.x;player.y=416-player.h;player.on=true;discoverField();check(!player.survey&&coins===0&&!expedition.journal.bcs,'unowned equipment cannot observe or earn');
openField('binoculars');check(fieldMode===null,'manual binocular panel removed');
earnCoins(12);const block=platforms.find(p=>p.item==='binoculars');
check(block.x<flora.x&&flora.x<view.x,'binocular shop before observation points');
check(purchaseBlock(block)&&coins===0&&expedition.binoculars,'purchase equipment');
const duplicate={...block,used:false};earnCoins(12);check(!purchaseBlock(duplicate)&&coins===12&&!duplicate.used,'owned equipment never charged again');
player.x=flora.x-30;player.on=true;discoverField();check(player.survey===.95&&player.surveyFacing===1&&coins===15&&expedition.journal.bcs.length===1,'automatic flora observation and reward');
player.survey=.4;discoverField();check(player.survey===.4&&coins===15,'standing nearby does not retrigger or farm coins');
player.x=flora.x+60;discoverField();player.x=flora.x+30;discoverField();check(player.survey===.4,'boundary jitter keeps hysteresis');
player.x=flora.x+100;discoverField();player.x=flora.x+30;discoverField();check(player.survey===.95&&player.surveyFacing===-1&&coins===15,'reentry animates facing left without duplicate reward');
const beforeTime=timer,beforeX=player.x;keys.ArrowRight=true;player.inv=10;update(.025);check(timer<beforeTime&&player.x>beforeX&&fieldMode===null&&Math.abs(camera-(player.x-300))<.01,'automatic survey preserves gameplay and camera');keys.ArrowRight=false;
player.x=view.x;player.on=false;discoverField();check(coins===15,'airborne observation blocked');
player.on=true;player.y=300-player.h;discoverField();check(coins===15,'overhead platform cannot inspect ground-level point');
player.y=416-player.h;discoverField();check(coins===18&&expedition.journal.bcs.length===2&&player.surveyKind==='landscape','automatic landscape observation');
check(saveGame(false),'journal saves');continueGame();check(expedition.binoculars&&expedition.journal.bcs.length===2&&player.survey===0,'resume clears animation and retains discoveries');discoverField();check(player.survey===.95&&coins===18,'resume near known point animates without extra payment');
openField('journal');const frozen=timer;update(.1);check(timer===frozen&&fieldMode==='journal','notebook still pauses');closeField();
player.survey=.7;player.on=true;player.y=416-player.h;keys.Space=true;update(.025);keys.Space=false;check(player.survey===0&&!player.on,'jumping lowers binoculars');
const balance=coins;die();check(expedition.binoculars&&player.survey===0,'equipment survives life loss and animation clears');
for(level=1;level<=32;level++){
 player=null;setup();state='play';player.x=fieldEntries()[0].x;player.y=416-player.h;player.on=true;discoverField();
 check(player.survey===.95&&expedition.journal[region().id].some(e=>e.id==='flora'),'automatic observation in every region');
 check(platforms.find(p=>p.item==='binoculars').x<fieldEntries()[0].x,'shop precedes flora in every region');
}
level=1;setup();state='play';saveGame(false);const old=readSave();delete old.expedition.journal;delete old.expedition.binoculars;localStorage.setItem(SAVE_KEY,JSON.stringify(old));continueGame();check(!expedition.binoculars&&Object.keys(expedition.journal).length===0,'old saves migrate');
check(!validJournal({bcs:[{id:'flora',name:'<script>'}]}),'unsafe journal rejected');
openField('journal');pause();check(fieldMode===null&&state==='pause','pause closes field view');
console.log(checks+' field tool checks passed.');
`,sandbox);
