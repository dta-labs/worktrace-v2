import {Component, inject, OnInit} from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

import {ThemeService} from "src/app/core/theme/theme.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private themeService: ThemeService = inject(ThemeService)

    ngOnInit(): void {
        this.themeService.initFromStorage();
    }
}
