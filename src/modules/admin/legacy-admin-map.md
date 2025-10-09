# Legacy Admin Surface Map

هذا المستند يلخص أقسام لوحة الإدارة في الواجهة القديمة (`front_end/app.js`) ويربطها بنقاط النهاية في خدمة `apiService`. سيتم استخدامه كمرجع عند بناء واجهة React الجديدة.

## الأقسام الرئيسية

| القسم | الدالة في الواجهة القديمة | الوصف | أهم نقاط النهاية |
| --- | --- | --- | --- |
| النظرة العامة | `getOverviewContent` | بطاقات إحصائية (عدد الطلاب، المعلمين، الحضور اليومي) + رسم بياني للحضور + قائمة أنشطة | `GET /admin/dashboard-stats` |
| إدارة المعلمين | `getTeachersContent` | جدول المعلمين مع (إضافة، تعديل، إعادة تعيين كلمة المرور، تعطيل) | `GET /admin/teachers`, `POST /admin/teachers`, `PUT /admin/teachers/{id}`, `DELETE /admin/teachers/{id}`, `POST /admin/teachers/{id}/reset-password` |
| إدارة الطلاب | `getStudentsContent` | جدول الطلاب مع CRUD + مودال إضافة | `GET /admin/students`, `POST /admin/students`, `PUT /admin/students/{id}`, `DELETE /admin/students/{id}` |
| إدارة المواد | `getSubjectsContent` | جدول المواد مع CRUD | `GET /admin/subjects`, `POST /admin/subjects`, `PUT /admin/subjects/{id}`, `DELETE /admin/subjects/{id}` |
| إدارة الحصص | `getClassesContent` | جدول زمني أسبوعي للحصص حسب اليوم مع CRUD | `GET /admin/class-sessions`, `POST /admin/class-sessions`, `PUT /admin/class-sessions/{id}`, `DELETE /admin/class-sessions/{id}` |
| إدارة الفصول (صفوف) | `getGradesContent` | تجميع الحصص بحسب الصف/الشعبة مع CRUD | نفس نقاط نهاية الحصص أعلاه + `GET /admin/class-schedules/session-data` |
| جداول الفصول | `showClassScheduleView` و `getClassSchedule` | شبكة جدول لفصل محدد + تطبيق جداول جاهزة | `GET /admin/class-schedules/classes`, `GET /admin/class-schedules/{grade}/{class}`, `POST /admin/class-schedules/quick-session`, `POST /admin/class-schedules/apply-schedule`, `DELETE /admin/class-schedules/sessions/{id}` |
| الجداول الزمنية (Schedules) | `getSchedulesContent` | إدارة نسخ الجداول (إنشاء، تفعيل، حذف) | `GET /admin/schedules`, `GET /admin/schedules/{id}`, `POST /admin/schedules`, `POST /admin/schedules/{id}/activate`, `DELETE /admin/schedules/{id}`, `GET /admin/schedules/templates` |
| تقارير الحضور | `getAttendanceReportsContent` | فلاتر وتصدير، اعتماد/رفض السجلات، تفاصيل الجلسة | `GET /admin/attendance-reports`, `GET /admin/attendance-reports/{id}/details`, `POST /admin/attendance-reports/{id}/approve`, `POST /admin/attendance-reports/{id}/reject`, `POST /admin/attendance-reports/approve-session`, `POST /admin/attendance-reports/reject-session`, `GET /admin/attendance-reports/export/{format}` |
| اعتماد التحضير | `getApprovalContent` | قائمة التحضير المعلق مع اعتماد/رفض وإرسال واتساب | `GET /admin/attendance-reports/pending-approvals`, `POST /admin/attendance-reports/approve-session`, `POST /admin/attendance-reports/reject-session` |
| التأخرات | `getLateArrivalsContent` | متابعة الطلاب المتأخرين وتحديث حالتهم | `GET /admin/late-arrivals`, `POST /admin/late-arrivals/{id}/resolve` (مذكورة في ملفات أخرى) |
| الاستيراد | `showImportSection`, `importStudents`, `importTeachers`, `showPreviewModal`, `confirmImport` | استيراد الطلاب والمعلمين من Excel مع معاينة، تنزيل قوالب | `POST /admin/import/students/preview`, `POST /admin/import/students`, `POST /admin/import/students?delete_missing/update_existing`, `POST /admin/import/teachers`, `GET /admin/import/students/template`, `GET /admin/import/teachers/template` |
| الإعدادات | `showSettingsSection`, `loadSettings`, `saveSettings`, `testWebhook` | ضبط اسم المدرسة، الهاتف، خيارات الإشعارات، webhook | `GET /admin/settings`, `PUT /admin/settings`, `POST /admin/settings/test-webhook` |
| مركز الواتساب | `getWhatsapp*` series | إحصائيات الواتساب، قائمة الانتظار، الإعدادات، القوالب | `GET /admin/whatsapp/statistics`, `GET /admin/whatsapp/queue`, `DELETE /admin/whatsapp/queue/{id}`, `POST /admin/whatsapp/send-pending`, `POST /admin/whatsapp/send-single/{id}`, `GET /admin/whatsapp/history`, `GET /admin/whatsapp/settings`, `PUT /admin/whatsapp/settings`, `GET /admin/whatsapp/templates`, `POST /admin/whatsapp/templates`, `PUT /admin/whatsapp/templates/{id}`, `DELETE /admin/whatsapp/templates/{id}`, `POST /admin/whatsapp/test-connection` |

## عناصر داعمة يجب أخذها بالحسبان

- **المودالات الشائعة**: إضافة/تعديل معلم، طالب، مادة، حصة؛ معاينة الاستيراد؛ تفاصيل تحضير.
- **التحقق من الهوية والجوال**: دوال `validateSaudiID` و `validateSaudiPhone` مستخدمة قبل إرسال البيانات.
- **المكوّنات التفاعلية**: أزرار نسخ كلمة المرور، إظهار/إخفاء، حزم Bootstrap modals/toasts.
- **الاستيراد متعدد المراحل**: معاينة ثم تطبيق مع خيارات تحديث/حذف.
- **فلترة التقارير**: تحميل القوائم المساعدة (الصفوف، المعلمين) قبل عرض النتائج.
- **اعتماد التحضير**: بعد الاعتماد يتم إرسال إشعارات واتساب ويجب تحديث القوائم.
- **تقارير الجلسات**: واجهة تفاصيل تقدم ملخصًا وإحصائيات ورسائل WhatsApp محتملة.

## اعتبارات عند إعادة البناء في React

1. **تنظيم الصفحات**: استخدام React Router لمسارات داخلية مثل `/admin/teachers`, `/admin/students`, ...
2. **مصادر البيانات**: إنشاء طبقة API في `src/modules/admin/api.ts` مع توحيد الأنواع بـ TypeScript.
3. **إدارة الحالة**: الاستفادة من TanStack Query للاستعلامات/التحmutations + Zustand للفلترات المشتركة.
4. **المودالات**: بناء مودالات قابلة لإعادة الاستخدام (ربما عبر portal) لعمليات CRUD والاستيراد.
5. **التنبيهات**: إعادة استخدام نظام التوست الموجود في `src/shared/toast` بدلاً من bootstrap.
6. **الجدولة والجداول**: استخدام مكوّنات جدول/بطاقات مع دعم RTL و responsive.
7. **الترجمة**: الحفاظ على النصوص العربية مع إمكانية استخراجها لاحقًا لملف ترجمة.
8. **التوافق مع العمليات القديمة**: نفس التحقق من الهوية/الهاتف، نفس خيارات الاستيراد، نفس شروط الاعتماد.

> سيُستخدم هذا المستند كأساس لتفصيل المهام اللاحقة (تصميم الهيكل، بناء الصفحات)، ويمكن تحديثه عند اكتشاف وظائف إضافية أثناء القراءة المتعمقة لبقية الملفات.
