# iOS Local Build Guide (Cross-Mac)

This project is now configured with Capacitor iOS.

## What is committed
- `capacitor.config.json`
- `ios/` native project
- Capacitor dependencies in `package.json` / `package-lock.json`

## Push to GitHub from this Mac
1. Create a GitHub repo (empty).
2. Add remote and push:

```bash
git remote add origin <your-github-repo-url>
git push -u origin dev/current-changes
```

If `origin` already exists, update it:

```bash
git remote set-url origin <your-github-repo-url>
git push -u origin dev/current-changes
```

## Build on another Mac
```bash
git clone <your-github-repo-url>
cd <repo-folder>
npm install
VITE_API_BASE_URL=http://<backend-mac-lan-ip>:4000 npm run build
npx cap sync ios
npx cap open ios
```

Example:
```bash
VITE_API_BASE_URL=http://192.168.31.12:4000 npm run build
```

This is required for iOS package builds because Vite dev proxy is not available in production app bundles.

In Xcode:
1. Select `App` target.
2. Open `Signing & Capabilities`.
3. Set your Apple ID `Team`.
4. Use a unique `Bundle Identifier`.
5. Connect iPhone and press Run.

## After frontend code changes
Run this on the Mac used for iOS testing:

```bash
VITE_API_BASE_URL=http://<backend-mac-lan-ip>:4000 npm run build
npx cap sync ios
npx cap open ios
```
