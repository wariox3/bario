# Programación de nómina — pendientes a coordinar con backend

Contexto: el ERP (`apps/erp/src/app/features/humano/proceso/programacion/`) tiene la
programación de nómina completa en el frontend: cabecera con validación del periodo,
workspace con ciclo de vida (generar → aprobar), tabla de empleados (renglones), ajuste
por empleado, adicionales e impresiones/exportaciones. Lo que sigue es lo que falta del
lado del backend para que todo funcione. Estado al **2026-10-03**, contra el schema de
`/api/contenedor/schema/`.

Convenciones que asume el frontend:

- Las acciones sobre una programación la identifican con **`programacion_id`** en el
  cuerpo (no `id`) y responden la programación actualizada.
- Las FK van **sin `_id`** al escribir y al leer, y **con `_id`** al filtrar en un
  `lista/` (estándar decidido; si un `lista/` rechaza `x_id`, se agrega en el backend).
- Las exportaciones van por `POST …/excel/` con `{ filtros, ordenamientos }` más el
  reporte: `serializador` en los endpoints genéricos, `informe` en los `*-informe/`.

## 1. Endpoints

### `GET humano/programacion-detalle/{id}/` ✅ IMPLEMENTADO

Abre el modal de ajuste de un empleado.

### `PATCH humano/programacion-detalle/{id}/` ✅ IMPLEMENTADO

Guarda el ajuste de un empleado y responde el renglón actualizado. **`PATCH`, no
`PUT`**: el modal manda solo lo que edita según el tipo de pago, y un `PUT` exigiría
además `contrato` y `programacion`.

| Tipo de pago | Campos que manda                                                                                                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Todos        | `dias_transporte` + las 12 banderas (`pago_horas`, `pago_auxilio_transporte`, `pago_incapacidad`, `pago_licencia`, `pago_vacacion`, `descuento_salud`, `descuento_pension`, `descuento_fondo_solidaridad`, `descuento_retencion_fuente`, `descuento_credito`, `descuento_embargo`, `adicional`) |
| Nómina (1)   | + las 11 horas: `diurna`, `nocturna`, `festiva_diurna`, `festiva_nocturna`, `extra_diurna`, `extra_nocturna`, `extra_festiva_diurna`, `extra_festiva_nocturna`, `recargo_nocturno`, `recargo_festivo_diurno`, `recargo_festivo_nocturno`                                                        |
| Prima (2)    | + `salario`, `salario_promedio`, `prima_propuesto`                                                                                                                                                                                                                                              |
| Cesantía (3) | + `salario`, `salario_promedio`, `cesantia_propuesto`                                                                                                                                                                                                                                           |
| Interés (4)  | + `salario`, `salario_promedio`, `interes_propuesto`                                                                                                                                                                                                                                            |

### `POST humano/programacion/notificar/` ❌ PENDIENTE

Envía el comprobante de nómina a cada empleado. Solo con la programación **aprobada**.

```json
{ "programacion_id": 1 }
```

Pendiente de definir: ¿es idempotente? (¿reenvía a quien ya se notificó?)

### `POST humano/programacion-detalle/importar-horas/` ✅ IMPLEMENTADO

Importa las horas del periodo desde Excel. Solo en **borrador** y con empleados cargados.
Multipart: `archivo` + `programacion_id`. Todo o nada; una celda vacía se guarda como 0.
Responde `{ creados: N }`.

Plantilla: `GET humano/programacion-detalle/importar-horas-ejemplo/?programacion_id=1`
(un renglón por empleado con sus horas actuales; se edita y se sube el mismo archivo).

### `POST humano/programacion/imprimir-nominas/` ✅ IMPLEMENTADO

Los desprendibles de la programación en un solo PDF, uno por página y por empleado. Con
la programación generada o aprobada.

```json
{ "programacion_id": 1 }
```

### `POST humano/programacion-detalle/excel/` ✅ IMPLEMENTADO

Excel de los empleados de la programación ("Excel ▾ → Detalle").

```json
{
  "filtros": [{ "propiedad": "programacion_id", "operador": "=", "valor": 1 }],
  "ordenamientos": [],
  "serializador": "informe_programacion_detalle"
}
```

### `POST general/documento-detalle-informe/excel/` ✅ IMPLEMENTADO — falta el filtro (ver §2)

Excel de los conceptos de las nóminas generadas ("Excel ▾ → Nómina detalle"). El
reporte se elige con `informe`, no con `serializador`.

```json
{
  "informe": "nomina_detalle",
  "filtros": [
    { "propiedad": "documento__programacion_detalle__programacion_id", "operador": "=", "valor": 1 }
  ],
  "ordenamientos": []
}
```

### `POST general/documento-informe/excel/` ✅ IMPLEMENTADO

Excel de las nóminas generadas ("Excel ▾ → Nómina"). Gemelo del `lista/` que pasó el
backend; el reporte se elige con `informe`.

```json
{
  "informe": "nomina",
  "filtros": [
    { "propiedad": "programacion_detalle__programacion_id", "operador": "=", "valor": 1 }
  ],
  "ordenamientos": ["-fecha"]
}
```

## 2. Filtros para `campos_filtrables`

Sin estos, el `lista/` / `excel/` responde _"Propiedad … no permitida"_.

| Recurso                     | Campo                                              | Lo usa                                                | Estado                   |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------- | ------------------------ |
| `programacion-detalle`      | `programacion_id`                                  | Tabla de empleados del workspace                      | ❌                       |
| `adicional`                 | `programacion_id`                                  | Pestaña de adicionales                                | ❌                       |
| `documento`                 | `programacion_detalle_id`                          | "Ver nómina" de un empleado (`POST documento/lista/`) | ❌                       |
| `documento-informe`         | `programacion_detalle__programacion_id`            | Excel de nóminas                                      | ✅ (ejemplo del backend) |
| `documento-detalle-informe` | `documento__programacion_detalle__programacion_id` | Excel de conceptos                                    | ❓ por confirmar         |
| `movimiento`                | `documento_id`                                     | Movimientos contables de un documento                 | ❌                       |
| `grupo`                     | `periodo_id`                                       | Filtro del listado de grupos                          | ❌                       |

## 3. Para confirmar

- **`POST humano/adicional/importar/`**: el frontend manda `programacion_id` como campo
  extra del multipart (como el legacy), pero el schema solo declara `archivo`. ¿Lo lee?
  Si no, los adicionales importados quedan sin programación y no aparecen en la pestaña,
  sin dar error. ¿`permanente` queda en `false`? (el legacy lo forzaba).
- **`documento_tipo__documento_clase__grupo`** (filtros base de facturación electrónica de
  venta y compra): ¿`grupo` es una FK? Si lo es, por el estándar sería `…__grupo_id`.
- **Nombre de la identificación del empleado**: en `programacion-detalle` llega como
  `contacto_numero_identificacion`; en adicional, novedad y crédito como
  `contrato_contacto_numero_identificacion`. ¿Se unifica? El cambio en el frontend es de
  una línea.

## 4. Ya resuelto (referencia)

- `POST programacion-detalle/lista/` reemplaza al `GET` de la raíz (405).
- `cargar-contrato/`, `generar/`, `desgenerar/`, `aprobar/`, `desaprobar/`, `imprimir/`
  con `{ programacion_id }`.
- `POST programacion/eliminar-detalle/` con `{ programacion_id, ids }` (sin `ids` borra
  todos; el frontend nunca manda una lista vacía).
- `/humano/grupo/seleccionar/` trae `periodo_dias`; el `periodo` de la programación lo
  deriva el backend del grupo.
- El renglón trae `contrato`, `contrato_nombre` y `contacto_numero_identificacion`.
