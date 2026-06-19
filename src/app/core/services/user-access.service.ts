import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { combineLatest, map, of, shareReplay, switchMap } from 'rxjs';

export type ScreenKey = 'overview' | 'construction' | 'workers' | 'humanResources' | 'companies' | 'settings';

export interface ScreenAccessMap {
  overview: boolean;
  construction: boolean;
  workers: boolean;
  humanResources: boolean;
  companies: boolean;
  settings: boolean;
  shop: boolean;
}

export interface UserAccessState {
  uid: string | null;
  email: string | null;
  role: string;
  isAdmin: boolean;
  screenAccess: ScreenAccessMap;
  source: 'admin' | 'screenAccess' | 'legacyPermissions' | 'fallback';
}

const EMPTY_ACCESS: ScreenAccessMap = {
  overview: false,
  construction: false,
  workers: false,
  humanResources: false,
  companies: false,
  settings: false,
  shop: false
};

const FULL_ACCESS: ScreenAccessMap = {
  overview: true,
  construction: true,
  workers: true,
  humanResources: true,
  companies: true,
  settings: true,
  shop: true
};

@Injectable({ providedIn: 'root' })
export class UserAccessService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  readonly access$ = this.authService.user$.pipe(
    switchMap((user) => {
      if (!user?.uid) {
        return of<UserAccessState>({
          uid: null,
          email: null,
          role: '',
          isAdmin: false,
          screenAccess: { ...EMPTY_ACCESS },
          source: 'fallback',
        });
      }

      return docData(doc(this.firestore, 'users', user.uid) as any, { idField: 'id' }).pipe(
        map((data: any) => this.buildAccessState(user.uid, user.email ?? null, data)),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly screenAccess$ = this.access$.pipe(map((x) => x.screenAccess));
  readonly isAdmin$ = this.access$.pipe(map((x) => x.isAdmin));

  canAccess$(screen: ScreenKey) {
    return this.screenAccess$.pipe(map((access) => !!access?.[screen]));
  }

  private buildAccessState(uid: string, email: string | null, data: any): UserAccessState {
    const roleStr = (data?.role ?? '').toString().trim().toLowerCase();
    const rolesArr: string[] = Array.isArray(data?.roles) ? data.roles : [];
    const rolesNorm = rolesArr.map((x: any) => (x ?? '').toString().trim().toLowerCase()).filter(Boolean);
    const isAdmin = roleStr === 'admin' || rolesNorm.includes('admin');

    if (isAdmin) {
      return {
        uid,
        email,
        role: roleStr || 'admin',
        isAdmin: true,
        screenAccess: { ...FULL_ACCESS },
        source: 'admin',
      };
    }

    const normalizedScreenAccess = this.normalizeScreenAccess(data?.screenAccess);
    if (normalizedScreenAccess) {
      return {
        uid,
        email,
        role: roleStr,
        isAdmin: false,
        screenAccess: normalizedScreenAccess,
        source: 'screenAccess',
      };
    }

    const normalizedLegacy = this.normalizeScreenAccess(data?.permissions);
    if (normalizedLegacy) {
      return {
        uid,
        email,
        role: roleStr,
        isAdmin: false,
        screenAccess: normalizedLegacy,
        source: 'legacyPermissions',
      };
    }

    // Current project fallback: if no explicit screenAccess exists yet, keep Overview + Construction enabled
    // so older user documents remain usable while the access system is rolled out.
    return {
      uid,
      email,
      role: roleStr,
      isAdmin: false,
      screenAccess: {
        ...EMPTY_ACCESS,
        overview: true,
        construction: true,
      },
      source: 'fallback',
    };
  }

  private normalizeScreenAccess(raw: any): ScreenAccessMap | null {
    if (!raw || typeof raw !== 'object') return null;

    const access: ScreenAccessMap = {
      overview: this.bool(raw.overview),
      construction: this.bool(raw.construction),
      workers: this.bool(raw.workers),
      humanResources: this.bool(raw.humanResources ?? raw.hr),
      companies: this.bool(raw.companies),
      settings: this.bool(raw.settings),
      shop: this.bool(raw.shop),
    };

    const hasAny = Object.values(access).some(Boolean);
    return hasAny ? access : null;
  }

  private bool(v: any): boolean {
    return v === true;
  }
}
