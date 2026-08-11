# Permisos por módulo y recurso en el ERP

Guía en orden de lectura. Primero **qué problema resolvemos**, después **el
recorrido completo** de una petición desde que el usuario entra hasta que ve (o
no) la pantalla, y al final **la receta** para sumar un recurso.

---

## 0. El problema

El usuario entra a `/t/acme/venta/contactos` y no le corresponde ver contactos.
Hay tres formas de llegar ahí y cada una merece una respuesta distinta:

| Llega por         | Qué debe pasar                                      |
| ----------------- | --------------------------------------------------- |
| El menú           | El link no existe                                   |
| URL directa       | Pantalla de acceso denegado, **con la URL intacta** |
| Ya estaba adentro | El 403 del backend reemplaza el contenido           |

La URL intacta no es un capricho: el usuario llegó pegando un link que le pasó
un compañero. Si lo rebotamos al inicio, no puede reenviárselo al admin para
pedir acceso, ni nosotros reproducir el reporte.

> **Nada de esto es seguridad, es UX.** El backend sigue siendo quien responde 403. Acá solo evitamos ofrecer puertas que van a rebotar.

---

## 1. Los tres ejes (no mezclarlos)

`PermissionsService` (`apps/erp/src/app/core/permissions/permissions.service.ts`)
responde tres preguntas **independientes**. Confundirlas es el error caro de
esta capa:

| Pregunta                           | API                                    | De dónde sale                          |
| ---------------------------------- | -------------------------------------- | -------------------------------------- |
| ¿Qué **compró el tenant**?         | `enabledModuleIds` / `canAccessModule` | Flags `acceso_*` del contenedor ✅     |
| ¿Qué puede hacer **este usuario**? | `can(modelo)` / `canResolve(modelo)`   | `GET /general/modelo/<id>/permiso/` ✅ |
| ¿**Administra** el contenedor?     | `isContenedorAdmin`                    | `rol_id` del contenedor ✅             |

El acceso final es la **intersección**. El tercero gobierna solo la pantalla de
Seguridad, no el trabajo operativo.

✅ = ya llega del backend. Lo que falta hoy no es el mecanismo sino la cobertura
del catálogo de modelos: ver sección 5.

### El eje 1 en concreto: las flags `acceso_*`

`/contenedor/cliente/lista-usuario/` devuelve, por contenedor:

```jsonc
{
  "cliente_id": 13,
  "schema_name": "seguridad",
  "nombre": "Seguridad",
  "rol_id": 1,
  "rol_nombre": "Propietario", // ← eje 3
  "acceso_venta": true,
  "acceso_compra": true, // ← eje 1
  "acceso_tesoreria": true,
  "acceso_cartera": true,
  "acceso_inventario": true,
  "acceso_humano": true,
  "acceso_contabilidad": true,
}
```

Son **7 flags para 7 módulos**. `general` no tiene: es la base, no se contrata
aparte. Seguridad tampoco: no sale en el topbar y se gobierna por `rol_id`.

Cada descriptor declara cuál le toca, en vez de derivarla del id — así un módulo
nuevo puede no tener flag sin que nada lo adivine mal:

```ts
// features/venta/venta.module-descriptor.ts
export const VENTA_MODULE: ErpModuleDescriptor = {
  id: 'venta',
  accessFlag: 'acceso_venta',
  …
};
```

---

## 2. El vocabulario: el modelo del backend

El backend concede **por modelo**. Un modelo es una tabla de `gen_modelo` con un
id estable:

```
GET /general/modelo/10001/permiso/  →  {"ver":true,"crear":false,"editar":false,"eliminar":false}
```

Eso es todo el vocabulario que necesita el front: **el id del modelo y la
acción**. No hay códigos `<modulo>.<recurso>.<accion>` ni catálogos por módulo —
los hubo mientras se esperaba un backend que mandara una lista de códigos, y se
sacaron cuando llegó este, que no puede expresar esa distinción: un modelo es
**global**, contactos es `10001` se entre desde General, Venta o Compra.

Lo único que el front declara es el mapeo **pantalla → modelo**, en tres lugares
que deben coincidir:

| Dónde            | Para qué                                            |
| ---------------- | --------------------------------------------------- |
| Entrada del menú | Esconder el link (paso 3)                           |
| Ruta             | Bloquear la URL directa y pedir los grants (paso 4) |
| Pantalla         | Podar los botones (paso 5)                          |

Si divergen, el sidebar ofrece un link que rebota.

### El catálogo de modelos

`core/permissions/modelo.catalog.ts` es el **espejo** de `gen_modelo`, agrupado
por app y ordenado por id para que diffear contra un dump nuevo sea trivial. Los
ids son datos sembrados —un enum del dominio del backend—, por eso están
hardcodeados: descubrirlos en runtime costaría un round trip para terminar
hardcodeando igual un identificador, solo que string.

```ts
MODELO.general.contacto; // 10001
MODELO.humano.contrato; // 40023
```

Las claves se namespacean por app porque hay nombres repetidos (`periodo` está en
contabilidad y en humano). El tipo `ModeloId` es la unión de los ids concretos,
así que un número inventado no compila.

**Lo que no declara modelo queda abierto.** No hay a quién preguntarle, y negar
por defecto escondería medio ERP. Hoy es el caso de los documentos y de los
masters que el backend aún no cataloga (ver sección 5).

---

## 3. El recorrido, paso a paso

Seguimos a un usuario que abre el ERP y termina en contactos.

### Paso 1 · De dónde salen los permisos del usuario

`ModelPermissionsService` (`core/permissions/model-permissions.service.ts`) los
pide **por modelo, la primera vez que se entra a su feature**:

```
GET /general/modelo/10001/permiso/  →  {"ver":true,"crear":false,"editar":false,"eliminar":false}
```

La petición la dispara el `permissionGuard` en el `canMatch` de la ruta (paso 4),
así que la respuesta ya está cuando la pantalla monta. Entrar a la lista, abrir
el formulario y volver cuesta **una sola** petición en toda la sesión: hay cache
por modelo y deduplicación de peticiones en vuelo.

El cache vale para **este usuario en esta empresa**: cambiar cualquiera de los
dos lo descarta entero. El usuario importa por un camino poco obvio — el logout
explícito limpia el tenant, pero una sesión vencida termina en `clearSession()`,
que no lo toca; sin mirar al usuario, quien entrara después heredaba sus
permisos. Las respuestas que estaban en el aire al momento del cambio llegan,
se le entregan a quien las esperaba y **no se guardan** (contador de época).

Dos reglas gobiernan lo que no sabemos:

- **Ante error de red, permitir.** Esto no es seguridad, es UX: el backend
  responde 403 igual (paso 6). Un endpoint de permisos con hipo no puede dejar a
  nadie encerrado en una app que sí funciona. Solo un `false` explícito niega.
- **Modelo sin consultar, permitir.** `can()` es una lectura sincrónica del cache
  y responde `true` para lo que todavía no se preguntó. Es lo que sostiene el
  menú completo antes de entrar (ver paso 3).

> **No hay petición masiva.** El backend todavía no expone un endpoint que
> devuelva todos los modelos de una. Cuando exista, se cambia `fetch()` en ese
> servicio y **nada más** — y recién ahí el menú podrá podarse antes de entrar.

### Paso 2 · El topbar decide qué módulos pinta

`ModuleBarComponent` aplica **dos filtros distintos**:

```ts
ERP_MODULES.filter((m) => permissions.canAccessModule(m.id) && hasVisibleMenu(m.menu, can));
//                        └─ eje plan del tenant          └─ eje permisos del usuario
// `can` acá es `canShowInMenu`: hoy no esconde nada (ver paso 3).
```

`canAccessModule` sale de `enabledModuleIds`, que cruza las flags `acceso_*` del
contenedor (vía `readModuleAccessFlags`) contra el `accessFlag` de cada
descriptor. Un módulo sin `accessFlag` está siempre habilitado.

Misma regla que en el paso 1 para lo que falta: si el contenedor **no trae
ninguna** flag `acceso_*`, no se restringe nada. Un `Set` vacío por un campo que
faltó dejaría el topbar en blanco, y una app que parece rota es peor que una que
muestra de más. Pero si las flags vienen, se respetan al pie de la letra: en
`false` esconde, y ausente entre otras presentes también —el backend ya demostró
que las manda.

`hasVisibleMenu` (`menu-visibility.ts`) responde: ¿le queda al módulo alguna
entrada alcanzable **de las que declaran permiso**? La distinción importa —casi
todos los módulos tienen un "Inicio" sin permiso, y contarlo haría que ningún
módulo desapareciera nunca.

Un módulo que todavía no declara ningún permiso se muestra entero, para que el
topbar no se vacíe mientras se migran módulos de a uno.

### Paso 3 · El sidebar poda su menú

`WorkspaceLayoutComponent.sections` pasa el menú del módulo activo por
`visibleSections`, que poda **de abajo hacia arriba**:

```
items sin permiso  →  grupos que quedaron vacíos  →  acordeones que quedaron vacíos
```

Los tres niveles importan: un acordeón que se abre a la nada parece un bug, no
una restricción.

> ⚠️ **Hoy no poda.** Los grants llegan al entrar al feature (paso 1), así que
> antes de entrar no se sabe nada. Podar con lo aprendido —que fue el primer
> intento— da un menú que cambia bajo los pies: hacés clic en "Contactos", te
> rebota al acceso denegado y la entrada que acabás de tocar desaparece. Un menú
> estable que a veces rebota se entiende; uno que se reordena solo, no.
>
> Por eso el menú pregunta por `canShowInMenu`, que devuelve `true` mientras
> `GRANTS_COMPLETOS` sea `false`. Esa bandera se prende cuando exista el endpoint
> masivo, y con eso el filtrado arranca sin tocar ni un descriptor.

Lo que hace visible cada entrada es su campo `modelo`, declarado en el descriptor
del módulo:

```ts
// features/venta/venta.module-descriptor.ts
{ labelKey: 'entities.contacto.name',
  path: 'contactos',
  modelo: MODELO.general.contacto },
```

### Paso 4 · La ruta, para quien llega por URL directa

Esconder el link no alcanza: la URL sigue existiendo. En
`features/venta/venta.routes.ts` cada recurso va envuelto:

```ts
...withPermission(MODELO.general.contacto, {
  path: 'contactos',
  loadChildren: () => import('...').then((m) => m.CONTACTO_ROUTES),
}),
```

El `...` no es decorativo: **`withPermission` devuelve dos rutas**.

```
1ª  { path: 'contactos', canMatch: [permissionGuard], data: { modelo }, loadChildren… }
2ª  { path: 'contactos', children: [{ path: '**', → AccessDeniedPageComponent }] }
```

**Acá se paga la petición del paso 1**: entrar al feature es el momento de
preguntar, y la respuesta queda en cache para los botones de la pantalla. Por eso
el guard es asíncrono (devuelve un `Observable<boolean>`).

Cuando el guard rechaza, la primera **no hace match** y el router sigue
buscando: encuentra la segunda, con el mismo path. Resultado: misma URL, sidebar
y topbar intactos, y el chunk lazy del master sin descargar (por eso es
`canMatch` y no `canActivate` — con `canActivate` el navegador se baja el bundle
entero para después no mostrarlo).

El `**` de la gemela cubre también las sub-rutas (`contactos/nuevo`,
`contactos/12/editar`), que si no caerían al comodín de la app y terminarían
fuera del tenant.

**El mismo mecanismo, un nivel más arriba**: un módulo fuera del plan tiene el
mismo agujero de la URL directa. En `app.routes.ts`, cada módulo con flag va
envuelto en `withModuleAccess`, que arma el mismo par:

```ts
...withModuleAccess('venta', {
  path: 'venta',
  loadChildren: () => import('./features/venta/venta.routes').then((m) => m.VENTA_ROUTES),
}),
```

Su gemela además limpia el módulo activo (`erpModuleResolver(null)`): sin eso el
sidebar seguiría mostrando el menú del módulo anterior al lado de un cartel que
dice que este no está disponible.

Los dos casos muestran textos distintos, porque la salida del usuario es
distinta: un permiso se lo da el administrador del contenedor, un módulo fuera
del plan se resuelve con quien contrata. El motivo viaja en el `data` de la ruta
(`accessDeniedVariant`).

### Paso 5 · Ya adentro: los botones

Para quien **sí** entró pero no puede todo — ve la lista pero no crea. Los grants
ya están en cache (los trajo el guard), así que los botones nacen con la decisión
tomada: no aparecen para desaparecer un instante después.

Las listas del ERP declaran sus acciones como datos, así que se podan con
`visibleActions` / `visiblePrimaryAction` (`action-visibility.ts`):

```ts
// El predicado se liga una vez al modelo de la pantalla…
private readonly can = (accion: PermissionAction) =>
  this.permissions.can(MODELO.general.contacto, accion);

// …y los helpers ya no necesitan saber de qué recurso se trata.
protected readonly rowActions = computed(() => visibleActions(CONTACTOS_ROW_ACTIONS, this.can));
protected readonly primaryAction = computed(() =>
  visiblePrimaryAction(CONTACTOS_PRIMARY_ACTION, this.can),
);
```

El mapeo id → acción vive en `ACTION_PERMISSION_BY_ID`: `new`/`import` son
`crear`, `edit` es `editar`, `delete` es `eliminar`. Lo que no está en el mapa
pasa siempre (`view` lo cubre el permiso de la pantalla; `export-excel` y
`refresh` son lecturas de lo que ya tenés delante). Los grupos se podan por
dentro y desaparecen si se quedan sin hijos: un dropdown que se abre vacío parece
un bug.

**Se esconde, no se deshabilita.** Un botón deshabilitado que nunca se va a
habilitar es ruido.

Para markup suelto está la directiva:

```html
<button *appHasPermission="MODELO.general.contacto; accion: 'crear'">Nuevo</button>
```

**El permiso es del modelo, que es global**, así que en una pantalla compartida
(contactos se enruta desde General, Venta y Compra) vale igual desde donde se
haya entrado.

Nada de esto reemplaza al paso 4: esconder el botón no impide escribir la URL del
formulario. Son capas complementarias.

### Paso 6 · El 403 del backend, con la pantalla ya abierta

Los pasos 2 a 5 son UX del front. El backend es el que manda, y puede negar algo
que el front creyó permitido (permiso revocado en caliente, cambio de
contenedor, o —hoy— porque el front todavía no filtra nada).

```
403 ──► errorInterceptor ──► handleForbidden ──┬─ ¿niega el listado?
                                               │   └─ sí → ForbiddenPageStore.block(motivo) + EMPTY
                                               └─ no → toast, el error sigue su camino
```

**Qué cuenta como "niega el listado"**: un `POST` a `.../lista/`, la convención
de listados del monorepo (la usan los 43 servicios y también el gateway de
documentos). Deliberadamente **no** cuenta cualquier `GET`: los selects y
modales de un formulario también hacen GET, y un 403 en uno de ellos no invalida
la pantalla entera. Preferimos quedarnos cortos y dejar el toast a bloquear de
más.

**Por qué se corta con `EMPTY` en vez de propagar el error**: si el error llega
al componente, este dispara encima su toast de "no se pudo cargar". El usuario
terminaría con dos avisos y una pantalla en blanco, que es justo lo que este
camino viene a arreglar. Como `EMPTY` completa, los `finalize` de los
componentes (spinners) corren igual.

`WorkspaceLayoutComponent` lee el store y rinde el panel en lugar del contenido.
El `<router-outlet>` **no se destruye**, solo se oculta, para no reactivar la
ruta al volver. El store se limpia solo en cada `NavigationEnd`: el bloqueo
pertenece a la pantalla que lo provocó, no a la sesión.

El mensaje que se muestra es **el que mandó el backend**. El front no inventa el
motivo; solo lo enmarca.

---

## 4. Mapa de archivos

**`apps/erp/src/app/core/permissions/`**

| Archivo                        | Qué hace                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| `permission.types.ts`          | `PermissionAction`, `ModelGrants`, `ActionPredicate`         |
| `modelo.catalog.ts`            | `MODELO` — espejo de `gen_modelo` (los ids del backend)      |
| `model-permissions.service.ts` | **Único punto de contacto con el backend** (paso 1)          |
| `permissions.service.ts`       | `can` / `canResolve` + los otros dos ejes                    |
| `action-visibility.ts`         | `visibleActions` — poda los botones de una lista (paso 5)    |
| `menu-visibility.ts`           | `visibleSections` / `hasVisibleMenu` (pasos 2 y 3)           |
| `module-access.ts`             | `readModuleAccessFlags` — las flags `acceso_*` (pasos 1 y 2) |
| `permission.guard.ts`          | `permissionGuard`, el `CanMatch` por modelo (paso 4)         |
| `module-access.guard.ts`       | `moduleAccessGuard`, el `CanMatch` por módulo (paso 4)       |
| `access-denied-route.ts`       | `accessDeniedTwin` — la gemela que preserva la URL (paso 4)  |
| `with-permission.ts`           | Par de rutas protegidas por un modelo (paso 4)               |
| `with-module-access.ts`        | Par de rutas de un módulo (paso 4)                           |
| `has-permission.directive.ts`  | `*appHasPermission` (paso 5)                                 |

**Fuera de esa carpeta**

| Archivo                                                    | Qué hace                                |
| ---------------------------------------------------------- | --------------------------------------- |
| `core/components/access-denied/access-denied.component.ts` | El panel visual (ícono, título, salida) |
| `core/components/access-denied/access-denied.page.ts`      | El panel como página completa           |
| `libs/core/.../errors/forbidden-page.store.ts`             | El bloqueo por 403 (paso 6)             |
| `libs/core/.../interceptors/error-handlers.ts`             | `handleForbidden` (paso 6)              |

Los modelos del contenedor (`ContenedorAccesoFlags`, `Contenedor`,
`ContenedorAccess`) viven en `libs/core/src/lib/tenant/`.

Tests (erp):

| Spec                                | Qué protege                                                        |
| ----------------------------------- | ------------------------------------------------------------------ |
| `model-permissions.service.spec.ts` | Cache, cambio de usuario/empresa, respuestas tardías, fallo de red |
| `permission-wiring.spec.ts`         | Que menú y ruta declaren el mismo modelo, por módulo               |
| `permission.guard.spec.ts`          | Que denegar caiga en la gemela y no en un redirect                 |
| `with-permission.spec.ts`           | El par de rutas, el `data` preservado, las sub-rutas               |
| `menu-visibility.spec.ts`           | La poda de tres niveles del menú                                   |
| `action-visibility.spec.ts`         | La poda de botones y grupos                                        |
| `module-access.spec.ts`             | Las flags `acceso_*`                                               |
| `venta.routes.spec.ts`              | Lo mismo que el guard, pero con las rutas reales de un módulo      |

En `libs/core`: `error-handlers.spec.ts` (el 403 del paso 6).

---

## 5. Estado actual

**Eje 1 (plan del tenant): funcionando.** El backend manda las flags `acceso_*` y
el ERP las respeta en el topbar (paso 2) y en la URL directa (paso 4).

**Eje 2 (permisos del usuario): funcionando para los masters catalogados.** El
endpoint responde, el guard lo consulta al entrar y los botones se podan solos.
Lo que falta es cobertura del catálogo, no mecanismo:

| Falta                              | Por qué                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Los documentos**                 | Los ~30 tipos comparten `general.documento` (10002). Un permiso los gobernaría a todos por igual, así que ninguno declara modelo. Falta que el backend discrimine por `documento_tipo_id`. |
| **Inventario, venta y compra**     | Sus modelos no están en `gen_modelo` todavía (almacén, entre otros).                                                                                                                       |
| **Podar el menú**                  | Requiere el endpoint masivo (ver paso 1). Hasta entonces `GRANTS_COMPLETOS = false` y el menú se muestra entero.                                                                           |
| **Exportar / importar / imprimir** | Solo hay cuatro verbos. Hoy `import` se mapea a `crear` y exportar/imprimir pasan libres, por asumir que quien ve puede llevarse lo que ve.                                                |

Dos reglas hacen que la adopción sea gradual y que nada se rompa mientras tanto:

- Entrada o ruta sin `modelo` declarado → visible y abierta.
- Módulo que no declara ningún modelo → se muestra entero.

**Migrado hoy: venta y general.** Los otros módulos siguen abiertos hasta que se
les declaren modelos en su descriptor y sus `withPermission` en las rutas.

## 6. Receta: sumar un recurso a la capa de permisos

1. **Modelo** — buscar el id en `modelo.catalog.ts`. Si el recurso no está en el
   catálogo del backend, no hay nada que hacer todavía: queda abierto.
2. **Ruta** — envolver su entrada en `<modulo>.routes.ts`:
   `...withPermission(MODELO.<app>.<recurso>, { path: ..., loadChildren: ... })`.
   Ojo con el spread: devuelve **dos** rutas.
3. **Menú** — agregar `modelo: MODELO.<app>.<recurso>` a su entrada del `menu` en
   `<modulo>.module-descriptor.ts`.
4. **Botones** — si la pantalla es una lista, ligar el predicado al modelo y
   pasar sus acciones por `visibleActions` / `visiblePrimaryAction` (paso 5).
   Para markup suelto, `*appHasPermission`.

Los pasos 2 y 3 usan el **mismo** modelo. Si divergen, el sidebar ofrece un link
que rebota al acceso denegado — y `permission-wiring.spec.ts` lo caza antes,
tanto si divergen como si te olvidaste del `withPermission`.

### Sumar un módulo entero

Aplicar los pasos 2–4 a cada recurso que tenga modelo, y sumar el módulo a la
lista `MODULOS` de `permission-wiring.spec.ts` (una línea: descriptor + rutas).
Sin eso el módulo queda sin ese chequeo y el olvido vuelve a ser silencioso.

Mientras ningún recurso declare modelo, el módulo se muestra completo (regla de
adopción gradual), así que se puede migrar de a uno sin romper nada.

⚠️ En el descriptor, `MODELO` se importa **profundo**
(`@erp/core/permissions/modelo.catalog`), nunca por el barrel: este arrastra
`PermissionsService` → `ERP_MODULES` → los descriptores, y ese ciclo revienta al
arrancar en vez de al compilar. Hay una regla de ESLint que lo impide, con el
reemplazo en el mensaje.
