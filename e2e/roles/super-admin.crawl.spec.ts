/**
 * زحف صفحات دور: المشرف العام — منصّة إدارة المدارس والفوترة
 *
 * القائمة تُبنى آلياً من الراوتر — لا تُحرَّر هنا يدوياً.
 * أضف صفحةً في app-router.tsx وستُفحص تلقائياً في أوّل تشغيلٍ بعدها.
 */
import { registerCrawl } from '../crawl/register'

registerCrawl('super-admin')
