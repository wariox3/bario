import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormErrorService, I18nService, ItemService, ToastService, type Item } from '@reddoc/core';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { itemRapidoToPayload } from '../../item-rapido.mapper';
import { ItemRapidoService } from '../../item-rapido.service';

/**
 * Alta de un ítem sin salir de la caja: código, nombre, precio, producto o
 * servicio, inventario e impuestos de venta. Cuentas contables, costo y demás
 * se completan en el ERP.
 *
 * Arranca **sin inventario**: un producto nuevo con inventario tiene stock cero
 * y la caja no lo dejaría vender hasta que entre mercancía.
 */
@Component({
  selector: 'app-item-rapido-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    MultiSelectModule,
    SelectButtonModule,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './item-rapido-dialog.component.html',
})
export class ItemRapidoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly items = inject(ItemService);

  protected readonly t = this.i18n.t;

  readonly visible = model(false);
  /** Código con el que se abre (lo que se buscó y no apareció). */
  readonly codigoInicial = input('');
  readonly creado = output<Item>();

  protected readonly guardando = signal(false);
  protected readonly impuestos = toSignal(
    inject(ItemRapidoService)
      .impuestosVenta()
      .pipe(catchError(() => of([]))),
    { initialValue: [] },
  );
  protected readonly tipos = computed(() => [
    { value: 'producto', label: this.t().caja.item.tipos.producto },
    { value: 'servicio', label: this.t().caja.item.tipos.servicio },
  ]);

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(100)]],
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    precio: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    tipo: this.fb.nonNullable.control<'producto' | 'servicio'>('producto'),
    inventario: [false],
    impuestos_ids: this.fb.nonNullable.control<number[]>([]),
    favorito: [false],
  });

  protected readonly esProducto = signal(true);

  constructor() {
    this.form.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      this.esProducto.set(tipo === 'producto');
      const inventario = this.form.controls.inventario;
      if (tipo === 'servicio') {
        inventario.setValue(false);
        inventario.disable({ emitEvent: false });
      } else {
        inventario.enable({ emitEvent: false });
      }
    });
    effect(() => {
      if (!this.visible()) return;
      const codigo = this.codigoInicial();
      untracked(() => {
        this.form.reset({ codigo });
        this.form.controls.inventario.enable({ emitEvent: false });
        this.esProducto.set(true);
      });
    });
  }

  protected onSubmit(): void {
    if (this.guardando() || this.form.invalid) return;
    this.guardando.set(true);
    this.items
      .create(itemRapidoToPayload(this.form.getRawValue()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (item) => {
          this.guardando.set(false);
          const tx = this.t().caja.item.toasts.creado;
          this.toast.success(tx.title, tx.desc);
          this.creado.emit(item);
          this.visible.set(false);
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.formErrors.handle(this.form, err, this.t().caja.item.toasts.error);
        },
      });
  }

  protected cerrar(): void {
    if (!this.guardando()) this.visible.set(false);
  }
}
