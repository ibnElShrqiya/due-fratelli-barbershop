# DUE FRATELLI — OneSignal notifications

## Cloudflare Pages
This version uses Cloudflare Pages Functions. The public endpoint is `/api/notify`.

Add this Production secret in Cloudflare Pages → Settings → Variables and Secrets:

`ONESIGNAL_REST_API_KEY` = your OneSignal REST API key

The OneSignal App ID is public and is already configured in the site/function.

## OneSignal admin device
1. Open `/admin.html` over HTTPS.
2. Sign in with the Firebase admin account whose UID is configured in `admin.html`.
3. Click **Activate booking notifications** and allow browser notifications.
4. The page calls `OneSignal.login(ADMIN_UID)`, so the device is associated with the admin external ID.

## Important
- Do not put the REST API key in GitHub or frontend files.
- `OneSignalSDKWorker.js` and `OneSignalSDKUpdaterWorker.js` must be deployed at the domain root.
- `firebase-messaging-sw.js` is kept for the old Firebase push implementation but is no longer used by the OneSignal notification flow.
- The old Firebase Cloud Functions were moved to `firebase-functions/` so they do not conflict with Cloudflare Pages' required `functions/` directory.
