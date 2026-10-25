// Public project settings. None of these are secrets: Firebase web keys are designed to ship to the browser.
export const CONFIG = {
  firebase: {
    apiKey: "AIzaSyCI9WPKvYbDmac8zXeatAivmVBGyS-CtIc",
    authDomain: "ameer-gift.firebaseapp.com",
    projectId: "ameer-gift",
    storageBucket: "ameer-gift.firebasestorage.app",
    messagingSenderId: "276474821835",
    appId: "1:276474821835:web:2c3bba0be6692da6746f4e",
    // Realtime Database (live visitors). If the owner picks another location, copy the URL from the console here.
    databaseURL: "https://ameer-gift-default-rtdb.europe-west1.firebasedatabase.app",
  },
  // reCAPTCHA v3 site key for App Check. Leave empty until App Check is set up in the console.
  appCheckSiteKey: "",
  // Contact number shown on the "trial ended" screen (international digits only)
  whatsapp: "",
};
