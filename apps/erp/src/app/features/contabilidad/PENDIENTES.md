# Contabilidad — pendientes por revisar

Bitácora de lo que quedó **asumido o decidido** al portar el módulo de contabilidad desde el ERP
anterior. Nada se ha ejercitado contra `reddocapi.uk`: todo sale de leer el código legacy.

Cada supuesto vive además como comentario en su archivo; acá está el índice para revisarlos de una
sentada. Al confirmar uno, **bórralo de esta lista** y quita el `TODO(backend)` del código.

Las secciones §1–§5 cubren los **informes**; la §6, el **asiento contable** (primer documento
transaccional del módulo).

Estado (2026-07-28): portados **balance de prueba** (`35754f9`), **auxiliar de cuenta** (`baaa670`)
**balance de prueba por contacto** (`d531a2f`), **auxiliar general** (`da80fd3`) y **auxiliar por
Estado: **los 9 informes del ERP anterior están portados\*\* (2026-07-28). Lo común vive en
`features/contabilidad/shared/` desde `3211e91`; un informe nuevo de esta familia son ~40 líneas.

Estado (2026-07-29): portado el **asiento contable** (documento tipo 13) — ver §6.

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

#### Catálogos de la cabecera

Ninguno de los dos existe como master en este ERP; los selects pegan directo a su `seleccionar/`:

| Campo         | Endpoint supuesto                        | Nota                                                    |
| ------------- | ---------------------------------------- | ------------------------------------------------------- |
| `comprobante` | `/contabilidad/comprobante/seleccionar/` | Con el filtro `permite_asiento=True`, tomado del legacy |
| `grupo`       | `/contabilidad/grupo/seleccionar/`       | En `SELECT_ENDPOINTS.grupoContabilidad`                 |

Confirmar que ambos existen y que el filtro `permite_asiento` es un query param válido. Si no lo
es, el select de comprobante mostraría también los que no admiten asiento manual.

#### Campos nuevos de la línea contable

`numero`, `grupo` y `detalle` se sumaron a `CuentaDetallePayload` para este documento. Los nombres
salen del `FormGroup` del legacy, **no de una respuesta real**. Confirmar los tres, y en especial:

- **`grupo` viaja como FK del grupo de contabilidad** (id). El legacy mandaba el mismo control tanto
  en la cabecera (`grupo_contabilidad`) como en la línea (`grupo`) — dos nombres para lo mismo.
  Confirmar si en la línea también se llama `grupo` o si es `grupo_contabilidad`.
- **`numero` es un entero libre de la línea**, no el consecutivo del documento. En el legacy no
  validaba nada ni se mostraba en la ficha; se portó por si el backend lo espera.

⚠️ **Efecto colateral en pago y egreso**: los tres campos viven en el payload compartido, así que
ahora esos dos documentos mandan `numero: null, grupo: null, detalle: null` en cada línea. Si el
backend rechaza campos no esperados, se ve ahí primero.

#### Cabecera

`soporte`, `comprobante`, `grupo_contabilidad` y `comentario` sobre `DocumentoPayloadBase`. El
`total` viaja como **`créditos − débitos`** (en un asiento cuadrado, `"0.00"`) — es literalmente lo
que calculaba el legacy. Si el backend espera la magnitud del asiento (la suma de débitos), es un
cambio de una línea en `asiento.mapper.ts`.

#### Longitudes

`soporte` quedó con `maxLength(50)` y `detalle` de línea con `maxLength(200)`. **Son inventadas**:
el legacy no acotaba ninguno de los dos. Ajustar a lo que declare el modelo del backend.

### 6.2 Decisiones tomadas

| #   | Decisión                                                                                     | Por qué                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Los 3 campos nuevos se sumaron a la familia contable **compartida**, como columnas opt-in    | Mismo patrón que `showContacto`/`showBase`, que ya existía. Duplicar la familia para el asiento costaba ~800 líneas de mapper y tabla                                                          |
| 2   | El descuadre **avisa pero no bloquea** el guardado                                           | El legacy solo rechazaba total negativo, sin exigir cuadre. Endurecerlo a bloqueo puede dejar a un usuario sin poder guardar un asiento a medias; la validación dura es del backend al aprobar |
| 3   | El resumen suma una fila **"Diferencia"** en ámbar (`showDescuadre`), que el legacy no tenía | Sin ella el descuadre solo se ve restando a ojo dos cifras. Va opt-in: en un recaudo la diferencia _es_ el neto y no hay nada que señalar                                                      |
| 4   | **Sin** columna de centro de costo en las líneas                                             | El asiento del legacy no la imputaba (sí el pago). La columna existe en el `FormGroup`, prenderla es un input                                                                                  |
| 5   | **Sin** "agregar documento" (cruce de cartera)                                               | El asiento es manual: no cruza CxC/CxP. Las líneas que lleguen enlazadas desde backend se siguen respetando (cuenta y naturaleza bloqueadas, que ya lo resuelve la familia contable)           |
| 6   | El array `detalles_eliminados` del legacy **no se portó**                                    | Acá las líneas transaccionan contra `documento-detalle` al instante en edición; no hay bajas diferidas que reportar en el payload de la cabecera                                               |
| 7   | La **importación de líneas por Excel** queda fuera                                           | `general/documento/importar-detalle-cuenta/`. Ningún documento de este ERP tiene importación todavía (`canImport: false` en todos): construir el importador es una pieza transversal aparte    |

### 6.3 Bug del legacy que no se portó

`agregarRegistrosEliminar` buscaba el registro con `indexOf(id)` pero empujaba `posicion` (que vale
`-1` cuando no lo encuentra) en vez de `id`. El array resultante nunca se usaba al guardar: código
muerto con un bug adentro.
