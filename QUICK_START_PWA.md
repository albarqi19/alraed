# 🚀 دليل سريع لاختبار PWA

## الخطوة 1: تشغيل التطبيق
```bash
cd "فرونت جديد"
npm run dev
```

## الخطوة 2: فتح المتصفح
افتح Chrome وانتقل إلى: http://localhost:5173

## الخطوة 3: فتح Developer Tools
اضغط F12 أو Ctrl+Shift+I

## الخطوة 4: تحقق من PWA

### في تبويب "Application":

1. **Manifest** ✅
   - يجب أن تشاهد:
   ```json
   {
     "name": "نظام الرائد للإدارة المدرسية - المعلم",
     "short_name": "نظام الرائد",
     "theme_color": "#218081",
     "start_url": "/teacher"
   }
   ```

2. **Service Workers** ✅
   - يجب أن تشاهد:
   - Status: activated and running
   - Source: /dev-sw.js?dev-sw

3. **Cache Storage** ✅
   - يجب أن تشاهد:
   - workbox-precache-v2
   - google-fonts-cache
   - cdn-cache

## الخطوة 5: اختبار Offline

1. في تبويب "Network"
2. اختر "Offline" من القائمة المنسدلة
3. أعد تحميل الصفحة (F5)
4. يجب أن تعمل الصفحة بدون مشاكل! ✅

## الخطوة 6: اختبار التثبيت (Desktop)

في Chrome Desktop:
- ستظهر أيقونة تثبيت في شريط العنوان (+)
- اضغط عليها لتثبيت التطبيق
- سيفتح التطبيق في نافذة منفصلة

## الخطوة 7: اختبار على الموبايل

### للاختبار المحلي:
1. اعثر على عنوان IP للجهاز:
   ```bash
   ipconfig
   ```
2. افتح على الموبايل: http://[YOUR-IP]:5173
3. ستظهر رسالة "Add to Home Screen"
4. اضغط عليها للتثبيت

### للاختبار على الإنتاج:
- يجب نشر التطبيق على HTTPS
- افتح الرابط على الموبايل
- اضغط "Add to Home Screen"

## ما يجب أن تراه:

### ✅ في وضع التطوير (dev):
- Service Worker يعمل
- Manifest موجود
- Cache يعمل
- رسالة في Console: "PWA ready to work offline"

### ✅ بعد البناء (build):
- ملف manifest.webmanifest في dist/
- ملف sw.js في dist/
- جميع الملفات في dist/assets/

## استكشاف الأخطاء:

### المشكلة: Service Worker لا يعمل
**الحل:** تأكد من أنك تستخدم http://localhost (وليس 127.0.0.1)

### المشكلة: الأيقونات لا تظهر
**الحل:** أنشئ أيقونات PNG حقيقية من icon.svg

### المشكلة: "Add to Home Screen" لا تظهر
**الحل:** 
- تأكد من أن HTTPS مفعّل (للإنتاج)
- تأكد من وجود manifest صحيح
- تأكد من وجود جميع الأيقونات

## نصائح:

1. **للتطوير**: استخدم `npm run dev`
2. **للبناء**: استخدم `npm run build`
3. **لاختبار البناء**: استخدم `npm run preview`
4. **لمسح Cache**: 
   - Developer Tools > Application > Clear storage > Clear site data

## الأوامر المفيدة:

```bash
# تشغيل التطوير
npm run dev

# بناء للإنتاج
npm run build

# معاينة البناء
npm run preview

# تنظيف
rm -rf dist node_modules/.vite
```

---

## 🎉 النتيجة المتوقعة:

عند فتح التطبيق:
1. ✅ التطبيق يعمل
2. ✅ Service Worker مسجل
3. ✅ يمكن التثبيت
4. ✅ يعمل بدون اتصال
5. ✅ تحديثات تلقائية

**جرب الآن!** 🚀
