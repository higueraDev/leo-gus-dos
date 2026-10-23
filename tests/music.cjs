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
function gain(){return {value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(value){this.value=value;}};}
window.AudioContext=class {constructor(){this.currentTime=1;this.destination={};}resume(){return Promise.resolve();}createGain(){return {gain:gain(),connect(target){return target;},disconnect(){ended++;}};}createOscillator(){return {frequency:{value:0},connect(target){return target;},disconnect(){ended++;},start(time){check(Number.isFinite(time),'finite onset');starts++;},stop(time){check(Number.isFinite(time),'finite end');this.onended();}};}};
setInterval=()=>{intervals++;};
check(ensureAudio()&&ensureAudio()&&intervals===1,'single context and scheduler');
for(level=1;level<=32;level++){
 setup();const track=currentMusic();check(track.regionId===region().id,'state mapping');check(track.melody.length%track.barLength===0,'whole-bar loop');check(track.lengths.length===track.melody.length,'duration alignment');check(track.kind==='folk'&&track.reference.startsWith('https://')&&!track.name.includes('original'),'every level has a sourced folk theme');
 for(let step=0;step<track.melody.length*2;step++)playMusicStep(track,step,2+step*.1,.1);
 state='play';fieldMode=null;muted=false;musicLevel=0;musicStep=100;scheduleMusic();check(musicLevel===level&&musicStep<4&&musicBus.gain.value===1,'transition restarts theme');check(Math.abs(nextNote-(audio.currentTime+.025+musicStep*60/track.bpm/track.division))<.00001,'scheduler respects musical subdivision');
 const scheduled=starts;scheduleMusic();check(starts===scheduled,'lookahead does not duplicate notes');
 for(const mode of ['pause','menu','goal','end']){state=mode;scheduleMusic();check(starts===scheduled&&musicBus.gain.value===0&&nextNote===0,'inactive state silent');}
 state='play';fieldMode='journal';scheduleMusic();check(starts===scheduled&&musicBus.gain.value===0,'journal silent');fieldMode=null;muted=true;scheduleMusic();check(starts===scheduled&&musicBus.gain.value===0,'mute silent');muted=false;document.hidden=true;scheduleMusic();check(starts===scheduled&&musicBus.gain.value===0,'background silent');document.hidden=false;
}
check(ended===starts*2,'oscillator and gain disconnected');
const sustained=arrangeFolkScore({...FOLK_SCORES[0],phrase:[[72,16]],beats:4,division:4});check(sustained.melody.filter(Boolean).length===1&&sustained.lengths[0]===16,'held notes do not retrigger halfway through');
const regularNote=musicNote,events=[];musicNote=(pitch,time,duration,wave,volume)=>events.push({pitch,time,volume});
for(const [id,pulses]of [['tab',[0,6]],['bc',[0]],['dgo',[0,4]],['cdmx',[0,12]]]){
 const track=STATE_MUSIC.find(t=>t.regionId===id);events.length=0;for(let step=0;step<track.barLength;step++)playMusicStep(track,step,step,1);
 check(JSON.stringify(events.filter(e=>e.volume===.046||e.volume===.038).map(e=>e.time))===JSON.stringify(pulses),'bass pulses follow the meter');
}
musicNote=regularNote;
let stopped=0,cancelled=0;const voice={gain:{gain:{cancelScheduledValues(){cancelled++;},setTargetAtTime(){}}},oscillator:{stop(time){check(time===audio.currentTime+.03,'old voice has a short release');stopped++;}}};
state='pause';musicVoices.add(voice);scheduleMusic();check(stopped===1&&cancelled===1&&musicVoices.size===0,'pause cancels scheduled notes');scheduleMusic();check(stopped===1,'repeated inactive ticks do not stop a voice twice');
state='play';musicLevel=1;level=2;musicVoices.add(voice);scheduleMusic();check(stopped===2&&cancelled===2,'level transition cancels the previous theme');
console.log(checks+' music checks passed.');
`,sandbox);
