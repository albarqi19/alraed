// API functions for teacher message reply

export interface ReplyData {
    student_name: string
    teacher_name: string
    subject_name: string
    school_name: string
    message_content: string
    template_title: string
    sent_at: string
    expires_at: string
}

export interface ReplyResponse {
    success: boolean
    message?: string
    error_code?: string
    can_reply?: boolean
    data?: ReplyData
    replied_at?: string
    errors?: Record<string, string[]>
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.brqq.site/api'

/**
 * Get reply data by token
 */
export async function getReplyByToken(token: string): Promise<ReplyResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/reply/${token}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })
        return response.json()
    } catch {
        return { success: false, message: 'حدث خطأ في الاتصال بالخادم' }
    }
}

/**
 * Submit reply to teacher message
 */
export async function submitReply(
    token: string,
    replyText: string
): Promise<ReplyResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/reply/${token}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reply_text: replyText }),
        })
        return response.json()
    } catch {
        return { success: false, message: 'حدث خطأ في الاتصال بالخادم' }
    }
}
