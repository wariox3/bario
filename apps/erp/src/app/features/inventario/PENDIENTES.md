# Inventario — pendientes por revisar

Bitácora de lo que quedó **asumido o decidido** al portar Inventario desde el ERP anterior. Nada se
ha ejercitado contra `reddocapi.uk`: todo sale de leer el código legacy.

Cada supuesto vive además como comentario en su archivo; acá está el índice para revisarlos de una
sentada. Al confirmar uno, **bórralo de esta lista** y quita el `TODO(backend)` del código.

Portado el 2026-07-27/28. Commits: `46efd2c`, `e7b0eca`, `7c128f1`, `af21897`.

Estado (2026-07-31): portado el master **almacén** (§4). Es el primer master propio del módulo —el
ítem vive en General y solo se monta acá—, y con él Inventario queda completo.

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

---

## 4. Almacén (master)

El `InvAlmacen` del ERP anterior, sobre `/inventario/almacen/`. El master más chico del ERP: **un
nombre y nada más**.

### 4.1 El supuesto que importa

**Que el modelo no tenga más campos que `id` y `nombre`.** Es lo único serio por confirmar.

El formulario del legacy edita un solo input y su ficha muestra una sola fila, pero eso **no prueba**
que el backend no exponga más: un almacén normalmente cuelga de una sede, y bien podría haber un
`sede_id`, un `codigo` o un `estado_activo` que su formulario simplemente no muestra. Ya vimos en
Humano que los mapeos del legacy arrastran campos copiados y omiten otros.

Si aparecen campos, el cambio es local: `almacen.model.ts`, el `form` y `ALMACENES_COLUMNS`.

A favor: el endpoint **ya está en uso y verificado** en su forma de lectura — `SELECT_ENDPOINTS.almacen`
(`/inventario/almacen/seleccionar/`) lo consumen los tres documentos de inventario y las facturas de
venta y compra. Lo único sin ejercitar es el CRUD.

Los otros dos supuestos, menores: que el listado responde a `POST …/lista/` con la convención
estándar, y que existe `almacen/excel/` para la exportación.

### 4.2 Decisiones tomadas

| #   | Decisión                                                                   | Por qué                                                                                                                                            |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Vive en `inventario/masters/`, no en `general/masters/`                    | Su endpoint es `/inventario/almacen/`. El ítem está en General porque el suyo sí es `/general/item/`; acá el dueño es este módulo                  |
| 2   | Se monta **solo en Inventario**                                            | El legacy también lo pone en el menú de Venta, pero parece herencia de cuando Venta era el módulo principal. Sumarlo allá después son dos líneas   |
| 3   | Sin `almacen.mapper.ts` ni tipo de form value                              | Con un solo control el payload sale derecho del `getRawValue()`. Los masters con mapper lo tienen porque mapean varios campos; acá sería ceremonia |
| 4   | El `maxlength` de 80 se aplica **también en el input**, no solo al validar | El legacy solo lo valida, así que deja escribir 200 caracteres y recién avisa al guardar                                                           |

### 4.3 Lo que no se portó

- El `patchValue` de `empleado`, `empleadoNombre`, `fecha_desde` y `fecha_hasta` que el formulario
  del legacy ejecuta **después de actualizar** — cuatro campos que ese formulario no tiene. Es un
  copy/paste de otro master, y como el `patchValue` de Angular ignora las claves desconocidas, nunca
  falló ni hizo nada.
- El método `actualizarDatosGrupo` de su servicio, que actualiza un almacén pero se llama como si
  fuera de grupos — mismo origen.
