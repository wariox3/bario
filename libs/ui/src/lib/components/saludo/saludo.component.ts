import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, timer } from 'rxjs';
import { I18nService } from '@reddoc/core';
import { claveDelMomento, elegirSaludo, fechaConDia, primerNombre } from './saludo.engine';
import type { SaludoTranslationsHost } from './i18n';

/** Cada cuánto se revisa la hora: el saludo cambia solo si la página queda abierta. */
const RELOJ_MS = 60_000;

/** Última frase mostrada en este navegador, para no repetirla al cambiar de momento. */
const STORAGE_KEY = 'reddoc-saludo';

/** `frase` es la que se muestra en `clave`; `previa`, la que se evitó al elegirla. */
interface SaludoGuardado {
  readonly clave: string;
  readonly frase: string;
  readonly previa: string | null;
}

/**
 * Encabezado que recibe a la persona: la fecha, un saludo con su primer nombre
 * y una frase que cambia según la hora y el día de la semana.
 *
 * ```html
 * <lib-saludo [nombre]="usuario()?.nombre_corto" />
 * ```
 *
 * La elección se mantiene mientras no cambie el momento (día + franja), así que
 * no salta al recargar. Para no repetir la frase de la vez anterior se recuerda
 * en `localStorage`; si el navegador no lo deja, solo se pierde ese detalle.
 *
 * Requiere que la app registre `saludo` (`saludoEs` / `saludoEn`) en su dict.
 */
@Component({
  selector: 'lib-saludo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <p class="m-0 text-[0.8rem] text-brand-muted">{{ fecha() }}</p>
      <h1
        class="m-0 mt-1 text-[1.6rem] leading-tight font-extrabold tracking-[-0.03em] text-brand-text"
      >
        {{ saludo() }}
      </h1>
      <p
        class="m-0 mt-1 text-[0.95rem] text-brand-text/70 animate-fade-up motion-reduce:animate-none"
      >
        {{ frase() }}
      </p>
    </header>
  `,
})
export class SaludoComponent {
  private readonly i18n = inject<I18nService<SaludoTranslationsHost>>(I18nService);

  /** Nombre de la persona; se usa solo el primero. Sin nombre, el saludo va solo. */
  readonly nombre = input<string | null | undefined>();

  private readonly ahora = toSignal(timer(0, RELOJ_MS).pipe(map(() => new Date())), {
    initialValue: new Date(),
  });

  private readonly primerNombre = computed(() => primerNombre(this.nombre()));

  private readonly eleccion = computed(() => {
    const ahora = this.ahora();
    const clave = claveDelMomento(ahora, this.primerNombre());
    const guardado = leerGuardado();
    // En el mismo momento se repite lo que se evitó entonces, para elegir igual.
    const evitar = guardado?.clave === clave ? guardado.previa : (guardado?.frase ?? null);
    return { clave, evitar, ...elegirSaludo(ahora, clave, evitar) };
  });

  /** "Viernes, 30 de octubre", en el idioma de la app. */
  protected readonly fecha = computed(() =>
    fechaConDia(this.ahora(), this.i18n.lang() === 'en' ? 'en-US' : 'es-CO'),
  );

  /** "Buenos días, Mario"; sin nombre, solo el saludo. */
  protected readonly saludo = computed(() => {
    const texto = this.i18n.t().saludo.saludos[this.eleccion().saludo];
    const nombre = this.primerNombre();
    return nombre ? `${texto}, ${nombre}` : texto;
  });

  protected readonly frase = computed(() => this.i18n.t().saludo.frases[this.eleccion().frase]);

  constructor() {
    effect(() => {
      const { clave, frase, evitar } = this.eleccion();
      guardar({ clave, frase, previa: evitar });
    });
  }
}

function leerGuardado(): SaludoGuardado | null {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY);
    if (!crudo) return null;
    const valor: unknown = JSON.parse(crudo);
    if (
      typeof valor === 'object' &&
      valor !== null &&
      'clave' in valor &&
      typeof valor.clave === 'string' &&
      'frase' in valor &&
      typeof valor.frase === 'string'
    ) {
      const previa = 'previa' in valor && typeof valor.previa === 'string' ? valor.previa : null;
      return { clave: valor.clave, frase: valor.frase, previa };
    }
    return null;
  } catch {
    return null;
  }
}

function guardar(valor: SaludoGuardado): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valor));
  } catch {
    // Sin storage (modo privado, bloqueado): solo se pierde el no repetir.
  }
}
