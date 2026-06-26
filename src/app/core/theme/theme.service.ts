import { Injectable, inject, DOCUMENT } from '@angular/core';


export type ThemeMode = 'dark' | 'midnight' | 'light' | 'aurora';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  initFromStorage(): void {
    const saved = (localStorage.getItem('wt-theme') as ThemeMode | null);
    const mode: ThemeMode = saved ?? 'dark';
    this.apply(mode);
  }

  toggle(): ThemeMode {
    const isLight = this.doc.body.classList.contains('light-theme');
    const next: ThemeMode = isLight ? 'dark' : 'light';
    this.apply(next);
    return next;
  }

  apply(mode: ThemeMode): void {
    const body = this.doc.body;
    body.setAttribute('data-theme', mode);
    localStorage.setItem('wt-theme', mode);
  }

  current(): ThemeMode {
    return this.doc.body.getAttribute('data-theme') as ThemeMode;
  }
}
