import { useState, useEffect } from 'react'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'

interface User {
    id: number
    name: string
    email: string
    role: string
}

export default function FCMTestPage() {
    const toast = useToast()
    const [users, setUsers] = useState<User[]>([])
    const [selectedUserId, setSelectedUserId] = useState('')
    const [title, setTitle] = useState('إشعار تجريبي 🔔')
    const [body, setBody] = useState('هذا إشعار تجريبي من لوحة الاختبار')
    const [imageUrl, setImageUrl] = useState('') // صورة اختيارية
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)

    // جلب قائمة المعلمين
    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const response = await apiClient.get('/admin/teachers')
            setUsers(response.data.data || [])
        } catch (error) {
            console.error('Error fetching users:', error)
            toast({ type: 'error', title: 'فشل جلب قائمة المعلمين' })
        } finally {
            setLoading(false)
        }
    }

    const sendNotification = async () => {
        if (!selectedUserId) {
            toast({ type: 'warning', title: 'يرجى اختيار معلم' })
            return
        }

        if (!title.trim() || !body.trim()) {
            toast({ type: 'warning', title: 'يرجى إدخال عنوان ونص الإشعار' })
            return
        }

        setSending(true)
        try {
            const response = await apiClient.post('/fcm/send-custom', {
                user_id: parseInt(selectedUserId),
                title: title.trim(),
                body: body.trim(),
                image: imageUrl.trim() || undefined, // صورة اختيارية
            })

            if (response.data.success) {
                toast({
                    type: 'success',
                    title: 'تم إرسال الإشعار!',
                    description: `إلى: ${response.data.user.name}`,
                })
            } else {
                throw new Error(response.data.message || 'فشل الإرسال')
            }
        } catch (error: any) {
            console.error('Error sending notification:', error)

            // رسالة واضحة للمعلم الذي لم يفعل الإشعارات
            const errorMsg = error.response?.data?.message || error.message || ''
            const isNoToken = errorMsg.includes('لا يوجد جهاز') || errorMsg.includes('no device')

            toast({
                type: 'error',
                title: isNoToken ? '❌ المعلم لم يفعّل الإشعارات' : 'فشل إرسال الإشعار',
                description: isNoToken
                    ? 'يجب على المعلم تفعيل الإشعارات من إعداداته أولاً'
                    : errorMsg,
            })
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-3xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        🔔 اختبار الإشعارات
                    </h1>
                    <p className="mt-2 text-gray-600">
                        إرسال إشعارات تجريبية للمعلمين للتأكد من عمل النظام
                    </p>
                </div>

                {/* Main Card */}
                <div className="rounded-xl bg-white p-8 shadow-lg">
                    {/* Select User */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                            اختر المعلم
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            disabled={loading}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">-- اختر معلم --</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Title Input */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                            عنوان الإشعار
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="إشعار تجريبي 🔔"
                            maxLength={100}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {title.length}/100 حرف
                        </p>
                    </div>

                    {/* Body Input */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                            نص الإشعار
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="هذا إشعار تجريبي من لوحة الاختبار"
                            maxLength={500}
                            rows={4}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {body.length}/500 حرف
                        </p>
                    </div>

                    {/* Image URL Input */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                            رابط الصورة (اختياري)
                        </label>
                        <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            اختياري: أضف رابط صورة لتظهر في الإشعار
                        </p>
                    </div>

                    {/* Preview */}
                    <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                            معاينة الإشعار
                        </p>
                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="text-2xl">🔔</div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">
                                        {title || 'عنوان الإشعار'}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {body || 'نص الإشعار'}
                                    </p>
                                    {imageUrl && (
                                        <img
                                            src={imageUrl}
                                            alt="Preview"
                                            className="mt-2 max-h-40 w-full rounded object-cover"
                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                    )}
                                    <p className="mt-2 text-xs text-gray-400">الآن</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={sendNotification}
                        disabled={sending || loading || !selectedUserId}
                        className="w-full rounded-lg bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {sending ? (
                            <>
                                <span className="inline-block animate-spin">⏳</span>
                                <span className="mr-2">جاري الإرسال...</span>
                            </>
                        ) : (
                            <>
                                <span>🚀</span>
                                <span className="mr-2">إرسال الإشعار</span>
                            </>
                        )}
                    </button>

                    {/* Help Text */}
                    <div className="mt-6 rounded-lg bg-blue-50 p-4">
                        <p className="text-sm font-semibold text-blue-900">
                            💡 ملاحظة مهمة:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-blue-800">
                            <li>• الإشعار سيظهر فقط إذا كان المعلم قد فعّل الإشعارات</li>
                            <li>• قد لا يظهر الإشعار إذا كانت الصفحة نشطة (في Focus)</li>
                            <li>• جرب تصغير المتصفح بعد الإرسال لرؤية الإشعار</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
