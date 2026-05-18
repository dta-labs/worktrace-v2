import { Component } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private auth: AuthService) {}

  login() {
    this.auth.login(this.email, this.password)
      .then((userCredential) => {
        console.log('Login successful', userCredential);
      })
      .catch((err: any) => {
        console.error('Login error', err);
      });
  }
}
