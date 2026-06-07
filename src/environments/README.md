# Strategy for environments

## Files
- `environment.ts` -> default (development-like)
- `environment.development.ts` -> development overrides (used by dev serve)
- `environment.production.ts` -> production build (production: true)

## Build
The Angular production build replaces `src/environments/environment.ts` with `src/environments/environment.production.ts` via `angular.json`.

## Secrets Management

### ⚠️ IMPORTANT: Never commit secrets to the repository

This project uses environment variables to manage Firebase configuration securely. Follow these steps:

### For Local Development

1. **Copy the example file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`** with your Firebase credentials:
   ```bash
   NG_APP_FIREBASE_API_KEY=your_api_key_here
   NG_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NG_APP_FIREBASE_PROJECT_ID=your_project_id
   NG_APP_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NG_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NG_APP_FIREBASE_APP_ID=your_app_id
   NG_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
   NG_APP_FIRESTORE_DATABASE=development
   ```

3. **Get your credentials from Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > General
   - Scroll down to "Your apps" and select the web app
   - Copy the values from the Firebase SDK snippet

4. **Share credentials with your team**:
   - Use a secure password manager (1Password, Bitwarden, LastPass)
   - Share via encrypted messaging (Signal, WhatsApp with encryption)
   - Never share via email or public channels

### How it works

The application loads configuration from multiple sources in this order:
1. **Runtime window config** (`window['env']`) - for CI/CD injection
2. **Environment variables** (`import.meta.env['NG_APP_*']`) - from `.env.local`
3. **Default values** - fallback if nothing is configured

### For Production Deployment

In production, use your CI/CD pipeline to inject environment variables during build:

```bash
# Example for GitHub Actions
ng build --configuration production \
  --base-href="/" \
  --configuration production
```

Or configure runtime config via server-side injection of `window['env']`.

### Firebase Functions

For Functions, see `/functions/.env.example` for required variables.
