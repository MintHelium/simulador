# Reglas comerciales implementadas

Referencia: versión funcional `c15c8c5`. La fuente de importes es [lotes.json](../lotes.json); la ejecución está en [script.js](../script.js). Este documento describe el comportamiento existente, incluida la lógica residual señalada expresamente. Todo cambio comercial requiere aprobación y [validación](VALIDATION.md).

## Contado, precios y ahorro de la cotización

`Contado` es el precio completo en MXN. En contado, el resumen muestra ese importe como enganche y total, mensualidad $0 y ninguna anualidad. El plazo efectivo es 0 y no aplica el mínimo de mensualidad. CDG Etapa 1 sólo ofrece 1,500 m² / Un solo frente, contado $680,000.

En financiamiento se utiliza `Financiamiento[plazo].precio`, sin calcular una tasa de interés ni interpolar precios. Los seis plazos actuales son 6, 12, 18, 25, 35 y 45 meses. El enganche mínimo procede del mismo plan. Las anualidades redistribuyen el pago del precio del plan, no lo descuentan.

El **Ahorro de la cotización** es `max(0, precio del plazo más largo disponible − precio elegido)`. En contado se resta `Contado`; en financiamiento se resta el precio del plazo seleccionado. Si no existe financiamiento, el ahorro mostrado es 0. No depende de la comisión ni de las anualidades.

## Variables y límites de financiamiento

Usamos `P` = precio del plan, `C` = contado, `n` = meses, `Emin` = enganche mínimo, `E` = enganche elegido, `k` = cantidad de anualidades, `A` = monto de cada una y `M` = mensualidad solicitada.

`limitarFinanciamiento` reserva `2000 × n` para pagos mensuales. Define `D = P − 2000 × n` y `Emax = min(C, D)`. Por tanto, además del mínimo, el enganche nunca supera el precio de contado. Si `Emax < Emin`, los datos básicos no son finitos o el plan no permite pagos válidos, devuelve `null`; la UI limpia la cotización y muestra un aviso para elegir otro plazo o contado.

### Desde enganche

Primero limita `E` al intervalo `[Emin, Emax]`. Reserva ese enganche antes de limitar las anualidades: aumentar el enganche puede reducir el monto anual permitido. Después calcula el saldo `P − E − kA` y su plan mensual.

### Desde mensualidad

Para determinar el monto anual máximo reserva primero `Emin`. Una vez limitado `A`, calcula:

```text
E = limitar(P − kA − max(2000, M) × n, Emin, Emax)
```

Finalmente limita `E` a `D − kA` y lo redondea a centavos. El plan mensual se vuelve a calcular con ese resultado. Por límites y redondeo, la mensualidad final puede diferir de la solicitada. Si el input está vacío al elegir el plan, la UI usa `P/n` como solicitud inicial, que conduce al enganche mínimo. Si no es vacío pero es inválido, el lector devuelve 0 y se aplica el mínimo de $2,000.

Cambiar de modo recalcula a partir de los inputs actuales. Debido al redondeo, no debe suponerse que es una inversión algebraica exacta de la cotización anterior.

## Anualidades por elección explícita

Financiamiento comienza con **No**. Al elegir **Sí**, se muestra la cantidad sin ninguna seleccionada. El vendedor elige la cantidad y luego ajusta el monto, que comienza en 0. No se asignan automáticamente los máximos. Mientras falten cantidad o monto, el resumen no incorpora anualidades y se muestra un aviso. Cambiar plazo o selecciones principales reinicia esta elección; pasar a contado borra sus resultados.

| Plazo actual | Máximo de anualidades | Tope comercial por anualidad |
| --- | ---: | ---: |
| 6 | 0 | $0 |
| 12 | 1 | $160,000 |
| 18 | 1 | $160,000 |
| 25 | 2 | $80,000 |
| 35 | 3 | $55,000 |
| 45 | 4 | $40,000 |

Implementación: los umbrales son `n >= 45:4`, `>=35:3`, `>=25:2`, `>=12:1`, y 0 por debajo de 12. No autorizan nuevos plazos. El tope por anualidad se obtiene redondeando al múltiplo de $5,000 más cercano `160000 / máximo de cantidad del plazo`. Depende del máximo del plazo, no de la cantidad elegida. A 35 meses, tres anualidades de $55,000 suman $165,000: el objetivo de $160,000 no es un tope agregado estricto.

Para `k > 0`, con reserva `R = E` en modo enganche o `R = Emin` en modo mensualidad:

```text
Amax = max(0, min(tope comercial, floor((D − R) / k / 1000) × 1000))
A = min(Amax, max(0, round(monto solicitado / 1000) × 1000))
```

Sin cantidad, `Amax = 0`. El monto se maneja en múltiplos de $1,000. El resultado conserva `E + kA <= P − 2000n < P`: no puede consumir todo el precio ni dejar un saldo mensual insuficiente. Si no cabe una anualidad de $1,000, el monto queda en 0 y el aviso indica que no hay saldo disponible. No existen fechas de vencimiento ni calendario de cobros; no inferirlos del término “anualidad”.

## Mensualidades y último pago

`calcularPlanMensualidades(P, E + kA, n)` convierte el saldo a centavos con `Math.round`. Rechaza saldos menores a `200000 × n` centavos, meses no enteros o menores a 1 y resultados no finitos.

1. Si el saldo en centavos es divisible entre `n`, muestra `n` pagos iguales, que pueden incluir centavos. `ultima: 0` es un indicador interno de pagos uniformes, no un pago final de cero.
2. En otro caso redondea el promedio hacia arriba al múltiplo de $50 y calcula `n−1` pagos regulares más el remanente final exacto.
3. Si ese redondeo consume el último pago (`remanente <= 0`), usa el múltiplo de $50 inferior al promedio. Rechaza el plan si aun así el último pago no es positivo.

La mensualidad **regular** debe ser al menos $2,000. El último pago puede ser menor, o mayor que la regular si se usa la protección del múltiplo inferior. La suma de enganche, anualidades y todos los pagos debe coincidir con el precio. No presentar esta regla como “todos los pagos son al menos $2,000”.

## Entrada de importes y separación

`leerImporte` acepta números positivos o cero, con hasta dos decimales, sin separadores o con comas de miles válidas: `125000`, `125,000`, `125,000.25`. Elimina espacios externos. Entradas como `125,00`, `$125,000`, negativos, texto o vacío devuelven 0; después se aplican límites. No admite coma decimal. El resultado se presenta con formato `es-MX`.

La separación de **$5,000** sólo existe en `manejarSeleccionEtapa` cuando una etapa es una cadena de texto de preventa. Ninguna etapa del JSON vigente utiliza esa representación. No es un cargo general, no se suma ni resta en cotizaciones y no debe describirse como una reserva activa para todos los productos.

## Comisión: total, cobrar y fondo de ahorro

En ICN, con `C` y `E` en pesos:

```text
venta = 0.05 × C
componentePlazo = 0.025 × C − (0.025 × C / 45) × n
componenteEnganche = 0.025 × E
comisionReal = venta + componentePlazo + componenteEnganche
T = Math.round(comisionReal × multiplicador)
```

El multiplicador normal es 1. El código residual aplica 0.7 si el hostname contiene `cantera`; está pendiente de limpieza y no representa una variante deseada. En contado, `E = C` y `n = 0`, por lo que la comisión ICN es 10% de contado antes del redondeo. No se calcula sobre el precio financiado ni se suma el total de anualidades al enganche para comisión.

La distribución conserva **Total comisión = Cobrar + Fondo de ahorro**. El total no cambia por transferir entre ambos conceptos. El cálculo normal de `ajustarComision` continúa vigente:

```text
cobrar500 = floor(T / 500) × 500
ahorro500 = T − cobrar500
alternativaCobrar = max(0, floor(T / 1000) × 1000 − 1000)
Si ahorro500 < 300 y alternativaCobrar > 0:
    Cobrar = alternativaCobrar; Ahorro = T − alternativaCobrar
En otro caso:
    Cobrar = cobrar500; Ahorro = ahorro500
```

Después, `aplicarAhorroAdicional` transfiere $1,000 de Cobrar a Ahorro **sólo si `0 < Ahorro < 750` y `Cobrar >= 1000`**. $750 exactos, ahorro 0 y cobrar insuficiente no disparan esta transferencia adicional. El ajuste previo menor a $300 sí puede actuar cuando su remanente es 0: las dos condiciones no deben confundirse.

Ejemplo de la transferencia: $18,000 / $333 pasa a $17,000 / $1,333, total $18,333. Los límites $749 y $750 se prueban directamente en la función adicional; no todas esas distribuciones son alcanzables como resultado del algoritmo normal actual.

## Superficies y excepciones

750 m² / Un solo frente usa importes explícitos por etapa. LF2/LF3/LF4 tienen las matrices de CDG3 para 750 / Un solo frente y 1,500 / Un solo frente y Esquina. CDG2 tiene los mismos precios que CDG3, pero su enganche de 750 a 6 meses es $145,000 frente a $140,000 en CDG3.

Para 1,500 / Un solo frente, en las siete etapas con 750 los precios son dos veces los de 750. **No hay una fórmula uniforme de enganches de 1,500**: se leen del catálogo y presentan diferencias históricas. No ajustarlos automáticamente. CDG1 es un producto independiente sólo contado.

Para **2,250 / Un solo frente**, en CDG2/CDG3/CDG4 y LF1/LF2/LF3/LF4:

```text
Contado2250 = 3 × Contado750
Precio2250[n] = 3 × Precio750[n]
Enganche2250[n] = 3 × Enganche750[n] − 15000
Plazos2250 = Plazos750
```

CDG1 está excluida. La fórmula es una regla de mantenimiento del JSON comprobada por tests; el navegador no genera estos productos ni actualiza sus cifras automáticamente.

Las únicas variantes actuales **Un solo vecino** son LF4 / 1,500 / Un solo vecino y LF4 / 2,250 / LF116 Un solo vecino. Conservan precios y plazos del estándar correspondiente y exigen 25% de contado en todos los plazos: $155,000 y $232,500, respectivamente. Esa excepción sustituye el mínimo estándar.

Los tipos Esquina y lotes identificados por nombre se mantienen explícitos. Los actuales Esquina, LF1 Esquina 1725m2, LF29 Esquina 2250m2 y L151 Triple Frente 2250m2 tienen mínimos constantes equivalentes al 50% de su contado. Es una observación del catálogo vigente, no una fórmula autorizada para crear nuevos especiales. Ubicaciones y particularidades: [DATA_CATALOG.md](DATA_CATALOG.md).

## Ejemplos comprobables del catálogo actual

| Caso | Resultado |
| --- | --- |
| CDG3 / 750 / Un solo frente, contado | $310,000; ahorro de cotización $75,000 frente a 45 meses; comisión total $31,000, Cobrar $30,000 y Ahorro $1,000 por el ajuste normal previo. |
| Mismo producto, 45 meses, enganche $55,000, sin anualidades | Precio $385,000; 44 pagos de $7,350 + último $6,600. Comisión total $16,875; Cobrar $15,500 y Ahorro $1,375 tras la transferencia adicional. |
| Mismo producto, 45 meses, enganche $55,000, cuatro anualidades de $40,000 | 44 pagos de $3,800 + último $2,800; enganche + $160,000 + $170,000 = $385,000. Comisión igual al caso anterior. |
| Mismo producto, 45 meses, sin anualidades, enganche $295,000 | 45 mensualidades exactas de $2,000. Un intento de aportar más se limita. |
| CDG4 / 2,250 / Un solo frente, 18 meses | Precio $952,500 = 3 × $317,500; enganche $255,000 = 3 × $90,000 − $15,000. |
| CDG4 / 2,250 / L151 Triple Frente 2250m2, 18 meses | Mismo precio $952,500, pero enganche especial $442,500. No sustituir por el estándar. |

Las cifras pueden cambiar por decisión comercial. Modificar su fuente en JSON o las funciones indicadas, revisar productos derivados y actualizar expectativas aprobadas en las pruebas antes de publicar.
