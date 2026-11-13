import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, formatCop, formatFechaCorta, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { InformeEmptyCopySet } from '../../../../shared/movimiento-informe.types';
import { formatPorcentaje } from '../../../estado-resultados/estado-resultados.utils';
import type {
  SituacionFormal,
  SituacionFormalCorte,
  SituacionFormalFila,
  SituacionFormalFilaTipo,
} from '../../estado-situacion-financiera.types';
import {
  diferencia,
  direccionDe,
  filasVisibles,
  formatMillones,
  formatMontoContable,
  formatRazon,
  inicioDelAnio,
  type Direccion,
} from '../../estado-situacion-financiera.utils';

/** Fondo y peso de cada fila: la jerarquía va por tinte y peso, no por color. */
const ESTILO_FILA: Readonly<Record<SituacionFormalFilaTipo, string>> = {
  SECCION: 'bg-[rgba(19,38,60,0.035)] font-semibold text-brand-navy',
  SUBSECCION: 'font-semibold text-brand-navy',
  LINEA: 'group hover:bg-[rgba(19,38,60,0.02)]',
  RESULTADO: 'group hover:bg-[rgba(19,38,60,0.02)]',
  SUBTOTAL: 'font-semibold',
  TOTAL: 'bg-[rgba(19,38,60,0.035)] font-bold text-brand-navy',
  TOTAL_FINAL: 'bg-[rgba(19,38,60,0.055)] font-bold text-brand-navy',
};

/**
 * Filete de las celdas de importe. El subtotal lleva una raya arriba —la suma
 * de lo de encima— y los totales además el **doble subrayado**, la convención
 * contable de cifra final. La raya de arriba va como sombra interior y no como
 * borde: con `border-collapse` competiría con el borde inferior de la fila
 * anterior.
 */
const FILETE_IMPORTE: Partial<Record<SituacionFormalFilaTipo, string>> = {
  SUBTOTAL: 'shadow-[inset_0_1px_0_rgba(19,38,60,0.25)]',
  TOTAL:
    'shadow-[inset_0_1px_0_rgba(19,38,60,0.3)] border-b-[3px] border-double border-b-[rgba(19,38,60,0.35)]',
  TOTAL_FINAL:
    'shadow-[inset_0_1px_0_rgba(19,38,60,0.3)] border-b-[3px] border-double border-b-[rgba(19,38,60,0.35)]',
};

const TINTA_DIRECCION: Readonly<Record<Direccion, string>> = {
  sube: 'text-green-700',
  baja: 'text-red-700',
};

interface CeldaVm {
  readonly texto: string;
  readonly clase: string;
}

/** Una cifra de la franja de resumen. */
interface CifraVm {
  readonly etiqueta: string;
  readonly valor: string;
  /** Texto pequeño al lado: el cambio (▲/▼) o el valor de antes. Vacío = no se pinta. */
  readonly nota: string;
  readonly notaClase: string;
}

/**
 * Presentación **formal** del estado de situación financiera: la franja de
 * resumen (totales, razones y cuadre) y el estado en secciones,
 * subtotales y totales contra el corte anterior.
 *
 * Componente tonto, gemelo de `resultado-formal-table`. El único estado propio
 * es qué secciones están plegadas, que es de pantalla: se reinicia con cada
 * informe nuevo.
 */
@Component({
  selector: 'app-situacion-formal-table',
  standalone: true,
  imports: [RouterLink],
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-hidden' },
  templateUrl: './situacion-formal-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SituacionFormalTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly informe = input.required<SituacionFormal>();
  readonly empty = input.required<InformeEmptyCopySet>();
  readonly loading = input<boolean>(false);
  /** Columnas de variación y porcentaje. Solo pantalla: el Excel y el PDF las traen siempre. */
  readonly mostrarVariacion = input<boolean>(true);
  /**
   * Ruta del auxiliar por cuenta. Con ella cada cuenta ofrece «Ver auxiliar»;
   * `null` la apaga.
   */
  readonly auxiliarRuta = input<readonly string[] | null>(null);

  /** Índices (en `filas`) de las secciones y subsecciones plegadas. */
  private readonly plegadas = linkedSignal<SituacionFormal, ReadonlySet<number>>({
    source: this.informe,
    computation: () => new Set<number>(),
  });

  protected readonly th =
    'sticky top-0 z-[1] whitespace-nowrap bg-[#f8f9fa] px-3 py-[0.6rem] text-[0.66rem] font-bold ' +
    'uppercase tracking-[0.04em] text-brand-muted shadow-[inset_0_-1px_0_rgba(19,38,60,0.1)]';

  protected readonly td = 'border-b border-[rgba(19,38,60,0.06)] px-3 py-[0.55rem]';

  protected readonly hayAnterior = computed(() => this.informe().encabezado.anterior !== null);
  protected readonly verVariacion = computed(() => this.hayAnterior() && this.mostrarVariacion());
  protected readonly columnas = computed(
    () => 3 + (this.hayAnterior() ? 1 : 0) + (this.verVariacion() ? 2 : 0),
  );

  protected readonly fechaCorte = computed(() =>
    formatFechaCorta(this.informe().encabezado.fecha_corte, ''),
  );
  protected readonly fechaAnterior = computed(() =>
    formatFechaCorta(this.informe().encabezado.fecha_anterior, ''),
  );

  /** Rango del auxiliar: del 1 de enero del año del corte a la fecha de corte. */
  private readonly rangoAuxiliar = computed(() => {
    const corte = this.informe().encabezado.fecha_corte;
    return { desde: inicioDelAnio(corte), hasta: corte };
  });

  /** «Ver auxiliar» solo a nivel de cuenta: un grupo no es una cuenta que abrir. */
  private readonly conAuxiliar = computed(
    () => this.auxiliarRuta() !== null && this.informe().encabezado.nivel === 'cuenta',
  );

  protected readonly filas = computed(() => {
    const hayAnterior = this.hayAnterior();
    const verVariacion = this.verVariacion();
    const conAuxiliar = this.conAuxiliar();
    const rango = this.rangoAuxiliar();

    return filasVisibles(this.informe().filas, this.plegadas()).map((vm) => {
      const { fila, importes } = vm;
      const celdas: CeldaVm[] = [this.celdaSaldo(fila, importes?.actual ?? null)];
      if (hayAnterior) celdas.push(this.celdaSaldo(fila, importes?.anterior ?? null));
      if (verVariacion) celdas.push(...this.celdasVariacion(importes));
      const filete = FILETE_IMPORTE[fila.tipo] ?? '';

      return {
        ...vm,
        estilo: ESTILO_FILA[fila.tipo] ?? '',
        celdas: celdas.map((celda) => ({ ...celda, clase: `${celda.clase} ${filete}` })),
        auxiliar:
          conAuxiliar && fila.tipo === 'LINEA' && fila.codigo
            ? { cuenta: fila.codigo, nombre: fila.nombre, ...rango }
            : null,
      };
    });
  });

  /** Activo, pasivo y patrimonio del corte, con el cambio frente al anterior. */
  protected readonly totales = computed<readonly CifraVm[]>(() => {
    const r = this.t().entities.estadoSituacionFinanciera.formal.resumen;
    const { actual, anterior } = this.informe().encabezado;
    const cifra = (etiqueta: string, campo: 'activo' | 'pasivo' | 'patrimonio'): CifraVm => {
      const cambio = anterior ? diferencia(actual[campo], anterior[campo]) : null;
      const direccion = direccionDe(cambio);
      return {
        etiqueta,
        valor: formatMillones(actual[campo]),
        nota: direccion
          ? `${direccion === 'sube' ? '▲' : '▼'} ${formatMillones(Math.abs(toFiniteNumber(cambio) ?? 0))}`
          : '',
        notaClase: direccion ? TINTA_DIRECCION[direccion] : '',
      };
    };
    return [
      cifra(r.activo, 'activo'),
      cifra(r.pasivo, 'pasivo'),
      cifra(r.patrimonio, 'patrimonio'),
    ];
  });

  /** Razón corriente y endeudamiento, con su valor en el corte anterior. */
  protected readonly razones = computed<readonly CifraVm[]>(() => {
    const r = this.t().entities.estadoSituacionFinanciera.formal.resumen;
    const { actual, anterior } = this.informe().encabezado;
    const razon = (etiqueta: string, formato: (corte: SituacionFormalCorte) => string): CifraVm => {
      const antes = anterior ? formato(anterior) : '';
      return {
        etiqueta,
        valor: formato(actual),
        nota: antes ? r.antes.replace('{valor}', antes) : '',
        notaClase: 'text-brand-muted',
      };
    };
    return [
      razon(r.razonCorriente, (corte) => formatRazon(corte.razon_corriente)),
      razon(r.endeudamiento, (corte) => formatPorcentaje(corte.endeudamiento)),
    ];
  });

  /**
   * El cuadre: activo = pasivo + patrimonio. Ámbar y no rojo cuando falla: no
   * es un error de la pantalla sino un estado de la contabilidad (un documento
   * que no cuadra, o un filtro) con una explicación y una salida.
   */
  protected readonly cuadre = computed(() => {
    const r = this.t().entities.estadoSituacionFinanciera.formal.resumen;
    const { actual, anterior } = this.informe().encabezado;
    const avisos: string[] = [];
    if (!actual.cuadrado) {
      avisos.push(
        r.descuadrado.replace(
          '{valor}',
          formatCop(Math.abs(toFiniteNumber(actual.diferencia) ?? 0)),
        ),
      );
    }
    if (anterior && !anterior.cuadrado) {
      avisos.push(
        r.descuadradoAnterior.replace(
          '{valor}',
          formatCop(Math.abs(toFiniteNumber(anterior.diferencia) ?? 0)),
        ),
      );
    }
    return avisos;
  });

  protected alternar(indice: number): void {
    this.plegadas.update((actuales) => {
      const siguientes = new Set(actuales);
      if (!siguientes.delete(indice)) siguientes.add(indice);
      return siguientes;
    });
  }

  /**
   * Saldo de un corte. En rojo solo el resultado del ejercicio negativo, que es
   * pérdida —como en el estado de resultados—; cualquier otro negativo es una
   * cuenta correctora y va solo entre paréntesis.
   */
  private celdaSaldo(fila: SituacionFormalFila, valor: string | null): CeldaVm {
    const perdida = fila.tipo === 'RESULTADO' && (toFiniteNumber(valor) ?? 0) < 0;
    return { texto: formatMontoContable(valor), clase: perdida ? 'text-red-700' : '' };
  }

  /** Variación y porcentaje, tintados por dirección. Sin cambio quedan vacíos. */
  private celdasVariacion(importes: SituacionFormalFila | null): readonly CeldaVm[] {
    const direccion = direccionDe(importes?.variacion ?? null);
    if (!importes || !direccion)
      return [
        { texto: '', clase: '' },
        { texto: '', clase: '' },
      ];
    const tinta = TINTA_DIRECCION[direccion];
    return [
      { texto: formatMontoContable(importes.variacion), clase: tinta },
      { texto: formatPorcentaje(importes.porcentaje), clase: tinta },
    ];
  }
}
