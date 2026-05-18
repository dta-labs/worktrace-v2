import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { UserAccessService, ScreenKey } from '../services/user-access.service';

export const screenAccessGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const access = inject(UserAccessService);
  const screen = (route.data?.['screen'] ?? '') as ScreenKey;

  return access.access$.pipe(
    take(1),
    map((state) => {
      if (!screen) return true;
      if (state.isAdmin) return true;
      if (state.screenAccess?.[screen]) return true;
      return router.createUrlTree(['/dashboard/overview']);
    }),
  );
};
