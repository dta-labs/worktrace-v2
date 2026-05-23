import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc } from '@angular/fire/firestore';
import { getDoc } from 'firebase/firestore';

@Component({
    selector: 'app-construction-page',
    imports: [CommonModule, RouterModule, MatTabsModule, MatIconModule],
    templateUrl: './construction.component.html',
    styleUrls: ['./construction.component.scss']
})
export class ConstructionPageComponent implements OnInit {
  isAdmin = false;

  constructor(private readonly auth: Auth, private readonly firestore: Firestore) {}

  ngOnInit(): void {
    void this.loadAdmin();
  }

  private async loadAdmin(): Promise<void> {
    try {
      const user = await this.auth.currentUser;
      if (!user) {
        this.isAdmin = false;
        return;
      }

      const snap = await getDoc(doc(this.firestore, 'users', user.uid));
      if (!snap.exists()) {
        // Dev-friendly default (same pattern as Overview)
        this.isAdmin = true;
        return;
      }

      const data = snap.data() as any;
      const roleStr = (data?.role ?? '').toString().toLowerCase().trim();
      const rolesArr: string[] = Array.isArray(data?.roles) ? data.roles : [];
      const rolesNorm = rolesArr.map((r: any) => (r ?? '').toString().toLowerCase().trim());

      this.isAdmin = roleStr === 'admin' || rolesNorm.includes('admin');
    } catch {
      // Dev-friendly default
      this.isAdmin = true;
    }
  }
}

