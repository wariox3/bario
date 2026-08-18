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
<x>-list.component.ts                  ← arma el estado y llama a su servicio
   │  service.importar(file)
   ▼
<x>.service.ts  extends BaseHttpService ← POST multipart a `<recurso>/importar/`
   │
   ├── 2xx  → toast de éxito + recargar la lista
   └── 4xx  → parseImportErrors(err.error) → alimenta el tab "Errores"
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
importar(file: File): Observable<<Entity>ImportResult> {
  const form = new FormData();
  form.append('archivo', file, file.name);
  return this.post<<Entity>ImportResult>(`${this.resourcePath}importar/`, form);
}
```

Multipart con el archivo en `archivo` es la convención del backend para todos los
masters. Nada de base64 (eso era el ERP legacy).

**2. La acción del toolbar** — en `<entity>.constants.ts`, dentro del dropdown
"Acciones":

```ts
{ id: 'import', labelKey: 'common.actions.import', iconClass: 'pi pi-upload' },
```

`masterActions()` la poda sola si el usuario no tiene permiso sobre el modelo.

**3. El estado en el componente** — cinco signals y tres handlers. Copiá el bloque de
`contactos-list.component.ts` (`onImportRequested` / `applyImportErrors` /
`clearImportErrors`) y cambiá el servicio. El punto no obvio: `parseImportErrors` se
llama **en las dos ramas**, porque el backend puede reportar errores de validación con
200 o con 4xx.

**4. El template**:

```html
<app-import-dialog
  [visible]="importVisible()"
  (visibleChange)="onImportVisibleChange($event)"
  [title]="t().entities.<entity>.import.title"
  [subtitle]="t().entities.<entity>.import.subtitle"
  [importing]="importLoading()"
  [errors]="importErrors()"
  [errorSummary]="importErrorSummary()"
  [errorTotal]="importErrorTotal()"
  [exampleConfig]="exampleConfig"
  [masters]="importMasters"
  (importRequested)="onImportRequested($event)"
/>
```

**5. Las claves i18n** `entities.<entity>.import.{title,subtitle}` en `app.es.ts` /
`app.en.ts` (y su tipo en `app.dict.ts`).

---

## La plantilla de ejemplo (`exampleConfig`)

Tres estados, decididos por el consumidor:

```ts
// Visible y funcional
protected readonly exampleConfig = {
  mode: 'enabled' as const,
  endpoint: '/general/contacto/importar-ejemplo/',
};

// Visible pero bloqueado, con el motivo en un tooltip
{ mode: 'disabled', reason: 'Plantilla no configurada para este tenant' }

// Oculto: no pasar el input (default null)
```

La descarga pasa por `FileDownloadService` de `@reddoc/core`, así que va con cookies y
`X-Tenant` — la plantilla puede traer datos del tenant.

---

## Los maestros (tab "Maestros")

Archivos de referencia **globales y públicos**: los códigos DANE de ciudades, los
comprobantes contables, los tipos de cotizante. No dependen del tenant y el backend no
los sirve, así que viven como URLs en
`core/components/import-dialog/import-masters.constant.ts`.

Cada listado declara **solo los suyos**:

```ts
// contacto.constants.ts
export const CONTACTOS_IMPORT_MASTERS: readonly ImportMaster[] = [
  IMPORT_MASTER.ciudad,
  IMPORT_MASTER.banco,
  IMPORT_MASTER.cuentaBancoClase,
];
```

```ts
// contactos-list.component.ts
protected readonly importMasters = CONTACTOS_IMPORT_MASTERS;
```

Un listado sin maestros no pasa el input: el tab queda con su empty state. Es la regla:
**se ofrece lo que el archivo de ese listado necesita**, no el catálogo entero — el ERP
legacy mostraba los trece a todo el mundo y nadie sabía cuáles miraba.

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

## Lo que este diálogo **no** hace

- **Importar líneas dentro de un documento** (agregar detalles a una factura desde
  Excel). Es otro flujo; hoy ningún documento lo hace.
- **Camino A del framework configuracional**: `DocumentCapabilities.canImport` e
  `ImportDescriptor` están declarados en `libs/core/documento/entity-config.types.ts`
  pero **no los implementa nadie** — los 29 documentos tienen `canImport: false` y
  `BaseDocumentListComponent` no tiene handler de import. Si vas a activar importación
  en un documento, primero hay que implementarlo ahí (o borrar esos dos campos).
