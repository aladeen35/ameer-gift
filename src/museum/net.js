// Museum data: public teaser, PIN -> vault, photos, likes/comments, live presence and visit counting.
import { auth, db, fs, au, vaultKey, latinDigits } from "../shared.js";
import { getDatabase, ref, onValue, set, update, remove, onDisconnect, get, serverTimestamp as rtNow, connectDatabaseEmulator } from "firebase/database";
import { app, EMU } from "../shared.js";
import { CONFIG } from "../config.js";

export async function ensureUser() {
  await auth.authStateReady?.();
  if (auth.currentUser) return auth.currentUser;
  const c = await au.signInAnonymously(auth);
  return c.user;
}

export async function loadTeaser(gid) {
  const s = await fs.getDoc(fs.doc(db, "teasers", gid));
  return s.exists() ? s.data() : null;
}
export async function loadContact() {
  try { const s = await fs.getDoc(fs.doc(db, "settings", "pricing")); return s.exists() ? (s.data().contact || {}) : {}; } catch (e) { return {}; }
}

// Returns {key, vault} or throws {code:"wrong"|"closed"|"network"}
export async function openVault(gid, pin) {
  const key = await vaultKey(gid, latinDigits(pin));
  try {
    const s = await fs.getDoc(fs.doc(db, "vaults", key));
    if (!s.exists()) throw Object.assign(new Error("wrong"), { code: "wrong" });
    return { key, vault: s.data() };
  } catch (e) {
    if (e.code === "wrong") throw e;
    if (e.code === "permission-denied") throw Object.assign(new Error("wrong"), { code: "wrong" });
    throw Object.assign(new Error("network"), { code: "network" });
  }
}
// The owner (signed in on the main site) can open their museum without typing the code
export async function ownerKey(gid) {
  const u = auth.currentUser; if (!u || u.isAnonymous) return null;
  try { const s = await fs.getDoc(fs.doc(db, "galleries", gid, "private", "access")); return s.exists() ? s.data() : null; } catch (e) { return null; }
}

export async function loadPhotos(key) {
  const s = await fs.getDocs(fs.collection(db, "vaults", key, "photos"));
  return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || a.id.localeCompare(b.id));
}

/* ---------- likes & comments ---------- */
export function watchSocial(key, cb) {
  return fs.onSnapshot(fs.collection(db, "vaults", key, "social"), snap => {
    const v = {}; snap.docs.forEach(d => { v[d.id] = d.data(); }); cb(v);
  }, () => cb(null));
}
export async function saveMine(key, me) {
  const uid = auth.currentUser?.uid; if (!uid) return false;
  await fs.setDoc(fs.doc(db, "vaults", key, "social", uid), {
    name: (me.name || "").slice(0, 18), photo: me.photo || "", likes: me.likes || {}, comments: (me.comments || []).slice(-40), at: fs.serverTimestamp(),
  });
  return true;
}
// owner moderation: remove one comment from someone's record
export async function deleteComment(key, uid, at) {
  const r = fs.doc(db, "vaults", key, "social", uid); const s = await fs.getDoc(r); if (!s.exists()) return;
  const d = s.data(); await fs.updateDoc(r, { comments: (d.comments || []).filter(c => c.at !== at) });
}

/* ---------- visits ---------- */
export async function countVisit(gid) {
  const k = "ag-visit-" + gid; try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch (e) {}
  const r = fs.doc(db, "visits", gid);
  try { await fs.updateDoc(r, { count: fs.increment(1), last: fs.serverTimestamp() }); }
  catch (e) { try { await fs.setDoc(r, { count: 1, last: fs.serverTimestamp() }); } catch (x) {} }
}

/* ---------- live presence (Realtime Database) ---------- */
export class Presence {
  constructor(key) { this.key = key; this.peers = {}; this.ok = false; this.last = 0; this.lastSent = null; }
  async start(me, capacity, onPeers) {
    if (!CONFIG.firebase.databaseURL) return { ok: false };
    try {
      this.rtdb = getDatabase(app);
      if (EMU && !Presence.emu) { connectDatabaseEmulator(this.rtdb, "127.0.0.1", 9000); Presence.emu = true; }
      this.uid = auth.currentUser.uid;
      this.base = ref(this.rtdb, `presence/${this.key}`);
      const snap = await Promise.race([get(this.base), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000))]);
      const now = Date.now(); const others = Object.entries(snap.val() || {}).filter(([k, v]) => k !== this.uid && v && now - (v.t || 0) < 60000);
      if (capacity && others.length >= capacity) return { ok: false, full: true };
      this.mine = ref(this.rtdb, `presence/${this.key}/${this.uid}`);
      await onDisconnect(this.mine).remove();
      await set(this.mine, { ...me, t: rtNow() });
      this.unsub = onValue(this.base, s => { const v = s.val() || {}; delete v[this.uid]; this.peers = v; onPeers?.(v); });
      this.ok = true;
      // heartbeat so stale entries (crashed tabs) can be ignored
      this.hb = setInterval(() => { if (this.ok) update(this.mine, { t: rtNow() }).catch(() => {}); }, 20000);
      return { ok: true };
    } catch (e) { console.warn("presence off", e?.message); return { ok: false }; }
  }
  // ~10 Hz, only when something changed
  send(state, force) {
    if (!this.ok) return; const t = performance.now(); if (!force && t - this.last < 100) return;
    const key = JSON.stringify(state); if (!force && key === this.lastSent) return;
    this.last = t; this.lastSent = key; update(this.mine, state).catch(() => {});
  }
  async stop() { this.ok = false; clearInterval(this.hb); this.unsub?.(); try { await remove(this.mine); } catch (e) {} }
}
