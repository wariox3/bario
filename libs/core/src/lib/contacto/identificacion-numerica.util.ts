import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { ErpSelectOption } from '../data/erp-select-data.service';

/**
 * Códigos DIAN (tabla 13.2.1 del anexo técnico) de los documentos cuyo número
 * es solo dígitos: registro civil, tarjeta de identidad, cédula de ciudadanía,
 * NIT y NUIP. Los de extranjeros admiten letras: tarjeta (21) y cédula (22) de
 * extranjería, pasaporte (41), documento extranjero (42), PEP (47), PPT (48) y
 * NIT de otro país (50). Un código que no esté aquí también admite letras.
 */
export const IDENTIFICACIONES_NUMERICAS: ReadonlySet<string> = new Set([
  '11',
  '12',
  '13',
  '31',
  '91',
]);

/**
 * ¿El número de este tipo de identificación es solo dígitos?
 *
 * Decide por el `codigo` DIAN de la fila del `seleccionar/`, nunca por el nombre
 * ni por el id del tenant. Sin `codigo` (fila vieja en caché, precarga por id)
 * responde `false`: ante la duda se deja escribir letras, porque borrarle letras a un pasaporte es peor que
 * no limpiar los espacios de una cédula pegada (el backend acepta ambos).
 */
export function esIdentificacionNumerica(identificacion: ErpSelectOption | null): boolean {
  const codigo = identificacion?.['codigo'];
  return typeof codigo === 'string' && IDENTIFICACIONES_NUMERICAS.has(codigo);
}

/**
 * Marca `{ soloDigitos: true }` si el tipo elegido es numérico y el número trae
 * otra cosa (p. ej. se pasó de pasaporte a cédula con letras ya escritas, o un
 * contacto viejo guardado con puntos). Se acompaña de `[libSoloDigitos]`, que
 * limpia al escribir; este validador cubre lo que ya estaba en el campo.
 */
export function soloDigitosSegunIdentificacionValidator(esNumerica: () => boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor: unknown = control.value;
    if (!esNumerica() || typeof valor !== 'string' || !/\D/.test(valor)) return null;
    return { soloDigitos: true };
  };
}
