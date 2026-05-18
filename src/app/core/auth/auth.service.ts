import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, User } from '@angular/fire/auth';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { authState } from 'rxfire/auth';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _loading$ = new BehaviorSubject<boolean>(false);
  loading$ = this._loading$.asObservable();
  user$ = authState(this.auth);

  constructor(private auth: Auth) {}

  login(email: string, password: string): Observable<User> {
    this._loading$.next(true);
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      map(cred => {
        this._loading$.next(false);
        return cred.user;
      })
    );
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }
}