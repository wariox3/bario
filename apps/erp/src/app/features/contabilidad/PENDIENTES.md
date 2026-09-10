# Contabilidad — pendientes por revisar

Bitácora de lo que quedó **asumido o decidido** al portar el módulo de contabilidad desde el ERP
anterior. Nada se ha ejercitado contra `reddocapi.uk`: todo sale de leer el código legacy.

Cada supuesto vive además como comentario en su archivo; acá está el índice para revisarlos de una
sentada. Al confirmar uno, **bórralo de esta lista** y quita el `TODO(backend)` del código.

Las secciones §1–§5 cubren los **informes**; §6–§8, los documentos transaccionales (**asiento
contable**, **depreciación** y **cierre**); §9, la consulta de **movimientos**; §10, la
**conciliación bancaria**; §11, el diálogo **Contabilidad** de las fichas de detalle.

Estado (2026-07-28): portados **balance de prueba** (`35754f9`), **auxiliar de cuenta** (`baaa670`)
**balance de prueba por contacto** (`d531a2f`), **auxiliar general** (`da80fd3`) y **auxiliar por
Estado: **los 9 informes del ERP anterior están portados\*\* (2026-07-28). Lo común vive en
`features/contabilidad/shared/` desde `3211e91`; un informe nuevo de esta familia son ~40 líneas.

Estado (2026-07-29): portados el **asiento contable** (documento tipo 13, §6), la **depreciación**
(documento tipo 23, §7), el **cierre contable** (documento tipo 25, §8), la consulta de
**movimientos** (§9) y la **conciliación bancaria** (§10).

Estado (2026-09-04): el **balance de prueba** migró al contrato nuevo
(`/contabilidad/movimiento-informe/`) y salió de la familia vieja. Ver §0.

Estado (2026-09-07): el schema del backend **cambió** después de esa migración —columnas
renombradas, jerarquía nueva con `tipo`, sin `incluir_cierre`— así que el balance de prueba se
realineó y lo común se extrajo a `shared/movimiento-informe.*`. Sobre esa base migró también el
**auxiliar general**, el **balance de prueba por contacto**, el **auxiliar de cuenta** y el
**auxiliar por contacto**. Ver §0. Con eso migraron **los cinco informes jerárquicos** y quedaron
sin uso la tabla `<app-saldos-cuenta-table>` y los tipos de fila de la familia vieja, que se
borraron.

Migraron también el **informe base** —con él la tabla compartida pasó a recibir sus **columnas de
importe como dato**, porque los cuatro planos no comparten ninguna entre sí— y el **certificado de
retención**, que **no necesitó ningún cambio en la tabla**: configuración pura.

Migraron por último los **dos estados financieros**. El de resultados estrenó la pieza que le
faltaba a la tabla —`[showUbicacion]`, clase y grupo en columnas— y con eso quedó **cerrada**: el
enum del backend tiene 9 informes y ninguno pide nada más.

**Están los 9.** La familia vieja se borró entera (`informe-cuentas.*`, su page base, su panel de
parámetros y `<app-estado-financiero-table>`); §1–§5 quedan como **registro histórico** de cómo era
y ya no describen nada del código. Sobrevivieron dos cosas que no eran suyas: los validadores de
rango de fechas, que pasaron a `rango-fechas.validators.ts` porque también los usa
`descontabilizar-modal`, y la botonera, renombrada a `<app-movimiento-informe-actions>`.

---

## 0. Familia nueva de informes — `/contabilidad/movimiento-informe/`

Confirmado contra el **schema del contenedor**: `GET https://reddocapi.uk/api/contenedor/schema/`
sirve el OpenAPI con todas las rutas del tenant. Ahí está declarado todo lo de abajo.

Es el **punto único de informes agregados** sobre el movimiento contable. Tres acciones con el
**mismo body**:

| Acción     | Qué devuelve                                   |
| ---------- | ---------------------------------------------- |
| `lista/`   | El informe **paginado** (`{ count, results }`) |
| `excel/`   | El XLSX del informe completo                   |
| `totales/` | Los totales de cuadre, sin paginar             |

Body (`InformeContabilidadRequestRequest`):

```json
{
  "informe": "auxiliar_general",
  "fecha_desde": "2026-09-01",
  "fecha_hasta": "2026-09-30",
  "solo_con_saldo": true,
  "filtros": [
    { "propiedad": "cuenta__codigo", "operador": ">=", "valor": "1105" },
    { "propiedad": "cuenta__codigo", "operador": "<=", "valor": "1199", "operador_logico": "AND" }
  ]
}
```

Lo que dice el backend y define las páginas:

- `informe`, `fecha_desde` y `fecha_hasta` son **obligatorios**. El enum `informe` ya trae los
  **nueve**: `balance_prueba`, `balance_prueba_contacto`, `auxiliar_cuenta`, `auxiliar_contacto`,
  `auxiliar_general`, `bases`, `certificado_retencion`, `estado_resultados` y
  `estado_situacion_financiera`. Los 7 que faltan pueden migrar cuando se quiera.
- Cinco son **jerárquicos** (los del plan de cuentas) y cuatro son **planos**, sin jerarquía,
  subtotales ni `solo_con_saldo`.
- Los `filtros` son los **dinámicos genéricos** del ERP y se aplican **antes de agrupar**, así que
  acotan por igual el saldo anterior, el movimiento del rango y el detalle.
- **No acepta `ordenamientos`**: el informe sale siempre por código de cuenta. Dentro de una cuenta
  el orden lo fija el informe, y reordenar por encima despegaría el detalle de su cuenta.
- `solo_con_saldo` (default del backend: **`false`**) omite las cuentas que quedan en ceros en las
  cuatro columnas, con su detalle. El front lo arranca en `true` y lo manda siempre explícito.
- **Todavía no hay PDF** en esta familia: el schema declara solo `lista/`, `excel/` y `totales/`,
  y el body no admite bandera de formato. La descarga está armada en el front y llega apagada;
  se enciende por informe con `soportaPdf`. Está pedido al backend — ver el pendiente de abajo.

### Las filas vienen **jerarquizadas**

Es lo que más condiciona la pantalla. `lista/` no devuelve una lista plana de cuentas: intercala las
filas de subtotal de clase, grupo y cuenta antes de cada auxiliar, y después su detalle. El campo
**`tipo`** es lo único que las distingue:

| `tipo`                                  | Qué es                                                     |
| --------------------------------------- | ---------------------------------------------------------- |
| `CLASE`, `GRUPO`, `CUENTA`, `SUBCUENTA` | Subtotales del plan. `cuenta_id` viene en `null`           |
| `AUXILIAR`                              | La cuenta de movimiento. **La única que trae `cuenta_id`** |
| `TERCERO`, `MOVIMIENTO`                 | El detalle que cuelga del auxiliar, según el informe       |

Dos consecuencias que ya costaron un bug cada una:

1. **No se puede trackear por `cuenta_id`** en el `@for`: los subtotales lo traen `null` y Angular
   rechaza las claves duplicadas. Va `track $index`.
2. **No se pueden sumar las filas** para sacar totales: los subtotales y el detalle están hechos de
   los auxiliares, así que sumarlo todo multiplicaría el balance. Por eso `totales/` existe y suma
   **solo las de tipo `AUXILIAR`**.

### Columnas por informe

Los montos siempre como **string decimal** (`"120600.000000"`); `formatCop` los normaliza.

| Informe                   | Campos de `lista/`                               |
| ------------------------- | ------------------------------------------------ |
| `balance_prueba`          | `tipo, cuenta_id, codigo, nombre` + los 4 saldos |
| `balance_prueba_contacto` | + `contacto_id, identificacion, contacto`        |
| `auxiliar_cuenta`         | balance + `movimiento_id`                        |
| `auxiliar_contacto`       | contacto + `movimiento_id`                       |
| `auxiliar_general`        | + `comprobante, numero, fecha`                   |

Los 4 saldos son `saldo_anterior`, `debito`, `credito`, `saldo_final`. `totales/` devuelve esos
mismos cuatro.

### Cómo está implementado

Lo común vive en `shared/movimiento-informe.*` y sirve a los dos informes ya migrados:

| Pieza                             | Qué aporta                                                      |
| --------------------------------- | --------------------------------------------------------------- |
| `movimiento-informe.types.ts`     | `InformeId`, `InformeFilaTipo`, las tres filas, totales, params |
| `movimiento-informe.service.ts`   | Base: las 3 acciones. Un informe = declarar su `informe`        |
| `movimiento-informe.utils.ts`     | Formulario, filtros del rango de cuentas, body                  |
| `movimiento-informe-page.base.ts` | Generar, paginar, Excel, `generated`, `paramsStale`, migas      |
| `<app-movimiento-informe-params>` | Periodo + rango de cuentas + `solo_con_saldo`, con `ng-content` |
| `<app-movimiento-informe-table>`  | La jerarquía marcada por `tipo`, totales, paginador             |

Un informe de esta familia son ~30 líneas: el servicio con su discriminador y la página con su
nombre, su archivo y qué bloques de columnas enciende (`showContacto`, `showMovimiento`).

### Decisiones

| #   | Decisión                                                                     | Por qué                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | La familia **sale** de `InformeCuentasService` / `InformeCuentasPageBase`    | La base vieja asume `{ parametros }` y el informe entero en una respuesta. Acá pagina y los totales vienen aparte                                                                      |
| 2   | Tabla propia, no `<app-saldos-cuenta-table>`                                 | El contrato renombró las columnas, manda strings y **suma la jerarquía**, que aquella tabla no sabe pintar                                                                             |
| 3   | Panel de parámetros propio                                                   | El panel viejo ata por `formControlName` dos banderas que acá no existen (`incluir_cierre` y `cuenta_con_movimiento`)                                                                  |
| 4   | Los totales del pie salen de `totales/`, no de sumar las filas               | Con el informe paginado _y_ con subtotales intercalados, sumar lo que se ve mentiría dos veces                                                                                         |
| 5   | `operador_logico` se sumó a `FilterCondition`/`BackendFilter` en `libs/core` | Es del contrato general de `lista/` (AND por defecto, evaluación secuencial), no de este informe                                                                                       |
| 6   | El rango de cuentas lee `option.codigo` del selector                         | El filtro viaja por `cuenta__codigo`. `<app-cuenta-select>` ya expone el código suelto                                                                                                 |
| 7   | Se quitó `incluir_cierre` de la pantalla                                     | Ya no está en el request del schema y el backend **decidió** el tratamiento: los asientos de cierre entran al saldo anterior pero nunca al rango ni al detalle. Un checkbox ahí mentía |
| 8   | Auxiliar general también exige **mismo año**                                 | El contrato nuevo le calcula `saldo_anterior` contra la apertura del ejercicio, cosa que el informe del ERP anterior no hacía                                                          |

### Queda pendiente

- [ ] **Pedirle al backend la acción `POST /contabilidad/movimiento-informe/pdf/`** (2026-09-09).
      Simétrica a `excel/`: mismo `InformeContabilidadRequestRequest` de body, respuesta
      `application/pdf` con `Content-Disposition`. Verificado contra
      `GET https://reddocapi.uk/api/contenedor/schema/`: la acción no existe y la única respuesta
      PDF de todo el schema del tenant es `/general/documento/imprimir/`, que es para documentos.

      Quien lo necesita es el **certificado de retención**, el único de los nueve que en el ERP
      anterior imprimía de verdad: pegaba a `contabilidad/movimiento/informe-certificado-retencion/`
      (API vieja, `reddocapi.xyz`) con `pdf: true` y los mismos parámetros de la consulta. Ese
      endpoint no existe en la API nueva.

      Lo que hay que aclarar con ellos, porque cambia la pantalla:

      1. Si prefieren una bandera de formato en el body en vez de una acción aparte.
      2. Si el PDF es la tabla del informe impresa o el **certificado fiscal formal** por tercero
         (emisor, periodo, firma). El nombre sugiere lo segundo.
      3. Si es lo segundo, qué pasa **sin `contacto_id`**: un PDF por tercero, uno solo con todos, o
         el tercero pasa a ser obligatorio. En ese caso el botón deja de ser un flag y pasa a
         depender del formulario.
      4. Si la acción aplica a los nueve informes o solo a este.

      El front ya está listo: `pdfUrl` en `MovimientoInformeService`, `exportPdf()` y
      `isExportingPdf` en la page base, y los nueve templates enlazados. Encenderlo es poner
      `soportaPdf` en `true` en el informe que el backend confirme.

- [ ] **Confirmar la forma de la fila de `auxiliar_general` contra el API real.** El schema solo
      declara `ConMovimientoInformeBalance` (drf-spectacular emitió únicamente el serializer por
      defecto), así que los nombres `contacto_id`, `identificacion`, `contacto`, `movimiento_id`,
      `comprobante`, `numero` y `fecha` salen de la tabla que pasó backend, no del OpenAPI. Ninguno
      aparece en el schema.
- [x] **La whitelist de `campos_filtrables` del informe** — confirmada con backend (2026-09-07):

      | Parámetro   | `propiedad`      | Operador |
      | ----------- | ---------------- | -------- |
      | Contacto    | `contacto_id`    | `=`      |
      | Número      | `numero`         | `=`      |
      | Comprobante | `comprobante_id` | `=`      |

      **El informe declara su propia whitelist y no espeja la de
      `/contabilidad/movimiento/lista/`**, aunque filtren el mismo queryset. Se intentó deducirla de
      allá (`contacto__numero_identificacion`, `comprobante__nombre`) y no funciona: acá las
      relaciones van por **id con sufijo `_id`**.

      Ojo con la asimetría, que es la trampa real: al **escribir** un movimiento las FK van **sin**
      sufijo (`contacto`, `comprobante`, `cuenta`, como las declara `ConMovimiento` en el schema),
      pero al **filtrar** este informe llevan `_id`. Y la cuenta no sigue ninguna de las dos: va por
      la ruta ORM `cuenta__codigo`, porque el rango se acota por código y no por id. La lista es
      explícita, no un patrón — una entrada nueva hay que preguntarla, no inferirla.

      Todo vive en `INFORME_FILTER_FIELD` (`shared/movimiento-informe.utils.ts`) y está fijado por
      `movimiento-informe.utils.spec.ts`, que compara el body emitido contra el ejemplo de backend.

- [ ] **Confirmar `centro_costo_id`.** El estado de resultados acota por centro de costo con esa
      `propiedad`, deducida de la convención de las otras dos FK del informe (`contacto_id`,
      `comprobante_id`), que backend sí confirmó — pero `centro_costo` no estaba en esa lista. Si no
      está en la whitelist, el informe sale **sin filtrar** y no da error, igual que pasó con
      `contacto__numero_identificacion`. El fix es `INFORME_FILTER_FIELD.centroCostoId`, y el caso
      está fijado en `movimiento-informe.utils.spec.ts`.
- [ ] **Si `limit` se respeta.** Backend habló de "25 por página, `?page=N`" y solo mencionó `page`;
      el front manda además `limit` y la tabla ofrece el dropdown 10/25/50/100. Si el endpoint lo
      ignora, el dropdown no hace nada.
- [ ] **Paginar un árbol.** Con 25 filas por página, la página 2 puede empezar a mitad de una cuenta,
      sin las filas de subtotal que le dan contexto. Falta decidir si se resuelve en el front
      (repetir la cabecera del auxiliar en curso) o si backend puede paginar por auxiliar.
- [ ] Que backend sume el PDF, o confirmar que no va.
- [ ] **Que `auxiliar_cuenta` sume `comprobante` y `numero`.** Hoy sus filas de detalle solo traen
      `movimiento_id`, así que un asiento se identifica por su id de base de datos y nada más. La
      pantalla enciende la columna del id para que al menos se pueda buscar en la consulta de
      movimientos (que lista por `id`), pero es una columna técnica: quien lee un auxiliar busca el
      comprobante y el número, que el `auxiliar_general` sí trae. Preguntar si es intencional.
      **Aplica igual a `auxiliar_contacto`**, que tiene el mismo hueco.

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

El auxiliar por contacto suma `contacto`, `numero` y `comprobante`. (El **auxiliar general** ya no
está en esta familia: migró al contrato nuevo, ver §0.)

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

| #   | Decisión                                                                                        | Por qué                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No** se usa `<lib-data-table>`; la tabla es propia (`<app-saldos-cuenta-table>`)              | El resultado no pagina y necesita una fila de totales — dos cosas que la tabla compartida no cubre                                                                                                                                                                                    |
| 2   | El código de cuenta se recorta de la etiqueta del selector (`"1105 - Caja general"` → `"1105"`) | `<app-cuenta-select>` solo expone `{ id, nombre }`. Es frágil: si el backend no necesita el código (§1.3) se borra; si lo necesita, mejor que el selector exponga la fila cruda                                                                                                       |
| 3   | Solo se totalizan **débito y crédito**, no los saldos                                           | En un balance cuadrado débito y crédito coinciden: esa fila es el chequeo visual del informe. Sumar saldos mezcla naturalezas y no significa nada. El legacy hacía lo mismo                                                                                                           |
| 4   | La tabla distingue "sin generar" de "sin resultados"                                            | El legacy mostraba tabla vacía en los dos casos, que se lee como si el reporte hubiera fallado                                                                                                                                                                                        |
| 5   | Lo común vive en `features/contabilidad/shared/` (hecho al llegar el segundo informe)           | Servicio base, base de página, panel de parámetros, tabla, botonera y validadores. Cada informe queda en poco más que su endpoint, su nombre y el del archivo                                                                                                                         |
| 6   | ~~El balance por contacto va **sin fila de totales**~~ — **recuperada** al migrar (§0)          | La razón era que el front sumaba las filas recibidas y, con la cuenta repetida por contacto, el total no significaba nada. En el contrato nuevo los totales los da `totales/`, que suma **solo las filas `AUXILIAR`**: el desglose por tercero no entra, así que el cuadre es el real |
| 7   | Las tres acciones usan el endpoint del propio informe                                           | El PDF del balance por contacto pegaba a `informe-balance-prueba/` en vez de `-tercero/`: descargaba el informe equivocado. Bug del original, corregido acá                                                                                                                           |
| 8   | El informe _base_ tiene **tabla propia** (`<app-base-movimientos-table>`)                       | No comparte ni una columna de saldos con sus hermanos: no hay saldo anterior ni actual, y sí `base` y `detalle`                                                                                                                                                                       |
| 9   | El informe _base_ **suma fila de totales**, que el original no tenía                            | En un informe de base gravable el total es justo el dato que se busca (es lo que se declara). Sin él había que exportar a Excel para conocerlo. Al migrar (§0) los totales pasaron a venir de `totales/`, que devuelve `debito`, `credito` y `base`                                   |
| 10  | Los estados financieros **no ofrecen rango de cuentas ni banderas**                             | Su plantilla original tampoco los renderizaba (los controles existían muertos). Un estado financiero cubre las clases que le corresponden, no un rango elegido a mano                                                                                                                 |
| 11  | Los estados financieros van **sin fila de totales**                                             | El saldo mezcla cuentas de naturaleza contraria (ingresos/gastos, activo/pasivo): una suma cruda no es la utilidad ni el patrimonio. Calcularla bien es trabajo del backend                                                                                                           |
| 12  | `nivel` se tipa pero no se usa                                                                  | El legacy tampoco lo usaba para pintar jerarquía. Queda disponible por si se quiere indentar el plan de cuentas                                                                                                                                                                       |

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

| Informe                        | Endpoint                   | Parámetros                | Tabla                         | PDF |
| ------------------------------ | -------------------------- | ------------------------- | ----------------------------- | --- |
| Balance de prueba              | `movimiento-informe/` (§0) | periodo + rango + filtros | propia (jerárquica, paginada) | no  |
| Balance de prueba por contacto | `movimiento-informe/` (§0) | periodo + rango + filtros | propia (jerárquica, paginada) | no  |
| Auxiliar de cuenta             | `movimiento-informe/` (§0) | periodo + rango + filtros | propia (jerárquica, paginada) | no  |
| Auxiliar por contacto          | `movimiento-informe/` (§0) | periodo + rango + filtros | propia (jerárquica, paginada) | no  |
| Auxiliar general               | `movimiento-informe/` (§0) | periodo + rango + filtros | propia (jerárquica, paginada) | no  |
| Base                           | `movimiento-informe/` (§0) | periodo + rango + filtros | compartida (plana, paginada)  | no  |
| Certificado de retención       | `movimiento-informe/` (§0) | periodo + rango + filtros | compartida (plana, paginada)  | no  |
| Estado de resultados           | `movimiento-informe/` (§0) | solo periodo              | compartida (plana, paginada)  | no  |
| Estado de situación financiera | `movimiento-informe/` (§0) | solo periodo              | compartida (plana, paginada)  | no  |

> "Completos" = periodo + rango de cuentas + las dos banderas.

Para agregar uno nuevo de esta familia: declarar el servicio con su endpoint
(`extends InformeCuentasService`), extender `InformeCuentasPageBase` con `nombre` y `archivo`, y
componer en la plantilla `<app-informe-cuentas-params>` (con los campos extra por `ng-content`),
`<app-movimiento-informe-actions>` y la tabla que corresponda.

## 5. ~~Duda funcional abierta: el auxiliar de cuenta~~ — cerrada al migrar (§0)

El informe original de **auxiliar de cuenta** devuelve y pinta **exactamente las mismas columnas de
saldos que el balance de prueba**. De un "auxiliar" uno esperaría el **detalle de movimientos** por
cuenta (comprobante, número, fecha, detalle, débito, crédito, saldo corrido).

Indicios de que allá quedó a medio hacer:

- Su formulario declara controles `comprobante`, `cuenta` y `contacto` que la plantilla **nunca
  renderiza**.
- Su botón de PDF manda un body distinto al de Excel (`_parametrosConsulta` con
  `modelo: 'ConMovimiento'`, `filtros`, `limite`… en vez de `{ parametros }`).
- Quedó un `console.log` en el método de consulta.

Se portó **lo que hace**, no lo que promete el nombre.

**Resuelto (2026-09-07)**: el contrato nuevo sí sirve el detalle —`auxiliar_cuenta` cuelga una fila
por asiento de cada auxiliar del plan— y la pantalla ya migró, así que el auxiliar por fin es un
auxiliar. Queda un resto: esas filas solo traen `movimiento_id`, sin comprobante ni número (ver el
pendiente en §0). Lo mismo aplicaba a _auxiliar por tercero_, que todavía no migra.

---

## 5.1 Consulta de movimientos: cuatro columnas que no leían nada (2026-09-07) — **corregido 2026-09-08**

Detectado al revisar de dónde salía la confusión entre _grupo_ y _centro de costo_.

`movimiento.constants.ts` declaraba las columnas de la tabla con **rutas ORM** (`a__b`), pero
`<lib-data-table>` resuelve el valor con `row[field]` **plano**, y el serializer `ConMovimiento`
devuelve los campos con un solo guion bajo. Ninguna de estas cuatro coincidía:

| La columna usaba         | El serializer devuelve  |
| ------------------------ | ----------------------- |
| `comprobante__nombre`    | `comprobante_nombre`    |
| `cuenta__codigo`         | `cuenta_codigo`         |
| `grupo__nombre`          | `centro_costo_nombre`   |
| `contacto__nombre_corto` | `contacto_nombre_corto` |

Las cuatro salían **vacías**. Encajaba con que el módulo nunca se ejercitó contra `reddocapi.uk`.
Ya están renombradas contra el schema, en `MOVIMIENTO_COLUMNS`, en `CONTABILIDAD_DIALOG_COLUMNS`
—el diálogo del documento lee el mismo recurso— y en la interfaz `Movimiento` de
`core/contabilidad`. El filtro por centro de costo pasó de `grupo__nombre` a `centro_costo__nombre`.

Ojo: **los `__` sí corresponden en `MOVIMIENTO_FILTER_FIELDS`** —ahí son rutas ORM y el backend las
espera así—; el problema era solo en las columnas, que son lectura del JSON.

**No confundir con el `grupo` de los estados financieros**, que es el segundo nivel del plan de
cuentas (`ConCuenta.cuenta_grupo`), no el centro de costo. Son dos cosas distintas con el mismo
nombre.

**Sin verificar todavía**: el ordenamiento. `ColumnDef` no tiene `sortField`, así que el `field`
sirve para leer la fila **y** para ordenar; las columnas de comprobante, cuenta y centro de costo
son `sortable` y ahora mandan el alias plano. Si el backend solo ordena por ruta ORM, hay que
separar los dos usos.

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

| #   | Decisión                                                                                     | Por qué                                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | El **"grupo" del legacy es el centro de costo** (`centro_costo`)                             | Vocabulario del ERP anterior, ya resuelto así en los documentos de compra. Aplica a la cabecera y a la línea de los tres documentos contables (§6, §7, §8)                                                                                                                  |
| 1   | Los 2 campos nuevos se sumaron a la familia contable **compartida**, como columnas opt-in    | Mismo patrón que `showContacto`/`showBase`, que ya existía. Duplicar la familia para el asiento costaba ~800 líneas de mapper y tabla                                                                                                                                       |
| 2   | El descuadre **avisa pero no bloquea** el guardado                                           | El legacy solo rechazaba total negativo, sin exigir cuadre. Endurecerlo a bloqueo puede dejar a un usuario sin poder guardar un asiento a medias; la validación dura es del backend al aprobar                                                                              |
| 3   | El resumen suma una fila **"Diferencia"** en ámbar (`showDescuadre`), que el legacy no tenía | Sin ella el descuadre solo se ve restando a ojo dos cifras. Va opt-in: en un recaudo la diferencia _es_ el neto y no hay nada que señalar                                                                                                                                   |
| 4   | **Sin** columna de centro de costo en las líneas                                             | El asiento del legacy no la imputaba (sí el pago). La columna existe en el `FormGroup`, prenderla es un input                                                                                                                                                               |
| 5   | **Sin** "agregar documento" (cruce de cartera)                                               | El asiento es manual: no cruza CxC/CxP. Las líneas que lleguen enlazadas desde backend se siguen respetando (cuenta y naturaleza bloqueadas, que ya lo resuelve la familia contable)                                                                                        |
| 6   | El array `detalles_eliminados` del legacy **no se portó**                                    | Acá las líneas transaccionan contra `documento-detalle` al instante en edición; no hay bajas diferidas que reportar en el payload de la cabecera                                                                                                                            |
| 7   | La **importación de líneas por Excel** queda fuera                                           | `general/documento/importar-detalle-cuenta/`. El ERP tiene diálogo de importación (`ImportDialogComponent`, lo usan los masters), pero importar **líneas dentro de un documento** es otra cosa: ningún documento lo hace (el framework de documentos no expone importación) |

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
| Borrar todas   | `POST /general/documento-detalle/eliminar-todos/` | `{ documento_id }`                                                   |

La ruta va con **guion** (`documento-detalle`), la convención de endpoints de este ERP, aunque el
legacy la nombre con guion bajo. Lo que sigue siendo supuesto es que la acción `eliminar-todos/`
exista: sale del legacy y no se pudo verificar.

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

`id`, `numero`, `fecha`, `comprobante_nombre`, `contacto_nombre_corto`, `cuenta_codigo`,
`centro_costo_nombre`, `debito`, `credito`, `base`, `detalle` — con **un solo** guion bajo, los
alias del serializer `ConMovimiento` (verificados contra el schema, 2026-09-08). Estaban tipados
con doble guion bajo, portados del mapeo del legacy; ver §5.1.

⚠️ **`centro_costo_nombre` es el centro de costo** (ver §2, punto 0), que el ERP anterior llamaba
`grupo`. El filtro sí va como ruta ORM: `centro_costo__nombre`.

### 9.2 Decisiones tomadas

| #   | Decisión                                                              | Por qué                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Sección **Movimientos** propia, no dentro de Informes                 | Los 9 informes contables son reportes que se generan con parámetros; esto es una lista paginada que se navega. La clave i18n ya existía sin usar                                                                               |
| 2   | El read **no se mapea**: se consumen los nombres con doble guion bajo | Es solo lectura y no hay formulario que alimentar. Un mapper que solo renombra para maquillar es código sin dueño                                                                                                              |
| 3   | **Sin fila de totales** de débito/crédito                             | La tabla pagina: sumar la página visible se leería como el total del libro. El legacy tampoco los sumaba                                                                                                                       |
| 4   | **Sin** ficha ni formulario                                           | Un movimiento lo genera la contabilización de un documento, no se teclea. Los `movimiento-formulario`/`movimiento-detalle` del legacy no los enruta nadie y su servicio pega a `contabilidad/cuenta/`: copy-paste sin terminar |
| 5   | Los valores (débito, crédito, base) **no son ordenables**             | Igual que el legacy. Ordenar el libro por importe no es una lectura contable útil                                                                                                                                              |

---

## 10. Conciliación bancaria

Portada desde `contabilidad/paginas/independientes/conciliacion/` del ERP anterior, donde vivía en
`/contabilidad/especial/conciliacion`. Vive en `features/contabilidad/utilidades/conciliacion/`,
junto a Contabilizar.

Es la primera pieza del módulo que **no** es documento ni consulta: un master con endpoint propio
(camino B) más un proceso encima. Una conciliación es una cuenta bancaria y un periodo, y de ella
cuelgan dos colecciones que se cruzan: el **libro** (`conciliacion-detalle`) y el **extracto** del
banco (`conciliacion-soporte`).

El flujo: crear → cargar el libro → importar el extracto en Excel → **Conciliar**, que cruza ambos
lados y marca `estado_conciliado` en cada fila.

### 10.1 Por confirmar con backend

#### Los endpoints hijos

`contabilidad/conciliacion-detalle/` y `contabilidad/conciliacion-soporte/`. El legacy los nombra con
guion bajo; acá van con **guion**, la convención de endpoints de este ERP.

Que existan sigue siendo supuesto —salen del legacy—, pero la forma del nombre ya no está en duda.

#### Las operaciones

| Operación         | Endpoint supuesto                             | Body                                     |
| ----------------- | --------------------------------------------- | ---------------------------------------- |
| Cargar libro      | `POST …/conciliacion-detalle/cargar/`         | `{ conciliacion_id }`                    |
| Limpiar libro     | `POST …/conciliacion-detalle/limpiar/`        | `{ conciliacion_id }`                    |
| Importar extracto | `POST …/conciliacion-soporte/cargar-soporte/` | multipart: `archivo` + `conciliacion_id` |
| Limpiar extracto  | `POST …/conciliacion-soporte/limpiar/`        | `{ conciliacion_id }`                    |
| Conciliar         | `POST …/conciliacion/conciliar/`              | `{ id }`                                 |

**Sobre `conciliar/`**: no se sabe si es idempotente (¿se puede correr dos veces?) ni si desmarca lo
que dejó de cuadrar al recargar el libro. El legacy solo recargaba la tabla después. Acá se refrescan
las dos pestañas, porque el cruce toca ambas colecciones.

#### Cómo se listan las colecciones hijas

Con **GET y `conciliacion_id`** (más `page`, `limit` y `ordering=id`), que es lo que hace el legacy y
también lo que hace `DocumentoDetalleService` con las líneas de un documento: ahí las dos
convenciones coinciden. El master, en cambio, se lista con el `POST …lista/` del ERP.

Como los endpoints hijos son GET, sus filtros viajan como query params planos (`campo=valor`), no
como `{ filtros }`. El helper `toQueryFilters` solo traduce el operador de igualdad — alcanza para el
único filtro que se ofrece (estado conciliado); si mañana se ofrecen más, hay que ampliarlo.

#### La plantilla del extracto

El legacy no usaba endpoint: apuntaba a un XLSX alojado en DigitalOcean. El botón "Descargar
ejemplo" del diálogo se muestra **deshabilitado**, con el motivo a la vista, hasta que el backend
exponga uno. Al confirmarlo, es cambiar `exampleConfig` a `{ mode: 'enabled', endpoint }`.

#### Otros

- `general/cuenta-banco/seleccionar/` para el select de la cabecera: el legacy lo nombra con guion
  bajo; acá va con guion, como todos los endpoints y como ya lo consume el pago de cartera.
- Los Excel de las dos tablas van con `{ conciliacion_id, serializador: 'excel' }`.
- Campos de las filas (`documento__documento_tipo__nombre`, `cuenta__codigo`…): aplanados con doble
  guion bajo, tomados del legacy.

### 10.2 Decisiones tomadas

| #   | Decisión                                                                         | Por qué                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | El **formulario de edición** es el banco de trabajo; la ficha es de solo lectura | En este ERP la ficha no muta nada. Mismo criterio que la depreciación y el cierre. La ficha monta las mismas dos pestañas con `canOperate` apagado             |
| 2   | Sección **Utilidades**, junto a Contabilizar                                     | Es lo más parecido que hay: un proceso periódico que el contador ejecuta                                                                                       |
| 3   | **Pestañas** para libro y extracto                                               | Dos tablas paginadas de 25 filas apiladas hacen una página larguísima. Es lo que hace el legacy y ya lo usan Configuración y Enviar factura electrónica        |
| 4   | Cada pestaña es **un componente con `canOperate`**                               | El formulario y la ficha montan el mismo componente sin duplicar carga, paginación ni filtrado                                                                 |
| 5   | Tras conciliar, el padre **fuerza recargar la otra pestaña** (`reloadToken`)     | El cruce marca `estado_conciliado` en las dos colecciones: dejar la otra sin refrescar mostraría datos viejos                                                  |
| 6   | Al crear, se navega a **editar** el registro nuevo                               | Una conciliación recién creada está vacía y el proceso necesita su id. Mismo criterio que la depreciación y el cierre                                          |
| 7   | El validador de rango vive **en el grupo**, no en un campo                       | Compara dos controles. Su error se pinta aparte, debajo de los tres campos, porque no pertenece a ninguno                                                      |
| 8   | **No** se portan los botones PDF y Aprobar de la ficha                           | Sus métodos están vacíos en el legacy (`aprobar() {}`), igual que `generar()`, `desgenerar()` y `notificar()`                                                  |
| 9   | **No** se porta la selección múltiple de las dos tablas internas                 | Está comentada entera en el legacy —checkboxes, `toggleSelectAll`, `eliminarRegistros`— junto con el `eliminarSoporte(id)` del servicio, que ya no llama nadie |
| 10  | **No** se porta el estado de nómina del componente de detalle                    | `cargandoEmpleados$`, `busquedaContrato` y un `localStorage.removeItem('documento_programacion')` en el `ngOnDestroy`: copy-paste de la programación de nómina |
| 11  | Las etiquetas heredadas mal se corrigen                                          | La lista declaraba `[modelo]="'NOMINA'"` y el importador de extractos `modelo: 'HumAdicional'`                                                                 |

---

## 11. Diálogo "Contabilidad" de las fichas de detalle

Portado desde el botón **Contabilidad** del `documento-opciones` legacy (dropdown "Opciones" de
las 25 fichas de detalle). Vive en `core/components/contabilidad-dialog/` y lo abre el menú
"Opciones → Contabilidad" de `DocumentDetailActionsComponent`, igual que "Archivos".

Qué hace: lista el libro contable del documento (paginado), suma débitos y créditos cuando todas
las líneas están a la vista y avisa si no cuadran, exporta el libro a Excel y ofrece
**contabilizar** o **descontabilizar** según `estado_contabilizado` de la cabecera. Tras la acción
recarga el libro y avisa a la ficha (`contabilizacionChanged`) para que recargue su cabecera.

Estado (2026-09-07): mecanismo listo y **cableado en las 19 fichas que se contabilizan** —cada una
pasa `[contabilizado]` desde su cabecera y escucha `(contabilizacionChanged)` para recargarla—. Lo
apagan con `[showContabilidad]="false"` las fichas de **inventario** (el legacy hacía lo mismo con
`permiteContabilizar=false`) y las dos **plantillas recurrentes**, que no se contabilizan: de ellas
nacen las facturas, que sí.

### 11.1 Por confirmar con backend

| Acción | Supuesto                                                   | Nota                                                                                                                                                                                    |
| ------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Excel  | `serializador: 'informe_movimiento'` en el body del `POST` | Mismo supuesto que la consulta del libro (§9): el legacy lo mandaba como query param de un `GET`                                                                                        |
| Libro  | Los nombres de campo de la respuesta llevan **doble** `_`  | El legacy lee este mismo recurso con uno solo (`contacto_nombre_corto`, `cuenta_codigo`…), pero por `GET`, no por `lista/`. Si salieran vacías, se renombran en `Movimiento` (un lugar) |

**Confirmado:**

- El filtro del libro es `documento` —la FK—, no `documento_id` (lo confirmó el equipo de backend):
  `POST /contabilidad/movimiento/lista/` con `{"propiedad": "documento", "operador": "=", "valor": <id>}`.
- `POST /general/documento/contabilizar/` y `descontabilizar/` reciben `{ ids }` — así los llama el ERP
  anterior, que consume este mismo backend (`comun/services/documento/documento.service.ts`), tanto en
  masa como para una sola ficha. Ambas acciones pasan por `DocumentoContabilizacionService`
  (`core/contabilidad/`), compartido con la utilidad **Contabilizar**.

### 11.2 Decisiones tomadas

| #   | Decisión                                                                | Por qué                                                                                                                |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | El diálogo **hace su HTTP** (vive en `core/`)                           | Mismos endpoints para todo documento, como "Archivos". Emitirlo obligaba a repetir estado y handlers en 23 fichas      |
| 2   | `Movimiento` y `MOVIMIENTO_ENDPOINT` se movieron a `core/contabilidad/` | Los leen dos pantallas que no se conocen (la consulta del libro y este diálogo), y `core` no importa features en eager |
| 3   | Totales solo cuando **todas** las líneas están cargadas                 | Con el libro paginado, sumar la página se leería como el total. El legacy cortaba en 50 filas con el mismo criterio    |
| 4   | **Sin confirmación** antes de (des)contabilizar                         | El legacy no la pedía y ambas son reversibles entre sí                                                                 |
| 5   | No se deshabilita "Contabilizar" por documento **no aprobado**          | El legacy tampoco lo hacía; el backend valida y el toast muestra su mensaje                                            |
| 6   | Sin columna **número** en el libro del diálogo                          | Todas las filas pertenecen al documento abierto: repetir su consecutivo no informa                                     |
