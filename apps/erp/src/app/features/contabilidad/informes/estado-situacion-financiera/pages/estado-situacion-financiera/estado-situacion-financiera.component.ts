import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, type ValidatorFn } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpApiAutocompleteComponent } from '@reddoc/ui';
import { TenantService, type ErpSelectOption, type FilterCondition } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type {
  InformeEstadoRow,
  InformeMontoColumn,
} from '../../../../shared/movimiento-informe.types';
import { buildFiltrosDetalle } from '../../../../shared/movimiento-informe.utils';
import { rangoFechas } from '../../../../shared/rango-fechas.validators';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { totalesDeBase } from '../../../estado-resultados/estado-resultados.utils';
import { SituacionFormalTableComponent } from '../../components/situacion-formal-table/situacion-formal-table.component';
import { EstadoSituacionFinancieraService } from '../../estado-situacion-financiera.service';
import type {
  CompararSituacion,
  NivelSituacion,
  PresentacionSituacion,
  SituacionFormal,
  SituacionFormalOpciones,
} from '../../estado-situacion-financiera.types';

/** Master de centros de costo, con el autocomplete genérico (como en estado de resultados). */
const CENTRO_COSTO_ENDPOINT = '/contabilidad/centro-costo/seleccionar/';

/**
 * Informe **Estado de situación financiera** del módulo Contabilidad.
 *
 * Gemelo del estado de resultados: endpoint propio sin paginar
 * (`/contabilidad/movimiento-informe-situacion/`) y dos presentaciones.
 *
 * - **Formal** (la de entrada): un **corte** a una fecha, no un rango. Por eso
 *   el panel apaga la fecha desde y la banda pasa a llamarse «Corte», con
 *   «Comparar con» al lado. Suma el nivel de detalle (cuenta o grupo) y es la
 *   única que imprime en PDF.
 * - **Base**: una fila por cuenta que movió en el rango, tal como sale del
 *   backend. Esa sí es un rango, así que vuelve la fecha desde, y «Comparar
 *   con», el nivel y el PDF desaparecen porque el backend no los lee.
 *
 * Como en resultados, la tabla sigue a lo último generado, no al selector:
 * cambiar la presentación solo avisa que hay que generar de nuevo.
 *
 * El interruptor de **variación** es solo de pantalla: el body no tiene ese
 * parámetro y el Excel y el PDF la traen siempre. Por eso va en la botonera y
 * no deja viejo el informe.
 */
@Component({
  selector: 'app-estado-situacion-financiera',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CheckboxModule,
    SelectModule,
    ListShellComponent,
    ErpApiAutocompleteComponent,
    MovimientoInformeParamsComponent,
    MovimientoInformeActionsComponent,
    MovimientoInformeTableComponent,
    SituacionFormalTableComponent,
  ],
  templateUrl: './estado-situacion-financiera.component.html',
  styleUrl: './estado-situacion-financiera.component.scss',
})
export class EstadoSituacionFinancieraComponent extends MovimientoInformePageBase<InformeEstadoRow> {
  protected readonly service = inject(EstadoSituacionFinancieraService);
  protected readonly archivo = 'estado-situacion-financiera';
  private readonly tenantService = inject(TenantService);

  protected readonly centroCostoEndpoint = CENTRO_COSTO_ENDPOINT;

  /** Centro de costo por el que acotar (opcional). Viaja como `centro_costo_id`. */
  protected readonly centroCosto = new FormControl<ErpSelectOption | null>(null);

  protected readonly presentacion = new FormControl<PresentacionSituacion>('formal', {
    nonNullable: true,
  });
  protected readonly comparar = new FormControl<CompararSituacion>('cierre_anterior', {
    nonNullable: true,
  });
  protected readonly nivel = new FormControl<NivelSituacion>('cuenta', { nonNullable: true });
  protected readonly verVariacion = new FormControl<boolean>(true, { nonNullable: true });

  private readonly presentacionActual = toSignal(this.presentacion.valueChanges, {
    initialValue: this.presentacion.value,
  });
  protected readonly nivelActual = toSignal(this.nivel.valueChanges, {
    initialValue: this.nivel.value,
  });
  protected readonly variacionVisible = toSignal(this.verVariacion.valueChanges, {
    initialValue: this.verVariacion.value,
  });

  /** El panel sigue al selector (qué se va a generar), no a lo ya generado. */
  protected readonly esFormal = computed(() => this.presentacionActual() === 'formal');

  /** Último estado formal generado; `null` cuando lo que se ve es la presentación base. */
  protected readonly formal = signal<SituacionFormal | null>(null);

  protected readonly presentaciones = computed(() => {
    const d = this.t().entities.estadoSituacionFinanciera.presentacion;
    return [
      { value: 'formal', label: d.formal },
      { value: 'base', label: d.base },
    ];
  });

  protected readonly opcionesComparar = computed(() => {
    const d = this.t().entities.estadoSituacionFinanciera.comparar;
    const valores: readonly CompararSituacion[] = ['cierre_anterior', 'anio_anterior', 'ninguno'];
    return valores.map((value) => ({ value, label: d[value] }));
  });

  protected readonly niveles = computed(() => {
    const d = this.t().entities.estadoSituacionFinanciera.nivel;
    const valores: readonly NivelSituacion[] = ['grupo', 'cuenta'];
    return valores.map((value) => ({ value, label: d[value] }));
  });

  /** El interruptor de variación solo sirve sobre un formal con comparativo. */
  protected readonly ofreceVariacion = computed(() => this.formal()?.encabezado.anterior != null);

  /** Ruta del auxiliar por cuenta al que lleva «Ver auxiliar». */
  protected readonly auxiliarRuta = computed<readonly string[] | null>(() => {
    const slug = this.tenantService.currentSlug();
    return slug ? ['/t', slug, 'contabilidad', 'informes', 'auxiliar-cuenta'] : null;
  });

  constructor() {
    super();
    // También dejan viejo el informe ya generado. Va acá y no en la base porque
    // los campos de la subclase recién existen a esta altura.
    this.watchParam(this.centroCosto);
    this.watchParam(this.presentacion);
    this.watchParam(this.comparar);
    this.watchParam(this.nivel);
    // El rango de fechas solo se valida en la base: hay que reevaluarlo al cambiar.
    this.presentacion.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.updateValueAndValidity());
  }

  protected get nombre(): string {
    return this.t().entities.estadoSituacionFinanciera.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.estadoSituacionFinanciera.empty;
  }

  /**
   * El rango solo existe en la base: el formal es un corte y no manda la fecha
   * desde, así que una fecha desde oculta no puede bloquear la consulta.
   *
   * Se llama mientras se construye la base, antes de que existan los campos de
   * esta clase: de ahí el `?.`. Arranca en formal, que no valida nada.
   */
  protected override rangeValidator(): ValidatorFn {
    const rango = rangoFechas('fecha_desde', 'fecha_hasta');
    return (group) => (this.presentacion?.value === 'base' ? rango(group) : null);
  }

  /** Un único importe en la base: el saldo de la cuenta. */
  protected override montosDe(
    columns: AppDict['entities']['informeCuentas']['columns'],
  ): readonly InformeMontoColumn[] {
    return [{ field: 'saldo', label: columns.saldo }];
  }

  protected override extraFilters(): readonly FilterCondition[] {
    return buildFiltrosDetalle({ centroCosto: this.centroCosto.value });
  }

  protected elegirNivel(nivel: NivelSituacion): void {
    this.nivel.setValue(nivel);
  }

  private opciones(): SituacionFormalOpciones {
    return { comparar: this.comparar.value, nivel: this.nivel.value };
  }

  protected override consultar(): void {
    const params = this.buildParams();
    if (this.presentacion.value === 'formal') {
      this.ejecutarConsulta(this.service.listaFormal(params, this.opciones()), (formal) => {
        this.formal.set(formal);
        this.rows.set([]);
        this.totales.set(null);
      });
      return;
    }
    this.ejecutarConsulta(this.service.listaBase(params), (filas) => {
      this.formal.set(null);
      this.rows.set(filas);
      this.totales.set(totalesDeBase(filas));
    });
  }

  protected override limpiarResultado(): void {
    super.limpiarResultado();
    this.formal.set(null);
  }

  /** Excel de la presentación elegida, con los parámetros del formulario. */
  protected override exportExcel(): void {
    const presentacion = this.presentacion.value;
    this.descargar(
      this.service.exportUrl,
      `${this.archivo}-${presentacion}.xlsx`,
      this.isExportingExcel,
      this.service.buildBodySituacion(presentacion, this.buildParams(), this.opciones()),
    );
  }

  /** PDF: solo del formal, el estado listo para firmar. */
  protected override exportPdf(): void {
    if (this.presentacion.value !== 'formal') return;
    this.descargar(
      this.service.pdfUrl,
      `${this.archivo}.pdf`,
      this.isExportingPdf,
      this.service.buildBodySituacion('formal', this.buildParams(), this.opciones()),
    );
  }
}
