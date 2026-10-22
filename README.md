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

Tres niveles ambientados en Baja California Sur, Baja California y Chihuahua, con flora, fauna y elementos regionales en el fondo; selección de Leo o Gus, monedas, ladrillos rompibles, tortugas y caparazones, banderas con bonificación según la altura, música original sintetizada y cuatro poderes: hongo rojo, estrella, pluma con capa y hongo verde.

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
