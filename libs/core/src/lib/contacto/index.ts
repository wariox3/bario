export { TIPO_PERSONA } from './tipo-persona';
export { calcularDigitoVerificacion } from './digito-verificacion.util';
export { construirNombreCorto } from './nombre-corto.util';
export {
  IDENTIFICACIONES_NUMERICAS,
  esIdentificacionNumerica,
  soloDigitosSegunIdentificacionValidator,
} from './identificacion-numerica.util';
export type { NombresInput } from './nombre-corto.util';
export { numeroIdentificacionUnicoValidator } from './numero-identificacion-unico.validator';
export type {
  NumeroIdentificacionSnapshot,
  ValidarIdentificacion,
} from './numero-identificacion-unico.validator';
export { ConsultaDianService, datosDeConsultaDian } from './consulta-dian.service';
export type {
  ConsultaDianRequest,
  ConsultaDianResponse,
  DatosConsultaDian,
} from './consulta-dian.service';
