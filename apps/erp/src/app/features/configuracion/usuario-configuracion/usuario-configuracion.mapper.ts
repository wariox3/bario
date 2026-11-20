import type {
  ConfiguracionUsuarioPayload,
  ConfiguracionUsuarioRead,
  ErpSelectOption,
} from '@reddoc/core';

export interface UsuarioConfigFormValue {
  readonly sede: ErpSelectOption | null;
  readonly almacen: ErpSelectOption | null;
  readonly caja: ErpSelectOption | null;
}

/** La respuesta ya trae los `*_nombre`: el select se pinta sin esperar el catálogo. */
function option(id: number | null, nombre: string | null): ErpSelectOption | null {
  return id != null ? { id, nombre: nombre ?? '' } : null;
}

export function usuarioConfiguracionToForm(
  config: ConfiguracionUsuarioRead,
): UsuarioConfigFormValue {
  return {
    sede: option(config.sede, config.sede_nombre),
    almacen: option(config.almacen, config.almacen_nombre),
    caja: option(config.caja, config.caja_nombre),
  };
}

/** Se mandan los tres: uno vacío viaja como `null`, que es lo que lo quita. */
export function usuarioConfigFormToPayload(
  form: UsuarioConfigFormValue,
): ConfiguracionUsuarioPayload {
  return {
    sede: form.sede?.id ?? null,
    almacen: form.almacen?.id ?? null,
    caja: form.caja?.id ?? null,
  };
}
