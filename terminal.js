// Terminal shortcuts complement the visible game controls.
const terminalForm=document.querySelector('#terminal-form');
const commandField=document.querySelector('#terminal-command');
const terminalReply=document.querySelector('#terminal-response');
commandField.addEventListener('keydown',event=>event.stopPropagation());
commandField.addEventListener('keyup',event=>event.stopPropagation());
terminalForm.addEventListener('submit',event=>{
 event.preventDefault();const command=commandField.value.trim().toUpperCase();commandField.value='';
 if(!command)return;
 const responses={HELP:'PLAY: iniciar · LEO / GUS: elegir personaje · SOUND: sonido · CLS: limpiar',LEO:'LEO seleccionado. Mayor velocidad. Escribe PLAY para jugar.',GUS:'GUS seleccionado. Mayor altura y salto. Escribe PLAY para jugar.',CLS:'C:\\JUEGOS> Sistema listo.'};
 if(command==='LEO'||command==='GUS')document.querySelector('[data-hero="'+command.toLowerCase()+'"]').click();
 if(command==='PLAY'||command==='LEO_GUS.EXE'){commandField.blur();document.querySelector('#start').click();document.querySelector('#screen').scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});terminalReply.textContent='Ejecutando LEO_GUS.EXE…';return;}
 if(command==='SOUND'){document.querySelector('#sound').click();terminalReply.textContent=document.querySelector('#sound span').textContent;return;}
 terminalReply.textContent=responses[command]||'Comando no reconocido. Escribe HELP para ver los comandos.';
});
