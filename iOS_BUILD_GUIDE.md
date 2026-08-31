# iOS Build & Installation Guide

> **Platform context:** Development machine is **Windows**. The iOS Xcode project
> lives in `client/personal-finance-app/ios/` and is built by GitHub Actions on a
> macOS runner. Final device installation on your iPhone requires a Mac with Xcode
> because Apple's free provisioning is Xcode-managed.

---

## Quick-reference: npm scripts

| Script | What it does |
|---|---|
| `npm run cap:sync:ios` | Sync web assets + plugins into the Xcode project |
| `npm run cap:open:ios` | Open the Xcode project (macOS only) |
| `npm run cap:build:ios` | `next build` then `cap sync ios` |

---

## How Apple provisioning works (free account)

Apple allows you to install apps on up to **3 personal devices** using a **free Apple Account** via Xcode's "Personal Team":

| Aspect | Free Personal Team |
|---|---|
| Cost | $0 |
| Devices | Up to 3 |
| Provisioning expiry | **7 days** — must rebuild & reinstall |
| App Store / TestFlight | ❌ Not available |
| Exportable CI signing assets | ❌ Xcode-managed only |

This means the final signed `.ipa` install must always go through **Xcode on a Mac**.
GitHub Actions produces an unsigned archive that you download and sign locally.

---

## End-to-end flow

```
Windows PC  ──git push──►  GitHub
                                │
                         GitHub Actions (macOS runner)
                                │  npm ci
                                │  npm run build
                                │  npx cap sync ios
                                │  xcodebuild archive (unsigned)
                                │
                         artifact: PersonalFinance-iOS-unsigned-<sha>.xcarchive
                                │
                         Download to Mac
                                │
                         Xcode + Free Apple Account
                                │  Automatic signing (Personal Team)
                                │  Run on connected iPhone
                                ▼
                         iPhone ✅
```

---

## Step 1 — Prerequisites (do once)

### 1a. Create a free Apple Account
1. Go to <https://account.apple.com/> and create an account (or use existing).
2. Go to <https://developer.apple.com/> → sign in → accept the Developer Agreement.
3. **Do NOT purchase** the $99/year Apple Developer Program for personal testing.

### 1b. Install Xcode on a Mac
```bash
# Mac App Store → search "Xcode" → install (it's large, ~15 GB)
# Then accept the license:
sudo xcodebuild -license accept
xcodebuild -version          # should print Xcode 15.x or later
```

### 1c. Sign into Xcode with your Apple Account
1. Xcode → **Settings** (⌘,) → **Accounts** tab
2. Click **+** → **Apple ID** → sign in
3. Confirm the team shows as `<Your Name> (Personal Team)`

### 1d. Enable Developer Mode on iPhone
1. Settings → Privacy & Security → **Developer Mode** → turn on
2. Restart the iPhone when prompted

---

## Step 2 — Clone the repo on the Mac

```bash
git clone https://github.com/<your-org>/Personal-Finance-App.git
cd "Personal-Finance-App/client/personal-finance-app"
npm ci
```

---

## Step 3 — Sync and open in Xcode

```bash
npm run cap:sync:ios   # syncs web assets into ios/App
npm run cap:open:ios   # opens ios/App/App.xcworkspace in Xcode
```

> Always open the **`.xcworkspace`** file, not the `.xcodeproj`.

---

## Step 4 — Configure signing in Xcode

1. In Xcode, click the **App** target in the left navigator.
2. Open the **Signing & Capabilities** tab.
3. Set:
   - **Team** → `<Your Name> (Personal Team)`
   - **Automatically manage signing** → ✅ ON
   - **Bundle Identifier** → `me.danishdev.devforge.personalfinance`
     *(if Xcode says it's taken, append a unique suffix e.g. `.dev`)*
4. Xcode will create a development provisioning profile automatically.

---

## Step 5 — Connect and register your iPhone

1. Connect iPhone via USB.
2. Unlock the device and tap **Trust this Computer**.
3. In Xcode, click the device dropdown (top toolbar) → your iPhone should appear.
4. If Xcode asks to register the device, click **Register Device**.

---

## Step 6 — Build and run on device

1. Select your iPhone in the scheme toolbar.
2. Press ▶ (Run) or `⌘R`.
3. Wait for the build to complete and the app to install.
4. First launch: iPhone will show "Untrusted Developer" alert.
   - Settings → General → VPN & Device Management → your Apple Account → **Trust**

The app will load `https://devforge.danishdev.me` in the WKWebView — the full
server-rendered Next.js app running natively on your iPhone.

---

## Step 7 — Re-provisioning after 7 days

Apple's free Personal Team provisioning profiles expire in 7 days.

When the app stops launching (shows "expired" error):
```bash
# On the Mac, in the project directory:
npm run cap:sync:ios
npm run cap:open:ios
# In Xcode: Run again (⌘R) — Xcode will re-provision automatically
```

---

## GitHub Actions CI workflow

The workflow at [`.github/workflows/ios-build.yml`](.github/workflows/ios-build.yml):

- Runs on every push to `main` and on `workflow_dispatch`
- Installs dependencies, builds Next.js, syncs Capacitor
- Runs `xcodebuild archive` with `CODE_SIGNING_ALLOWED=NO` (unsigned)
- Uploads `PersonalFinance-iOS-unsigned-<sha>.xcarchive` as a downloadable artifact

**To use the CI artifact for device install:**
1. Go to GitHub → Actions → iOS Build → latest run → Artifacts
2. Download `PersonalFinance-iOS-unsigned-*.xcarchive.zip`
3. Extract on Mac → double-click `.xcarchive` to open in Xcode Organizer
4. In Organizer: **Distribute App** → **Development** → **Personal Team** → Export IPA
5. Drag `.ipa` onto your device via Xcode Devices window, or use `ideviceinstaller`

---

## Troubleshooting

| Issue | Fix |
|---|---|
| "No account for team" in Xcode | Xcode → Settings → Accounts → add Apple ID |
| Bundle ID unavailable | Append `.dev` or another unique suffix to the bundle ID |
| "Untrusted Developer" on iPhone | Settings → General → VPN & Device Management → Trust |
| App crashes on launch | Check Xcode console; usually a missing capability or entitlement |
| Blank white screen in app | The remote URL may be unreachable; check Wi-Fi / server status |
| `pod install` fails on CI | Runner may need `pod repo update`; already included in workflow |
| CocoaPods not found | Workflow runs `gem install cocoapods` automatically |
| Xcode archive fails (scheme not found) | Check `xcodebuild -list` step output in CI logs for correct scheme name |

---

## What is NOT needed

- ❌ Apple Developer Program ($99/year) — for personal testing only
- ❌ App Store Connect — for personal testing only
- ❌ TestFlight — for personal testing only
- ❌ `.p12` certificates in GitHub secrets — free Personal Team is Xcode-managed
- ❌ `.mobileprovision` files — auto-created by Xcode with automatic signing

---

## File locations

```
client/personal-finance-app/
├── ios/                        Xcode project (commit this)
│   ├── App/
│   │   ├── App.xcworkspace     ← always open this in Xcode
│   │   ├── App/
│   │   │   ├── AppDelegate.swift
│   │   │   ├── Info.plist
│   │   │   └── Assets.xcassets/
│   │   └── Podfile
│   └── .gitignore
├── capacitor.config.ts         iOS config block added
└── package.json                cap:sync:ios / cap:open:ios / cap:build:ios scripts

.github/workflows/
└── ios-build.yml               macOS CI workflow
```
