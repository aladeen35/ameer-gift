# خطوات صاحب المشروع (من الجوال)

> عنوان الموقع: **https://amir.albushra.app** (والرابط القديم `aladeen35.github.io/ameer-gift` يحوّل إليه تلقائيًا).

## ⓪ ربط النطاق amir.albushra.app (مرة واحدة)

1. في لوحة DNS الخاصة بـ `albushra.app` (غالبًا Cloudflare) أضف سجلًا:
   - النوع **CNAME**، الاسم **amir**، القيمة **aladeen35.github.io**
   - في Cloudflare اجعل السحابة **رمادية (DNS only)** وليست برتقالية، وإلا لن تصدر شهادة الأمان.
2. في GitHub: `github.com/aladeen35/ameer-gift/settings/pages` ← خانة **Custom domain** ← اكتب `amir.albushra.app` ← **Save**.
3. انتظر حتى يظهر «DNS check successful»، ثم فعّل **Enforce HTTPS** (قد يستغرق حتى ساعة).
4. في Firebase ← Authentication ← Settings ← Authorized domains أضف `amir.albushra.app` (عملية التفعيل التلقائية تضيفه أيضًا).

---

كل الخطوات تتم من متصفح الجوال، ولا تحتاج كمبيوتر. نفّذها بالترتيب.

---

## ١) تفعيل النشر على GitHub Pages (مرة واحدة)

1. افتح `github.com/aladeen35/ameer-gift`.
2. اضغط **Settings** (إن لم تظهر، اسحب شريط التبويبات لليسار، أو اضغط ⋯).
3. من القائمة اختر **Pages**.
4. تحت **Build and deployment** وفي خانة **Source** اختر **GitHub Actions**.
5. بعد دمج التعديلات في فرع `main` يُنشر الموقع تلقائيًا على:
   `https://aladeen35.github.io/ameer-gift/`

---

## ✨ تعليقات الذكاء الاصطناعي (مجانية، Gemini من Google)

1. افتح `console.firebase.google.com/project/ameer-gift-fc5a8/ailogic`
2. اضغط **Get started**.
3. اختر **Gemini Developer API** (المجاني، بدون بطاقة) ← **Get started with this API** ← **Enable API** ← **Continue**.
4. انتظر دقيقتين، ثم جرّب زر ✨ بجانب أي صورة في خطوة «الصور» عند إنشاء معرض.

> الخطة المجانية لها حد يومي للطلبات، ويحدّ الموقع كل معرض بـ ٤٠ اقتراحًا. الصورة تُرسل إلى Google لكتابة التعليق فقط.

---

## ⭐ الطريقة الأسهل: تفعيل كل شيء تلقائيًا (بدل الخطوات ٢ و٣ و٤ و٥)

تعطي GitHub مفتاحًا لمشروع Firebase مرة واحدة، وهو ينفّذ كل الإعدادات بنفسه، ويعيد نشر القواعد تلقائيًا كلما تغيّرت.

**أ) أنشئ المفتاح من Firebase**
1. افتح `console.firebase.google.com` ← مشروع **ameer-gift-fc5a8**.
2. اضغط رمز الترس ⚙ بجانب «Project Overview» ← **Project settings**.
3. افتح تبويب **Service accounts**.
4. اضغط **Generate new private key** ← **Generate key**. سيُنزَّل ملف ينتهي بـ `.json`.

**ب) ضع المفتاح في GitHub**
1. افتح الملف المنزَّل بأي تطبيق ملفات أو محرر نصوص، وانسخ كل محتواه.
2. افتح `github.com/aladeen35/ameer-gift/settings/secrets/actions` ← **New repository secret**.
3. الاسم: `FIREBASE_SERVICE_ACCOUNT`، والقيمة: الصق محتوى الملف كاملًا ← **Add secret**.
4. احذف ملف المفتاح من جوالك بعد ذلك، فهو سري.

**ج) شغّل التفعيل**
1. افتح `github.com/aladeen35/ameer-gift/actions/workflows/firebase-setup.yml`.
2. اضغط **Run workflow** ← **Run workflow**.
3. بعد دقيقتين تقريبًا افتح التشغيل، وستجد جدولًا بالعربية يبيّن كل خطوة: ✅ تعني أنها تمت.

> إن ظهرت ❌ في خطوة، نفّذ تلك الخطوة يدويًا من الأسفل.

---

## ٢) قواعد الأمان في Firestore (ضروري)

القواعد الحالية في مشروعك تمنع القراءة تمامًا، لذلك لن يعمل الموقع حتى تلصق القواعد الجديدة.

1. افتح `console.firebase.google.com` ← مشروع **ameer-gift-fc5a8**.
2. القائمة ☰ ← **Build** ← **Firestore Database** ← تبويب **Rules**.
3. احذف كل النص الموجود، والصق محتوى الملف `firestore.rules` من المستودع كاملًا.
   (لنسخه من الجوال: افتح الملف في GitHub ← زر **Raw** ← تحديد الكل ← نسخ.)
4. اضغط **Publish**.

**ماذا تغيّر في القواعد ولماذا:**
- صاحب المعرض يعدّل النصوص والموسيقى وموعد الفتح وتعليقات الصور فقط، ولا يستطيع تغيير عدد الزوار أو المدة.
- الزائر يكتب إعجاباته وتعليقاته فقط، بحدود للحجم، ويستطيع صاحب المعرض والمدير حذف أي تعليق.
- عدّاد الزيارات يزيد واحدًا فقط في كل مرة.
- سجل العمليات `audit` يُكتب باسم الموظف الحقيقي، ويقرؤه المدير فقط.

---

## ٣) الدخول المجهول للزوار (ضروري للإعجابات والتعليقات)

1. القائمة ☰ ← **Build** ← **Authentication** ← تبويب **Sign-in method**.
2. **Add new provider** ← **Anonymous** ← فعّل **Enable** ← **Save**.

---

## ٤) قاعدة البيانات اللحظية للزوار المباشرين (مجانية)

1. القائمة ☰ ← **Build** ← **Realtime Database** ← **Create Database**.
2. الموقع: **Belgium (europe-west1)** ← **Next** ← **Start in locked mode** ← **Enable**.
3. تبويب **Rules** ← احذف الموجود والصق محتوى الملف `database.rules.json` ← **Publish**.
4. انسخ رابط قاعدة البيانات الظاهر أعلى الصفحة. إن لم يكن هو
   `https://ameer-gift-fc5a8-default-rtdb.europe-west1.firebasedatabase.app`
   فأرسله لي لأعدّله في `src/config.js`.

> الخطة المجانية تسمح بـ ١٠٠ اتصال لحظي لكل المعارض معًا. عند تجاوزها يختفي ظهور الزوار الآخرين فقط، ويستمر المعرض في العمل.

---

## ٥) السماح لنطاق الموقع بتسجيل الدخول

1. **Authentication** ← تبويب **Settings** ← **Authorized domains** ← **Add domain**.
2. اكتب: `aladeen35.github.io` ← **Add**.

---

## ٦) رقم واتساب للتواصل (من لوحة الإدارة)

افتح `admin.html` ← تبويب **الأسعار** ← خانة **واتساب التواصل** ← اكتب الرقم مع رمز الدولة ← **حفظ**.
يظهر هذا الرقم عندما تنتهي التجربة المجانية لدى العميل.

---

## ٧) تطبيق أندرويد (APK و AAB)

### أول مرة
1. في GitHub افتح المستودع ← **Actions** ← **Android app (APK + AAB)** ← **Run workflow** ← **Run workflow**.
2. بعد انتهاء التشغيل (حوالي ١٠ دقائق) افتحه، وانزل إلى **Artifacts**:
   - `ameer-gift-android`: فيه `app-release-signed.apk` للتثبيت المباشر، و`app-release-bundle.aab` لمتجر Google Play، و`assetlinks.json`.
   - `KEEP-THIS-SAFE-android-signing-key`: **مفتاح توقيع التطبيق. نزّله فورًا واحفظه في مكان آمن** (Google Drive خاص مثلًا). إذا ضاع، لن تستطيع تحديث التطبيق في المتجر أبدًا. يُحذف من GitHub بعد ٧ أيام.
3. احفظ المفتاح في أسرار المستودع حتى تُوقَّع كل التحديثات بنفس المفتاح:
   **Settings** ← **Secrets and variables** ← **Actions** ← **New repository secret**:
   - الاسم `ANDROID_KEYSTORE_BASE64`: والقيمة محتوى الملف `android.keystore.base64.txt` كاملًا.
   - الاسم `ANDROID_KEYSTORE_PASSWORD`: والقيمة محتوى الملف `keystore-password.txt`.

### إخفاء شريط المتصفح داخل التطبيق
أندرويد يطلب ملف `assetlinks.json` في جذر النطاق `aladeen35.github.io`، وموقعنا في مجلد فرعي، فنحتاج مستودعًا صغيرًا إضافيًا:
1. أنشئ مستودعًا جديدًا **Public** اسمه بالضبط: `aladeen35.github.io`.
2. أضف فيه ملفًا اسمه `.nojekyll` (فارغ).
3. أضف ملفًا مساره `.well-known/assetlinks.json` والصق فيه محتوى `assetlinks.json` من الـ Artifacts.
4. **Settings** ← **Pages** ← **Source**: `Deploy from a branch` ← `main` ← **Save**.

بدون هذه الخطوة يعمل التطبيق، لكن يظهر شريط عنوان صغير في أعلاه.

---

## ٨) اختياري: حماية إضافية App Check (مجانية)

تقلل محاولات تخمين رمز الدخول من برامج آلية.
1. افتح `google.com/recaptcha/admin` ← أنشئ موقعًا من نوع **reCAPTCHA v3** للنطاق `aladeen35.github.io`، وانسخ **Site key**.
2. Firebase ← **Build** ← **App Check** ← **Apps** ← تطبيق الويب ← **reCAPTCHA** ← الصق **Secret key** ← **Save**.
3. أرسل لي **Site key** لأضعه في `src/config.js`.
4. بعد أسبوع من المتابعة في صفحة App Check، اضغط **Enforce** لـ Firestore و Realtime Database.

---

## ما يحتاج خطة Blaze المدفوعة (لم يُنفَّذ بعد)
- رفع الأغاني والفيديو من الجوال (Firebase Storage).
- اقتراح التعليقات بالذكاء الاصطناعي (Cloud Functions + Claude API).
- التحقق من رمز الدخول على الخادم مع حد للمحاولات، والدفع الإلكتروني (Moyasar أو Tap).
