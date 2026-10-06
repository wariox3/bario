# Liquidación — pendientes a coordinar con backend

Contexto: el ERP (`apps/erp/src/app/features/humano/proceso/liquidacion/`) tiene la
liquidación de contratos en el frontend: listado, workspace con ciclo de vida (generar →
aprobar, reliquidar), edición de la cabecera (comentario y fechas de último pago),
adiciones y deducciones cargadas a mano e impresión. Lo que sigue es lo que falta del lado
del backend para que todo funcione. Estado al **2026-10-05**, contra el schema de
`/api/contenedor/schema/`.

Convenciones que asume el frontend:

- Las acciones sobre una liquidación la identifican con **`liquidacion_id`** en el cuerpo
  (no `id`) y responden la liquidación actualizada.
- Los adicionales se listan por **`POST liquidacion-adicional/lista/`** con
  `{ filtros, ordenamientos }` en el cuerpo y `?page=&limit=` en la URL.
- Las FK van **sin `_id`** al escribir y al leer, y **con `_id`** al filtrar en un
  `lista/` (estándar decidido; si un `lista/` rechaza `x_id`, se agrega en el backend).

## 1. Endpoints

### `PATCH humano/liquidacion-adicional/{id}/` ❌ PENDIENTE

Corregir un adicional ya cargado (concepto, valor o detalle) sin tener que borrarlo y
volver a crearlo. Hoy el recurso publica `POST`, `GET {id}` y `DELETE {id}`, pero no
`PUT`/`PATCH`. El frontend manda:

```json
{ "liquidacion": 1, "concepto": 12, "detalle": "Bonificación", "adicional": 150000, "deduccion": 0 }
```

Responde el adicional actualizado. Solo debe permitirse con la liquidación sin generar,
igual que crear y borrar.

### `PATCH humano/liquidacion/{id}/` ✅ PUBLICADO — a confirmar el efecto

El frontend lo usa para editar, en borrador, solo estos campos:

```json
{
  "fecha_ultimo_pago": "2026-01-15",
  "fecha_ultimo_pago_cesantia": "2025-12-31",
  "fecha_ultimo_pago_prima": "2025-12-20",
  "fecha_ultimo_pago_vacacion": null,
  "comentario": "Ajuste por fecha de prima"
}
```

Confirmar:

1. Que `reliquidar/` usa estas fechas guardadas (y no las vuelve a leer del contrato). El
   frontend le avisa a la persona que, después de editar, reliquide.
2. Que el backend rechaza el `PATCH` si la liquidación ya está generada o aprobada.

## 2. Campos que faltan en los serializadores

El frontend ya los lee; mientras no lleguen se muestran como "—".

### `HumLiquidacion` ❌ PENDIENTE

| Campo                            | Qué es                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| `contacto_numero_identificacion` | Identificación del empleado (cabecera y columna del listado) |

`contrato_nombre` (el nombre del empleado) y `salario` ya llegan.

## 3. Filtros a confirmar (`campos_filtrables`)

El schema no publica qué campos acepta cada `lista/`. El frontend usa estos:

| Endpoint                       | Filtro                                      | Uso                                    |
| ------------------------------ | ------------------------------------------- | -------------------------------------- |
| `liquidacion-adicional/lista/` | `liquidacion_id`                            | Fijo: acota a la liquidación abierta   |
| `liquidacion/lista/`           | `id`, `contrato_id`, `fecha_hasta`          | Filtros del listado                    |
| `liquidacion/lista/`           | `estado_generado`, `estado_aprobado`        | Filtros del listado                    |
| `liquidacion/lista/`           | `contrato__contacto__numero_identificacion` | Buscar por identificación del empleado |
| `liquidacion/lista/`           | `contrato__contacto__nombre_corto`          | Buscar por nombre del empleado         |

Y el ordenamiento `id` en `liquidacion-adicional/lista/`.

El filtro fijo `liquidacion_id` es el crítico: si el backend no lo acepta, la tabla de
adicionales muestra los de **todas** las liquidaciones.

### `GET humano/concepto/seleccionar/` — filtro `operacion` ❌ PENDIENTE

El modal de adicionales pide el catálogo con `?adicional=True&operacion=1` (conceptos que
suman) o `?operacion=-1` (los que restan). El endpoint solo declara `adicional`,
`concepto_tipo_id` y `search`: si ignora `operacion`, al cargar una deducción se ofrecen
también los conceptos que suman. Se pide declarar el filtro `operacion`.

## 4. Preguntas

1. **Respuesta de los `lista/`**: el schema declara un objeto suelto
   (`HumLiquidacionAdicional`, `HumLiquidacion`), pero el frontend espera la página
   `{ count, next, previous, results }`. Confirmar que es paginada.
2. **`imprimir/`**: el frontend manda solo `{ "liquidacion_id": 1 }`. El ERP anterior le
   agregaba `filtros`, `limite`, `desplazar`, `modelo` y `tipo`; confirmar que no hacen
   falta.
