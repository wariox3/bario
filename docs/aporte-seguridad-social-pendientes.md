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

### `POST humano/aporte/eliminar-contrato/` ❌ PENDIENTE

Quitar contratos del aporte antes de generar (la persona excluye a mano a quien no debe
ir en la planilla). Hoy `aporte-contrato` no publica `DELETE`. Se propone la misma forma
que `programacion/eliminar-detalle/`:

```json
{ "aporte_id": 1, "ids": [10, 11, 12] }
```

Responde el aporte con su `contratos` al día. Solo debe permitirse con el aporte sin
generar.

### `POST humano/aporte/imprimir/` ❌ PENDIENTE

PDF del aporte. Cuerpo `{ "aporte_id": 1 }`. El ERP anterior imprimía por
`general/documento/imprimir/` con `documento_tipo_id: 1` fijo, pero el aporte no es un
documento, así que esa ruta no aplica. Si el PDF sale por otro lado, avisar cuál.

### `POST humano/aporte-detalle/excel/` ❌ PENDIENTE

Exporta las líneas liquidadas del aporte. Cuerpo:

```json
{
  "filtros": [{ "propiedad": "aporte_contrato__aporte_id", "operador": "=", "valor": 1 }],
  "ordenamientos": [],
  "serializador": "informe_aporte_detalle"
}
```

El nombre del serializador sale del ERP anterior; si en este backend se llama distinto,
avisar.

## 2. Campos que faltan en los serializadores

El frontend ya los lee; mientras no lleguen se muestran como "—".

### `HumAporteDetalle` ❌ PENDIENTE

Hoy la línea liquidada solo trae el id de `aporte_contrato`: **no hay forma de saber de
qué empleado es cada línea**, que es lo primero que se mira al compararla contra el plano.

| Campo                            | Qué es                                            |
| -------------------------------- | ------------------------------------------------- |
| `contrato_nombre`                | Nombre del empleado (como en `HumAporteContrato`) |
| `contacto_numero_identificacion` | Identificación del empleado                       |
| `aporte_contrato_salario`        | Salario del contrato en el aporte                 |

### `HumAporteContrato` ❌ PENDIENTE

| Campo                            | Qué es                      |
| -------------------------------- | --------------------------- |
| `contacto_numero_identificacion` | Identificación del empleado |

## 3. Filtros a confirmar (`campos_filtrables`)

El schema no publica qué campos acepta cada `lista/`. El frontend usa estos:

| Endpoint                 | Filtro                                              | Uso                           |
| ------------------------ | --------------------------------------------------- | ----------------------------- |
| `aporte-contrato/lista/` | `aporte_id`                                         | Fijo: acota al aporte abierto |
| `aporte-contrato/lista/` | `id`, `contrato_id`                                 | Filtros de la tabla           |
| `aporte-contrato/lista/` | `contrato__contacto__nombre_corto`                  | Buscar por empleado           |
| `aporte-detalle/lista/`  | `aporte_contrato__aporte_id`                        | Fijo: acota al aporte abierto |
| `aporte-detalle/lista/`  | `id`, `aporte_contrato_id`                          | Filtros de la tabla           |
| `aporte-detalle/lista/`  | `aporte_contrato__contrato__contacto__nombre_corto` | Buscar por empleado           |
| `aporte-entidad/lista/`  | `aporte_id`                                         | Fijo: acota al aporte abierto |

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
3. **Respuesta de los `lista/`**: el schema declara un objeto suelto
   (`HumAporteContrato`, etc.), pero el frontend espera la página
   `{ count, next, previous, results }`. Confirmar que es paginada.
4. **`presentacion`** (`S` sucursal / `U` única): ¿qué cambia en la liquidación?
