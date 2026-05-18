import { Component, inject, OnInit } from '@angular/core';
import { ThemeService, ThemeMode } from '../../../../../core/theme/theme.service';

@Component({
  selector: 'app-appearance',
  templateUrl: './appearance.component.html',
  styleUrls: ['./appearance.component.scss']
})
export class AppearanceComponent implements OnInit {
  private readonly themeService = inject(ThemeService);

  selectedTheme: ThemeMode = 'dark';

  themes = [
    { id: 'dark' as ThemeMode, label: 'Dark', description: 'Balanced dark interface.' },
    { id: 'midnight' as ThemeMode, label: 'Midnight', description: 'Deep blue dark style.' },
    { id: 'light' as ThemeMode, label: 'Light', description: 'Clean bright workspace.' },
    { id: 'aurora' as ThemeMode, label: 'Aurora', description: 'Light theme with color accents.' }
  ];

  ngOnInit(): void {
    // Load current theme from service
    this.selectedTheme = this.themeService.current();
  }

  onThemeSelect(themeId: ThemeMode): void {
    this.selectedTheme = themeId;
    this.themeService.apply(themeId);
  }
}