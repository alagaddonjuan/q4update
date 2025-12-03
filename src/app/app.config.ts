import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Auth } from '../app/core/interceptors/auth';
import { ClientApiService } from './core/services/client-api';



import { routes } from './app.routes';
import { AuthService } from './core/services/auth';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        Auth,
        errorInterceptor
      ])
    ),
    AuthService,
    ClientApiService,

  ]
};
