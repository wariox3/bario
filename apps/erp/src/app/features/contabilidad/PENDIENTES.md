# Contabilidad — pendientes por revisar

Bitácora de lo que quedó **asumido o decidido** al portar los informes contables desde el ERP
anterior. Nada se ha ejercitado contra `reddocapi.uk`: todo sale de leer el código legacy.

Cada supuesto vive además como comentario en su archivo; acá está el índice para revisarlos de una
sentada. Al confirmar uno, **bórralo de esta lista** y quita el `TODO(backend)` del código.

Estado: **balance de prueba** portado el 2026-07-28 (`35754f9`). Faltan los otros 8 (ver §4).

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

### 1.3 Nombres de los parámetros

`fecha_desde`, `fecha_hasta`, `incluir_cierre`, `cuenta_con_movimiento`, `cuenta_desde`,
`cuenta_hasta`, `cuenta_codigo_desde`, `cuenta_codigo_hasta`.

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
| 1   | **No** se usa `<lib-data-table>`; la tabla es propia                                            | El resultado no pagina y necesita una fila de totales — dos cosas que la tabla compartida no cubre                                                                              |
| 2   | El código de cuenta se recorta de la etiqueta del selector (`"1105 - Caja general"` → `"1105"`) | `<app-cuenta-select>` solo expone `{ id, nombre }`. Es frágil: si el backend no necesita el código (§1.3) se borra; si lo necesita, mejor que el selector exponga la fila cruda |
| 3   | Solo se totalizan **débito y crédito**, no los saldos                                           | En un balance cuadrado débito y crédito coinciden: esa fila es el chequeo visual del informe. Sumar saldos mezcla naturalezas y no significa nada. El legacy hacía lo mismo     |
| 4   | La tabla distingue "sin generar" de "sin resultados"                                            | El legacy mostraba tabla vacía en los dos casos, que se lee como si el reporte hubiera fallado                                                                                  |
| 5   | El validador de fechas vive en el informe, no en un `shared/`                                   | Regla de no crear estructura preventiva. **Cuando llegue el segundo informe contable, subirlo a `features/contabilidad/shared/`** — todos comparten el mismo par de fechas      |
| 6   | `nivel` se tipa pero no se usa                                                                  | El legacy tampoco lo usaba para pintar jerarquía. Queda disponible por si se quiere indentar el plan de cuentas                                                                 |

---

## 3. Ideas para más adelante

No son deudas, son mejoras que el informe original tampoco tenía:

- **Indentar por `nivel`** para que se lea el plan de cuentas como árbol (clase → grupo → cuenta →
  subcuenta) en vez de una lista plana.
- **Marcar el descuadre**: si `totalDebito !== totalCredito`, pintarlo en rojo. Hoy hay que
  compararlos a ojo, que es justo lo que el informe existe para evitar.

---

## 4. Informes contables que faltan

Los 8 restantes del ERP anterior (`modules/contabilidad/paginas/informes/`). Todos comparten la
misma forma —`POST` con `{ parametros }` → `{ registros }`— así que reusan el esqueleto de balance
de prueba:

| Informe                                                            | Endpoint                               |
| ------------------------------------------------------------------ | -------------------------------------- |
| Balance de prueba por tercero (carpeta `balance-prueba-contacto/`) | `informe-balance-prueba-tercero/`      |
| Auxiliar de cuenta                                                 | `informe-auxiliar-cuenta/`             |
| Auxiliar por tercero                                               | `informe-auxiliar-tercero/`            |
| Auxiliar general                                                   | `informe-auxiliar-general/`            |
| Base                                                               | `informe-base/`                        |
| Certificado de retención                                           | `informe-certificado-retencion/`       |
| Estado de resultados                                               | `informe-estado-resultados/`           |
| Estado de situación financiera                                     | `informe-estado-situacion-financiera/` |
