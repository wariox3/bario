# Masters pendientes

Masters administrativos solicitados para los módulos pero que **aún no existen** en el
código. Se listan aquí para implementarlos luego sin perder el contexto de dónde se
pidieron.

Al crear cada uno, seguir el patrón de los masters existentes
(`apps/erp/src/app/features/general/masters/<entity>/`) y dejarlo **module-agnostic**
para poder reusarlo entre módulos (usar `currentModuleId` / `resolveModuleName` de
`@erp/core/erp-modules` en breadcrumbs y navegación, y `<X>_LIST_PATH` solo con el
segmento de la entidad). Luego cablearlo en `<modulo>.routes.ts` (loadChildren) y en el
`menu` del `<modulo>.module-descriptor.ts`, y agregar `entities.<entity>.name` en i18n
(`app.es.ts` / `app.en.ts` / `app.dict.ts`).

| Master         | Pedido en | Segmento de ruta | i18n                       | Estado    |
| -------------- | --------- | ---------------- | -------------------------- | --------- |
| sede           | Venta     | `sedes`          | `entities.sede.name`       | Hecho     |
| método de pago | Compra    | `metodos-pago`   | `entities.metodoPago.name` | Hecho     |
| empleado       | Humano    | `empleados`      | `entities.empleado.name`   | Pendiente |

## Notas

- **sede**: solicitada en el cableado de administradores del módulo Venta. Vive en
  `features/general/masters/sede/` y se registró en el módulo General.
- **método de pago** (antes "forma de pago"): solicitada en el módulo Compra. Es el
  **master** (CRUD) sobre `/general/metodo-pago/`; no confundir con el endpoint
  `seleccionar` de `metodo-pago` que ya usa la factura de venta. Vive en
  `features/general/masters/metodo-pago/` (module-agnostic) y se cableó en Compra.
- **empleado**: solicitado en el módulo Humano. El resto de admins de Humano (contrato,
  cargo, grupo, sucursal, adicional, crédito, novedad) ya existen y están cableados.
  Revisar si el empleado es un master propio o se deriva de `contacto` con el flag
  `empleado` antes de implementarlo.
