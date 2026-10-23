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
check(REGIONS.length===32&&new Set(REGIONS.map(r=>r.id)).size===32,'32 unique entities');
check(REGIONS[0].id==='bcs'&&REGIONS[31].id==='qroo','peninsula-to-Caribbean journey');
const borders={bcs:['bc'],bc:['son'],son:['sin','chih'],sin:['nay','dgo','chih'],nay:['dgo','jal','zac'],dgo:['chih','coah','zac'],chih:['coah'],coah:['nl'],nl:['tamps','slp'],tamps:['slp','ver'],slp:['zac','gto','qro','hgo','ver'],zac:['ags','jal'],ags:['jal'],jal:['col','mich','gto'],col:['mich'],mich:['gto','qro','mex','gro'],gto:['qro'],qro:['hgo','mex'],hgo:['tlax','pue','mex','ver'],tlax:['pue','mex'],pue:['mex','mor','gro','oax','ver'],mex:['cdmx','mor','gro'],cdmx:['mor'],mor:['gro'],gro:['oax'],oax:['ver','chis'],ver:['chis','tab'],chis:['tab'],tab:['camp'],camp:['yuc','qroo'],yuc:['qroo']};
for(let i=1;i<REGIONS.length;i++){
 const a=REGIONS[i-1].id,b=REGIONS[i].id;check((borders[a]||[]).includes(b)||(borders[b]||[]).includes(a),'neighboring transition '+a+' -> '+b);
}
for(const selected of ['leo','gus'])for(let stage=1;stage<=REGIONS.length;stage++){
 hero=selected;level=stage;player=null;setup();state='play';lives=3;coins=50;
 check(enemies.length>0&&enemies.every(e=>e.kind==='turtle'||region().fauna.includes(e.kind)),'valid regional fauna');
 check(world>=3860&&world<=4220&&platforms.every(p=>p.x+p.w<=world),'bounded full level geometry');
 check(STATE_MUSIC[region().music]&&region().landmark&&region().biome,'complete environment configuration');
 check(saveGame(false)&&validSave(readSave()),'save at stage '+stage);
 continueGame();check(level===stage&&readSave().regionId===region().id,'resume correct entity');
 const earned=coins;player.big=true;player.cape=true;player.star=5;player.y=220;captureFlag();check(state==='goal'&&coins>earned,'stage pays coin bonus');
 update(2.7);
 check(stage===REGIONS.length?state==='end':state==='play'&&level===stage+1&&player.big&&player.cape&&timer===180,'advance or finish exactly at final entity');
}
for(const selected of ['leo','gus'])for(let stage=1;stage<=REGIONS.length;stage++){
 hero=selected;level=stage;player=null;setup();state='play';enemies=[];gold=[];notice=null;
 check(stageGaps().every(([a,b])=>b-a<=140),'crossable gap widths');
 const target=stagePlatform(0);player.x=target.x-160;player.y=416-player.h;player.on=true;player.inv=0;
 Object.keys(keys).forEach(k=>keys[k]=false);let landed=false;
 for(let frame=0;frame<120;frame++){
  keys.Space=frame===0||frame===19;keys.ArrowRight=player.x<target.x+32;update(1/60);
  if(player.on&&player.x+player.w>target.x&&player.x<target.x+target.w&&player.y+player.h<=target.y+.01){landed=true;break;}
 }
 check(landed,'first platform reachable by '+selected+' at stage '+stage+' '+JSON.stringify({x:player.x,y:player.y,on:player.on,target}));
 Object.keys(keys).forEach(k=>keys[k]=false);
}
for(const version of [1,2]){
 hero='leo';level=3;player=null;setup();state='play';lives=3;coins=37;saveGame(false);const data=readSave();data.version=version;data.level=3;data.score=1234;delete data.regionId;delete data.world;
 localStorage.setItem(SAVE_KEY,JSON.stringify(data));continueGame();
 check(region().id==='chih'&&level===7&&world===4380&&coins===37,'legacy Chihuahua maps to new position');
 check(saveGame(false)&&readSave().version===4&&readSave().regionId==='chih'&&readSave().world===4380,'legacy geometry survives upgrade');
}
level=32;player=null;setup();state='play';saveGame(false);let data=readSave();data.regionId='bcs';check(!validSave(data),'reject inconsistent entity identity');data=readSave();data.level=33;check(!validSave(data),'reject non-existent level');
console.log(checks+' national route checks passed.');
`,sandbox);
