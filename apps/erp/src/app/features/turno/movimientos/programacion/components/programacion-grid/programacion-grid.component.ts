import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { ProgramacionFecha, ProgramacionFila } from '../../programacion.model';

/** Grupo de filas que comparten `documento_detalle_id` — un puesto. */
interface GrupoFilas {
  readonly documentoDetalleId: number;
  readonly puestoId: number | null;
  readonly puestoNombre: string | null;
  readonly modalidadNombre: string | null;
  /** Franja horaria del puesto ya formateada (`HH:mm - HH:mm`), o `null`. */
  readonly horario: string | null;
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

/** `HH:mm:ss` → `HH:mm`; `null` si el valor no viene o no es válido. */
function horaCorta(hora: string | null): string | null {
  return hora && hora.length >= 5 ? hora.slice(0, 5) : null;
}

/** Franja `hora_desde`–`hora_hasta` formateada, o `null` si falta algún extremo. */
function formatHorario(desde: string | null, hasta: string | null): string | null {
  const d = horaCorta(desde);
  const h = horaCorta(hasta);
  if (!d || !h) return null;
  return `${d} - ${h}`;
}

/**
 * Identidad de un grupo (puesto) que el grid emite al pedir sus empleados.
 * Lo consume el padre para abrir el modal correspondiente.
 */
export interface ProgramacionGrupoRef {
  readonly documentoDetalleId: number;
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
})
export class ProgramacionGridComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Columnas de día del calendario (ya normalizadas a `{ clave, etiqueta }`). */
  readonly fechas = input.required<readonly ProgramacionFecha[]>();

  /** Filas del calendario (se agrupan por `documento_detalle_id`). */
  readonly filas = input.required<readonly ProgramacionFila[]>();

  /** Claves ISO de fechas festivas — se resaltan en headers y celdas de día. */
  readonly festivoClaves = input<ReadonlySet<string>>(new Set());

  /** Pide ver los empleados de un grupo (puesto). El padre abre el modal. */
  readonly verEmpleados = output<ProgramacionGrupoRef>();

  /** Pide eliminar la programación de un contrato (fila). El padre confirma y borra. */
  readonly eliminarContrato = output<ProgramacionFilaRef>();

  /** Pide editar **una sola línea** (contrato en un puesto). El padre abre el modal. */
  readonly editarLinea = output<ProgramacionFilaRef>();

  /**
   * Pide editar **todas las líneas** del contrato a la vez (masivo). El padre abre
   * el modal con una banda por puesto.
   */
  readonly editarContrato = output<ProgramacionContratoRef>();

  /** Filas agrupadas por `documento_detalle_id` para renderizar separadores. */
  protected readonly grupos = computed<readonly GrupoFilas[]>(() => {
    const result: GrupoFilas[] = [];
    for (const fila of this.filas()) {
      const last = result[result.length - 1];
      if (last && last.documentoDetalleId === fila.documento_detalle_id) {
        (last.items as ProgramacionFila[]).push(fila);
      } else {
        result.push({
          documentoDetalleId: fila.documento_detalle_id,
          puestoId: fila.puesto_id,
          puestoNombre: fila.puesto_nombre,
          modalidadNombre: fila.modalidad_nombre,
          horario: formatHorario(fila.hora_desde, fila.hora_hasta),
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

  /** Emite la identidad del puesto (la agrupación) para abrir el modal. */
  protected onVerEmpleados(grupo: GrupoFilas): void {
    this.verEmpleados.emit({
      documentoDetalleId: grupo.documentoDetalleId,
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

  /** Código del turno del día (`fila.dias[clave].turno_codigo`), con fallback `—`. */
  protected celda(fila: ProgramacionFila, clave: string): string {
    return fila.dias[clave]?.turno_codigo ?? '—';
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
