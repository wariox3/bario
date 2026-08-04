/**
 * Entrada del menú lateral de Seguridad.
 *
 * Es el mismo contrato declarativo que usan los módulos del ERP en su
 * `ErpModuleDescriptor.menu`, reducido a lo que esta pantalla necesita: sumar
 * una sección es agregar una entrada acá y su ruta hija en `SEGURIDAD_ROUTES`.
 */
export interface SeguridadMenuItem {
  /** Id estable de la sección; coincide con el segmento de ruta. */
  readonly id: string;
  /** Clave i18n con notación de punto contra el `AppDict`. */
  readonly labelKey: string;
  /** Clase del ícono PrimeIcons. */
  readonly iconClass: string;
  /** Path relativo a `/t/:slug/seguridad`. */
  readonly path: string;
}
