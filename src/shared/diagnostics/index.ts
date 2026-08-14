/**
 * بوّابة التشخيص: فتات المسار + رقم البلاغ.
 *
 * الاستيراد من هنا لا من الملفّات مباشرةً — فإن تغيّر التقسيم الداخليّ لاحقاً
 * (ترميز الترويسة مثلاً) لم يتغيّر شيءٌ عند المستوردين.
 */

export {
  BREADCRUMB_HEADER,
  BREADCRUMB_HEADER_MAX_BYTES,
  clearBreadcrumbs,
  encodeBreadcrumbHeader,
  installBreadcrumbCollectors,
  recordClick,
  recordFieldChange,
  recordNavigation,
  recordNetworkFailure,
  snapshotBreadcrumbs,
} from './breadcrumbs'
export type { Breadcrumb } from './breadcrumbs'

export {
  REQUEST_ID_HEADER,
  formatIncidentId,
  getLastIncidentId,
  incidentSuffix,
  readIncidentId,
  withIncident,
} from './incident'

export {
  REDACTION_LIMITS,
  classifyFieldName,
  maskValue,
  redactFieldName,
  redactUrl,
} from './redaction'
export type { FieldClass } from './redaction'
