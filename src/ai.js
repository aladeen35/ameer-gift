// AI caption suggestions with Gemini through Firebase AI Logic (Gemini Developer API, free tier on the Spark plan).
// No secret ships with the site: requests are tied to the Firebase project, and the owner turns the feature on in the console.
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { app } from "./shared.js";
import { CONFIG } from "./config.js";

let model = null;
function getModel() {
  if (!model) model = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), { model: CONFIG.aiModel || "gemini-3.5-flash-lite", generationConfig: { temperature: 0.8, maxOutputTokens: 300 } });
  return model;
}

// Returns {title, caption}. img is a JPEG data URL (already compressed for Firestore).
export async function suggestCaption({ img, title, date, lang, recipient, sender }) {
  const ar = lang === "ar";
  const prompt = ar
    ? `أنت تكتب تعليقات قصيرة لصور في «متحف ذكريات» يُهدى لشخص عزيز. انظر إلى الصورة واكتب:
- عنوانًا قصيرًا (حتى ٥ كلمات)${title ? ` (العنوان الحالي: «${title}»، حسّنه أو أبقه)` : ""}.
- تعليقًا دافئًا من جملة أو جملتين (حتى ١٤٠ حرفًا) بصيغة المتكلم${sender ? ` من ${sender}` : ""}${recipient ? ` إلى ${recipient}` : ""}.
تاريخ الصورة: ${date || "غير معروف"}. اكتب بالعربية الفصحى البسيطة، بأسلوب عائلي محتشم، بلا أسماء غير المذكورة وبلا رموز تعبيرية.
أعد JSON فقط بالشكل: {"title":"...","caption":"..."}`
    : `You write short captions for photos in a "memories museum" given as a gift to a loved one. Look at the photo and write:
- a short title (up to 5 words)${title ? ` (current title: "${title}", improve or keep it)` : ""}.
- a warm caption of one or two sentences (up to 140 characters), first person${sender ? ` from ${sender}` : ""}${recipient ? ` to ${recipient}` : ""}.
Photo date: ${date || "unknown"}. Family-friendly and modest, no names other than those given, no emoji.
Return JSON only: {"title":"...","caption":"..."}`;
  const parts = [{ text: prompt }];
  const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(img || "");
  if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  const res = await getModel().generateContent(parts);
  const text = res.response.text().trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try { const j = JSON.parse(text); return { title: String(j.title || "").slice(0, 40), caption: String(j.caption || "").slice(0, 160) }; }
  catch (e) { return { title: "", caption: text.slice(0, 160) }; }
}
