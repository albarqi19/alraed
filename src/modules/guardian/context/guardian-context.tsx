import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { GuardianStudentSummary, GuardianPortalSettings, GuardianStoreOverview } from '../types'
import { useGuardianSettingsQuery, useGuardianStudentLookupMutation, useGuardianStoreOverviewQuery } from '../hooks'

interface GuardianContextValue {
    // Student session
    currentNationalId: string | null
    studentSummary: GuardianStudentSummary | null
    isLoggedIn: boolean

    // Settings
    settingsQuery: ReturnType<typeof useGuardianSettingsQuery>
    guardianSettings: GuardianPortalSettings | null

    // Store overview
    storeOverview: GuardianStoreOverview | null

    // Auth actions
    nationalIdInput: string
    setNationalIdInput: (value: string) => void
    phoneLast4Input: string
    setPhoneLast4Input: (value: string) => void
    handleLogin: (nationalId: string, phoneLast4: string) => Promise<void>
    handleLogout: () => void
    isLoggingIn: boolean
    loginError: string | null

    // Store modal
    isStoreModalOpen: boolean
    openStoreModal: () => void
    closeStoreModal: () => void
}

const GuardianContext = createContext<GuardianContextValue | null>(null)

export function useGuardianContext() {
    const context = useContext(GuardianContext)
    if (!context) {
        throw new Error('useGuardianContext must be used within a GuardianProvider')
    }
    return context
}

interface GuardianProviderProps {
    children: ReactNode
}

export function GuardianProvider({ children }: GuardianProviderProps) {
    // Student session state
    const [currentNationalId, setCurrentNationalId] = useState<string | null>(null)
    const [studentSummary, setStudentSummary] = useState<GuardianStudentSummary | null>(null)
    const [nationalIdInput, setNationalIdInput] = useState('')
    const [phoneLast4Input, setPhoneLast4Input] = useState('')
    const [loginError, setLoginError] = useState<string | null>(null)

    // Store modal state
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false)

    // Queries
    const settingsQuery = useGuardianSettingsQuery()
    const storeOverviewQuery = useGuardianStoreOverviewQuery(currentNationalId)
    const lookupMutation = useGuardianStudentLookupMutation()

    const guardianSettings = settingsQuery.data ?? null
    const storeOverview = storeOverviewQuery.data ?? null
    const isLoggedIn = Boolean(studentSummary && currentNationalId)

    const handleLogin = useCallback(async (nationalId: string, phoneLast4: string) => {
        const trimmedNationalId = nationalId.trim()
        const trimmedPhoneLast4 = phoneLast4.trim()

        if (!trimmedNationalId || trimmedNationalId.length !== 10) {
            setLoginError('يرجى إدخال رقم هوية الطالب المكون من 10 أرقام')
            return
        }

        if (!trimmedPhoneLast4 || trimmedPhoneLast4.length !== 4) {
            setLoginError('يرجى إدخال آخر 4 أرقام من رقم الجوال المسجل')
            return
        }

        setLoginError(null)

        try {
            const summary = await lookupMutation.mutateAsync({
                national_id: trimmedNationalId,
                phone_last4: trimmedPhoneLast4,
            })
            setStudentSummary(summary)
            setCurrentNationalId(trimmedNationalId)
        } catch {
            setLoginError('تعذر العثور على بيانات الطالب. تأكد من رقم الهوية وآخر 4 أرقام من الجوال.')
        }
    }, [lookupMutation])

    const handleLogout = useCallback(() => {
        setStudentSummary(null)
        setCurrentNationalId(null)
        setNationalIdInput('')
        setPhoneLast4Input('')
        setLoginError(null)
        setIsStoreModalOpen(false)
    }, [])

    const openStoreModal = useCallback(() => setIsStoreModalOpen(true), [])
    const closeStoreModal = useCallback(() => setIsStoreModalOpen(false), [])

    const value = useMemo<GuardianContextValue>(() => ({
        currentNationalId,
        studentSummary,
        isLoggedIn,
        settingsQuery,
        guardianSettings,
        storeOverview,
        nationalIdInput,
        setNationalIdInput,
        phoneLast4Input,
        setPhoneLast4Input,
        handleLogin,
        handleLogout,
        isLoggingIn: lookupMutation.isPending,
        loginError,
        isStoreModalOpen,
        openStoreModal,
        closeStoreModal,
    }), [
        currentNationalId,
        studentSummary,
        isLoggedIn,
        settingsQuery,
        guardianSettings,
        storeOverview,
        nationalIdInput,
        phoneLast4Input,
        handleLogin,
        handleLogout,
        lookupMutation.isPending,
        loginError,
        isStoreModalOpen,
        openStoreModal,
        closeStoreModal,
    ])

    return (
        <GuardianContext.Provider value={value}>
            {children}
        </GuardianContext.Provider>
    )
}
