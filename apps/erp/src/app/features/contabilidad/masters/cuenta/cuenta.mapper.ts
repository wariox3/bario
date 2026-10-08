import type { Cuenta, CuentaPayload } from './cuenta.model';
import type { CuentaFormRawValue } from './pages/cuenta-form/cuenta-form.types';

/**
 * Adapta el read-model (`Cuenta`) a los valores del reactive form. Las FK de la
 * cascada se reagrupan en `{ id, nombre }` usando el companion `*_nombre`.
 */
export function cuentaToFormValue(c: Cuenta): Partial<CuentaFormRawValue> {
  return {
    codigo: c.codigo,
    nombre: c.nombre,
    cuenta_clase:
      c.cuenta_clase != null ? { id: c.cuenta_clase, nombre: c.cuenta_clase_nombre ?? '' } : null,
    cuenta_grupo:
      c.cuenta_grupo != null ? { id: c.cuenta_grupo, nombre: c.cuenta_grupo_nombre ?? '' } : null,
    cuenta_cuenta:
      c.cuenta_cuenta != null
        ? { id: c.cuenta_cuenta, nombre: c.cuenta_cuenta_nombre ?? '' }
        : null,
    exige_base: c.exige_base,
    exige_contacto: c.exige_contacto,
    exige_centro_costo: c.exige_centro_costo,
    permite_movimiento: c.permite_movimiento,
  };
}

/**
 * Construye el write-model (`CuentaPayload`) desde el valor crudo del form. Las
 * FK exponen solo su `id`; el código vacío se normaliza a `null`.
 */
export function formValueToPayload(v: CuentaFormRawValue): CuentaPayload {
  const codigo = v.codigo?.trim();
  return {
    codigo: codigo ? codigo : null,
    nombre: v.nombre ?? '',
    exige_base: v.exige_base ?? false,
    exige_contacto: v.exige_contacto ?? false,
    exige_centro_costo: v.exige_centro_costo ?? false,
    permite_movimiento: v.permite_movimiento ?? false,
    cuenta_clase: v.cuenta_clase?.id ?? null,
    cuenta_grupo: v.cuenta_grupo?.id ?? null,
    cuenta_cuenta: v.cuenta_cuenta?.id ?? null,
  };
}
