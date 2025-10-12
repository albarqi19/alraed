# دليل إعداد Firebase للنداء الآلي

## هل تحتاج رفع المشروع على Firebase Hosting؟
**لا**، ليس ضرورياً. يمكنك:
- استضافة الواجهة على أي خادم (Vercel, Netlify, VPS خاص)
- تشغيل المشروع محلياً `npm run dev`
- المهم فقط أن يكون لديك مشروع Firebase لاستخدام Firestore

## ما تحتاجه في Firebase

### 1. إنشاء مشروع Firebase (مجاني)
1. ادخل إلى [Firebase Console](https://console.firebase.google.com)
2. اضغط "Add project" أو "إضافة مشروع"
3. اختر اسم المشروع (مثل: alraed-school)
4. اتبع الخطوات حتى إنشاء المشروع

### 2. تفعيل Firestore Database
1. من القائمة الجانبية اختر **Firestore Database**
2. اضغط "Create database"
3. اختر "Start in **test mode**" (للتجربة السريعة)
   - ⚠️ **مهم**: في الإنتاج يجب تغيير القواعد للحماية
4. اختر المنطقة القريبة منك

### 3. إعداد قواعد Firestore (Security Rules)
في تبويب **Rules** داخل Firestore، استبدل القواعد بالتالي:

\`\`\`javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // مسارات النداء الآلي
    match /schools/{schoolId} {
      
      // السماح بالقراءة للجميع (للشاشة العامة)
      allow read: if true;
      
      // إعدادات النداء الآلي
      match /autoCalls/settings {
        allow read: if true;
        allow write: if request.auth != null; // فقط المستخدمين المسجلين
      }
      
      // طابور النداء
      match /autoCallQueue/{queueId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null;
      }
      
      // السجل التاريخي
      match /autoCallHistory/{historyId} {
        allow read: if true;
        allow write: if request.auth != null;
      }
      
      // حالات أولياء الأمور
      match /autoCallGuardians/{guardianId} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
  }
}
\`\`\`

### 4. بنية البيانات المطلوبة في Firestore

سيتم إنشاء البيانات تلقائياً عند الاستخدام، لكن يمكنك إنشاء وثيقة الإعدادات يدوياً:

#### المسار: `schools/{schoolId}/autoCalls/settings`

\`\`\`json
{
  "enabled": true,
  "openFrom": null,
  "openUntil": null,
  "repeatIntervalSeconds": 120,
  "announcementDurationSeconds": 30,
  "enableSpeech": true,
  "voiceGender": "auto",
  "voiceLocale": "ar-SA",
  "allowGuardianAcknowledgement": true,
  "geofence": null,
  "maxStrikesBeforeBlock": 3,
  "blockDurationMinutes": 1440,
  "displayTheme": "dark"
}
\`\`\`

**مثال عملي:**
1. في Firestore Console اضغط "Start collection"
2. Collection ID: `schools`
3. Document ID: `school_test_001` (أو أي معرّف مدرستك)
4. اضغط "Save" (لا حاجة لحقول في وثيقة المدرسة نفسها)
5. اضغط على وثيقة المدرسة التي أنشأتها
6. اضغط "Start collection" مرة أخرى
7. Collection ID: `autoCalls`
8. Document ID: `settings`
9. اضغط "Add field" لكل حقل من الحقول أعلاه

### 5. هيكل المجموعات الكامل

\`\`\`
schools/
  └── {schoolId}/                    # مثل: school_test_001 (وثيقة - 2 أجزاء)
      ├── autoCalls/                 # مجموعة فرعية (3 أجزاء)
      │   └── settings (document)    # إعدادات النداء الآلي (4 أجزاء)
      ├── autoCallQueue/             # طابور الانتظار النشط (3 أجزاء)
      │   └── {queueId} (document)   # كل طلب نداء (4 أجزاء)
      ├── autoCallHistory/           # السجل التاريخي (3 أجزاء)
      │   └── {historyId} (document) # طلبات منتهية (4 أجزاء)
      └── autoCallGuardians/         # حالات أولياء الأمور (3 أجزاء)
          └── {guardianPhone} (doc)  # حالة كل ولي أمر (4 أجزاء)
\`\`\`

**ملاحظة مهمة عن بنية Firestore:**
- المجموعات (Collections): يجب أن تحتوي على **عدد فردي** من الأجزاء (1, 3, 5, ...)
- الوثائق (Documents): يجب أن تحتوي على **عدد زوجي** من الأجزاء (2, 4, 6, ...)

## هل تحتاج Redis أو خدمات إضافية؟
**لا**، النظام الحالي يعتمد فقط على:
- ✅ Firebase Firestore (للتخزين اللحظي)
- ✅ Laravel Backend (الموجود حالياً)
- ✅ React Frontend (هذا المشروع)

لا حاجة لـ Redis أو أي خدمة أخرى.

## خطوات التشغيل

### 1. تأكد من ملف `.env`
يجب أن يحتوي على المتغيرات الصحيحة من مشروع Firebase الخاص بك:

\`\`\`bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# معرّف المدرسة الافتراضي (للاختبار)
VITE_AUTO_CALL_FALLBACK_SCHOOL_ID=school_test_001
\`\`\`

### 2. ابدأ الخادم
\`\`\`powershell
npm run dev
\`\`\`

### 3. افتح شاشة العرض
\`\`\`
http://localhost:5173/display/auto-call
\`\`\`

أو مع تحديد مدرسة:
\`\`\`
http://localhost:5173/display/auto-call?school=school_test_001
\`\`\`

## استكشاف الأخطاء

### خطأ: "Invalid collection reference"
- ✅ **تم الحل**: المجموعات يجب أن تحتوي على عدد فردي من الأجزاء
- المسار الصحيح: `schools/{schoolId}/autoCallQueue` (3 أجزاء للمجموعة)

### خطأ: "Invalid document reference"
- ✅ **تم الحل**: الوثائق يجب أن تحتوي على عدد زوجي من الأجزاء
- المسار الصحيح: `schools/{schoolId}/autoCalls/settings` (4 أجزاء للوثيقة)

### خطأ: "Firebase configuration is incomplete"
- تأكد من وجود ملف `.env` (ليس `.env.example`)
- تأكد من ملء جميع متغيرات `VITE_FIREBASE_*`
- أعد تشغيل الخادم بعد تعديل `.env`

### خطأ: "Permission denied"
- تأكد من تفعيل Firestore
- تأكد من تطبيق قواعد الأمان الموضحة أعلاه
- في بيئة الاختبار، يمكنك استخدام "test mode" مؤقتاً

## نصائح الإنتاج

عند النشر للاستخدام الحقيقي:

1. **قواعد الأمان**: غيّر من "test mode" إلى قواعد محددة
2. **المتغيرات البيئية**: استخدم ملفات `.env.production` منفصلة
3. **النسخ الاحتياطي**: فعّل النسخ الاحتياطي التلقائي في Firestore
4. **المراقبة**: راقب استخدام Firestore في Firebase Console

## الحصة المجانية لـ Firestore

Firebase توفر حصة مجانية كافية لمدرسة متوسطة:
- ✅ 50,000 قراءة / يوم
- ✅ 20,000 كتابة / يوم  
- ✅ 20,000 حذف / يوم
- ✅ 1 GiB تخزين

إذا تجاوزت الحد، تحتاج الترقية لخطة Blaze (الدفع حسب الاستخدام).
