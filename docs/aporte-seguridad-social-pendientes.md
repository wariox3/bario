# Aporte a seguridad social — pendientes a coordinar con backend

Contexto: el ERP (`apps/erp/src/app/features/humano/proceso/aporte/`) tiene el aporte a
seguridad social (planilla PILA) en el frontend: cabecera, workspace con ciclo de vida
(cargar contratos → generar → aprobar), pestañas de contratos, líneas liquidadas y
entidades, plano del operador y exportaciones. Lo que sigue es lo que falta del lado del
backend para que todo funcione. Estado al **2026-10-05**, contra el schema de
`/api/contenedor/schema/`.

Convenciones que asume el frontend:

- Las acciones sobre un aporte lo identifican con **`aporte_id`** en el cuerpo (no `id`)
  y responden el aporte actualizado.
- Los tres niveles (`aporte-contrato`, `aporte-detalle`, `aporte-entidad`) se listan por
  **`POST …/lista/`** con `{ filtros, ordenamientos }` en el cuerpo y `?page=&limit=` en
  la URL.
- Las FK van **sin `_id`** al escribir y al leer, y **con `_id`** al filtrar en un
  `lista/` (estándar decidido; si un `lista/` rechaza `x_id`, se agrega en el backend).
- Las exportaciones van por `POST …/excel/` con `{ filtros, ordenamientos }` más el
  `serializador`.

## 1. Endpoints que faltan

### `DELETE humano/aporte-contrato/{id}/` ✅ IMPLEMENTADO

Quitar contratos del aporte antes de generar (la persona excluye a mano a quien no debe
ir en la planilla). El frontend manda un `DELETE` por contrato seleccionado y después
vuelve a pedir la cabecera para refrescar `contratos` y `empleados`.

### `POST humano/aporte/imprimir/` ❌ PENDIENTE

PDF del aporte. Cuerpo `{ "aporte_id": 1 }`. El ERP anterior imprimía por
`general/documento/imprimir/` con `documento_tipo_id: 1` fijo, pero el aporte no es un
documento, así que esa ruta no aplica. Si el PDF sale por otro lado, avisar cuál.

### Exportaciones de las tres pestañas ❌ PENDIENTE

Cada pestaña del workspace tiene su "Excel", como en el ERP anterior:

| Pestaña   | Endpoint                             | `serializador`            | Filtro que acota al aporte   |
| --------- | ------------------------------------ | ------------------------- | ---------------------------- |
| Contratos | `POST humano/aporte-contrato/excel/` | `informe_aporte_contrato` | `aporte_id`                  |
| Detalle   | `POST humano/aporte-detalle/excel/`  | `informe_aporte_detalle`  | `aporte_contrato__aporte_id` |
| Entidades | `POST humano/aporte-entidad/excel/`  | `informe_aporte_entidad`  | `aporte_id`                  |

Cuerpo, con la convención de los `lista/` (ejemplo de contratos):

```json
{
  "filtros": [{ "propiedad": "aporte_id", "operador": "=", "valor": 1 }],
  "ordenamientos": [],
  "serializador": "informe_aporte_contrato"
}
```

Los nombres de serializador salen del ERP anterior (que los pedía por `GET` con
`excel_informe=True`); si en este backend se llaman distinto, avisar.

## 2. Campos que faltan en los serializadores

El frontend ya los lee; mientras no lleguen se muestran como "—".

### `HumAporteDetalle` ✅ IMPLEMENTADO

La línea liquidada ya trae quién es el empleado, y el frontend lo pinta:
`aporte_contrato__contacto_numero_identificacion`, `aporte_contrato__contacto_nombre_corto`
y `aporte_contrato_salario`.

### `HumAporteContrato` ✅ IMPLEMENTADO

El contrato del aporte ya trae al empleado, y el frontend lo pinta:
`contacto_numero_identificacion` y `contacto_nombre_corto`.

## 3. Filtros a confirmar (`campos_filtrables`)

El schema no publica qué campos acepta cada `lista/`. El frontend usa estos:

| Endpoint                 | Filtro                       | Uso                           |
| ------------------------ | ---------------------------- | ----------------------------- |
| `aporte-contrato/lista/` | `aporte_id`                  | Fijo: acota al aporte abierto |
| `aporte-contrato/lista/` | `id`                         | Filtro de la tabla            |
| `aporte-detalle/lista/`  | `aporte_contrato__aporte_id` | Fijo: acota al aporte abierto |
| `aporte-detalle/lista/`  | `id`                         | Filtro de la tabla            |
| `aporte-entidad/lista/`  | `aporte_id`                  | Fijo: acota al aporte abierto |

Y estos ordenamientos: `contrato_id` (contratos), `aporte_contrato_id` (detalles), `tipo`
(entidades).

Los filtros fijos son los críticos: si el backend no los acepta, la pestaña muestra
registros de **todos** los aportes.

## 4. Preguntas

1. **`POST humano/aporte/generar-entidad/`**: ¿qué hace? ¿Hay que llamarlo después de
   `generar/`, o `generar/` ya calcula las entidades? Hoy el frontend no lo usa.
2. **Respuesta de `cargar-contrato/`**: el schema la declara como objeto genérico. El
   frontend lee `contratos` para el toast ("N contratos en la planilla"). ¿Responde el
   aporte completo, como las otras acciones?
3. ~~**Respuesta de los `lista/`**~~ ✅ Confirmado: viene paginada
   (`{ count, next, previous, results }`), aunque el schema declare un objeto suelto.
4. **`presentacion`** (`S` sucursal / `U` única): ¿qué cambia en la liquidación?
