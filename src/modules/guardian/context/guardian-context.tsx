import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import type { GuardianStudentSummary, GuardianPortalSettings, GuardianStoreOverview } from '../types'
import { useGuardianSettingsQuery, useGuardianStudentLookupMutation, useGuardianStoreOverviewQuery } from '../hooks'

// ============ Session Storage Types ============
interface StoredChild {
    national_id: string
    phone_last4: string
    name: string
    grade: string
    class_name: string
    parent_name: string | null
    parent_phone: string | null
}

interface GuardianSession {
    children: StoredChild[]
    activeChildIndex: number
    expiresAt: number // timestamp
}

const STORAGE_KEY = 'guardian_session'
const SESSION_DURATION_DAYS = 30

// ============ localStorage Helpers ============
function saveSession(session: GuardianSession): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
        // localStorage might be full or disabled
    }
}

function loadSession(): GuardianSession | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return null

        const session: GuardianSession = JSON.parse(stored)

        // Check expiry
        if (Date.now() > session.expiresAt) {
            localStorage.removeItem(STORAGE_KEY)
            return null
        }

        return session
    } catch {
        return null
    }
}

function clearSession(): void {
    localStorage.removeItem(STORAGE_KEY)
}

interface GuardianContextValue {
    // Student session
    currentNationalId: string | null
    studentSummary: GuardianStudentSummary | null
    isLoggedIn: boolean

    // Multi-child support
    children: StoredChild[]
    activeChildIndex: number
    switchChild: (index: number) => void
    removeChild: (index: number) => void
    hasMultipleChildren: boolean
    showAddChildForm: boolean
    setShowAddChildForm: (show: boolean) => void

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
    handleLogoutAll: () => void
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

export function GuardianProvider({ children: childrenProp }: GuardianProviderProps) {
    // Multi-child session state
    const [storedChildren, setStoredChildren] = useState<StoredChild[]>([])
    const [activeChildIndex, setActiveChildIndex] = useState(0)
    const [showAddChildForm, setShowAddChildForm] = useState(false)

    // Current student summary (derived from active child)
    const [studentSummary, setStudentSummary] = useState<GuardianStudentSummary | null>(null)

    // Login form state
    const [nationalIdInput, setNationalIdInput] = useState('')
    const [phoneLast4Input, setPhoneLast4Input] = useState('')
    const [loginError, setLoginError] = useState<string | null>(null)

    // Store modal state
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false)

    // Derived values
    const activeChild = storedChildren[activeChildIndex] ?? null
    const currentNationalId = activeChild?.national_id ?? null
    const isLoggedIn = storedChildren.length > 0 && activeChild !== null
    const hasMultipleChildren = storedChildren.length > 1

    // Queries
    const settingsQuery = useGuardianSettingsQuery()
    const storeOverviewQuery = useGuardianStoreOverviewQuery(currentNationalId)
    const lookupMutation = useGuardianStudentLookupMutation()

    const guardianSettings = settingsQuery.data ?? null
    const storeOverview = storeOverviewQuery.data ?? null

    // Restore session from localStorage on mount
    useEffect(() => {
        const session = loadSession()
        if (session && session.children.length > 0) {
            setStoredChildren(session.children)
            setActiveChildIndex(session.activeChildIndex)

            // Set student summary from stored data
            const child = session.children[session.activeChildIndex]
            if (child) {
                setStudentSummary({
                    student_id: 0, // Will be fetched if needed
                    name: child.name,
                    grade: child.grade,
                    class_name: child.class_name,
                    parent_name: child.parent_name ?? '',
                    parent_phone: child.parent_phone ?? '',
                })
            }
        }
    }, [])

    // Save session to localStorage whenever children or activeIndex changes
    useEffect(() => {
        if (storedChildren.length > 0) {
            const session: GuardianSession = {
                children: storedChildren,
                activeChildIndex,
                expiresAt: Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
            }
            saveSession(session)
        }
    }, [storedChildren, activeChildIndex])

    // Update studentSummary when activeChild changes
    useEffect(() => {
        if (activeChild) {
            setStudentSummary({
                student_id: 0,
                name: activeChild.name,
                grade: activeChild.grade,
                class_name: activeChild.class_name,
                parent_name: activeChild.parent_name ?? '',
                parent_phone: activeChild.parent_phone ?? '',
            })
        }
    }, [activeChild])

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

        // Check if this child is already added
        const existingIndex = storedChildren.findIndex(c => c.national_id === trimmedNationalId)
        if (existingIndex !== -1) {
            // Switch to existing child
            setActiveChildIndex(existingIndex)
            setNationalIdInput('')
            setPhoneLast4Input('')
            setLoginError(null)
            setShowAddChildForm(false)
            return
        }

        setLoginError(null)

        try {
            const summary = await lookupMutation.mutateAsync({
                national_id: trimmedNationalId,
                phone_last4: trimmedPhoneLast4,
            })

            // Add new child to list
            const newChild: StoredChild = {
                national_id: trimmedNationalId,
                phone_last4: trimmedPhoneLast4,
                name: summary.name,
                grade: summary.grade,
                class_name: summary.class_name,
                parent_name: summary.parent_name,
                parent_phone: summary.parent_phone,
            }

            setStoredChildren(prev => [...prev, newChild])
            setActiveChildIndex(storedChildren.length) // Switch to newly added child
            setStudentSummary(summary)
            setNationalIdInput('')
            setPhoneLast4Input('')
            setShowAddChildForm(false)
        } catch {
            setLoginError('تعذر العثور على بيانات الطالب. تأكد من رقم الهوية وآخر 4 أرقام من الجوال.')
        }
    }, [lookupMutation, storedChildren])

    const switchChild = useCallback((index: number) => {
        if (index >= 0 && index < storedChildren.length) {
            setActiveChildIndex(index)
        }
    }, [storedChildren.length])

    const removeChild = useCallback((index: number) => {
        if (storedChildren.length <= 1) {
            // If removing last child, clear everything
            setStoredChildren([])
            setActiveChildIndex(0)
            setStudentSummary(null)
            clearSession()
            return
        }

        setStoredChildren(prev => prev.filter((_, i) => i !== index))

        // Adjust active index if needed
        if (index === activeChildIndex) {
            setActiveChildIndex(0)
        } else if (index < activeChildIndex) {
            setActiveChildIndex(prev => prev - 1)
        }
    }, [storedChildren.length, activeChildIndex])

    const handleLogout = useCallback(() => {
        // Logout current child only
        removeChild(activeChildIndex)
        setIsStoreModalOpen(false)
    }, [removeChild, activeChildIndex])

    const handleLogoutAll = useCallback(() => {
        setStoredChildren([])
        setActiveChildIndex(0)
        setStudentSummary(null)
        setNationalIdInput('')
        setPhoneLast4Input('')
        setLoginError(null)
        setIsStoreModalOpen(false)
        clearSession()
    }, [])

    const openStoreModal = useCallback(() => setIsStoreModalOpen(true), [])
    const closeStoreModal = useCallback(() => setIsStoreModalOpen(false), [])

    const value = useMemo<GuardianContextValue>(() => ({
        currentNationalId,
        studentSummary,
        isLoggedIn,

        // Multi-child support
        children: storedChildren,
        activeChildIndex,
        switchChild,
        removeChild,
        hasMultipleChildren,
        showAddChildForm,
        setShowAddChildForm,

        settingsQuery,
        guardianSettings,
        storeOverview,
        nationalIdInput,
        setNationalIdInput,
        phoneLast4Input,
        setPhoneLast4Input,
        handleLogin,
        handleLogout,
        handleLogoutAll,
        isLoggingIn: lookupMutation.isPending,
        loginError,
        isStoreModalOpen,
        openStoreModal,
        closeStoreModal,
    }), [
        currentNationalId,
        studentSummary,
        isLoggedIn,
        storedChildren,
        activeChildIndex,
        switchChild,
        removeChild,
        hasMultipleChildren,
        showAddChildForm,
        settingsQuery,
        guardianSettings,
        storeOverview,
        nationalIdInput,
        phoneLast4Input,
        handleLogin,
        handleLogout,
        handleLogoutAll,
        lookupMutation.isPending,
        loginError,
        isStoreModalOpen,
        openStoreModal,
        closeStoreModal,
    ])

    return (
        <GuardianContext.Provider value={value}>
            {childrenProp}
        </GuardianContext.Provider>
    )
}
