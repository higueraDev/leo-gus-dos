let installPrompt;
const installButton=document.querySelector('#install'),installHelp=document.querySelector('#install-help');
function standalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;}
function installed(){installButton.hidden=true;installHelp.textContent='JUEGO INSTALADO';}
if(standalone())installed();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;installButton.hidden=false;installHelp.textContent='';});
window.addEventListener('appinstalled',()=>{installPrompt=null;installed();});
installButton.addEventListener('click',async()=>{if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();const result=await prompt.userChoice;if(result.outcome==='accepted')installHelp.textContent='Instalando…';return;}const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);installHelp.textContent=ios?'En Safari: Compartir → Añadir a pantalla de inicio.':'Abre el menú del navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio». Si no aparece, usa Chrome o Edge.';});
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{installHelp.textContent='No se pudo preparar el modo sin conexión. Recarga para reintentar.';});});}
