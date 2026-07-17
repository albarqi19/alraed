import { useNavigate } from 'react-router-dom'
import { CalendarCheck2, ClipboardList, NotebookPen } from 'lucide-react'
import { WsPage, WsHeader, WsLayout, WsMain, WsBlock, WsBtn, TONES } from '@/shared/workspace'

export function AdminBehaviorPlansPage() {
  const navigate = useNavigate()

  return (
    <WsPage>
      <WsHeader title="خطط المعالجة السلوكية" />
      <WsLayout>
        <WsMain>
          <WsBlock fill padded>
            <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', paddingTop: 40 }}>
              <span
                style={{
                  display: 'inline-flex',
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: TONES.purple.bg,
                  color: TONES.purple.tx,
                  marginBottom: 14,
                }}
              >
                <NotebookPen style={{ width: 28, height: 28 }} />
              </span>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>خطط المعالجة السلوكية</h2>
              <p style={{ margin: '0 auto', maxWidth: 440, fontSize: 13, color: 'var(--ws-text-2)', lineHeight: 1.8 }}>
                خطط معالجة المخالفات السلوكية تُنشأ وتُتابَع ضمن «الخطط العلاجية» — فكلاهما يسكن السجل
                نفسه، وإنشاء خطة من مخالفة سلوكية يضيفها هناك مباشرةً.
              </p>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
                <WsBtn variant="primary" icon={ClipboardList} onClick={() => navigate('/admin/treatment-plans')}>
                  فتح الخطط العلاجية
                </WsBtn>
              </div>

              <div style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                <CalendarCheck2 style={{ width: 14, height: 14 }} />
                لوحة مخصّصة للخطط السلوكية قيد التطوير للإصدار القادم
              </div>
            </div>
          </WsBlock>
        </WsMain>
      </WsLayout>
    </WsPage>
  )
}
