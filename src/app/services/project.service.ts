// src/app/services/project.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
  CollectionReference,
  DocumentReference,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { Project } from '../models/project.model';

/** Remove undefined fields recursively to satisfy Firestore constraints */
function removeUndefinedDeep<T>(input: T): T {
  if (Array.isArray(input)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (input as any[]).map(removeUndefinedDeep) as unknown as T;
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = removeUndefinedDeep(v as never) as unknown;
    }
    return out as unknown as T;
  }
  return input;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  private async auditUser(): Promise<{ uid: string | null; email: string | null }> {
    // AngularFire currentUser can be Promise<User|null> in modular API
    const user = await this.auth.currentUser;
    return {
      uid: user?.uid ?? null,
      email: user?.email ?? null,
    };
  }

  /** Create a project document in /projects */
  async addProject(project: Project): Promise<DocumentReference<Project>> {
    const user = await this.auditUser();
    const col = collection(this.firestore, 'projects') as CollectionReference<Project>;

    const cleaned = removeUndefinedDeep({
      ...project,
      isArchived: false,
      createdAt: Date.now(),
      createdByUid: user.uid,
      createdByEmail: user.email,
    }) as Project;

    return addDoc(col, cleaned);
  }

  /** Update a project (audit: updatedAt / updatedBy*) */
  async updateProject(id: string, patch: Partial<Project>): Promise<void> {
    const user = await this.auditUser();
    const ref = doc(this.firestore, 'projects', id) as DocumentReference<Project>;
    const cleaned = removeUndefinedDeep({
      ...patch,
      updatedAt: Date.now(),
      updatedByUid: user.uid,
      updatedByEmail: user.email,
    }) as Partial<Project>;
    await updateDoc(ref, cleaned as any);
  }

  /** Archive (soft-delete) */
  async archiveProject(id: string): Promise<void> {
    const user = await this.auditUser();
    const ref = doc(this.firestore, 'projects', id) as DocumentReference<Project>;
    await updateDoc(ref as any, {
      status: 'cancelled',
      isArchived: true,
      archivedAt: Date.now(),
      archivedByUid: user.uid,
      archivedByEmail: user.email,
      updatedAt: Date.now(),
      updatedByUid: user.uid,
      updatedByEmail: user.email,
    } as any);
  }

  /** Restore from archive */
  async restoreProject(id: string): Promise<void> {
    const user = await this.auditUser();
    const ref = doc(this.firestore, 'projects', id) as DocumentReference<Project>;
    await updateDoc(ref as any, {
      status: 'planned',
      isArchived: false,
      updatedAt: Date.now(),
      updatedByUid: user.uid,
      updatedByEmail: user.email,
    } as any);
  }

  /** Get most recent projects (ordered by createdAt desc) */
  getRecentProjects(max: number = 10): Observable<Project[]> {
    const col = collection(this.firestore, 'projects') as CollectionReference<Project>;
    const q = query(col, orderBy('createdAt', 'desc'), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<Project[]>;
  }
}
