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
- Con parapente: mantén salto al caer para desplegarlo y planear descendiendo a un máximo de 65 píxeles por segundo durante 6 segundos; conserva la subida normal del salto y no permite ganar altura; la energía se recarga al aterrizar.
- P: pausa; R: reinicia la partida.
- Controles táctiles en móvil, también flotantes en pantalla completa.
- El botón de sonido controla música y efectos.

## Características

32 niveles, uno por cada entidad federativa de México, en una ruta continua entre entidades vecinas desde Baja California Sur hasta Quintana Roo, con flora, fauna y elementos regionales en el fondo; selección de Leo o Gus con camisas de campo azul y verde, pañuelo, pantalón cargo, cinturón y botas, monedas, ladrillos rompibles, fauna que se esquiva y observa, banderas con bonificación según la altura, música original sintetizada y cuatro poderes: hongo rojo, equipo explorador (casco, chaleco y 12 segundos de inmunidad; examina animales con lupa sin dañarlos y recibe 5 monedas extra por la primera observación de cada uno), parapente con mochila y arnés y hongo verde.

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

Fauna: una tortuga de recorrido lento en la primera zona costera de BCS, cangrejos en etapas costeras y de humedales, serpientes en bosques y sierras y alacranes en etapas áridas, como una selección simplificada para el juego. Los animales patrullan espacios delimitados lejos de los bordes de precipicios y de las zonas de aterrizaje bajo los ladrillos; hacen pausas y no persiguen al jugador. La serpiente agita la cola antes de avanzar. Son comportamientos de juego simplificados.

Saltar sobre un animal produce un rebote suave sin dañarlo y lo duerme durante 4 segundos. Mientras duerme cierra los ojos, muestra «Zz», permanece quieto y no causa daño por contacto. Después retoma su recorrido; se puede observar dormido y su sueño se conserva al guardar. Un choque lateral quita un corazón, separa al jugador sin empujarlo al precipicio y concede 1.6 segundos de protección; los poderes se conservan. En modo explorador se atraviesa y observa la fauna sin daño y cada primera observación paga 5 monedas. No hay eliminaciones, patadas ni caparazones como proyectiles. Los caparazones de partidas anteriores vuelven a ser tortugas conservando sus observaciones.

Música: tres composiciones originales sintetizadas, inspiradas en polca sudcaliforniana (2/4), corrido fronterizo (3/4) y polca chihuahuense (2/4), compartidas por las etapas según su ambiente. No requieren descargar audio.

Guardado: botón GUARDAR, opción en pausa y guardado automático cada 5 segundos, al pausar y al ocultar la página. CONTINUAR restaura nivel, personaje, posición, enemigos, bloques, monedas, tiempo, vidas y poderes. Una partida por navegador y dispositivo mediante localStorage, también sin conexión. Nueva partida reemplaza el guardado; terminar la aventura o perder todas las vidas lo elimina.

Puntaje único en monedas: cada moneda recogida suma 1; observar por primera vez a cada animal paga 5 monedas. La bandera paga de 1 a 50 monedas según la altura y el tiempo restante da 1 moneda por cada 10 segundos completos. Romper bloques, tomar poderes y tocar animales no genera monedas. Las vidas se muestran con corazones rojos grandes. Los guardados anteriores conservan sus monedas y progreso; los puntos antiguos se descartan.

## Validación de fauna

Ejecuta `node tests/wildlife.cjs` para comprobar contacto, rebotes, sueño y despertar, inmunidad, compras y saldo, pago por observación, migración de caparazones y patrullas de un minuto a 30, 60 y 120 FPS. Son pruebas de lógica con navegador y audio simulados.

## Comprar equipo

Los bloques amarillos muestran el producto y su precio: hongo rojo 5 monedas, equipo explorador 10, parapente 20 y vida extra 15. Golpéalos desde abajo para comprar y equipar al instante. Cada bloque permite una compra y queda agotado. Si ya tienes el hongo rojo activo o un parapente, no se vuelve a cobrar por ese equipo. Si falta saldo, no se cobra ni se consume el bloque; el aviso indica cuánto falta. El saldo y los bloques comprados se guardan de inmediato. Las monedas se muestran como saldo disponible y se descuentan al comprar.

## Ruta nacional

Se incluyen los 31 estados y Ciudad de México. El orden usa colindancias entre entidades, consultadas en el [mapa de división estatal de INEGI](https://cuentame.inegi.org.mx/imprime_tu_mapa/doc/nal-division_estatal_con_nombres-byn.pdf). Es una ruta de juego continua, no un itinerario de carreteras ni una optimización de distancias.

Baja California Sur → Baja California → Sonora → Sinaloa → Nayarit → Durango → Chihuahua → Coahuila → Nuevo León → Tamaulipas → San Luis Potosí → Zacatecas → Aguascalientes → Jalisco → Colima → Michoacán → Guanajuato → Querétaro → Hidalgo → Tlaxcala → Puebla → Estado De México → Ciudad de México → Morelos → Guerrero → Oaxaca → Veracruz → Chiapas → Tabasco → Campeche → Yucatán → Quintana Roo.

Cada etapa varía la altura de las plataformas y la posición de los huecos con saltos alcanzables, además de tener nombre, referencias visuales y un ambiente de costa, desierto, bosque, sierra, campo, ciudad, volcán, selva o humedal. Las longitudes se mantienen entre 3860 y 4220 píxeles y el tiempo se reinicia en cada etapa. La ruta desplegable marca la entidad actual y las anteriores; la aventura termina al completar Quintana Roo.

Los guardados usan una identidad de entidad; la versión 4 conserva también las métricas de la expedición. Una partida antigua en el nivel 3 se restaura en Chihuahua (ahora etapa 7), conservando monedas, posición, objetos y la longitud del mapa anterior.

Ejecuta `node tests/national-route.cjs` para comprobar colindancias de la ruta, los 32 guardados, transiciones, plataformas alcanzables con ambos personajes y la migración de Chihuahua.

## Marcador y resumen final

Al perder todas las vidas o completar el recorrido se guarda un registro local independiente de la partida, con kilómetros de aventura, monedas ganadas, monedas gastadas, saldo final, especies únicas observadas y entidades completadas. Se conservan las últimas 20 expediciones en este navegador y dispositivo, ordenadas por entidades completadas, especies únicas, distancia y monedas ganadas. Empezar otra partida no borra el historial.

La escala de distancia es de 1000 píxeles de avance nuevo = 1 km del juego, no kilómetros reales de carretera. Retroceder, reaparecer, teletransportarse al mástil o cambiar de nivel no añade distancia. La lupa registra cada uno de los tipos de fauna una sola vez por expedición, aunque observar distintos individuos sigue pagando monedas. Comprar equipo reduce el saldo pero conserva el total de monedas ganadas.

El resumen de victoria concede el reconocimiento del juego «Guardianes de México» cuando se han completado las 32 entidades, por explorar respetando la flora y fauna. Las partidas antiguas recuperan las entidades y datos disponibles y se marcan como registros parciales, sin inventar observaciones pasadas. Los datos nuevos se conservan al guardar y continuar.

Ejecuta `node tests/expedition-records.cjs` para comprobar métricas, deduplicación, saldo, persistencia, reinicio, historial, migración y reconocimiento.

### Cuaderno y binoculares

El cuaderno está disponible desde el inicio: tecla **N** o botón CUADERNO. Con los binoculares comprados, acércate en tierra a los letreros FLORA y VISTA para registrar vegetación y paisaje; cada ficha paga 3 monedas una sola vez por estado. La lupa del equipo explorador registra fauna en el mismo cuaderno sin cambiar el conteo de especies únicas. Los nombres de vegetación son categorías del escenario, no un catálogo botánico.

Los binoculares cuestan **12 monedas** en un bloque amarillo antes de los puntos de observación de cada nivel. Se activan automáticamente al pasar a menos de 55 píxeles de FLORA o VISTA sobre el suelo: el personaje los levanta a los ojos durante 0.95 segundos, orientándose hacia el punto y bajándolos al terminar. Se mantiene el movimiento, la cámara habitual y el tiempo. Permanecer junto al punto no repite la activación; alejarse más de 85 píxeles permite observar de nuevo sin repetir la recompensa. La lupa tiene prioridad visual si se observa un animal al mismo tiempo. No es necesario presionar B ni un botón. Solo consultar el cuaderno detiene la acción; VOLVER o Escape reanuda. El equipo y las fichas se conservan entre estados, al perder una vida y al recuperar la partida. Las partidas anteriores siguen siendo compatibles.

Validación adicional: `node tests/field-tools.cjs`.

### Fauna por región

14 tipos de animales y 4–5 tipos distintos por nivel, con 7–10 ejemplares y cantidades diferentes según el ambiente representado. El cuaderno muestra los encuentros previstos. Las frecuencias son una adaptación jugable de hábitats, no un censo estatal. Ver [selección, cantidades y fuentes](FAUNA.md). Pruebas: `node tests/regional-fauna.cjs`.
