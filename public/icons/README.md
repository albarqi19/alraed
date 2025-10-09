# تعليمات إنشاء أيقونات PWA

يمكنك استخدام أحد الطرق التالية لإنشاء الأيقونات:

## الطريقة 1: استخدام أدوات أونلاين
1. اذهب إلى https://realfavicongenerator.net/ أو https://favicon.io/
2. ارفع ملف icon.svg الموجود في مجلد public/icons
3. قم بتحميل جميع الأحجام المطلوبة
4. ضعها في مجلد public/icons

## الطريقة 2: استخدام ImageMagick (من سطر الأوامر)
```bash
# تثبيت ImageMagick أولاً
# ثم تشغيل الأوامر التالية:

convert icon.svg -resize 72x72 icon-72x72.png
convert icon.svg -resize 96x96 icon-96x96.png
convert icon.svg -resize 128x128 icon-128x128.png
convert icon.svg -resize 144x144 icon-144x144.png
convert icon.svg -resize 152x152 icon-152x152.png
convert icon.svg -resize 192x192 icon-192x192.png
convert icon.svg -resize 384x384 icon-384x384.png
convert icon.svg -resize 512x512 icon-512x512.png
```

## الطريقة 3: استخدام أداة PWA Asset Generator
```bash
npm install -g pwa-asset-generator
pwa-asset-generator icon.svg ./icons --icon-only --type png
```

## الأحجام المطلوبة:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

ملاحظة: جميع الملفات يجب أن تكون بصيغة PNG وتوضع في مجلد public/icons
