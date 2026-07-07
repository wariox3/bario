import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { appRoutes } from './app.routes';
import { environment } from '../environments/environment';
import {
  APP_BRANDING,
  AUTH_DEFAULT_SKIP_URLS,
  ENVIRONMENT,
  ROUTE_PATHS_TOKEN,
  AUTH_SERVICE,
  AUTH_SKIP_URLS,
  ReddocPreset,
  REDDOC_PRIMENG_ES,
  authInterceptor,
  errorInterceptor,
  tenantInterceptor,
  provideI18n,
  TENANT_ROUTES,
  ENTITY_DATA_GATEWAY,
  HttpEntityDataGateway,
} from '@reddoc/core';
import { AuthService } from './features/auth/services/auth.service';
import { ROUTE_PATHS } from './core/constants/route-paths.constants';
import { dictionaries } from './i18n';

// Locale colombiano: habilita el formateo de moneda/número/fecha de las tablas
// y fichas ($ 120.600, punto de miles, sin decimales en moneda).
registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-CO' },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, tenantInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: ReddocPreset,
        options: {
          darkModeSelector: '.dark-mode',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng, utilities' },
        },
      },
      translation: REDDOC_PRIMENG_ES,
    }),
    MessageService,
    provideI18n(dictionaries),
    { provide: ENVIRONMENT, useValue: environment },
    {
      provide: ROUTE_PATHS_TOKEN,
      useValue: {
        auth: {
          login: ROUTE_PATHS.auth.login,
          register: ROUTE_PATHS.auth.register,
          forgotPassword: ROUTE_PATHS.auth.forgotPassword,
          resetPassword: ROUTE_PATHS.auth.resetPassword,
          resendVerification: ROUTE_PATHS.auth.resendVerification,
          verifyEmail: ROUTE_PATHS.auth.verifyEmail,
        },
        dashboard: { root: ROUTE_PATHS.contenedores.root },
      },
    },
    {
      provide: APP_BRANDING,
      useValue: { appName: 'Turnos', tagline: 'Gestión de turnos RedDoc.' },
    },
    { provide: AUTH_SERVICE, useExisting: AuthService },
    {
      provide: TENANT_ROUTES,
      useValue: {
        contenedoresRoot: ROUTE_PATHS.contenedores.root,
        login: ROUTE_PATHS.auth.login,
        tenantHome: (slug: string) => ROUTE_PATHS.tenant.home(slug),
      },
    },
    { provide: ENTITY_DATA_GATEWAY, useExisting: HttpEntityDataGateway },
    { provide: AUTH_SKIP_URLS, useValue: AUTH_DEFAULT_SKIP_URLS },
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return firstValueFrom(auth.me()).catch(() => null);
    }),
  ],
};
