/**
 * Filtro del `general/contacto/seleccionar/` que deja fuera los contactos
 * inactivos: sin él, los selectores ofrecen también terceros dados de baja.
 * Lo aplican de base `lib-contacto-select`, `app-empleado-autocomplete` y la
 * búsqueda del consumidor final del POS, antes de los filtros del consumidor
 * (`{ ...CONTACTO_ACTIVO_PARAMS, ...extraParams(), search }`). Mismo criterio
 * que `RESOLUCION_ACTIVA_PARAMS`.
 */
export const CONTACTO_ACTIVO_PARAMS = { estado_inactivo: 'False' } as const;
