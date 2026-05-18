import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-landing',
  imports: [CommonModule],
  templateUrl: './landing.component.html'
})
export class LandingComponent {
  isDark = false;
  year = new Date().getFullYear();
  isBrowser = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.isDark = localStorage.getItem('theme') === 'dark' ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      this.apply();
    }
  }

  toggleDark() {
    if (!this.isBrowser) return;
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.apply();
  }

  private apply() {
    if (!this.isBrowser) return;
    document.documentElement.classList.toggle('dark', this.isDark);
  }
}
