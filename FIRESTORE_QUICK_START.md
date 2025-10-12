# دليل البدء السريع لـ Firestore

## خطوات التفعيل (5 دقائق)

### الخطوة 1: تفعيل Firestore في مشروعك
1. اذهب إلى: https://console.firebase.google.com
2. اختر مشروعك: **alraed-8db3a**
3. من القائمة الجانبية → **Firestore Database**
4. إذا لم يكن مفعّل، اضغط **Create database**
5. اختر **Start in test mode** (مؤقتاً للتجربة)
6. اختر المنطقة القريبة منك (مثل: `europe-west1`)
7. اضغط **Enable**

### الخطوة 2: تطبيق قواعد الأمان
بعد إنشاء Database:

1. اذهب إلى تبويب **Rules**
2. احذف الكود الموجود
3. انسخ والصق هذا الكود:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // السماح بكل شيء مؤقتاً للاختبار
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

4. اضغط **Publish**

⚠️ **تحذير**: هذه قواعد اختبار فقط! في الإنتاج استخدم القواعد المحددة من `FIREBASE_SETUP_GUIDE.md`

### الخطوة 3: إنشاء البنية الأساسية (اختياري)

يمكنك إنشاء البيانات يدوياً أو تركها للنظام لإنشائها تلقائياً:

#### الطريقة اليدوية:
1. في Firestore Console اضغط **Start collection**
2. Collection ID: `schools`
3. Document ID: `school_test_001`
4. **لا تضف أي حقول**، فقط اضغط **Save**
5. اضغط على الوثيقة `school_test_001`
6. اضغط **Start collection**
7. Collection ID: `autoCalls`
8. Document ID: `settings`
9. أضف الحقول التالية:

| Field | Type | Value |
|-------|------|-------|
| enabled | boolean | true |
| displayTheme | string | dark |
| enableSpeech | boolean | true |
| repeatIntervalSeconds | number | 120 |
| announcementDurationSeconds | number | 30 |

10. اضغط **Save**

#### الطريقة التلقائية:
- اترك Firestore فارغاً
- عند أول استخدام لصفحة الإدارة، سيتم إنشاء البيانات تلقائياً

### الخطوة 4: اختبار الاتصال

```powershell
# تأكد من وجود ملف .env
cd "c:/Users/ALBAR/OneDrive/سطح المكتب/norin/فرونت جديد"
Get-Content .env | Select-String "VITE_FIREBASE"

# يجب أن ترى جميع المتغيرات معبأة
```

### الخطوة 5: تشغيل المشروع

```powershell
npm run dev
```

افتح المتصفح:
- الصفحة الرئيسية: http://localhost:5173
- شاشة العرض: http://localhost:5173/display/auto-call
- صفحة الإدارة: http://localhost:5173/admin/auto-call

## حل الأخطاء الشائعة

### خطأ: 400 Bad Request عند حفظ الإعدادات
**السبب**: قواعد Firestore غير مطبقة أو محظورة

**الحل**:
1. تأكد من تفعيل "test mode" أو تطبيق القواعد أعلاه
2. تأكد من النشر بالضغط على **Publish** في صفحة Rules
3. انتظر 10-20 ثانية حتى تنتشر القواعد الجديدة

### خطأ: Permission denied
**السبب**: قواعد الأمان تمنع الوصول

**الحل المؤقت**:
استخدم القواعد البسيطة أعلاه (`allow read, write: if true`)

**الحل النهائي**:
استخدم القواعد التفصيلية من `FIREBASE_SETUP_GUIDE.md`

### خطأ: Invalid document reference
**السبب**: تم إصلاحه - كان هناك خطأ في المسارات

**التأكد من الحل**:
المسارات الحالية الصحيحة:
- ✅ `schools/{id}/autoCalls/settings` (4 أجزاء - وثيقة)
- ✅ `schools/{id}/autoCallQueue` (3 أجزاء - مجموعة)

### خطأ: Firebase configuration incomplete
**الحل**:
```powershell
# تأكد من وجود ملف .env (وليس .env.example فقط)
Test-Path .env

# إذا كانت النتيجة False
Copy-Item .env.example .env
```

## التحقق من أن كل شيء يعمل

### 1. تحقق من Firestore Console
- يجب أن ترى مجموعة `schools` (إذا أنشأتها يدوياً)
- عند استخدام النظام، ستظهر بيانات في `autoCallQueue` و `autoCallHistory`

### 2. تحقق من Console في المتصفح
افتح Developer Tools (F12) وابحث عن:
- ❌ أخطاء Firebase: إذا وجدت، اقرأ الرسالة بعناية
- ✅ لا أخطاء: النظام يعمل بشكل صحيح

### 3. جرب إضافة مناداة من صفحة Admin
```
http://localhost:5173/admin/auto-call
```
- اذهب إلى تبويب "Queue"
- أضف طالب جديد
- يجب أن يظهر فوراً في شاشة العرض

## المسارات المستخدمة في النظام

```
schools/
  └── {schoolId}/                           # school_test_001
      ├── autoCalls/                        # مجموعة الإعدادات
      │   └── settings                      # وثيقة الإعدادات
      ├── autoCallQueue/                    # طابور الانتظار
      │   ├── {queueId1}                    # طلب 1
      │   ├── {queueId2}                    # طلب 2
      │   └── ...
      ├── autoCallHistory/                  # السجل
      │   ├── {historyId1}                  # طلب منتهي 1
      │   └── ...
      └── autoCallGuardians/                # حالات الأولياء
          ├── {phone1}                      # ولي أمر 1
          └── ...
```

## نصائح مهمة

1. **استخدم test mode فقط للتطوير**
   - في الإنتاج، استخدم قواعد محددة

2. **راقب استخدام Firestore**
   - اذهب إلى Console → Usage
   - الحصة المجانية: 50K قراءات، 20K كتابات يومياً

3. **النسخ الاحتياطي**
   - قبل الإنتاج، فعّل النسخ الاحتياطي التلقائي

4. **الأمان**
   - لا تشارك ملف `.env` في Git
   - استخدم متغيرات بيئة مختلفة للإنتاج

## الخطوات التالية

بعد التأكد أن كل شيء يعمل:

1. ✅ اقرأ `FIREBASE_SETUP_GUIDE.md` للتفاصيل الكاملة
2. ✅ طبّق قواعد الأمان المحددة
3. ✅ أضف بيانات حقيقية من Laravel backend
4. ✅ اختبر على أجهزة متعددة
5. ✅ راجع الأداء والتكاليف

---

إذا واجهت أي مشكلة، تحقق من:
- Firebase Console → Firestore → Data (البيانات المحفوظة)
- Firebase Console → Firestore → Rules (القواعد المطبقة)
- Browser Console (F12) → Console tab (الأخطاء في JavaScript)
