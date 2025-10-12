# ⚡ حل سريع - إنشاء إعدادات النداء الآلي

## المشكلة المكتشفة

```json
{
  "exists": false,
  "path": "schools/school_test_001/autoCalls/settings"
}
```

الوثيقة غير موجودة في Firestore! لذلك يستخدم النظام القيمة الافتراضية `enabled: false`.

## الحل السريع (دقيقتان)

### الخطوة 1: افتح Firebase Console

```
https://console.firebase.google.com
```

1. اختر مشروعك: **alraed-8db3a**
2. من القائمة اليسرى → **Firestore Database**

### الخطوة 2: أنشئ البنية

#### 2.1 - إنشاء مجموعة schools

1. اضغط **Start collection** (أو **+ Start collection** إذا كان لديك بيانات)
2. Collection ID: `schools`
3. اضغط **Next**

#### 2.2 - إنشاء وثيقة المدرسة

1. Document ID: `school_test_001`
   - ⚠️ **مهم**: استخدم نفس القيمة من `.env` في `VITE_AUTO_CALL_FALLBACK_SCHOOL_ID`
2. **لا تضف أي حقول**
3. اضغط **Save**

#### 2.3 - إنشاء مجموعة autoCalls

1. اضغط على وثيقة `school_test_001` التي أنشأتها للتو
2. اضغط **Start collection** (داخل الوثيقة)
3. Collection ID: `autoCalls`
4. اضغط **Next**

#### 2.4 - إنشاء وثيقة الإعدادات

1. Document ID: `settings`
2. أضف الحقول التالية بالترتيب:

| Field name | Type | Value |
|------------|------|-------|
| **enabled** | **boolean** | ✅ **true** |
| displayTheme | string | dark |
| enableSpeech | boolean | true |
| repeatIntervalSeconds | number | 120 |
| announcementDurationSeconds | number | 30 |
| allowGuardianAcknowledgement | boolean | true |
| voiceLocale | string | ar-SA |
| voiceGender | string | auto |
| maxStrikesBeforeBlock | number | 3 |
| blockDurationMinutes | number | 1440 |

3. اضغط **Save**

### الخطوة 3: تحقق من النتيجة

1. أعد تحميل صفحة ولي الأمر:
   ```
   http://localhost:5173/guardian/leave-request
   ```

2. افتح Console (F12) وابحث عن:
   ```
   📡 Firestore settings snapshot received: {
     exists: true,  ← يجب أن تكون true الآن!
     data: { enabled: true, ... }
   }
   ```

3. يجب أن تختفي رسالة "الخدمة متوقفة" ويظهر زر "طلب استلام الطالب"

---

## البديل: استخدام صفحة الإدارة

إذا كانت صفحة الإدارة تعمل:

1. افتح:
   ```
   http://localhost:5173/admin/auto-call
   ```

2. اذهب إلى تبويب **Settings**

3. فعّل جميع الإعدادات واضغط **حفظ**

4. تحقق من Firestore Console أن الوثيقة أُنشئت

---

## التحقق السريع

بعد إنشاء الوثيقة، يجب أن ترى في Console:

```javascript
🔧 normalizeSettings called with: {
  data: {
    enabled: true,
    displayTheme: "dark",
    // ... باقي الحقول
  }
}

✅ Returning normalized settings: {
  enabled: true,  ← هذا هو المهم!
  // ...
}

🔍 Auto-call diagnosis: {
  autoCall.settings.enabled: true  ← والآن هنا أيضاً!
}
```

---

## إذا لم يعمل بعد

### تحقق من معرّف المدرسة

في ملف `.env`:
```bash
VITE_AUTO_CALL_FALLBACK_SCHOOL_ID=school_test_001
```

يجب أن يطابق Document ID في Firestore:
```
schools/school_test_001/...
        ^^^^^^^^^^^^^^^^
        نفس القيمة بالضبط
```

### تحقق من Console

ابحث عن رسائل مثل:
```
schoolId: "school_test_001"  ← نفس القيمة
path: "schools/school_test_001/autoCalls/settings"  ← المسار الكامل
```

---

## ملاحظة مهمة

الآن أضفت رسائل debug كثيرة في Console. بعد حل المشكلة، إذا أردت إزالتها، ابحث عن:
- `console.log('🔍 Auto-call diagnosis'`
- `console.log('📡 Firestore settings'`
- `console.log('🔧 normalizeSettings'`

وامسحها من الكود.

---

## الخلاصة

**المشكلة:** وثيقة الإعدادات غير موجودة في Firestore

**الحل:**
1. أنشئ البنية: `schools/{schoolId}/autoCalls/settings`
2. أضف حقل `enabled: true` (boolean)
3. أعد تحميل الصفحة

**المسار الكامل:**
```
schools/school_test_001/autoCalls/settings
```

**الحقل الأهم:**
```
enabled: true (boolean)
```

جرب الآن وأخبرني إذا نجح! 🚀
