# Guía del POS (`apps/pos`)

> Cómo funciona la caja y dónde está cada pieza. El porqué de cada decisión está en
> `docs/architecture/pos-migracion.md` (análisis) y `pos-migracion-sprints.md`
> (plan y estado). Lo pendiente con backend, en `pos-consultas-backend.md`.

## Recorrido de quien vende

1. **Entrar a la empresa.** Login → `/contenedores` → `/t/<slug>/caja`. Solo entran
   empresas con el módulo de venta (`acceso_venta`); sin él, se vuelve a contenedores
   con un aviso (`core/acceso/venta-access.guard.ts`).
2. **Configurar la caja una vez.** `/t/<slug>/configuracion`, con dos dueños:
   - **Tipo de documento** (factura POS o POS electrónica): es **de la empresa** y vive en el
     backend (`GenConfiguracion.ven_pos_documento_tipo`, por `configuracion/campos/` y
     `actualizar/`). Cambiarlo lo cambia para todas sus cajas.
   - **Almacén, sede y asesor:** son **de la caja física** y se guardan en el navegador, por
     empresa.

   La cuenta de cada cobro no se configura: sale del tipo de cuenta bancaria (ver Cobrar).
   Sin tipo y almacén, la caja avisa y no deja cobrar. Si no se puede leer el tipo,
   avisa con un reintento.

3. **Armar la venta.** Tocar una tarjeta o leer un código suma una unidad. Varias ventas
   abiertas en pestañas, que sobreviven a recargas. Cliente por defecto "Consumidor
   final"; al cambiarlo, las líneas se recotizan con su lista de precios (las editadas a
   mano se respetan). La caja no deja pasar del stock disponible.

   **Imprimir cuenta** (el botón de la impresora, junto a Cobrar) saca una pre-cuenta de
   80 mm con lo que se va a cobrar, para quien se lleva la cuenta y vuelve a pagar. La arma
   la caja (`caja/pre-cuenta/`) con el resumen del carrito y los datos de la empresa de
   `configuracion/campos/`: no crea documento ni consume número, la venta sigue editable y
   el papel dice "Documento no válido como factura". La ciudad de la empresa no sale porque
   la configuración solo trae su id.

4. **Cobrar.** Efectivo: lo recibido (con billetes sugeridos) y el cambio. Transferencia: el
   total exacto, y la referencia del comprobante (opcional) va al comentario del documento,
   porque el pago no tiene dónde guardarla. El asesor sale de la caja y se puede cambiar.

   **La cuenta sale del medio.** El selector solo ofrece las cuentas bancarias de su tipo:
   el efectivo, las de tipo caja (`CUENTA_BANCO_TIPO_CAJA`, el 3); el resto, cualquier otro
   tipo (1 "Banco nacional", 2…). Si hay una sola, va puesta; si hay varias, se propone la
   última que usó esta caja con ese medio (en el navegador, `pos:cuentas:<slug>`) y si no,
   la elige quien cobra. Las cuentas se piden enteras cada vez que se abre el cobro y se
   filtran en el front, porque `cuenta-banco/seleccionar/` no declara filtro por tipo.

   Crédito y débito se ven deshabilitados y no se pueden elegir. El cobro crea el documento
   con sus líneas, registra el pago y lo aprueba. Al terminar se puede imprimir el PDF del
   backend.

5. **Consultar.** `/t/<slug>/historial`: facturas POS de los dos tipos, con filtros e
   imprimir.

### Atajos

| Tecla      | Acción                                                |
| ---------- | ----------------------------------------------------- |
| `F2`       | Cobrar (en tablet, abre la venta)                     |
| `F3` o `/` | Ir al buscador                                        |
| `F4`       | Nueva venta                                           |
| `Enter`    | En modo código, buscar y agregar                      |
| `F1`–`F4`  | En el cobro: efectivo, transferencia, crédito, débito |
| `Enter`    | En el cobro, cobrar                                   |

Si se teclea sin ningún campo con foco (lo que hace el lector de barras), el foco salta al
buscador antes de que llegue la tecla. Con un modal abierto no se intercepta nada.

### Pantalla angosta (tablet)

Por debajo de 1024px el catálogo ocupa todo y la venta pasa a un drawer lateral, que se
abre desde la barra inferior (cantidad y total).

## Qué hacer con un cobro que quedó a medias

Si el cobro falla **después** de crear el documento (al registrar el pago o al aprobar),
la venta queda **bloqueada** con el número de ese documento: no se edita ni se cierra.

- **Reintentar** retoma desde donde falló: no crea otra factura, no repite un pago que
  ya quedó y no aprueba un documento ya aprobado.
- **Descartar** borra el documento sin aprobar y desbloquea la venta.

El cobro termina aunque se cierre el diálogo o se cambie de sección: sus efectos quedan en
el store de carritos.

## Mapa del código

```
apps/pos/src/app/
├── core/
│   ├── acceso/venta-access.guard.ts       acceso_venta
│   ├── documento/venta-pos.service.ts     crear, aprobar, eliminar, imprimir
│   ├── storage/pos-storage.service.ts     localStorage tolerante a fallos
│   └── utils/generar-id.ts                id local (sirve sin HTTPS)
├── features/
│   ├── caja/
│   │   ├── catalogo/      store, mapper, tarjeta, buscador
│   │   ├── carrito/       modelo, operaciones puras, store, panel, pestañas
│   │   ├── cobro/         medios de pago, pipeline reanudable, diálogo
│   │   ├── cliente/       alta rápida de cliente
│   │   ├── item-rapido/   alta rápida de ítem
│   │   └── pages/caja/    la pantalla
│   ├── historial/
│   └── configuracion/     store de la caja + página
└── layouts/               shell (contenedores) y workspace (sidebar)
```

Lo que el POS comparte con el ERP vive en `@reddoc/core`: ítem, lista de precios, línea
comercial, pagos, cabecera POS, utilidades de contacto y permisos por modelo.

## Reglas al tocarlo

- **Las páginas de auth y los diccionarios se importan de `@reddoc/ui/auth` y
  `@reddoc/ui/i18n`**, no del barrel. Desde el barrel arrastran al bundle inicial todo lo
  que también usan las pantallas lazy (pasó de 1.14 a 1.45 MB). El budget del POS está a
  1.3 MB para que esa regresión rompa el build.
- **Nada de ids fijos del tenant**, con una excepción decidida por producto: el método de
  pago del documento va siempre con id `1` (`METODO_PAGO_POS_ID`, en `cobro.mapper.ts`),
  sea cual sea el medio, sin consultar el catálogo. El plazo sí se busca: el de 0 días.
- **Un medio de pago nuevo** se habilita en `cobro/medios-pago.ts` (con si entra a una
  cuenta de caja o de banco) y su formulario en el diálogo. El pipeline no cambia.
- **Una sola pestaña por empresa.** Las ventas se guardan como un solo bloque en
  `localStorage`; dos pestañas se las pisarían. `core/pestana/pestana-unica.service.ts` reserva
  la caja con Web Locks y el workspace muestra un aviso en la segunda pestaña, que toma la caja
  sola cuando la otra se cierra. Nada que escriba ventas debe montarse fuera del workspace.
- **Un diálogo dentro del panel de la venta va con `appendTo="body"`.** En tablet el panel vive
  en un `p-drawer` con `transform`, que encierra todo lo `position: fixed`: sin eso el modal se
  centra en el drawer y su máscara no cubre la pantalla.
- **Lo que guarda el navegador lleva versión o validación** (`esEstadoCarritos`,
  `esConfiguracionCaja`): un cambio de forma descarta lo viejo en vez de romper la caja.
- **Editar un ítem desde la caja** usa `PATCH item/{id}/` con solo los campos del modal
  (`itemRapidoToPatch`). `impuestos_ids` reemplaza la lista entera: el mapper suma los
  impuestos de compra que el ítem ya tenía. Con movimientos (`validar-uso`), tipo e
  inventario quedan bloqueados, como en el ERP.
- **Permisos:** `ModelPermissionsService` decide si se ofrecen el ítem rápido, la estrella
  de favorito, el lápiz de editar y el cliente rápido. Es UX: el backend responde 403 igual.

## Despliegue

El workflow `deploy.yml` despliega cualquier app afectada.

- **Staging:** `https://pos.reddoc.uk`, con secrets de deploy y clave de Turnstile
  configurados. El ERP y turnos lo ofrecen en el app-switcher (`posUrl`).
- **Producción:** `https://pos.reddoc2.co`, también ofrecido por el ERP y turnos
  (`posUrl` en sus `environment.prod.ts`).
