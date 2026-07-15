import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { I18nService, formatHorario } from '@reddoc/core';
import type { AppDict } from '@turnos/i18n';
import type { ProgramacionFecha, ProgramacionFila } from '../../programacion.model';
import {
  esColumnaFestiva,
  esColumnaSabado,
  formatVigenciaRango,
  localeDe,
  vigenciaDe,
} from '../../programacion.utils';

/** Grupo de filas que comparten `documento_detalle_id` — un puesto. */
interface GrupoFilas {
  readonly documentoDetalleId: number;
  /** Línea del documento afectado (origen del puesto); FK del prototipo. Puede ser `null`. */
  readonly documentoDetalleAfectadoId: number | null;
  readonly puestoId: number | null;
  readonly puestoNombre: string | null;
  readonly modalidadNombre: string | null;
  /** Franja horaria del puesto ya formateada (`HH:mm - HH:mm`), o `null`. */
  readonly horario: string | null;
  /**
   * Vigencia de la línea ya formateada (`15 de jul - 31 de jul`), o `null` si el
   * detalle no trae ambos extremos (hoy el backend solo manda `fecha_desde`).
   */
  readonly rangoVigencia: string | null;
  /**
   * Horas del puesto, **ya calculadas por el backend** (contratadas y
   * programadas, total/diurnas/nocturnas). Vienen agregadas por puesto e
   * idénticas en cada fila del grupo, así que se toman de la primera —no se suman.
   */
  readonly horas: number;
  readonly horasDiurnas: number;
  readonly horasNocturnas: number;
  readonly horasProgramadas: number;
  readonly horasDiurnasProgramadas: number;
  readonly horasNocturnasProgramadas: number;
  readonly items: readonly ProgramacionFila[];
}

/**
 * Identidad de un grupo (puesto) que el grid emite al pedir sus empleados.
 * Lo consume el padre para abrir el modal correspondiente.
 */
export interface ProgramacionGrupoRef {
  readonly documentoDetalleId: number;
  /**
   * Línea del documento afectado (origen del puesto). Es el FK con el que el
   * prototipo lista/crea/simula sus filas (`documento_detalle`). Puede ser `null`
   * (puesto sin documento afectado), en cuyo caso el prototipo no puede guardarse.
   */
  readonly documentoDetalleAfectadoId: number | null;
  readonly puestoId: number | null;
  readonly puestoNombre: string | null;
}

/**
 * Identidad de una **fila** (contrato en un puesto) que el grid emite al pedir
 * eliminar su programación. Lo consume el padre para confirmar el borrado.
 */
export interface ProgramacionFilaRef {
  readonly documentoDetalleId: number;
  readonly contratoId: number;
  readonly contratoNombre: string | null;
}

/**
 * Identidad de un **contrato** que el grid emite al pedir editar su programación.
 * La edición ya no es por puesto: el modal lista todas las líneas del contrato
 * (una por puesto) partiendo de este id, así que basta con identificarlo.
 */
export interface ProgramacionContratoRef {
  readonly id: number;
  readonly nombre: string;
  readonly numeroIdentificacion: string;
}

/**
 * Grid (calendario de turnos) del detalle de programación — **presentacional**.
 *
 * Componente dedicado a este movimiento (no reutiliza la tabla de venta, solo su
 * diseño): un `<table>` propio con header sticky, columnas de día dinámicas
 * (desde `fechas`) y filas **agrupadas por `documento_detalle_id`** mediante una
 * fila-separadora por grupo.
 *
 * Es "tonto": recibe `fechas` + `filas` por input y no tiene HTTP ni estado de
 * negocio. Solo lectura por ahora (sin checkbox ni acciones; se sumarán luego).
 */
@Component({
  selector: 'app-programacion-grid',
  standalone: true,
  templateUrl: './programacion-grid.component.html',
  styleUrl: './programacion-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramacionGridComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Reglas de resaltado de columna (festivo/sábado), compartidas — ver utils. */
  protected readonly esColumnaFestiva = esColumnaFestiva;
  protected readonly esColumnaSabado = esColumnaSabado;

  /** Columnas de día del calendario (ya normalizadas a `{ clave, etiqueta }`). */
  readonly fechas = input.required<readonly ProgramacionFecha[]>();

  /** Filas del calendario (se agrupan por `documento_detalle_id`). */
  readonly filas = input.required<readonly ProgramacionFila[]>();

  /** Claves ISO de fechas festivas — se resaltan en headers y celdas de día. */
  readonly festivoClaves = input<ReadonlySet<string>>(new Set());

  /** Pide ver los empleados de un grupo (puesto). El padre abre el modal. */
  readonly verEmpleados = output<ProgramacionGrupoRef>();

  /** Pide abrir el prototipo (generar turnos automáticamente) de un puesto. El padre abre el modal. */
  readonly prototipo = output<ProgramacionGrupoRef>();

  /** Pide editar la programación de todos los contratos del puesto (grupo). El padre abre el modal. */
  readonly editarPuesto = output<ProgramacionGrupoRef>();

  /** Pide eliminar la programación de un contrato (fila). El padre confirma y borra. */
  readonly eliminarContrato = output<ProgramacionFilaRef>();

  /** Pide editar **una sola línea** (contrato en un puesto). El padre abre el modal. */
  readonly editarLinea = output<ProgramacionFilaRef>();

  /**
   * Pide editar **todas las líneas** del contrato a la vez (masivo). El padre abre
   * el modal con una banda por puesto.
   */
  readonly editarContrato = output<ProgramacionContratoRef>();

  /** Emite las filas seleccionadas (checkboxes) al cambiar. El padre muestra la acción. */
  readonly selectionChange = output<readonly ProgramacionFilaRef[]>();

  /** Filas agrupadas por `documento_detalle_id` para renderizar separadores. */
  protected readonly grupos = computed<readonly GrupoFilas[]>(() => {
    const locale = localeDe(this.i18n.lang());
    const result: GrupoFilas[] = [];
    for (const fila of this.filas()) {
      const last = result[result.length - 1];
      if (last && last.documentoDetalleId === fila.documento_detalle_id) {
        (last.items as ProgramacionFila[]).push(fila);
      } else {
        result.push({
          documentoDetalleId: fila.documento_detalle_id,
          documentoDetalleAfectadoId: fila.documento_detalle_afectado_id,
          puestoId: fila.puesto_id,
          puestoNombre: fila.puesto_nombre,
          modalidadNombre: fila.modalidad_nombre,
          horario: formatHorario(fila.hora_desde, fila.hora_hasta),
          rangoVigencia: formatVigenciaRango(
            vigenciaDe(fila.fecha_desde, fila.fecha_hasta),
            locale,
          ),
          horas: fila.horas,
          horasDiurnas: fila.horas_diurnas,
          horasNocturnas: fila.horas_nocturnas,
          horasProgramadas: fila.horas_programadas,
          horasDiurnasProgramadas: fila.horas_diurnas_programadas,
          horasNocturnasProgramadas: fila.horas_nocturnas_programadas,
          items: [fila],
        });
      }
    }
    return result;
  });

  /**
   * Columnas totales para el `colspan` de la fila de grupo y el empty state:
   * 1 fija izquierda (empleado) + días + 4 resumen (HD, HN, C, A) +
   * 2 reservadas para opciones por fila.
   */
  protected readonly colspan = computed(() => 1 + this.fechas().length + 4 + 2);

  // ── Selección de filas (para el borrado masivo) ───────────────────────────

  /** Claves (`documento_detalle_id|contrato_id`) de las filas marcadas. */
  private readonly seleccion = signal<ReadonlySet<string>>(new Set());

  /** Filas borrables (con contrato asignado): las únicas seleccionables. */
  private readonly filasSeleccionables = computed<readonly ProgramacionFila[]>(() =>
    this.filas().filter((f) => f.contrato_id !== null),
  );

  /** Filas seleccionadas, como refs listos para emitir al padre. */
  protected readonly seleccionadas = computed<readonly ProgramacionFilaRef[]>(() => {
    const marcadas = this.seleccion();
    return this.filasSeleccionables()
      .filter((f) => marcadas.has(this.filaKey(f)))
      .map((f) => this.toRef(f));
  });

  /** `true` si todas las filas seleccionables están marcadas (para el header). */
  protected readonly todasSeleccionadas = computed(() => {
    const total = this.filasSeleccionables().length;
    return total > 0 && this.seleccionadas().length === total;
  });

  /** `true` si hay selección parcial (estado indeterminado del checkbox del header). */
  protected readonly indeterminado = computed(() => {
    const n = this.seleccionadas().length;
    return n > 0 && n < this.filasSeleccionables().length;
  });

  constructor() {
    // Al cambiar las filas (recarga tras aplicar/borrar) la selección queda obsoleta:
    // se limpia para no arrastrar claves de un mes/documento anterior.
    effect(() => {
      this.filas();
      this.seleccion.set(new Set());
    });
  }

  /** Clave estable de una fila para la selección. */
  private filaKey(fila: ProgramacionFila): string {
    return `${fila.documento_detalle_id}|${fila.contrato_id}`;
  }

  /** `true` si la fila está marcada. */
  protected estaSeleccionada(fila: ProgramacionFila): boolean {
    return this.seleccion().has(this.filaKey(fila));
  }

  /** Marca/desmarca una fila. */
  protected toggleFila(fila: ProgramacionFila): void {
    const next = new Set(this.seleccion());
    const key = this.filaKey(fila);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.commitSeleccion(next);
  }

  /** Marca todas las filas seleccionables, o las desmarca si ya estaban todas. */
  protected toggleTodas(): void {
    this.commitSeleccion(
      this.todasSeleccionadas()
        ? new Set()
        : new Set(this.filasSeleccionables().map((f) => this.filaKey(f))),
    );
  }

  /** Limpia la selección (acción del padre). Público para invocarlo por template ref. */
  limpiarSeleccion(): void {
    this.commitSeleccion(new Set());
  }

  /** Fija la selección y emite las filas resultantes al padre. */
  private commitSeleccion(next: ReadonlySet<string>): void {
    this.seleccion.set(next);
    this.selectionChange.emit(this.seleccionadas());
  }

  private toRef(fila: ProgramacionFila): ProgramacionFilaRef {
    return {
      documentoDetalleId: fila.documento_detalle_id,
      contratoId: fila.contrato_id as number,
      contratoNombre: fila.contrato_contacto_nombre_corto,
    };
  }

  /** Emite la identidad del puesto (la agrupación) para abrir el modal. */
  protected onVerEmpleados(grupo: GrupoFilas): void {
    this.verEmpleados.emit({
      documentoDetalleId: grupo.documentoDetalleId,
      documentoDetalleAfectadoId: grupo.documentoDetalleAfectadoId,
      puestoId: grupo.puestoId,
      puestoNombre: grupo.puestoNombre,
    });
  }

  /** Emite la identidad del puesto para abrir su prototipo (generar turnos automáticamente). */
  protected onPrototipo(grupo: GrupoFilas): void {
    this.prototipo.emit({
      documentoDetalleId: grupo.documentoDetalleId,
      documentoDetalleAfectadoId: grupo.documentoDetalleAfectadoId,
      puestoId: grupo.puestoId,
      puestoNombre: grupo.puestoNombre,
    });
  }

  /** Emite la identidad del puesto para editar la programación de todos sus contratos. */
  protected onEditarPuesto(grupo: GrupoFilas): void {
    this.editarPuesto.emit({
      documentoDetalleId: grupo.documentoDetalleId,
      documentoDetalleAfectadoId: grupo.documentoDetalleAfectadoId,
      puestoId: grupo.puestoId,
      puestoNombre: grupo.puestoNombre,
    });
  }

  /**
   * Emite la **fila** (contrato en un puesto) para editar una sola línea. Lo dispara
   * el botón de lápiz; el padre abre el modal con una única banda.
   */
  protected onEditar(fila: ProgramacionFila): void {
    if (fila.contrato_id == null) return;
    this.editarLinea.emit({
      documentoDetalleId: fila.documento_detalle_id,
      contratoId: fila.contrato_id,
      contratoNombre: fila.contrato_contacto_nombre_corto,
    });
  }

  /**
   * Emite la identidad del **contrato** para editar todas sus líneas a la vez
   * (masivo). Lo dispara el click en el nombre del contrato; el modal reúne todos
   * sus puestos desde el detalle.
   */
  protected onEditarNombre(fila: ProgramacionFila): void {
    if (fila.contrato_id == null) return;
    this.editarContrato.emit({
      id: fila.contrato_id,
      nombre: fila.contrato_contacto_nombre_corto ?? '',
      numeroIdentificacion: fila.contrato_contacto_numero_identificacion ?? '',
    });
  }

  /** Emite la fila (contrato) para que el padre confirme y elimine su programación. */
  protected onEliminar(fila: ProgramacionFila): void {
    if (fila.contrato_id == null) return;
    this.eliminarContrato.emit({
      documentoDetalleId: fila.documento_detalle_id,
      contratoId: fila.contrato_id,
      contratoNombre: fila.contrato_contacto_nombre_corto,
    });
  }

  /**
   * Meta-línea bajo el nombre: número de identificación y, si el contrato tiene
   * id, su código abreviado (`1182932839 - Cont. 2`). Devuelve `''` cuando no hay
   * ningún dato, para que la plantilla omita el `<span>`.
   */
  protected metaLinea(fila: ProgramacionFila, contratoAbrev: string): string {
    const partes: string[] = [];
    if (fila.contrato_contacto_numero_identificacion) {
      partes.push(fila.contrato_contacto_numero_identificacion);
    }
    if (fila.contrato_id !== null) {
      partes.push(`${contratoAbrev} ${fila.contrato_id}`);
    }
    return partes.join(' - ');
  }

  /** Código del turno del día (`fila.dias[clave].turno_codigo`), vacío si el día no tiene turno. */
  protected celda(fila: ProgramacionFila, clave: string): string {
    return fila.dias[clave]?.turno_codigo ?? '';
  }

  /** Total de horas diurnas de la fila (suma de los días). */
  protected horasDiurnas(fila: ProgramacionFila): number {
    return this.sumarHoras(fila, 'horas_diurnas');
  }

  /** Total de horas nocturnas de la fila (suma de los días). */
  protected horasNocturnas(fila: ProgramacionFila): number {
    return this.sumarHoras(fila, 'horas_nocturnas');
  }

  private sumarHoras(fila: ProgramacionFila, campo: 'horas_diurnas' | 'horas_nocturnas'): number {
    return Object.values(fila.dias).reduce((acc, celda) => acc + (celda?.[campo] ?? 0), 0);
  }

  /** Normaliza un número resumen a texto (`—` si viene vacío). */
  protected resumen(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : String(value);
  }
}
