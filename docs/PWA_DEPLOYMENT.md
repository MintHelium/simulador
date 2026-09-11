# PWA y publicación

## Estado y configuración

Esta edición documenta la branch `codex/anualidades-opt-in-minimo-mensual-lf` con aplicación en `c15c8c5`, antes de push, PR, merge y deploy. La última producción confirmada por el responsable corresponde a `4262e23b85e1071936cb913cb6d92979c1ece3d9`; GitHub `main` fue consultado durante esta edición y sigue en ese SHA. No se certificó nuevamente el SHA del deploy desde el panel de Netlify.

| Ajuste | Configuración indicada por el responsable |
| --- | --- |
| Sitio | `https://simulador-profesional-icn.netlify.app/` |
| Repositorio conectado | `MintHelium/simulador` |
| Rama de producción | `main` |
| Base | `/` |
| Publish directory | `./` |
| Build command | Ninguno |

El repositorio confirma una aplicación estática sin build, pero no contiene `netlify.toml`, configuración de CI ni evidencia exportada del panel. Por tanto, conexión, rama y directorios son datos operativos aportados, pendientes de cotejar en Netlify antes del primer deploy de esta versión. No suponer que el push de una branch es inocuo: comprobar si el sitio tiene branch deploys o previews automáticos antes de autorizarlo.

## Manifest, colores e iconos

`index.html` enlaza `manifest.json`, cuyo inicio es `./index.html`, display `standalone` y orientación `portrait`. No declara `scope` explícito; el sitio está diseñado para la raíz. El HTML registra `./service-worker-v2.js`, también desde la raíz.

El manifest tiene `background_color` y `theme_color` en `#fdf7ea`, el `--crema` del CSS. El meta `theme-color` de **HTML sigue en `#2c5244`**: no afirmar que todo el chrome del navegador quedó arena. El icono Home Screen tiene el color incorporado en sus píxeles y no depende de esos campos.

Los PNG de `assets/image/icons/icon-180.png`, `icon-192.png` e `icon-512.png` miden 180×180, 192×192 y 512×512; son RGB opacos con arena sólido y el símbolo ICN verde centrado. El HTML usa el de 180 en `apple-touch-icon`; los tres están declarados en el manifest y precaché. La transparencia anterior era la causa probable del fondo negro; el antiguo archivo llamado 512 tenía 405×405. Los favicons, logo de cabecera e icono residual de la raíz son recursos distintos.

Cantera aún puede seleccionar otro manifest y título por hostname; esa ruta y su precaché son deuda pendiente, no una segunda publicación solicitada.

## Service worker actual

Nombre de caché: **`simulador-icn-v5`**. Base anterior: `simulador-icn-v4` en `4262e23`.

- `install`: abre la caché y ejecuta `cache.addAll` con raíz, HTML, JS, JSON, ambos manifests, CSS, iconos, favicons y logo. Si alguno falla, la instalación puede fallar. Después invoca `skipWaiting()`.
- `activate`: borra **todas** las cachés del origen cuyo nombre no sea el actual. La limpieza está en `waitUntil`; `clients.claim()` se invoca fuera de esa promesa.
- Mensaje `SKIP_WAITING`: solicita activación inmediata. El HTML lo envía si encuentra un worker esperando.
- `fetch`: busca primero en `caches.match(event.request)`; si no existe respuesta, solicita la red. Las respuestas de red no se añaden dinámicamente a caché.
- Si falla esa cadena, devuelve `./index.html` de caché para cualquier tipo de petición, incluso JSON, imágenes o fuentes. No hay filtro de navegación.

No se han resuelto los riesgos de fallback indiscriminado, limpieza amplia, instalación todo-o-nada, fuentes externas o coordinación de pestañas. Ver [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

### Cuándo incrementar la versión

Si cambia un recurso precacheado después de publicar una versión, incrementar `CACHE_NAME` en el worker dentro del mismo cambio. Cambiar sólo un PNG/JSON manteniendo idéntico el worker puede dejar a usuarios instalados con su caché anterior. La versión de caché y el contenido servido deben revisarse juntos.

Los cambios de esta branch pertenecen a una única entrega aún no publicada: v5 ya difiere de v4 y permite precachear el conjunto nuevo. Se verificó localmente que la activación v5 elimina v4 y que los tres iconos y el manifest almacenados coinciden byte por byte con los nuevos archivos. Esa comprobación fue puntual y no forma parte de las dos suites versionadas. No certifica un ciclo completo de actualización de iOS ni evita los demás riesgos del worker.

Los documentos Markdown no están precacheados; añadir sólo documentación no exige incrementar la caché. Si ya se probó una v5 local con assets anteriores, usar un perfil limpio o eliminar el worker/caché **del origen local** antes de una prueba limpia. Para evaluar una actualización instalada, conservar primero el estado viejo: borrarlo invalidaría la prueba.

## Procedimiento seguro de publicación futura

1. Confirmar autorización explícita para push, PR, merge y producción según la fase. Esta documentación no autoriza ninguno.
2. Verificar repo, branch, working tree y SHA candidato. Ejecutar ambas suites, aceptación manual y revisión comercial del diff.
3. Revisar la configuración real de Netlify de la tabla, incluidos previews y despliegues de branches; comprobar la versión de caché contra la que efectivamente está publicada.
4. Crear/revisar PR tras autorización. No modificar `main` directamente. Si se usa squash o rebase, registrar el **SHA resultante en main**, no asumir que coincide con el commit local de trabajo.
5. Tras el merge autorizado, observar el deploy de producción en Netlify. Registrar su identificador, fecha, estado, rama y SHA. Sin build command, comprobar que el directorio publicado contiene el HTML y assets en la raíz.
6. Comparar el SHA de Netlify con el `main` autorizado mediante `git rev-parse origin/main` después de actualizar referencias. No confiar sólo en la apariencia del sitio.
7. En un perfil limpio, comprobar respuestas públicas de `script.js`, `lotes.json`, `manifest.json`, worker e iconos frente a los archivos del commit publicado, mediante hashes o bytes. Una pestaña controlada por un worker viejo no sirve para certificar el contenido de red.
8. Ejecutar smoke test y actualización de instalación previa. Si falla, detener la entrega y acordar recuperación. No revertir ni republicar automáticamente sin evaluar también el worker instalado; volver a un deploy anterior no garantiza revertir su caché.

## Smoke test de producción

Comprobar carga sin errores, CDG1 contado, CDG3 750 a 45 meses, anualidades No/Sí, mínimo $2,000, resets, comisión y un estándar 2250. Comprobar L151 en CDG4 / 2250, las dos variantes Un solo vecino, PNG/manifest y worker activo. Registrar dispositivo, navegador, URL, SHA desplegado y resultados. Checklist extendido: [VALIDATION.md](VALIDATION.md).

### PWA previamente instalada

Antes de publicar, conservar al menos una instalación real de la versión anterior en iPhone. Registrar iOS, icono visible, cotización y, si es posible, worker/caché mediante inspección remota. Después de publicar:

1. Abrir la misma PWA con conexión, dejar que revise actualizaciones y cerrar/reabrir; comprobar que carga el catálogo y la lógica nuevos.
2. Verificar activación v5 y eliminación v4 cuando haya herramientas de inspección disponibles. Probar con una pestaña antigua también abierta para detectar mezcla de versiones.
3. Abrir de nuevo sin conexión y comprobar interfaz, catálogo, cálculo e iconos. Distinguir fuentes externas sustituidas de un fallo del simulador.
4. Revisar el icono Home Screen existente y una instalación nueva: fondo arena, logo centrado y sin negro por transparencia. No borrar/reinstalar antes de registrar el resultado de la actualización existente.
5. Si el icono anterior persiste, registrarlo como fallo o limitación de actualización del sistema y evaluar la recuperación con el responsable. Una reinstalación puede ser una prueba adicional, pero no demuestra que la actualización previa haya funcionado.

Esta verificación física de iPhone está pendiente; no presentarla como completada por una prueba en Chrome.
