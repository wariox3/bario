import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { finalize } from 'rxjs';
import { I18nService, ToastService } from '@reddoc/core';
import { FieldErrorComponent } from '@reddoc/ui';
import { AuthService } from '@erp/features/auth/services/auth.service';
import type { AppDict } from '@erp/i18n';
import { EventosDianService, type EmitirEventoPayload } from '../../eventos-dian.service';
import type { EventosDianViewRow } from '../../eventos-dian.model';

/** Paso del ciclo de acuse derivado del estado del documento. */
type GestionStepKey = 'recibirDocumento' | 'recibirBien' | 'aceptar';
interface GestionStep {
  readonly eventoId: number;
  readonly key: GestionStepKey;
}

/** Único tipo de identificación soportado por el acuse (Cédula), como en el legacy. */
const IDENTIFICACION_CEDULA = 13;

/**
 * Modal de **gestión de estados** de un evento DIAN. Según el estado del
 * documento resuelve el paso del ciclo de acuse (recibir documento → recibir
 * bien/servicio → aceptar) y su `evento_id` (30/32/33). El formulario se
 * pre-carga con los datos del usuario en sesión; al guardar llama a
 * `emitirEvento` y emite `saved` para que el host recargue.
 */
@Component({
  selector: 'app-gestion-estado-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    FieldErrorComponent,
  ],
  templateUrl: './gestion-estado-modal.component.html',
  styles: ':host { display: contents; }',
})
export class GestionEstadoModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EventosDianService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  readonly documento = input<EventosDianViewRow | null>(null);
  readonly saved = output<void>();

  protected readonly saving = signal(false);

  /** Opciones del tipo de identificación (solo Cédula, como el legacy). */
  protected readonly identificacionOptions = [{ label: 'Cédula', value: IDENTIFICACION_CEDULA }];

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    identificacion: [IDENTIFICACION_CEDULA, Validators.required],
    numero_identificacion: ['', Validators.required],
    cargo: ['', Validators.required],
    area: ['compras', Validators.required],
  });

  /** Paso del ciclo de acuse según el estado del documento. `null` si no aplica. */
  protected readonly step = computed<GestionStep | null>(() => {
    const doc = this.documento();
    if (!doc || !doc.estado_electronico) return null;
    if (doc.evento_documento === 'PE') return { eventoId: 30, key: 'recibirDocumento' };
    if (doc.evento_recepcion === 'PE') return { eventoId: 32, key: 'recibirBien' };
    if (doc.evento_aceptacion === 'PE') return { eventoId: 33, key: 'aceptar' };
    return null;
  });

  constructor() {
    // Pre-carga con los datos del usuario en sesión al abrir. `apellido` y
    // `cargo` no están en el modelo de usuario del ERP: quedan vacíos para que
    // el operador los complete.
    effect(() => {
      if (!this.visible()) return;
      const user = this.auth.currentUser();
      this.form.reset({
        nombre: user?.nombre_corto ?? '',
        apellido: '',
        identificacion: IDENTIFICACION_CEDULA,
        numero_identificacion: user?.numero_identificacion ?? '',
        cargo: '',
        area: 'compras',
      });
    });
  }

  protected submit(): void {
    const doc = this.documento();
    const step = this.step();
    if (!doc || !step || this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: EmitirEventoPayload = {
      id: doc.id,
      evento_id: step.eventoId,
      ...raw,
      // En la aceptación (ni documento ni recepción pendientes) el backend
      // espera el flag para no re-marcar el estado del evento.
      ...(doc.evento_documento !== 'PE' && doc.evento_recepcion !== 'PE'
        ? { estado_electronico_evento: false }
        : {}),
    };

    const toast = this.t().entities.eventosDian.toasts.gestion;
    this.saving.set(true);
    this.service
      .emitirEvento(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toast.success.title, toast.success.desc);
          this.visible.set(false);
          this.saved.emit();
        },
        error: () => this.toast.error(toast.error.title, toast.error.desc),
      });
  }
}
