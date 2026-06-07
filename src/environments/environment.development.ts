export const environment = {
  production: false,
  firebase: {
    apiKey: typeof window !== 'undefined' ? (window as any)['env']?.firebaseApiKey || import.meta.env['NG_APP_FIREBASE_API_KEY'] : undefined,
    authDomain: typeof window !== 'undefined' ? (window as any)['env']?.firebaseAuthDomain || import.meta.env['NG_APP_FIREBASE_AUTH_DOMAIN'] : undefined,
    projectId: typeof window !== 'undefined' ? (window as any)['env']?.firebaseProjectId || import.meta.env['NG_APP_FIREBASE_PROJECT_ID'] : undefined,
    storageBucket: typeof window !== 'undefined' ? (window as any)['env']?.firebaseStorageBucket || import.meta.env['NG_APP_FIREBASE_STORAGE_BUCKET'] : undefined,
    messagingSenderId: typeof window !== 'undefined' ? (window as any)['env']?.firebaseMessagingSenderId || import.meta.env['NG_APP_FIREBASE_MESSAGING_SENDER_ID'] : undefined,
    appId: typeof window !== 'undefined' ? (window as any)['env']?.firebaseAppId || import.meta.env['NG_APP_FIREBASE_APP_ID'] : undefined,
    measurementId: typeof window !== 'undefined' ? (window as any)['env']?.firebaseMeasurementId || import.meta.env['NG_APP_FIREBASE_MEASUREMENT_ID'] : undefined,
    database: typeof window !== 'undefined' ? (window as any)['env']?.firestoreDatabase || import.meta.env['NG_APP_FIRESTORE_DATABASE'] || 'development' : 'development'
  }
};