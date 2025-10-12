# ✅ دليل تفعيل نظام النداء الآلي

## المشكلة الشائعة

عند فتح صفحة ولي الأمر تظهر رسالة:
```
خدمة النداء متوقفة حالياً. يرجى المحاولة لاحقاً أو التواصل مع إدارة المدرسة.
```

## الأسباب المحتملة والحلول

### السبب 1: الإعدادات غير موجودة في Firestore ✅ **الحل الأكثر شيوعاً**

**التحقق:**
1. افتح Firebase Console: https://console.firebase.google.com
2. اذهب إلى Firestore Database
3. ابحث عن المسار:
   ```
   schools/{schoolId}/autoCalls/settings
   ```

**إذا لم تجد هذا المسار:**

#### الطريقة 1: إنشاء الإعدادات يدوياً

1. في Firestore Console اضغط **Start collection**
2. Collection ID: `schools`
3. اضغط Next
4. Document ID: `school_test_001` (أو المعرّف من `.env`)
5. **لا تضف حقول**، فقط اضغط **Save**
6. اضغط على وثيقة `school_test_001` التي أنشأتها
7. اضغط **Start collection**
8. Collection ID: `autoCalls`
9. اضغط Next
10. Document ID: `settings`
11. أضف الحقول التالية:

| Field Name | Type | Value |
|------------|------|-------|
| enabled | boolean | ✅ true |
| displayTheme | string | dark |
| enableSpeech | boolean | true |
| repeatIntervalSeconds | number | 120 |
| announcementDurationSeconds | number | 30 |
| allowGuardianAcknowledgement | boolean | true |

12. اضغط **Save**

#### الطريقة 2: التفعيل من صفحة الإدارة

1. افتح صفحة الإدارة:
   ```
   http://localhost:5173/admin/auto-call
   ```

2. اذهب إلى تبويب **Settings**

3. فعّل المفتاح الرئيسي:
   - ✅ **تفعيل النظام** → اجعله `مفعّل`

4. اضغط **حفظ الإعدادات**

5. تحقق من Firestore Console أن الإعدادات تم حفظها

---

### السبب 2: معرّف المدرسة غير محدد

**التحقق:**
افتح Console في المتصفح (F12) وابحث عن رسائل مثل:
```
schoolId: null
```

**الحل:**

#### في ملف `.env`:
```bash
VITE_AUTO_CALL_FALLBACK_SCHOOL_ID=school_test_001
```

**خطوات:**
1. افتح ملف `.env` في مجلد المشروع
2. تأكد من وجود السطر أعلاه
3. إذا لم يكن موجوداً، أضفه
4. أعد تشغيل الخادم:
   ```powershell
   npm run dev
   ```

---

### السبب 3: قيمة `enabled` خاطئة في Firestore

**التحقق:**
في Firestore Console، تحقق من قيمة الحقل:
```
schools/school_test_001/autoCalls/settings/enabled
```

**الحل:**
1. اضغط على وثيقة `settings`
2. ابحث عن حقل `enabled`
3. تأكد أن نوعه `boolean` وقيمته `true` (مع علامة ✓)
4. إذا كان `string` أو `false`، عدّله:
   - احذف الحقل
   - أضفه من جديد بنوع `boolean` وقيمة `true`

---

### السبب 4: خطأ في قواعد Firestore

**التحقق:**
في Console المتصفح، ابحث عن أخطاء مثل:
```
Permission denied
Missing or insufficient permissions
```

**الحل:**
راجع `FIRESTORE_QUICK_START.md` → قسم "قواعد الأمان"

**القاعدة المؤقتة للاختبار:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ هذه قواعد اختبار فقط - لا تستخدمها في الإنتاج!

---

## الخطوات الكاملة للتفعيل من الصفر

### 1. تأكد من ملف `.env`
```powershell
# تحقق من وجود الملف
Test-Path .env

# إذا لم يكن موجوداً
Copy-Item .env.example .env
```

تأكد من محتويات `.env`:
```bash
VITE_FIREBASE_API_KEY=AIzaSyAeJ0Q7DnO1w2veu4MwoUGIcZKDy1KxBAM
VITE_FIREBASE_AUTH_DOMAIN=alraed-8db3a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=alraed-8db3a
VITE_FIREBASE_STORAGE_BUCKET=alraed-8db3a.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=890280441907
VITE_FIREBASE_APP_ID=1:890280441907:web:4f08a69bbed60191d04b46
VITE_FIREBASE_DATABASE_URL=https://alraed-8db3a-default-rtdb.firebaseio.com
VITE_FIREBASE_MEASUREMENT_ID=G-6FQF5H7BSJ
VITE_AUTO_CALL_FALLBACK_SCHOOL_ID=school_test_001
```

### 2. أعد تشغيل الخادم
```powershell
# أوقف الخادم (Ctrl+C)
# ثم شغله من جديد
npm run dev
```

### 3. افتح صفحة الإدارة
```
http://localhost:5173/admin/auto-call
```

### 4. فعّل النظام من Settings
- تبويب **Settings**
- فعّل مفتاح **تفعيل النظام**
- اضغط **حفظ الإعدادات**

### 5. تحقق من Firestore
افتح Firebase Console وتأكد من وجود:
```
schools/
  └── school_test_001/
      └── autoCalls/
          └── settings (document)
              ├── enabled: true ✅
              ├── displayTheme: "dark"
              └── ... (باقي الحقول)
```

### 6. اختبر صفحة ولي الأمر
```
http://localhost:5173/guardian/leave-request
```

**يجب أن ترى:**
- ✅ حقل إدخال رقم الهوية
- ✅ بعد الإدخال: معلومات الطالب
- ✅ بطاقة "النداء الآلي لاستلام الطالب"
- ✅ زر "طلب استلام الطالب" (مفعّل)

**إذا ما زالت الرسالة تظهر:**
- افتح Console (F12)
- ابحث عن أخطاء
- تحقق من البيانات في Firestore مرة أخرى

---

## اختبار سريع

### الطريقة الأسرع للتحقق

افتح Console في المتصفح (F12) على صفحة ولي الأمر واكتب:

```javascript
// تحقق من الإعدادات المحملة
console.log('Settings:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
```

أو ابحث في Network tab عن طلبات Firestore وتحقق من الاستجابات.

---

## حل المشاكل المتقدمة

### المشكلة: الإعدادات موجودة لكن لا تُقرأ

**السبب:** مشكلة في الاشتراكات اللحظية

**الحل:**
1. أغلق جميع التبويبات
2. امسح الذاكرة المؤقتة:
   - افتح DevTools (F12)
   - اضغط بيمين الماوس على زر Reload
   - اختر "Empty Cache and Hard Reload"
3. أعد فتح الصفحة

### المشكلة: الإعدادات تظهر في الإدارة لكن لا تظهر في صفحة ولي الأمر

**السبب:** المدرسة غير متطابقة

**الحل:**
تحقق أن `schoolId` متطابق في:
- `.env` → `VITE_AUTO_CALL_FALLBACK_SCHOOL_ID`
- Firestore → `schools/{schoolId}/...`
- صفحة الإدارة → انظر للعنوان الفرعي "المدرسة المرتبطة"

---

## الملخص - قائمة التحقق

- [ ] ملف `.env` موجود ويحتوي على متغيرات Firebase
- [ ] `VITE_AUTO_CALL_FALLBACK_SCHOOL_ID` محدد في `.env`
- [ ] الخادم يعمل (`npm run dev`)
- [ ] Firestore Database مفعّل في Firebase Console
- [ ] قواعد الأمان تسمح بالقراءة/الكتابة (test mode مؤقتاً)
- [ ] وثيقة الإعدادات موجودة: `schools/{schoolId}/autoCalls/settings`
- [ ] الحقل `enabled` نوعه `boolean` وقيمته `true`
- [ ] صفحة الإدارة تعمل وتعرض الإعدادات
- [ ] صفحة ولي الأمر لا تظهر رسالة "الخدمة متوقفة"

إذا أكملت جميع النقاط أعلاه، يجب أن يعمل النظام بشكل صحيح! 🎉

---

## المساعدة الإضافية

راجع الملفات التالية للحصول على تفاصيل أكثر:
- `FIRESTORE_QUICK_START.md` - البدء السريع مع Firestore
- `FIREBASE_SETUP_GUIDE.md` - الدليل الشامل
- `GUARDIAN_PAGE_GUIDE.md` - شرح صفحة ولي الأمر
- `ROUTES_GUIDE.md` - دليل المسارات الكامل
