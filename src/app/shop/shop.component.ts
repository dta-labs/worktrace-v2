import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
	styleUrls: ['./shop.styles.scss']
})
export class ShopComponent { }
