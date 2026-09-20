# iOS Build Plan — Next.js + Capacitor + GitHub Actions + Free Apple Account

## 1. Objective

Convert the existing Next.js + Capacitor project, which already builds successfully for Android, into an iOS build that can be tested on a personal iPhone **without paying the $99/year Apple Developer Program fee**.

The target is a hackathon/testing setup, not App Store or TestFlight distribution.

### Current state

- Development machine: Windows
- Web app: Next.js
- Mobile wrapper: Capacitor
- Android: already configured and producing APK/AAB
- GitHub: available for source control and Actions
- Apple Developer Program: **not enrolled / no $99 membership**
- Goal: iOS build + installation on a small number of personal test devices

---

## 2. Important Apple Constraint — Read This First

Apple currently supports on-device development/testing with a **free Apple Account** through Xcode's **Personal Team**. Apple states that, for a free account:

- Up to **10 App IDs** can be registered.
- Up to **3 devices** can be registered.
- Up to **3 apps per device** can be installed.
- App IDs and devices expire after **7 days**.
- Development provisioning profiles used for these apps expire **7 days from issuance**.
- After expiration, the app must be reprovisioned/rebuilt and reinstalled.

Source: Apple Developer — Developer account overview.

### Critical CI/CD limitation

The free Personal Team is **not the same thing as a paid Apple Developer Program team**.

Apple says that for a Personal Team, the App IDs, devices, certificates, and provisioning profiles are managed **directly in Xcode**. The paid-account workflow exposes the normal Certificates, Identifiers & Profiles resources used for manual CI signing.

GitHub's standard iOS signing workflow expects exportable signing material such as:

- `.p12` signing certificate
- `.mobileprovision` provisioning profile
- certificate password

Therefore, do **not** design this project around the assumption that a normal GitHub-hosted `macos-latest` runner can independently create and maintain a free Personal Team provisioning profile every 7 days.

### Recommended hackathon architecture

Use GitHub Actions for the **macOS/Xcode build work**, but use a Mac logged into your free Apple Account's Personal Team for the **actual free-account device signing/provisioning**.

There are two implementation levels:

#### Level A — Recommended and simplest

```text
Windows
  |
  | git push
  v
GitHub
  |
  v
GitHub Actions (macOS)
  |
  | Capacitor iOS project build preparation
  | optional unsigned archive/app artifact
  v
Download artifact to Mac
  |
  v
Xcode + Free Personal Team
  |
  | automatic signing/provisioning
  v
Install on iPhone
```

#### Level B — Advanced: self-hosted Mac runner

```text
Windows
  |
  v
GitHub
  |
  v
GitHub Actions
  |
  v
Self-hosted Mac runner
  |
  | Xcode already signed in to your Apple Account
  | Personal Team available
  | automatic signing
  v
Development-signed app / IPA
  |
  v
Registered iPhone
```

Level B can make the process much more automated, but it requires access to a Mac and introduces security concerns because your Apple/Xcode credentials exist on a runner.

For a hackathon, Level A is the safer starting point.

---

# 3. End-to-End Implementation Roadmap

## Phase 0 — Verify the existing project

Before touching iOS, confirm Android remains working.

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

Do not change the Android configuration unless necessary.

Check that the repository contains the normal Capacitor files:

```text
project/
├── android/
├── public/
├── src/                  # or app/ depending on Next.js structure
├── capacitor.config.ts
├── package.json
└── ...
```

If the project uses a custom Next.js output mode, verify that Capacitor's `webDir` matches the generated static/output directory.

---

# 4. Prepare Next.js for Capacitor iOS

## 4.1 Check Next.js output requirements

Capacitor needs files that can be placed into its web directory.

The exact setup depends on the existing Next.js project.

For a fully static Capacitor shell, the project commonly uses an export configuration such as:

```ts
// next.config.ts / next.config.js
const nextConfig = {
  output: 'export',
};

export default nextConfig;
```

Do **not** blindly add this if the project depends on Next.js server-side features that require a Node.js server. In that case, keep the existing architecture and confirm how the web assets are supplied to Capacitor.

Build locally first:

```bash
npm run build
```

Confirm that the expected web output directory is generated.

---

# 5. Add Capacitor iOS

On Windows, install the iOS Capacitor platform package:

```bash
npm install @capacitor/ios
```

Then create the iOS platform:

```bash
npx cap add ios
```

After the Next.js build:

```bash
npm run build
npx cap sync ios
```

You can inspect the generated project structure, but **you cannot open/build the iOS project with Xcode on Windows**.

The iOS project must ultimately be handled by macOS/Xcode.

---

# 6. Configure Capacitor Correctly

Check `capacitor.config.ts`.

Example:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.yourapp',
  appName: 'Your App',
  webDir: 'out',
};

export default config;
```

## Bundle ID rules

Choose a unique bundle identifier, for example:

```text
com.danish.hackathonapp
```

Do not use a generic identifier such as:

```text
com.example.app
```

Keep the same identifier throughout the iOS setup.

Important: if you later publish the app through the App Store, the bundle ID and signing/distribution setup must be handled as a proper paid developer-team setup.

---

# 7. Push the iOS Project to GitHub

Commit the Capacitor iOS project:

```bash
git add .
git commit -m "Add Capacitor iOS platform"
git push
```

The repository should now contain:

```text
android/
ios/
capacitor.config.ts
package.json
...
```

Do not commit private signing certificates, private keys, provisioning profiles, passwords, or Apple credentials.

---

# 8. Create the Free Apple Developer Account

You do **not** need to purchase the Apple Developer Program for personal-device testing.

## Step 8.1 — Create or use an Apple Account

Create an Apple Account if you do not already have one:

https://account.apple.com/

Use real account information.

Enable two-factor authentication if Apple requires it for the developer workflow you are using.

## Step 8.2 — Register as a free Apple developer

Go to:

https://developer.apple.com/

Sign in with the Apple Account.

Accept the Apple Developer Agreement when prompted.

Apple describes this as free registration; this is different from enrolling in the paid Apple Developer Program.

## Step 8.3 — Do NOT click paid enrollment for this hackathon setup

You are intentionally using:

```text
Free Apple Account
        +
Xcode Personal Team
```

not:

```text
Apple Developer Program
$99/year
```

---

# 9. What You Need on the Mac

At least one Mac is required for the Xcode portion.

Possible options:

1. Borrow/use a Mac temporarily.
2. Use a rented/cloud Mac that provides Xcode access.
3. Use a Mac owned by a teammate.
4. Later, optionally configure that Mac as a GitHub Actions self-hosted runner.

Install Xcode from the Mac App Store and launch it once.

Then accept the Xcode license when prompted.

Verify:

```bash
xcodebuild -version
```

Also verify that the installed Xcode version supports the iOS SDK required by the project.

---

# 10. Sign In to Xcode Using the Free Apple Account

This is the key free-account step.

On the Mac:

1. Open **Xcode**.
2. Open Xcode settings/preferences.
3. Go to **Accounts**.
4. Add your Apple Account.
5. Select the account.
6. Confirm that the team appears as a **Personal Team**.

Apple states that with an account that is not associated with a paid developer-program membership, Xcode identifies it as a Personal Team.

The Personal Team is where Xcode manages the development App ID, device registration, certificates, and provisioning profiles.

---

# 11. Connect and Register the iPhone

On the Mac:

1. Connect the iPhone to the Mac using USB.
2. Unlock the iPhone.
3. Trust the Mac on the iPhone if prompted.
4. Enable the required Developer Mode on the iPhone when Xcode/iOS requests it.
5. Open Xcode's device management area and confirm that the iPhone is visible.

Your free account can register up to 3 devices under Apple's current Personal Team limits.

---

# 12. Open the Capacitor iOS Project on the Mac

After the repository is available on the Mac:

```bash
npm install
npm run build
npx cap sync ios
npx cap open ios
```

Xcode should open the Capacitor iOS project.

Select the main application target.

---

# 13. Configure Signing in Xcode

In Xcode, select the app target and open:

```text
Signing & Capabilities
```

Set:

```text
Team = <Your Name> (Personal Team)
```

Use automatic signing when possible:

```text
Automatically manage signing = ON
```

Make sure the bundle identifier matches the `appId` in `capacitor.config.ts`.

For example:

```text
com.danish.hackathonapp
```

Xcode should then create/manage the required Personal Team development provisioning data.

If Xcode reports that the bundle identifier is unavailable, change it to a unique identifier and keep the same identifier in the project.

---

# 14. First Local Free-Provisioning Build

Before attempting GitHub Actions, **prove that free signing works locally on the Mac**.

In Xcode:

1. Select the physical iPhone as the destination.
2. Select the app scheme.
3. Build/run the project.
4. Allow Xcode to fix signing issues if necessary.
5. Wait for the application to install.

The first successful physical-device run is the most important milestone.

Do not move to CI until this works.

---

# 15. Verify the App on the iPhone

Test at least:

- App launches.
- Web assets load.
- Navigation works.
- API requests work.
- Authentication works.
- Capacitor native plugins work.
- Camera/files/notifications/etc. work if your app uses them.
- Keyboard behavior is correct.
- Status bar/safe areas look correct.

Remember that an iOS WebView can expose issues that are not visible in Android WebView/Chrome.

---

# 16. GitHub Actions — macOS Build Preparation

## 16.1 Why use a macOS runner?

GitHub Actions provides macOS hosted runners, including `macos-latest`.

A GitHub Actions job can therefore perform the macOS/Xcode portion of the Capacitor build.

Example workflow skeleton:

```yaml
name: iOS Build

on:
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  ios-build:
    runs-on: macos-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js
        run: npm run build

      - name: Sync Capacitor iOS
        run: npx cap sync ios

      - name: Show Xcode version
        run: xcodebuild -version
```

The exact Node.js version should match the project.

---

# 17. First GitHub Actions Goal: Build the iOS Project

The first CI milestone should be:

```text
GitHub push
   ↓
macOS runner
   ↓
npm ci
   ↓
npm run build
   ↓
npx cap sync ios
   ↓
xcodebuild archive/build preparation
   ↓
GitHub artifact
```

At this stage, focus on proving that the project itself builds correctly on macOS.

Do not add Apple signing secrets yet.

---

# 18. Build an Unsigned iOS Archive in GitHub Actions

A useful intermediate workflow is to prove Xcode can archive the application without relying on free-account signing.

The exact workspace/project and scheme names must be checked from the generated `ios/` directory.

Typical inspection commands:

```bash
find ios -maxdepth 3 -type d -name "*.xcodeproj" -o -name "*.xcworkspace"
```

Then determine the correct scheme:

```bash
xcodebuild -workspace ios/App/App.xcworkspace -list
```

or, if the generated project uses an `.xcodeproj`:

```bash
xcodebuild -project ios/App/App.xcodeproj -list
```

Example unsigned archive command:

```bash
xcodebuild \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -archivePath "$RUNNER_TEMP/App.xcarchive" \
  CODE_SIGNING_ALLOWED=NO \
  archive
```

**Do not copy this command blindly.** Replace the workspace, scheme, and paths with those generated by your actual Capacitor project.

---

# 19. Upload the CI Artifact

Example:

```yaml
- name: Upload iOS archive
  uses: actions/upload-artifact@v4
  with:
    name: ios-archive
    path: ${{ runner.temp }}/App.xcarchive
```

This gives you a repeatable macOS build pipeline without pretending that an unsigned archive is directly installable on an iPhone.

---

# 20. Free Personal Team Signing Strategy

## Recommended free-account process

The free account is primarily an **Xcode-managed development signing workflow**.

Use a Mac that is signed in to your Apple Account and has the target iPhone available.

Then:

```text
GitHub Actions
   ↓
Build/update iOS project
   ↓
Download project/archive/artifact
   ↓
Mac + Xcode Personal Team
   ↓
Automatic signing/provisioning
   ↓
Physical iPhone
```

This avoids storing your Apple Account password or Personal Team credentials inside GitHub Actions.

---

# 21. Why the Normal GitHub Certificate/Provisioning-Profile Workflow Does Not Apply Directly

GitHub's official Xcode signing documentation uses secrets containing items such as:

```text
BUILD_CERTIFICATE_BASE64
P12_PASSWORD
BUILD_PROVISION_PROFILE_BASE64
KEYCHAIN_PASSWORD
```

The runner imports the `.p12` certificate into a temporary keychain and installs the `.mobileprovision` profile.

That workflow is designed around exportable signing assets.

Apple's free Personal Team workflow is different: Apple says that Personal Team App IDs, devices, certificates, and provisioning profiles are managed directly in Xcode.

Therefore, **do not create fake GitHub secrets or try to use the paid-team manual signing workflow with a free Personal Team**.

---

# 22. Optional Advanced Setup — Self-Hosted Mac Runner

If you eventually gain access to a dedicated Mac, you can make the pipeline much closer to fully automated.

Architecture:

```text
Windows development machine
        |
        v
      GitHub
        |
        v
GitHub Actions
        |
        v
Self-hosted Mac runner
        |
        +-- Xcode
        +-- Apple Account signed into Xcode
        +-- Personal Team
        +-- registered iPhone/device setup
        |
        v
Development build
```

The advantage is that Xcode can already have your Personal Team context available.

The disadvantage is security: the Mac/runner is now a machine containing access to your Apple developer identity. Keep it private and never expose the runner to untrusted pull requests.

For a hackathon, a manual Mac signing step is generally safer.

---

# 23. GitHub Actions Workflow — Suggested Final Hackathon Version

Use two workflows rather than trying to solve everything at once.

## Workflow 1 — Continuous iOS Build

Purpose:

```text
Validate the Capacitor iOS project on macOS.
```

Flow:

```text
checkout
→ setup Node
→ npm ci
→ npm run build
→ npx cap sync ios
→ xcodebuild build/archive without signing
→ upload artifact
```

Trigger:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

## Workflow 2 — Release candidate / manual signing

Purpose:

```text
Prepare the exact project version for manual Xcode Personal Team signing.
```

Trigger:

```yaml
on:
  workflow_dispatch:
```

This prevents every ordinary Git push from attempting a free-account provisioning operation.

---

# 24. Seven-Day Reprovisioning Process

Apple currently states that Personal Team development profiles expire 7 days from issuance and apps must be rebuilt/reinstalled after expiration.

When the 7-day period expires:

1. Open the project on the Mac.
2. Ensure the Apple Account is still signed in to Xcode.
3. Connect the iPhone.
4. Confirm the target still uses the Personal Team.
5. Allow Xcode to reprovision/fix signing.
6. Build and install again.

For a hackathon lasting only a few days, this may never become a practical problem.

If it does, the process is:

```text
Rebuild
  ↓
Reprovision
  ↓
Reinstall
```

You can keep the source code and CI build automated while performing this final free-account operation on the Mac.

---

# 25. Do NOT Attempt These Shortcuts

## Do not do this

```text
Windows → create IPA → install anywhere
```

An `.ipa` file is not automatically installable merely because it exists.

The IPA/application must have valid signing and provisioning suitable for the target device.

## Do not commit Apple credentials

Never place these in Git:

```text
Apple password
.p12
.p8
private signing key
.mobileprovision
API key
certificate password
```

Use GitHub encrypted secrets for paid-team CI signing, and avoid storing your personal Apple Account credentials in GitHub for this free-account workflow.

## Do not assume App Store/TestFlight works with the free account

Apple identifies App Store Connect and TestFlight as paid developer-program resources.

The free workflow is intended for personal development/testing, not normal public distribution.

---

# 26. Hackathon Success Criteria

The implementation is complete when all of the following are true:

### Local project

- [ ] Existing Android build still works.
- [ ] `npm run build` works.
- [ ] `npx cap sync ios` works.
- [ ] `ios/` project exists.

### Apple account

- [ ] Apple Account created.
- [ ] Apple Developer free registration completed.
- [ ] Apple Developer Agreement accepted.
- [ ] No $99/year membership purchased.

### Mac/Xcode

- [ ] Xcode installed.
- [ ] Apple Account signed into Xcode.
- [ ] Personal Team appears.
- [ ] iPhone connected and trusted.
- [ ] iPhone is available to Xcode.
- [ ] Bundle ID is unique.
- [ ] Team is set to Personal Team.
- [ ] Automatic signing is working.

### iOS app

- [ ] App installs on iPhone.
- [ ] App launches successfully.
- [ ] Next.js UI works.
- [ ] API/backend connectivity works.
- [ ] Capacitor plugins used by the project work.
- [ ] Hackathon-required features work on the physical device.

### GitHub Actions

- [ ] macOS runner workflow succeeds.
- [ ] Next.js build succeeds in CI.
- [ ] `npx cap sync ios` succeeds in CI.
- [ ] Xcode build/archive preparation succeeds.
- [ ] CI artifact is uploaded.
- [ ] No Apple passwords/private keys are committed.

---

# 27. Suggested Repository Structure

```text
project/
├── .github/
│   └── workflows/
│       ├── android-build.yml
│       └── ios-build.yml
│
├── android/
├── ios/
├── public/
├── src/                  # or app/
├── capacitor.config.ts
├── package.json
├── package-lock.json
└── README.md
```

Keep Android and iOS workflows independent so an iOS signing issue does not break the Android pipeline.

---

# 28. Recommended Implementation Order

Follow this exact order rather than trying to configure everything at once.

```text
1. Verify Next.js production build
        ↓
2. Install @capacitor/ios
        ↓
3. npx cap add ios
        ↓
4. npx cap sync ios
        ↓
5. Commit ios/ to GitHub
        ↓
6. Create/register free Apple developer account
        ↓
7. Get access to a Mac
        ↓
8. Install Xcode
        ↓
9. Sign into Xcode with Apple Account
        ↓
10. Confirm Personal Team
        ↓
11. Connect iPhone
        ↓
12. Configure unique Bundle ID
        ↓
13. Enable automatic signing
        ↓
14. Run app on physical iPhone
        ↓
15. Fix iOS-specific issues
        ↓
16. Create macOS GitHub Actions build
        ↓
17. Verify unsigned/CI archive build
        ↓
18. Upload CI artifact
        ↓
19. Use Mac + Personal Team for final free signing/install
        ↓
20. Repeat reprovision/install when 7-day limit is reached
```

---

# 29. Final Target Architecture

```text
                         ┌─────────────────────┐
                         │     Windows PC      │
                         │                     │
                         │ Next.js             │
                         │ Capacitor           │
                         │ Android Studio      │
                         └──────────┬──────────┘
                                    │
                               git push
                                    │
                                    v
                         ┌─────────────────────┐
                         │       GitHub        │
                         └──────────┬──────────┘
                                    │
                              GitHub Actions
                                    │
                                    v
                         ┌─────────────────────┐
                         │   macOS runner      │
                         │                     │
                         │ Node                │
                         │ Capacitor           │
                         │ Xcode               │
                         │ iOS build/archive   │
                         └──────────┬──────────┘
                                    │
                              CI artifact
                                    │
                                    v
                         ┌─────────────────────┐
                         │       Mac           │
                         │                     │
                         │ Xcode               │
                         │ Free Apple Account  │
                         │ Personal Team       │
                         │ Automatic signing   │
                         └──────────┬──────────┘
                                    │
                            development IPA/app
                                    │
                                    v
                         ┌─────────────────────┐
                         │       iPhone        │
                         │                     │
                         │ Hackathon testing   │
                         └─────────────────────┘
```

---

# 30. Important Cost/Capability Summary

| Capability | Free Apple Account / Personal Team | Paid Apple Developer Program |
|---|---:|---:|
| Xcode development | ✅ | ✅ |
| Physical iPhone testing | ✅ | ✅ |
| Up to 3 devices | ✅ | — |
| Up to 3 apps per device | ✅ | — |
| 7-day provisioning limitation | ✅ | ❌ |
| Rebuild/reinstall after expiry | ✅ Required | ❌ |
| App Store Connect | ❌ | ✅ |
| TestFlight | ❌ | ✅ |
| Normal App Store distribution | ❌ | ✅ |
| Standard exportable CI signing assets | Limited / Xcode-managed | ✅ |

---

# 31. Key References

Apple — Developer account overview and Personal Team limits:
https://developer.apple.com/help/account/basics/about-your-developer-account

Apple — Development provisioning profiles:
https://developer.apple.com/help/account/provisioning-profiles/create-a-development-provisioning-profile

GitHub — Signing Xcode applications on macOS runners:
https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications

GitHub — GitHub-hosted runner reference:
https://docs.github.com/en/actions/reference/runners/github-hosted-runners

---

# 32. Important Conclusion

For this hackathon, the best realistic setup is:

```text
FREE Apple Account
        +
Xcode Personal Team
        +
Mac access
        +
GitHub Actions macOS build
        =
Practical iOS testing without $99/year
```

The main limitation is **not Capacitor**. It is Apple's signing/provisioning model.

The safest implementation is to make GitHub Actions responsible for **building and validating the iOS project**, while letting Xcode on a Mac handle **free Personal Team provisioning and the final device installation**.

A completely unattended GitHub-hosted workflow that creates a fresh, device-installable Personal Team IPA every 7 days should **not** be treated as the baseline design, because the free Personal Team is Xcode-managed and does not provide the same CI signing assets/workflow as a paid developer team.
