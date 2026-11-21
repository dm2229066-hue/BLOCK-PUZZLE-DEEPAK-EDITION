# Block Puzzle – Deepak Edition — Android APK & AdMob Guide

## 1. Project Overview
- **App Name**: `Block Puzzle – Deepak Edition`
- **Package ID**: `com.deepak.blockpuzzle`
- **Orientation**: Portrait (`android:screenOrientation="portrait"`)
- **AdMob App ID**: `ca-app-pub-7496793317592044~9873540371` (configured in `android/app/src/main/AndroidManifest.xml`)
- **Interstitial Ad Unit IDs** (`android/app/build.gradle`):
  - **Debug Builds (`assembleDebug`)**: Uses Google's official Interstitial Test Ad Unit ID `ca-app-pub-3940256099942544/1033173712` automatically so development/testing never generates invalid live impressions.
  - **Release Builds (`assembleRelease`)**: Configured with `ca-app-pub-7496793317592044/4680923440`.
    > **IMPORTANT**: Before publishing a release APK, confirm in your Google AdMob dashboard that `ca-app-pub-7496793317592044/4680923440` was created specifically with format **Interstitial** (not Banner, Rewarded, or App Open).

---

## 2. Prerequisites for Building the Android APK
1. **Node.js 20+** and `npm`
2. **Java Development Kit (JDK 17 or 21)**
3. **Android Studio** (or Android SDK Command-Line Tools with `ANDROID_HOME` configured and Android SDK Platform 36 / Build-Tools installed)

---

## 3. Sync Web Build & Generate Debug APK (Test Ads Active)
From the project root directory:

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Build the optimized production web bundle
npm run build

# 3. Copy web assets and sync Capacitor plugins into android/
npx cap sync android

# 4. Build the Debug APK via Gradle (uses Google Test Interstitial Ad Unit ID)
cd android
./gradlew assembleDebug
```

Debug APK output:
`android/app/build/outputs/apk/debug/app-debug.apk`

Install onto a connected Android phone (USB Debugging enabled):
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Generating a Signed Release APK (Production Ads)
1. **Create a release keystore** (keep this file safe and private):
```bash
keytool -genkey -v -keystore deepak-puzzle-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias blockpuzzle
```

2. **Add signing config to `android/app/build.gradle`** (or configure via Android Studio → *Build → Generate Signed Bundle / APK*):
```groovy
android {
    signingConfigs {
        release {
            storeFile file("../../deepak-puzzle-release.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "blockpuzzle"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

3. **Build the Signed Release APK or Play Store AAB**:
```bash
cd android
./gradlew assembleRelease
# Or for Google Play Store App Bundle:
./gradlew bundleRelease
```

Outputs:
- Signed APK: `android/app/build/outputs/apk/release/app-release.apk`
- Play Store AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 5. AdMob Interstitial Verification & Gameplay Testing Checklist
Verify the following on a physical Android device or Android Emulator with Google Play Services:

1. **Startup & Offline Safety**:
   - Launch app: confirm NO interstitial ad appears on app launch.
   - Disable Wi-Fi/Mobile Data: confirm all 1,050 levels, Classic, Challenges, Boosters, Shop, Coins, Sound, and Music work 100% offline with zero crashes when AdMob cannot load.
2. **UMP Consent & Ad Preloading**:
   - Re-enable internet and check `adb logcat -s AdMobInterstitial` to verify `Google Mobile Ads SDK initialized.` and `Interstitial ad preloaded successfully.`
3. **Every-3-Levels Frequency Gate**:
   - Complete Level 1 and tap **Next Level** → NO ad shown.
   - Complete Level 2 and tap **Next Level** → NO ad shown.
   - Complete Level 3 and tap **Next Level** → Google Test Interstitial Ad displays full-screen (provided >= 120s since any previous ad), audio pauses during ad, audio resumes on dismissal, and next ad preloads immediately (`Interstitial ad preloaded successfully.`).
4. **120-Second Minimum Cooldown**:
   - Trigger a Game Over within 120 seconds of the previous interstitial → NO ad shown; game restarts immediately.
   - Wait >= 120 seconds, trigger Game Over or return to menu after meaningful play (`>= 4` moves) → preloaded interstitial shows cleanly.
5. **Active Gameplay Protection**:
   - Confirm ads never interrupt block dragging, placement, line-clear animations, or level-complete star celebrations.
6. **Core Game Features**:
   - Verify Classic Mode, Level Mode (1,050 levels), Challenge Mode, Daily Challenge, Time Challenge, all 6 Boosters, Shop Themes/Skins, Daily Rewards, Lucky Spin, Achievements, and persistent localStorage saves.
