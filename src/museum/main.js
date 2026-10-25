// Ameer Gift — the 3D memories museum (museum.html?g=<galleryId>)
// Flow: teaser -> waiting page (countdown) -> access code -> character picker at the entrance -> the hall.
import "./museum.css";
import * as THREE from "three";
import { T, OPT, makeI18n } from "./i18n.js";
import { detectTier, PRESETS, saveTier, FpsGuard } from "./quality.js";
import { makeRenderer, makeEnvironment, Post } from "./render.js";
import { buildHall, layout, makeFrames, hangPainting, TEMPLATES, RW, RD, RH } from "./hall.js";
import { buildEntrance } from "./entrance.js";
import { AvatarLib, Avatar } from "./avatars.js";
import { demoPhotos, paintCanvas, setEmptyText } from "./demoArt.js";
import { canvasTex, dedicationCanvas, plaqueCanvas } from "./textures.js";
import { Sound } from "./audio.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const DEMO = params.has("demo");
const BASE = new URL(".", location.href).href;
const reduceMotion = () => document.documentElement.classList.contains("reduce") || matchMedia("(prefers-reduced-motion: reduce)").matches;
let lang = params.get("lang") || (() => { try { return localStorage.getItem("ag-lang"); } catch (e) { return null; } })() || (/^ar/i.test(navigator.language || "ar") ? "ar" : "en");
const I = makeI18n(lang); const t = k => T[I.lang][k];
let net = null; // Firebase helpers, loaded lazily (demo mode never touches the network)

/* ---------- quality & renderer ---------- */
const tierInfo = detectTier();
let tier = tierInfo.tier;
const Q = { ...PRESETS[tier], tier };
const canvas = $("#gl");
let R;
try { R = makeRenderer(canvas, Q); } catch (e) { fatal(t("loadErr")); throw e; }
const env = makeEnvironment(R);
const post = new Post(R, Q);
const sound = new Sound();
const lib = new AvatarLib(BASE);
const clock = new THREE.Timer(); clock.connect?.(document);
const fpsGuard = new FpsGuard(fps => {
  if (!tierInfo.auto || tier === "low") return;
  const next = tier === "high" ? "medium" : "low"; saveTier(next); fpsGuard.enabled = false;
  console.info(`low frame rate (${fps.toFixed(0)} fps), next visit uses "${next}"`);
});

/* ---------- app state ---------- */
const S = {
  mode: "load", gid: params.get("g") || "", teaser: null, vault: null, key: null, isOwner: false, photos: [], arts: [], tpl: params.get("tpl") || "classic", sideRoom: params.has("side"),
  logo: "", hideCredit: false, social: {}, seen: new Set(), openArt: null, nearArt: null,
};
const me = { name: "", photo: "", likes: {}, comments: [], kind: "man", variant: 0, look: [1, 0, 0], h: 1 };
try { Object.assign(me, JSON.parse(localStorage.getItem("ag-me") || "{}"), { likes: {}, comments: [] }); } catch (e) {}

let hall = null, frames = null, sceneHall = null, entrance = null, scene = null, camera = null;
const camHall = new THREE.PerspectiveCamera(56, 1, 0.05, 80);
const camIntro = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
let my = null; // my avatar
const ghosts = new Map(); let presence = null;

/* ---------- small UI helpers ---------- */
function loaderMsg(m, p) {
  const l = $("#loader"); if (!l) return; if (l.classList.contains("hidden")) { l.classList.remove("hidden"); l.style.opacity = 1; }
  $("#lmsg").textContent = m; if (p != null) $("#lbar").style.width = Math.round(p * 100) + "%";
}
function hideLoader() { const l = $("#loader"); if (!l || l.classList.contains("hidden")) return; l.style.opacity = 0; setTimeout(() => { if (l.style.opacity === "0") l.classList.add("hidden"); }, 500); }
function showScreen(id) { ["msg", "soon", "pin", "intro", "hud"].forEach(s => $("#" + s).classList.toggle("hidden", s !== id)); }
function message(title, text, acts = []) {
  S.mode = "msg"; hideLoader(); showScreen("msg"); document.body.classList.add("blurred");
  $("#msgT").textContent = title; $("#msgP").textContent = text;
  $("#msgActs").replaceChildren(...acts.map(a => { const el = document.createElement(a.href ? "a" : "button"); el.className = a.primary ? "primary" : "ghostbtn"; el.textContent = a.label; if (a.href) { el.href = a.href; el.target = "_blank"; el.rel = "noopener"; } else el.onclick = a.onclick; return el; }));
}
function fatal(m) { $("#lmsg").textContent = m; const b = document.createElement("button"); b.className = "primary"; b.style.marginTop = "12px"; b.textContent = t("retry"); b.onclick = () => location.reload(); $("#loader .inner")?.append(b); }
function fadeTo(fn) { const f = $("#fade"); if (reduceMotion()) { fn(); return; } f.style.opacity = 1; setTimeout(() => { fn(); requestAnimationFrame(() => { f.style.opacity = 0; }); }, 650); }
const dateText = d => { if (!d) return ""; const dt = new Date(String(d).length <= 10 ? d + "T12:00:00" : d); if (isNaN(dt)) return I.num(d); return new Intl.DateTimeFormat(I.lang === "ar" ? "ar-EG" : "en-GB", { year: "numeric", month: "long" }).format(dt); };
function setLogos() {
  const company = S.logo; const dark = company || "logo-full-light.png", light = company || "logo-full.png";
  $$("[data-logo]").forEach(i => { i.src = i.closest("#soon,#msg,#loader") && !company ? dark : light; i.alt = company ? (S.vault?.company?.name || "") : "هدايا أمير — Ameer Gift"; });
  $("#loaderLogo").src = company || "logo-full-light.png";
  $$("[data-logo-icon]").forEach(i => { i.src = company || "logo-icon.png"; });
  $("#credit").classList.toggle("hidden", !company || S.hideCredit);
}

/* ---------- language ---------- */
function applyLang() {
  const L = I.lang; document.documentElement.lang = L; document.documentElement.dir = L === "ar" ? "rtl" : "ltr";
  try { localStorage.setItem("ag-lang", L); } catch (e) {}
  setEmptyText(L === "ar" ? "صورتك القادمة هنا" : "Your next photo goes here", L === "ar" ? "rtl" : "ltr");
  const title = museumTitle();
  document.title = `${title} — ${L === "ar" ? "هدايا أمير" : "Ameer Gift"}`;
  $$("[data-lang]").forEach(b => { b.textContent = t("lang"); b.setAttribute("aria-label", t("langAria")); });
  $("#sTitle").textContent = S.revealed ? t("openNow") : title; $("#sLine").innerHTML = lineHTML();
  t("units").forEach((u, i) => { $("#cl" + i).textContent = u; }); $("#remind").textContent = t("remind"); $("#gcal").textContent = t("gcal"); $("#ics").textContent = t("ics");
  $("#pinT").textContent = t("pinT"); $("#pinP").textContent = t("pinP"); $("#pinGo").textContent = t("pinGo");
  $("#iTitle").textContent = title; $("#iLine").innerHTML = lineHTML(); $("#sheetH").textContent = t("pick");
  $$("#who button span").forEach((s, i) => { s.textContent = t("who")[i]; });
  $$("#height button").forEach((b, i) => { b.textContent = t("heights")[i]; });
  $("#rSkin").textContent = t("skin"); $("#rHair").textContent = t("hair"); $("#rOutfit").textContent = t("outfit");
  if (!me.photo) $("#avtxt").textContent = t("photo"); $("#avfile").setAttribute("aria-label", t("photoAria"));
  $("#name").placeholder = t("name"); $("#name").setAttribute("aria-label", t("nameAria")); $("#enter").textContent = t("enter");
  $$(".sw button").forEach(b => { const k = b.dataset.key, i = +b.dataset.i; const lb = OPT[k][i][L === "ar" ? 1 : 2]; b.setAttribute("aria-label", lb); b.title = lb; });
  $("#hTitle").textContent = title; $("#hint").innerHTML = t("hint");
  $("#tEmote").setAttribute("aria-label", t("emote")); $("#tSound").setAttribute("aria-label", t("sound")); $("#tSound").textContent = sound.muted ? "🔇" : "🔊";
  $("#tFull").setAttribute("aria-label", t("full")); $("#tFull").textContent = "⛶"; $("#tSet").setAttribute("aria-label", t("settings")); $("#tSet").textContent = "⚙";
  $("#setT").textContent = t("settings"); $("#setQ").textContent = t("quality"); $$("#qseg button").forEach(b => { b.textContent = t("q")[b.dataset.q]; b.setAttribute("aria-pressed", String(b.dataset.q === tier)); });
  $("#setL").textContent = t("langL"); $("#setM").textContent = t("motion"); $("#setMotion").textContent = reduceMotion() ? t("on") : t("off"); $("#setMotion").setAttribute("aria-pressed", String(reduceMotion()));
  $("#setInfo").textContent = tierInfo.auto ? t("auto") : ""; $("#setCred").textContent = t("credits"); $("#exit").textContent = t("exit"); $("#setClose").textContent = t("close");
  $("#vclose").textContent = t("back"); $("#ctext").placeholder = t("cph"); $("#ctext").setAttribute("aria-label", t("caria")); $("#csend").textContent = t("send");
  $("#sit").textContent = my?.sitting ? t("stand") : t("sit");
  updateSoonDate(); lastCd = "";
  // 3D text
  if (entrance) entrance.setTitle(title);
  redrawPlaques(); drawDedication();
  updateCount(); updatePeople(); updateVariantText();
  if (S.nearArt) showView(S.nearArt);
  if (S.openArt) openViewer(S.openArt, true);
}
function museumTitle() { const v = S.vault || S.teaser; if (DEMO && !v) return t("demoTitle"); return (v?.title) || t("defTitle"); }
function names() { const v = S.vault || S.teaser || {}; return { r: v.recipient || (DEMO ? t("demoTo") : ""), s: v.sender || (DEMO ? t("demoFrom") : "") }; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function lineHTML() { const n = names(); return n.r && n.s ? T[I.lang].line(esc(n.s), esc(n.r)) : ""; }
$$("[data-lang]").forEach(b => b.addEventListener("click", () => { I.lang = I.lang === "ar" ? "en" : "ar"; applyLang(); }));

/* ---------- waiting page ---------- */
let lastCd = "";
function openAtMs() { const o = (S.vault || S.teaser)?.openAt; return DEMO ? S.demoOpenAt : (o?.toMillis ? o.toMillis() : 0); }
function updateSoonDate() {
  const ms = openAtMs(); if (!ms) return;
  const f = new Intl.DateTimeFormat(I.lang === "ar" ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
  $("#sDate").textContent = t("opensOn") + f.format(new Date(ms));
  const z = x => new Date(x).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const title = T[I.lang].calTitle(museumTitle()), link = location.href.split("#")[0];
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: z(ms) + "/" + z(ms + 3600e3), details: link });
  $("#gcal").href = "https://calendar.google.com/calendar/render?" + q.toString();
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ameer Gift//AR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "UID:" + (S.gid || "demo") + "-" + ms + "@ameergift", "DTSTAMP:" + z(Date.now()), "DTSTART:" + z(ms), "DTEND:" + z(ms + 3600e3),
    "SUMMARY:" + title.replace(/[,;]/g, " "), "DESCRIPTION:" + link, "URL:" + link, "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:" + title.replace(/[,;]/g, " "), "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const old = $("#ics").href; if (old.startsWith("blob:")) URL.revokeObjectURL(old);
  $("#ics").href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
}
function tickSoon() {
  const ms = Math.max(0, openAtMs() - Date.now()); const s = Math.floor(ms / 1000);
  const v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
  const k = v.join(":") + I.lang; if (k !== lastCd) { lastCd = k; v.forEach((n, i) => { $("#cd" + i).textContent = I.pad(n); }); }
  if (ms <= 0 && !S.revealed) reveal();
}
function showSoon() { S.mode = "soon"; showScreen("soon"); document.body.classList.add("blurred"); scene = sceneHall; camera = camHall; post.setup(scene, camera); updateSoonDate(); tickSoon(); hideLoader(); }
function reveal() {
  S.revealed = true; document.body.classList.remove("blurred"); $("#soon").classList.add("opened"); $("#sTitle").textContent = t("openNow");
  setTimeout(() => { if (S.mode === "soon") afterOpen(); }, reduceMotion() ? 200 : 2600);
}
$("#remind").onclick = () => { const o = $("#remopts"); o.classList.toggle("hidden"); $("#remind").setAttribute("aria-expanded", String(!o.classList.contains("hidden"))); };

/* ---------- access code ---------- */
const pinInputs = $$(".pins input");
pinInputs.forEach((inp, i) => {
  inp.addEventListener("input", () => { inp.value = inp.value.replace(/[^0-9٠-٩۰-۹]/g, "").slice(-1); if (inp.value && i < 3) pinInputs[i + 1].focus(); if (pinInputs.every(x => x.value)) $("#pinForm").requestSubmit(); });
  inp.addEventListener("keydown", e => { if (e.key === "Backspace" && !inp.value && i > 0) pinInputs[i - 1].focus(); });
  inp.addEventListener("paste", e => { const d = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4); if (d.length) { e.preventDefault(); d.split("").forEach((c, k) => { pinInputs[k].value = c; }); if (d.length === 4) $("#pinForm").requestSubmit(); } });
});
let pinFails = 0, pinBlockUntil = 0;
function showPin() { S.mode = "pin"; showScreen("pin"); document.body.classList.remove("blurred"); hideLoader(); setTimeout(() => pinInputs[0].focus(), 300); }
$("#pinForm").onsubmit = async e => {
  e.preventDefault();
  const wait = Math.ceil((pinBlockUntil - Date.now()) / 1000); if (wait > 0) { $("#pinErr").textContent = T[I.lang].pinWait(I.num(wait)); return; }
  const pin = pinInputs.map(x => x.value).join(""); if (pin.length < 4) return;
  const btn = $("#pinGo"); btn.disabled = true; btn.textContent = t("checking"); $("#pinErr").textContent = "";
  try { const r = await net.openVault(S.gid, pin); try { sessionStorage.setItem("ag-pin-" + S.gid, pin); } catch (x) {} await gotVault(r.key, r.vault); }
  catch (err) {
    if (err.code === "wrong") { pinFails++; if (pinFails >= 5) { pinBlockUntil = Date.now() + 30000 * Math.pow(2, pinFails - 5); } $("#pinErr").textContent = t("pinBad"); pinInputs.forEach(x => { x.value = ""; }); pinInputs[0].focus(); }
    else $("#pinErr").textContent = t("loadErr");
  } finally { btn.disabled = false; btn.textContent = t("pinGo"); }
};

/* ---------- boot ---------- */
async function boot() {
  applyLang(); loaderMsg(t("load"), 0.1); setLogos();
  if (DEMO) {
    S.tpl = TEMPLATES[S.tpl] ? S.tpl : "classic"; S.demoOpenAt = Date.now() + (Number(params.get("soon")) || 0) * 1000;
    S.vault = { demo: true, template: S.tpl, sideRoom: S.sideRoom, title: "", visitors: 4 };
    await fontsReady(); await buildWorld();
    S.photos = demoPhotos(); if (S.sideRoom) S.photos = S.photos.concat(demoPhotos().map(p => ({ ...p, id: p.id + "2", date: p.date.replace(/^\d{4}/, y => String(+y + 10)) })));
    await hangAll(); applyLang();
    if (params.has("shot")) return shotMode();
    if (openAtMs() > Date.now()) showSoon(); else { S.revealed = true; afterOpen(); }
    return;
  }
  if (!S.gid) { message(t("badLinkT"), t("badLinkP")); return; }
  net = await import("./net.js");
  S.auth = (await import("../shared.js")).auth;
  const userP = net.ensureUser().catch(e => { console.warn("auth", e); return null; });
  let teaser;
  try { teaser = await net.loadTeaser(S.gid); } catch (e) { fatal(t("loadErr")); return; }
  if (!teaser) { message(t("badLinkT"), t("badLinkP")); return; }
  S.teaser = teaser; S.tpl = TEMPLATES[teaser.template] ? teaser.template : "classic"; S.sideRoom = !!teaser.sideRoom; S.logo = teaser.logo || ""; S.hideCredit = !!teaser.hideCredit;
  setLogos(); applyLang(); loaderMsg(t("load"), 0.3);
  if (expired()) { await endScreen(); return; }
  await fontsReady(); await buildWorld(); loaderMsg(t("load"), 0.7);
  await userP;
  if (openAtMs() > Date.now()) { showSoon(); return; }
  S.revealed = true; afterOpen();
}
function expired() { const e = (S.vault || S.teaser)?.expiresAt; return e?.toMillis && e.toMillis() <= Date.now(); }
async function endScreen() {
  const trial = (S.vault || S.teaser)?.status === "trial";
  const contact = net ? await net.loadContact() : {};
  const acts = [{ label: t("order"), href: BASE + "index.html", primary: true }];
  if (contact.whatsapp) acts.push({ label: t("contact"), href: "https://wa.me/" + String(contact.whatsapp).replace(/\D/g, "") });
  message(trial ? t("trialEndT") : t("expiredT"), trial ? t("trialEndP") : t("expiredP"), acts);
  if (presence) presence.stop();
}
async function afterOpen() {
  if (DEMO) { S.photos.length && enterIntro(); return; }
  // owner shortcut, then a remembered code, then ask
  let access = await net.ownerKey(S.gid);
  if (access?.key) { try { const r = await net.openVault(S.gid, access.pin); return gotVault(r.key, r.vault); } catch (e) {} }
  let saved = null; try { saved = sessionStorage.getItem("ag-pin-" + S.gid); } catch (e) {}
  const p = params.get("pin") || saved;
  if (p) { try { const r = await net.openVault(S.gid, p); return gotVault(r.key, r.vault); } catch (e) {} }
  showPin();
}
async function gotVault(key, vault) {
  S.key = key; S.vault = vault; S.isOwner = !!vault.owner && vault.owner === myUid();
  S.logo = vault.company?.logo || S.logo; S.hideCredit = !!vault.hideCredit; setLogos();
  if (expired()) { await endScreen(); return; }
  showScreen(null); loaderMsg(t("load"), 0.8);
  const needRebuild = (TEMPLATES[vault.template] ? vault.template : "classic") !== S.tpl || !!vault.sideRoom !== S.sideRoom;
  S.tpl = TEMPLATES[vault.template] ? vault.template : "classic"; S.sideRoom = !!vault.sideRoom;
  if (needRebuild) await buildWorld();
  S.photos = vault.demo ? demoPhotos() : await net.loadPhotos(key).catch(() => []);
  await hangAll(); applyLang();
  sound.setMusic(vault.music);
  let first = true;
  net.watchSocial(key, v => {
    if (!v) return; S.social = v; const m = v[myUid()];
    if (first && m) { me.likes = { ...(m.likes || {}) }; me.comments = (m.comments || []).slice(-40); }
    first = false; renderSocialIfOpen();
  });
  net.countVisit(S.gid);
  if (vault.status === "trial" && vault.expiresAt?.toMillis) S.trialEnd = vault.expiresAt.toMillis();
  enterIntro();
}
async function fontsReady() { try { await Promise.race([Promise.all([document.fonts.load("600 40px 'Reem Kufi'", "هدايا"), document.fonts.load("500 30px 'IBM Plex Sans Arabic'", "هدايا")]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {} }

/* ---------- world ---------- */
async function buildWorld() {
  if (sceneHall) { sceneHall.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); } }); }
  sceneHall = new THREE.Scene(); sceneHall.environment = env; sceneHall.environmentIntensity = 0.45;
  hall = buildHall({ scene: sceneHall, tpl: S.tpl, sideRoom: S.sideRoom, quality: Q, renderer: R, logoUrl: S.logo || "logo-full-clear.png" });
  frames = makeFrames(hall.root, hall.gold);
  S.arts = []; S.nearArt = null;
  entrance = buildEntrance({ C: hall.C, quality: Q, title: museumTitle() }); entrance.scene.environment = env; entrance.scene.environmentIntensity = 0.5;
  scene = sceneHall; camera = camHall; post.setup(scene, camera); resize();
}
function loadImage(src) { return new Promise(res => { const im = new Image(); im.decoding = "async"; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
async function hangAll() {
  const slots = layout(S.sideRoom);
  const list = S.photos.slice(0, slots.length);
  // decode images first so every frame gets the right shape
  const imgs = await Promise.all(list.map(p => (p.img ? loadImage(p.img) : Promise.resolve(null))));
  const ctx = { root: hall.root, parts: hall.parts, obstacles: hall.obstacles, inst: frames, C: hall.C, gold: hall.gold, trimM: hall.trimM };
  S.arts = [];
  list.forEach((p, i) => {
    const im = imgs[i]; let tex = null, aspect = p.portrait ? 0.75 : 4 / 3, canvasSrc = null;
    if (im) { tex = new THREE.Texture(im); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Q.anisotropy; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true; aspect = im.naturalWidth / im.naturalHeight; }
    else if (p.paint) { canvasSrc = paintCanvas(p.paint, p.portrait); tex = canvasTex(canvasSrc, { aniso: Q.anisotropy }); }
    const a = { ...p, aspect, texture: tex, canvasSrc, titleShown: artTitle(p) };
    const h = hangPainting(ctx, slots[i], a, Q, I.lang, dateText(p.date));
    Object.assign(a, h); a.url = p.img || (canvasSrc ? canvasSrc.toDataURL("image/jpeg", 0.9) : "");
    S.arts.push(a);
  });
  // the dedication card counts as the first stop
  const d = hall.ded; S.ded = { id: "ded", ded: true, mesh: d.mesh, pos: d.pos, n: new THREE.Vector3(0, 0, 1) };
  drawDedication();
  updateCount();
}
const artTitle = a => (I.lang === "en" && a.titleEn ? a.titleEn : a.title) || "";
const artCaption = a => (I.lang === "en" && a.captionEn ? a.captionEn : a.caption) || "";
function redrawPlaques() {
  for (const a of S.arts) {
    a.titleShown = artTitle(a); if (!a.ptex) continue;
    const c = plaqueCanvas(a.titleShown, dateText(a.date), I.lang, hall.C.accent); a.ptex.image = c; a.ptex.needsUpdate = true;
    if (a.paint === "empty" && a.canvasSrc) { const nc = paintCanvas("empty", a.portrait); a.mesh.material.map.image = nc; a.mesh.material.map.needsUpdate = true; a.url = nc.toDataURL("image/jpeg", 0.9); }
  }
}
function dedicationLines() {
  const v = S.vault || {}; const n = names();
  if (v.dedication) { const sig = n.s ? (I.lang === "ar" ? "— " : "— ") + n.s : ""; return [T[I.lang].dedTitle(n.r || ""), v.dedication, sig]; }
  return T[I.lang].ded(n.r || "", n.s || "");
}
function drawDedication() {
  if (!hall?.ded) return; const c = dedicationCanvas(dedicationLines(), I.lang); hall.ded.tex.image = c; hall.ded.tex.needsUpdate = true;
  if (S.ded) { S.ded.url = c.toDataURL("image/jpeg", 0.9); S.ded.title = dedicationLines()[0]; S.ded.caption = dedicationLines().slice(1).join("\n"); }
}

/* ---------- character picker (entrance) ---------- */
const KINDS = ["man", "woman", "boy", "girl"];
function variants() { return Q.avatars === "real" ? lib.variants(me.kind) : []; }
function updateVariantText() { const v = variants(); $("#variant").textContent = v.length > 1 ? T[I.lang].look(I.num(me.variant + 1), I.num(v.length)) : ""; $("#carousel").classList.toggle("hidden", v.length < 2); $("#liteLook").classList.toggle("hidden", Q.avatars === "real" && v.length > 0); }
function avatarSpec() { const v = variants(); const id = v.length ? v[Math.min(me.variant, v.length - 1)].id : null; return { kind: me.kind, id, look: me.look, h: me.h, name: me.name, photo: me.photo }; }
let swapToken = 0;
async function refreshMyAvatar() {
  const tok = ++swapToken; const spec = avatarSpec();
  const a = new Avatar(lib, spec, { shadows: Q.shadows, real: Q.avatars === "real" });
  await a.load(); if (tok !== swapToken) { a.dispose(); return; }
  const old = my; my = a;
  if (old) { a.root.position.copy(old.root.position); a.root.rotation.copy(old.root.rotation); old.dispose(); }
  (S.mode === "museum" ? sceneHall : entrance.scene).add(my.root);
  if (S.mode !== "museum") { my.root.position.set(0, 0.12, 2.1); }
  updateVariantText(); savePrefs();
}
function savePrefs() { try { localStorage.setItem("ag-me", JSON.stringify({ name: me.name, photo: me.photo, kind: me.kind, variant: me.variant, look: me.look, h: me.h })); } catch (e) {} }
function buildSwatches() {
  ["skin", "hair", "outfit"].forEach((key, ki) => { const el = $("#sw-" + key); el.replaceChildren();
    OPT[key].forEach(([hex], i) => { const b = document.createElement("button"); b.style.background = hex; b.dataset.key = key; b.dataset.i = i; b.setAttribute("aria-pressed", String(i === me.look[ki]));
      b.onclick = () => { me.look[ki] = i; el.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String(j === i))); my?.applyLook(me.look); savePrefs(); }; el.append(b); }); });
}
$$("#who button").forEach(b => b.onclick = () => { me.kind = b.dataset.who; me.variant = 0; $$("#who button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); refreshMyAvatar(); });
$$("#height button").forEach(b => b.onclick = () => { me.h = +b.dataset.h; $$("#height button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); my?.setHeightScale(me.h); savePrefs(); });
$("#prevAv").onclick = () => { const n = variants().length; if (n) { me.variant = (me.variant + n - 1) % n; refreshMyAvatar(); } };
$("#nextAv").onclick = () => { const n = variants().length; if (n) { me.variant = (me.variant + 1) % n; refreshMyAvatar(); } };
$("#avfile").addEventListener("change", e => {
  const f = e.target.files?.[0]; if (!f) return; const url = URL.createObjectURL(f); const im = new Image();
  im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 112; const g = c.getContext("2d"); const s = Math.min(im.width, im.height); g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 112, 112); me.photo = c.toDataURL("image/jpeg", 0.72); URL.revokeObjectURL(url); showAvatarPhoto(); my?.setLabel(me.name, me.photo); savePrefs(); };
  im.onerror = () => URL.revokeObjectURL(url); im.src = url;
});
function showAvatarPhoto() { const b = $("#avbtn"); let i = b.querySelector("img"); if (!me.photo) { i?.remove(); return; } if (!i) { i = document.createElement("img"); i.alt = ""; b.append(i); } i.src = me.photo; $("#avtxt").textContent = ""; }
$("#name").addEventListener("input", () => { me.name = $("#name").value.trim().slice(0, 18); });
$("#name").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); enter(); } });
$("#enter").onclick = () => enter();
let introAuto = true, entering = null;

async function enterIntro() {
  loaderMsg(t("loadAv"), 0.9);
  await lib.init();
  $$("#who button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.who === me.kind)));
  $$("#height button").forEach(x => x.setAttribute("aria-pressed", String(+x.dataset.h === me.h)));
  $("#name").value = me.name || ""; showAvatarPhoto(); buildSwatches();
  await refreshMyAvatar();
  if (Q.avatars === "real") { const v = lib.variants(me.kind)[0]; if (v) lib.clips(v.g); } // warm the clip cache
  toIntro(); hideLoader(); applyLang();
  if (S.trialEnd) setInterval(() => { if (Date.now() >= S.trialEnd && S.mode !== "msg") endScreen(); updateCount(); }, 15000);
}
function toIntro() {
  if (presence) { presence.stop(); presence = null; ghosts.forEach(g => g.dispose()); ghosts.clear(); }
  S.mode = "intro"; scene = entrance.scene; camera = camIntro; post.setup(scene, camera, { bloom: false, ao: false }); document.body.classList.remove("blurred");
  entrance.scene.add(my.root); my.root.position.set(0, 0.12, 2.1); my.root.rotation.y = 0; my.sitting = false; my.setLabel("", "");
  entering = null; introAuto = true; entrance.doors.forEach(d => { d.pivot.rotation.y = 0; });
  showScreen("intro"); $("#sheet").classList.remove("away"); $("#viewer").classList.add("hidden"); resize();
}
function enter() {
  if (S.mode !== "intro" || entering) return;
  sound.unlock();
  me.name = $("#name").value.trim().slice(0, 18); $("#name").blur(); savePrefs();
  $("#sheet").classList.add("away"); introAuto = false; entering = { t: 0, start: my.root.rotation.y }; resize();
}

/* ---------- museum ---------- */
const P = { x: 0, z: 10.6, yaw: Math.PI, camYaw: 0, camPitch: 0.2, camYawT: 0, camPitchT: 0.2, zoom: 1, zoomT: 1, vx: 0, vz: 0, sp: 0, dist: 0, sitting: false, sitIdx: -1, fly: null, intro: 0 };
async function toMuseum() {
  S.mode = "museum"; scene = sceneHall; camera = camHall; post.setup(scene, camera);
  sceneHall.add(my.root); Object.assign(P, { x: 0, z: 10.6, yaw: Math.PI, camYaw: 0, camYawT: 0, camPitch: 0.2, camPitchT: 0.2, vx: 0, vz: 0, sp: 0, sitting: false, sitIdx: -1, fly: null, intro: reduceMotion() ? 0 : 2.4 });
  my.root.position.set(P.x, 0, P.z); my.root.rotation.y = P.yaw; my.setLabel(me.name, me.photo);
  camLook.set(0, 1.6, 6); camHall.position.set(0, 3.6, 12.6);
  showScreen("hud"); $("#hint").style.opacity = 1; setTimeout(() => { $("#hint").style.opacity = 0; }, 8000);
  updateCount(); resize();
  if (!DEMO && S.key && net) {
    presence = new net.Presence(S.key);
    const r = await presence.start(presenceState(true), S.vault.visitors || 4, peers => syncGhosts(peers));
    if (r.full) { presence = null; message(t("fullT"), T[I.lang].fullP(I.num(S.vault.visitors || 4)), [{ label: t("retry"), primary: true, onclick: () => { showScreen("intro"); toIntro(); } }]); return; }
  }
  updatePeople();
}
function presenceState(full) {
  const s = { x: Math.round(P.x * 100) / 100, z: Math.round(P.z * 100) / 100, y: Math.round(P.yaw * 100) / 100, s: Math.round(P.sp * 10) / 10, st: P.sitting ? 1 : 0 };
  if (full) Object.assign(s, { n: me.name, p: me.photo || "", k: me.kind, v: avatarSpec().id || "", lk: me.look, h: me.h });
  return s;
}

/* ---------- input ---------- */
const keys = new Set();
addEventListener("keydown", e => { if (document.activeElement?.tagName === "INPUT") return; keys.add(e.key.toLowerCase()); if (e.key === "Escape" && S.openArt) closeViewer(); });
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
const joy = $("#joy"), knob = joy.querySelector("i"), joyV = new THREE.Vector2(); let joyId = null;
joy.addEventListener("pointerdown", e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joy.classList.add("active"); moveJoy(e); e.stopPropagation(); sound.unlock(); });
joy.addEventListener("pointermove", e => { if (e.pointerId === joyId) moveJoy(e); });
const endJoy = e => { if (e.pointerId !== joyId) return; joyId = null; joyV.set(0, 0); knob.style.transform = ""; joy.classList.remove("active"); };
joy.addEventListener("pointerup", endJoy); joy.addEventListener("pointercancel", endJoy);
function moveJoy(e) { const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const m = Math.hypot(dx, dy), M = 46; if (m > M) { dx *= M / m; dy *= M / m; } knob.style.transform = `translate(${dx}px,${dy}px)`; joyV.set(dx / M, dy / M); $("#hint").style.opacity = 0; }
const pointers = new Map(); let drag = null, pinch = null, lastTap = 0;
canvas.addEventListener("pointerdown", e => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); sound.unlock();
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: P.zoomT }; drag = null; return; }
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
});
canvas.addEventListener("pointermove", e => {
  if (!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); P.zoomT = THREE.MathUtils.clamp(pinch.z * pinch.d / Math.max(20, d), 0.45, 1.7); return; }
  if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (S.mode === "intro" && !entering) { introAuto = false; my.root.rotation.y += dx * 0.012; }
  else if (S.mode === "museum") { P.camYawT -= dx * 0.006 * (I.lang === "ar" ? 1 : 1); P.camPitchT = THREE.MathUtils.clamp(P.camPitchT + dy * 0.004, -0.05, 0.85); if (Math.abs(dx) > 2) $("#hint").style.opacity = 0; }
});
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function endPointer(e) {
  pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null;
  if (!drag || e.pointerId !== drag.id) return; const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy), dt = performance.now() - drag.t; drag = null;
  if (S.mode !== "museum" || moved > 10 || dt > 400) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camHall);
  const targets = [...S.arts, S.ded].filter(Boolean); const hit = ray.intersectObjects(targets.map(a => a.mesh))[0];
  const now = performance.now(); const dbl = now - lastTap < 350; lastTap = now;
  if (hit && hit.distance < 18) { const a = targets.find(x => x.mesh === hit.object); flyTo(a); }
  else if (dbl) P.zoomT = P.zoomT > 0.8 ? 0.6 : 1;
}
canvas.addEventListener("pointerup", endPointer); canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("wheel", e => { if (S.mode === "museum") { P.zoomT = THREE.MathUtils.clamp(P.zoomT * (1 + Math.sign(e.deltaY) * 0.1), 0.45, 1.7); e.preventDefault(); } }, { passive: false });
$("#view").onclick = () => { if (S.nearArt) flyTo(S.nearArt); };

/* toolbar */
$("#tEmote").onclick = () => { const m = $("#emotes"); m.classList.toggle("hidden"); $("#tEmote").setAttribute("aria-pressed", String(!m.classList.contains("hidden"))); };
$$("#emotes button").forEach(b => b.onclick = () => { $("#emotes").classList.add("hidden"); $("#tEmote").setAttribute("aria-pressed", "false"); const e = b.dataset.emote; if (e === "sit") toggleSit(); else doEmote(e); });
function doEmote(e) { if (!my) return; my.emote(e); presence?.send({ e, et: Date.now() }, true); }
$("#tSound").onclick = () => { sound.unlock(); sound.setMuted(!sound.muted); $("#tSound").textContent = sound.muted ? "🔇" : "🔊"; $("#tSound").setAttribute("aria-pressed", String(sound.muted)); };
$("#tFull").onclick = () => { const d = document; if (d.fullscreenElement) d.exitFullscreen?.(); else d.documentElement.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {}); };
$("#tSet").onclick = () => { applyLang(); $("#settings").showModal(); };
$("#setClose").onclick = () => $("#settings").close();
$$("#qseg button").forEach(b => b.onclick = () => { if (b.dataset.q === tier) return; saveTier(b.dataset.q); location.reload(); });
$("#setMotion").onclick = () => { document.documentElement.classList.toggle("reduce"); try { localStorage.setItem("ag-reduce", reduceMotion() ? "1" : ""); } catch (e) {} applyLang(); };
try { if (localStorage.getItem("ag-reduce")) document.documentElement.classList.add("reduce"); } catch (e) {}
$("#exit").onclick = () => { $("#settings").close(); fadeTo(() => toIntro()); };
$("#sit").onclick = () => toggleSit();

/* sitting on benches */
function nearestSeat() { let best = -1, bd = 1.6; hall.sits.forEach((s, i) => { const d = Math.hypot(s.x - P.x, s.z - P.z); if (d < bd) { bd = d; best = i; } }); return best; }
function toggleSit() {
  if (P.sitting) { P.sitting = false; const s = hall.sits[P.sitIdx]; if (s) { P.x = s.x + Math.sin(s.yaw) * 0.55; P.z = s.z + Math.cos(s.yaw) * 0.55; } P.sitIdx = -1; }
  else { const i = nearestSeat(); if (i < 0) return; const s = hall.sits[i]; P.sitting = true; P.sitIdx = i; P.x = s.x + Math.sin(s.yaw) * 0.12; P.z = s.z + Math.cos(s.yaw) * 0.12; P.yaw = s.yaw; P.vx = P.vz = 0; P.camYawT = s.yaw + Math.PI; }
  $("#sit").textContent = P.sitting ? t("stand") : t("sit"); presence?.send(presenceState(), true);
}

/* collision against the room shapes and obstacles */
function inRooms(x, z) { return hall.rooms.some(r => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]); }
function collide(ox, oz, nx, nz) {
  const r = 0.3;
  for (const o of hall.obstacles) {
    if (o.circle) { const [cx, cz, cr] = o.circle; const dx = nx - cx, dz = nz - cz, d = Math.hypot(dx, dz), m = cr + r; if (d < m && d > 1e-4) { nx = cx + dx / d * m; nz = cz + dz / d * m; } }
    else { const [x0, z0, x1, z1] = o.box; if (nx > x0 - r && nx < x1 + r && nz > z0 - r && nz < z1 + r) { const pen = [nx - (x0 - r), (x1 + r) - nx, nz - (z0 - r), (z1 + r) - nz]; const i = pen.indexOf(Math.min(...pen)); if (i === 0) nx = x0 - r; else if (i === 1) nx = x1 + r; else if (i === 2) nz = z0 - r; else nz = z1 + r; } }
  }
  if (inRooms(nx, nz)) return [nx, nz];
  if (inRooms(nx, oz)) return [nx, oz];
  if (inRooms(ox, nz)) return [ox, nz];
  // slide along the current room's edges
  const room = hall.rooms.find(rm => ox >= rm[0] && ox <= rm[2] && oz >= rm[1] && oz <= rm[3]);
  if (room) return [THREE.MathUtils.clamp(nx, room[0], room[2]), THREE.MathUtils.clamp(nz, room[1], room[3])];
  return [ox, oz];
}
// camera never goes through walls or partitions
function camClip(tx, tz, cx, cz) {
  let best = 1;
  for (const [x0, z0, x1, z1] of hall.segments) {
    const dx = cx - tx, dz = cz - tz, ex = x1 - x0, ez = z1 - z0; const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-6) continue;
    const u = ((x0 - tx) * ez - (z0 - tz) * ex) / den, v = ((x0 - tx) * dz - (z0 - tz) * dx) / den;
    if (u > 0 && u < best && v >= 0 && v <= 1) best = u;
  }
  return Math.max(0.15, best - 0.06);
}

const tgt = new THREE.Vector3(), cpos = new THREE.Vector3(), camLook = new THREE.Vector3();
let stepAcc = 0;
function stepMuseum(dt) {
  let jx = joyV.x, jy = joyV.y;
  if (keys.has("w") || keys.has("arrowup")) jy = -1; if (keys.has("s") || keys.has("arrowdown")) jy = 1;
  if (keys.has("a") || keys.has("arrowleft")) jx = -1; if (keys.has("d") || keys.has("arrowright")) jx = 1;
  const kid = me.kind === "boy" || me.kind === "girl", maxSp = (kid ? 2.0 : 2.5) * me.h, H = my.height;
  const cs = 1 - Math.exp(-dt * 10); P.camYaw += (P.camYawT - P.camYaw) * cs; P.camPitch += (P.camPitchT - P.camPitch) * cs; P.zoom += (P.zoomT - P.zoom) * cs;
  let mag = Math.min(1, Math.hypot(jx, jy)); if (mag < 0.08) mag = 0;
  if (mag && P.sitting) toggleSit();
  const s = Math.sin(P.camYaw), c = Math.cos(P.camYaw); let dx = 0, dz = 0;
  if (mag) { const fx = -s, fz = -c, rx = c, rz = -s; dx = fx * (-jy) + rx * jx; dz = fz * (-jy) + rz * jx; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; $("#hint").style.opacity = 0; }
  const tv = maxSp * Math.pow(mag, 1.15), k = mag ? 4.5 : 7, a = 1 - Math.exp(-dt * k);
  const pvx = P.vx, pvz = P.vz; P.vx += (dx * tv - P.vx) * a; P.vz += (dz * tv - P.vz) * a;
  const ox = P.x, oz = P.z; if (!P.sitting) [P.x, P.z] = collide(ox, oz, P.x + P.vx * dt, P.z + P.vz * dt);
  if (dt > 0) { P.vx = (P.x - ox) / dt; P.vz = (P.z - oz) / dt; }
  const sp = Math.hypot(P.vx, P.vz); P.sp = sp;
  const prevYaw = P.yaw;
  if (mag || sp > 0.15) { const want = mag ? Math.atan2(dx, dz) : Math.atan2(P.vx, P.vz); let d = want - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * (1 - Math.exp(-dt * (5 + sp * 2))); }
  const turnRate = Math.atan2(Math.sin(P.yaw - prevYaw), Math.cos(P.yaw - prevYaw)) / Math.max(dt, 1e-3);
  const fwx = Math.sin(P.yaw), fwz = Math.cos(P.yaw); const accel = ((P.vx - pvx) * fwx + (P.vz - pvz) * fwz) / Math.max(dt, 1e-3);
  my.root.position.set(P.x, 0, P.z); my.root.rotation.y = P.yaw;
  // footsteps every half stride
  stepAcc += sp * dt; if (stepAcc > 0.62 * me.h) { stepAcc = 0; sound.step(Math.min(1, sp / 2)); }
  // look at the nearest painting while standing near it
  const near = nearestArt(3.3);
  my.update(dt, { speed: sp, turnRate, accel, sitting: P.sitting, lookAt: near && sp < 1.6 ? near.pos : null });
  if (mag && jy < -0.35 && !drag) { let d = (P.yaw + Math.PI) - P.camYawT; d = Math.atan2(Math.sin(d), Math.cos(d)); P.camYawT += d * (1 - Math.exp(-dt * 1.1 * sp / maxSp)); }
  // camera: spring follow, pinch zoom, wall clipping, cinematic intro
  const portrait = innerWidth / innerHeight < 0.75;
  const dist = (kid ? 3.6 : 4.4) * (portrait ? 1.1 : 1) * P.zoom * (P.sitting ? 0.85 : 1);
  tgt.set(P.x, H * 0.82 + 0.35 * P.zoom, P.z);
  let ux = Math.sin(P.camYaw) * Math.cos(P.camPitch), uz = Math.cos(P.camYaw) * Math.cos(P.camPitch);
  const f = camClip(P.x, P.z, P.x + ux * dist * 1.05, P.z + uz * dist * 1.05);
  cpos.set(P.x + ux * dist * f, tgt.y + Math.sin(P.camPitch) * dist * f, P.z + uz * dist * f); cpos.y = Math.min(cpos.y, RH - 0.3);
  if (P.fly) { const fl = P.fly; fl.t += dt / fl.dur; const e = fl.t >= 1 ? 1 : 1 - Math.pow(1 - fl.t, 3); camHall.position.lerpVectors(fl.p0, fl.p1, e); camLook.lerpVectors(fl.l0, fl.l1, e); camHall.lookAt(camLook); if (fl.t >= 1 && !fl.done) { fl.done = true; openViewer(fl.art); } }
  else if (P.intro > 0) { P.intro -= dt; const e = 1 - Math.max(0, P.intro / 2.4); const k2 = e * e * (3 - 2 * e); camHall.position.lerp(cpos, 0.02 + k2 * 0.2); camLook.lerp(tgt, 0.05 + k2 * 0.25); camHall.lookAt(camLook); }
  else { const kk = reduceMotion() ? 1 : 1 - Math.exp(-dt * 8); camHall.position.lerp(cpos, kk); camLook.lerp(tgt, reduceMotion() ? 1 : 1 - Math.exp(-dt * 11)); camHall.lookAt(camLook); }
  // nearest painting button + sit button
  if (near !== S.nearArt) { S.nearArt = near; showView(near); }
  const seat = nearestSeat(); $("#sit").classList.toggle("hidden", !(P.sitting || seat >= 0));
  // shadow light follows the visitor, spotlights follow the closest paintings
  hall.key.position.set(P.x + 3, 9, P.z + 5); hall.key.target.position.set(P.x, 0, P.z);
  aimSpots(dt);
  presence?.send(presenceState());
}
function nearestArt(maxD) { let best = null, bd = maxD; for (const a of [...S.arts, S.ded]) { if (!a) continue; const d = Math.hypot(a.pos.x - P.x, a.pos.z - P.z); if (d < bd) { bd = d; best = a; } } return best; }
function showView(a) { const v = $("#view"); if (a) { v.textContent = t("view") + (a.ded ? dedicationLines()[0] : artTitle(a)); v.classList.remove("hidden"); } else v.classList.add("hidden"); }
function aimSpots(dt) {
  if (!hall.spots.length) return;
  const list = S.arts.filter(a => !a.onEasel).map(a => ({ a, d: Math.hypot(a.pos.x - P.x, a.pos.z - P.z) })).sort((x, y) => x.d - y.d).slice(0, hall.spots.length);
  hall.spots.forEach((sp, i) => {
    const it = list[i]; if (!it) { sp.intensity *= 0.9; return; }
    const a = it.a; if (sp.userData.art !== a) { sp.userData.art = a; sp.intensity = 0; }
    sp.position.set(a.pos.x + a.n.x * 1.3, RH - 0.25, a.pos.z + a.n.z * 1.3); sp.target.position.copy(a.pos);
    const want = 26 * THREE.MathUtils.clamp(1 - (it.d - 4) / 8, 0, 1); sp.intensity += (want - sp.intensity) * (1 - Math.exp(-dt * 3));
  });
}
function flyTo(a) {
  if (!a || P.fly) return; const n = a.n || new THREE.Vector3(0, 0, 1);
  const H = a.H || 0.8; const d = Math.max(1.6, H * 1.6 + 0.6);
  const p1 = a.pos.clone().addScaledVector(n, d); p1.y = a.pos.y + 0.05;
  if (reduceMotion()) { openViewer(a); return; }
  P.fly = { t: 0, dur: 0.9, p0: camHall.position.clone(), p1, l0: camLook.clone(), l1: a.pos.clone(), art: a };
}

/* ---------- viewer, likes & comments ---------- */
function stops() { return [S.ded, ...S.arts].filter(Boolean); }
function openViewer(a, refresh) {
  S.openArt = a; const isDed = !!a.ded;
  const title = isDed ? dedicationLines()[0] : artTitle(a);
  $("#vimg").src = a.url || ""; $("#vimg").alt = title; $("#vtitle").textContent = title;
  $("#vyear").textContent = isDed ? "" : dateText(a.date); $("#vcap").textContent = isDed ? dedicationLines().slice(1).join("\n") : artCaption(a);
  renderSocial(a); $("#viewer").classList.remove("hidden");
  if (!refresh) { $("#vclose").focus({ preventScroll: true }); $("#viewer").scrollTop = 0; }
  if (!isDed) { S.seen.add(a.id); updateCount(); }
  keys.clear(); joyV.set(0, 0);
}
function closeViewer() { S.openArt = null; $("#viewer").classList.add("hidden"); P.fly = null; canvas.focus(); }
$("#vclose").onclick = closeViewer;
$("#vprev").onclick = () => navViewer(I.lang === "ar" ? 1 : -1); $("#vnext").onclick = () => navViewer(I.lang === "ar" ? -1 : 1);
function navViewer(d) { const l = stops(); const i = l.indexOf(S.openArt); const n = l[(i + d + l.length) % l.length]; if (n) openViewer(n); }
let swipe = null;
$("#viewer").addEventListener("touchstart", e => { if (e.touches.length === 1) swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
$("#viewer").addEventListener("touchend", e => { if (!swipe) return; const t0 = e.changedTouches[0]; const dx = t0.clientX - swipe.x, dy = t0.clientY - swipe.y; swipe = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest(".clist,.cadd")) navViewer(dx < 0 === (I.lang === "ar") ? -1 : 1); }, { passive: true });
function myUid() { return S.auth?.currentUser?.uid || null; }
function renderSocialIfOpen() { if (S.openArt) renderSocial(S.openArt); }
function renderSocial(a) {
  const id = a.id; let n = 0; const list = []; const mine = myUid();
  for (const [vid, v] of Object.entries(S.social || {})) {
    if (vid === mine || !v) continue; if (v.likes?.[id] === true) n++;
    (Array.isArray(v.comments) ? v.comments : []).forEach(c => { if (c && c.a === id && typeof c.t === "string") list.push({ uid: vid, n: v.name || t("guest"), p: okPhoto(v.photo) ? v.photo : "", t: c.t.slice(0, 200), at: +c.at || 0 }); });
  }
  if (me.likes[id]) n++;
  me.comments.forEach(c => { if (c.a === id) list.push({ uid: mine, n: me.name || t("you"), p: me.photo, t: c.t, at: c.at }); });
  list.sort((x, y) => x.at - y.at);
  $("#like").setAttribute("aria-pressed", String(!!me.likes[id])); $("#likeN").textContent = I.num(n);
  const cl = $("#clist"); cl.replaceChildren();
  if (!list.length) { const e = document.createElement("p"); e.className = "cempty"; e.textContent = t("noC"); cl.append(e); }
  list.forEach(c => {
    const d = document.createElement("div"); d.className = "cm"; const av = document.createElement("div"); av.className = "av"; if (c.p) av.style.backgroundImage = `url("${c.p}")`; else av.textContent = String(c.n).trim().charAt(0) || "؟";
    const b = document.createElement("div"); const nm = document.createElement("b"); nm.textContent = c.n; const tx = document.createElement("p"); tx.textContent = c.t; b.append(nm, tx); d.append(av, b);
    if (c.uid === mine || S.isOwner) { const del = document.createElement("button"); del.className = "del"; del.textContent = t("del"); del.onclick = () => deleteComment(c); d.append(del); } else d.append(document.createElement("span"));
    cl.append(d);
  });
  cl.scrollTop = cl.scrollHeight; $("#snote").textContent = DEMO || S.key ? "" : "";
  $("#cform").classList.toggle("hidden", !DEMO && !mine);
}
function okPhoto(u) { return typeof u === "string" && u.length < 60000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u); }
async function persist() { if (DEMO || !net || !S.key) return; try { await net.saveMine(S.key, me); $("#snote").textContent = ""; } catch (e) { $("#snote").textContent = t("denied"); } }
$("#like").onclick = () => { const a = S.openArt; if (!a) return; if (me.likes[a.id]) delete me.likes[a.id]; else me.likes[a.id] = true; renderSocial(a); persist(); };
$("#cform").onsubmit = e => { e.preventDefault(); const tx = $("#ctext").value.trim(); const a = S.openArt; if (!tx || !a) return; me.comments.push({ a: a.id, t: tx.slice(0, 200), at: Date.now() }); me.comments = me.comments.slice(-40); $("#ctext").value = ""; renderSocial(a); persist(); };
async function deleteComment(c) {
  if (!confirm(t("delQ"))) return;
  if (c.uid === myUid()) { me.comments = me.comments.filter(x => x.at !== c.at); renderSocial(S.openArt); persist(); return; }
  try { await net.deleteComment(S.key, c.uid, c.at); } catch (e) { alert(t("denied")); }
}
function updateCount() {
  const el = $("#count"); if (!el) return; const total = S.arts.length;
  let txt = T[I.lang].seen(I.num(S.seen.size), I.num(total));
  if (S.trialEnd) txt += " · " + T[I.lang].trialBadge(I.num(Math.max(0, Math.ceil((S.trialEnd - Date.now()) / 60000))));
  el.textContent = txt;
}

/* ---------- other visitors ---------- */
async function syncGhosts(peers) {
  const seen = new Set(); const now = Date.now();
  for (const [uid, p] of Object.entries(peers || {})) {
    if (!p || typeof p.x !== "number" || !KINDS.includes(p.k)) continue; seen.add(uid);
    let g = ghosts.get(uid); const sig = [p.k, p.v, (p.lk || []).join(","), p.h].join("|");
    if (!g || g.sig !== sig) {
      g?.dispose(); const many = Object.keys(peers).length > 5;
      g = new Avatar(lib, { kind: p.k, id: p.v || null, look: Array.isArray(p.lk) ? p.lk.slice(0, 3).map(n => n | 0) : [1, 0, 0], h: THREE.MathUtils.clamp(+p.h || 1, 0.9, 1.1), name: String(p.n || "").slice(0, 18), photo: okPhoto(p.p) ? p.p : "" }, { shadows: false, real: Q.avatars === "real" && !many });
      g.sig = sig; g.gx = p.x; g.gz = p.z; g.gyaw = p.y || 0; ghosts.set(uid, g); g.load().then(() => sceneHall.add(g.root));
    }
    Object.assign(g, { tx: THREE.MathUtils.clamp(p.x, -18, RW), tz: THREE.MathUtils.clamp(p.z, -RD, RD), tyaw: +p.y || 0, tsp: +p.s || 0, tsit: !!p.st });
    if (p.et && p.et !== g.lastEt && now - p.et < 8000) { g.lastEt = p.et; g.emote(p.e); }
    const nm = String(p.n || "").slice(0, 18), ph = okPhoto(p.p) ? p.p : ""; if (g.ready && (nm !== g.spec.name || ph !== g.spec.photo)) { g.spec.name = nm; g.spec.photo = ph; g.setLabel(nm || t("guest"), ph); }
  }
  for (const [uid, g] of ghosts) if (!seen.has(uid)) { g.dispose(); ghosts.delete(uid); }
  updatePeople();
}
function updateGhosts(dt) {
  for (const g of ghosts.values()) {
    if (!g.ready) continue; const k = 1 - Math.exp(-dt * 7);
    const ox = g.gx, oz = g.gz; g.gx += (g.tx - g.gx) * k; g.gz += (g.tz - g.gz) * k; let d = g.tyaw - g.gyaw; d = Math.atan2(Math.sin(d), Math.cos(d)); g.gyaw += d * k;
    const sp = Math.hypot(g.gx - ox, g.gz - oz) / Math.max(dt, 1e-3);
    g.root.position.set(g.gx, 0, g.gz); g.root.rotation.y = g.gyaw;
    g.update(dt, { speed: g.tsit ? 0 : Math.max(sp * 0.7, g.tsp * 0.3), sitting: g.tsit });
  }
}
function updatePeople() {
  const el = $("#people"); if (!presence?.ok || S.mode !== "museum") { el.classList.add("hidden"); return; } el.classList.remove("hidden");
  const list = [{ n: me.name || t("you"), p: me.photo }]; for (const g of ghosts.values()) list.push({ n: g.spec.name || t("guest"), p: g.spec.photo });
  const dots = $("#pdots"); dots.replaceChildren(); list.slice(0, 4).forEach(x => { const d = document.createElement("span"); if (x.p) d.style.backgroundImage = `url("${x.p}")`; else d.textContent = String(x.n).trim().charAt(0) || "؟"; dots.append(d); });
  $("#pcount").textContent = list.length > 1 ? T[I.lang].people(I.num(list.length)) : t("alone");
}

/* ---------- resize & loop ---------- */
function resize() {
  const w = innerWidth, h = innerHeight; post.resize(w, h);
  [camHall, camIntro].forEach(c => { c.aspect = w / h; });
  camHall.fov = w / h < 0.75 ? 62 : 55;
  const sheet = $("#sheet"); const open = S.mode === "intro" && !sheet.classList.contains("away"); const side = matchMedia("(orientation:landscape) and (min-width:640px)").matches;
  if (side) camIntro.setViewOffset(w, h, open ? (I.lang === "ar" ? 195 : -195) : 0, -h * 0.12, w, h);
  else { const sh = open ? sheet.getBoundingClientRect().height : 0; camIntro.setViewOffset(w, h, 0, Math.max(0, (sh - 120) * 0.5), w, h); }
  const a = w / h; camIntro.fov = a < 0.6 ? 46 : a < 1 ? 40 : 36;
  camHall.updateProjectionMatrix(); camIntro.updateProjectionMatrix();
}
addEventListener("resize", resize);

function frame() {
  requestAnimationFrame(frame);
  clock.update(); const dt = Math.min(clock.getDelta(), 0.05); if (S.mode === "load" && !sceneHall) return;
  fpsGuard.tick(dt);
  if (S.mode === "shot") { post.render(sceneHall, camHall); return; }
  if (S.mode === "soon" || S.mode === "pin" || S.mode === "msg" || S.mode === "load") {
    const tt = performance.now() / 1000; const m = reduceMotion() ? 0 : 1;
    camHall.position.set(Math.sin(tt * 0.07) * 3 * m, 2.2 + Math.sin(tt * 0.11) * 0.15 * m, 7.8 + Math.cos(tt * 0.05) * 1.4 * m); camHall.lookAt(Math.sin(tt * 0.05) * 0.8 * m, 1.9, -9);
    if (S.mode === "soon") tickSoon();
    post.render(sceneHall, camHall); return;
  }
  if (S.mode === "intro" && my) {
    if (introAuto && !reduceMotion()) my.root.rotation.y = Math.sin(performance.now() / 2600) * 0.5;
    let sp = 0;
    if (entering) {
      entering.t += dt; const tt = entering.t; const turn = Math.min(1, tt / 0.5);
      my.root.rotation.y = entering.start + (Math.PI - entering.start) * turn * turn * (3 - 2 * turn);
      const open = THREE.MathUtils.clamp((tt - 0.2) / 1.1, 0, 1), e = 1 - Math.pow(1 - open, 3); entrance.doors.forEach(d => { d.pivot.rotation.y = -d.side * 1.75 * e; });
      if (tt > 0.6) { sp = 1.3; my.root.position.z = Math.max(-0.9, 2.1 - (tt - 0.6) * 1.3); my.root.position.y = Math.max(0, 0.12 - (tt - 0.6) * 0.3); }
      camIntro.position.z = 11.5 - Math.min(5, Math.max(0, tt - 0.7) * 2.2);
      if (tt > 2.4 && !entering.faded) { entering.faded = true; fadeTo(toMuseum); }
    } else camIntro.position.set(0, 1.6, 11.5);
    camIntro.lookAt(0, 1.55, 1.2);
    my.update(dt, { speed: sp });
  } else if (S.mode === "museum" && my) {
    if (!S.openArt) stepMuseum(dt); else my.update(dt, { speed: 0, sitting: P.sitting });
    updateGhosts(dt);
  }
  post.render(scene, camera);
}

/* ---------- still overview used for template thumbnails (museum.html?demo=1&shot=1&tpl=...) ---------- */
function shotMode() {
  S.mode = "shot"; $("#loader")?.remove(); showScreen(null); canvas.style.transition = "none"; document.body.classList.remove("blurred");
  camHall.position.set(4.6, 2.5, 10.8); camHall.lookAt(-0.6, 1.7, -6); camHall.fov = 58; camHall.updateProjectionMatrix();
  scene = sceneHall; camera = camHall; post.setup(scene, camera); document.body.dataset.ready = "1";
}

/* ---------- start ---------- */
resize(); frame();
boot().catch(e => { console.error(e); fatal(t("loadErr")); });
window.__ag = { S, P, me, get my() { return my; }, Q, hall: () => hall }; // for automated tests
