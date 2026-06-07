export const environment = {
    production: process.env.NODE_ENV === 'production',
    firebase: {
        projectId: process.env.GCLOUD_PROJECT || 'worktrace-9a501',
        database: process.env.FIRESTORE_EMULATOR_HOST ? 'development' : (process.env.FIRESTORE_DATABASE || '(default)'),
    },
};
