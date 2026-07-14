import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseUsuario,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
} from './models/auth.model';

/**
 * Apps del monorepo alcanzables desde el app-switcher. Es el id estable de cada
 * app: se usa como clave de i18n, para excluir la app actual de su propia lista
 * (`CURRENT_APP`) y para resolver su URL en `ReddocEnvironment`.
 */
export type ReddocAppId = 'erp' | 'turnos';

export interface ReddocEnvironment {
  apiUrl: string;
  turnstileSiteKey: string;
  landingUrl?: string;
  cuentaUrl?: string;
  /** URLs de las apps hermanas. Ausente = esa app no se muestra en el switcher. */
  erpUrl?: string;
  turnosUrl?: string;
  wompiPublicKey?: string;
  /**
   * Origen al que Wompi va a devolver al usuario tras el checkout (`redirect-url`).
   * El WAF de Wompi rechaza `localhost`, entonces en dev hay que apuntar a un
   * dominio público HTTPS aceptado por el comercio. Si no está seteado, cae a
   * `window.location.origin`.
   */
  wompiRedirectOrigin?: string;
}

export interface RoutePaths {
  auth: {
    login: string;
    register: string;
    forgotPassword: string;
    resetPassword: string;
    resendVerification: string;
    verifyEmail: string;
  };
  dashboard: { root: string };
}

export interface AuthServiceContract {
  readonly currentUser: Signal<BaseUsuario | null>;
  isAuthenticated: () => boolean;
  refresh: () => Observable<unknown>;
  clearSession: () => void;
  login: (data: LoginRequest) => Observable<unknown>;
  register: (data: RegisterRequest) => Observable<RegisterResponse>;
  forgotPassword: (email: string, captchaToken?: string) => Observable<void>;
  resetPassword: (token: string, password: string, captchaToken?: string) => Observable<void>;
  resendVerification: (data: ResendVerificationRequest) => Observable<void>;
  verifyEmail: (token: string) => Observable<void>;
}

export interface AppBranding {
  appName: string;
  tagline?: string;
}

export const ENVIRONMENT = new InjectionToken<ReddocEnvironment>('ReddocEnvironment');
/** Id de la app en la que corre este bundle. Lo provee cada `app.config.ts`. */
export const CURRENT_APP = new InjectionToken<ReddocAppId>('CurrentApp');
export const ROUTE_PATHS_TOKEN = new InjectionToken<RoutePaths>('RoutePaths');
export const AUTH_SERVICE = new InjectionToken<AuthServiceContract>('AuthService');
export const AUTH_SKIP_URLS = new InjectionToken<string[]>('AuthSkipUrls');
export const APP_BRANDING = new InjectionToken<AppBranding>('AppBranding');
