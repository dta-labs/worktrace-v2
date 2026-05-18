export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id?: string;

  projectNumber: string;
  name: string;
  description?: string;
  status: ProjectStatus;

  startDate?: number;
  dueDateEstimate?: number;
  startTime?: string;

  workerCount: number;
  budget: number;

  address: string;
  company?: string;

  responsible: {
    name: string;
    phone: string;
    email: string;
  };

  isArchived?: boolean;

  createdAt?: number;
  createdByUid?: string | null;
  createdByEmail?: string | null;

  updatedAt?: number;
  updatedByUid?: string | null;
  updatedByEmail?: string | null;

  archivedAt?: number;
  archivedByUid?: string | null;
  archivedByEmail?: string | null;

  drive?: {
    enabled?: boolean;
    rootFolderId?: string | null;
    projectFolderId?: string | null;
    projectFolderName?: string | null;
    projectFolderUrl?: string | null;
    templateUsed?: string[];
    path?: string | null;
    createdAt?: number;
    error?: string | null;
  };
}
