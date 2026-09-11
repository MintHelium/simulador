# Guía técnica y operativa

## Alcance y estado de esta edición

Evidencia inspeccionada el 10 de septiembre de 2026: código, catálogo y pruebas del commit `c15c8c5`, incluidos los cambios previos `02f2c83`, `6be0e0d`, `68822e0` y `3c86369`. La branch de trabajo es `codex/anualidades-opt-in-minimo-mensual-lf`. Esta edición sólo añade documentación.

La versión funcional pasó aceptación manual comunicada por el responsable; los ajustes posteriores de L151 e iconos tienen pruebas automatizadas. La actualización del icono de una PWA instalada en un iPhone sigue pendiente de verificación física tras una publicación autorizada.

Repositorio: [MintHelium/simulador](https://github.com/MintHelium/simulador). La consulta de `refs/heads/main` a GitHub durante esta documentación devolvió `4262e23b85e1071936cb913cb6d92979c1ece3d9`. Ésa es también la última base de producción confirmada por el responsable. No se ha publicado la branch. Tras su aprobación y merge, `main` será la fuente de verdad del código integrado; el deploy de Netlify debe comprobarse por separado, pues un merge no demuestra que producción haya actualizado correctamente.

## Arquitectura actual

Aplicación estática ejecutada íntegramente en el navegador. No existe API propia, autenticación, persistencia de cotizaciones ni integración CRM. Respond.io es el CRM actual del negocio, pero no requiere integración. HubSpot y captura de leads están fuera del producto. Cantera no es una variante a desarrollar: sus residuos se registran para limpieza futura.

| Archivo/componente | Responsabilidad y dependencias |
| --- | --- |
| `index.html` | Selectores, inputs, resultados, comisión oculta, manifest, iconos y registro del worker. Sus IDs son utilizados directamente por `script.js`. Incluye una condición residual por hostname para Cantera. |
| `script.js` | Carga JSON; llena y reinicia selectores; valida importes; limita financiamiento; calcula pagos, ahorro y comisión; renderiza y conecta eventos. Mezcla lógica pura y DOM en un único archivo. |
| `lotes.json` | Precios y mínimos explícitos. Sus claves se presentan como opciones visibles. No se deriva el catálogo en tiempo de ejecución. |
| `assets/css/styles.css` | Apariencia, tamaños y colores. `--crema: #fdf7ea`; `--verde-icn: #2c5244`. Importa DM Serif Display y Poppins desde Google Fonts. |
| `assets/image/` | Logo de cabecera, favicons e iconos instalables opacos de 180/192/512 px. |
| `manifest.json` | Identidad ICN, inicio `./index.html`, modo standalone, orientación portrait, colores arena y referencias PNG. |
| `manifest-cantera.json` | Manifest residual todavía referenciado por código y precaché; no representa alcance comercial deseado. |
| `service-worker-v2.js` | Precaché, activación y lectura cache-first. El nombre del archivo no expresa la versión de caché; actualmente es `simulador-icn-v5`. |
| `tests/simulador.test.cjs` | Pruebas con `node:test`, VM y DOM simulado; lee catálogo e historial Git para comprobar invariantes y preservación. |
| `tests/browser.cjs` | Prueba de integración con Playwright/Chrome, DOM real, carga de PNG y catálogo servido por HTTP. |

Secuencia principal: `index.html` carga CSS y `script.js` con `defer`; `DOMContentLoaded` inicia `fetch('./lotes.json')` y registra eventos. Desarrollo → etapa → superficie → tipo → pago → plazo determina el producto. Los cálculos alimentan resultados y comisiones. En paralelo, el worker puede servir HTML, JS, JSON y assets desde caché: un archivo correcto en disco no garantiza que una sesión instalada lo esté usando.

## Estado y eventos

`lotesData` y `modoCalculo` son variables globales del script. La cotización vive en los inputs y selectores; no se guarda al cerrar la página. Cambiar una selección principal limpia los niveles posteriores, importes, resultados, comisiones y anualidades. Cambiar plazo también reinicia las anualidades a No. El modo elegido se mantiene hasta cambiar el radio o recargar; no se reinicia automáticamente a enganche con cada producto.

Los inputs recalculan al perder foco. Botones y flechas controladas recalculan con pasos de $5,000 para enganche, $500 para mensualidad y $1,000 para botones de anualidad. El selector de cantidad no aplica un calendario de vencimientos: sólo determina una cantidad agregada. Tres clics consecutivos en el logo, sin dejar transcurrir el temporizador de 500 ms entre ellos, alternan la visibilidad de comisiones. Esto no es control de acceso: el código y los resultados existen en el cliente.

## Flujo de trabajo

Especificación → branch → implementación → tests → acceptance test → documentación → PR/revisión → main → Netlify → smoke test.

No editar directamente `main` como flujo normal. Al iniciar, verificar repositorio, branch, commit y working tree. Para este trabajo se conserva la branch existente; futuros cambios independientes deben partir del estado aprobado y utilizar su propia branch. Preservar cambios ajenos. Push, PR, merge y publicación son pasos separados que requieren la autorización correspondiente; esta fase no los ejecuta.

Antes de tocar fórmulas o datos, leer [reglas comerciales](docs/BUSINESS_RULES.md) y [catálogo](docs/DATA_CATALOG.md), inspeccionar los valores reales y obtener aprobación de cualquier cambio comercial. Actualizar pruebas con resultados esperados autorizados, sin relajar comparaciones para ocultar diferencias.

### Checklist de mantenimiento

- Identificar el problema, el comportamiento esperado y los productos afectados.
- Revisar si el cambio altera precios, mínimos, límites, comisiones o excepciones.
- Comprobar las dependencias entre IDs HTML, eventos JS, claves JSON, referencias de assets y precaché.
- Implementar un cambio acotado; ejecutar ambas suites y los casos manuales afectados.
- Revisar pagos y totales, consola, resets y comportamiento con caché.
- Actualizar estos documentos si cambian reglas, estructura, operación o limitaciones.
- Revisar diff, sólo incluir archivos pertinentes y registrar el commit probado.
- Tras autorización de publicación, seguir [PWA_DEPLOYMENT.md](docs/PWA_DEPLOYMENT.md).

### No inferir automáticamente

No deducir descuentos de 1,500 m², precios especiales, plazos nuevos, vencimientos de anualidades, inventario disponible o condiciones de separación a partir de nombres. No convertir el ahorro comercial en ahorro de comisión. No considerar el ZIP una versión vigente. No asumir que hay CI, que Netlify publicó `HEAD`, ni que el icono instalado se renovó porque la URL del PNG cambió de contenido.

## Matices y discrepancias que deben preservarse visibles

La regla adicional de ahorro menor a $750 coexiste con un ajuste previo menor a $300; no lo sustituye. La separación de $5,000 está en una ruta de código inactiva para el catálogo actual. El mínimo se aplica al pago regular, no necesariamente al último pago. El manifest usa arena, pero el meta `theme-color` HTML sigue verde. No hay `netlify.toml` que demuestre la configuración del panel, ni workflow CI versionado. Estos puntos están detallados en las guías correspondientes; no se corrigieron en la tarea documental.
