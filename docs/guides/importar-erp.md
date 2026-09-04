# Guía: importación por Excel en el ERP (diálogo, plantilla y maestros)

> **Para quién**: dev que necesita que un listado del ERP acepte carga masiva desde
> Excel, o que quiere entender qué hace cada parte del diálogo de importación.
> **Qué resuelve**: el `ImportDialogComponent` ya trae dropzone, validación, tabla de
> errores, plantilla de ejemplo y archivos de referencia. Sumar importación a un
> listado es cablearlo, no escribirlo.
> **Ejemplos vivos**: `general/masters/contacto` (con maestros),
> `contabilidad/movimiento` (con maestros), `contabilidad/masters/cuenta` (sin ellos).

---

## Modelo mental en 30 segundos

El diálogo es **tonto**: no conoce el dominio ni hace el upload. Recibe un `File` del
usuario, lo emite, y el listado decide qué hacer con él.

```
<app-import-dialog>                    ← UI: dropzone, validación local, tabs, footer
   │  (importRequested)=$event: File
   ▼
importState({ upload, onImported })    ← el estado: visible/loading/errores + el flujo
   │  upload(file)
   ▼
<x>.service.ts  extends BaseHttpService ← postFile() → multipart a `<recurso>/importar/`
   │
   ├── 2xx sin errores → toast de éxito + onImported()
   ├── 2xx con errores → alimenta el tab "Errores" (el backend los reporta así a veces)
   └── 4xx             → parseImportErrors(err.error) → mismo tab
```

Y en el diálogo conviven **tres archivos distintos**, que se confunden fácil:

| Qué                                 | De dónde sale                                    | Para qué sirve                                                       |
| ----------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| El archivo del usuario              | Lo sube el usuario                               | Es la carga: se postea al backend                                    |
| **Plantilla** ("Descargar ejemplo") | `GET <recurso>/importar-ejemplo/` del backend    | El formato vacío, con las columnas correctas y datos del tenant      |
| **Maestros**                        | XLSX públicos en el bucket (constante del front) | Tablas de consulta: qué **códigos** válidos escribir en las columnas |

La plantilla es _el molde_. Los maestros son _el diccionario_. La plantilla dice que hay
una columna `ciudad`; el maestro de ciudades dice que Medellín es `05001`.

---

## Sumar importación a un listado

**1. El servicio** — un método, sobre el recurso del master:

```ts
// <entity>.service.ts
importar(file: File): Observable<unknown> {
  return this.postFile<unknown>(`${this.resourcePath}importar/`, file);
}
```

`postFile` (en `BaseHttpService`) arma el multipart con el archivo en el campo `archivo`
—la convención del backend para todos los recursos— y acepta campos de contexto extra:

```ts
return this.postFile<unknown>(`${ENDPOINT}cargar-soporte/`, file, { conciliacion_id: id });
```

Nada de base64: eso era el ERP legacy.

**El retorno es `unknown` a propósito**: lo único que se hace con la respuesta es pasarla
por `parseImportErrors`, que la acepta así porque el backend puede reportar los errores de
validación con 200 o con 4xx. Un tipo más específico acá no tiparía nada —se descarta en
la primera línea del handler— y sí invitaría a escribir código contra campos que nadie
verificó. Si algún día la respuesta se consume de verdad, el tipo nace con ese uso.

**2. La acción del toolbar** — en `<entity>.constants.ts`, dentro del dropdown
"Acciones":

```ts
{ id: 'import', labelKey: 'common.actions.import', iconClass: 'pi pi-upload' },
```

`masterActions()` la poda sola si el usuario no tiene permiso sobre el modelo.

**3. El estado en el componente** — una línea, con `importState()`:

```ts
protected readonly importar = importState({
  upload: (file) => this.service.importar(file),
  onImported: () => this.loadList(),
  masters: CONTACTOS_IMPORT_MASTERS,   // opcional
});
```

Y en el toolbar, `case 'import': this.importar.open();`.

El helper trae la visibilidad, el progreso, los errores y el matiz que se pierde al
copiar y pegar: `parseImportErrors` corre **en las dos ramas** de la suscripción, porque
el backend puede reportar errores de validación con 200 o con 4xx. `onImported` se llama
solo tras un éxito real y hace lo que esa pantalla necesite —`loadList()`, volver a la
página 0, incrementar un token de recarga.

**4. El template**:

```html
<app-import-dialog
  [visible]="importar.visible()"
  (visibleChange)="importar.setVisible($event)"
  [title]="t().entities.<entity>.import.title"
  [subtitle]="t().entities.<entity>.import.subtitle"
  [importing]="importar.loading()"
  [errors]="importar.errors()"
  [errorSummary]="importar.errorSummary()"
  [errorTotal]="importar.errorTotal()"
  [masters]="importar.masters"
  [exampleConfig]="exampleConfig"
  (importRequested)="importar.submit($event)"
/>
```

El título, el subtítulo y la plantilla siguen siendo del consumidor: son texto y
endpoint de su dominio.

**5. Las claves i18n** `entities.<entity>.import.{title,subtitle}` en `app.es.ts` /
`app.en.ts` (y su tipo en `app.dict.ts`).

---

## La plantilla de ejemplo (`exampleConfig`)

**La plantilla siempre la sirve el backend**, en el `…/importar-ejemplo/` del recurso que
se importa. No hay plantillas en el bucket: eso es cosa de los maestros (más abajo), que
son otra cosa. Tres estados, decididos por el consumidor:

```ts
// Lo normal: va con cookies y X-Tenant, así que puede traer datos del tenant
protected readonly exampleConfig = {
  mode: 'enabled' as const,
  endpoint: '/general/contacto/importar-ejemplo/',
};

// Visible pero bloqueado, con el motivo en un tooltip
{ mode: 'disabled', reason: 'Plantilla no configurada para este tenant' }

// Oculto: no pasar el input (default null)
```

`enabled` descarga por `FileDownloadService`. El endpoint es el del propio recurso; solo
se apunta al de otro cuando es ese el que declara el esquema del archivo (empleados manda
a `/general/contacto/importar-ejemplo/`, porque el empleado se importa como contacto).

El `params` opcional es para las plantillas que **dependen de un contexto**, no de un
recurso: la de líneas de documento arma sus columnas según el tipo del padre, así que va
con `{ documento: id() }` y el `exampleConfig` pasa a ser un `computed`. La plantilla de
un master no lleva ninguno.

---

## Los maestros (tab "Maestros")

Archivos de referencia **globales y públicos**: los códigos DANE de ciudades, los
comprobantes contables, los tipos de cotizante. No dependen del tenant y el backend no
los sirve, así que viven como URLs en
`core/components/import-dialog/import-masters.constant.ts`.

Cada listado declara los suyos y los pasa por el `masters` de `importState()`:

```ts
// movimiento.constants.ts
export const MOVIMIENTO_IMPORT_MASTERS: readonly ImportMaster[] = [
  IMPORT_MASTER.comprobanteCodigo,
  IMPORT_MASTER.comprobante,
];
```

La regla es **ofrecer lo que el archivo de ese listado necesita**: trece archivos donde
hacen falta dos no ayudan a nadie. Un listado sin maestros no pasa el input y el tab
queda con su empty state.

La excepción son los listados transversales, que usan `IMPORT_MASTERS_ALL`:

```ts
// contacto.constants.ts — el contacto es cliente, proveedor y empleado a la vez
export const CONTACTOS_IMPORT_MASTERS: readonly ImportMaster[] = IMPORT_MASTERS_ALL;
```

Su archivo puede traer desde la ciudad y los datos bancarios hasta el tipo de cotizante
o el tipo de contrato, así que acotar la lista dejaría al usuario sin el archivo que
justo necesita.

### Agregar un maestro nuevo

Son tres lugares, y TypeScript exige los tres:

1. El id en `ImportMasterId` (`import-dialog.types.ts`).
2. La URL en `IMPORT_MASTER` (`import-masters.constant.ts`) — el `satisfies` falla si
   falta.
3. El nombre visible en `common.import.masters.names` de `app.dict.ts` + `app.es.ts` +
   `app.en.ts` — el template indexa ese objeto con el id, así que falta uno y no compila.

---

## Errores de importación

`parseImportErrors(body)` traduce la respuesta del backend al contrato del diálogo. Es
defensiva a propósito: acepta el body como objeto o como string JSON y devuelve vacío
ante cualquier forma inesperada (HTML de un 502, error de red). Lo que espera:

```jsonc
{
  "detail": "El archivo tiene errores de validación", // banner de resumen
  "total_errores": 340, // total real
  "errores": [{ "fila": 12, "mensaje": "La ciudad 99999 no existe" }],
}
```

Muestra hasta 100 filas y avisa del truncado con el total real. Su spec vive en
`import-dialog.utils.spec.ts`.

---

## Importar **líneas** de un documento

Es el mismo diálogo, con un endpoint que además recibe el **documento padre**:

| Qué       | Endpoint                                                                        |
| --------- | ------------------------------------------------------------------------------- |
| Carga     | `POST /general/documento-detalle/importar/` — multipart `archivo` + `documento` |
| Plantilla | `GET /general/documento-detalle/importar-ejemplo/?documento=<id>`               |

Los dos viven en `DocumentoDetalleService` (`@reddoc/core`), que ya es el CRUD compartido
de líneas: `importar(documentoId, file)` y `importarEjemploEndpoint`.

Tres cosas que lo distinguen de importar un master:

- **La plantilla depende del documento**, no del recurso: el backend devuelve las columnas
  del tipo del padre —no se llena igual una factura que un asiento—. Por eso `ExampleConfig`
  acepta `params`, y la ficha pasa `{ documento: id() }`.
- **Suma, no reemplaza.** Las filas del archivo se agregan a las líneas que el documento ya
  tiene; el endpoint no ofrece reemplazo. Verificado contra `reddocapi.uk`, no solo leído
  del schema. Se evaluó pedirle a backend un `reemplazar` y se decidió que no hace falta:
  en la práctica se importa sobre un documento recién creado y vacío. Conviene decirlo
  igual en el `notice` del diálogo, que es lo que hace el asiento.
- **Es todo-o-nada** y exige un documento **modificable**: si una fila falla no se guarda
  ninguna, y sobre un documento ya aprobado el backend responde 400. Ofrecerlo solo cuando
  la ficha lo dé por editable.

Ejemplo vivo: el dropdown **Utilidades** de la ficha del asiento contable
(`contabilidad/documentos/asiento/pages/asiento-detail`). Vive en la ficha y no en el
formulario porque la importación necesita un documento ya creado, y la ficha es el único
lugar donde siempre lo hay. Al terminar recarga la ficha **entera**: el backend recalcula
los totales del documento, así que la cabecera también quedó vieja.

---

## Lo que este diálogo **no** hace

- **Importar en un documento del camino A** (factura, nota crédito…). El framework
  configuracional no expone importación: `BaseDocumentListComponent` no tiene handler y
  el `DocumentEntityConfig` no declara nada al respecto. Hasta agosto de 2026 sí había
  un `canImport` y un `ImportDescriptor` declarados en los tipos, pero ningún documento
  los usaba y nada los leía; se borraron para que el config no prometa lo que no hace.
  Si aparece el requerimiento, el camino es sumar la capability **y** su handler en el
  mismo cambio, reusando este diálogo.
