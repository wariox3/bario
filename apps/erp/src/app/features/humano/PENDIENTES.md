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

Estado (2026-07-30): portado el **aporte a seguridad social** — la planilla PILA del periodo. Segundo
proceso del módulo; sus supuestos van en §5. Con él, `estadoDe` pasó a `proceso/shared/`, compartido
por los dos procesos.

Estado (2026-07-30): portada la **liquidación** — el cierre de un contrato terminado. Tercero y último
proceso; sus supuestos van en §6. Obligó a portar también la **terminación del contrato**, que es lo
que crea la liquidación, y con eso se cierra el antiguo §3.2.

Estado (2026-07-31): portada la **nómina electrónica** como documento (§7). Estaba en el módulo solo
como informe y como utilidad de envío, no como el documento que es; el §3.1 daba a entender que la
familia estaba completa y no lo estaba. Sumó `anular` y `emitir` al gateway compartido de documentos.

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

### 3.1 Otros documentos de la familia

La familia son tres clases: `701` nómina, `702` nómina electrónica y `703` seguridad social. Las dos
primeras están portadas (§7 la segunda).

**Seguridad social** (legacy `modelo=703`, tipo **22**) no lo está. Si llega, va por camino A igual
que las otras dos, y conviene mover `documentos/nomina/components/nomina-conceptos-table/` a
`documentos/_shared/` para compartirla — como se hizo con la familia de movimientos de inventario.

### 3.2 Contrato

`masters/contrato/pages/contrato-form/` sigue con la sección **"Terminación y pagos"** oculta
(`showTerminacion = false`), y así se queda: **el formulario nunca fue el lugar**. Terminar un
contrato no es editar un campo, es un evento con consecuencia —crea la liquidación—, así que vive en
la ficha con sus dos modales, igual que en el ERP anterior. Ver §6.1.

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

---

## 5. Aporte a seguridad social (proceso)

Portado desde `humano/paginas/documento/aporte/` del ERP anterior
(`/humano/proceso/detalle/:id?modelo=HumAporte`), 2026-07-30. Vive en
`features/humano/proceso/aporte/` y es la segunda entrada de la sección **Proceso**.

> Reemplaza al antiguo §3.1, que lo daba por fuera de alcance.

Es la **planilla PILA** de un periodo: quién entra, cuánto se le liquida a cada uno y cuánto se le
paga a cada entidad. El entregable no es una pantalla sino el **plano del operador**. Camino B
(master propio) con un árbol de tres niveles:

| Nivel     | Endpoint                   | Qué es                                        |
| --------- | -------------------------- | --------------------------------------------- |
| Cabecera  | `/humano/aporte/`          | Alcance, entidades y los diez acumulados      |
| Contratos | `/humano/aporte-contrato/` | Quién entra, con su tramo del periodo         |
| Líneas    | `/humano/aporte-detalle/`  | Lo liquidado: novedades, días, bases, tarifas |
| Entidades | `/humano/aporte-entidad/`  | A quién se le paga                            |

### 5.1 El ciclo de vida está aislado y testeado

Igual que la programación de nómina, y por el mismo motivo: generar liquida, desgenerar borra esa
liquidación y aprobar la cierra. La regla vive **solo** en `aporte.estado.ts` (`capacidadesDe`, 9
capacidades) con 11 tests, y `estadoDe` —común a los dos procesos— en `proceso/shared/proceso.estado.ts`
con 4 tests propios. Ninguna plantilla combina banderas.

⚠️ **Los tests garantizan que el código hace lo que dice la tabla de reglas, no que la tabla sea
correcta frente a la norma.** Sale de leer los `[disabled]` del legacy. Los dos casos que conviene
confirmar: **desgenerar sobre un aporte aprobado está bloqueado** (hay que desaprobar primero), y el
**plano del operador solo se ofrece una vez generado** — en el legacy el botón existía siempre,
deshabilitado.

### 5.2 Los dos supuestos que fallan en silencio

Van primero porque no dan error: se ven como una pantalla que "no trae nada".

1. **El endpoint de impresión.** El legacy imprime pegándole a `general/documento/imprimir/` con
   `documento_tipo_id: 1` fijo y el id del aporte como `documento_id`. El aporte **no es un
   documento**, así que esa llamada apunta a otra cosa o está rota. Acá se asume
   `POST /humano/aporte/imprimir/` con `{ id }`. Si no existe, "Imprimir" falla con un toast genérico.
2. **La ARL por defecto.** Al crear se pide `hum_entidad_riesgo_id` a la configuración de empresa; el
   legacy pide el mismo dato como `hum_entidad_riesgo`, **sin `_id`**. Si el backend responde con el
   otro nombre, el campo queda vacío y nadie se entera — el pre-llenado es opcional a propósito.

### 5.3 Por confirmar con backend

#### Endpoints del proceso

Todos con **guion**, que es la convención de este ERP; el legacy los nombra con guion bajo
(`aporte_contrato`, `aporte_detalle`, `aporte_entidad`).

| Acción           | Endpoint                          | Verbo  | Payload            |
| ---------------- | --------------------------------- | ------ | ------------------ |
| Listar           | `/humano/aporte/lista/`           | `POST` | filtros + orden    |
| Cargar contratos | `/humano/aporte/cargar-contrato/` | `POST` | `{ id }`           |
| Generar          | `/humano/aporte/generar/`         | `POST` | `{ id }`           |
| Desgenerar       | `/humano/aporte/desgenerar/`      | `POST` | `{ id }`           |
| Aprobar          | `/humano/aporte/aprobar/`         | `POST` | `{ id }`           |
| Desaprobar       | `/humano/aporte/desaprobar/`      | `POST` | `{ id }`           |
| Plano operador   | `/humano/aporte/plano-operador/`  | `POST` | `{ id }`           |
| Imprimir         | `/humano/aporte/imprimir/`        | `POST` | `{ id }` — ver 5.2 |

#### ¿Una línea por contrato o varias?

La cabecera distingue `contratos` de `lineas`, así que se asume que un contrato puede producir varias
líneas (por novedades que parten el periodo). La pestaña de líneas pagina por eso. Conviene
confirmarlo: si fuera 1:1, la tabla podría mostrarse junto a la de contratos.

#### `presentacion`: única vs sucursal

`'U'` / `'S'`. El legacy solo ofrece los dos valores y no documenta qué cambia en el cálculo —
presumiblemente si la planilla se agrupa por sucursal o va toda junta. **Cambia la planilla completa**,
así que conviene entenderlo antes de que alguien lo toque por error.

#### `anio_salud` / `mes_salud`

El backend los devuelve y el legacy **no los muestra en ninguna pantalla**. En PILA el periodo de
salud puede diferir del de pensión. Están en el modelo (`aporte.model.ts`) para no perder la pregunta;
si son reales, van al resumen del workspace.

#### Las tres exportaciones

Serializadores `informe_aporte_contrato`, `informe_aporte_detalle` e `informe_aporte_entidad`, con sus
filtros (`aporte_id`, `aporte_contrato__aporte_id`). Salen del legacy, que los pedía por `GET` con
query params; acá viajan en el body del `POST …/excel/`, como el resto del ERP.

#### El cruce con las nóminas (modal de trazabilidad)

Serializadores `lista_nomina` (documentos) y `nomina` (líneas) sobre `/general/documento/` y
`/general/documento-detalle/`, filtrando por `documento_clase_id = 701`. Los nombres de campo del
cruce (`base_cotizacion`, `base_prestacion`, `concepto__nombre`…) salen del legacy.

#### Filtros por query param

Los tres niveles se listan por `GET`, no por el `POST …/lista/` de los masters, así que los filtros
van como query params (`campo=valor`, `campo__operador=valor`). Es la convención de
`serializeListQuery`, replicada en `filtrosComoParams` dentro de `aporte.service.ts` porque aquella
trae su propia paginación (`page_size`) y estos endpoints usan `limit`.

### 5.4 Decisiones tomadas (divergencias del legacy)

| #   | Decisión                                                                        | Por qué                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `estadoDe` **se comparte** con la programación; las capacidades **no**          | La etapa se deriva igual en los dos procesos; lo que cambia es qué habilita. Unificar también las capacidades daría una tabla llena de condicionales          |
| 2   | El aporte tiene **workspace propio**, no ficha                                  | Un aporte generado tiene la cabecera congelada y sigue necesitando el banco de trabajo                                                                        |
| 3   | Las **cuatro** acciones del ciclo confirman, con la consecuencia escrita        | El legacy solo confirmaba aprobar. Desgenerar borra la liquidación y no avisaba                                                                               |
| 4   | El semáforo de colores se convierte en una **columna "Novedad"**                | El legacy pintaba las celdas de fecha: color sin etiqueta, invisible al exportar. `error_terminacion` gana sobre ingreso/retiro — es lo que hay que corregir  |
| 5   | Eliminar contratos va en **una sola tanda**: un refresco y un toast             | El legacy disparaba N peticiones y cada una recargaba la tabla y sacaba su propio mensaje                                                                     |
| 6   | La pestaña de entidades **no pagina** y agrupa con `agruparEntidades` (7 tests) | El legacy agrupaba sobre una página de 50: con más entidades, los subtotales y el total general quedaban por debajo de lo real. Es la plata que se paga       |
| 7   | Los contratos y las líneas **paginan de verdad** (25 por página)                | El legacy pedía `limit: 1000` y encima mostraba paginador — paginación decorativa                                                                             |
| 8   | Las 42 columnas de la línea salen de **una sola metadata**                      | De ahí se derivan los `ColumnDef` y la leyenda de abreviaturas, con un test que fija que no diverjan. En el legacy cada sigla vivía en un `ngbTooltip` suelto |
| 9   | Las nueve banderas de novedad se muestran **`Sí` / `—`**                        | Con el `Sí` / `No` por defecto, nueve columnas de negativos convierten cada fila en ruido                                                                     |
| 10  | El plano del operador **solo aparece** una vez generado                         | Es el entregable del proceso: sin líneas calculadas no hay nada que entregar                                                                                  |
| 11  | La sucursal usa `suggestedIndex="0"`                                            | El legacy sembraba `sucursal: 1` fijo, asumiendo que existe en todos los tenants                                                                              |
| 12  | El cruce con nóminas es un **modal**, no un link a la ficha                     | Hacen falta varias nóminas filtradas por contrato y periodo, con sus conceptos y totales — la ficha muestra una sola                                          |
| 13  | El servicio del cruce vive **junto al modal**, no en `AporteService`            | No toca ningún endpoint del aporte: pega contra el master de documentos                                                                                       |
| 14  | Los totales del cruce salen de `totalesDe(filas, campos)`                       | El legacy tenía diez métodos `calcularTotalX()` idénticos salvo el campo                                                                                      |
| 15  | El listado **no tiene borrado**, igual que el de programaciones                 | Borrar depende del estado (solo borrador) y `<lib-data-table>` no condiciona acciones fila por fila                                                           |

### 5.5 Lo que no se portó

- **`TablaEntidadService`**, un singleton `providedIn: 'root'` que guardaba la lista, los parámetros y
  los totales del aporte abierto. Mismo anti-patrón que `TablaContratosService` en programación.
- **La edición de renglones a medias**: `AporteContratoService.actualizarDetalles` no tenía un solo
  llamador, y `formularioAporteContrato`, `registroSeleccionado` y `registroAdicionalSeleccionado`
  estaban declarados y nunca usados. **En este proceso no se editan líneas.**
- El `toggleSelectAll` del legacy, que hacía `selected = !selected` en las **dos** ramas: deseleccionar
  todos en realidad invertía la selección y desincronizaba el array de ids.
- Dos `#OpcionesDropdown` con el mismo nombre y dos `id="dropdownBasic1"` en la misma plantilla, y el
  spinner de "desgenerando" reutilizado como label del botón de plano operador.
- El `ngOnDestroy` que borraba de `localStorage` una clave (`documento_aporte`) que nadie escribía.
- La **configuración de cuentas contables por tipo de aporte** (`configuracion_aporte`), que en el
  legacy vive en otra pantalla (Configuración) y es otro feature.

---

## 6. Liquidación (proceso)

Portada desde `humano/paginas/documento/liquidacion-detalle/` del ERP anterior
(`/humano/proceso/detalle/:id?modelo=HumLiquidacion`), 2026-07-30. Vive en
`features/humano/proceso/liquidacion/` y es la tercera entrada de la sección **Proceso**.

Es el **cierre de un contrato**: cesantías, intereses, prima y vacaciones pendientes, más las
adiciones y deducciones que se carguen a mano. Estructura mucho más simple que los otros dos
procesos — cabecera y una sola lista de conceptos.

| Nivel     | Endpoint                         | Qué es                              |
| --------- | -------------------------------- | ----------------------------------- |
| Cabecera  | `/humano/liquidacion/`           | El cálculo completo, ~25 campos     |
| Conceptos | `/humano/liquidacion-adicional/` | Lo que suma o resta, cargado a mano |

### 6.1 La liquidación no se crea desde su pantalla

**La fabrica el backend al terminar un contrato.** Por eso el listado no tiene "Nuevo" ni editar, y
el servicio no expone `create` ni `update` de cabecera: dejar esos métodos "por si acaso" invitaría a
usarlos.

Eso obligó a portar también la **terminación del contrato**, que estaba pendiente (el antiguo §3.2).
Vive en la ficha del contrato, no en el formulario, con dos acciones que solo aparecen mientras el
contrato siga vigente:

| Acción                | Endpoint                          | Qué hace                                     |
| --------------------- | --------------------------------- | -------------------------------------------- |
| Fechas de último pago | `PATCH /humano/contrato/:id/`     | Desde cuándo se liquida cada prestación      |
| Terminar contrato     | `POST /humano/contrato/terminar/` | Cierra el contrato y **crea la liquidación** |

⚠️ **Las fechas de último pago son el supuesto más frágil de esta tanda.** El ERP anterior las lee
con `serializador=parametros_iniciales` y las guarda con un endpoint aparte; acá se reusa el `PATCH`
del propio contrato para no inventar uno. Si el backend no acepta la actualización parcial, el modal
falla con un toast genérico.

### 6.2 El ciclo de vida está aislado y testeado

La regla vive **solo** en `liquidacion.estado.ts` (`capacidadesDe`, 7 capacidades) con 11 tests, sobre
el `estadoDe` compartido de `proceso/shared/`. Ninguna plantilla combina banderas.

Dos particularidades frente a los otros procesos:

- **Reliquidar** solo existe acá: recalcula sobre el borrador, sin liquidar en firme. Sirve cuando
  cambian los datos de origen (salario, fechas de último pago).
- **Imprimir no es una capacidad**: está disponible en las tres etapas, así que declararla sería una
  constante en `true`. Queda dicho en la tabla de reglas para que no parezca un olvido.

⚠️ Igual que en los otros dos procesos, **los tests garantizan que el código hace lo que dice la tabla,
no que la tabla sea correcta**. Sale de leer los `[disabled]` del legacy.

### 6.3 Por confirmar con backend

#### Endpoints del proceso

Con **guion**; el legacy nombra `liquidacion_adicional` con guion bajo.

| Acción     | Endpoint                          | Verbo  | Payload                 |
| ---------- | --------------------------------- | ------ | ----------------------- |
| Listar     | `/humano/liquidacion/lista/`      | `POST` | filtros                 |
| Ficha      | `/humano/liquidacion/:id/`        | `GET`  | `?serializador=detalle` |
| Generar    | `/humano/liquidacion/generar/`    | `POST` | `{ id }`                |
| Reliquidar | `/humano/liquidacion/reliquidar/` | `POST` | `{ id }`                |
| Desgenerar | `/humano/liquidacion/desgenerar/` | `POST` | `{ id }`                |
| Aprobar    | `/humano/liquidacion/aprobar/`    | `POST` | `{ id }`                |
| Desaprobar | `/humano/liquidacion/desaprobar/` | `POST` | `{ id }`                |
| Imprimir   | `/humano/liquidacion/imprimir/`   | `POST` | `{ id }`                |

En el legacy el método de reliquidar se llama `reliquiar` (sin la `d`); acá se asume que **la URL sí
está bien escrita**. Vale confirmarlo: si el endpoint replica el error de tipeo, es un fallo 404 con
un toast genérico.

#### El serializador de la cabecera

`?serializador=detalle` en el `GET`. Sin él el backend devuelve la liquidación cruda, sin los campos
del contrato ni del empleado (`contrato__contacto__…`), y la ficha queda sin identidad.

#### El total de conceptos

`adicion`, `deduccion` y `total` de la cabecera los recalcula el backend cuando cambia un concepto.
La pantalla lo asume: al agregar, editar o borrar uno, recarga la cabecera. Si el backend no
recalcula al vuelo, esos tres números quedan viejos hasta reliquidar.

#### El catálogo de conceptos

`/humano/concepto/seleccionar/?adicional=True&operacion=1|-1`. La operación acota la lista a los
conceptos que suman o a los que restan.

### 6.4 Decisiones tomadas (divergencias del legacy)

| #   | Decisión                                                                         | Por qué                                                                                                                                           |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Terminar contrato y las fechas de último pago van en la **ficha**, no en el form | Terminar no es editar un campo: es un evento con consecuencia. El aviso de que se crea la liquidación va **arriba** de los campos                 |
| 2   | Las **cinco** acciones del ciclo confirman                                       | El legacy solo confirma aprobar y desaprobar; generar y desgenerar se disparan de una                                                             |
| 3   | La botonera se bloquea mientras haya algo en vuelo                               | El botón de generar del legacy lee una bandera de carga que **nunca pone en `true`**: queda habilitado durante la petición y admite doble disparo |
| 4   | El listado **no tiene "Nuevo" ni editar**                                        | La liquidación la fabrica el backend y sus números los calcula él. Está explicado en el código para que no se lea como un olvido                  |
| 5   | Los conceptos **se pueden editar**                                               | El endpoint existía en el servicio del legacy sin un solo llamador; corregir un valor obligaba a borrar y volver a cargar                         |
| 6   | La operación se deduce al reabrir (`operacionDe`)                                | Es lo que permite acotar el catálogo igual que al crear. El reparto adicional/deducción va en tres funciones puras con 14 tests                   |
| 7   | Borrar conceptos va en **una sola tanda**                                        | El legacy recargaba _fuera_ del `subscribe`: pedía los datos antes de que terminaran los DELETE                                                   |
| 8   | Los totales se releen tras tocar un concepto                                     | Los recalcula el backend; mostrarlos sin recargar sería mostrar cifras viejas                                                                     |
| 9   | El resumen muestra por prestación **desde cuándo y cuántos días**                | Es lo que explica cada monto. El legacy los repartía en una tabla de ocho columnas con media docena de celdas vacías para cuadrar la grilla       |
| 10  | El interés de cesantías va sin fecha ni días                                     | No los tiene: se calcula sobre la cesantía. Las celdas quedan vacías a propósito                                                                  |
| 11  | El PDF manda **solo el id**                                                      | El legacy le suma `filtros`, `limite`, `desplazar`, `modelo` y `tipo`, que el endpoint no usa                                                     |
| 12  | Eliminar vive en el workspace, no en el listado                                  | Depende del estado (solo borrador), y `<lib-data-table>` no condiciona acciones fila por fila                                                     |
| 13  | "Adición" es la acción primaria y "Deducción" la secundaria                      | El toolbar compartido admite una sola primaria. Son conceptualmente pares; si se quieren iguales, hay que ensanchar `ToolbarAction`               |

### 6.5 Lo que no se portó

- **El `signal` de la liquidación abierta en `LiquidacionService`**, `providedIn: 'root'`. Mismo
  anti-patrón que `TablaContratosService` y `TablaEntidadService`; el estado del workspace vive en el
  workspace.
- El `toggleSelectAll` que mutaba en sitio el array del signal, y el `limit: 1000` sin paginar.
- El selector del componente, que se llamaba `app-nomina-electronica-detalle` por copy/paste, y el
  signal `notificando` declarado y nunca usado.

---

## 7. Nómina electrónica (documento)

El `modelo=702` del ERP anterior. Estaba **medio portado sin que se notara**: existían el informe
(`informes/nomina-electronica`) y la utilidad de envío (`utilidades/enviar-nomina-electronica`), las
dos sobre `/general/documento/`, pero no el documento en sí. Faltaban su ficha, su acción "Generar" y
su entrada en el menú de Documentos.

### 7.1 Qué es

No es la nómina otra vez con otro nombre: es un documento que **agrega**. Apunta hacia atrás a las
nóminas del periodo de un empleado vía `documento_referencia_id`, así que un mes pagado por quincenas
son dos nóminas y una sola nómina electrónica. Sus totales son los del periodo completo, y cuando la
DIAN la acepta el backend escribe el `cue` (el CUNE del portal público).

Convive con las otras dos piezas y cada una responde algo distinto:

| Pieza                                  | Filtra por               | Pregunta que responde    |
| -------------------------------------- | ------------------------ | ------------------------ |
| `documentos/nomina-electronica`        | `documento_tipo_id` 15   | "¿qué pasó con esta?"    |
| `informes/nomina-electronica`          | `documento_clase_id` 702 | "¿cuánto liquidé?"       |
| `utilidades/enviar-nomina-electronica` | tipo 15 + 4 estados      | "¿qué falta por emitir?" |

Nótese que el informe filtra por **clase** y el documento por **tipo**. Si la clase agrupa más de un
tipo, el informe es un superconjunto del listado. Vale confirmarlo.

### 7.2 El gateway compartido creció

`anular` y `emitir` entraron a `EntityDataGateway` (`libs/core/documento`), que lo consumen erp y
turnos. Antes ninguna ficha del ERP nuevo sabía anular, y emitir vivía duplicado dentro de las tres
utilidades electrónicas (venta, compra, humano).

| Acción     | Endpoint                      | Body               |
| ---------- | ----------------------------- | ------------------ |
| aprobar    | `POST <endpoint>/aprobar/`    | `{ id }`           |
| desaprobar | `POST <endpoint>/desaprobar/` | `{ id }`           |
| anular     | `POST <endpoint>/anular/`     | `{ id }`           |
| emitir     | `POST <endpoint>/emitir/`     | `{ documento_id }` |

La asimetría de la última fila es del backend, no un desliz: ya estaba anotada en §1.5 como rareza de
las utilidades y ahora vive también en el contrato del gateway, que es donde se tropieza.

`DocumentDetailActionsComponent` ganó las dos acciones como **opt-in** (`showAnular` / `showEmitir`,
apagadas por default). La botonera la comparte todo el ERP; prenderlas por default le pondría botones
a fichas cuyo backend no los atiende.

### 7.3 Endpoints y supuestos

| Qué                 | Petición                                                     | Estado  |
| ------------------- | ------------------------------------------------------------ | ------- |
| Listado             | `POST /general/documento/lista/` (tipo 15, vía el framework) | Asumido |
| Cabecera            | `GET /general/documento/:id/`                                | Asumido |
| Nóminas origen      | `GET /general/documento/?documento_referencia_id=:id&limit=` | Asumido |
| Líneas              | `GET /general/documento-detalle/?documento_id=:id&limit=`    | Asumido |
| Generar             | `POST /general/documento/generar-nomina-electronica/`        | Asumido |
| Las cuatro acciones | ver la tabla de §7.2                                         | Asumido |

Cuatro preguntas abiertas:

1. **Los dos serializadores omitidos.** El legacy pide `serializador=detalle_nomina` en la cabecera,
   `lista_nomina` en las nóminas origen y `nomina` en las líneas. Acá los tres se omiten, igual que
   en la nómina (14) — que funciona así. Si el backend los necesita, la ficha carga con campos
   vacíos y hay que sumarlos; `NominaElectronicaService` es el único lugar a tocar para dos de los
   tres, y el tercero exigiría ensanchar `getById` del gateway con un parámetro de serializador.
2. **`documento_referencia_id` como query param del `GET` de listado.** Es la única consulta "hacia
   atrás" del ERP; si el backend solo la acepta como filtro del `POST …/lista/`, cambia la forma.
3. **Qué es el `resumen`** que devuelve generar. El legacy lo recibe y lo ignora. Si es "cuántas se
   generaron", vale la pena decirlo en el toast; si es un id, no. Hasta saberlo se trata como opaco.
4. **Si la clase 702 agrupa más tipos que el 15** (ver §7.1).

### 7.4 Decisiones tomadas (divergencias del legacy)

| #   | Decisión                                                                  | Por qué                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Las capacidades salen de una tabla pura y probada, no de los `[disabled]` | Cuatro acciones por tres banderas. En el legacy la condición de anulado está escrita a mano en cada botón y **en "Aprobar" falta**: un documento anulado y sin aprobar deja darle aprobar              |
| 2   | "Anular" va dentro del dropdown "Acciones", no como botón suelto          | Es irreversible; tenerlo a un click de "Aprobar" es pedir un accidente                                                                                                                                 |
| 3   | El listado omite `fecha_desde`, `fecha_hasta`, `salario` y `contrato_id`  | El mapeo del legacy para 702 está copiado del de la nómina. Su propia ficha no los muestra y usa `fecha` a secas: un consolidado no tiene _un_ salario ni _un_ contrato                                |
| 4   | La pestaña "Detalle" pasa de 11 a 7 columnas y suma `concepto_nombre`     | Las cuatro que salen (`documento__*`) son constantes en toda la tabla —es un solo documento— y ya están en la cabecera. El concepto, que es lo que distingue una fila de otra, el legacy no lo pintaba |
| 5   | Las filas de la pestaña "Nóminas" navegan a su ficha                      | En el legacy son inertes. Es la pregunta natural al mirar de qué se compone el consolidado                                                                                                             |
| 6   | El CUNE se muestra siempre, con "Aún no emitida" cuando falta             | El legacy pone el `@if` sobre el `<td>` pero no sobre el `<th>`: sin CUNE queda la etiqueta suelta y la celda vacía al lado                                                                            |
| 7   | El modal de "Generar" usa un datepicker de mes                            | El legacy usa dos `<input type="number">` que aceptan mes 13 y año 20024. Mismo dato, cero validaciones que escribir                                                                                   |
| 8   | El "¿emitir ahora?" es un modal propio, no un `p-confirmDialog`           | El strategy se provee en root y el único `ConfirmationService` del listado vive a nivel de componente. Habría compilado y fallado en silencio                                                          |
| 9   | El `activeMatch` de la nómina pasó de `nomina` a `nomina/`                | `nomina` a secas también casa con `nomina-electronica`: las dos entradas del sidebar quedaban marcadas a la vez                                                                                        |
| 10  | La acción no reusa `GenerarDocumentoActionStrategy` (venta)               | Aquella genera un tipo a partir de otro por el endpoint genérico; esta tiene endpoint propio y no recibe tipos. Comparten forma, no contrato                                                           |

### 7.5 Lo que no se portó

- **`NominaElectronicaService.consultarDetalle`** (`GET …/:id/detalle/`), que existe pero la ficha
  nunca usa para cargar: solo lo llama tras aprobar, y lee `respuesta.documento` mientras la carga
  inicial lee la respuesta plana. **Dos shapes distintos para el mismo dato** — un bug latente.
- **La interfaz `NominaElectronica`** (55 campos con `descuento`, `plazo_pago`, `asesor`, `sede`,
  `pagos`…), copiada de la factura de venta y sin uso en ninguna de las dos pantallas del legacy.
- El botón "Eliminar" y la columna de selección, que el listado del legacy deja visibles por omisión
  aunque el documento no se elimine a mano.
