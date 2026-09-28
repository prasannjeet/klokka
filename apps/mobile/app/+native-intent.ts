// expo-router's NativeIntent hook. The FILE NAME is the API: expo-router looks for exactly
// ./+native-intent in the app directory, excludes it from the route tree, and runs redirectSystemPath
// over every incoming url before the router navigates. The rules live with the auth module, which owns
// the redirect URIs (src/auth/authDeepLink.ts).
export { redirectSystemPath } from '../src/auth/authDeepLink';
