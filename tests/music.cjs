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
let checks=0,starts=0,ended=0,intervals=0;
function check(value,label){assert.ok(value,label);checks++;}
function gain(){return {value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(value){this.value=value;}};}
window.AudioContext=class {constructor(){this.currentTime=1;this.destination={};}resume(){return Promise.resolve();}createGain(){return {gain:gain(),connect(target){return target;},disconnect(){ended++;}};}createOscillator(){return {frequency:{value:0},connect(target){return target;},disconnect(){ended++;},start(time){check(Number.isFinite(time),'finite onset');starts++;},stop(time){check(Number.isFinite(time),'finite end');this.onended();}};}};
setInterval=()=>{intervals++;};
check(ensureAudio()&&ensureAudio()&&intervals===1,'single context and scheduler');
for(level=1;level<=32;level++){
 setup();const track=currentMusic();check(track.regionId===region().id,'state mapping');check(track.melody.length%(track.beats*4)===0,'whole-bar loop');check(track.lengths.length===track.melody.length,'duration alignment');
 for(let step=0;step<track.melody.length*2;step++)playMusicStep(track,step,2+step*.1,.1);
 state='play';fieldMode=null;muted=false;musicLevel=0;musicStep=100;scheduleMusic();check(musicLevel===level&&musicStep<4&&musicBus.gain.value===1,'transition restarts theme');
 const scheduled=starts;scheduleMusic();check(starts===scheduled,'lookahead does not duplicate notes');
 for(const mode of ['pause','menu','goal','end']){state=mode;scheduleMusic();check(starts===scheduled&&musicBus.gain.value===0&&nextNote===0,'inactive state silent');}
 state='play';fieldMode='journal';scheduleMusic();check(starts===scheduled&&musicBus.gain.value===0,'journal silent');fieldMode=null;muted=true;scheduleMusic();check(starts===scheduled&&musicBus.gain.value===0,'mute silent');muted=false;document.hidden=true;scheduleMusic();check(starts===scheduled&&musicBus.gain.value===0,'background silent');document.hidden=false;
}
check(ended===starts*2,'oscillator and gain disconnected');
console.log(checks+' music checks passed.');
`,sandbox);
