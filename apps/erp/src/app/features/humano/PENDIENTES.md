# Humano — pendientes por revisar

Bitácora de lo que quedó **asumido, decidido o fuera de alcance** al portar el módulo Humano
desde el ERP anterior. Nada de esto se ha ejercitado contra `reddocapi.uk`: todo sale de leer el
código legacy.

Cada supuesto vive además como comentario en su archivo; acá está el índice para revisarlos de una
sentada. Al confirmar uno, **bórralo de esta lista** y quita el `TODO(backend)` del código.

Portado el 2026-07-28. Commits: `b96dd3c` (documento), `75f5d6c` · `7de0379` · `5f4f3b7`
(informes), `ea3b289` (utilidad).

---

## 1. Por confirmar con backend

### 1.1 Serializadores

Los informes piden un serializador por nombre. En el legacy viajaban como **query param de un GET**;
acá van en el **body del POST** a `lista/`, que es la convención nueva. Hay que confirmar que el
backend los acepte ahí.

| Dónde                         | Listado  | Excel                        |
| ----------------------------- | -------- | ---------------------------- |
| `informes/nomina`             | `nomina` | `informe_nomina`             |
| `informes/nomina-detalle`     | `nomina` | `informe_nomina_detalle`     |
| `informes/nomina-electronica` | `nomina` | `informe_nomina_electronica` |

Nótese que **el serializador del listado y el del Excel son distintos** en los tres. Si el backend
unificó, se simplifica.

### 1.2 Nombres de campo del empleado

Los tres informes y el documento leen el empleado como **`tercero_numero_identificacion`** y
**`contacto_nombre`**, la convención de `DocumentoListRowBase` que ya usan los demás listados del
ERP. El legacy los tipaba como `contacto__numero_identificacion` / `contacto__nombre_corto`.

Elegí la convención nuestra para no cargar dos en el mismo repo, **pero no está verificado**. Si el
API responde con los nombres del legacy, el fix es local a `*.model.ts` + `*.constants.ts` de cada
informe.

Ojo: los **filtros** sí usan el lookup de Django (`contacto__numero_identificacion`) a propósito —
el filtro viaja al ORM, la columna viene del serializador. Eso no cambia.

### 1.3 Campos de la familia humano en el documento de nómina

En `documentos/nomina/nomina.model.ts`, tomados del legacy sin verificar:

- **Cabecera**: `salario`, `base_prestacion`, `base_cotizacion`, `contrato_id`,
  `programacion_detalle_id`, `cue`.
- **Línea** (`NominaDetalleRead`): `concepto_id`, `concepto_nombre`, `credito_id`, `porcentaje`,
  `dias`, `hora`, `operacion`, `devengado`, `deduccion`, `base_prestacion`, `base_cotizacion`,
  `base_impuesto`.

### 1.4 Fechas del periodo — inconsistencia real

El mismo dato viaja con **dos nombres distintos según el serializador**:

- Ficha del documento → `fecha_desde` / `fecha_hasta`.
- Informes con serializador `nomina` → **`fecha`** (es el inicio del periodo) / `fecha_hasta`.

Por eso `informes/nomina` rotula su columna `fecha` como "Desde". Aparece igual en
`informes/nomina-electronica`, así que parece del serializador y no un desliz puntual — **confirmar**,
porque si se corrige del lado del backend hay que tocar las dos columnas.

### 1.5 Endpoints de la utilidad electrónica

`utilidades/enviar-nomina-electronica`:

- `POST /general/documento/emitir/` → body `{ documento_id }`
- `POST /general/documento/electronico_descartar/` → body `{ id }`

**Los nombres del parámetro no coinciden** entre los dos endpoints. No es error de transcripción:
las tres utilidades electrónicas del ERP (venta, compra, humano) lo replican igual. Vale la pena
preguntar si se puede unificar.

También asumido: las banderas `estado_electronico`, `estado_electronico_enviado`,
`estado_electronico_notificado` y `estado_electronico_descartado` viajan en la fila del listado.

### 1.6 Clases de documento

Los informes filtran por **clase**, no por tipo:

- `701` = nómina · `702` = nómina electrónica

Confirmado indirectamente (el legacy los usa como `documento_clase_id`), pero conviene validar que
sigan vigentes y que no haya otros tipos colgando de esas clases que cambien lo que muestra el
informe.

> No confundir con el `documento_tipo_id`: nómina es **14**, nómina electrónica **15**. El
> `modelo=701` que aparece en las URLs del legacy es otra cosa más — una clave interna de su mapa de
> imports.

---

## 2. Decisiones tomadas (divergencias del legacy)

Todas deliberadas. Están acá por si alguna hay que revertir.

| #   | Decisión                                                                                           | Por qué                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | La nómina expone **aprobar y desaprobar**; el legacy solo desaprobar                               | Si no, desaprobar es un camino sin retorno. Ambas bloqueadas si el documento está anulado                                               |
| 2   | El documento de nómina es **solo lectura** (sin crear/editar/eliminar, sin rutas `nuevo`/`editar`) | La nómina la emite el proceso de liquidación                                                                                            |
| 3   | En `informes/nomina-detalle` los filtros `numero` y `fecha` ahora llevan prefijo `documento__`     | Sin él apuntaban a campos inexistentes en la línea: **los dos filtros estaban muertos**                                                 |
| 4   | `informes/nomina-electronica` expone los tres estados como filtros                                 | El original no los listaba, pero su mapeo los declaraba filtrables. Es la pregunta natural del informe: "¿cuáles faltan por emitir?"    |
| 5   | La columna `operacion` se traduce a Suma/Resta/Neutro en vez de pintar `1`/`-1`/`0`                | Legibilidad. Ojo: las claves i18n de un `enum` son el **valor crudo**, por eso el diccionario lleva `'1'`, `'0'`, `'-1'` entre comillas |
| 6   | La utilidad **no** pinta el badge "Descartado"                                                     | Su propio filtro permanente excluye los descartados, así que esa rama del legacy era inalcanzable                                       |
| 7   | Se omite la columna del FK crudo del contacto en los informes                                      | Redundante con la identificación y el nombre que van al lado                                                                            |

---

## 3. Fuera de alcance

### 3.1 Aporte / PILA

Analizado y **descartado por decisión de producto** (2026-07-27) por su complejidad. No es
`general/documento` sino un árbol propio (`humano/aporte`, `aporte_contrato`, `aporte_detalle`,
`aporte_entidad`) con ciclo cargar contratos → generar → aprobar, 3 tabs y un grid PILA de ~45
columnas. Iría por camino B.

### 3.2 Otros documentos de la familia

**Seguridad social** (legacy `modelo=703`, tipo **22**) no está portada. Si llega, va por camino A
igual que nómina, y conviene mover `documentos/nomina/components/nomina-conceptos-table/` a
`documentos/_shared/` para compartirla — como se hizo con la familia de movimientos de inventario.

### 3.3 Contrato

`masters/contrato/pages/contrato-form/` tiene oculta la sección **"Terminación y pagos"**, pendiente
de definición funcional.
