import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Binary } from 'lucide-react'

interface GuideComingSoonProps {
    title: string
    subtitle?: string
}

export function GuideComingSoon({ title, subtitle }: GuideComingSoonProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Floating geometric shapes configuration
    const shapes = [
        { type: 'circle', size: 100, x: '10%', y: '20%', color: 'bg-blue-500/10', delay: 0 },
        { type: 'square', size: 150, x: '80%', y: '15%', color: 'bg-purple-500/10', delay: 2 },
        { type: 'triangle', size: 120, x: '20%', y: '80%', color: 'bg-emerald-500/10', delay: 1 },
        { type: 'circle', size: 80, x: '85%', y: '70%', color: 'bg-orange-500/10', delay: 3 },
        { type: 'square', size: 60, x: '50%', y: '50%', color: 'bg-pink-500/10', delay: 1.5 },
    ]

    // Content snippets from the guide to display as "data streams" with more variety
    const dataStreams = [
        "10110... الهيكل التنظيمي: إطار يوضح علاقة الترابط...",
        "01101... الخطة التشغيلية: الإطار العام لأهداف المدرسة...",
        "11001... نواتج التعلم: كل ما يكتسبه الطالب من معارف...",
        "00111... التعليم الإلكتروني: توظيف التقنيات لرفع الكفاءة...",
        "10010... المعلمون: ركيزة العملية التعليمية...",
        "01010... مدير المدرسة: المسؤول الأول عن سير العمل...",
        "11100... التوجيه الطلابي: رعاية فئـات الطلاب...",
        "00011... لجنة التميز: نشر ثقافة الجودة...",
        "10101... الأمن والسلامة: توفير بيئة مدرسية آمنة...",
        "01110... التحصيل الدراسي: تحسين نواتج التعلم...",
        "11011... الوكلاء: متابعة سير الدراسة والانتظام...",
        "00100... رائد النشاط: تفعيل البرامج اللاصفية...",
        "10001... الموجه الصحي: تعزيز الصحة المدرسية...",
        "01100... أمين المصادر: تفعيل مركز مصادر التعلم...",
        "11110... محضر المختبر: تجهيز المعامل والتجارب...",
        "00010... المساعد الإداري: تنظيم الأعمال الإدارية...",
        "10100... مسجل المعلومات: تحديث بيانات الطلاب...",
        "01001... فريق الصندوق المدرسي: إدارة الموارد المالية...",
        "11010... فريق ذوي الإعاقة: تقديم الخدمات المساندة...",
        "00110... اللجنة الإدارية: التخطيط والتنظيم المدرس...",
        "10011... نماذج الهياكل: تنظيم الأدوار والمسؤوليات...",
        "01011... التعليم المستمر: فرص التعلم مدى الحياة...",
        "11101... الطفولة المبكرة: تأسيس قوي للمستقبل...",
        "00001... الاستثمار الأمثل: كفاءة الإنفاق والتشغيل...",
    ]

    return (
        <div
            className="relative w-full h-full min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5 flex flex-col items-center justify-center"
            ref={containerRef}
        >
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

            {/* Floating Shapes */}
            {shapes.map((shape, i) => (
                <motion.div
                    key={i}
                    className={`absolute ${shape.color} backdrop-blur-3xl rounded-full mix-blend-multiply filter blur-xl`}
                    style={{
                        width: shape.size,
                        height: shape.size,
                        left: shape.x,
                        top: shape.y,
                        borderRadius: shape.type === 'square' ? '20%' : '50%',
                    }}
                    animate={{
                        y: [0, -20, 0],
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 5 + i,
                        repeat: Infinity,
                        delay: shape.delay,
                        ease: "easeInOut",
                    }}
                />
            ))}

            {/* Data Streams (Scrolling Background) */}
            <div className="absolute inset-x-0 top-0 bottom-0 overflow-hidden select-none"
                style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
                {dataStreams.map((text, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-sm font-mono text-primary/30 whitespace-nowrap"
                        initial={{ x: '100vw' }}
                        animate={{ x: '-100vw' }}
                        transition={{
                            duration: 60 + Math.random() * 40, // Much slower (60s to 100s)
                            repeat: Infinity,
                            delay: -(Math.random() * 50), // Start immediately at random positions
                            ease: "linear",
                        }}
                        style={{
                            top: `${(i * 4) % 95}%`, // Distribute vertically
                        }}
                    >
                        {text}
                    </motion.div>
                ))}
            </div>

            {/* Main Content Card */}
            <motion.div
                className="relative z-10 p-8 max-w-2xl mx-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="relative bg-background/80 backdrop-blur-xl border border-primary/10 rounded-3xl shadow-2xl p-8 overflow-hidden">
                    {/* Scanning Line Effect */}
                    <motion.div
                        className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    />

                    <div className="flex flex-col items-center text-center gap-6">
                        {/* Animated Icon */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                            <div className="relative bg-background border border-primary/20 p-4 rounded-2xl shadow-inner">
                                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                            </div>

                            {/* Orbiting dots */}
                            <motion.div
                                className="absolute inset-0 rounded-full border border-dashed border-primary/30"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                                {title}
                            </h1>
                            <h2 className="text-xl text-muted-foreground font-light">
                                {subtitle || 'جاري تجهيز بيئة العمل الرقمية المتكاملة'}
                            </h2>
                        </div>

                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent my-2" />

                        <div className="space-y-4 max-w-lg">
                            <p className="text-lg font-medium text-foreground/80">
                                قريباً سيتم إضافته بشكل رائع
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                نعمل حالياً على تحويل الدليل التنظيمي إلى تجربة تفاعلية ذكية تتيح لك الوصول إلى
                                الهياكل التنظيمية، والمهام، والتعريفات بشكل فوري وسلسل.
                            </p>
                        </div>

                        {/* Interactive Badge */}
                        <motion.div
                            className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-mono text-primary mt-4 cursor-default"
                            whileHover={{ scale: 1.05 }}
                        >
                            <Binary className="w-3 h-3" />
                            <span>جاري المعالجة الرقمية...</span>
                            <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-ping ml-1" />
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* Decorative Bottom Text */}
            <div className="absolute bottom-8 text-center px-4">
                <p className="text-sm text-muted-foreground/50 font-medium tracking-wide">
                    نظام الرائد للإدارة المدرسية
                </p>
            </div>
        </div>
    )
}
