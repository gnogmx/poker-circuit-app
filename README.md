# Poker Circuit - App Store Version 🎰

Professional poker tournament manager for Google Play Store and Apple App Store.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-blue.svg)](https://capacitorjs.com/)

## 🎯 About

This is the **App Store version** of Poker Circuit, a separate deployment from the PWA version. Built with React, TypeScript, and Capacitor for native mobile experiences.

## 🚀 Live Deployment

- **Worker**: https://poker-circuit-app.fernando-fcd.workers.dev
- **Database**: Cloudflare D1 (`poker-circuit-app-db`)
- **Repository**: https://github.com/gnogmx/poker-circuit-app

## 📱 App Information

| Platform | Package ID | Status |
|----------|-----------|--------|
| **Android** | `com.gnog.pokercircuit` | ✅ AAB Ready |
| **iOS** | `com.gnog.pokercircuit` | ⏳ In Progress |

### Version
- **Version Code**: 1
- **Version Name**: 1.0
- **Min SDK**: 23 (Android 6.0)
- **Target SDK**: 35 (Android 15)

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Mobile**: Capacitor 6
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Styling**: Tailwind CSS
- **Build**: Gradle 8.11 + Java 21

## 📦 Project Structure

```
poker-circuit-app/
├── src/                    # React application source
├── android/                # Android native project
├── ios/                    # iOS native project
├── marketing/              # App store assets
│   ├── feature-graphic-1024x500.png
│   └── screenshots/        # 8 app screenshots
├── migrations/             # D1 database migrations (32 files)
├── poker-circuit-release.keystore  # Android signing key
└── poker-circuit-release-v1.0.aab  # Release build
```

## 🔧 Setup

### Prerequisites
- Node.js 18+
- Java 21 (for Android builds)
- Xcode 15+ (for iOS builds, macOS only)
- Cloudflare account

### Installation

```bash
# Install dependencies
npm install

# Sync Capacitor
npx cap sync

# Run development server
npm run dev
```

### Android Build

```bash
# Build AAB for Google Play
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS Build

```bash
# Open in Xcode
npx cap open ios

# Then: Product → Archive
```

## 🔐 Security

### Keystore Information
- **File**: `poker-circuit-release.keystore`
- **Alias**: `poker-circuit`
- **Validity**: 10,000 days (~27 years)
- ⚠️ **CRITICAL**: Keystore is in `.gitignore`. Keep secure backups!

### Environment Variables
- Database ID and credentials are in `wrangler.json`
- Keystore credentials are in `android/keystore.properties`

## 📊 Database

### D1 Database
- **Name**: `poker-circuit-app-db`
- **ID**: `1219dc46-17b1-488a-b56b-60a711d7a3d7`
- **Migrations**: 32 SQL files in `/migrations/`

### Schema
- Players, Rounds, Tournaments
- Scoring rules, Prize distribution
- Blind levels, Table draws
- Elimination tracking

## 🎨 Marketing Materials

All assets ready for app store submission:

- ✅ **Icons**: 1024x1024 (iOS), 512x512 (Android)
- ✅ **Feature Graphic**: 1024x500 (Google Play)
- ✅ **Screenshots**: 8 screens in `/marketing/screenshots/`

## 🚀 Deployment

### Cloudflare Worker

```bash
# Build and deploy
npm run build
npx wrangler deploy
```

### Google Play Store
1. Create app in [Google Play Console](https://play.google.com/console)
2. Upload `poker-circuit-release-v1.0.aab`
3. Configure metadata and screenshots
4. Submit for internal testing

### Apple App Store
1. Create app in [App Store Connect](https://appstoreconnect.apple.com)
2. Generate archive in Xcode
3. Upload via Xcode or Transporter
4. Configure TestFlight for beta testing

## 📝 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run deploy       # Deploy to Cloudflare
npx cap sync         # Sync web assets to native projects
```

## 🔗 Related Projects

- **PWA Version**: [poker-pro-tournament-manager](https://github.com/gnogmedia/poker-pro-tournament-manager)
- **Live PWA**: https://pokercircuit.app

## 📄 License

MIT License - see LICENSE file for details

## 👥 Author

**GNOG**
- GitHub: [@gnogmx](https://github.com/gnogmx)
- Email: gnfernando@gmail.com

---

**Note**: This is the app store version. The PWA version remains active and separate.
