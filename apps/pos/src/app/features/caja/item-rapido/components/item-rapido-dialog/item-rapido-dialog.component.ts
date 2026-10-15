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
import { catchError, forkJoin, of } from 'rxjs';
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
import {
  itemRapidoDesdeItem,
  itemRapidoToPatch,
  itemRapidoToPayload,
} from '../../item-rapido.mapper';
import { ItemRapidoService } from '../../item-rapido.service';

/**
 * Alta y edición de un ítem sin salir de la caja: código, nombre, precio,
 * producto o servicio, inventario, impuestos de venta, favorito y (al editar)
 * inactivo. Cuentas contables, costo, imagen y demás se manejan en el ERP.
 *
 * - **Alta** (`itemId` nulo): arranca **sin inventario**; un producto nuevo con
 *   inventario tiene stock cero y la caja no lo dejaría vender.
 * - **Edición** (`itemId`): trae el ítem y guarda con `PATCH` solo esos campos,
 *   conservando los impuestos de compra. Si el ítem ya tiene movimientos
 *   (`validar-uso`), el tipo y el inventario quedan bloqueados, como en el ERP.
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
  /** Ítem a editar; nulo para crear uno nuevo. */
  readonly itemId = input<number | null>(null);
  readonly creado = output<Item>();
  readonly editado = output<Item>();

  protected readonly editando = computed(() => this.itemId() !== null);
  protected readonly guardando = signal(false);
  protected readonly cargando = signal(false);
  /** El ítem ya se movió en documentos: tipo e inventario no se cambian. */
  protected readonly enUso = signal(false);
  /** El ítem tal como llegó, para conservar lo que la caja no edita. */
  private original: Item | null = null;
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
    inactivo: [false],
  });

  protected readonly esProducto = signal(true);

  constructor() {
    this.form.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      this.esProducto.set(tipo === 'producto');
      const inventario = this.form.controls.inventario;
      if (tipo === 'servicio') {
        inventario.setValue(false);
        inventario.disable({ emitEvent: false });
      } else if (!this.enUso()) {
        inventario.enable({ emitEvent: false });
      }
    });
    effect(() => {
      if (!this.visible()) return;
      const codigo = this.codigoInicial();
      const id = this.itemId();
      untracked(() => (id === null ? this.prepararAlta(codigo) : this.cargar(id)));
    });
  }

  private prepararAlta(codigo: string): void {
    this.original = null;
    this.enUso.set(false);
    this.form.enable({ emitEvent: false });
    this.form.reset({ codigo });
    this.esProducto.set(true);
  }

  private cargar(id: number): void {
    this.original = null;
    this.enUso.set(false);
    this.cargando.set(true);
    this.form.reset();
    this.form.disable({ emitEvent: false });
    forkJoin({
      item: this.items.getById(id),
      // Sin respuesta se asume que sí tiene uso: bloquear de más no rompe kardex.
      uso: this.items.validarUso(id).pipe(catchError(() => of(true))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ item, uso }) => {
          this.original = item;
          this.enUso.set(uso);
          this.cargando.set(false);
          this.form.enable({ emitEvent: false });
          const valores = itemRapidoDesdeItem(item);
          this.form.reset({ ...valores, impuestos_ids: [...valores.impuestos_ids] });
          if (uso) {
            this.form.controls.tipo.disable({ emitEvent: false });
            this.form.controls.inventario.disable({ emitEvent: false });
          }
        },
        error: () => {
          this.cargando.set(false);
          const tx = this.t().caja.item.toasts.cargarError;
          this.toast.error(tx.title, tx.desc);
          this.visible.set(false);
        },
      });
  }

  protected onSubmit(): void {
    if (this.guardando() || this.cargando() || this.form.invalid) return;
    const valores = this.form.getRawValue();
    const original = this.original;
    const tx = this.t().caja.item;
    this.guardando.set(true);
    const peticion = original
      ? this.items.actualizarCampos(original.id, itemRapidoToPatch(valores, original))
      : this.items.create(itemRapidoToPayload(valores));
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (item) => {
        this.guardando.set(false);
        const ok = original ? tx.toasts.editado : tx.toasts.creado;
        this.toast.success(ok.title, ok.desc);
        if (original) this.editado.emit(item);
        else this.creado.emit(item);
        this.visible.set(false);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.formErrors.handle(this.form, err, original ? tx.toasts.errorEditar : tx.toasts.error);
      },
    });
  }

  protected cerrar(): void {
    if (!this.guardando()) this.visible.set(false);
  }
}
