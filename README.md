# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Testing and verification

### Supported versions

| Tool | Version |
| --- | --- |
| Node.js | 24 or newer (see `.nvmrc`; CI runs Node 24) |
| npm | 11 or newer (the lockfile is `package-lock.json`; use npm only) |
| Expo SDK | 57 |
| React / React Native | 19.2.3 / 0.86.3 |
| Jest / jest-expo | 29.7 / 57.0.5 |
| React Native Testing Library | 13.3.3 (with `react-test-renderer` 19.2.3) |

### Commands

```bash
npm ci                 # clean install from the lockfile
npm test               # run the unit/component tests
npm run test:watch     # re-run tests while editing
npm run test:coverage  # tests + coverage report (coverage/ is git-ignored)
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint (ESLint)
npm run export:android # Metro + Hermes bundle for Android
npm run export:ios     # Metro + Hermes bundle for iOS
npm run verify         # typecheck + lint + tests + both exports
```

`npm run verify` is the one command used by CI (`.github/workflows/testing.yml`)
and by the pre-push hook. To turn the hook on in your clone (Git does not copy
local config when cloning):

```bash
git config --local core.hooksPath .githooks
```

Tests live in `__tests__/`, shared test helpers in `test-utils/`. Tests replace
only the outside edges (network, native storage, push, sockets, the router) and
keep the application logic real. They do **not** replace trying the app on a
device: native builds, real backend delivery, push taps, permissions, the
SecureStore upgrade path and screen readers (VoiceOver / TalkBack) still need a
manual check.

### Recording the package versions

React = 19.2.3
React-native = 0.86.3
Expo = 57.0.1
package_manager = npm

- Testing dependencies are already installed; see **Testing and verification** above.
