/**
 * زحف صفحات دور: المعلم — لوحته وجدوله وحصصه وإحالاته
 *
 * القائمة تُبنى آلياً من الراوتر — لا تُحرَّر هنا يدوياً.
 * أضف صفحةً في app-router.tsx وستُفحص تلقائياً في أوّل تشغيلٍ بعدها.
 */
import { registerCrawl } from '../crawl/register'

registerCrawl('teacher')
