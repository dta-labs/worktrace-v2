import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc } from '@angular/fire/firestore';
import { getDoc } from 'firebase/firestore';

import { Project } from '../../../../models/project.model';
import { ProjectService } from '../../../../services/project.service';

@Component({
    selector: 'app-overview-page',
    imports: [CommonModule, FormsModule],
    templateUrl: './overview.component.html',
    styleUrl: './overview.component.scss'
})
export class OverviewPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // Tabs
  activeTab: 'linear' | 'archived' | 'calendar' | 'assign' | 'search' | 'ai' = 'linear';

  // Raw + filtered data
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  filteredArchivedProjects: Project[] = [];

  // Filters (Linear view)
  searchText = '';
  statusFilter: string = 'all'; // 'all' | 'active' | 'planned' | etc
  startFrom = ''; // yyyy-mm-dd
  startTo = '';   // yyyy-mm-dd

  // UI
  isLoading = true;
  isAdmin = false;

  openMenuId: string | undefined = undefined;

  // Confirm modal
  confirmOpen = false;
  confirmAction: 'archive' | 'restore' | null = null;
  confirmProject: Project | null = null;

  // Edit modal
  editOpen = false;
  editProjectId: string | null = null;
  editDraft: any = null;

  closeMenus(): void {
    this.openMenuId = undefined;
  }

  toggleCardMenu(id: string | undefined, ev?: Event): void {
    ev?.stopPropagation();
    if (!id) return;
    this.openMenuId = this.openMenuId === id ? undefined : id;
  }

  // Edit: Step 2 will wire the real editor.
  onEditProject(p: Project): void {
    this.closeMenus();
    if (!this.isAdmin) return;
    if (!p?.id) return;

    this.editOpen = true;
    this.editProjectId = p.id;

    this.editDraft = {
      projectNumber: (p as any).projectNumber ?? (p as any).poNumber ?? '',
      name: p.name ?? '',
      company: (p as any).company ?? '',
      address: (p as any).address ?? '',
      workerCount: (p as any).workerCount ?? 0,
      budget: (p as any).budget ?? 0,
      status: (p.status ?? 'planned'),
      startDateInput: this.toDateInput((p as any).startDate),
      dueDateInput: this.toDateInput((p as any).dueDateEstimate),
      startTime: (p as any).startTime ?? '',
      description: (p as any).description ?? '',
      responsibleName: (p as any).responsibleName ?? '',
      responsiblePhone: (p as any).responsiblePhone ?? '',
      responsibleEmail: (p as any).responsibleEmail ?? '',
    };
  }

  closeEdit(): void {
    this.editOpen = false;
    this.editProjectId = null;
    this.editDraft = null;
  }

  async saveEdit(): Promise<void> {
    if (!this.editProjectId || !this.editDraft) return;

    const patch: any = {
      name: (this.editDraft.name || '').trim(),
      company: (this.editDraft.company || '').trim(),
      address: (this.editDraft.address || '').trim(),
      workerCount: Number(this.editDraft.workerCount || 0),
      budget: Number(this.editDraft.budget || 0),
      status: (this.editDraft.status || 'planned'),
      startDate: this.fromDateInput(this.editDraft.startDateInput),
      dueDateEstimate: this.fromDateInput(this.editDraft.dueDateInput),
      startTime: (this.editDraft.startTime || '').trim(),
      description: (this.editDraft.description || '').trim(),
      responsibleName: (this.editDraft.responsibleName || '').trim(),
      responsiblePhone: (this.editDraft.responsiblePhone || '').trim(),
      responsibleEmail: (this.editDraft.responsibleEmail || '').trim(),
    };

    try {
      await this.projectService.updateProject(this.editProjectId, patch);
      this.closeEdit();
    } catch (err) {
      console.error(err);
      alert('❌ Save failed. Check console.');
    }
  }

  onArchiveProject(p: Project): void {
    this.closeMenus();
    if (!this.isAdmin) return;
    this.openConfirm('archive', p);
  }

  onRestoreProject(p: Project): void {
    this.closeMenus();
    if (!this.isAdmin) return;
    this.openConfirm('restore', p);
  }


  constructor(
    private readonly projectService: ProjectService,
    private readonly auth: Auth,
    private readonly firestore: Firestore
  ) {}

  ngOnInit(): void {
    this.loadAdmin();

    // Keep this lightweight: show most recent projects
    this.projectService
      .getRecentProjects(200)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects: Project[]) => {
          this.projects = projects ?? [];
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => {
          this.projects = [];
          this.filteredProjects = [];
          this.isLoading = false;
        },
      });
  }

  private async loadAdmin(): Promise<void> {
    try {
      const user = await this.auth.currentUser;
      if (!user) {
        this.isAdmin = false;
        return;
      }

      // Admin rule (UI): users/{uid} can store either:
      // - role: "admin" (string)
      // - roles: ["admin", ...] (array)
      const snap = await getDoc(doc(this.firestore, 'users', user.uid));
      if (!snap.exists()) {
        // If you haven't created /users/{uid} yet, keep it usable in dev.
        // Change to false if you want to fail-closed.
        this.isAdmin = true;
        return;
      }

      const data = snap.data() as any;
      const roleStr = (data?.role ?? '').toString().toLowerCase().trim();
      const rolesArr: string[] = Array.isArray(data?.roles) ? data.roles : [];
      const rolesNorm = rolesArr.map((r: any) => (r ?? '').toString().toLowerCase().trim());

      this.isAdmin = roleStr === 'admin' || rolesNorm.includes('admin');
    } catch {
      // Fail closed in production; for dev keep it usable
      this.isAdmin = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: OverviewPageComponent['activeTab']): void {
    this.activeTab = tab;
    this.closeMenus();
  }

  clearFilters(): void {
    this.searchText = '';
    this.statusFilter = 'all';
    this.startFrom = '';
    this.startTo = '';
    this.applyFilters();
  }

  applyFilters(): void {
    const q = (this.searchText || '').trim().toLowerCase();
    const status = (this.statusFilter || 'all').toLowerCase();

    const fromMs = this.startFrom ? new Date(this.startFrom + 'T00:00:00').getTime() : null;
    const toMs = this.startTo ? new Date(this.startTo + 'T23:59:59').getTime() : null;

    const active = (this.projects ?? []).filter((p) => !(p.isArchived ?? false));
    const archived = (this.projects ?? []).filter((p) => (p.isArchived ?? false));

    this.filteredProjects = active.filter((p) => {
      // status filter
      const pStatus = (p.status || '').toLowerCase();
      if (status !== 'all' && pStatus !== status) return false;

      // date filter (by startDate)
      const startMs = typeof p.startDate === 'number' ? p.startDate : null;
      if (fromMs !== null && startMs !== null && startMs < fromMs) return false;
      if (toMs !== null && startMs !== null && startMs > toMs) return false;

      // search filter
      if (!q) return true;
      const hay = [
        p.projectNumber,
        p.name,
        p.address,
        p.company,
        p.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });

    this.filteredArchivedProjects = archived.filter((p) => {
      const pStatus = (p.status || '').toLowerCase();
      if (status !== 'all' && pStatus !== status) return false;

      const startMs = typeof p.startDate === 'number' ? p.startDate : null;
      if (fromMs !== null && startMs !== null && startMs < fromMs) return false;
      if (toMs !== null && startMs !== null && startMs > toMs) return false;

      if (!q) return true;
      const hay = [p.projectNumber, p.name, p.address, p.company, p.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  private toDateInput(ms?: number | null): string {
    if (!ms || typeof ms !== 'number') return '';
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private fromDateInput(val: string): number | undefined {
    if (!val) return undefined;
    const d = new Date(val + 'T00:00:00');
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }

  formatDate(ms?: number): string {
    if (!ms || typeof ms !== 'number') return '';
    const d = new Date(ms);
    // Use local format, keep it short
    return d.toLocaleDateString();
  }

  trackById = (_: number, p: Project) => p.id;

  private openConfirm(action: 'archive' | 'restore', p: Project): void {
    this.confirmOpen = true;
    this.confirmAction = action;
    this.confirmProject = p;
  }

  cancelConfirm(): void {
    this.confirmOpen = false;
    this.confirmAction = null;
    this.confirmProject = null;
  }

  async confirm(): Promise<void> {
    const p = this.confirmProject;
    const action = this.confirmAction;
    this.cancelConfirm();
    if (!p?.id || !action) return;

    try {
      if (action === 'archive') {
        await this.projectService.archiveProject(p.id);
      }
      if (action === 'restore') {
        await this.projectService.restoreProject(p.id);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Action failed. Check console.');
    }
  }
}
