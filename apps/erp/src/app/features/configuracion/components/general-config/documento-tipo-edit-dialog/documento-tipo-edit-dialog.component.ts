import { Component, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { finalize } from 'rxjs';
import {
  FormErrorService,
  I18nService,
  ToastService,
  type ErpSelectOption,
  resolucionLabel,
} from '@reddoc/core';
import { ErpApiSelectComponent, FieldErrorComponent } from '@reddoc/ui';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import { DocumentoTipoService } from '../../../documento-tipo/documento-tipo.service';
import type { DocumentoTipo } from '../../../documento-tipo/documento-tipo.model';
import {
  documentoTipoFormToPayload,
  documentoTipoToForm,
} from '../../../documento-tipo/documento-tipo.mapper';
import { RESOLUCION_SELECCIONAR_ENDPOINT } from '../../../documento-tipo/documento-tipo.constants';

/**
 * Modal de edición de un tipo de documento.
 *
 * Ofrece los cuatro campos configurables por tenant, en dos bandas: numeración
 * (consecutivo y resolución) y cuentas de cartera. El nombre y los flags del
 * tipo no se editan: el catálogo es normativo y los siembra el backend.
 *
 * **La resolución todavía no se persiste**: el PATCH no la acepta (ver
 * `DocumentoTipoPayload`). Se ofrece igual para que empiece a funcionar sin
 * tocar el front el día que el serializer la sume.
 */
@Component({
  selector: 'app-documento-tipo-edit-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
    ErpCuentaSelectComponent,
  ],
  templateUrl: './documento-tipo-edit-dialog.component.html',
  styles: ':host { display: contents; }',
})
export class DocumentoTipoEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DocumentoTipoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  readonly tipo = input<DocumentoTipo | null>(null);
  readonly saved = output<void>();

  protected readonly isSaving = signal(false);

  protected readonly resolucionEndpoint = RESOLUCION_SELECCIONAR_ENDPOINT;

  /** Etiqueta `prefijo número` (el `seleccionar` no trae `nombre`). */
  protected readonly resolucionLabel = resolucionLabel;

  protected readonly form = this.fb.group({
    consecutivo: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    resolucion: this.fb.control<ErpSelectOption | null>(null),
    cuenta_cobrar: this.fb.control<ErpSelectOption | null>(null),
    cuenta_pagar: this.fb.control<ErpSelectOption | null>(null),
  });

  constructor() {
    // Rehidrata el form cada vez que se abre con un tipo distinto.
    effect(() => {
      const tipo = this.tipo();
      if (!this.visible() || !tipo) return;
      this.form.reset(documentoTipoToForm(tipo));
      this.form.markAsPristine();
    });
  }

  protected onSubmit(): void {
    const tipo = this.tipo();
    if (!tipo || this.isSaving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    // Redundante con `Validators.required` y con el guard de arriba, pero es lo
    // que deja que el payload exija un `number`: sin esto el mapper tendría que
    // inventar un consecutivo, y el único disponible —cero— es justo el que el
    // backend rechaza por su `minimum: 1`.
    if (raw.consecutivo == null) return;

    const toasts = this.t().configuracion.general.documentoTipo.toasts;
    this.isSaving.set(true);

    this.service
      .update(tipo.id, documentoTipoFormToPayload({ ...raw, consecutivo: raw.consecutivo }))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.saveSuccess.title, toasts.saveSuccess.desc);
          this.visible.set(false);
          this.saved.emit();
        },
        error: (err: unknown) => {
          // Sin mapa de campos: los controles se llaman igual que los campos del
          // backend, y `applyServerErrors` ya cae al propio nombre cuando no hay
          // traducción. Un mapa de identidad no haría nada.
          this.formErrors.handle(this.form, err, toasts.saveError.title);
        },
      });
  }
}
