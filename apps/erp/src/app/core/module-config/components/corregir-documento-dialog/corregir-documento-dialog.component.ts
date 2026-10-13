import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import {
  I18nService,
  SELECT_ENDPOINTS,
  ToastService,
  extractErrorMessage,
  formatCop,
  type ErpSelectOption,
} from '@reddoc/core';
import {
  ErpApiAutocompleteComponent,
  ErpApiSelectComponent,
  ErpContactoSelectComponent,
} from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { CorregirDocumentoService } from './corregir-documento.service';
import {
  aCabeceraCorregible,
  aLineaCorregible,
  payloadContabilidad,
  type CabeceraCorregible,
  type LineaCorregible,
} from './corregir-documento';

const SEDE_ENDPOINT = '/general/sede/seleccionar/';

/**
 * Diálogo **Corregir** del dropdown "Opciones" de la ficha —la corrección
 * **contable**—: arregla un documento aprobado sin desaprobarlo, que liberaría
 * su número. Corrige la sede de la cabecera, el centro de costo de cada línea y
 * la base y el contacto de las líneas de cuenta. Lo que en el ERP anterior se
 * llamaba "grupo" es acá el centro de costo. Lo que viaja a la DIAN lo corrige
 * `CorregirElectronicoDialogComponent`, en el dropdown Electrónico.
 *
 * A diferencia del legacy, que guardaba cada campo al soltarlo, junta los
 * cambios y los manda con **Guardar** en un solo `actualizar-contabilidad/`:
 * un aviso por corrección, no uno por campo, y Cancelar no deja nada a medias.
 * Solo viaja lo que cambió.
 *
 * Carga su propia cabecera y líneas al abrirse: la ficha solo pasa el id.
 */
@Component({
  selector: 'app-corregir-documento-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    ErpApiSelectComponent,
    ErpApiAutocompleteComponent,
    ErpContactoSelectComponent,
  ],
  templateUrl: './corregir-documento-dialog.component.html',
  styleUrl: './corregir-documento-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorregirDocumentoDialogComponent {
  private readonly service = inject(CorregirDocumentoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Visibilidad two-way: la abre el dropdown "Opciones". */
  readonly visible = model<boolean>(false);
  readonly documentoId = input<number | null>(null);
  /** Se guardó al menos una corrección: la ficha debe recargarse. */
  readonly corregido = output<void>();

  protected readonly sedeEndpoint = SEDE_ENDPOINT;
  protected readonly centroCostoEndpoint = SELECT_ENDPOINTS.centroCosto;
  protected readonly formatMoney = formatCop;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  /** No se pudo cargar el documento: no hay nada que corregir. */
  protected readonly loadFailed = signal(false);

  private readonly cabeceraOriginal = signal<CabeceraCorregible | null>(null);
  protected readonly cabecera = signal<CabeceraCorregible | null>(null);
  private readonly lineasOriginales = signal<ReadonlyMap<number, LineaCorregible>>(new Map());
  protected readonly lineas = signal<readonly LineaCorregible[]>([]);

  constructor() {
    // Se consulta cada vez que se abre: entre una apertura y otra la ficha pudo
    // cambiar el documento, y las correcciones se comparan contra lo vigente.
    effect(() => {
      if (!this.visible()) return;
      const id = untracked(this.documentoId);
      if (id == null) return;
      untracked(() => this.load(id));
    });
  }

  protected onVisibleChange(value: boolean): void {
    if (!value && this.isSaving()) return;
    this.visible.set(value);
  }

  protected onCancel(): void {
    if (this.isSaving()) return;
    this.visible.set(false);
  }

  protected setSede(sede: ErpSelectOption | null): void {
    this.cabecera.update((c) => (c ? { ...c, sede } : c));
  }

  protected setLinea(id: number, cambio: Partial<LineaCorregible>): void {
    this.lineas.update((lineas) =>
      lineas.map((linea) => (linea.id === id ? { ...linea, ...cambio } : linea)),
    );
  }

  /**
   * Manda todo lo que cambió en un solo `actualizar-contabilidad/`. Si falla,
   * el aviso dice el motivo del backend y el diálogo queda abierto con lo
   * editado, para corregir y reintentar.
   */
  protected onGuardar(): void {
    const id = this.documentoId();
    const cabeceraOriginal = this.cabeceraOriginal();
    const cabecera = this.cabecera();
    if (id == null || !cabeceraOriginal || !cabecera || this.isSaving()) return;
    const ts = this.t().documentActions.corregir.toasts;

    const payload = payloadContabilidad(
      id,
      { cabecera: cabeceraOriginal, lineas: this.lineasOriginales() },
      { cabecera, lineas: this.lineas() },
    );
    if (!payload) {
      this.toast.info(ts.sinCambios.title, ts.sinCambios.desc);
      this.visible.set(false);
      return;
    }

    this.isSaving.set(true);
    this.service
      .actualizarContabilidad(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(ts.success.title, ts.success.desc);
          this.corregido.emit();
          this.visible.set(false);
        },
        error: (err: unknown) => {
          this.toast.error(ts.error.title, extractErrorMessage(err, ts.error.desc));
        },
      });
  }

  private load(id: number): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    forkJoin({ cabecera: this.service.cabecera(id), lineas: this.service.lineas(id) })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: ({ cabecera, lineas }) => {
          const cab = aCabeceraCorregible(cabecera);
          const lns = lineas.map(aLineaCorregible);
          this.cabeceraOriginal.set(cab);
          this.cabecera.set(cab);
          this.lineasOriginales.set(new Map(lns.map((l) => [l.id, l])));
          this.lineas.set(lns);
        },
        error: () => {
          this.loadFailed.set(true);
          const ts = this.t().documentActions.corregir.toasts.loadError;
          this.toast.error(ts.title, ts.desc);
        },
      });
  }
}
