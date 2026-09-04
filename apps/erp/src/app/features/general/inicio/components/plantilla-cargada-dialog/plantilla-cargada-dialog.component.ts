import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { PlantillaCargarResponse } from '../../plantilla.service';

/** Una línea del recibo: cuántos registros entraron de un modelo, y de cuál. */
interface LineaCargada {
  /** Etiqueta Django (`app.NombreModelo`) — clave estable, sirve de `track`. */
  readonly clave: string;
  /** Nombre legible; cae a `clave` si el dict todavía no la traduce. */
  readonly nombre: string;
  readonly cantidad: number;
}

/**
 * Acuse de la siembra de datos iniciales.
 *
 * **Por qué modal y no una tira en la página:** esto pasa una sola vez en la vida
 * de un contenedor, y es el momento en que 372 registros aparecen de un clic.
 * En línea quedaba como una nota al pie de una pantalla por lo demás vacía; en
 * modal es lo que es —un acuse— y obliga a mirarlo una vez antes de seguir.
 * Como no se repite nunca, puede permitirse más presencia que una pantalla de
 * trabajo: no hay fatiga posible.
 *
 * **La forma es un recibo contable**, no un dashboard: cada modelo con su
 * cantidad, guía punteada de por medio, y el total abajo tras un filete más
 * marcado. Es el idioma en el que ya lee la gente que usa un ERP —el ojo baja
 * buscando la suma— y no el de un panel de métricas, que sería vocabulario
 * prestado de otro producto.
 *
 * **Contraste, no decoración pareja:** toda la atmósfera (grilla de puntos, halo
 * sky, glifo) se concentra en la banda navy de arriba; el cuerpo baja al blanco
 * disciplinado de siempre. El ERP es todo superficies blancas, así que un único
 * campo navy —una vez en la vida del contenedor— se lee como un acento
 * deliberado y no como una segunda familia visual.
 */
@Component({
  selector: 'app-plantilla-cargada-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  templateUrl: './plantilla-cargada-dialog.component.html',
  styles: [
    `
      /*
        El dialog se teletransporta al body, pero la encapsulación emulada viaja
        en el atributo del propio elemento: los estilos de abajo sí lo alcanzan.
        El frame (.p-dialog) es lo único que no, y vive en styles.scss.
      */
      @keyframes lineaIn {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      /*
        El recibo se escribe solo, de arriba abajo: cada línea entra 45ms después
        de la anterior. Es la única animación del modal y dura menos de medio
        segundo en total — cuenta que los datos están llegando, no entretiene.
      */
      .linea {
        animation: lineaIn 0.34s cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      @media (prefers-reduced-motion: reduce) {
        .linea {
          animation: none;
        }
      }
    `,
  ],
})
export class PlantillaCargadaDialogComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** `null` = no hay nada que acusar y el modal queda cerrado. */
  readonly resultado = input<PlantillaCargarResponse | null>(null);
  readonly cerrar = output<void>();

  protected readonly visible = computed(() => this.resultado() !== null);

  /**
   * El recibo, de mayor a menor: lo que más entró es lo que primero cuenta la
   * historia. Las claves sin traducir se muestran crudas antes que desaparecer
   * del recuento — feo es mejor que mentir sobre el total.
   */
  protected readonly lineas = computed<readonly LineaCargada[]>(() => {
    const modelos = this.resultado()?.modelos;
    if (!modelos) return [];
    const nombres = this.t().inicio.general.datosIniciales.resultado.modelos;
    return Object.entries(modelos)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([clave, cantidad]) => ({ clave, nombre: nombres[clave] ?? clave, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  });

  protected readonly total = computed(() =>
    this.lineas().reduce((suma, linea) => suma + linea.cantidad, 0),
  );

  protected onHide(): void {
    this.cerrar.emit();
  }
}
