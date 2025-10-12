# 🗺️ دليل المسارات - نظام النداء الآلي

## 📍 المسارات الرئيسية

### 1. صفحة ولي الأمر (Guardian Page)
```
http://localhost:5173/guardian/leave-request
```
**الوصف:** يستخدمها ولي الأمر لطلب نداء الطالب واستلامه

**الاستخدام:**
- ولي الأمر يضغط زر "طلب استلام الطالب"
- يتم إضافة الطلب إلى طابور النداء
- يظهر الطالب في شاشة العرض مباشرة

**معاملات URL الاختيارية:**
```
?studentId=123              # تحديد الطالب بالمعرّف
?nationalId=1234567890      # تحديد الطالب برقم الهوية
?school=school_test_001     # تحديد المدرسة
```

---

### 2. شاشة العرض العامة (Public Display)
```
http://localhost:5173/display/auto-call
```
**الوصف:** شاشة عرض عامة تُعرض في مدخل المدرسة لعرض الطلاب المناديَن

**المحتوى:**
- اسم الطالب الحالي (بخط كبير)
- معلومات ولي الأمر والهاتف
- قائمة القادمون (الطابور)
- آخر من تم استلامهم
- إحصائيات (عدد الطلبات، المكتملة، إلخ)

**معاملات URL:**
```
?school=school_test_001     # تحديد المدرسة
?title=مدرسة الرائد          # عنوان مخصص
```

**مثال كامل:**
```
http://localhost:5173/display/auto-call?school=school_test_001&title=مدرسة النور
```

---

### 3. صفحة الإدارة (Admin Panel)
```
http://localhost:5173/admin/auto-call
```
**الوصف:** لوحة تحكم المسؤول للإشراف على نظام النداء الآلي

**الأقسام:**
- **Settings:** إعدادات النظام (تفعيل/تعطيل، أوقات العمل، السبيكر، إلخ)
- **Queue:** طابور الانتظار الحالي (الطلبات النشطة)
- **History:** السجل التاريخي (الطلبات المكتملة)
- **Guardians:** حالات أولياء الأمور (المحظورون، المخالفات)

**معاملات URL:**
```
?tab=queue                  # فتح تبويب الطابور مباشرة
?tab=settings              # فتح الإعدادات
?tab=history               # فتح السجل
?tab=guardians             # فتح قائمة الأولياء
```

**مثال:**
```
http://localhost:5173/admin/auto-call?tab=queue
```

---

## 🎯 سيناريوهات الاستخدام

### سيناريو 1: اختبار نظام النداء الكامل

**الخطوة 1 - افتح شاشة العرض:**
```
http://localhost:5173/display/auto-call
```
اتركها مفتوحة على شاشة منفصلة

**الخطوة 2 - افتح صفحة الإدارة:**
```
http://localhost:5173/admin/auto-call
```
اتركها مفتوحة في تبويب آخر

**الخطوة 3 - افتح صفحة ولي الأمر:**
```
http://localhost:5173/guardian/leave-request
```

**الخطوة 4 - أنشئ طلب نداء:**
من صفحة ولي الأمر، اضغط "طلب استلام الطالب"

**النتيجة:**
- ✅ يظهر الطالب فوراً في شاشة العرض
- ✅ يُضاف إلى طابور الانتظار في صفحة الإدارة
- ✅ تُحدث الإحصائيات في كل الصفحات

---

### سيناريو 2: إعداد النظام لأول مرة

**الخطوة 1 - افتح صفحة الإدارة:**
```
http://localhost:5173/admin/auto-call
```

**الخطوة 2 - اذهب إلى تبويب Settings**

**الخطوة 3 - عدّل الإعدادات:**
- فعّل النظام: `enabled = true`
- اضبط مدة النداء: `announcementDurationSeconds = 30`
- اضبط تكرار النداء: `repeatIntervalSeconds = 120`
- اختر ثيم الشاشة: `displayTheme = dark/light`
- فعّل النطق الآلي: `enableSpeech = true`

**الخطوة 4 - احفظ الإعدادات**

**النتيجة:**
- ✅ يتم حفظ الإعدادات في Firestore
- ✅ تُطبق مباشرة على شاشة العرض
- ✅ تُستخدم في معالجة الطلبات الجديدة

---

### سيناريو 3: مراقبة الطابور وإدارته

**افتح صفحة الإدارة → تبويب Queue:**
```
http://localhost:5173/admin/auto-call?tab=queue
```

**يمكنك:**
- 👁️ رؤية جميع الطلبات النشطة
- ⏸️ إيقاف طلب مؤقتاً
- ✅ تأكيد استلام طالب
- ❌ إلغاء طلب
- 🔄 إعادة نداء يدوياً

---

## 📱 الوصول من الهاتف المحمول

### خطوات الإعداد:

1. **احصل على IP المحلي للكمبيوتر:**
   ```powershell
   ipconfig
   ```
   ابحث عن `IPv4 Address` (مثل: 192.168.1.100)

2. **تأكد من تشغيل الخادم:**
   ```powershell
   npm run dev
   ```

3. **على الهاتف (نفس الشبكة)، افتح:**
   ```
   http://192.168.1.100:5173/guardian/leave-request
   ```
   (استبدل IP بالفعلي)

---

## 🔐 صلاحيات الوصول

| المسار | من يستخدمه | يحتاج تسجيل دخول؟ |
|--------|------------|------------------|
| `/guardian/leave-request` | ولي الأمر | اختياري* |
| `/display/auto-call` | الجمهور | لا |
| `/admin/auto-call` | المسؤول | نعم** |

*يعتمد على إعدادات Laravel Backend
**حالياً للتطوير، بدون حماية - يجب إضافة حماية في الإنتاج

---

## 🎨 تخصيص المسارات

### تغيير بادئة المسار (Path Prefix)

لتغيير المسارات من `/guardian/` إلى `/parent/` مثلاً:

**ملف:** `src/app/router/app-router.tsx`

```typescript
// قبل
{ path: 'guardian/leave-request', element: <GuardianLeaveRequestPage /> }

// بعد
{ path: 'parent/leave-request', element: <GuardianLeaveRequestPage /> }
```

### إضافة معاملات افتراضية

يمكنك ضبط معاملات افتراضية في الكود:

**ملف:** `.env`
```bash
VITE_AUTO_CALL_FALLBACK_SCHOOL_ID=school_test_001
```

---

## 🧭 خريطة التنقل الكاملة

```
/
├── guardian/
│   └── leave-request          # صفحة ولي الأمر
│
├── display/
│   └── auto-call             # شاشة العرض العامة
│
├── admin/
│   ├── auto-call             # لوحة تحكم النداء الآلي
│   ├── students              # إدارة الطلاب
│   ├── teachers              # إدارة المعلمين
│   └── ...                   # صفحات إدارة أخرى
│
└── ...                       # مسارات أخرى في النظام
```

---

## 🔧 أدوات مساعدة

### فتح جميع الصفحات دفعة واحدة (PowerShell)

```powershell
# احفظ هذا السكريبت في ملف open-all-pages.ps1
Start-Process "http://localhost:5173/display/auto-call"
Start-Sleep -Seconds 1
Start-Process "http://localhost:5173/admin/auto-call"
Start-Sleep -Seconds 1
Start-Process "http://localhost:5173/guardian/leave-request"
```

تشغيل:
```powershell
.\open-all-pages.ps1
```

---

## 📚 ملفات التوثيق ذات الصلة

- `FIRESTORE_QUICK_START.md` - إعداد Firebase خطوة بخطوة
- `FIREBASE_SETUP_GUIDE.md` - دليل Firestore الشامل
- `GUARDIAN_PAGE_GUIDE.md` - دليل صفحة ولي الأمر المفصل

---

## 🆘 حل المشاكل

### لا تفتح الصفحة - خطأ 404

**السبب:** الخادم غير مشغل أو المسار خاطئ

**الحل:**
```powershell
cd "c:/Users/ALBAR/OneDrive/سطح المكتب/norin/فرونت جديد"
npm run dev
```

### الصفحة تفتح لكن فارغة أو بها أخطاء

**الحل:**
1. افتح Developer Tools (F12)
2. تحقق من Console للأخطاء
3. تأكد من Firestore مُعد بشكل صحيح (راجع `FIRESTORE_QUICK_START.md`)

### لا تظهر البيانات

**الحل:**
1. تحقق من `.env` يحتوي على متغيرات Firebase
2. تحقق من `VITE_AUTO_CALL_FALLBACK_SCHOOL_ID` محدد
3. أعد تشغيل الخادم بعد تعديل `.env`

---

**جاهز للبدء؟**

افتح صفحة ولي الأمر وجرب إنشاء أول طلب نداء! 🚀

```
http://localhost:5173/guardian/leave-request
```
