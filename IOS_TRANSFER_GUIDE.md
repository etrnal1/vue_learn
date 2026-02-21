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
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Select `App` target.
2. Open `Signing & Capabilities`.
3. Set your Apple ID `Team`.
4. Use a unique `Bundle Identifier`.
5. Connect iPhone and press Run.

## After frontend code changes
Run this on the Mac used for iOS testing:

```bash
npm run build
npx cap sync ios
npx cap open ios
```
