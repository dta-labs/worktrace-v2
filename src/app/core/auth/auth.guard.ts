import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map, tap } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    map(user => !!user),
    tap(isLoggedIn => {
      if (!isLoggedIn) {
        router.navigate(['/login']);
      }
    })
  );
};
