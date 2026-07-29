# Contabilidad — pendientes por revisar

Bitácora de lo que quedó **asumido o decidido** al portar el módulo de contabilidad desde el ERP
anterior. Nada se ha ejercitado contra `reddocapi.uk`: todo sale de leer el código legacy.

Cada supuesto vive además como comentario en su archivo; acá está el índice para revisarlos de una
sentada. Al confirmar uno, **bórralo de esta lista** y quita el `TODO(backend)` del código.

Las secciones §1–§5 cubren los **informes**; §6–§8, los documentos transaccionales (**asiento
contable**, **depreciación** y **cierre**); §9, la consulta de **movimientos**.

Estado (2026-07-28): portados **balance de prueba** (`35754f9`), **auxiliar de cuenta** (`baaa670`)
**balance de prueba por contacto** (`d531a2f`), **auxiliar general** (`da80fd3`) y **auxiliar por
Estado: **los 9 informes del ERP anterior están portados\*\* (2026-07-28). Lo común vive en
`features/contabilidad/shared/` desde `3211e91`; un informe nuevo de esta familia son ~40 líneas.

Estado (2026-07-29): portados el **asiento contable** (documento tipo 13, §6), la **depreciación**
(documento tipo 23, §7), el **cierre contable** (documento tipo 25, §8) y la consulta de
**movimientos** (§9).

---

## 1. Por confirmar con backend

### 1.1 Contrato del endpoint

`POST /contabilidad/movimiento/informe-balance-prueba/` con body `{ parametros }`, y la respuesta
`{ registros }` **sin paginar ni contar**.

Los informes contables **no siguen la convención del resto del ERP** (`POST …/lista/` con
`{ filtros, ordenamientos }` + paginación en query params). Confirmar que sigue siendo así, porque
de eso depende toda la forma de la página.

### 1.2 Descargas

Excel y PDF se piden al **mismo endpoint**, con los mismos `parametros` y una bandera extra en el
body: `excel: true` o `pdf: true`. Confirmar, y de paso si el backend respeta `Content-Disposition`
(si no, queda el `fallbackFilename`).

**No ofrecen PDF** los dos auxiliares (general y por contacto) ni el informe _base_: en los
auxiliares el método `imprimir()` estaba comentado entero —el botón existía sin hacer nada— y en
base ni siquiera había botón. Si los endpoints sí lo sirven, se encienden con `[showPdf]="true"`.

### 1.3 Nombres de los parámetros

Comunes: `fecha_desde`, `fecha_hasta`, `incluir_cierre`, `cuenta_con_movimiento`, `cuenta_desde`,
`cuenta_hasta`, `cuenta_codigo_desde`, `cuenta_codigo_hasta`. El balance por contacto suma
`contacto` (id).

El auxiliar general y el auxiliar por contacto suman `contacto`, `numero` y `comprobante`.

**El informe _base_ declara menos y nombra distinto**: solo periodo, rango de cuentas y el tercero,
que manda como **`contacto_id`** — es el único que usa el sufijo; el resto lo llama `contacto` a
secas. No manda `incluir_cierre` ni `cuenta_con_movimiento`. Confirmar las dos cosas.

No se portaron `numero_identificacion` ni `nombre_corto`, que el balance por contacto y el auxiliar
general declaraban en su formulario pero **siempre viajaban vacíos** (su selector solo escribía
`contacto`). Si el backend los espera de verdad, hay que reponerlos.

**`comprobante` viaja como número.** Así lo pedía el ERP anterior (un input numérico suelto), pero
lo natural sería un selector del master de comprobantes — que este ERP todavía no tiene. Confirmar
si el backend espera el id del comprobante o su código.

**Pregunta concreta**: ¿el backend acota el rango de cuentas por **id** o por **código**? El legacy
manda los dos. Si le basta el id, sobran los dos `cuenta_codigo_*` y se simplifica la página (ver
§2, punto 2).

### 1.4 Campos de la fila

`codigo`, `nombre`, `nivel`, `saldo_anterior`, `debito`, `credito`, `saldo_actual`.

El legacy declaraba además `cuenta_clase_id`, `cuenta_grupo_id`, `cuenta_cuenta_id`,
`vr_debito_anterior` y `vr_credito_anterior`, que su tabla no mostraba. No se portaron; si hacen
falta para agrupar o indentar, están en el modelo del legacy.

---

## 2. Decisiones tomadas

| #   | Decisión                                                                                        | Por qué                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No** se usa `<lib-data-table>`; la tabla es propia (`<app-saldos-cuenta-table>`)              | El resultado no pagina y necesita una fila de totales — dos cosas que la tabla compartida no cubre                                                                              |
| 2   | El código de cuenta se recorta de la etiqueta del selector (`"1105 - Caja general"` → `"1105"`) | `<app-cuenta-select>` solo expone `{ id, nombre }`. Es frágil: si el backend no necesita el código (§1.3) se borra; si lo necesita, mejor que el selector exponga la fila cruda |
| 3   | Solo se totalizan **débito y crédito**, no los saldos                                           | En un balance cuadrado débito y crédito coinciden: esa fila es el chequeo visual del informe. Sumar saldos mezcla naturalezas y no significa nada. El legacy hacía lo mismo     |
| 4   | La tabla distingue "sin generar" de "sin resultados"                                            | El legacy mostraba tabla vacía en los dos casos, que se lee como si el reporte hubiera fallado                                                                                  |
| 5   | Lo común vive en `features/contabilidad/shared/` (hecho al llegar el segundo informe)           | Servicio base, base de página, panel de parámetros, tabla, botonera y validadores. Cada informe queda en poco más que su endpoint, su nombre y el del archivo                   |
| 6   | El balance por contacto va **sin fila de totales**                                              | El ERP anterior la quitó a propósito (plantilla comentada, tarea 1517). Al repetirse la cuenta por contacto, sumar la columna no da el movimiento del periodo                   |
| 7   | Las tres acciones usan el endpoint del propio informe                                           | El PDF del balance por contacto pegaba a `informe-balance-prueba/` en vez de `-tercero/`: descargaba el informe equivocado. Bug del original, corregido acá                     |
| 8   | El informe _base_ tiene **tabla propia** (`<app-base-movimientos-table>`)                       | No comparte ni una columna de saldos con sus hermanos: no hay saldo anterior ni actual, y sí `base` y `detalle`                                                                 |
| 9   | El informe _base_ **suma fila de totales**, que el original no tenía                            | En un informe de base gravable el total es justo el dato que se busca (es lo que se declara). Sin él había que exportar a Excel para conocerlo                                  |
| 10  | Los estados financieros **no ofrecen rango de cuentas ni banderas**                             | Su plantilla original tampoco los renderizaba (los controles existían muertos). Un estado financiero cubre las clases que le corresponden, no un rango elegido a mano           |
| 11  | Los estados financieros van **sin fila de totales**                                             | El saldo mezcla cuentas de naturaleza contraria (ingresos/gastos, activo/pasivo): una suma cruda no es la utilidad ni el patrimonio. Calcularla bien es trabajo del backend     |
| 12  | `nivel` se tipa pero no se usa                                                                  | El legacy tampoco lo usaba para pintar jerarquía. Queda disponible por si se quiere indentar el plan de cuentas                                                                 |

---

## 3. Ideas para más adelante

No son deudas, son mejoras que el informe original tampoco tenía:

- **Indentar por `nivel`** para que se lea el plan de cuentas como árbol (clase → grupo → cuenta →
  subcuenta) en vez de una lista plana.
- **Agrupar los estados financieros por clase y grupo** (hoy repiten esas dos columnas en cada
  fila) y mostrar el subtotal de cada grupo, que es como se lee un estado financiero en papel.
  Requiere saber si el backend puede darlos o si hay que calcularlos en el front.
- ~~**Marcar el descuadre**~~ — hecho en `3211e91`: la fila de totales se resalta cuando débito y
  crédito no coinciden.

---

## 4. Mapa de los informes portados

| Informe                        | Endpoint                               | Parámetros                              | Tabla                         | PDF |
| ------------------------------ | -------------------------------------- | --------------------------------------- | ----------------------------- | --- |
| Balance de prueba              | `informe-balance-prueba/`              | completos                               | saldos                        | sí  |
| Balance de prueba por contacto | `informe-balance-prueba-tercero/`      | completos + `contacto`                  | saldos + tercero, sin totales | sí  |
| Auxiliar de cuenta             | `informe-auxiliar-cuenta/`             | completos                               | saldos                        | sí  |
| Auxiliar por contacto          | `informe-auxiliar-tercero/`            | completos + contacto/número/comprobante | saldos + tercero, sin totales | no  |
| Auxiliar general               | `informe-auxiliar-general/`            | completos + contacto/número/comprobante | saldos + tercero + movimiento | no  |
| Base                           | `informe-base/`                        | rango + `contacto_id`                   | propia (base gravable)        | no  |
| Certificado de retención       | `informe-certificado-retencion/`       | rango + `contacto_id`                   | propia (retenciones)          | sí  |
| Estado de resultados           | `informe-estado-resultados/`           | solo periodo                            | estados financieros           | no  |
| Estado de situación financiera | `informe-estado-situacion-financiera/` | solo periodo                            | estados financieros           | no  |

> "Completos" = periodo + rango de cuentas + las dos banderas.

Para agregar uno nuevo de esta familia: declarar el servicio con su endpoint
(`extends InformeCuentasService`), extender `InformeCuentasPageBase` con `nombre` y `archivo`, y
componer en la plantilla `<app-informe-cuentas-params>` (con los campos extra por `ng-content`),
`<app-informe-cuentas-actions>` y la tabla que corresponda.

## 5. Duda funcional abierta: el auxiliar de cuenta

El informe original de **auxiliar de cuenta** devuelve y pinta **exactamente las mismas columnas de
saldos que el balance de prueba**. De un "auxiliar" uno esperaría el **detalle de movimientos** por
cuenta (comprobante, número, fecha, detalle, débito, crédito, saldo corrido).

Indicios de que allá quedó a medio hacer:

- Su formulario declara controles `comprobante`, `cuenta` y `contacto` que la plantilla **nunca
  renderiza**.
- Su botón de PDF manda un body distinto al de Excel (`_parametrosConsulta` con
  `modelo: 'ConMovimiento'`, `filtros`, `limite`… en vez de `{ parametros }`).
- Quedó un `console.log` en el método de consulta.

Se portó **lo que hace**, no lo que promete el nombre. Si el auxiliar debe mostrar movimientos, es
un cambio de alcance a definir con backend: qué devuelve realmente `informe-auxiliar-cuenta/`.
Lo mismo aplica probablemente a _auxiliar por tercero_ y _auxiliar general_.

---

## 6. Asiento contable (documento tipo 13)

Portado desde `contabilidad/paginas/documento/asiento/` del ERP anterior. Es el **primer documento
transaccional** del módulo: contabilidad entró al framework configuracional (camino A) con este
asiento, así que ahora tiene `contabilidad.config.ts` y está en `ERP_MODULE_REGISTRY`.

Reusa la familia contable compartida (`features/documentos/contable/`), la misma del pago y el
egreso. Vive en `documentos/asiento/`.

### 6.1 Por confirmar con backend

#### El comprobante

No existe como master en este ERP; el select pega directo a
`/contabilidad/comprobante/seleccionar/` con el filtro `permite_asiento=True`, los dos tomados del
legacy. Confirmar que existe y que el filtro es un query param válido: si no lo es, el select
mostraría también los comprobantes que no admiten asiento manual.

#### Campos nuevos de la línea contable

`numero` y `detalle` se sumaron a `CuentaDetallePayload` para este documento. Los nombres salen del
`FormGroup` del legacy, **no de una respuesta real**.

**`numero` es un entero libre de la línea**, no el consecutivo del documento. En el legacy no
validaba nada ni se mostraba en la ficha; se portó por si el backend lo espera.

⚠️ **Efecto colateral en pago y egreso**: los dos campos viven en el payload compartido, así que
ahora esos documentos mandan `numero: null, detalle: null` en cada línea. Si el backend rechaza
campos no esperados, se ve ahí primero.

#### Cabecera

`soporte`, `comprobante`, `centro_costo` y `comentario` sobre `DocumentoPayloadBase`. El
`total` viaja como **`créditos − débitos`** (en un asiento cuadrado, `"0.00"`) — es literalmente lo
que calculaba el legacy. Si el backend espera la magnitud del asiento (la suma de débitos), es un
cambio de una línea en `asiento.mapper.ts`.

#### Longitudes

`soporte` quedó con `maxLength(50)` y `detalle` de línea con `maxLength(200)`. **Son inventadas**:
el legacy no acotaba ninguno de los dos. Ajustar a lo que declare el modelo del backend.

### 6.2 Decisiones tomadas

| #   | Decisión                                                                                     | Por qué                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | El **"grupo" del legacy es el centro de costo** (`centro_costo`)                             | Vocabulario del ERP anterior, ya resuelto así en los documentos de compra. Aplica a la cabecera y a la línea de los tres documentos contables (§6, §7, §8)                                                                                             |
| 1   | Los 2 campos nuevos se sumaron a la familia contable **compartida**, como columnas opt-in    | Mismo patrón que `showContacto`/`showBase`, que ya existía. Duplicar la familia para el asiento costaba ~800 líneas de mapper y tabla                                                                                                                  |
| 2   | El descuadre **avisa pero no bloquea** el guardado                                           | El legacy solo rechazaba total negativo, sin exigir cuadre. Endurecerlo a bloqueo puede dejar a un usuario sin poder guardar un asiento a medias; la validación dura es del backend al aprobar                                                         |
| 3   | El resumen suma una fila **"Diferencia"** en ámbar (`showDescuadre`), que el legacy no tenía | Sin ella el descuadre solo se ve restando a ojo dos cifras. Va opt-in: en un recaudo la diferencia _es_ el neto y no hay nada que señalar                                                                                                              |
| 4   | **Sin** columna de centro de costo en las líneas                                             | El asiento del legacy no la imputaba (sí el pago). La columna existe en el `FormGroup`, prenderla es un input                                                                                                                                          |
| 5   | **Sin** "agregar documento" (cruce de cartera)                                               | El asiento es manual: no cruza CxC/CxP. Las líneas que lleguen enlazadas desde backend se siguen respetando (cuenta y naturaleza bloqueadas, que ya lo resuelve la familia contable)                                                                   |
| 6   | El array `detalles_eliminados` del legacy **no se portó**                                    | Acá las líneas transaccionan contra `documento-detalle` al instante en edición; no hay bajas diferidas que reportar en el payload de la cabecera                                                                                                       |
| 7   | La **importación de líneas por Excel** queda fuera                                           | `general/documento/importar-detalle-cuenta/`. El ERP tiene diálogo de importación (`ImportDialogComponent`, lo usan los masters), pero importar **líneas dentro de un documento** es otra cosa: ningún documento lo hace (`canImport: false` en todos) |

### 6.3 Bug del legacy que no se portó

`agregarRegistrosEliminar` buscaba el registro con `indexOf(id)` pero empujaba `posicion` (que vale
`-1` cuando no lo encuentra) en vez de `id`. El array resultante nunca se usaba al guardar: código
muerto con un bug adentro.

---

## 7. Depreciación (documento tipo 23)

Portado desde `contabilidad/paginas/documento/depreciacion/` del ERP anterior. Segundo documento del
módulo. Vive en `documentos/depreciacion/`.

Lo que lo separa del resto: **sus líneas no las teclea nadie**. El backend las genera desde los
activos fijos y el front solo las muestra y las elimina. Por eso no reusa la familia contable
(editable, de cuenta/naturaleza/valor) sino una tabla propia de solo lectura.

### 7.1 Por confirmar con backend

#### El endpoint que genera las líneas

`POST /general/documento/cargar-activo/` con body `{ id }` (id del documento). Tomado de
`DepreciacionService.cargarActivos` del legacy, sin verificar.

**Pregunta concreta**: al llamarlo con un documento que **ya tiene líneas**, ¿las reemplaza o las
acumula? El front no lo sabe, así que pide confirmación al usuario antes de volver a llamar. Si el
backend reemplaza siempre, esa confirmación sobra.

La respuesta del endpoint **se ignora**: al terminar se recargan las líneas desde
`documento-detalle`, que es la fuente autoritativa. Si el endpoint ya devuelve las líneas, se ahorra
una petición.

#### Campos de la línea

`activo`, `activo_codigo`, `activo_nombre` y `dias`, sobre `DocumentoDetalleReadBase` (de donde sale
`precio`). Salen del `FormGroup` del legacy, **no de una respuesta real**.

Ojo: el legacy pinta `detalle.value.activo` como si fuera el **id** del activo (columna "Activo ID"),
mientras que el código y el nombre van en columnas aparte. Se portó igual, pero conviene confirmar
que `activo` es la FK y no otra cosa.

#### El total

Se calcula en el front sumando el `precio` de las líneas y viaja así en la cabecera. El legacy
**nunca lo calculaba** (su `calcularTotales()` está comentado entero): mostraba el que devolvía el
backend. Confirmar que el backend acepta el total que le mandamos y que coincide con el suyo; si lo
recalcula al aprobar, mandarlo es inofensivo.

### 7.2 Decisiones tomadas

| #   | Decisión                                                                          | Por qué                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Tabla propia** (`<app-depreciacion-lineas-table>`), no la familia contable      | La línea no comparte ni una columna con un asiento: activo, código, nombre y días contra cuenta, naturaleza y valor. Y no se edita: meterla en la tabla contable obligaba a volverla opt-out     |
| 2   | Al crear, se navega a **editar** el documento nuevo (no a la lista ni al detalle) | Una depreciación recién creada está vacía y cargar los activos necesita su id. Volver a la lista obligaba al usuario a buscar el documento que acaba de crear                                    |
| 3   | La sección de activos **no existe en alta**                                       | Sin id no se puede generar ni listar nada; mostrar una tabla vacía con un botón muerto es peor que no mostrarla                                                                                  |
| 4   | El total se **suma en el front** (ver §7.1)                                       | El usuario ve el total apenas carga los activos, sin guardar ni recargar. Las líneas vienen del backend, así que la suma no inventa nada                                                         |
| 5   | **No** se portan `soporte` ni `comprobante`                                       | El formulario del legacy los declaraba —y hasta pedía el catálogo de comprobantes en `ngOnInit`— pero su plantilla no los renderiza nunca. Son restos de haber copiado el formulario del asiento |
| 6   | El `comentario` va en la misma sección, no en una segunda pestaña                 | Ningún formulario de este ERP usa pestañas; esconder un solo campo detrás de una no aporta                                                                                                       |
| 7   | Eliminar una línea pega a `documento-detalle` al instante                         | Es lo que ya hace la familia contable. El `detalles_eliminados` diferido del legacy no aplica                                                                                                    |
| 8   | **Sin** `unsavedChangesGuard` en la ruta de edición                               | No hay líneas a medio editar que perder: se generan y se persisten del lado del backend                                                                                                          |
| 9   | `agregarLinea()` del legacy **no se porta**                                       | Existe en el componente pero ningún botón lo llama, y una línea tecleada a mano no tendría activo ni días. Si hace falta, es un cambio de alcance                                                |

### 7.3 Riesgo abierto: el id del documento creado

`extractDocumentoId` (en el form) contempla que el `POST` devuelva el documento **plano** (`{ id }`)
o **envuelto** (`{ documento: { id } }`, como hacía el legacy), porque el gateway entrega el body
crudo y no se pudo verificar cuál es. Si no encuentra el id por ninguna de las dos vías, cae a la
lista en vez de navegar a una URL inválida — pero el usuario pierde el atajo a cargar activos.
Al confirmar la forma real, se simplifica la función.

---

## 8. Cierre contable (documento tipo 25)

Portado desde `contabilidad/paginas/documento/cierre/` del ERP anterior. Tercer documento del
módulo. Vive en `documentos/cierre/`.

Cierra el ejercicio: traslada los saldos de las cuentas de resultado de un rango a la cuenta de
cierre. Como la depreciación, **sus líneas las genera el backend**; a diferencia de ella, son
asientos contables normales, así que reusa `<app-contable-documento-lineas-table>` sin agregarle
nada — las ocho columnas del legacy ya estaban cubiertas.

### 8.1 Por confirmar con backend

#### Los dos endpoints propios

| Operación      | Endpoint supuesto                                 | Body                                                                 |
| -------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| Generar líneas | `POST /general/documento/cargar-cierre/`          | `{ id, cuenta_desde_codigo, cuenta_hasta_codigo, cuenta_cierre_id }` |
| Borrar todas   | `POST /general/documento_detalle/eliminar-todos/` | `{ documento_id }`                                                   |

⚠️ **Divergencia de ruta, el riesgo más alto de esta entrega**: el borrado masivo del legacy pega a
`documento_detalle` con guion **bajo**, mientras que todo el framework de documentos de este ERP
usa `documento-detalle` con **guion** (y funciona: lo consumen pago, asiento y depreciación). Se
replicó la ruta del legacy porque es la única evidencia de que ese endpoint existe. Si el backend
solo expone la forma con guion, "Eliminar todos" responde 404 y el fix es la constante
`ELIMINAR_DETALLES_ENDPOINT`.

**La asimetría código/id de `cargar-cierre/` también es del legacy**: el rango viaja por **código**
de cuenta y el destino por **id**. Confirmar que es intencional y no un accidente heredado.

#### El serializador de las líneas

El legacy lee las líneas del cierre con `serializador=lista_detalle_cuenta`, que devuelve los campos
con doble guion bajo (`contacto__nombre_corto`, `cuenta__codigo`, `grupo__nombre` — ese "grupo" es
el centro de costo). Acá se usa el read estándar del framework (`CuentaDetalleRead`:
`contacto_nombre_corto`, `cuenta_codigo`, `centro_costo_nombre`), que cubre las mismas columnas. Confirmar que el endpoint estándar sirve
las líneas del cierre sin pedir ese serializador; si no, hay que sumar un read propio.

#### El total

El cierre **no manda `total`**. El legacy declaraba el control en el formulario, pero su
`calcularTotales()` recorría un `FormArray` de detalles que ese formulario nunca llena: siempre
viajaba en 0. Mandar un cero fabricado es peor que no mandar nada. Confirmar que el backend lo
calcula al generar las líneas.

### 8.2 Decisiones tomadas

| #   | Decisión                                                                                        | Por qué                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Cargar" y "Eliminar todos" viven en el **formulario de edición**, no en la ficha               | En este ERP la ficha es de solo lectura. Mismo criterio que "Cargar activos" de la depreciación, el otro documento que genera líneas desde el backend                                         |
| 2   | Las líneas se traen **paginadas** (`listarPaginadoPorDocumento`, 50 por página)                 | Un cierre cierra todas las cuentas de resultado del ejercicio: es el único documento que puede pasarse del tope de 1000 de `listarPorDocumento`, que además truncaría en silencio             |
| 3   | `<app-cuenta-select>` ahora expone `codigo` además de `id` y `nombre`                           | El rango del cierre viaja por código. La alternativa era recortarlo de la etiqueta (`"1105 - Caja"` → `"1105"`), el apaño que hoy usan los informes y que §2 ya marca como frágil             |
| 4   | Se reusa la tabla contable de solo lectura, sin campos nuevos                                   | Las ocho columnas del legacy (contacto, cuenta, centro de costo, naturaleza, valor, base, detalle) ya estaban cubiertas: el "grupo" del legacy es el centro de costo, que la familia ya tenía |
| 5   | La fecha 31 de diciembre **bloquea** el guardado                                                | No es una convención sino la definición del documento: no hay caso legítimo en que otra fecha sirva. A diferencia del descuadre del asiento, que sí avisa sin bloquear                        |
| 6   | La fecha **no trae valor por defecto**                                                          | Sembrar "hoy" dejaría el campo en error apenas se abre el formulario. El legacy lo hacía                                                                                                      |
| 7   | El validador compara sobre el `Date` **local** del datepicker                                   | El legacy parseaba `yyyy-MM-dd` con `new Date(...)` —que lo lee como UTC— y compensaba con `getDate() + 1`; ese truco solo acierta en zonas horarias negativas                                |
| 8   | Al crear, se navega a **editar** el documento nuevo                                             | Un cierre recién creado está vacío y cargarlo necesita su id. Mismo criterio (y mismo `extractDocumentoId` con el mismo riesgo abierto) que la depreciación — ver §7.3                        |
| 9   | Las dos acciones se deshabilitan si el documento está **aprobado o anulado**                    | Igual que el legacy                                                                                                                                                                           |
| 10  | **No** se portan el `formularioResultado` duplicado del form ni el `CierreService` de selección | Código muerto: el formulario declaraba una copia del formulario del modal que su plantilla nunca renderiza, y un servicio de selección múltiple que nadie llama                               |
| 11  | **No** se portan `getTotalDebito()` / `getTotalCredito()`                                       | La plantilla del legacy nunca los usó y, al estar las líneas paginadas, habrían sumado solo la página visible                                                                                 |
| 12  | La **importación de líneas por Excel** queda fuera                                              | `general/documento/importar-detalle/`. Mismo criterio que en el asiento (§6, punto 7): importar líneas dentro de un documento no lo hace todavía ningún documento del ERP                     |

---

## 9. Movimientos contables (consulta)

Portado desde `contabilidad/paginas/independientes/movimiento/` del ERP anterior, donde vivía en
`/contabilidad/especial/movimiento`. Vive en `features/contabilidad/movimiento/`.

Es el **libro**: la línea ya contabilizada, en una sola página de solo lectura con filtros,
importación y Excel. No es un documento ni un informe de los que se "generan", así que estrena la
sección **Movimientos** del sidebar (`layout.nav.sections.movement`, una clave que ya existía en la
i18n sin que ningún módulo la usara). URL: `/t/<slug>/contabilidad/movimientos`.

### 9.1 Por confirmar con backend

#### Cómo se consulta

El legacy hace `GET contabilidad/movimiento/?serializador=lista` con los filtros como query params.
Acá se usa la convención del ERP: `POST /contabilidad/movimiento/lista/` con
`{ filtros, ordenamientos }` y la paginación en query params, igual que todos los demás listados
(incluidos los informes de inventario, portados con el mismo criterio).

**Es el supuesto más grande de esta entrega**: si el endpoint solo responde en GET, la consulta
falla entera. El fix está aislado en `MovimientoService.list()`.

#### Exportación e importación

| Acción    | Endpoint supuesto                                | Nota                                                                                                                               |
| --------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Excel     | `POST /contabilidad/movimiento/excel/`           | Con `serializador: 'informe_movimiento'` en el body; el legacy lo mandaba como query param de un GET, junto a `excel_informe=True` |
| Importar  | `POST /contabilidad/movimiento/importar/`        | `multipart` con el archivo en `archivo`, convención de los masters                                                                 |
| Plantilla | `GET /contabilidad/movimiento/importar-ejemplo/` | El legacy **no usaba endpoint**: apuntaba a un XLSX alojado en DigitalOcean                                                        |

Si `importar-ejemplo/` no existe, el botón de plantilla del diálogo queda muerto; se apaga pasando
`exampleConfig` en modo `disabled` (o a `null` para ocultarlo).

#### Campos de la fila

`id`, `numero`, `fecha`, `comprobante__nombre`, `contacto__nombre_corto`, `cuenta__codigo`,
`grupo__nombre`, `debito`, `credito`, `base`, `detalle` — con doble guion bajo, tal como los aplana
el serializador `lista`. Salen del mapeo del legacy, no de una respuesta real.

⚠️ **`grupo__nombre` es el centro de costo** (ver §2, punto 0). Se rotula "Centro de costo" pero el
nombre del campo se conserva porque es el que espera la API. Si el backend lo renombró, esa cadena
—en `movimiento.constants.ts`, columna y filtro— es el fix.

### 9.2 Decisiones tomadas

| #   | Decisión                                                              | Por qué                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Sección **Movimientos** propia, no dentro de Informes                 | Los 9 informes contables son reportes que se generan con parámetros; esto es una lista paginada que se navega. La clave i18n ya existía sin usar                                                                               |
| 2   | El read **no se mapea**: se consumen los nombres con doble guion bajo | Es solo lectura y no hay formulario que alimentar. Un mapper que solo renombra para maquillar es código sin dueño                                                                                                              |
| 3   | **Sin fila de totales** de débito/crédito                             | La tabla pagina: sumar la página visible se leería como el total del libro. El legacy tampoco los sumaba                                                                                                                       |
| 4   | **Sin** ficha ni formulario                                           | Un movimiento lo genera la contabilización de un documento, no se teclea. Los `movimiento-formulario`/`movimiento-detalle` del legacy no los enruta nadie y su servicio pega a `contabilidad/cuenta/`: copy-paste sin terminar |
| 5   | Los valores (débito, crédito, base) **no son ordenables**             | Igual que el legacy. Ordenar el libro por importe no es una lectura contable útil                                                                                                                                              |
