import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { I18nService } from '@reddoc/core';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import type { LineaCarrito } from '../../carrito.model';

/** Lo que devuelve el diálogo al guardar. */
export interface CambiosLinea {
  readonly precio: number;
  readonly cantidad: number;
}

/**
 * Diálogo para corregir el precio unitario y la cantidad de una línea. La
 * cantidad no puede pasar del stock disponible del ítem.
 */
@Component({
  selector: 'app-editar-linea-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './editar-linea-dialog.component.html',
})
export class EditarLineaDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Línea a editar; `null` cierra el diálogo. */
  readonly linea = input<LineaCarrito | null>(null);

  readonly guardar = output<CambiosLinea>();
  readonly cerrar = output<void>();

  protected readonly form = this.fb.group({
    precio: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    cantidad: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
  });

  constructor() {
    effect(() => {
      const linea = this.linea();
      if (!linea) return;
      const cantidad = this.form.controls.cantidad;
      cantidad.setValidators([
        Validators.required,
        Validators.min(1),
        ...(linea.disponible === null ? [] : [Validators.max(linea.disponible)]),
      ]);
      this.form.reset({ precio: linea.precio, cantidad: linea.cantidad });
    });
  }

  protected onSubmit(): void {
    const { precio, cantidad } = this.form.getRawValue();
    if (this.form.invalid || precio === null || cantidad === null) return;
    this.guardar.emit({ precio, cantidad });
  }
}
