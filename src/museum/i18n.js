// Every visible string of the museum, Arabic first.
export const T = {
  ar: {
    load: "نجهّز المعرض…", loadAv: "نجهّز الشخصيات…", loadErr: "تعذّر تحميل المعرض. تحقق من الإنترنت وأعد تحميل الصفحة.", retry: "إعادة المحاولة",
    defTitle: "معرض ذكرياتنا", line: (s, r) => `هدية من <strong>${s}</strong> إلى <strong>${r}</strong>`,
    badLinkT: "الرابط غير صحيح", badLinkP: "تأكد من نسخ رابط المعرض كاملًا كما وصلك.",
    expiredT: "انتهت مدة هذا المعرض", expiredP: "شكرًا لزيارتكم. لتجديد المعرض تواصل مع صاحب الهدية أو مع هدايا أمير.",
    trialEndT: "انتهت التجربة المجانية", trialEndP: "أعجبتك التجربة؟ اطلب معرضك الآن بصورك وموسيقاك وموعد الفتح الذي تختاره.", order: "اطلب معرضك", contact: "تواصل معنا واتساب",
    fullT: "المعرض ممتلئ الآن", fullP: n => `هذا المعرض يتسع لـ ${n} زوار في نفس الوقت. حاول بعد قليل.`,
    authErrT: "تعذّر الدخول", authErrP: "فعّل الدخول المجهول في إعدادات Firebase، أو تحقق من الإنترنت.",
    pinT: "رمز الدخول", pinP: "اكتب الرمز المكوّن من ٤ أرقام الذي وصلك مع الرابط.", pinGo: "ادخل", pinBad: "الرمز غير صحيح، تأكد منه وحاول مرة أخرى.", pinWait: s => `محاولات كثيرة. انتظر ${s} ثانية.`, checking: "نتحقق…",
    pick: "اختر شخصيتك قبل الدخول", who: ["رجل", "امرأة", "ولد", "بنت"], heights: ["قصير", "متوسط", "طويل"], skin: "البشرة", hair: "الشعر", outfit: "الملابس",
    photo: "صورتك", photoAria: "صورتك الشخصية (اختياري)", name: "اسمك (اختياري)", nameAria: "اسمك", enter: "ادخل المعرض", look: (a, b) => `المظهر ${a} من ${b}`,
    exit: "الخروج من المعرض", hint: "حرّك الدائرة للمشي، واسحب الشاشة لتدوير الكاميرا، وقرّب بإصبعين.<br>اقترب من أي لوحة أو اضغط عليها مرتين لتراها كاملة.",
    view: "عرض: ", seen: (a, b) => `شاهدت ${a} من ${b}`, back: "رجوع إلى المعرض", sit: "اجلس", stand: "قم",
    cph: "اكتب تعليقًا", caria: "تعليقك", send: "نشر", noC: "لا توجد تعليقات بعد. اكتب أول تعليق.", del: "حذف", delQ: "حذف هذا التعليق؟", denied: "لم يُحفظ، حاول مرة أخرى.",
    you: "أنت", guest: "زائر", people: n => `${n} في المعرض`, alone: "وحدك الآن",
    ded: (r, s) => [`إلى ${r}`, "كل لوحة هنا حكاية عشناها معًا.", "شكرًا لأنك في كل واحدة منها.", s],
    dedTitle: r => `إلى ${r}`, units: ["يوم", "ساعة", "دقيقة", "ثانية"], opensOn: "يُفتح ", remind: "ذكّرني", gcal: "تقويم Google", ics: "ملف تقويم (تنبيه قبل ٣٠ دقيقة)",
    calTitle: t => `افتتاح ${t}`, openNow: "المعرض مفتوح الآن",
    settings: "الإعدادات", quality: "جودة الرسوم", q: { low: "خفيفة", medium: "متوسطة", high: "عالية" }, auto: "اختيرت تلقائيًا لجهازك", langL: "اللغة", motion: "تقليل الحركة", on: "مفعّل", off: "متوقف", close: "تم", credits: "شكر وتقدير",
    sound: "الصوت", full: "ملء الشاشة", emote: "تعبيرات", music: "الموسيقى",
    demoTitle: "معرض ذكرياتنا", demoTo: "أمي الغالية", demoFrom: "أمير", trialBadge: n => `تجربة: باقي ${n} دقيقة`,
    lang: "EN", langAria: "English",
  },
  en: {
    load: "Preparing the museum…", loadAv: "Preparing the characters…", loadErr: "The museum could not load. Check your connection and reload.", retry: "Try again",
    defTitle: "Our Memories Museum", line: (s, r) => `A gift from <strong>${s}</strong> to <strong>${r}</strong>`,
    badLinkT: "This link is not valid", badLinkP: "Make sure you copied the full museum link you received.",
    expiredT: "This museum has ended", expiredP: "Thank you for visiting. To renew it, contact the person who gave the gift or Ameer Gift.",
    trialEndT: "Your free trial has ended", trialEndP: "Did you like it? Order your own museum with your photos, music and opening time.", order: "Order your museum", contact: "Contact us on WhatsApp",
    fullT: "The museum is full right now", fullP: n => `This museum holds ${n} visitors at the same time. Try again shortly.`,
    authErrT: "Could not sign in", authErrP: "Enable anonymous sign-in in Firebase, or check your connection.",
    pinT: "Access code", pinP: "Enter the 4-digit code you received with the link.", pinGo: "Enter", pinBad: "That code is not right. Check it and try again.", pinWait: s => `Too many tries. Wait ${s} seconds.`, checking: "Checking…",
    pick: "Choose your character", who: ["Man", "Woman", "Boy", "Girl"], heights: ["Short", "Average", "Tall"], skin: "Skin", hair: "Hair", outfit: "Outfit",
    photo: "Photo", photoAria: "Your photo (optional)", name: "Your name (optional)", nameAria: "Your name", enter: "Enter the museum", look: (a, b) => `Look ${a} of ${b}`,
    exit: "Leave the museum", hint: "Drag the circle to walk, drag the screen to turn, and pinch to zoom.<br>Walk up to a painting or double-tap it to see it in full.",
    view: "View: ", seen: (a, b) => `Seen ${a} of ${b}`, back: "Back to the museum", sit: "Sit", stand: "Stand",
    cph: "Write a comment", caria: "Your comment", send: "Post", noC: "No comments yet. Write the first one.", del: "Delete", delQ: "Delete this comment?", denied: "Not saved, try again.",
    you: "You", guest: "Guest", people: n => `${n} in the museum`, alone: "Just you now",
    ded: (r, s) => [`To ${r}`, "Every painting here is a story we lived together.", "Thank you for being in every one of them.", s],
    dedTitle: r => `To ${r}`, units: ["Days", "Hours", "Minutes", "Seconds"], opensOn: "Opens ", remind: "Remind me", gcal: "Google Calendar", ics: "Calendar file (30-min alert)",
    calTitle: t => `${t} opens`, openNow: "The museum is open",
    settings: "Settings", quality: "Graphics quality", q: { low: "Light", medium: "Medium", high: "High" }, auto: "Chosen automatically for your device", langL: "Language", motion: "Reduce motion", on: "On", off: "Off", close: "Done", credits: "Credits",
    sound: "Sound", full: "Full screen", emote: "Emotes", music: "Music",
    demoTitle: "Our Memories Museum", demoTo: "my dear mother", demoFrom: "Ameer", trialBadge: n => `Trial: ${n} min left`,
    lang: "ع", langAria: "العربية",
  },
};
export const OPT = {
  skin: [["#F1CBA8", "فاتح", "Light"], ["#DDA77C", "قمحي", "Wheat"], ["#C38A5C", "حنطي", "Tan"], ["#96623F", "أسمر", "Brown"], ["#6A4129", "داكن", "Dark"]],
  hair: [["#1B1714", "أسود", "Black"], ["#3A281C", "بني داكن", "Dark brown"], ["#6B4A2E", "بني", "Brown"], ["#A8844F", "أشقر", "Blonde"]],
  outfit: [["#1C3A6B", "كحلي", "Navy"], ["#B8913E", "ذهبي", "Gold"], ["#F1F1EC", "أبيض", "White"], ["#4F86C6", "سماوي", "Sky"], ["#3A3F48", "رمادي", "Grey"]],
};
export function makeI18n(initial) {
  const s = { lang: initial };
  s.t = k => T[s.lang][k];
  const AR = "٠١٢٣٤٥٦٧٨٩";
  s.num = n => (s.lang === "ar" ? String(n).replace(/[0-9]/g, d => AR[d]) : String(n));
  s.pad = n => s.num(String(n).padStart(2, "0"));
  return s;
}
