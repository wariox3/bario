import { Component, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';
import { I18nService, ToastService } from '@reddoc/core';
import { UppercaseDirective } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { EventosDianService } from '../../eventos-dian.service';
import type { EventosDianViewRow } from '../../eventos-dian.model';

/**
 * Modal para **editar la referencia** de un documento de evento (prefijo,
 * número y CUE). Solo aplica a documentos aún no electrónicos. Al guardar llama
 * a `actualizarReferencia` (con `saltar_aprobado`) y emite `saved` para que el
 * host recargue la lista.
 */
@Component({
  selector: 'app-editar-referencia-modal',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, UppercaseDirective],
  templateUrl: './editar-referencia-modal.component.html',
})
export class EditarReferenciaModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EventosDianService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  readonly documento = input<EventosDianViewRow | null>(null);
  readonly saved = output<void>();

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    referencia_prefijo: [''],
    referencia_numero: [''],
    referencia_cue: [''],
  });

  constructor() {
    // Rehidrata el form cada vez que se abre con un documento nuevo.
    effect(() => {
      const doc = this.documento();
      if (!this.visible() || !doc) return;
      this.form.reset({
        referencia_prefijo: doc.referencia_prefijo ?? '',
        referencia_numero: doc.referencia_numero != null ? String(doc.referencia_numero) : '',
        referencia_cue: doc.referencia_cue ?? '',
      });
    });
  }

  protected submit(): void {
    const doc = this.documento();
    if (!doc || this.saving()) return;

    const raw = this.form.getRawValue();
    const toast = this.t().entities.eventosDian.toasts.editar;
    this.saving.set(true);
    this.service
      .actualizarReferencia({
        id: doc.id,
        referencia_prefijo: raw.referencia_prefijo || null,
        referencia_numero: raw.referencia_numero || null,
        referencia_cue: raw.referencia_cue || null,
      })
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
