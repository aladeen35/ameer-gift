// هدايا أمير — shared setup (Firebase + helpers)
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  onAuthStateChanged, signOut, updateProfile, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where,
  orderBy, getDocs, onSnapshot, serverTimestamp, Timestamp, writeBatch, increment, limit, deleteField, arrayUnion } from "firebase/firestore";
import { CONFIG } from "./config.js";

export const firebaseConfig = CONFIG.firebase;
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const fs = { doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, getDocs, onSnapshot, serverTimestamp, Timestamp, writeBatch, increment, limit, deleteField, arrayUnion };
export const au = { onAuthStateChanged, signOut, updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signInAnonymously };

// Optional App Check (reCAPTCHA v3, free on the Spark plan). Turned on only when a site key is set in config.js
if (CONFIG.appCheckSiteKey) {
  import("firebase/app-check").then(({ initializeAppCheck, ReCaptchaV3Provider }) =>
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(CONFIG.appCheckSiteKey), isTokenAutoRefreshEnabled: true })).catch(() => {});
}

// Google sign-in: popup first, redirect if the browser blocks popups
export async function googleSignIn() {
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
  try { return await signInWithPopup(auth, p); }
  catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-environment", "auth/cancelled-popup-request"].includes(e.code)) return signInWithRedirect(auth, p);
    throw e;
  }
}
getRedirectResult(auth).catch(() => {});

/* ---------- small helpers ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
export function toast(msg, kind = "") {
  let t = $("#toast"); if (!t) { t = el("div", { id: "toast", role: "status" }); document.body.append(t); }
  t.textContent = msg; t.className = "show " + kind; clearTimeout(t._h); t._h = setTimeout(() => (t.className = ""), 3800);
}

// Arabic-Indic / Persian digits → Latin, then keep digits only (phones, PINs)
export function latinDigits(s) { return String(s || "").replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x660).replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x6F0); }
export function normalizePhone(s) { let d = latinDigits(s).replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); return d; }
// International format only (country code first, e.g. 9665…, 2499…)
export function phoneOk(d) { return /^[1-9]\d{7,14}$/.test(d); }
export function fmtNum(n, lang) { return Number(n || 0).toLocaleString(lang === "ar" ? "ar-EG" : "en-US"); }
export const CURRENCIES = { USD: { ar: "دولار", en: "USD" }, SAR: { ar: "ريال", en: "SAR" }, SDG: { ar: "جنيه", en: "SDG" } };
export function money(v, cur, lang) { return fmtNum(Math.round(v * 100) / 100, lang) + " " + (CURRENCIES[cur]?.[lang] || cur); }
export function randomId(n = 12) { const a = "abcdefghjkmnpqrstuvwxyz23456789"; const r = crypto.getRandomValues(new Uint32Array(n)); return [...r].map(x => a[x % a.length]).join(""); }
export function randomPin() { return String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0"); }

// The museum's private document id is derived from its id and PIN, so the content can only be read with both
export async function vaultKey(gid, pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(gid + ":" + latinDigits(pin)));
  return gid + "-" + [...new Uint8Array(buf)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Shrink a photo to a JPEG data URL small enough for a Firestore document (≈ 100–200 KB)
export function compressImage(file, max = 1280, quality = 0.78) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      let { width: w, height: h } = im; const s = Math.min(1, max / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s);
      const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h); URL.revokeObjectURL(url);
      let q = quality, out = c.toDataURL("image/jpeg", q);
      while (out.length > 700000 && q > 0.4) { q -= 0.08; out = c.toDataURL("image/jpeg", q); }
      res({ data: out, w, h });
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad image")); };
    im.src = url;
  });
}
// Logos keep transparency (PNG), smaller size
export function compressLogo(file, max = 700) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const s = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/png")); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad image")); };
    im.src = url;
  });
}

// Default prices — the admin edits these in the dashboard (settings/pricing)
export const DEFAULT_PRICING = {
  packages: [
    { id: "family", nameAr: "عائلي", nameEn: "Family", visitors: 4, months: 12, business: false, prices: { USD: 15, SAR: 55, SDG: 40000 } },
    { id: "friends", nameAr: "أصدقاء", nameEn: "Friends", visitors: 10, months: 12, business: false, prices: { USD: 25, SAR: 95, SDG: 65000 } },
    { id: "company", nameAr: "شركات", nameEn: "Company", visitors: 20, months: 12, business: true, prices: { USD: 60, SAR: 225, SDG: 150000 } }
  ],
  sideRoom: { USD: 8, SAR: 30, SDG: 20000 },
  hideCredit: { USD: 10, SAR: 38, SDG: 25000 },
  contact: { whatsapp: "" },
  bank: { name: "بنكك", account: "", holder: "", note: "" }
};
export async function loadPricing() {
  try { const s = await getDoc(doc(db, "settings", "pricing")); if (s.exists()) return Object.assign({}, DEFAULT_PRICING, s.data()); } catch (e) {}
  return DEFAULT_PRICING;
}
export function priceOf(pr, g) {
  const pk = pr.packages.find(p => p.id === g.packageId); if (!pk) return 0;
  let v = Number(pk.prices?.[g.currency] || 0); if (g.sideRoom) v += Number(pr.sideRoom?.[g.currency] || 0);
  if (g.hideCredit && g.type === "company") v += Number(pr.hideCredit?.[g.currency] || 0); return v;
}
export function applyDiscount(total, d, cur) {
  if (!d) return { total, off: 0 };
  let off = d.type === "percent" ? total * Math.min(100, Number(d.value)) / 100 : (d.currency === cur ? Number(d.value) : 0);
  off = Math.min(total, Math.max(0, off)); return { total: Math.round((total - off) * 100) / 100, off: Math.round(off * 100) / 100 };
}
export function discountValid(d) {
  if (!d || d.active === false) return false;
  if (d.expiresAt && d.expiresAt.toMillis && d.expiresAt.toMillis() < Date.now()) return false;
  if (d.maxUses && (d.used || 0) >= d.maxUses) return false;
  return true;
}
export function museumUrl(gid) { const u = new URL("museum.html", location.href); u.search = "?g=" + encodeURIComponent(gid); return u.toString(); }
export function waShare(text) { return "https://wa.me/?text=" + encodeURIComponent(text); }
export function authError(e, lang) {
  const m = { "auth/invalid-email": ["البريد غير صحيح", "Invalid email"], "auth/user-not-found": ["لا يوجد حساب بهذا البريد", "No account with this email"],
    "auth/wrong-password": ["كلمة المرور غير صحيحة", "Wrong password"], "auth/invalid-credential": ["البريد أو كلمة المرور غير صحيحة", "Email or password is incorrect"],
    "auth/email-already-in-use": ["هذا البريد مسجل من قبل، سجّل الدخول", "This email is already registered, sign in instead"],
    "auth/weak-password": ["كلمة المرور قصيرة، ٦ أحرف على الأقل", "Password too short, at least 6 characters"],
    "auth/popup-closed-by-user": ["أُغلقت نافذة قوقل قبل إكمال الدخول", "The Google window was closed"],
    "auth/unauthorized-domain": ["هذا النطاق غير مضاف في إعدادات Firebase", "This domain is not authorized in Firebase"],
    "auth/network-request-failed": ["تحقق من اتصال الإنترنت", "Check your internet connection"] }[e?.code];
  return m ? m[lang === "ar" ? 0 : 1] : (lang === "ar" ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, try again") + (e?.code ? ` (${e.code})` : "");
}

// Installable app (PWA)
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register(new URL("sw.js", document.baseURI)).catch(() => {}));
export let installPrompt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; dispatchEvent(new Event("ag-installable")); });
export async function promptInstall() { if (!installPrompt) return false; installPrompt.prompt(); const r = await installPrompt.userChoice; installPrompt = null; return r.outcome === "accepted"; }
