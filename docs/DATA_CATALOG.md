# Catálogo de datos

La fuente es [lotes.json](../lotes.json), versión funcional `c15c8c5`. No hay base de datos, inventario en tiempo real ni generador de precios. Las claves son etiquetas visibles y forman parte del contrato entre datos, interfaz y pruebas.

## Estructura

```text
Desarrollo
└── Etapa
    └── Superficie (por ejemplo, "750m2")
        └── Tipo (por ejemplo, "Un solo frente")
            ├── Contado: número en pesos MXN
            └── Financiamiento: objeto opcional
                └── "6" / "12" / "18" / "25" / "35" / "45"
                    ├── precio: precio total del plan en pesos MXN
                    └── enganche: mínimo comercial en pesos MXN
```

Ejemplo real y parcial: `Cañón de Gomas → Etapa 3 → 750m2 → Un solo frente → Financiamiento → "12"` contiene `precio: 322500` y `enganche: 125000`. `Contado` de ese producto es `310000`. Las claves de plazo son cadenas; los importes son números JSON, sin símbolos monetarios ni separadores de miles. No hay campos de tasa, descuento porcentual, cantidad de inventario o calendario.

La ausencia de `Financiamiento` produce un producto sólo contado. No utilizar un precio 0 o un objeto vacío como sustituto. El código también reconoce una etapa cuyo valor completo sea una cadena de texto y muestra un aviso de preventa/separación, pero el catálogo actual sólo contiene etapas estructuradas; ver [reglas](BUSINESS_RULES.md).

## Cobertura vigente

| Desarrollo / etapas | Productos estándar |
| --- | --- |
| Cañón de Gomas / Etapa 1 | Sólo 1500m2 / Un solo frente, contado $680,000 |
| Cañón de Gomas / Etapas 2, 3 y 4 | 750m2, 1500m2 y 2250m2 / Un solo frente; seis plazos |
| Campestre Las Flores / Etapas 1, 2, 3 y 4 | 750m2, 1500m2 y 2250m2 / Un solo frente; seis plazos |

No hay etapas de preventa representadas como texto. Que una etapa tenga catálogo no acredita disponibilidad física actual de sus terrenos.

## Especiales existentes

No confundir una categoría de superficie con una fuente para calcular automáticamente un lote especial. El nombre puede contener otra medida: debe respetarse el registro aprobado.

| Ubicación | Tipo | Particularidad vigente |
| --- | --- | --- |
| CDG3 / 1500m2 | Esquina | Contado $620,000; enganche $310,000 en los seis plazos |
| CDG4 / 1500m2 | Esquina | Contado $590,000; enganche $295,000 en los seis plazos |
| CDG4 / 2250m2 | L151 Triple Frente 2250m2 | Contado $885,000; precios del estándar 2250; mínimo $442,500 en todos los plazos. Exclusivamente bajo 2250, junto a Un solo frente. |
| LF1 / 1500m2 | Esquina | Contado $660,000; enganche $330,000 |
| LF1 / 1500m2 | LF1 Esquina 1725m2 | Superficie especial indicada en el nombre, todavía clasificada bajo 1500. Contado $760,000; enganche $380,000. Precios propios por plazo. No reclasificar por analogía con L151 sin aprobación. |
| LF1 / 2250m2 | LF29 Esquina 2250m2 | Contado $990,000; enganche $495,000; precios del estándar de la etapa |
| LF2/LF3/LF4 / 1500m2 | Esquina | Contado $620,000; enganche $310,000 |
| LF4 / 1500m2 | Un solo vecino | Precios del estándar 1500; mínimo 25% de contado = $155,000 en todos los plazos |
| LF4 / 2250m2 | LF116 Un solo vecino | Precios del estándar 2250; mínimo 25% de contado = $232,500 en todos los plazos |

Estos son productos explícitos, no plantillas para crear automáticamente Esquina, Triple Frente o Un solo vecino en otras etapas. No borrar especiales al regenerar un estándar.

## Procedimiento para modificar el catálogo

1. Obtener importes, plazos, clasificación y excepciones aprobados. Revisar [BUSINESS_RULES.md](BUSINESS_RULES.md) antes de editar.
2. Identificar la ruta exacta. Comparar el producto actual y sus equivalentes; distinguir precios de mínimos de enganche. Guardar el commit base para comparar especiales.
3. Para agregar una etapa, añadirla al desarrollo correspondiente con productos válidos y nombres consistentes. Los selectores la descubrirán mediante `Object.keys`. No inventar una etapa de preventa o una separación activa.
4. Para agregar una superficie, añadir su objeto dentro de la etapa. Para una etapa aplicable con 750 estándar, mantener 2250 estándar con los mismos plazos y `3 × precios750`, y mínimos `3 × enganche750 − 15000`. No agregar 2250 a CDG1.
5. Al cambiar 750, revisar y actualizar explícitamente los derivados autorizados. Los precios de 1500 estándar actualmente son el doble, pero sus enganches no siguen una regla uniforme: deben validarse individualmente. Para LF2/LF3/LF4 conservar la homologación aprobada con CDG3 en 750 estándar y 1500 estándar/Esquina, salvo cambio comercial expreso.
6. Mantener los especiales por separado. Para las dos variantes Un solo vecino, sincronizar precios y plazos con el estándar de su superficie y recalcular el mínimo del 25% cuando cambie contado. No aplicarles la fórmula de enganche 2250 estándar.
7. Ejecutar validaciones, comparar todo el diff y comprobar que no cambiaron productos fuera del alcance. Actualizar pruebas históricas sólo con expectativas autorizadas, no para hacer pasar cualquier dato nuevo.

## Validaciones obligatorias

- JSON parseable, claves únicas y nombres correctos. `JSON.parse` no denuncia por sí solo claves duplicadas: revisar el diff y la estructura.
- Valores monetarios numéricos, finitos y no negativos; plazos válidos. Para cada financiado, `min(Contado, precio − 2000 × plazo) >= enganche mínimo`.
- Siete opciones 2250 estándar, mismas claves de plazo que 750 y ambas fórmulas exactas; ausencia en CDG1.
- Equivalencias de precios y 25% para Un solo vecino.
- L151 exclusivamente bajo CDG4 / 2250, manteniendo todos sus valores y coexistiendo con el estándar.
- Preservación de los demás especiales y del resto de hojas del catálogo no autorizadas a cambiar.
- Ambas suites de [VALIDATION.md](VALIDATION.md), más selección manual de cada ruta afectada en contado y financiamiento.

`lotes.json` está precacheado. Después de un cambio publicado, la versión de caché debe permitir que el usuario reciba el catálogo correcto; seguir [PWA_DEPLOYMENT.md](PWA_DEPLOYMENT.md).
