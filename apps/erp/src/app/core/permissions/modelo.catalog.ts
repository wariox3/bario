/**
 * Catálogo de **modelos del backend** (`gen_modelo`), agrupados por app.
 *
 * Es el vocabulario con el que el backend concede permisos: cada modelo tiene un
 * id estable y `GET /general/modelo/<id>/permiso/` responde qué puede hacer el
 * usuario sobre él. Los ids son datos sembrados —un enum del dominio del
 * backend—, por eso viven acá y no se descubren en runtime: traerlos costaría un
 * round trip para terminar hardcodeando igual un identificador, solo que string.
 *
 * **Este archivo es un espejo.** Mantener la forma agrupada por app y ordenada
 * por id hace que diffear contra un dump nuevo del backend sea trivial.
 *
 * Las claves van en camelCase y se namespacean por app porque hay nombres que se
 * repiten entre ellas (`periodo` está en contabilidad y en humano, `programacion`
 * en turno y en humano).
 *
 * ⚠️ **Lo que todavía no está**: los documentos transaccionales comparten un
 * único modelo (`general.documento`), así que factura de venta, nómina y asiento
 * contable caerían en el mismo permiso. Hasta que el backend discrimine por
 * `documento_tipo_id`, los documentos **no** declaran modelo y quedan abiertos.
 * Tampoco existen todavía los modelos de inventario, venta y compra.
 */
export const MODELO = {
  general: {
    contacto: 10001,
    documento: 10002,
    responsabilidad: 10003,
    item: 10004,
    documentoDetalle: 10005,
    pais: 10006,
    estado: 10007,
    ciudad: 10008,
    tipoPersona: 10009,
    identificacion: 10010,
    plazoPago: 10011,
    cuentaBancoTipo: 10012,
    cuentaBancoClase: 10013,
    banco: 10014,
    documentoClase: 10015,
    documentoTipo: 10016,
    sector: 10017,
    modalidad: 10018,
    impuestoTipo: 10019,
    impuesto: 10020,
    asesor: 10021,
    cuentaBanco: 10022,
    precio: 10023,
    resolucion: 10024,
    festivo: 10025,
    metodoPago: 10026,
    sede: 10027,
    formaPago: 10028,
  },
  contabilidad: {
    comprobante: 20001,
    cuenta: 20002,
    cuentaClase: 20003,
    cuentaGrupo: 20004,
    cuentaCuenta: 20005,
    cuentaSubcuenta: 20006,
    centroCosto: 20007,
    activoGrupo: 20008,
    metodoDepreciacion: 20009,
    periodo: 20010,
    activo: 20011,
    movimiento: 20012,
    conciliacion: 20013,
    conciliacionDetalle: 20014,
    conciliacionSoporte: 20015,
  },
  turno: {
    programador: 30001,
    puesto: 30002,
    turno: 30003,
    secuencia: 30004,
    programacion: 30005,
  },
  humano: {
    conceptoTipo: 40001,
    contratoTipo: 40002,
    motivoTerminacion: 40003,
    pagoTipo: 40004,
    periodo: 40005,
    riesgo: 40006,
    tiempo: 40007,
    tipoCosto: 40008,
    tipoCotizante: 40009,
    subtipoCotizante: 40010,
    entidad: 40011,
    concepto: 40012,
    cargo: 40013,
    sucursal: 40014,
    grupo: 40015,
    salud: 40016,
    pension: 40017,
    conceptoNomina: 40018,
    novedadTipo: 40019,
    configuracionAporte: 40020,
    configuracionProvision: 40021,
    conceptoCuenta: 40022,
    contrato: 40023,
    programacion: 40024,
    credito: 40025,
    adicional: 40026,
    novedad: 40027,
    aporte: 40028,
    liquidacion: 40029,
    programacionDetalle: 40030,
    aporteContrato: 40031,
    aporteDetalle: 40032,
    aporteEntidad: 40033,
    liquidacionAdicional: 40034,
  },
} as const;

/**
 * Apps del backend que tienen permisos, en el orden en que se pintan las pills
 * del picker de `/seguridad/permiso/`.
 *
 * **No sale de `Object.keys(MODELO)`**, aunque se le parezca: son dos
 * vocabularios distintos. `MODELO` espeja *ids de modelo*; la pill solo necesita
 * el *nombre de app* con el que se arma el `?app=`. Atarlos hacía que un espejo
 * de ids incompleto escondiera apps enteras del filtro, sin forma de llegar a
 * ellas (el autodescubrimiento del panel solo alcanza a ver la página visible
 * del catálogo). Separados, el espejo de ids crece a su ritmo sin tapar nada.
 *
 * Solo las apps que el backend tiene sembradas y que se usan: el resto de los
 * módulos del ERP (venta, compra, tesorería, cartera) no aporta permisos hoy y
 * su pill saldría vacía.
 */
export const PERMISO_APPS: readonly string[] = [
  'general',
  'contabilidad',
  'turno',
  'humano',
  'inventario',
] as const;

type Values<T> = T[keyof T];

/**
 * Id de un modelo del catálogo. Es la unión de los ids concretos, no `number`:
 * así un id inventado no compila.
 */
export type ModeloId = Values<{ [App in keyof typeof MODELO]: Values<(typeof MODELO)[App]> }>;
