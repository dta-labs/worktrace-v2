export const environment = {
  database: process.env.FIRESTORE_EMULATOR_HOST ? 'development' : '(default)',
};