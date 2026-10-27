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
function check(value,label){assert.ok(value,label);checks++;}
for(let stage=1;stage<=32;stage++){
 level=stage;player=null;setup();state='play';lives=3;
 check(platforms.filter(p=>p.challenge==='route').length===stageChallenge().routes,'optional routes '+stage);
 check(platforms.filter(p=>p.challenge==='moving').length===stageChallenge().moving,'moving progression '+stage);
 check(platforms.filter(p=>p.challenge==='crumbling').length===stageChallenge().crumbling,'crumbling progression '+stage);
 check(saveGame(false)&&validSave(readSave()),'new geometry saves '+stage);
 continueGame();check(platforms.some(p=>p.challenge==='route'),'route restored '+stage);
 const data=readSave(),moving=data.platforms.find(p=>p.challenge==='moving');
 if(moving){delete moving.phase;check(!validSave(data),'invalid motion rejected');}
}
for(const fps of [30,60,120])for(const selected of ['leo','gus']){
 level=32;hero=selected;player=null;setup();state='play';enemies=[];gold=[];lives=3;
 const moving=platforms.find(p=>p.challenge==='moving');
 player.x=moving.x+20;player.y=moving.y-player.h;player.on=true;
 const offset=player.x-moving.x;
 for(let frame=0;frame<fps*2;frame++)update(1/fps);
 check(Math.abs(player.x-moving.x-offset)<.01&&player.on,'carried safely '+selected+' '+fps);
 const crumble=platforms.find(p=>p.challenge==='crumbling');
 player.x=crumble.x+20;player.y=crumble.y-player.h;player.on=true;player.vy=0;
 update(1/fps);check(crumble.triggered&&!crumble.gone,'landing triggers warning');
 saveGame(false);continueGame();
 const restored=platforms.find(p=>p.challenge==='crumbling');check(restored.triggered,'countdown restored');
 for(let frame=0;frame<fps*2;frame++)update(1/fps);
 check(restored.gone&&!hit(player,restored),'collapsed surface non-solid');
 saveGame(false);check(validSave(readSave()),'collapsed save valid');continueGame();
 const absent=platforms.find(p=>p.challenge==='crumbling');
 player.x=60;player.y=384;
 for(let frame=0;frame<fps*4;frame++)update(1/fps);
 check(!absent.gone&&!absent.triggered,'surface respawns');
 const current=platforms.find(p=>p.challenge==='moving'),before=current.phase;state='pause';update(1);check(current.phase===before,'pause freezes platforms');
}
for(const fps of [30,60,120])for(const selected of ['leo','gus'])for(let stage=1;stage<=32;stage++)for(let routeIndex=0;routeIndex<stageChallenge(stage).routes;routeIndex++){
 level=stage;hero=selected;player=null;setup();state='play';enemies=[];gold=[];
 const route=platforms.filter(p=>p.challenge==='route')[routeIndex];
 player.x=route.x;player.y=route.y+88-player.h;player.on=true;let landed=false;
 for(let frame=0;frame<fps*2;frame++){
  keys.Space=frame===0||frame===Math.round(fps*.32);keys.ArrowRight=false;update(1/fps);
  if(player.on&&Math.abs(player.y+player.h-route.y)<.01){landed=true;break;}
 }
 keys.Space=false;keys.ArrowRight=false;check(landed,'bonus route reachable '+selected+' '+stage+' '+fps);
}
level=9;player=null;setup();state='play';lives=3;
const ghost=platforms.find(p=>p.challenge==='crumbling');ghost.gone=true;ghost.triggered=true;ghost.remaining=0;ghost.respawn=.01;
player.x=ghost.x+20;player.y=ghost.y;updateStagePlatforms(4);
check(ghost.gone&&ghost.respawn===0,'respawn waits for occupied surface');
check(saveGame(false)&&validSave(readSave()),'waiting respawn can be saved');
player.x=60;updateStagePlatforms(.01);check(!ghost.gone,'clear surface restores');
console.log(checks+' difficulty checks passed.');
`,sandbox);
