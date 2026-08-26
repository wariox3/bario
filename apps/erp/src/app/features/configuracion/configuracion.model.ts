/**
 * Configuración de la empresa — un único registro por tenant.
 *
 * Las columnas usan prefijos por dominio funcional (`gen_*`, `hum_*`), que NO
 * coinciden 1:1 con las pestañas de la UI: la pestaña General edita los
 * `gen_empresa_*`; la pestaña Venta (futura) edita `gen_uvt` + los `hum_*`.
 *
 * Los montos pueden llegar del backend como string con cola de ceros
 * (`"120600.000000"`); se normalizan al consumirlos.
 *
 * **Las FKs van sin sufijo `_id`** (`gen_empresa_ciudad`, no `gen_empresa_ciudad_id`):
 * así las nombra el schema del contenedor, tanto al leer (`GenConfiguracion`) como
 * al escribir (`PatchedGenConfiguracionRequest`). Con el sufijo, DRF descarta el
 * campo en silencio: no lee ni guarda, y no hay error que lo delate.
 */
export interface ConfiguracionRead {
  readonly id: number;

  // Parámetros fiscales / nómina (pestaña Venta — futura)
  readonly gen_uvt: number | string | null;
  readonly hum_factor: number | string | null;
  readonly hum_salario_minimo: number | string | null;
  readonly hum_auxilio_transporte: number | string | null;
  readonly hum_entidad_riesgo: number | null;

  // Datos de la empresa (área Empresa)
  /** La expone la API; hoy ningún formulario del ERP la escribe. */
  readonly gen_empresa_nombre_corto: string | null;
  readonly gen_empresa_razon_social: string | null;
  readonly gen_empresa_tipo_persona: number | null;
  readonly gen_empresa_identificacion: number | null;
  readonly gen_empresa_numero_identificacion: string | null;
  readonly gen_empresa_digito_verificacion: string | null;
  readonly gen_empresa_direccion: string | null;
  readonly gen_empresa_ciudad: number | null;
  readonly gen_empresa_telefono: string | null;
  readonly gen_empresa_correo: string | null;
  readonly gen_empresa_imagen: string | null;
}

/** Nombre de columna pedible/persistible (todo menos el `id`). */
export type ConfiguracionCampo = keyof Omit<ConfiguracionRead, 'id'>;

/**
 * Payload de `actualizar`. Parcial: la API es field-scoped (lees y escribes solo
 * los campos que pasas), así que cada sección manda **solo sus campos** — no toca
 * los de otras secciones.
 */
export type ConfiguracionPayload = Partial<ConfiguracionRead>;
