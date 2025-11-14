export type GuardianInvitationData = {
  schoolName: string
  region?: string | null
  studentName: string
  grade: string
  className: string
  meetingDay: string
  meetingDateHijri: string
  meetingDateGregorian: string
  meetingPurpose: string
  meetingTime: string
  issueDateHijri: string
  issueDateGregorian: string
  principalName?: string | null
}

const GuardianInvitationTemplate = ({ data }: { data: GuardianInvitationData }) => (
  <div className="invitation-sheet">
    <header className="invitation-header">
      <div className="invitation-header-line">
        <span>المملكة العربية السعودية</span>
        <span>{data.schoolName}</span>
      </div>
      <div className="invitation-header-line" style={{ marginTop: '3px' }}>
        <span>وزارة التعليم</span>
        <span>{data.region?.trim() || ''}</span>
      </div>
    </header>

    <h1 className="invitation-title">خطاب دعوة ولي الأمر</h1>

    <table className="invitation-info-table">
      <tbody>
        <tr>
          <th>اسم الطالب/ـة</th>
          <td>{data.studentName}</td>
          <th>الصف</th>
          <td>{data.grade}</td>
        </tr>
        <tr>
          <th>الشعبة</th>
          <td>{data.className}</td>
          <th>تاريخ الدعوة</th>
          <td>{data.issueDateHijri}</td>
        </tr>
      </tbody>
    </table>

    <section className="invitation-body">
      <p>المكرم ولي أمر الطالب/ـة <span className="invitation-highlight">{data.studentName}</span></p>
      <p style={{ marginTop: '4mm' }}>السلام عليكم ورحمة الله وبركاته،</p>
      <p style={{ marginTop: '3mm' }}>
        نأمل منكم الحضور إلى المدرسة في يوم{' '}
        <span className="invitation-highlight">{data.meetingDay}</span> الموافق{' '}
        <span className="invitation-highlight">{data.meetingDateGregorian}</span> ({data.meetingDateHijri})
        في تمام الساعة <span className="invitation-highlight">{data.meetingTime}</span>
      </p>
      <div className="invitation-purpose-box">
        <strong>الغرض من الدعوة:</strong> {data.meetingPurpose}
      </div>
      <p style={{ marginTop: '3mm' }}>
        شاكرين لكم تعاونكم معنا بما يحقق مصلحة الطالب/ـة.
      </p>
    </section>

    <section className="invitation-signature-row">
      <div className="invitation-signature-block">
        <p style={{ fontWeight: 700, marginBottom: '2mm' }}>مدير/ة المدرسة</p>
        <p>الاسم: <span className="invitation-highlight">{data.principalName?.trim() || '......................'}</span></p>
        <div className="invitation-signature-line" style={{ margin: '8mm 0 2mm' }}></div>
        <p style={{ fontSize: '10px', color: '#64748b' }}>التوقيع</p>
      </div>
      <div className="invitation-signature-block">
        <p style={{ fontWeight: 700, marginBottom: '2mm' }}>الختم</p>
        <div className="invitation-signature-line" style={{ margin: '28mm 0 2mm' }}></div>
      </div>
    </section>

    <section className="invitation-response-box">
      <p style={{ fontWeight: 700, marginBottom: '3mm', color: '#0f172a' }}>رد ولي الأمر:</p>
      <div className="checkbox-line">
        <span className="checkbox"></span>
        <span>أقر بالعلم، وسأحضر في الموعد المحدد.</span>
      </div>
      <div className="checkbox-line">
        <span className="checkbox"></span>
        <span>أعتذر عن الحضور لظروف خاصة.</span>
      </div>
      <div style={{ marginTop: '4mm', display: 'flex', gap: '4mm', flexWrap: 'wrap' }}>
        <span>الاسم: <span className="invitation-highlight" style={{ minWidth: '60mm' }}>..................</span></span>
        <span>التوقيع: <span className="invitation-highlight" style={{ minWidth: '40mm' }}>..................</span></span>
      </div>
    </section>

    <footer className="invitation-footer-note">
      تاريخ الإصدار: {data.issueDateGregorian} ({data.issueDateHijri})
    </footer>
  </div>
)

GuardianInvitationTemplate.displayName = 'GuardianInvitationTemplate'

export { GuardianInvitationTemplate }

