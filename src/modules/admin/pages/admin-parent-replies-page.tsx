import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, MessageSquare, School, User, Calendar, Eye, EyeOff, CheckCheck, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

interface ParentReply {
    id: number
    type: 'referral' | 'teacher_message'
    type_label: string
    student_name: string
    student_grade: string
    student_class: string
    source_title: string
    source_id: number
    sent_message: string | null
    reply_text: string
    replied_at: string
    replied_at_formatted: string
    is_read: boolean
    read_at: string | null
    receiver_name: string
}

interface ParentRepliesStats {
    total: number
    unread: number
    referral: { total: number; unread: number }
    teacher_message: { total: number; unread: number }
}

interface ParentRepliesResponse {
    success: boolean
    data: ParentReply[]
    stats: ParentRepliesStats
    meta: {
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
}

export function AdminParentRepliesPage() {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<'all' | 'referral' | 'teacher_message'>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
    const [selectedReply, setSelectedReply] = useState<ParentReply | null>(null)

    const { data, isLoading, error } = useQuery<ParentRepliesResponse>({
        queryKey: ['parent-replies', activeTab, statusFilter],
        queryFn: async () => {
            const response = await apiClient.get<ParentRepliesResponse>('/admin/parent-replies', {
                params: { type: activeTab, status: statusFilter }
            })
            return response.data
        },
    })

    const markAsReadMutation = useMutation({
        mutationFn: (reply: ParentReply) =>
            apiClient.post(`/admin/parent-replies/${reply.type}/${reply.id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parent-replies'] })
            toast.success('تم تحديد الرد كمقروء')
        },
        onError: () => {
            toast.error('حدث خطأ أثناء تحديث حالة الرد')
        }
    })

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const response = await apiClient.post<{ message: string }>('/admin/parent-replies/mark-all-read', { type: activeTab })
            return response.data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['parent-replies'] })
            toast.success(data.message)
        },
        onError: () => {
            toast.error('حدث خطأ')
        }
    })

    const handleReplyClick = (reply: ParentReply) => {
        setSelectedReply(reply)
        if (!reply.is_read) {
            markAsReadMutation.mutate(reply)
        }
    }

    const stats = data?.stats

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-500">
                حدث خطأ في تحميل البيانات
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        ردود أولياء الأمور
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        جميع الردود الواردة من أولياء الأمور على الإشعارات والرسائل
                    </p>
                </div>

                {stats && stats.unread > 0 && (
                    <Button
                        variant="outline"
                        onClick={() => markAllAsReadMutation.mutate()}
                        disabled={markAllAsReadMutation.isPending}
                    >
                        {markAllAsReadMutation.isPending ? (
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                            <CheckCheck className="w-4 h-4 ml-2" />
                        )}
                        تحديد الكل كمقروء
                    </Button>
                )}
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>إجمالي الردود</CardDescription>
                            <CardTitle className="text-3xl">{stats.total}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm">
                                <Badge variant={stats.unread > 0 ? "destructive" : "secondary"}>
                                    {stats.unread} غير مقروء
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-sky-200 dark:border-sky-800">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <School className="w-4 h-4" />
                                ردود الإحالات
                            </CardDescription>
                            <CardTitle className="text-3xl text-sky-600">{stats.referral.total}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge variant={stats.referral.unread > 0 ? "destructive" : "secondary"}>
                                {stats.referral.unread} غير مقروء
                            </Badge>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-200 dark:border-emerald-800">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                ردود رسائل المعلمين
                            </CardDescription>
                            <CardTitle className="text-3xl text-emerald-600">{stats.teacher_message.total}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge variant={stats.teacher_message.unread > 0 ? "destructive" : "secondary"}>
                                {stats.teacher_message.unread} غير مقروء
                            </Badge>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs and Content */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                            <TabsList>
                                <TabsTrigger value="all" className="gap-2">
                                    الكل
                                    {stats && <Badge variant="secondary">{stats.total}</Badge>}
                                </TabsTrigger>
                                <TabsTrigger value="referral" className="gap-2">
                                    <School className="w-4 h-4" />
                                    الإحالات
                                    {stats && <Badge variant="secondary">{stats.referral.total}</Badge>}
                                </TabsTrigger>
                                <TabsTrigger value="teacher_message" className="gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    رسائل المعلمين
                                    {stats && <Badge variant="secondary">{stats.teacher_message.total}</Badge>}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="حالة القراءة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                <SelectItem value="unread">غير مقروء</SelectItem>
                                <SelectItem value="read">مقروء</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Replies List */}
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {data?.data.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>لا توجد ردود</p>
                                </div>
                            ) : (
                                data?.data.map((reply) => (
                                    <div
                                        key={`${reply.type}-${reply.id}`}
                                        onClick={() => handleReplyClick(reply)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${selectedReply?.id === reply.id && selectedReply?.type === reply.type
                                            ? 'border-primary bg-primary/5'
                                            : reply.is_read
                                                ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                                : 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant={reply.type === 'referral' ? 'default' : 'secondary'} className="text-xs">
                                                        {reply.type_label}
                                                    </Badge>
                                                    {!reply.is_read && (
                                                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                                                    )}
                                                </div>
                                                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                    {reply.student_name}
                                                </p>
                                                <p className="text-sm text-slate-500 truncate">
                                                    {reply.source_title}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {reply.replied_at_formatted}
                                                </p>
                                            </div>
                                            <div className="text-slate-400">
                                                {reply.is_read ? (
                                                    <Eye className="w-4 h-4" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4 text-sky-500" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Reply Detail */}
                        <div className="lg:border-r lg:pr-6">
                            {selectedReply ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Badge variant={selectedReply.type === 'referral' ? 'default' : 'secondary'}>
                                            {selectedReply.type_label}
                                        </Badge>
                                        {selectedReply.type === 'referral' && selectedReply.source_id && (
                                            <Link to={`/admin/referrals/${selectedReply.source_id}`}>
                                                <Button variant="outline" size="sm" className="gap-2">
                                                    <ExternalLink className="w-4 h-4" />
                                                    عرض الإحالة
                                                </Button>
                                            </Link>
                                        )}
                                    </div>

                                    {/* Student Info */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{selectedReply.student_name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {selectedReply.student_grade} - {selectedReply.student_class}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Original Message */}
                                    {selectedReply.sent_message && (
                                        <div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                الرسالة الأصلية:
                                            </p>
                                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                                                    {selectedReply.sent_message}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Parent Reply */}
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            رد ولي الأمر:
                                        </p>
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                            <p className="text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap">
                                                {selectedReply.reply_text}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Meta */}
                                    <div className="pt-4 border-t text-sm text-slate-500 space-y-1">
                                        <p>
                                            <span className="font-medium">المستلم:</span> {selectedReply.receiver_name}
                                        </p>
                                        <p>
                                            <span className="font-medium">وقت الرد:</span> {selectedReply.replied_at_formatted}
                                        </p>
                                        {selectedReply.read_at && (
                                            <p>
                                                <span className="font-medium">تم القراءة:</span> {new Date(selectedReply.read_at).toLocaleString('ar-SA')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-12 text-slate-500">
                                    <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
                                    <p>اختر رداً لعرض تفاصيله</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
