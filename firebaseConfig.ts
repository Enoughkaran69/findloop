// Compatibility re-export. Some files/imports may reference `../firebaseConfig`.
// Re-export the actual implementation from `lib/firebase`.
export { db, auth, googleProvider, googleLogin, logout } from "./lib/firebase";
