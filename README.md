# Leo & Gus · DOS Arcade

Juego web de plataformas inspirado en los clásicos de MS-DOS. Recreación fan no afiliada a Nintendo.

**Jugar:** https://higueradev.github.io/leo-gus-dos/

## Ejecutar localmente

No requiere dependencias ni compilación. Con Python 3:

```sh
python3 -m http.server 8000
```

Abre http://localhost:8000. Para publicar, sirve estos archivos estáticos mediante HTTPS. El manifiesto y el service worker permiten instalar el juego y jugar sin conexión después de la primera carga completa.

## Controles

- Flechas o A/D: movimiento.
- Espacio, flecha arriba o W: salto. Suelta y vuelve a pulsar para doble salto.
- Con capa: mantén salto para volar; la energía se recarga al aterrizar.
- P: pausa; R: reinicia la partida.
- Controles táctiles en móvil, también flotantes en pantalla completa.
- El botón de sonido controla música y efectos.

## Características

Tres niveles ambientados en Baja California Sur, Baja California y Chihuahua, con flora, fauna y elementos regionales en el fondo; selección de Leo o Gus con camisas de campo azul y verde, pañuelo, pantalón cargo, cinturón y botas, monedas, ladrillos rompibles, fauna que se esquiva y observa, banderas con bonificación según la altura, música original sintetizada y cuatro poderes: hongo rojo, equipo explorador (casco, chaleco y 12 segundos de inmunidad; examina animales con lupa sin dañarlos y recibe 5 monedas extra por la primera observación de cada uno), pluma con capa y hongo verde.

## Archivos

- `game.js`: lógica, gráficos y audio con Canvas y Web Audio.
- `style.css`, `index.html`: interfaz adaptable.
- `install.js`, `manifest.webmanifest`, `sw.js`: instalación y caché sin conexión.

Al cambiar archivos del juego, incrementa el identificador `CACHE` en `sw.js` para renovar los recursos sin conexión.

## GitHub Pages

El workflow `.github/workflows/pages.yml` publica automáticamente cada push a `main`. También puede ejecutarse manualmente desde Actions.

En Settings → Pages, selecciona **GitHub Actions** como fuente de publicación.

URL: https://higueradev.github.io/leo-gus-dos/

El manifiesto usa rutas relativas para funcionar bajo `/leo-gus-dos/`. El despliegue incluye únicamente los archivos del juego.

Fauna: una tortuga de recorrido lento en la primera zona costera de BCS, cangrejos en BCS, serpientes de cascabel en Baja California y alacranes en Chihuahua. Los animales patrullan espacios delimitados lejos de los bordes de precipicios y de las zonas de aterrizaje bajo los ladrillos; hacen pausas y no persiguen al jugador. La serpiente agita la cola antes de avanzar. Son comportamientos de juego simplificados.

Saltar sobre un animal produce un rebote suave sin dañarlo y lo duerme durante 4 segundos. Mientras duerme cierra los ojos, muestra «Zz», permanece quieto y no causa daño por contacto. Después retoma su recorrido; se puede observar dormido y su sueño se conserva al guardar. Un choque lateral quita un corazón, separa al jugador sin empujarlo al precipicio y concede 1.6 segundos de protección; los poderes se conservan. En modo explorador se atraviesa y observa la fauna sin daño y cada primera observación paga 5 monedas. No hay eliminaciones, patadas ni caparazones como proyectiles. Los caparazones de partidas anteriores vuelven a ser tortugas conservando sus observaciones.

Música: tres composiciones originales sintetizadas, inspiradas en polca sudcaliforniana (BCS, 2/4), corrido fronterizo (BC, 3/4) y polca chihuahuense (Chihuahua, 2/4). Cada nivel cambia la melodía, el tempo y el acompañamiento. No requieren descargar audio.

Guardado: botón GUARDAR, opción en pausa y guardado automático cada 5 segundos, al pausar y al ocultar la página. CONTINUAR restaura nivel, personaje, posición, enemigos, bloques, monedas, tiempo, vidas y poderes. Una partida por navegador y dispositivo mediante localStorage, también sin conexión. Nueva partida reemplaza el guardado; terminar la aventura o perder todas las vidas lo elimina.

Puntaje único en monedas: cada moneda recogida suma 1; observar por primera vez a cada animal paga 5 monedas. La bandera paga de 1 a 50 monedas según la altura y el tiempo restante da 1 moneda por cada 10 segundos completos. Romper bloques, tomar poderes y tocar animales no genera monedas. Las vidas se muestran con corazones rojos grandes. Los guardados anteriores conservan sus monedas y progreso; los puntos antiguos se descartan.

## Validación de fauna

Ejecuta `node tests/wildlife.cjs` para comprobar contacto, rebotes, sueño y despertar, inmunidad, pago por observación, migración de caparazones y patrullas de un minuto a 30, 60 y 120 FPS. Son pruebas de lógica con navegador y audio simulados.
