# Contabilidad — pendientes por revisar

Bitácora de lo que quedó **asumido o decidido** al portar los informes contables desde el ERP
anterior. Nada se ha ejercitado contra `reddocapi.uk`: todo sale de leer el código legacy.

Cada supuesto vive además como comentario en su archivo; acá está el índice para revisarlos de una
sentada. Al confirmar uno, **bórralo de esta lista** y quita el `TODO(backend)` del código.

Estado (2026-07-28): portados **balance de prueba** (`35754f9`), **auxiliar de cuenta** (`baaa670`)
**balance de prueba por contacto** (`d531a2f`), **auxiliar general** (`da80fd3`) y **auxiliar por
contacto** (`e0a19eb`). Faltan los otros 4 (ver §4). Lo común vive en
`features/contabilidad/shared/` desde `3211e91`.

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

**Los dos auxiliares no ofrecen PDF** (general y por contacto): allá su método `imprimir()` estaba
comentado entero, así que el botón existía sin hacer nada. Si el endpoint sí lo sirve, se enciende
con `[showPdf]="true"`.

### 1.3 Nombres de los parámetros

Comunes: `fecha_desde`, `fecha_hasta`, `incluir_cierre`, `cuenta_con_movimiento`, `cuenta_desde`,
`cuenta_hasta`, `cuenta_codigo_desde`, `cuenta_codigo_hasta`. El balance por contacto suma
`contacto` (id).

El auxiliar general y el auxiliar por contacto suman `contacto`, `numero` y `comprobante`.

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
| 8   | `nivel` se tipa pero no se usa                                                                  | El legacy tampoco lo usaba para pintar jerarquía. Queda disponible por si se quiere indentar el plan de cuentas                                                                 |

---

## 3. Ideas para más adelante

No son deudas, son mejoras que el informe original tampoco tenía:

- **Indentar por `nivel`** para que se lea el plan de cuentas como árbol (clase → grupo → cuenta →
  subcuenta) en vez de una lista plana.
- ~~**Marcar el descuadre**~~ — hecho en `3211e91`: la fila de totales se resalta cuando débito y
  crédito no coinciden.

---

## 4. Informes contables que faltan

Los 4 restantes del ERP anterior (`modules/contabilidad/paginas/informes/`). Todos comparten la
misma forma —`POST` con `{ parametros }` → `{ registros }`— así que se montan sobre
`features/contabilidad/shared/`: declarar el endpoint, extender `InformeCuentasPageBase` y componer
el panel de parámetros con los campos extra por `ng-content`.

| Informe                        | Endpoint                               |
| ------------------------------ | -------------------------------------- |
| Auxiliar por tercero           | `informe-auxiliar-tercero/`            |
| Auxiliar general               | `informe-auxiliar-general/`            |
| Base                           | `informe-base/`                        |
| Certificado de retención       | `informe-certificado-retencion/`       |
| Estado de resultados           | `informe-estado-resultados/`           |
| Estado de situación financiera | `informe-estado-situacion-financiera/` |

---

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
