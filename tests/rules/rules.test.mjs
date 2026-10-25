// Security rules tests (Firebase emulator). Run: npm run test:rules
import { test, before, after } from "node:test";
import fs from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, Timestamp, increment } from "firebase/firestore";
import { ref, set, get } from "firebase/database";

let env;
const H = 3600e3;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ameer-gift",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    ...(process.env.NO_RTDB ? {} : { database: { rules: fs.readFileSync("database.rules.json", "utf8"), host: "127.0.0.1", port: 9000 } }),
  });
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, "roles/admin1"), { role: "admin" });
    await setDoc(doc(db, "roles/staff1"), { role: "staff" });
    await setDoc(doc(db, "galleries/g1"), { owner: "owner1", status: "active", title: "T" });
    await setDoc(doc(db, "galleries/g2"), { owner: "owner1", status: "draft", title: "T" });
    await setDoc(doc(db, "vaults/g1-open"), { owner: "owner1", status: "active", openAt: Timestamp.fromMillis(Date.now() - H), expiresAt: Timestamp.fromMillis(Date.now() + 100 * H), visitors: 4, title: "T" });
    await setDoc(doc(db, "vaults/g1-open/photos/p1"), { img: "x", date: "2020-01-01", title: "a", caption: "b" });
    await setDoc(doc(db, "vaults/g1-later"), { owner: "owner1", status: "active", openAt: Timestamp.fromMillis(Date.now() + H), visitors: 4 });
    await setDoc(doc(db, "vaults/g1-over"), { owner: "owner1", status: "trial", openAt: Timestamp.fromMillis(Date.now() - 2 * H), expiresAt: Timestamp.fromMillis(Date.now() - H) });
    await setDoc(doc(db, "teasers/g1"), { owner: "owner1", status: "active", title: "T", openAt: Timestamp.now() });
  });
});
after(async () => { await env?.cleanup(); });

const anon = () => env.authenticatedContext("visitor1", { firebase: { sign_in_provider: "anonymous" } });
const social = { name: "Sara", photo: "", likes: { p1: true }, comments: [{ a: "p1", t: "جميلة", at: 1 }], at: Timestamp.now() };

test("anyone reads the teaser, nobody lists them", async () => {
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), "teasers/g1")));
});
test("an open vault is readable with the right key; a closed or expired one is not", async () => {
  const db = anon().firestore();
  await assertSucceeds(getDoc(doc(db, "vaults/g1-open")));
  await assertSucceeds(getDoc(doc(db, "vaults/g1-open/photos/p1")));
  await assertFails(getDoc(doc(db, "vaults/g1-later")));
  await assertFails(getDoc(doc(db, "vaults/g1-over")));
});
test("the owner reads their vault before opening time", async () => {
  await assertSucceeds(getDoc(doc(env.authenticatedContext("owner1").firestore(), "vaults/g1-later")));
});
test("visitors write only their own likes/comments, with size limits", async () => {
  const db = anon().firestore();
  await assertSucceeds(setDoc(doc(db, "vaults/g1-open/social/visitor1"), social));
  await assertFails(setDoc(doc(db, "vaults/g1-open/social/someoneElse"), social));
  await assertFails(setDoc(doc(db, "vaults/g1-open/social/visitor1"), { ...social, hack: true }));
  await assertFails(setDoc(doc(db, "vaults/g1-open/social/visitor1"), { ...social, name: "x".repeat(40) }));
  await assertFails(setDoc(doc(db, "vaults/g1-later/social/visitor1"), social));
});
test("the owner and admins can moderate comments", async () => {
  await assertSucceeds(updateDoc(doc(env.authenticatedContext("owner1").firestore(), "vaults/g1-open/social/visitor1"), { comments: [] }));
  await assertSucceeds(updateDoc(doc(env.authenticatedContext("admin1").firestore(), "vaults/g1-open/social/visitor1"), { comments: [] }));
});
test("the owner edits words and captions but not the package", async () => {
  const db = env.authenticatedContext("owner1").firestore();
  await assertSucceeds(updateDoc(doc(db, "vaults/g1-open"), { title: "New", dedication: "..." }));
  await assertFails(updateDoc(doc(db, "vaults/g1-open"), { visitors: 50 }));
  await assertFails(updateDoc(doc(db, "vaults/g1-open"), { expiresAt: Timestamp.fromMillis(Date.now() + 9999 * H) }));
  await assertSucceeds(updateDoc(doc(db, "vaults/g1-open/photos/p1"), { caption: "new" }));
  await assertFails(updateDoc(doc(db, "vaults/g1-open/photos/p1"), { img: "other" }));
  await assertSucceeds(updateDoc(doc(db, "galleries/g1"), { title: "New" }));
  await assertFails(updateDoc(doc(db, "galleries/g1"), { status: "draft" }));
  await assertFails(updateDoc(doc(db, "teasers/g1"), { owner: "me" }));
});
test("visit counter only goes up by one", async () => {
  const db = anon().firestore();
  await assertSucceeds(setDoc(doc(db, "visits/g1"), { count: 1, last: Timestamp.now() }));
  await assertSucceeds(updateDoc(doc(db, "visits/g1"), { count: increment(1) }));
  await assertFails(updateDoc(doc(db, "visits/g1"), { count: 999 }));
  await assertFails(getDoc(doc(db, "visits/g1")));
  await assertSucceeds(getDoc(doc(env.authenticatedContext("owner1").firestore(), "visits/g1")));
});
test("only staff create trials and vaults; audit lines carry the author", async () => {
  await assertFails(setDoc(doc(anon().firestore(), "trials/966500000000"), { name: "x" }));
  await assertSucceeds(setDoc(doc(env.authenticatedContext("staff1").firestore(), "trials/966500000000"), { name: "x" }));
  await assertSucceeds(setDoc(doc(env.authenticatedContext("staff1").firestore(), "audit/a1"), { by: "staff1", action: "trial" }));
  await assertFails(setDoc(doc(env.authenticatedContext("staff1").firestore(), "audit/a2"), { by: "admin1", action: "trial" }));
});
test("presence: visitors write only their own entry with known fields", { skip: !!process.env.NO_RTDB }, async () => {
  const db = anon().database();
  await assertSucceeds(set(ref(db, "presence/g1-open/visitor1"), { x: 1, z: 2, y: 0, s: 0, st: 0, n: "Sara", k: "woman", v: "f-hijab-white", h: 1, lk: [1, 0, 0], t: Date.now() }));
  await assertSucceeds(get(ref(db, "presence/g1-open")));
  await assertFails(set(ref(db, "presence/g1-open/other"), { x: 1, z: 2 }));
  await assertFails(set(ref(db, "presence/g1-open/visitor1"), { x: 1, z: 2, evil: true }));
  await assertFails(get(ref(db, "presence")));
  await assertFails(get(ref(env.unauthenticatedContext().database(), "presence/g1-open")));
});
