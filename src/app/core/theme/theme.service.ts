import { Injectable, inject, DOCUMENT } from '@angular/core';

export type ThemeMode = 'dark' | 'midnight' | 'light' | 'aurora';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  initFromStorage(): void {
    const saved = localStorage.getItem('wt-theme') as ThemeMode | null;

    if (saved) {
      this.apply(saved);
    } else {
      this.doc.body.removeAttribute('data-theme');
    }
  }

  apply(mode: ThemeMode): void {
    const body = this.doc.body;
    body.setAttribute('data-theme', mode);
    localStorage.setItem('wt-theme', mode);
  }

  current(): ThemeMode | 'system' {
    const attr = this.doc.body.getAttribute('data-theme');
    return (attr as ThemeMode) ?? 'system';
  }
}