import { Injectable } from '@angular/core';
import { getApp } from 'firebase/app';
import { Functions, getFunctions, httpsCallable } from 'firebase/functions';

export interface ValidateDriveFolderResponse {
  success: boolean;
  id?: string;
  name?: string;
  url?: string;
  mimeType?: string;
  message?: string;
}

export interface CreateBidFolderRequest {
  rootFolderId: string;
  clientName: string;
  projectName: string;
  receivedAt: string | number;
  template?: string[];
}

export interface CreateBidFolderResponse {
  success: boolean;
  year?: string;
  yearFolderId?: string;
  clientFolderId?: string;
  projectFolderId?: string;
  message?: string;
}


export interface CreateProjectFolderRequest {
  rootFolderId?: string;
  projectNumber?: string;
  projectName: string;
  company?: string;
  template?: string[];
}

export interface CreateProjectFolderResponse {
  success: boolean;
  rootFolderId?: string;
  projectFolderId?: string;
  projectFolderName?: string;
  projectFolderUrl?: string;
  templateUsed?: string[];
  path?: string;
  message?: string;
}

export interface CreateWorkerFolderRequest {
  rootFolderId?: string;
  hrRootFolderId?: string;
  firstName: string;
  lastName: string;
  workerId?: string;
  humanResourcesFolderName?: string;
  workersFolderName?: string;
  workerFolderNamingMode?: 'last_first' | 'first_last' | 'last_only' | 'first_only';
  workerSubfolderTemplate?: string[];
}

export interface CreateWorkerFolderResponse {
  success: boolean;
  humanResourcesFolderId?: string;
  workersFolderId?: string;
  workerFolderId?: string;
  workerFolderName?: string;
  workerFolderUrl?: string;
  workerFolderPath?: string;
  message?: string;
  deployDebugVersion?: string;
}


export interface UploadWorkerDocumentToDriveRequest {
  workerFolderId: string;
  workerId?: string;
  documentType: string;
  documentLabel?: string;
  fileName: string;
  mimeType?: string;
  fileBase64: string;
}

export interface UploadWorkerDocumentToDriveResponse {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  webContentLink?: string;
  mimeType?: string;
  documentType?: string;
  documentLabel?: string;
  folderId?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class DriveFunctionsService {
  private readonly functions: Functions;

  constructor() {
    this.functions = getFunctions(getApp(), 'us-central1');
    console.log('[DriveFunctions] Firebase SDK callable client ready', {
      region: 'us-central1',
      appName: getApp().name,
    });
  }

  async validateDriveFolder(folderId: string): Promise<ValidateDriveFolderResponse> {
    const id = (folderId || '').trim();
    if (!id) {
      return { success: false, message: 'Folder ID is required.' };
    }

    console.log('[DriveFunctions] validateDriveFolder payload', { folderId: id });
    const fn = httpsCallable<{ folderId: string }, ValidateDriveFolderResponse>(
      this.functions,
      'validateDriveFolder'
    );
    const res = await fn({ folderId: id });
    console.log('[DriveFunctions] validateDriveFolder response', res?.data);
    return res.data as ValidateDriveFolderResponse;
  }

  async createBidFolder(payload: CreateBidFolderRequest): Promise<CreateBidFolderResponse> {
    console.log('[DriveFunctions] createBidFolder payload', payload);
    const fn = httpsCallable<CreateBidFolderRequest, CreateBidFolderResponse>(
      this.functions,
      'createBidFolder'
    );
    const res = await fn(payload);
    console.log('[DriveFunctions] createBidFolder response', res?.data);
    return res.data as CreateBidFolderResponse;
  }


  async createProjectFolder(payload: CreateProjectFolderRequest): Promise<CreateProjectFolderResponse> {
    console.log('[DriveFunctions] createProjectFolder payload', payload);
    const fn = httpsCallable<CreateProjectFolderRequest, CreateProjectFolderResponse>(
      this.functions,
      'createProjectFolder'
    );

    try {
      const res = await fn(payload);
      console.log('[DriveFunctions] createProjectFolder response', res?.data);
      return res.data as CreateProjectFolderResponse;
    } catch (error: any) {
      console.error('[DriveFunctions] createProjectFolder error', {
        code: error?.code || null,
        message: error?.message || null,
        details: error?.details || null,
        raw: error,
      });
      throw error;
    }
  }

  async createWorkerFolder(payload: CreateWorkerFolderRequest): Promise<CreateWorkerFolderResponse> {
    console.log('[DriveFunctions] createWorkerFolderV2 payload', payload);
    const fn = httpsCallable<CreateWorkerFolderRequest, CreateWorkerFolderResponse>(
      this.functions,
      'createWorkerFolderV2'
    );
    const res = await fn(payload);
    console.log('[DriveFunctions] createWorkerFolderV2 response', res?.data);
    return res.data as CreateWorkerFolderResponse;
  }


  /*async uploadWorkerDocumentToDrive(
    payload: UploadWorkerDocumentToDriveRequest
  ): Promise<UploadWorkerDocumentToDriveResponse> {
    console.log('[DriveFunctions] uploadWorkerDocumentToDrive payload', {
      workerFolderId: payload.workerFolderId,
      workerId: payload.workerId ?? null,
      documentType: payload.documentType,
      fileName: payload.fileName,
      mimeType: payload.mimeType ?? null,
      hasBase64: Boolean(payload.fileBase64),
    });

    const fn = httpsCallable<
      UploadWorkerDocumentToDriveRequest,
      UploadWorkerDocumentToDriveResponse
    >(this.functions, 'uploadWorkerDocumentToDrive');

    const res = await fn(payload);
    console.log('[DriveFunctions] uploadWorkerDocumentToDrive response', res?.data);
    return res.data as UploadWorkerDocumentToDriveResponse;
  }*/


}
