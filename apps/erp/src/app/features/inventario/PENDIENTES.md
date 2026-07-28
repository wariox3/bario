# Inventario — pendientes por revisar

Bitácora de lo que quedó **asumido o decidido** al portar los cuatro informes de Inventario desde el
ERP anterior. Nada se ha ejercitado contra `reddocapi.uk`: todo sale de leer el código legacy.

Cada supuesto vive además como comentario en su archivo; acá está el índice para revisarlos de una
sentada. Al confirmar uno, **bórralo de esta lista** y quita el `TODO(backend)` del código.

Portado el 2026-07-27/28. Commits: `46efd2c`, `e7b0eca`, `7c128f1`, `af21897`.

---

## 1. Por confirmar con backend

### 1.1 Serializadores

En el legacy viajaban como **query param de un GET**; acá van en el **body del POST** a `lista/` (o
del POST a `excel/`), que es la convención nueva. Confirmar que el backend los acepte ahí.

| Informe                  | Endpoint                      | Listado                         | Excel                           |
| ------------------------ | ----------------------------- | ------------------------------- | ------------------------------- |
| Existencias              | `/general/item/`              | _(default)_                     | `informe_existencia`            |
| Existencias por almacén  | `/inventario/existencia/`     | _(default)_                     | `informe_existencia`            |
| Inventario valorizado    | `/general/item/`              | `informe_inventario_valorizado` | `informe_inventario_valorizado` |
| Historial de movimientos | `/general/documento-detalle/` | `informe_inventario`            | _(sin Excel)_                   |

**Existencias** e **inventario valorizado** consultan el mismo recurso y se diferencian _solo_ por
el serializador. Vale confirmar que el de valorizado devuelva efectivamente los costos.

### 1.2 Nombres de campo con lookup de Django

`existencia-almacen` e `historial-movimiento` leen las columnas de relación con el lookup crudo
(`item__nombre`, `almacen__nombre`, `documento__numero`,
`documento__documento_tipo__nombre`, `documento__fecha`, `documento__contacto__nombre_corto`),
porque la tabla del legacy pintaba las llaves tal como venían en la respuesta.

Si el API nuevo los devuelve aplanados (`documento_numero`, `item_nombre`), el fix es local a
`*.model.ts` + `*.constants.ts` de cada informe.

### 1.3 Campos calculados

`existencia`, `existencia-almacen` e `inventario-valorizado` muestran `existencia`, `remision`,
`disponible` (y en valorizado `costo_promedio`, `costo_total`) como campos que **calcula el
backend**. Por eso no son ordenables. Confirmar que vengan en la respuesta del listado y no haya que
pedirlos aparte.

---

## 2. Decisiones tomadas (divergencias del legacy)

Todas deliberadas. Están acá por si alguna hay que revertir.

| #   | Decisión                                                                                                 | Por qué                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Los filtros implícitos van también en el **body de la descarga**                                         | Si no, el Excel traería filas que la tabla nunca mostró                                                                |
| 2   | El Excel de **inventario valorizado** pide `informe_inventario_valorizado`, no `informe_existencia`      | El legacy pisaba el serializador al exportar, así que su archivo salía **sin los costos**. Es un bug suyo, no se portó |
| 3   | `existencia-almacen` e `inventario-valorizado` **tienen filtros**                                        | El legacy les pasaba `[availableFields]="[]"`, dejándolos sin ningún filtro. Se habilitaron los sensatos               |
| 4   | `existencia-almacen` **no** lleva filtro implícito `inventario = true`                                   | El recurso ya contiene solo saldos de inventario; sería redundante. El legacy lo tenía comentado                       |
| 5   | `historial-movimiento` **no** tiene exportación                                                          | El legacy tenía el botón de Excel apagado en este informe (a diferencia de los otros tres)                             |
| 6   | La columna `disponible` va alineada a la derecha                                                         | Es un número; el legacy la alineaba a la izquierda                                                                     |
| 7   | No se portó el código muerto de contabilizar/selección que el legacy copiaba en cada servicio de informe | Ninguno de los cuatro lo usaba                                                                                         |

---

## 3. Notas de dominio

- **`cantidad_operada` vs `cantidad`**: `historial-movimiento` muestra `cantidad_operada`, que trae
  el signo del movimiento (negativa en salidas). El **filtro**, en cambio, va sobre `cantidad`, que
  siempre es positiva. No es un descuido — está así en el legacy y tiene sentido, pero conviene
  saberlo antes de "arreglarlo".
- **Filtros implícitos de `historial-movimiento`**: `inventario = true` y
  `documento__estado_aprobado = true`. El segundo importa: los borradores todavía no afectaron el
  inventario, así que incluirlos daría un historial que no cuadra con los saldos.
