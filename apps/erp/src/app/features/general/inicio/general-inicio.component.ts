import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@reddoc/core';
import { InicioInvitacionComponent } from '@erp/core/components/inicio-invitacion/inicio-invitacion.component';
import { ParametroService } from '@erp/core/services/parametro.service';
import type { AppDict } from '@erp/i18n';
import { PlantillaCargadaDialogComponent } from './components/plantilla-cargada-dialog/plantilla-cargada-dialog.component';
import { PlantillaService, type PlantillaCargarResponse } from './plantilla.service';

/** Qué botón está en vuelo — para bloquear el otro sin apagar toda la tira. */
type AccionEnVuelo = 'cargar' | 'descartar' | null;

/**
 * Inicio del módulo General.
 *
 * Hoy solo hospeda el asistente de datos iniciales, y en la mayoría de las
 * entradas no muestra nada: es el landing del módulo y va a crecer
 * (indicadores, accesos rápidos), así que el asistente se compone como una tira
 * arriba —la misma de `venta-inicio`— y lo que venga después se apila debajo.
 *
 * El acuse de lo que se cargó **no** vive acá sino en un modal: pasa una sola
 * vez en la vida del contenedor y merece que se lo mire una vez, no que se lo
 * confunda con el contenido de la página (ver `PlantillaCargadaDialogComponent`).
 */
@Component({
  selector: 'app-general-inicio',
  standalone: true,
  imports: [ButtonModule, InicioInvitacionComponent, PlantillaCargadaDialogComponent],
  templateUrl: './general-inicio.component.html',
  // Mismo ancho acotado que el inicio de Venta: no es una tabla, se lee mejor
  // en una columna.
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class GeneralInicioComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly parametro = inject(ParametroService);
  private readonly plantilla = inject(PlantillaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;

  /**
   * `null` = todavía no sabemos (petición en vuelo o fallida).
   *
   * Espejo invertido de la invitación de Venta: allá se ofrece cuando el
   * parámetro es `false`, acá cuando es `true`. Los tres estados importan igual
   * — si arrancara en `true`, la tira parpadearía al entrar a General en todo
   * contenedor, incluso en los que ya cargaron sus datos hace meses.
   */
  private readonly pendiente = signal<boolean | null>(null);

  /** Lo que devolvió `cargar/`. Mientras no sea `null`, el modal está abierto. */
  protected readonly resultado = signal<PlantillaCargarResponse | null>(null);

  /** Solo con un `true` confirmado del contenedor ofrecemos el asistente. */
  protected readonly mostrarAsistente = computed(() => this.pendiente() === true);

  protected readonly enVuelo = signal<AccionEnVuelo>(null);

  constructor() {
    this.parametro
      .asistenteDatosIniciales()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (asistente) => this.pendiente.set(asistente),
        // Sin dato no hay asistente: preferimos no ofrecer nada antes que
        // ofrecerle sembrar datos a quien ya tiene los suyos.
        error: () => this.pendiente.set(null),
      });
  }

  /**
   * Siembra el contenedor desde la plantilla general.
   *
   * A diferencia de omitir, esto **no** se resuelve en silencio: cargar cientos
   * de registros de un clic es un cambio grande y sin acuse la persona no tiene
   * cómo saber qué pasó. El parámetro recalculado sale de la propia respuesta,
   * así que no hace falta releer `/general/parametro/`.
   */
  protected onCargar(): void {
    this.ejecutar('cargar', this.plantilla.cargar(), (respuesta) => {
      this.resultado.set(respuesta);
      this.pendiente.set(respuesta.gen_asistente_datos_iniciales);
    });
  }

  /** Arranca en blanco: el contenedor renuncia a la plantilla. */
  protected onOmitir(): void {
    this.ejecutar('descartar', this.plantilla.descartar(), () => this.pendiente.set(false));
  }

  /** Cierra el acuse. No vuelve: el parámetro ya quedó apagado en el backend. */
  protected onCerrarResultado(): void {
    this.resultado.set(null);
  }

  /**
   * Las dos salidas son terminales y se despachan igual; lo único que cambia es
   * qué hacen con la respuesta.
   *
   * Si falla, el `errorInterceptor` ya avisó; acá solo liberamos los botones
   * para que se pueda reintentar.
   */
  private ejecutar<T>(
    accion: Exclude<AccionEnVuelo, null>,
    peticion: Observable<T>,
    alResolver: (respuesta: T) => void,
  ): void {
    if (this.enVuelo()) return;
    this.enVuelo.set(accion);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        alResolver(respuesta);
        this.enVuelo.set(null);
      },
      error: () => this.enVuelo.set(null),
    });
  }
}
