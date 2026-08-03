/**
 * Modelo del wizard **Importar ZIP** (Eventos DIAN, Compra).
 *
 * Crea una factura de compra (`documento_tipo = 5`) a partir de la factura
 * electrónica DIAN del proveedor empaquetada en un ZIP. El backend parsea el
 * ZIP y devuelve los datos del contacto y del documento; el front los confirma,
 * (opcionalmente) crea el proveedor si no existe, y guarda + aprueba la factura.
 *
 * **Supuestos pendientes de confirmar con backend** (portados del legacy):
 *  - `POST general/documento/importar-zip-dian/` con `{ archivo_base64 }`.
 *  - `POST general/documento/nuevo/` para guardar y `.../aprobar/` para aprobar.
 *  - El shape de respuesta de abajo.
 */

/** Datos del contacto extraídos del ZIP. `existe` decide si hay que crearlo. */
export interface ImportarZipContacto {
  readonly numero_identificacion: string;
  readonly nombre_corto: string;
  readonly contacto_id: number;
  readonly existe: boolean;
  readonly ciudad: string;
  readonly ciudad_id: number;
  readonly correo: string;
  readonly direccion: string;
  readonly tipo_persona: number;
  readonly plazo_pago_id: string;
  readonly plazo_pago_proveedor_id: string;
}

/** Línea del documento extraída del ZIP (solo lectura, para el resumen). */
export interface ImportarZipDetalle {
  readonly item: string;
  readonly item_nombre: string;
  readonly cantidad: string;
  readonly precio_unitario: string;
  readonly valor_total: string;
}

/** Cabecera del documento extraída del ZIP. */
export interface ImportarZipDocumento {
  readonly numero: string;
  readonly prefijo: string;
  readonly cue: string;
  readonly fecha: string;
  readonly fecha_vence: string;
  readonly comentario: string;
  readonly detalles: readonly ImportarZipDetalle[];
}

/** Respuesta de `importar-zip-dian/`. */
export interface ImportarZipResponse {
  readonly contacto: ImportarZipContacto;
  readonly documento: ImportarZipDocumento;
}

/** Selección de defaults contables del paso de confirmación. */
export interface ImportarZipConfirmacion {
  readonly contactoId: number;
  readonly formaPagoId: number;
  readonly almacenId: number;
  readonly grupoContabilidadId: number;
  readonly plazoPagoId: number | null;
}

/**
 * Arma el payload de `general/documento/nuevo/` a partir de los datos del ZIP y
 * la confirmación del usuario. Réplica del legacy en **modo utilidad**: los
 * totales se calculan sumando `valor_total` de las líneas, pero `detalles` va
 * **vacío** (el backend reconstruye las líneas desde el documento electrónico).
 */
export function construirPayloadFactura(
  documento: ImportarZipDocumento,
  confirmacion: ImportarZipConfirmacion,
): Record<string, unknown> {
  const subtotal = documento.detalles.reduce(
    (sum, d) => sum + (Number.parseFloat(d.valor_total ?? '0') || 0),
    0,
  );
  const total = redondear(subtotal);

  return {
    empresa: 1,
    contacto: confirmacion.contactoId,
    fecha: documento.fecha,
    fecha_vence: documento.fecha_vence,
    forma_pago: confirmacion.formaPagoId,
    metodo_pago: 1,
    almacen: confirmacion.almacenId,
    grupo_contabilidad: confirmacion.grupoContabilidadId,
    plazo_pago: confirmacion.plazoPagoId,
    total,
    subtotal: total,
    total_bruto: total,
    base_impuesto: 0,
    impuesto: 0,
    impuesto_operado: 0,
    impuesto_retencion: 0,
    descuento: 0,
    pago: 0,
    comentario: documento.comentario?.substring(0, 500) || null,
    referencia_cue: documento.cue,
    referencia_numero: documento.numero,
    referencia_prefijo: documento.prefijo,
    documento_tipo: 5,
    detalles: [],
    pagos: [],
    detalles_eliminados: [],
    pagos_eliminados: [],
  };
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
