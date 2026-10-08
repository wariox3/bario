import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { CardEstadoComponent } from '../../../../shared/card-estado/card-estado.component';
import { AccesoFila, agruparAccesos } from '../../models/acceso.model';
import { AccesoService } from '../../services/acceso.service';

/** Cuántos accesos se muestran antes de pedir "ver todo". */
const VISIBLES_INICIAL = 5;

/**
 * Bitácora de accesos a la cuenta.
 *
 * La pantalla contesta una sola pregunta —"¿todos estos accesos son míos?"— así que se lee
 * de arriba hacia abajo, la sesión de ahora está anclada arriba, y lo normal **no lleva
 * color**: el único renglón teñido es el que amerita mirarse dos veces.
 */
@Component({
  selector: 'app-accesos-card',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, CardEstadoComponent],
  templateUrl: './accesos-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccesosCardComponent {
  private readonly accesoService = inject(AccesoService);
  /** Explícito: `cargar()` también se llama desde "Reintentar", fuera del contexto de inyección. */
  private readonly destroyRef = inject(DestroyRef);

  /** No reconoce un acceso: la salida es cambiar la contraseña, y esa acción vive en la página. */
  readonly cambiarPassword = output<void>();

  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly mostrarTodos = signal(false);

  /**
   * Las recencias se calculan una sola vez, al cargar.
   *
   * No hay reloj que avance: la diferencia entre "hace 2 minutos" y "hace 3" no cambia
   * ninguna decisión, y un `setInterval` acá sería maquinaria sin nadie que la necesite.
   */
  private readonly registros = signal<readonly AccesoFila[]>([]);

  /** El backend tiene más páginas: la lista no es todo el historial y hay que decirlo. */
  readonly hayMas = signal(false);

  readonly filas = this.registros.asReadonly();

  /** Lo que se pinta: los últimos, salvo que el usuario pida el resto. */
  readonly visibles = computed(() =>
    this.mostrarTodos() ? this.filas() : this.filas().slice(0, VISIBLES_INICIAL),
  );

  readonly ocultos = computed(() => Math.max(0, this.filas().length - VISIBLES_INICIAL));

  /**
   * Logins que se quedaron en el código. Es el único resumen que amerita el header: el
   * resto es rutina, y un contador de "8 accesos" no le sirve a nadie para decidir nada.
   */
  readonly incompletos = computed(
    () => this.filas().filter((fila) => fila.tipo === 'incompleto').length,
  );

  readonly vacia = computed(
    () => !this.isLoading() && !this.hasError() && this.filas().length === 0,
  );

  /** Esqueletos de carga — mismo alto que las entradas reales, sin salto de layout. */
  readonly skeletons = [0, 1, 2];

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.accesoService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          // Los renglones del endpoint son pasos; acá se vuelven logins.
          const filas = agruparAccesos(pagina.results, Date.now());
          this.registros.set(filas);
          this.hayMas.set(pagina.next !== null);

          // Un login incompleto nunca se esconde detrás de "ver más": el chip del header lo
          // anuncia, y mandar a buscarlo con un clic sería prometer sin mostrar.
          const ocultoRelevante = filas
            .slice(VISIBLES_INICIAL)
            .some((fila) => fila.tipo === 'incompleto');
          if (ocultoRelevante) this.mostrarTodos.set(true);

          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  verTodos(): void {
    this.mostrarTodos.set(true);
  }
}
