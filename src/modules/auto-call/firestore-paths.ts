import { AUTO_CALL_COLLECTION_ROOT, AUTO_CALL_GUARDIANS_COLLECTION, AUTO_CALL_HISTORY_COLLECTION, AUTO_CALL_QUEUE_COLLECTION, AUTO_CALL_SETTINGS_DOC } from './constants'

export function autoCallSettingsPath(schoolId: string) {
  return ['schools', schoolId, AUTO_CALL_COLLECTION_ROOT, AUTO_CALL_SETTINGS_DOC] as const
}

export function autoCallQueuePath(schoolId: string) {
  return ['schools', schoolId, AUTO_CALL_QUEUE_COLLECTION] as const
}

export function autoCallHistoryPath(schoolId: string) {
  return ['schools', schoolId, AUTO_CALL_HISTORY_COLLECTION] as const
}

export function autoCallGuardiansPath(schoolId: string) {
  return ['schools', schoolId, AUTO_CALL_GUARDIANS_COLLECTION] as const
}
