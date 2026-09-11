# Validación y aceptación

Las pruebas se ejecutan desde la raíz del repositorio. No existe `npm test`, `package.json` activo, lockfile ni workflow CI versionado. No usar el `package.json` guardado dentro de `simulador.zip`.

## Preparación y comandos

Se recomienda Node.js 18 o posterior, Python 3 y Google Chrome instalado. Se necesita un clon con los commits históricos `4262e23`, `6be0e0d` y `68822e0`, porque las pruebas leen su catálogo con `git show`. Un ZIP o clon superficial que no los incluya no es suficiente. Recuperar historial desde el remoto canónico si falta; no eliminar esas comprobaciones para hacer pasar la suite.

```sh
node --test tests/simulador.test.cjs
node --check script.js
git diff --check
```

En otra terminal:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Con Playwright ya resoluble por Node:

```sh
SIMULADOR_URL=http://127.0.0.1:8766 node tests/browser.cjs
```

Si no hay Playwright instalado, una preparación opcional fuera del repositorio para un entorno tipo Unix es:

```sh
test_runtime=$(mktemp -d)
npm install --prefix "$test_runtime" --no-save --package-lock=false playwright
NODE_PATH="$test_runtime/node_modules" SIMULADOR_URL=http://127.0.0.1:8766 node tests/browser.cjs
```

La instalación descarga una dependencia de pruebas y requiere red. Registrar la versión utilizada con `npm list --prefix "$test_runtime" playwright`. No es una dependencia de producción ni un build. La suite solicita `channel: 'chrome'`: se requiere Google Chrome, no basta con instalar el Chromium de Playwright. Si el entorno ya proporciona Playwright, usar su ruta mediante `NODE_PATH`; no copiar rutas privadas de otra máquina.

El puerto por defecto de la suite es 8765; aquí se usa 8766 explícitamente para coincidir con la aceptación local. No apuntar esta suite a producción: modifica temporalmente un plan en memoria para probar el aviso de plan imposible. No escribe el JSON en disco. Produce una captura temporal en `/tmp/simulador-revision.png`.

## Cobertura automatizada vigente

`tests/simulador.test.cjs` contiene **11 pruebas** y comprueba **6,528 combinaciones** con el catálogo actual. Ese número cambiará si cambia el catálogo o la matriz de casos. Incluye todos los planes financiados, todas las cantidades permitidas (incluido cero), ambos modos y entradas 0, 1999, 2000, 2000.01, 125000 y 1e9, con monto anual solicitado muy alto para comprobar límites.

Comprueba conservación del total, mínimo regular, último pago no negativo, número de pagos, mínimos/máximos de enganche, redondeo en centavos y planes imposibles. Comprueba lector de importes, comisión, resets con DOM simulado y errores HTTP/JSON. Compara el catálogo contra cambios autorizados, fórmulas y mínimos explícitos de las siete opciones 2250, CDG1 excluida, especiales preservados, L151 exclusivamente en 2250 y las dos excepciones del 25%.

`tests/browser.cjs` es una prueba de integración completa con Chrome real y perfiles temporales. Verifica:

- PNG decodificables de 180/192/512, dimensiones declaradas, alfa opaco en todos los píxeles y color arena exacto en las esquinas; colores de manifest iguales al CSS y referencia Apple correcta.
- Los seis plazos de CDG3 750, opt-in sin cantidad/monto predeterminados, cantidades múltiples y límites con enganches o anualidades altos.
- Cambio a contado, resets, CDG1 sólo contado, modo de cálculo, importes con/sin comas y flechas de importes al mínimo.
- Contado y los seis planes de cada uno de los siete estándares 2250, según el catálogo local; ausencia de esa opción en CDG1.
- Mensaje de plan imposible mediante datos sintéticos en memoria, y error visible ante HTTP 500 del catálogo en otro contexto.
- Ausencia de errores inesperados de consola/JavaScript en el recorrido normal. La comprobación de error HTTP es un caso negativo separado; no exige consola vacía.

Los checks del manifest no verifican el meta `theme-color` del HTML. La suite no instala una PWA en iOS, no certifica accesibilidad, no prueba exhaustivamente la interacción de todas las rutas especiales en DOM y no reproduce automáticamente todo el ciclo de actualización v4→v5. Las pruebas puras usan un DOM simulado, no validan por sí solas el comportamiento real de los selectores. Estos límites requieren aceptación manual.

## Acceptance test manual

Registrar commit, URL, navegador/dispositivo, modo de cálculo y resultado esperado/observado. Separar una prueba limpia de una prueba de actualización: para la limpia usar perfil nuevo o limpiar sólo el origen local; para actualización conservar su caché anterior.

| Caso | Comprobación esperada |
| --- | --- |
| Contado | CDG1 / 1500 / Un solo frente: $680,000, mensualidad 0, sin anualidades; alternar modo antes de seleccionar pago no genera error. |
| Seis plazos | CDG3 / 750 / Un solo frente en 6/12/18/25/35/45; precios y mínimos del JSON, plan inicial sin anualidades. |
| Anualidades | No → Sí muestra cantidad vacía y monto 0. Elegir cantidad y monto; a 6 meses no se permiten. Probar 1/2/3/4 donde corresponda y desactivar. |
| Mínimo exacto | CDG3 / 750 / 45 sin anualidades, enganche $295,000: 45 pagos de $2,000. |
| Intento bajo mínimo | Mismo producto, modo mensualidad, solicitar $1,999; resultado al menos $2,000 y total coherente. Probar botones y flechas. |
| Enganche y anualidades altos | Solicitar valores superiores al precio y al saldo disponible; los controles se limitan y no consumen todo el precio. |
| Último pago | CDG3 / 750 / 45, $55,000 de enganche: sin anualidades, 44×$7,350 + $6,600; con 4×$40,000, 44×$3,800 + $2,800. Sumar todo al precio $385,000. |
| Importes | `125000` y `125,000` producen lo mismo. Probar decimales válidos e inválidos; documentar que formatos inválidos pasan a 0 antes del límite. |
| Cambios/reset | Cambiar desarrollo, etapa, superficie, tipo, pago y plazo; no sobreviven comisiones o anualidades de la cotización anterior. El modo de cálculo puede permanecer seleccionado. |
| Comisión | Revelar con tres clics en el logo. Verificar fórmula completa y separación entre ahorro comercial y fondo de ahorro, según BUSINESS_RULES. |
| 2250 | Las siete etapas ofrecen Un solo frente; precios triples y mínimos aprobados; CDG1 excluida. |
| Un solo vecino | LF4 1500: mínimo $155,000; LF116 en 2250: $232,500, ambos constantes por plazo y precios del estándar. |
| Especiales | L151 sólo en CDG4 / 2250 junto a Un solo frente; mínimo $442,500. Revisar LF29, LF1 Esquina 1725m2 y tipos Esquina sin sustituir sus valores. |
| PWA/iconos | Referencias sin 404, arena #fdf7ea, símbolo centrado, dimensiones correctas; revisar instalación real aparte. |
| Consola/carga | Sin excepciones inesperadas; simular fallo del catálogo en un contexto controlado y comprobar mensaje útil. |

### Umbral de comisión $749/$750

No buscar necesariamente una cotización que produzca esos remanentes en la UI: el cálculo normal no genera todas las distribuciones. Las pruebas automatizadas llaman `aplicarAhorroAdicional` directamente. En consola **local**, se puede verificar:

```js
aplicarAhorroAdicional({ cobrar: 18000, ahorro: 749, total: 18749 });
// { cobrar: 17000, ahorro: 1749, total: 18749 }
aplicarAhorroAdicional({ cobrar: 18000, ahorro: 750, total: 18750 });
// { cobrar: 18000, ahorro: 750, total: 18750 }
```

También comprobar ahorro 0, 1 y 333, y cobrar 999/1000. Mantener el ajuste previo de $300 documentado: estas llamadas prueban únicamente la transferencia adicional.

## Cierre y smoke test

Antes del commit, revisar `git diff --check`, archivos modificados y resultados de ambas suites. Para una tarea sólo documental, comprobar que `git diff --name-only <commit-base>` contenga únicamente Markdown y que JS, JSON, HTML, CSS, PNG y tests no cambiaron. Guardar el commit y el resultado en la entrega; no afirmar que la suite prueba más de lo que realmente cubre.

Tras un deploy autorizado, seguir [PWA_DEPLOYMENT.md](PWA_DEPLOYMENT.md): verificar SHA real, carga limpia, un caso contado, uno financiado, anualidades, mínimo, comisión, 2250, especiales y consola. Realizar aparte la actualización de una instalación previa en iPhone con y sin conexión. Una prueba pasada antes del deploy no sustituye ese smoke test.

## Resultado de esta edición documental

Sobre la aplicación `c15c8c5`, sin cambios en código, catálogo, assets ni tests: 11/11 pruebas aprobadas, 6,528 combinaciones verificadas y suite de Chrome aprobada sin errores inesperados en el recorrido normal. Se comprobaron además sintaxis JavaScript, dimensiones/formato RGB de PNG, referencias del manifest, ejemplos numéricos de la documentación y sus 25 enlaces locales. Los siete documentos son los únicos archivos añadidos. No se ejecutó publicación, smoke test de producción ni instalación/actualización física en iPhone.
