# Contabilizar — mejoras propuestas

Lo portado es **un calco funcional del ERP anterior**: la pantalla hace exactamente lo mismo, para
poder comparar contra producción sin dudas. Este documento recoge lo que quedó fuera a propósito.

Nada de acá está implementado. Cada punto dice qué cambiaría, por qué, y qué habría que decidir o
confirmar antes.

Portado el 2026-07-28. Ver también `../../PENDIENTES.md` (supuestos de backend del módulo).

---

## 1. Descontabilizar a ciegas — lo más importante

**Cómo funciona hoy.** El botón _Descontabilizar_ abre un modal donde se escribe un rango de fechas
(obligatorio), opcionalmente un rango de números y un tipo de documento. Al confirmar:

1. Se consultan los documentos contabilizados que caen en ese criterio (tope de 1000).
2. Se toman sus ids.
3. Se mandan todos a `descontabilizar/`.

**El problema.** El usuario **nunca ve qué se va a revertir**. Escribe un rango, pulsa un botón, y se
deshace la contabilización de hasta mil documentos que no se le mostraron. Para una operación que
revierte asientos contables, es mucha confianza depositada en que el rango esté bien escrito.

En el port se agregaron dos paliativos que el original no tenía —un aviso en el modal y un toast
cuando el criterio abarca más documentos que el tope—, pero **no resuelven el fondo**: siguen siendo
avisos sobre algo que no se puede inspeccionar.

### Opción A — segundo tab "Contabilizados" _(recomendada)_

Convertir la pantalla en dos tabs, como _enviar factura electrónica_ de venta:

| Tab            | Contenido                                                         | Acción                       |
| -------------- | ----------------------------------------------------------------- | ---------------------------- |
| Pendientes     | lo que hay hoy                                                    | Contabilizar                 |
| Contabilizados | documentos ya contabilizados, con filtros de fecha, número y tipo | Descontabilizar la selección |

**A favor**: se ve exactamente qué se revierte; se puede descontabilizar un solo documento sin
inventar un rango que lo aísle; desaparece el tope de 1000 porque se pagina como cualquier lista; y
reusa el patrón de tabs que el ERP ya tiene.

**En contra**: se aleja de la pantalla que el usuario conoce. Descontabilizar un periodo completo
pasa a requerir filtrar y "seleccionar todo", que hoy es un solo formulario.

**Requiere decidir**: si "seleccionar todo" debe abarcar todas las páginas del filtro o solo la
visible (ver §2, es el mismo problema).

### Opción B — mantener el modal, agregar previsualización

Dejar el flujo actual pero partirlo en dos pasos: _Buscar_ muestra cuántos y cuáles documentos
caen en el criterio (al menos un conteo y una muestra), y solo entonces se habilita _Descontabilizar_.

**A favor**: cambio chico, el usuario no reaprende nada.
**En contra**: sigue siendo posible aceptar sin mirar.

El servicio ya está preparado para esto: `buscarParaDescontabilizar` devuelve `{ ids, total }` y hoy
solo se usa el `ids`. La previsualización se arma con lo que ya devuelve.

> **Recomendación**: A. B es el plan de contingencia si se quiere tocar poco.

---

## 2. Contabilizar más allá de la página visible

Hoy la selección vive en la página cargada: si hay 800 documentos pendientes, hay que ir página por
página, o subir el tamaño de página a mano.

El original tenía el mismo límite (su "seleccionar todo" marcaba solo lo visible), así que no es una
regresión — pero sí una molestia real en cierres de mes.

**Propuesta**: un "contabilizar todo lo que cumple el filtro", con conteo y confirmación explícita
(`Se van a contabilizar 812 documentos`). Convive con la selección manual sin reemplazarla.

**Requiere confirmar con backend**: si `contabilizar/` puede recibir un criterio en vez de una lista
de ids. Si solo acepta ids, el front tendría que paginar para juntarlos, que es exactamente lo que
hace hoy el descontabilizar por rango — y arrastraría su mismo tope.

---

## 3. Mostrar el comprobante

El backend ya devuelve `comprobante_id` y `comprobante_nombre` en la fila (están en el serializador
del legacy), pero ninguna de las dos pantallas los pinta.

Es el dato que uno quiere ver **después** de contabilizar: a qué comprobante quedó asociado el
documento. Hoy hay que salir a buscarlo a otra pantalla.

Aplica sobre todo si se hace la opción A: en el tab de contabilizados, el comprobante es la columna
que le da sentido a la fila.

---

## 4. Bugs del original que ya no se portaron

No son propuestas: se corrigieron al portar, y quedan anotados para que no sorprenda la diferencia
al comparar contra producción.

| Bug del ERP anterior                                                                               | Estado acá                             |
| -------------------------------------------------------------------------------------------------- | -------------------------------------- |
| La paginación intercambiaba límite y desplazamiento (`limite: data.desplazamiento`)                | Corregido: paginación estándar del ERP |
| La selección mutaba el array del signal con `push()` en vez de `set()`, y forzaba `detectChanges`  | Corregido: signals inmutables          |
| `fecha_desde` declaraba `[fecha, this, Validators.required]` — pasaba el componente como validador | Corregido: `Validators.required`       |
| Si el rango abarcaba más de 1000 documentos, los sobrantes se descartaban en silencio              | Se avisa con un toast                  |

---

## 5. Pendiente de confirmar con backend

- Los paths `general/documento/contabilizar/` y `general/documento/descontabilizar/`, y que ambos
  reciban `{ ids }`.
- Que el listado se acote con los tres filtros permanentes:
  `estado_contabilizado=false`, `estado_aprobado=true`, `documento_tipo__contabilidad=true`.
- El catálogo de tipos: se consume `general/documento-tipo/seleccionar/?contabilidad=True` (el legacy
  usaba `documento_tipo` con guion bajo).
- El tercero se lee como `contacto_nombre`, la convención del resto de utilidades del ERP; el legacy
  lo tipaba `contacto_nombre_corto`.
- Si `descontabilizar/` valida algo del lado del servidor (periodo cerrado, documento ya usado en un
  cierre) o si acepta cualquier id sin chequear. Importa para saber cuánta protección tiene que
  poner el front.
