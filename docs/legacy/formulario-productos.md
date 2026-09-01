# Legacy: `app-formulario-productos` — el editor de líneas de los documentos comerciales

> **Propósito de este documento (fase 1).** Radiografía del componente del ERP legacy que edita
> las líneas (detalles) de factura de venta, factura de compra, notas y recurrentes. Es el mapa
> para la fase 2: comparar contra nuestro `app-comercial-documento-detalles` y decidir qué
> funcionalidades faltan. **No es un modelo a imitar** — el legacy funciona, pero su diseño tiene
> problemas serios que se listan al final; lo que se migra es el _comportamiento de negocio_, no
> la implementación.
>
> Fuente: `reddoc-legacy/src/app/comun/componentes/factura/` (leído completo el 2026-08-31).

## 1. Qué es y quiénes lo usan

`FormularioProductosComponent` es la **tabla de líneas** embebida en todos los formularios de
documentos comerciales del legacy: factura de venta, factura de venta recurrente, POS, factura de
compra, notas (crédito, débito, ajuste), documento soporte. Cada página de documento lo instancia
con flags que encienden o apagan funcionalidades.

Ejemplo real (factura de venta):

```html
<app-formulario-productos
  (emitirDocumentoDetalle)="recibirDocumentoDetalleRespuesta($event)"
  [formularioTipo]="'venta'"
  [mostrarLectorCodigoBarras]="true"
  [mostrarBuscarDocumentos]="true"
  [habilitarConsultaPrecio]="true"
  [mostrarCampoDetalle]="true"
  [mostrarIncluirIva]="true"
  [mostrarCampoAIU]="true"
  [columnasTablaDatos]="FACTURA_VENTAS_CAMPOS_TABLA"
  [configuracionDocumento]="{
    endpoint: 'general/documento_detalle/',
    queryParams: {
      serializador: 'lista_agregar',
      documento__documento_tipo_id: 29,          // remisiones
      cantidad_pendiente: 'True',
      documento__contacto_id: formularioFactura.get('contacto')?.value,
      documento__estado_aprobado: 'True',
    },
  }"
></app-formulario-productos>
```

## 2. Mapa de piezas

```
FormularioProductosComponent (526 líneas TS + 471 HTML)
│   La vista de la tabla + orquestación de modales. Delega casi toda la lógica en ↓
│
├── FormularioFacturaService (1357 líneas) ················ EL CEREBRO
│     · providedIn: 'any' — instancia por módulo lazy, compartida entre la página
│       del documento y este componente (el form ES estado global compartido).
│     · Dueño del FormGroup completo del documento (cabecera + detalles + pagos).
│     · Todo el cálculo por línea y los totales del documento.
│     · Signals: modoEdicion, estadoAprobado, acumuladorImpuestos,
│       acumuladorDebitosCreditos, eliminarDetallesIds, _documentoOperacion (±1).
│     · Subject actualizarDocumento$ → recargar el documento tras importar.
│
├── OperacionesService ······································ LA ARITMÉTICA
│     subtotal = round(cantidad × precio, 2) · base = round(subtotal × %base/100)
│     impuesto = round(base × %/100) · operado = impuesto × operacion(±1)
│     descuento = round(subtotal × %desc/100) · redondeo con Number.EPSILON
│
├── AdapterService ·········································· TRADUCTOR DE SHAPES
│     3 formas del mismo impuesto (consulta de ítem / selector / detalle guardado)
│     → 1 shape interno ImpuestoFormulario. Necesario porque cada endpoint
│     devuelve los mismos datos con nombres distintos.
│
├── FacturaService (local) ·· GET general/documento/<id>/detalle/ + config AIU
│
└── Subcomponentes por celda / modal:
      · seleccionar-producto     autocomplete de ítem (nombre ⇄ código) + crear ítem inline
      · seleccionar-impuestos    dropdown multi de impuestos de la línea (venta/compra)
      · seleccionar-almacen      almacén POR LÍNEA (autocomplete inventario/almacen)
      · seleccionar-grupo        grupo de contabilidad POR LÍNEA (solo compra)
      · agregar-detalles-documento   modal "agregar desde documento" (persiste en backend)
      · buscar-documento-detalles    modal "importar documento" (agrega al form, no persiste)
      · agregar-aui              modal AIU (Administración / Imprevistos / Utilidad)
      · extraer-iva              modal "precio con IVA incluido" → precio base
```

## 3. Contrato del componente

### Inputs

| Input                                                                      | Efecto                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `formularioTipo` (`'venta' \| 'compra'`, required)                         | Discrimina TODO: qué precio del ítem usar (`precio` vs `costo`), qué impuestos consultar/ofrecer (`?venta=True` vs `?compra=True`), y columnas extra (grupo contable solo en compra).                                    |
| `configuracionDocumento` `{ endpoint, queryParams }`                       | Parametriza qué líneas pendientes consultan los modales de importar. Cada documento declara su origen (p. ej. factura de venta importa detalles de **remisiones aprobadas** del mismo cliente con `cantidad_pendiente`). |
| `columnasTablaDatos` (`ColumnaTabla[]`)                                    | Columnas del modal de importar (id, número, tipo, contacto, ítem, cantidad, pendiente, precio) con formateo es-CO.                                                                                                       |
| `mostrarLectorCodigoBarras`                                                | Input de escaneo arriba de la tabla (ver §6.1).                                                                                                                                                                          |
| `mostrarBuscarDocumentos`                                                  | Opción "Documento" en el dropdown de agregar (modal importar client-side, exige contacto elegido).                                                                                                                       |
| `mostrarImportarDesdeDocumento`                                            | Botón "Agregar desde documento" (modal server-side; solo visible en **edición**).                                                                                                                                        |
| `mostrarCampoAIU`                                                          | Opción "AIU" en el dropdown de agregar.                                                                                                                                                                                  |
| `mostrarIncluirIva`                                                        | Botoncito (lápiz) dentro del campo precio que abre el modal "extraer IVA".                                                                                                                                               |
| `habilitarConsultaPrecio`                                                  | Al elegir ítem consulta la **lista de precios del contacto** (ver §6.3).                                                                                                                                                 |
| `mostrarCampoDetalle`                                                      | Columna "Detalle" (nota libre por línea, máx. 150).                                                                                                                                                                      |
| `deshabilitar`                                                             | Apaga botones/inputs de la barra superior.                                                                                                                                                                               |
| `mostrarDocumentoReferencia`, `cuentasConImpuestos`, `permiteCantidadCero` | **Flags muertos**: declarados pero sin uso en el template ni en el service (la validación de cantidad siempre exige mín. 1).                                                                                             |

### Outputs

| Output                   | Cuándo                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `emitirDocumentoDetalle` | En **edición**, tras cargar `general/documento/<id>/detalle/`: le pasa el documento completo al padre (que de ahí saca `estado_aprobado`, totales, etc.). |
| `emitirEnviarFormulario` | Declarado, **nunca emitido** (muerto).                                                                                                                    |

### Rasgo clave (y trampa) del diseño

El componente **no recibe las líneas por input**: las toma del `FormGroup` compartido de
`FormularioFacturaService`. Además, **él mismo carga el documento en edición** (lee el `:id` de la
ruta en `ngOnInit` → `_cargarVista()`), no la página que lo contiene. La página y la tabla están
acopladas a través del service — nada es explícito en el template.

## 4. El modelo de una línea

Cada detalle es un `FormGroup` con `tipo_registro` discriminador:

- **`'I'` (ítem)** — la línea comercial normal: `item`, `item_nombre`, `cantidad`, `precio`,
  `porcentaje_descuento`, `descuento`, `subtotal`, `impuestos` (FormArray), `impuesto`,
  `impuesto_retencion`, `impuesto_operado`, `base_impuesto`, `total_bruto`, `total`, `neto`,
  `almacen`/`almacen_nombre` (heredado de la cabecera al crear la línea), `grupo` (contable,
  sugerido de la cabecera), `documento_detalle_afectado` (vínculo con la línea origen al importar),
  `detalle` (nota), `id` (null hasta persistir), `impuestos_eliminados`.
- **`'C'` (cuenta contable)** — línea de cuenta para documentos contables: `cuenta`,
  `cuenta_codigo`, `cuenta_nombre`, `naturaleza` (`'D'`/`'C'`), `contacto` por línea (sugerido de
  la cabecera). Convive en el MISMO FormArray que las líneas `'I'` (la tabla solo pinta las `'I'`;
  las `'C'` las pinta otra tabla hermana en otros formularios).

Validadores por línea: cantidad ≥ 1, precio ≥ 0.1 (`validarPrecio` marca `valorCero`), descuento
0–100, patrones numéricos. Al agregar una línea se marca `item`/`cuenta` como error requerido y
**todo el array como touched** (los errores se ven de inmediato).

## 5. El motor de cálculo (semántica de negocio — LO QUE HAY QUE PRESERVAR)

Cualquier cambio (cantidad, precio, descuento, impuestos, ítem) dispara la misma tubería en el
service — no hay reactividad real; cada handler la invoca a mano:

```
_actualizarImpuestoItem(impuestos, i):
  1. _limpiarImpuestos(i)            impuestos y montos de la línea a 0
  2. subtotal  = round(cantidad × precio)
  3. descuento = round(subtotal × %desc / 100)
  4. subtotal  = subtotal − descuento          ← ¡SOBRESCRIBE subtotal! desde aquí
                                                 "subtotal" significa "base con descuento"
  5. por cada impuesto de la línea:
       base    = round(subtotal × porcentaje_base / 100)   (porcentaje_base ≠ 100 → AIU)
       imp     = round(base × porcentaje / 100)
       operado = imp × impuesto_operacion      (+1 IVA/consumo · −1 retenciones)
       impuesto_operado += operado             (neto de impuestos, con signo)
       impuesto          += operado  si operacion > 0   (solo los positivos)
       impuesto_retencion += operado si operacion < 0   (negativo acumulado)
       total_bruto       += operado  si operacion > 0
       base_impuesto      = base     si operacion > 0    (la última gana)
       push {impuesto, total, total_operado, base} al FormArray impuestos de la línea
  6. total = neto = subtotal + impuesto_operado          ← las retenciones RESTAN del total
     total_bruto = subtotal + Σ impuestos positivos
```

Totales del documento (`_actualizarFormulario`): pone la cabecera en 0 y suma todas las líneas:
`subtotal` (solo líneas `'I'`, ya con descuento), `descuento`, `impuesto`, `impuesto_retencion`,
`impuesto_operado`, `total_bruto`, `base_impuesto`, `totalCantidad` y `total`. Para el total, las
líneas con `naturaleza` (`'C'`/`'D'`) se suman con signo según `_documentoOperacion` (±1, viene de
la config del módulo — así una nota crédito invierte el documento). Aparte se llevan dos
acumuladores para la vista:

- **`acumuladorImpuestos`** (signal): desglose por nombre extendido del impuesto
  (`{ "IVA Ventas 19%": { total, operado } }`), sumando o restando según la operación. Se alimenta
  de un `impuestoCache` paralelo indexado por posición de línea.
- **`acumuladorDebitosCreditos`** (signal): Σ débitos y Σ créditos de las líneas `'C'`.

Reglas de negocio adicionales del motor:

- **Cambiar el ítem de una línea** limpia por completo los impuestos anteriores (y en edición los
  registra en `impuestos_eliminados`), re-poblándolos con los del ítem nuevo.
- **En edición**, eliminar una línea persistida guarda su id en `eliminarDetallesIds`; el submit
  envía `detalles_eliminados`. Los impuestos quitados de una línea viajan en
  `impuestos_eliminados` por línea (comparación por sets de ids contra lo que había).
- **Redondeo a 2 decimales en cada paso** (subtotal, base, impuesto, operado, totales) con
  `Math.round((v + Number.EPSILON) × 100) / 100`.

## 6. Inventario de funcionalidades (la lista para la fase 2)

### 6.1 Lector de código de barras (`mostrarLectorCodigoBarras`)

Input de texto siempre enfocable arriba de la tabla. Al `Enter`: consulta
`general/item/seleccionar/` con `codigo__icontains` + `inactivo=False`; si hay coincidencia
**exacta** de código la prefiere, si no toma la primera; consulta el detalle del ítem
(`general/item/detalle/` POST con flag venta/compra → trae impuestos), agrega una línea nueva con
él, limpia el input y **se re-enfoca** para el siguiente escaneo (flujo pistola). Si no encuentra:
alerta de error.

### 6.2 Selector de ítem por línea (`seleccionar-producto`)

- Autocomplete con **dos modos de búsqueda conmutables: nombre ⇄ código**.
- Al elegir: POST `general/item/detalle/` con `venta`/`compra` según el tipo de formulario — la
  respuesta trae el precio/costo y los **impuestos configurados del ítem**, que se auto-seleccionan
  en la línea.
- **Crear ítem inline**: botón que abre el formulario completo de ítem en modal; al guardar, el
  ítem recién creado queda seleccionado en la línea.
- Guarda contra re-seleccionar el mismo ítem en la misma línea (no-op con warning).
- Si el input queda vacío al cerrar el dropdown → emite "línea vacía".

### 6.3 Lista de precios del contacto (`habilitarConsultaPrecio`)

Si el contacto del documento tiene lista de precios (`contactoPrecio` ← `contacto.precio_id`, el
mismo campo que hoy nos llega en `contacto/seleccionar/`), al elegir un ítem se consulta
`general/precio_detalle/consultar_precio/` con `{ item_id, precio_id }`; si responde `vr_precio`,
**ese precio pisa el del ítem**. Sin lista, se usa `precio` (venta) o `costo` (compra) del ítem.

### 6.4 Impuestos por línea (`seleccionar-impuestos`)

Dropdown multi por celda: lista `general/impuesto/seleccionar/` filtrado `?venta=True` o
`?compra=True` según el formulario, ordenado por tipo. Agregar (sin duplicados, alerta si ya
existe) / quitar chips → el padre recalcula la línea entera. En edición, los ids de impuestos
persistidos que se quitan van a `impuestos_eliminados`.

### 6.5 Almacén y grupo contable por línea

- **Almacén por línea** (`seleccionar-almacen`): autocomplete de `inventario/almacen/seleccionar/`.
  El almacén de la cabecera se hereda como default al agregar cada línea.
- **Grupo de contabilidad por línea** (`seleccionar-grupo`, solo `formularioTipo === 'compra'`):
  select simple; default el `grupo_contabilidad` de la cabecera.

### 6.6 Importar líneas desde otro documento (dos variantes que se confunden)

|                    | "Documento" (`mostrarBuscarDocumentos`)                                                                                                                                                                                            | "Agregar desde documento" (`mostrarImportarDesdeDocumento`)                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Componente         | `buscar-documento-detalles`                                                                                                                                                                                                        | `agregar-detalles-documento`                                                                                                                                                             |
| Cuándo aparece     | siempre (exige **contacto** elegido)                                                                                                                                                                                               | solo en **edición**                                                                                                                                                                      |
| Consulta           | `configuracionDocumento.endpoint` + queryParams, **paginada y con filtros de usuario**                                                                                                                                             | ídem, sin paginación                                                                                                                                                                     |
| Al confirmar       | consulta `general/item/detalle/` por cada selección (forkJoin) y **agrega líneas al formulario** con `documento_detalle_afectado_id` = línea origen y `cantidad = cantidad_pendiente`; nada se persiste hasta guardar el documento | POST `general/documento_detalle/agregar_documento_detalle/` `{ documento_id, documento_detalle_ids }` — **persiste en backend** y recarga el documento completo (`actualizarDocumento$`) |
| Caso de uso típico | facturar remisiones pendientes (tipo 29, aprobadas, del cliente) en una factura nueva                                                                                                                                              | anexar líneas pendientes a un documento ya guardado                                                                                                                                      |

El vínculo `documento_detalle_afectado` es lo que descuenta el pendiente de la línea origen al
guardar — mismo concepto que ya documentamos en `docs/architecture/importar-desde-documento.md`.

### 6.7 AIU (`mostrarCampoAIU`, contratos de obra)

Modal que arma el esquema Administración / Imprevistos / Utilidad: lee de la configuración de la
empresa (`general/configuracion/consulta/`) qué 3 ítems representan A, I y U; el usuario elige el
ítem base y su valor; el modal calcula A=9%, I=3%, U=5% (**porcentajes hardcodeados**) y al
guardar agrega secuencialmente 4 líneas (base + A + I + U) con esos precios. Los ítems AIU tienen
`porcentaje_base` < 100 en sus impuestos (el IVA aplica solo sobre la utilidad, p. ej.), que es
para lo que existe `base = subtotal × porcentaje_base / 100` en el motor.

### 6.8 Extraer IVA / precio con IVA incluido (`mostrarIncluirIva`)

Lápiz dentro del campo precio → modal: el usuario digita el **precio final con impuestos
incluidos** y el modal deshace los impuestos de la línea en orden inverso
(`precio / (1 + %·base/100)` por cada uno, considerando `porcentaje_base`) mostrando el precio
base en vivo; al confirmar, setea ese precio en la línea y recalcula. Para tiendas que piensan en
precio de góndola.

### 6.9 Edición y aprobación

- En edición el componente carga el documento entero y puebla cabecera, detalles (reconstruyendo
  los impuestos con sus ids persistidos vía `AdapterService`), documento referencia y pagos.
- `estadoAprobado` congela toda la tabla (inputs readonly, sin botones de agregar/eliminar).

## 7. Malas prácticas y bugs del legacy (NO copiar; contexto para no heredarlos)

1. **Estado global encubierto**: el `FormGroup` vive en un service `providedIn: 'any'` compartido
   página↔tabla; hay que acordarse de `reiniciarFormulario()` en cada `ngOnDestroy` o el próximo
   documento hereda datos. Nuestro diseño (el padre es dueño del `FormArray` y lo pasa por input)
   es la corrección directa de esto.
2. **La tabla carga el documento**: el hijo lee la ruta y hace el GET; el padre se entera por
   output. Invierte la responsabilidad y duplica cargas cuando conviven varias tablas.
3. **"Reactividad" por evento focus**: `(focus)="onCantidadChange(i)"` se suscribe al
   `valueChanges` del control **cada vez que el campo gana foco**, sin bajar la suscripción
   anterior (viven hasta el destroy). N focos = N recálculos por tecla.
4. **`subtotal` cambia de significado a mitad de la tubería** (§5 paso 4): primero es
   cantidad×precio y dos pasos después ya incluye el descuento. Cualquier lector se equivoca.
5. **Cache paralelo por índice** (`impuestoCache[i]`): un array espejo del FormArray que hay que
   mantener sincronizado a mano al agregar/eliminar/limpiar; eliminar una línea reconstruye TODO el
   FormArray desde cero (`detalles.clear()` + re-agregar) para no descuadrarlo.
6. **Bug del signal sin invocar**: `if (!this.modoEdicion || !id)` y `if (!this.modoEdicion)` — el
   signal se evalúa como función (siempre truthy), así que el guard de "solo en edición" nunca
   aplica. Funciona de casualidad porque en alta no hay ids.
7. **Mutación directa de `FormArray.value`**: `impuestosEliminados.value.push(...)` agrega ids al
   array interno sin pasar por la API del form (sin eventos, sin estado dirty).
8. **Validadores absurdos**: `fecha` y `fecha_vence` (strings `YYYY-MM-DD`) con
   `minLength(3)/maxLength(200)/pattern(/^[a-z-0-9.-_]*$/)`; el validador cruzado de fechas
   además **pisa los errores** de otros validadores con `setErrors(null)`.
9. **Flags de configuración muertos** (`permiteCantidadCero`, `cuentasConImpuestos`,
   `mostrarDocumentoReferencia`, `emitirEnviarFormulario`) y señales "// conectar" que nunca se
   conectaron: la superficie del contrato miente.
10. **Redondeo por etapa**: cada paso redondea a 2 decimales, acumulando deriva en documentos con
    muchas líneas (el nuevo kernel redondea el monto final de cada impuesto, no cada sub-paso).
11. Ruido general: `console.log` en producción, `any` por todas partes, `detectChanges()` manual
    tras cada acción, HTML con clases repetidas y estilos inline, i18n a medias (textos duros).

## 8. Fase 2 — veredicto: el nuevo vs. el legacy (auditado el 2026-08-31)

Comparación verificada leyendo `comercial-documento-detalles` + `erp-item-autocomplete` +
`importar-documento` + la familia contable + el kernel `@reddoc/core/calculo` y el schema OpenAPI
del backend.

### 8.1 Cubierto y a punto ✅

| Funcionalidad (§)                                           | Cómo lo resuelve el nuevo                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cálculo por línea y resumen (§5)                            | Kernel puro `@reddoc/core/calculo` + espejo reactivo del `FormArray`. Sin caches paralelos ni suscripciones por focus.                                                                                                                                                                                                   |
| Base `porcentaje_base` ≠ 100 (§5)                           | `TasaImpuesto.porcentajeBase` ya lo soporta (kernel AIU-ready).                                                                                                                                                                                                                                                          |
| Impuestos default del ítem por modo (§6.4)                  | `loadItemTaxes` + `tasasDelItem(item, modo)`; catálogo `?venta/compra=True` (bug del `modo` corregido el 2026-08-31).                                                                                                                                                                                                    |
| Búsqueda de ítem por nombre **y** código (§6.2)             | Mejor que el legacy: `?search=` del backend cubre **nombre, código y referencia** en un solo input (verificado en el schema), y la opción muestra `código - nombre`.                                                                                                                                                     |
| Importar pendientes de otro documento (§6.6)                | `POST documento-detalle/pendiente/` + modal lazy; alta → push al `FormArray`, edición → `masivo/` en una request. Diseño superior a los dos flujos legacy (ya analizado en `docs/architecture/importar-desde-documento.md`); la fila pendiente trae ítem+precio+impuestos y evita el forkJoin de N consultas del legacy. |
| Campo detalle (nota) por línea (§4)                         | Existe (`formControlName="detalle"`).                                                                                                                                                                                                                                                                                    |
| Líneas de cuenta `'C'`, naturaleza, débitos/créditos (§4–5) | Familia **contable** aparte (`contable-documento-detalles` + resumen con débitos/créditos/descuadre) — mejor que mezclar tipos en un mismo array.                                                                                                                                                                        |
| Eliminación/edición de líneas persistidas (§5)              | Transacción por línea contra `/documento-detalle` (PATCH/POST/DELETE) con respuesta autoritativa; elimina la necesidad de `detalles_eliminados` e `impuestos_eliminados`.                                                                                                                                                |
| Documento aprobado no editable (§6.9)                       | `canEditRow` del config oculta la acción de editar en la lista.                                                                                                                                                                                                                                                          |

### 8.2 Gaps — funcionalidades del legacy que faltan ❌

Ordenados por impacto:

1. ~~**Precio de compra (costo)**~~ — §5. **Corregido el 2026-08-31**: en `modo === 'compra'`,
   `loadItemTaxes` pisa el precio sembrado por el autocomplete con el `costo` de la lectura
   completa del ítem (`general/item/<id>/`, la misma consulta de los impuestos — sin red extra),
   respetando un precio ya tecleado por la persona. (`item/seleccionar/` no trae `costo`,
   verificado en schema; el legacy usaba `item.costo` en compra.)
2. ~~**Retenciones restan**~~ — §5. **Corregido el 2026-08-31**: `TasaImpuesto.operacion`
   (default `1`) firma el monto en `calcularImpuestosLinea`; una retención (−1) produce total
   negativo y el resumen la descuenta sola. Cableado en el catálogo (`operacion`), el ítem
   (`impuesto_operacion`), pendientes y el modal de servicio; con tests en el kernel.
   **Caveat (b) confirmado con payload real el 2026-08-31**: la línea guardada llega sin
   `operacion` y con `total` sin signo (aunque el backend calcula bien por dentro — sus agregados
   `impuesto_retencion`/`total` lo prueban). Puente implementado: la tabla de **edición** corrige
   el signo contra el catálogo (`signImpuestosLeidos`) y el mapper ya lee `impuesto_operacion` si
   llega — al serializarlo el backend, los ~20 **detalles** quedan corregidos solos. Pedidos al
   backend: `impuesto_operacion` en `GenDocumentoImpuesto` y en el serializador de `pendiente/`
   (mismo campo que ya expone el serializador de impuestos del ítem).
3. ~~**Lista de precios del contacto**~~ — §6.3. **Corregido el 2026-08-31**: en venta, al elegir
   un ítem la tabla lo cotiza contra la lista del cliente (`precio_id` de `contacto/seleccionar/`
   → `GET precio-detalle/?precio_id&item_id`, el reemplazo del `consultar_precio/` legacy que el
   backend nuevo no expone) y ese `vr_precio` pisa el del ítem; sin línea o en 0, cae al precio
   propio. Cableado en factura de venta y POS (paridad con el legacy: la recurrente tampoco lo
   tenía). Caveat: `GenDocumento` no serializa el precio del contacto → en edición solo aplica al
   (re)elegir el contacto.
4. **Filtro de documento origen al importar** — §6.6. El modal solo filtra por
   `documento__contacto_id`; el legacy fijaba además el **tipo** origen (p. ej. remisiones = 29) y
   aprobado/pendiente. Verificar qué garantiza `pendiente/` server-side; si no discrimina tipo, una
   factura podría listar pendientes de documentos que no debería facturar.
5. ~~**Lector de código de barras**~~ — §6.1. **Corregido el 2026-08-31**: input opcional en la
   barra de la tabla comercial (`scannerEnabled`); Enter resuelve el código contra
   `item/seleccionar/?search=` (cola `concatMap`: varios escaneos seguidos no se pisan), agrega la
   línea y dispara la tubería normal (precio pactado + impuestos). Exige coincidencia **exacta**
   de código (o resultado único) — a diferencia del legacy, que tomaba el primer parcial.
   Habilitado en factura de venta (paridad); sumar POS u otro es un atributo.
6. ~~**Crear ítem inline desde la línea**~~ — §6.2. **Corregido el 2026-08-31**: el
   autocomplete de ítems ofrece "crear ítem" al pie del panel (emite `createRequested`; el alta
   es del consumidor, `core` no conoce el master) y la tabla comercial abre el formulario del
   master como **modal** (el mismo `ItemFormComponent`, ahora dual página/modal vía
   `DynamicDialogRef` opcional); el ítem creado queda seleccionado en la fila y corre la tubería
   normal (precio pactado + impuestos).
7. **Almacén por línea** — §6.5. **Bloqueado por backend** (verificado 2026-08-31): el
   serializer de `documento-detalle` no acepta `almacen`, y la cabecera (`GenDocumento`) tampoco
   lo tiene. Sin campo en la API no hay nada que el front pueda persistir.
8. **Grupo contable por línea en compra** — §6.5. **Bloqueado por backend**: mismo caso, no hay
   `grupo` en el serializer de la línea ni `grupo_contabilidad` en la cabecera.
9. ~~**Extraer IVA / precio con IVA incluido**~~ — §6.8. **Corregido el 2026-08-31**: botoncito
   `%` junto al precio de cada línea → popover "precio con impuestos incluidos" con vista previa
   del precio base en vivo. Inversión **exacta** del kernel (÷ `1 + Σ fracciones` de las tasas que
   suman — aditivas sobre la misma base, no en cadena como el legacy, que con varias tasas era
   inconsistente con su propio cálculo) y las retenciones no participan (no hacen parte de un
   precio al público).
10. **AIU** — §6.7. No existe el modal (el kernel ya está listo); rediseñar sin porcentajes
    hardcodeados 9/3/5.
11. ~~**Congelar el formulario de edición si el documento está aprobado**~~ — §6.9. **Falso
    gap** (fe de erratas de esta auditoría, verificado el 2026-08-31): la URL directa SÍ está
    cubierta — `editableDocumentResolver` corre en la ruta `editar/:id`, evalúa la misma política
    `canEditRow: (row) => !row.estado_aprobado` que la lista y el detalle, y ante un aprobado
    avisa con toast y redirige al detalle sin montar el form. Los 25 configs de documentos la
    declaran (solo los de humano no, por su ciclo de vida propio).

### 8.3 Diferencias de diseño deliberadas (no son gaps)

- El padre es dueño del `FormArray` y lo pasa por input (vs. form global en un service).
- La carga del documento la hace la página/resolver, no la tabla.
- En edición las líneas persisten al instante por línea (vs. submit gigante con eliminados).
- Redondeo solo en el monto final de cada impuesto (vs. redondeo por etapa del legacy).
