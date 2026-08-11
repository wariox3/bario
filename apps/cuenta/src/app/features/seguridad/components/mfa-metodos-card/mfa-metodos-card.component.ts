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
import { MfaCodigosRespaldoDialogComponent } from '../mfa-codigos-respaldo-dialog/mfa-codigos-respaldo-dialog.component';
import { MfaVerificarDialogComponent } from '../mfa-verificar-dialog/mfa-verificar-dialog.component';
import { AuthService } from '../../../auth/services/auth.service';
import { crearRelojMfa } from '@reddoc/core';
import {
  MfaIntento,
  MfaIntentoModo,
  MfaMetodoCatalogo,
  MfaMetodoFila,
} from '../../models/mfa-metodo.model';
import { MfaService } from '../../services/mfa.service';
import {
  MFA_METODOS_HABILITADOS,
  MFA_METODO_FALLBACK,
  MFA_METODO_PRESENTACION,
} from './mfa-metodos.constants';

@Component({
  selector: 'app-mfa-metodos-card',
  standalone: true,
  imports: [
    ButtonModule,
    SkeletonModule,
    MfaVerificarDialogComponent,
    MfaCodigosRespaldoDialogComponent,
  ],
  templateUrl: './mfa-metodos-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaMetodosCardComponent {
  private readonly mfaService = inject(MfaService);
  private readonly authService = inject(AuthService);
  /** Explícito: `cargar()` también se llama desde "Reintentar", fuera del contexto de inyección. */
  private readonly destroyRef = inject(DestroyRef);

  /** El método quedó activo (código verificado). */
  readonly activado = output<MfaMetodoFila>();
  /** La autenticación en varias fases quedó apagada. */
  readonly desactivado = output<MfaMetodoFila>();

  /** `codigo` del método cuya activación está en vuelo. Bloquea toda la lista. */
  readonly pendiente = signal<string | null>(null);

  /**
   * Intento de activación en curso. Vive **acá y no en el modal** a propósito: cerrar el
   * modal ya no tira el código a la basura ni reinicia la espera de reenvío.
   */
  readonly intento = signal<MfaIntento | null>(null);
  readonly modalAbierto = signal(false);

  /**
   * Códigos de respaldo recién generados. El backend los manda una única vez, así que
   * viven acá hasta que el usuario confirme que los guardó.
   */
  readonly codigosRespaldo = signal<readonly string[]>([]);

  /**
   * Reloj de la card. Acá cada envío es un `configurar/` nuevo —token y vigencia
   * nuevos—, así que siempre se marca el desafío completo: las dos cuentas arrancan
   * juntas de cero.
   */
  private readonly reloj = crearRelojMfa();

  /** Segundos que le quedan de vida al código enviado. */
  readonly restante = this.reloj.restante;

  /** Segundos que faltan para poder pedir otro código. */
  readonly esperaReenvio = this.reloj.esperaReenvio;

  /** Hay un código vivo: volver a "Activar" no debe pedir uno nuevo. */
  readonly intentoVigente = computed(() => this.intento() !== null && this.restante() > 0);

  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  private readonly catalogo = signal<readonly MfaMetodoCatalogo[]>([]);

  /**
   * Estado del usuario, desde `/me`. Es la única fuente de "qué está activo":
   * el catálogo solo dice qué existe.
   */
  private readonly usuario = this.authService.currentUser;
  readonly protegida = computed(() => this.usuario()?.mfa_activo === true);
  private readonly metodoActivo = computed(() =>
    this.protegida() ? (this.usuario()?.mfa_metodo ?? null) : null,
  );

  readonly filas = computed<readonly MfaMetodoFila[]>(() => {
    const activo = this.metodoActivo();
    const hayActivo = activo !== null;

    return this.catalogo().map((metodo) => {
      const presentacion = MFA_METODO_PRESENTACION[metodo.codigo] ?? MFA_METODO_FALLBACK;
      const habilitado = MFA_METODOS_HABILITADOS.has(metodo.codigo);
      return {
        ...metodo,
        presentacion,
        habilitado,
        activo: metodo.codigo === activo,
        // No sugerimos lo que no se puede activar todavía.
        sugerido: !hayActivo && habilitado && presentacion.recomendado,
      };
    });
  });

  /** La fila activa, para la banda de estado del header. */
  readonly filaActiva = computed(() => this.filas().find((fila) => fila.activo) ?? null);

  /** La fila del intento en curso — la que alimenta el modal. */
  readonly filaEnIntento = computed(() => {
    const intento = this.intento();
    if (intento === null) return null;

    const delCatalogo = this.filas().find((f) => f.codigo === intento.metodo);
    if (delCatalogo) return delCatalogo;

    // Desactivación del método desconocido: sin esta rama el modal se quedaría sin
    // `metodo` y `verificar()` cortaría antes de llamar al endpoint.
    return this.activoDesconocido() ? this.filaDesconocida() : null;
  });

  /**
   * `mfa_activo` en `true` pero con un `mfa_metodo` que no está en el catálogo
   * (o viene `null`). No inventamos: lo decimos.
   */
  readonly activoDesconocido = computed(
    () => this.protegida() && !this.isLoading() && !this.hasError() && this.filaActiva() === null,
  );

  /**
   * Fila sintética para el método activo que no está en el catálogo.
   *
   * Sin esto no habría forma de apagar el MFA en ese estado: el botón "Desactivar" cuelga
   * de `fila.activo` y acá no hay ninguna. `desafio/` no necesita saber el método —el
   * backend ya sabe cuál es el activo—, así que lo único que falta es algo que pintar.
   */
  readonly filaDesconocida = computed<MfaMetodoFila>(() => ({
    codigo: this.usuario()?.mfa_metodo ?? 'desconocido',
    nombre: 'Tu método actual',
    presentacion: MFA_METODO_FALLBACK,
    activo: true,
    habilitado: true,
    sugerido: false,
  }));

  /** Filas de esqueleto mientras carga — mismo alto que las reales, sin salto de layout. */
  readonly skeletons = [0, 1, 2];

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.mfaService
      .listarMetodos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (metodos) => {
          this.catalogo.set(metodos);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  /** ¿Esta fila ya tiene un código vivo, para este mismo fin, esperando que lo escriban? */
  tieneCodigoVivo(fila: MfaMetodoFila, modo: MfaIntentoModo = 'activar'): boolean {
    const intento = this.intento();
    return this.intentoVigente() && intento?.metodo === fila.codigo && intento?.modo === modo;
  }

  /**
   * Paso 1: conseguir un código. Si el de esta fila **sigue vivo**, no pedimos otro:
   * reabrimos el modal con el mismo. Cerrar y volver a entrar no gasta un correo.
   */
  onConfigurar(fila: MfaMetodoFila): void {
    if (!fila.habilitado || this.pendiente() !== null) return;

    if (this.tieneCodigoVivo(fila)) {
      this.modalAbierto.set(true);
      return;
    }

    this.solicitarCodigo(fila, 'activar', () => this.modalAbierto.set(true));
  }

  /**
   * Desactivar también exige código: `desafio/` lo manda al método activo. Mismo modal,
   * mismos relojes; solo cambia qué endpoint confirma al final.
   */
  onDesactivar(fila: MfaMetodoFila): void {
    if (this.pendiente() !== null) return;

    if (this.tieneCodigoVivo(fila, 'desactivar')) {
      this.modalAbierto.set(true);
      return;
    }

    this.solicitarCodigo(fila, 'desactivar', () => this.modalAbierto.set(true));
  }

  /**
   * Reenvío desde el modal: token nuevo, y las dos cuentas vuelven a empezar.
   *
   * El guard mira `pendiente`, no solo la espera: esta sigue en 0 hasta que llega la
   * respuesta, así que sin esto dos clics seguidos son dos correos — y el `intento` se
   * queda con el último token, dejando muerto el código del primero.
   */
  onReenviar(fila: MfaMetodoFila): void {
    if (this.esperaReenvio() > 0 || this.pendiente() !== null) return;
    this.solicitarCodigo(fila, this.intento()?.modo ?? 'activar');
  }

  private solicitarCodigo(
    fila: MfaMetodoFila,
    modo: MfaIntentoModo,
    alLograrlo?: () => void,
  ): void {
    // Se marca acá y no en cada llamador: es lo que bloquea el doble envío, y olvidarlo
    // en una sola de las entradas alcanza para romperlo.
    this.pendiente.set(fila.codigo);

    const peticion$ =
      modo === 'desactivar' ? this.mfaService.desafio() : this.mfaService.configurar(fila.codigo);

    peticion$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        this.pendiente.set(null);
        this.intento.set({ metodo: fila.codigo, modo, token: respuesta.mfa_token });
        this.reloj.marcarDesafio();
        alLograrlo?.();
      },
      // El toast del error lo pone el `errorInterceptor`.
      error: () => this.pendiente.set(null),
    });
  }

  onVerificado(evento: {
    readonly metodo: MfaMetodoFila;
    readonly codigosRespaldo: readonly string[];
  }): void {
    const modo = this.intento()?.modo ?? 'activar';
    this.reloj.reiniciar();
    this.intento.set(null);
    this.modalAbierto.set(false);

    if (modo === 'desactivar') {
      this.desactivado.emit(evento.metodo);
      return;
    }

    // Del modal de código al de respaldo, sin pasar por la lista: los códigos son
    // consecuencia directa de lo que el usuario acaba de hacer.
    this.codigosRespaldo.set(evento.codigosRespaldo);
    this.activado.emit(evento.metodo);
  }

  /** El usuario declaró que guardó los códigos: recién ahí los soltamos. */
  onCodigosGuardados(): void {
    this.codigosRespaldo.set([]);
  }

  /** Cerrar el modal NO cancela el intento: el código sigue vivo y la espera sigue corriendo. */
  cerrarModal(): void {
    this.modalAbierto.set(false);
  }
}
