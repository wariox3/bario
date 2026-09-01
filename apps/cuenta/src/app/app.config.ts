import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
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
  provideI18n,
} from '@reddoc/core';
import { authEs, authEn, phoneInputEs, phoneInputEn } from '@reddoc/ui';
import { AuthService } from './features/auth/services/auth.service';
import { ROUTE_PATHS } from './core/constants/route-paths.constants';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
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
    provideI18n({
      es: { auth: authEs, phoneInput: phoneInputEs },
      en: { auth: authEn, phoneInput: phoneInputEn },
    }),
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
        dashboard: { root: ROUTE_PATHS.perfil.root },
      },
    },
    {
      provide: APP_BRANDING,
      useValue: { appName: 'Cuenta', tagline: 'Gestiona tu cuenta y perfil.' },
    },
    { provide: AUTH_SERVICE, useExisting: AuthService },
    {
      provide: AUTH_SKIP_URLS,
      useValue: AUTH_DEFAULT_SKIP_URLS,
    },
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return firstValueFrom(auth.me()).catch(() => null);
    }),
  ],
};
