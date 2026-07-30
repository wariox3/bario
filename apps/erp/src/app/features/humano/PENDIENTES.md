# Humano — pendientes por revisar

Bitácora de lo que quedó **asumido, decidido o fuera de alcance** al portar el módulo Humano
desde el ERP anterior. Nada de esto se ha ejercitado contra `reddocapi.uk`: todo sale de leer el
código legacy.

Cada supuesto vive además como comentario en su archivo; acá está el índice para revisarlos de una
sentada. Al confirmar uno, **bórralo de esta lista** y quita el `TODO(backend)` del código.

Portado el 2026-07-28. Commits: `b96dd3c` (documento), `75f5d6c` · `7de0379` · `5f4f3b7`
(informes), `ea3b289` (utilidad).

Estado (2026-07-29): portada la **programación de nómina** — el proceso que fabrica los documentos de
nómina. Es la pieza más grande del módulo; sus supuestos y decisiones van en §4, aparte de las de los
documentos e informes.

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

---

## 4. Programación de nómina (proceso)

Portada desde `humano/paginas/documento/programacion/` del ERP anterior
(`/humano/proceso/lista?modelo=HumProgramacion`), 2026-07-29. Vive en
`features/humano/proceso/programacion/` y estrena la sección **Proceso** del sidebar.

Es el motor del módulo: no es un documento, es el proceso que **fabrica** los documentos de nómina
(tipo 14, los que ya estaban portados en solo lectura). Camino B (master propio) más un ciclo de vida
con efectos en cascada.

### 4.1 El ciclo de vida está aislado y testeado

La regla de qué se puede hacer en cada etapa vive **solo** en `programacion.estado.ts`
(`estadoDe` + `capacidadesDe`, 13 capacidades) con 18 tests. Ninguna plantilla combina banderas: cada
botón es `@if (capacidades().puedeX)`.

⚠️ **Los tests garantizan que el código hace lo que dice la tabla de reglas, no que la tabla sea
contablemente correcta.** Esa tabla sale de leer los `[disabled]` del legacy. El caso que más conviene
confirmar: **desgenerar sobre una programación aprobada está bloqueado** (hay que desaprobar primero).
Si en la práctica se necesita, es una línea en `capacidadesDe`.

### 4.2 Por confirmar con backend

#### Endpoints del proceso

| Operación        | Endpoint supuesto                            | Body                                         |
| ---------------- | -------------------------------------------- | -------------------------------------------- |
| Cargar contratos | `POST humano/programacion/cargar-contrato/`  | `{ id }`                                     |
| Generar          | `POST humano/programacion/generar/`          | `{ id }` → `{ total, devengado, deduccion }` |
| Desgenerar       | `POST humano/programacion/desgenerar/`       | `{ id }`                                     |
| Aprobar          | `POST humano/programacion/aprobar/`          | `{ id }`                                     |
| Desaprobar       | `POST humano/programacion/desaprobar/`       | `{ id }`                                     |
| Notificar        | `POST humano/programacion/notificar/`        | `{ id }`                                     |
| PDF programación | `POST humano/programacion/imprimir/`         | `{ id }`                                     |
| PDF nóminas      | `POST humano/programacion/imprimir-nominas/` | `{ id }`                                     |
| Importar horas   | `POST humano/programacion/importar-horas/`   | multipart: `archivo` + `programacion_id`     |
| Renglones        | `GET humano/programacion-detalle/`           | `programacion_id`, `page`, `limit`           |

Los nombres van con **guion**, la convención de endpoints de este ERP, aunque el legacy escriba
`importar_horas` y `programacion_detalle` con guion bajo. Lo que sigue siendo supuesto es que las
acciones existan con esos nombres.

**`notificar` no se sabe si es idempotente**: ¿reenvía el comprobante a quien ya se le notificó? El
diálogo advierte que el envío no se deshace, pero no evita el segundo envío.

#### Los campos de prestación propuesta

El modal de ajuste manda `cesantia_propuesto` (tipo de pago 3) o `interes_propuesto` (tipo 4). **Los
dos nombres salen de un `if (this.pagoTipoId === 3)` del legacy y no se pudieron verificar.** Si el
backend los llama distinto, el ajuste de cesantías se guarda **sin el valor propuesto y probablemente
sin error visible** — es el supuesto más silencioso de esta entrega.

#### El periodo colgado del grupo

`humano/grupo/seleccionar/` tiene que devolver `periodo_id` y **`periodo__dias`** (con doble guion
bajo) en cada fila: de ahí sale el periodo de la cabecera y la duración contra la que se valida el
rango de fechas. Si los nombra distinto, el periodo queda nulo y **la validación de duración
simplemente no aplica** — otro fallo silencioso. Es lo primero a confirmar.

#### Catálogos

`humano/pago-tipo/seleccionar/` y `humano/grupo/seleccionar/` — con guion, aunque el legacy nombre el
primero `pago_tipo`. Ninguno está en `SELECT_ENDPOINTS`: se suman ahí cuando un segundo formulario los
pida.

#### Las tres exportaciones

| Excel               | Endpoint                             | Serializador                   | Filtro                                             |
| ------------------- | ------------------------------------ | ------------------------------ | -------------------------------------------------- |
| Renglones           | `humano/programacion-detalle/excel/` | `informe_programacion_detalle` | `programacion_id`                                  |
| Nóminas             | `general/documento/excel/`           | `informe_nomina`               | `programacion_detalle__programacion_id`            |
| Conceptos de nómina | `general/documento-detalle/excel/`   | `informe_nomina_detalle`       | `documento__programacion_detalle__programacion_id` |

El legacy los pedía por **GET con query params**; acá van con el `POST …excel/` del ERP. Son tres
endpoints distintos, así que hay tres formas de fallar.

#### La plantilla de importar horas

El legacy **no la pedía a un endpoint**: la generaba desde el propio listado de renglones
(`serializador: 'ImportarHoras'` + filtro por programación), o sea una plantilla **con los empleados
ya cargados**. Eso no encaja en el `exampleConfig` del diálogo, que espera una URL. El botón se
muestra deshabilitado con el motivo a la vista. Encenderlo pide decidir si el backend expone un
endpoint o si hay que extender el diálogo de importación.

### 4.3 Decisiones tomadas

| #   | Decisión                                                                           | Por qué                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | El **workspace es su propia página**, no el formulario de edición                  | A diferencia de la conciliación bancaria: una programación generada tiene la cabecera bloqueada y sigue necesitando el banco de trabajo para aprobar y desgenerar     |
| 2   | Las acciones que no aplican **no aparecen**, no se deshabilitan                    | El legacy mostraba las cinco siempre, la mayoría en gris. Con capacidades explícitas ocultarlas es más honesto. **Es un cambio de UX visible**                        |
| 3   | Los diálogos de confirmación **dicen la consecuencia**, no "¿estás seguro?"        | El de generar avisa que después no se podrá editar; el de desgenerar, que se borran documentos. En un proceso así el texto es parte de la protección                  |
| 4   | El validador de periodo se llama `duracionPeriodoExacta`, no "mínimo de días"      | El del legacy se llama `minimumDaysBetweenDates` pero compara por **igualdad** (`=== dias - 1`). Una quincena son 15 días exactos. **Con 20 tests**, incluido febrero |
| 5   | El **caso especial de febrero** se porta tal cual y se testea                      | Un periodo mensual en febrero dura 28/29 y la segunda quincena 13. Estaba enterrado en el validador y era lo más fácil de perder                                      |
| 6   | Las tres fechas arrancan en **el mes completo**, no todas en el día 1              | El legacy sembraba las tres con el primer día, así que el formulario abría en error de duración                                                                       |
| 7   | Una tabla de renglones, **no tres**, con las columnas derivadas del tipo de pago   | Las tres del legacy (~200 líneas de plantilla cada una) comparten identificación, tramo, salario y total. **Con 8 tests**                                             |
| 8   | Un solo modal de ajuste de renglón, con el bloque del medio condicionado           | El legacy tenía dos con el mismo formulario de 28 campos duplicado                                                                                                    |
| 9   | El payload del renglón **manda solo lo que el tipo de pago edita**                 | El legacy mandaba el formulario completo: en una liquidación de cesantías eso pisa con ceros las horas que el backend calculó                                         |
| 10  | Las 17 banderas se declaran **una por una** en el `FormGroup`, con metadata aparte | El spread dinámico perdía el tipado y `getRawValue()` dejaba de satisfacer el tipo. Declaradas, el compilador avisa si falta una. Los defaults salen de un solo lugar |
| 11  | Los adicionales **reusan `AdicionalService`** del master, acotado por filtro       | Es el mismo endpoint. Solo el payload se extiende acá (`programacion` y `horas`), sin ensanchar el contrato del master                                                |
| 12  | "Ver nómina" **navega a la ficha del documento**, no abre un modal                 | El legacy tenía un modal de ~470 líneas que repintaba la nómina, con una edición inline a medio hacer. Reusar la ficha elimina la duplicación entera                  |
| 13  | Los renglones **paginan de verdad** (25 por página)                                | El legacy pedía `limit: 1000`. Aguanta 200 empleados, no 2.000                                                                                                        |
| 14  | El listado **no tiene borrado**, a diferencia del resto de listados del ERP        | Borrar depende del estado (solo borrador) y `<lib-data-table>` no condiciona acciones fila por fila. La acción va en el workspace                                     |
| 15  | El conteo de renglones **sube** de la tabla al workspace (`totalChange`)           | `capacidadesDe` exige renglones para habilitar Generar. La alternativa era una segunda petición solo para contar                                                      |

### 4.4 Lo que no se portó

- **~40% del componente de detalle del legacy** (1.148 líneas): los métodos de editar renglón,
  selección múltiple, resumen de nómina y el formulario de 28 campos ya habían migrado a
  subcomponentes, pero la copia vieja quedó arriba.
- **Las cinco copias** del objeto `programacion` inicializado a mano con sus 30 campos.
- **`TablaContratosService`**, un singleton `providedIn: 'root'` que guardaba la lista, la selección y
  el ordenamiento, y mutaba los objetos en sitio. Con dos programaciones abiertas el estado se cruza.
  Acá el estado del workspace vive en el workspace.
- El **ordenamiento por columna**, que en el legacy cambiaba el valor y no recargaba (estaba
  comentado), y los **filtros en `localStorage`** leídos a mano.
- Dos **etiquetas equivocadas**: el botón "Importar nóminas" llamaba a `imprimirNominas()`, y había un
  `<butto>` sin cerrar en el dropdown de Excel.
