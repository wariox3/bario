import type { ColumnDef, FilterCondition, FilterField } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Fila de `general/documento/lista/` tal como la usa la pantalla de emisión.
 * Solo se tipan los campos que la pantalla lee; las columnas de cada módulo
 * leen el resto por `field`.
 */
export interface DocumentoPorEmitir {
  readonly id: number;
  readonly numero: string | number | null;
  readonly resolucion_prefijo?: string | null;
  readonly resolucion_numero?: string | null;
  readonly estado_electronico_enviado: boolean;
  /** El último intento de emitir falló; los motivos están en `documento-electronico-error/`. */
  readonly estado_electronico_error?: boolean;
  readonly [campo: string]: unknown;
}

/**
 * Estado electrónico visible. No hay "descartado": el filtro fijo de las tres
 * pantallas ya excluye los descartados, así que nunca llegaría a verse.
 */
export type EstadoElectronico = 'error' | 'enviado' | 'pendiente';

/** La fila con lo que se deriva al mapear la respuesta. */
export interface DocumentoPorEmitirFila extends DocumentoPorEmitir {
  readonly estado_electronico_estado: EstadoElectronico;
  /** `prefijo número` de la resolución (`SETP 18760000001`); vacío si no tiene. */
  readonly resolucion_etiqueta: string;
}

/** Textos propios de cada pantalla: el nombre y cómo llama a sus documentos. */
export interface EmisionElectronicaTextos {
  readonly name: string;
  readonly toasts: {
    readonly emitir: AvisoAccion;
    readonly descartar?: AvisoAccion;
  };
  readonly descartar?: {
    readonly confirm: {
      readonly header: string;
      readonly message: string;
      readonly accept: string;
    };
  };
}

interface AvisoAccion {
  readonly success: { readonly title: string; readonly desc: string };
  readonly error: { readonly title: string; readonly desc: string };
}

/**
 * Lo que distingue a cada pantalla de emisión (facturas de venta, documentos
 * de compra, nóminas). Se pasa por el `data.config` de la ruta.
 */
export interface EmitirDocumentoElectronicoConfig {
  /** Filtros permanentes: acotan el listado a lo que la pantalla emite. */
  readonly baseFilters: readonly FilterCondition[];
  /** Columnas propias. La de Estado la agrega el componente, siempre al final. */
  readonly columns: readonly ColumnDef[];
  readonly filterFields: readonly FilterField[];
  /** Clave de los filtros guardados. No cambiarla: cada persona perdería los suyos. */
  readonly storageKey: string;
  /** Ofrece "Descartar" (irreversible). Exige `textos.descartar` y `toasts.descartar`. */
  readonly descartable: boolean;
  readonly textos: (t: AppDict) => EmisionElectronicaTextos;
}
