# Simulador ICN

Simulador informativo de cotizaciones y comisiones para terrenos de Cañón de Gomas y Campestre Las Flores. Permite cotizar contado o financiamiento, ajustar enganche o mensualidad e incorporar anualidades por elección del vendedor. No constituye una oferta contractual.

Aplicación estática: HTML, CSS, JavaScript sin framework, catálogo JSON y PWA con service worker. No tiene backend, base de datos, build ni dependencias de ejecución instaladas con npm. Las fuentes visuales se solicitan a Google Fonts.

## Estado y referencias

- Repositorio canónico: [MintHelium/simulador](https://github.com/MintHelium/simulador).
- Producción: [simulador-profesional-icn.netlify.app](https://simulador-profesional-icn.netlify.app/).
- Esta documentación describe la versión funcional `c15c8c5`, en `codex/anualidades-opt-in-minimo-mensual-lf`, antes de su merge. No afirma que esta versión esté en producción. Ver [estado y flujo de trabajo](PROJECT.md).

## Ejecución local

Desde la raíz del repositorio, con Python 3 instalado:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Abrir [http://127.0.0.1:8766/](http://127.0.0.1:8766/). No abrir `index.html` mediante `file://`: la aplicación carga el catálogo mediante `fetch`. Detener el servidor con Ctrl+C. La caché PWA puede conservar una versión anterior; ver [validación](docs/VALIDATION.md).

## Pruebas

Con Node.js 18 o posterior y un clon con el historial necesario:

```sh
node --test tests/simulador.test.cjs
```

La suite de navegador requiere además Playwright resoluble por Node, Google Chrome instalado y el servidor local:

```sh
SIMULADOR_URL=http://127.0.0.1:8766 node tests/browser.cjs
```

La preparación de Playwright sin modificar el repositorio y las limitaciones de las pruebas están en [VALIDATION.md](docs/VALIDATION.md).

## Estructura y documentación

`index.html` contiene la interfaz; `script.js`, los cálculos y eventos; `lotes.json`, el catálogo; `assets/`, los estilos e imágenes; `manifest.json` y `service-worker-v2.js`, la PWA; `tests/`, las pruebas. Los archivos residuales se describen en la deuda técnica, no son fuentes alternativas del producto.

- [PROJECT.md](PROJECT.md): guía técnica, dependencias y operación.
- [BUSINESS_RULES.md](docs/BUSINESS_RULES.md): fórmulas, límites y excepciones comerciales.
- [DATA_CATALOG.md](docs/DATA_CATALOG.md): estructura y mantenimiento del catálogo.
- [PWA_DEPLOYMENT.md](docs/PWA_DEPLOYMENT.md): caché, publicación y actualización instalada.
- [VALIDATION.md](docs/VALIDATION.md): pruebas y aceptación manual.
- [TECHNICAL_DEBT.md](docs/TECHNICAL_DEBT.md): problemas comprobados pendientes.

Todo cambio de precios, enganches, plazos o fórmulas requiere validación comercial explícita antes de modificarlo. No extrapolar reglas a partir del nombre o superficie de un lote especial.
