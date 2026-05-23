import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { Subscription } from 'rxjs';
import { UserAccessService, ScreenAccessMap } from '../../core/services/user-access.service';

@Component({
    selector: 'app-dashboard',
    imports: [RouterModule, CommonModule, MatIconModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  userEmail: string | null = null;
  access: ScreenAccessMap = {
    overview: true,
    construction: true,
    workers: true,
    humanResources: true,
    companies: true,
    settings: true,
  };

  private sub?: Subscription;
  private accessSub?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private userAccessService: UserAccessService,
  ) {
    this.sub = this.authService.user$.subscribe(user => {
      this.userEmail = user?.email ?? null;
    });

    this.accessSub = this.userAccessService.screenAccess$.subscribe((access) => {
      this.access = access;
    });
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigateByUrl('/login');
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.accessSub?.unsubscribe();
  }
}
