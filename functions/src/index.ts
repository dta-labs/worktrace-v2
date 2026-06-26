import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { Readable } from 'stream';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { environment } from './environment';

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'];
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const DEFAULT_HR_FOLDER_NAME = '07-HUMAN RESOURCES';
const DEFAULT_WORKERS_FOLDER_NAME = 'WORKERS';
const DEFAULT_WORKER_SUBFOLDERS = ['FOTO', 'DOCUMENTOS'];

type WorkerFolderNamingMode =
  | 'last_first'
  | 'first_last'
  | 'last_only'
  | 'first_only';

if (!getApps().length) {
  initializeApp();
}

function sanitizeName(name: string): string {
  return (name || '').replace(/[<>:"/\\|?*]+/g, '').trim();
}

function sanitizeFolderTemplate(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const items = input
    .map((value) => sanitizeName(String(value || '')).toUpperCase())
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  return items;
}

function normalizeNamingMode(input: unknown): WorkerFolderNamingMode {
  const value = String(input || '').trim().toLowerCase();
  switch (value) {
    case 'first_last':
    case 'last_only':
    case 'first_only':
    case 'last_first':
      return value;
    default:
      return 'last_first';
  }
}

function buildWorkerFolderName(
  firstName: string,
  lastName: string,
  namingMode: WorkerFolderNamingMode,
  explicitName?: string
): string {
  const custom = sanitizeName(explicitName || '');
  if (custom) return custom.toUpperCase();

  switch (namingMode) {
    case 'first_last':
      return sanitizeName(`${firstName} ${lastName}`).toUpperCase();
    case 'last_only':
      return sanitizeName(lastName).toUpperCase();
    case 'first_only':
      return sanitizeName(firstName).toUpperCase();
    case 'last_first':
    default:
      return sanitizeName(`${lastName} ${firstName}`).toUpperCase();
  }
}

async function getDrive() {
  const { google } = await import('googleapis');

  const auth = new google.auth.GoogleAuth({
    scopes: DRIVE_SCOPES,
  });

  return google.drive({
    version: 'v3',
    auth,
  });
}

async function findOrCreateFolder(
  drive: any,
  parentId: string,
  name: string
): Promise<string> {
  const clean = sanitizeName(name);
  const safeName = clean.replace(/'/g, "\\'");

  const res = await drive.files.list({
    q: `'${parentId}' in parents and name='${safeName}' and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = res.data.files?.[0];
  if (existing?.id) return existing.id;

  const create = await drive.files.create({
    requestBody: {
      name: clean,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  if (!create.data.id) {
    throw new Error(`Could not create folder: ${clean}`);
  }

  return create.data.id;
}


async function getFolderName(
  drive: any,
  folderId: string
): Promise<string> {
  const meta = await drive.files.get({
    fileId: folderId,
    fields: 'id,name',
    supportsAllDrives: true,
  });
  return sanitizeName(String(meta.data?.name || ''));
}

async function resolveHrFolderId(
  drive: any,
  rootFolderId: string,
  humanResourcesFolderName: string
): Promise<string> {
  const rootFolderName = (await getFolderName(drive, rootFolderId)).toUpperCase();
  const expectedHrName = sanitizeName(humanResourcesFolderName).toUpperCase();

  if (rootFolderName && expectedHrName && rootFolderName === expectedHrName) {
    return rootFolderId;
  }

  return findOrCreateFolder(drive, rootFolderId, humanResourcesFolderName);
}

function serializeError(e: any) {
  return {
    message: e?.message || 'Unknown error',
    stack: e?.stack || null,
    code: e?.code || null,
    details: e?.response?.data || null,
  };
}

async function readHrDriveSettings() {
  const db = getFirestore(environment.database);
  const driveSnap = await db.doc('settings/drive').get();
  const hrSnap = await db.doc('settings/hr').get();
  const driveData = driveSnap.exists ? driveSnap.data() || {} : {};
  const hrData = hrSnap.exists ? hrSnap.data() || {} : {};

  const rootFolderId = sanitizeName(
    String(
      driveData.rootFolderId ||
      driveData.hrRootFolderId ||
      hrData.rootFolderId ||
      hrData.hrRootFolderId ||
      ''
    )
  );

  const humanResourcesFolderName =
    sanitizeName(String(driveData.humanResourcesFolderName || hrData.humanResourcesFolderName || DEFAULT_HR_FOLDER_NAME)) ||
    DEFAULT_HR_FOLDER_NAME;

  const workersFolderName =
    sanitizeName(String(driveData.workersFolderName || hrData.workersFolderName || DEFAULT_WORKERS_FOLDER_NAME)) ||
    DEFAULT_WORKERS_FOLDER_NAME;

  const namingMode = normalizeNamingMode(
    hrData.workerFolderNamingMode || driveData.workerFolderNamingMode || 'last_first'
  );

  const workerSubfolderTemplate = sanitizeFolderTemplate(
    hrData.workerSubfolders || hrData.workerSubfolderTemplate || driveData.workerSubfolderTemplate || DEFAULT_WORKER_SUBFOLDERS
  );

  return {
    rootFolderId,
    humanResourcesFolderName,
    workersFolderName,
    namingMode,
    workerSubfolderTemplate: workerSubfolderTemplate.length ? workerSubfolderTemplate : DEFAULT_WORKER_SUBFOLDERS,
  };
}


async function readProjectDriveSettings() {
  const db = getFirestore(environment.database);
  const bidsSnap = await db.doc('settings/bids').get();
  const driveSnap = await db.doc('settings/drive').get();

  const bidsData = bidsSnap.exists ? bidsSnap.data() || {} : {};
  const driveData = driveSnap.exists ? driveSnap.data() || {} : {};

  const rootFolderId = sanitizeName(
    String(
      bidsData.rootFolderId ||
      driveData.projectsRootFolderId ||
      driveData.rootFolderId ||
      ''
    )
  );

  const template = sanitizeFolderTemplate(
    bidsData.subfolderTemplate ||
    driveData.projectSubfolderTemplate ||
    driveData.subfolderTemplate ||
    []
  );

  return {
    rootFolderId,
    template,
  };
}

function resolveDocumentSubfolder(documentType: string, requestedSubfolder?: string) {
  const requested = sanitizeName(String(requestedSubfolder || '')).toUpperCase();
  if (requested) return requested;
  const normalized = String(documentType || '').trim().toLowerCase();
  if (['photo', 'passport-photo', 'profile-photo', 'worker-photo', 'foto'].includes(normalized)) {
    return 'FOTO';
  }
  return 'DOCUMENTOS';
}

export const createWorkerFolderV2 = onCall(
  {
    region: 'us-central1',
    serviceAccount: 'worktrace-drive@worktrace-9a501.iam.gserviceaccount.com',
  },
  async (request) => {
    const firstName = sanitizeName(request.data?.firstName || '');
    const lastName = sanitizeName(request.data?.lastName || '');

    if (!firstName || !lastName) {
      throw new HttpsError('invalid-argument', 'firstName and lastName are required');
    }

    try {
      const settings = await readHrDriveSettings();
      const payloadRootFolderId = sanitizeName(
        String(request.data?.hrRootFolderId || request.data?.rootFolderId || '')
      );
      const rootFolderId = settings.rootFolderId || payloadRootFolderId;
      const humanResourcesFolderName = settings.humanResourcesFolderName;
      const workersFolderName = settings.workersFolderName;
      const namingMode = settings.namingMode;
      const workerFolderName = buildWorkerFolderName(
        firstName,
        lastName,
        namingMode,
        request.data?.workerFolderName
      );
      const workerSubfolderTemplate = settings.workerSubfolderTemplate;

      if (!rootFolderId) {
        throw new HttpsError('failed-precondition', 'HR rootFolderId is not configured in settings/drive');
      }

      logger.info('createWorkerFolderV2 start', {
        rootFolderId,
        payloadRootFolderId: payloadRootFolderId || null,
        usingSettingsRoot: Boolean(settings.rootFolderId),
        humanResourcesFolderName,
        workersFolderName,
        workerFolderName,
      });

      const drive = await getDrive();
      const hrFolderId = await resolveHrFolderId(drive, rootFolderId, humanResourcesFolderName);
      const workersFolderId = await findOrCreateFolder(drive, hrFolderId, workersFolderName);
      const workerFolderId = await findOrCreateFolder(drive, workersFolderId, workerFolderName);

      const createdSubfolders: Array<{ name: string; id: string }> = [];
      for (const subfolderName of workerSubfolderTemplate) {
        const subfolderId = await findOrCreateFolder(drive, workerFolderId, subfolderName);
        createdSubfolders.push({ name: subfolderName, id: subfolderId });
      }

      const folderMeta = await drive.files.get({
        fileId: workerFolderId,
        fields: 'id, name, webViewLink',
        supportsAllDrives: true,
      });

      logger.info('createWorkerFolderV2 success', {
        rootFolderId,
        hrFolderId,
        workersFolderId,
        workerFolderId,
        subfolders: createdSubfolders.map((x) => x.name),
      });

      return {
        success: true,
        rootFolderId,
        payloadRootFolderId: payloadRootFolderId || null,
        usedSettingsRootFolderId: settings.rootFolderId || null,
        humanResourcesFolderId: hrFolderId,
        humanResourcesFolderName,
        workersFolderId,
        workersFolderName,
        workerFolderId,
        workerFolderName,
        workerFolderUrl: folderMeta.data.webViewLink || null,
        workerFolderNamingMode: namingMode,
        workerSubfolders: createdSubfolders,
        path: `${humanResourcesFolderName}/${workersFolderName}/${workerFolderName}`,
      };
    } catch (e: any) {
      const serialized = serializeError(e);
      logger.error('createWorkerFolderV2 failed', serialized);
      throw new HttpsError('internal', serialized.message, {
        functionName: 'createWorkerFolderV2',
        ...serialized,
      });
    }
  }
);

export const uploadWorkerDocumentToDrive = onCall(
  {
    region: 'us-central1',
    serviceAccount: 'worktrace-drive@worktrace-9a501.iam.gserviceaccount.com',
  },
  async (request) => {
    const workerFolderId = ((request.data?.workerFolderId as string) || '').trim();
    const fileName = sanitizeName(request.data?.fileName || '');
    const fileBase64 = ((request.data?.fileBase64 as string) || '').trim();
    const mimeType = ((request.data?.mimeType as string) || 'application/octet-stream').trim();
    const documentType = sanitizeName(request.data?.documentType || 'document');
    const documentLabel = sanitizeName(request.data?.documentLabel || '');
    const requestedSubfolder = sanitizeName(request.data?.subfolderName || request.data?.targetSubfolder || '');

    if (!workerFolderId || !fileName || !fileBase64) {
      throw new HttpsError('invalid-argument', 'workerFolderId, fileName and fileBase64 are required');
    }

    try {
      const drive = await getDrive();
      const subfolderName = resolveDocumentSubfolder(documentType, requestedSubfolder);
      const targetFolderId = await findOrCreateFolder(drive, workerFolderId, subfolderName);
      const bytes = Buffer.from(fileBase64, 'base64');
      const body = Readable.from(bytes);

      const created = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [targetFolderId],
        },
        media: {
          mimeType,
          body,
        },
        fields: 'id, name, webViewLink, iconLink, mimeType, size',
        supportsAllDrives: true,
      });

      const fileId = created.data.id;
      if (!fileId) {
        throw new Error('Drive returned no file id');
      }

      logger.info('uploadWorkerDocumentToDrive success', {
        workerFolderId,
        targetFolderId,
        subfolderName,
        fileId,
        fileName,
      });

      return {
        success: true,
        documentType,
        documentLabel: documentLabel || null,
        driveFileId: fileId,
        driveFileName: created.data.name || fileName,
        driveMimeType: created.data.mimeType || mimeType,
        driveWebViewLink: created.data.webViewLink || null,
        driveIconLink: created.data.iconLink || null,
        driveSize: created.data.size || null,
        workerFolderId,
        targetFolderId,
        targetSubfolderName: subfolderName,
      };
    } catch (e: any) {
      const serialized = serializeError(e);
      logger.error('uploadWorkerDocumentToDrive failed', {
        workerFolderId,
        fileName,
        documentType,
        requestedSubfolder: requestedSubfolder || null,
        ...serialized,
      });
      throw new HttpsError('internal', serialized.message, {
        functionName: 'uploadWorkerDocumentToDrive',
        workerFolderId,
        fileName,
        documentType,
        requestedSubfolder: requestedSubfolder || null,
        ...serialized,
      });
    }
  }
);

export const createProjectFolder = onCall(
  {
    region: 'us-central1',
    serviceAccount: 'worktrace-drive@worktrace-9a501.iam.gserviceaccount.com',
  },
  async (request) => {
    const projectName = sanitizeName(String(request.data?.projectName || ''));
    const projectNumber = sanitizeName(String(request.data?.projectNumber || ''));
    const company = sanitizeName(String(request.data?.company || ''));
    const payloadRootFolderId = sanitizeName(String(request.data?.rootFolderId || ''));
    const payloadTemplate = sanitizeFolderTemplate(request.data?.template || []);

    if (!projectName) {
      throw new HttpsError('invalid-argument', 'projectName is required');
    }

    try {
      const settings = await readProjectDriveSettings();
      const rootFolderId = payloadRootFolderId || settings.rootFolderId;
      const template = payloadTemplate.length ? payloadTemplate : settings.template;

      if (!rootFolderId) {
        throw new HttpsError(
          'failed-precondition',
          'Projects rootFolderId is not configured in settings/bids.'
        );
      }

      const folderParts = [projectNumber, projectName].filter(Boolean);
      const projectFolderName = sanitizeName(folderParts.join(' - ') || projectName).toUpperCase();

      logger.info('createProjectFolder start', {
        rootFolderId,
        projectNumber: projectNumber || null,
        projectName,
        company: company || null,
        templateCount: template.length,
      });

      const drive = await getDrive();
      const projectFolderId = await findOrCreateFolder(drive, rootFolderId, projectFolderName);

      const createdSubfolders: Array<{ name: string; id: string }> = [];
      for (const subfolderName of template) {
        const subfolderId = await findOrCreateFolder(drive, projectFolderId, subfolderName);
        createdSubfolders.push({ name: subfolderName, id: subfolderId });
      }

      const folderMeta = await drive.files.get({
        fileId: projectFolderId,
        fields: 'id,name,webViewLink',
        supportsAllDrives: true,
      });

      logger.info('createProjectFolder success', {
        rootFolderId,
        projectFolderId,
        projectFolderName,
        subfolders: createdSubfolders.map((item) => item.name),
      });

      return {
        success: true,
        rootFolderId,
        projectFolderId,
        projectFolderName,
        projectFolderUrl: folderMeta.data.webViewLink || null,
        templateUsed: template,
        path: projectFolderName,
      };
    } catch (e: any) {
      const serialized = serializeError(e);
      logger.error('createProjectFolder failed', serialized);
      throw new HttpsError('internal', serialized.message, {
        functionName: 'createProjectFolder',
        ...serialized,
      });
    }
  }
);

export const validateDriveFolder = onCall(async (request) => {
  const folderId = (request.data?.folderId as string | undefined)?.trim();
  if (!folderId) throw new HttpsError('invalid-argument', 'folderId is required');

  try {
    const drive = await getDrive();
    const folder = await drive.files.get({
      fileId: folderId,
      fields: 'id,name,mimeType,webViewLink',
      supportsAllDrives: true,
    });

    if (folder.data.mimeType !== FOLDER_MIME) {
      throw new HttpsError('invalid-argument', 'Provided ID is not a folder');
    }

    return {
      success: true,
      id: folder.data.id,
      name: folder.data.name,
      mimeType: folder.data.mimeType,
      url: folder.data.webViewLink ?? undefined,
    };
  } catch (e) {
    return { success: false, message: 'Folder not found or no access.' };
  }
});

export const createBidFolder = onCall(async (request) => {
  const rootFolderId = (request.data?.rootFolderId as string | undefined)?.trim();
  const clientName = (request.data?.clientName as string | undefined)?.trim();
  const projectName = (request.data?.projectName as string | undefined)?.trim();
  const receivedAt = request.data?.receivedAt as string | number | undefined;
  const template = request.data?.template as string[] | undefined;

  if (!rootFolderId || !clientName || !projectName || !receivedAt) {
    throw new HttpsError('invalid-argument', 'Missing required data');
  }

  const drive = await getDrive();
  const year = new Date(receivedAt).getFullYear().toString();

  try {
    logger.info({ message: 'createBidFolder start', rootFolderId, year, clientName, projectName });

    const yearFolderId = await findOrCreateFolder(drive, rootFolderId, year);
    logger.info({ message: 'createBidFolder year resolved', yearFolderId, year });

    const clientFolderId = await findOrCreateFolder(drive, yearFolderId, clientName);
    logger.info({ message: 'createBidFolder client resolved', clientFolderId, clientName });

    const projectFolderId = await findOrCreateFolder(drive, clientFolderId, projectName);
    logger.info({ message: 'createBidFolder project resolved', projectFolderId, projectName });

    if (Array.isArray(template)) {
      for (const sub of template) {
        const clean = sanitizeName(String(sub || ''));
        if (!clean) continue;
        await findOrCreateFolder(drive, projectFolderId, clean);
      }
    }

    logger.info({ message: 'createBidFolder success', yearFolderId, clientFolderId, projectFolderId });

    return { success: true, year, yearFolderId, clientFolderId, projectFolderId };
  } catch (e: any) {
    logger.error({ message: 'createBidFolder error', error: serializeError(e), rootFolderId, clientName, projectName, receivedAt });
    throw new HttpsError('internal', `Error creating folder structure: ${e?.message || 'unknown error'}`);
  }
});


