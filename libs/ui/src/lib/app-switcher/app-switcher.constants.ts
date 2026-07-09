import type { ReddocAppId, ReddocEnvironment } from '@reddoc/core';

/**
 * Catálogo de apps del monorepo alcanzables desde el switcher.
 *
 * `url` se resuelve contra `ENVIRONMENT`. Si devuelve `undefined` (esa app no
 * está configurada en el entorno de quien renderiza) la app no se muestra: el
 * rollout es progresivo sin tocar el componente. La app actual (`CURRENT_APP`)
 * siempre se excluye de su propia lista.
 *
 * Agregar una app = una entrada acá + su id en `ReddocAppId` + su bloque i18n
 * (el `Record` del dict lo exige) + su `<app>Url` en `ReddocEnvironment` y en
 * los environments de las apps que deban verla.
 */
export interface SwitcherApp {
  readonly id: ReddocAppId;
  /** Clase PrimeIcon del glifo dentro del monograma navy. */
  readonly icon: string;
  readonly url: (env: ReddocEnvironment) => string | undefined;
}

export const SWITCHER_APPS: readonly SwitcherApp[] = [
  { id: 'erp', icon: 'pi pi-building', url: (env) => env.erpUrl },
  { id: 'turnos', icon: 'pi pi-clock', url: (env) => env.turnosUrl },
];
