import { bootstrapApplication } from '@angular/platform-browser';
import { iniciarObservabilidad } from '@reddoc/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

iniciarObservabilidad({ app: 'cuenta', sentry: environment.sentry });

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
