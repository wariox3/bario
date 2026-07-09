import type { ReddocEnvironment } from '@reddoc/core';
import type { AppDict } from '../../i18n';

/**
 * Una app del monorepo alcanzable desde el switcher. El registro es la única
 * fuente: agregar una app = una entrada aquí + su bloque i18n
 * (`layout.appSwitcher.apps.<id>`) + su URL en los environments del ERP.
 *
 * `url` se resuelve contra `ENVIRONMENT`; si devuelve `undefined` (URL no
 * configurada para ese entorno) la app simplemente no se muestra — así el
 * rollout es progresivo sin tocar el componente.
 */
export interface SwitcherApp {
  readonly id: string;
  /** Clase PrimeIcon del glifo dentro del monograma navy. */
  readonly icon: string;
  readonly url: (env: ReddocEnvironment) => string | undefined;
  readonly name: (d: AppDict) => string;
  readonly description: (d: AppDict) => string;
}

export const SWITCHER_APPS: readonly SwitcherApp[] = [
  {
    id: 'turnos',
    icon: 'pi pi-clock',
    url: (env) => env.turnosUrl,
    name: (d) => d.layout.appSwitcher.apps.turnos.name,
    description: (d) => d.layout.appSwitcher.apps.turnos.description,
  },
];
