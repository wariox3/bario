import { FormGroup } from '@angular/forms';

/**
 * Un control que todavía no deja guardar, con el texto que el usuario leyó.
 *
 * La etiqueta **se lee del DOM**, no de un mapa declarado por cada formulario.
 * El `<label>` del campo ya es el texto que la persona tiene delante; copiarlo a
 * un `Record<control, clave>` duplicaría ~25 strings por pantalla y se
 * desincronizaría en silencio el día que alguien renombre un campo. Un listado
 * de pendientes que miente es peor que no tener listado.
 */
export interface PendingField {
  readonly name: string;
  /** Etiqueta tal cual la pinta el `<label>`, sin el asterisco de obligatorio. */
  readonly label: string;
  /** Título de la `<section>` que lo contiene. `null` si el form no está seccionado. */
  readonly section: string | null;
}

/**
 * Cuántos contenedores se suben desde el control buscando su `<label>`.
 *
 * El patrón del ERP envuelve cada campo en un `<div class="flex flex-col">` con
 * su label arriba, así que uno alcanza; tres cubre las variantes con una fila
 * extra. Más arriba se empieza a salir del campo y se traería la etiqueta del
 * vecino, que es peor que no traer ninguna.
 */
const MAX_ANCESTROS = 3;

/** Colapsa los saltos de línea que mete el formateo del template. */
function limpiar(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\s+/g, ' ').trim();
}

/** El elemento sobre el que Angular aplicó `formControlName`, dentro de `raiz`. */
export function elementoDeControl(raiz: ParentNode, name: string): HTMLElement | null {
  return raiz.querySelector<HTMLElement>(`[formcontrolname="${CSS.escape(name)}"]`);
}

/**
 * El `<label>` del campo.
 *
 * Primero por `for`/`id` —la asociación explícita, la misma que usa el lector de
 * pantalla—. Los componentes que reciben el id por input (`<lib-api-select
 * inputId="…">`) no lo llevan en su host, y los modales lo prefijan para no
 * chocar entre sí: para esos se sube por los contenedores del campo.
 */
function labelDe(el: HTMLElement, raiz: ParentNode): HTMLLabelElement | null {
  if (el.id) {
    const explicito = raiz.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`);
    if (explicito) return explicito;
  }
  let nodo = el.parentElement;
  for (let nivel = 0; nodo && nivel < MAX_ANCESTROS; nivel++, nodo = nodo.parentElement) {
    const label = nodo.querySelector('label');
    if (label) return label;
  }
  return null;
}

/** El título de la card que contiene al campo, para agrupar el listado. */
function seccionDe(el: HTMLElement): string | null {
  const titulo = el.closest('section')?.querySelector('h2, h3');
  return limpiar(titulo?.textContent) || null;
}

/**
 * Resuelve etiqueta y sección de un control leyendo el DOM ya renderizado.
 *
 * Degradado: sin `<label>` a la vista devuelve el nombre del control. Se ve
 * crudo, pero manda a la persona al campo correcto igual — y salta a la vista
 * que ahí falta una etiqueta.
 */
export function describirCampo(raiz: ParentNode, name: string): PendingField {
  const el = elementoDeControl(raiz, name);
  const label = el ? labelDe(el, raiz) : null;
  const texto = label ? limpiar(label.textContent).replace(/\s*\*$/, '') : '';
  return { name, label: texto || name, section: el ? seccionDe(el) : null };
}

/**
 * Nombres de los controles inválidos, en el orden en que se declararon —que es
 * el orden en que se leen en pantalla, así el listado y la página coinciden—.
 *
 * Los deshabilitados quedan fuera: no bloquean el guardado ni se pueden
 * corregir. Un grupo anidado se recorre hacia adentro para llegar al campo
 * concreto; mandar a la persona al nombre del grupo no le dice dónde escribir.
 */
export function nombresInvalidos(group: FormGroup): readonly string[] {
  const nombres: string[] = [];
  for (const [name, control] of Object.entries(group.controls)) {
    if (control.valid || control.disabled) continue;
    if (control instanceof FormGroup) {
      nombres.push(...nombresInvalidos(control));
      continue;
    }
    nombres.push(name);
  }
  return nombres;
}

/**
 * Lleva la vista al campo y le da el foco.
 *
 * `block: 'center'` y no `'start'`: el header y la barra de acciones son
 * sticky, así que un campo pegado al tope del scrollport queda tapado justo por
 * el chrome que lo mandó ahí. El foco va al control interno —los componentes de
 * `@reddoc/ui` no son focusables ellos mismos— y con `preventScroll` para no
 * pelear con el scroll suave que ya está en curso.
 */
export function irAlCampo(raiz: ParentNode, name: string): void {
  const el = elementoDeControl(raiz, name);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = el.matches('input, select, textarea')
    ? el
    : el.querySelector<HTMLElement>(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
      );
  focusable?.focus({ preventScroll: true });
}
