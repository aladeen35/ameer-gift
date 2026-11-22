// Public project settings. None of these are secrets: Firebase web keys are designed to ship to the browser.
export const CONFIG = {
  firebase: {
    apiKey: "AIzaSyDlT9WCSoDFDFtuKbhi5__CkndYLfTSIes",
    authDomain: "ameer-gift-fc5a8.firebaseapp.com",
    projectId: "ameer-gift-fc5a8",
    storageBucket: "ameer-gift-fc5a8.firebasestorage.app",
    messagingSenderId: "316662776940",
    appId: "1:316662776940:web:2498eacc25990c10c9c449",
    // Realtime Database (live visitors). If the owner picks another location, copy the URL from the console here.
    databaseURL: "https://ameer-gift-fc5a8-default-rtdb.europe-west1.firebasedatabase.app",
  },
  // Gemini model for AI caption suggestions (Firebase AI Logic, Gemini Developer API)
  aiModel: "gemini-3.5-flash-lite",
  // reCAPTCHA v3 site key for App Check. Leave empty until App Check is set up in the console.
  appCheckSiteKey: "",
  // Contact number shown on the "trial ended" screen (international digits only)
  whatsapp: "",
};
