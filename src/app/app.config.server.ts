import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    // Ensure animations don't try to access window during SSR
    provideNoopAnimations(),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
