import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, useRoutes } from 'react-router-dom'
import { RootLayout } from '../layouts/root-layout'
import { LandingPage } from '@/modules/core/pages/landing-page'
import { TeacherLoginPage } from '@/modules/auth/pages/teacher-login-page'
import { AdminLoginPage } from '@/modules/auth/pages/admin-login-page'
import { ForgotPasswordPage } from '@/modules/auth/pages/forgot-password-page'
import { SuperAdminLoginPage } from '@/modules/auth/pages/super-admin-login-page'
import { NotFoundPage } from '@/modules/core/pages/not-found-page'
import { RequireAuth, RedirectIfAuthenticated, RequireOnboarding } from '@/modules/auth/components/route-guards'
import { TeacherShell } from '@/modules/teacher/layouts/teacher-shell'
import { AdminShell } from '@/modules/admin/layouts/admin-shell'
import { GuardianShell } from '@/modules/guardian/layouts/guardian-shell'
import { SuperAdminShell } from '@/modules/super-admin/layouts/super-admin-shell'

/* ======================================================
   تقسيم الحزمة (Code Splitting): كل صفحة تُحمَّل عند طلبها
   فقط بدل تنزيل التطبيق كاملاً عند أول فتح.
   الشلات وصفحات الدخول والهبوط تبقى فورية (أول رسمة).
   ====================================================== */

// تحميل كسول لصفحة ذات تصدير مسمّى
function lazyNamed<TModule extends object>(loader: () => Promise<TModule>, name: keyof TModule) {
  return lazy(() =>
    loader().then((module) => ({ default: module[name] as ComponentType<Record<string, unknown>> })),
  )
}

// ── عام / اشتراكات ──
const LandingPageV2 = lazyNamed(() => import('@/modules/core/pages/landing-page-v2'), 'LandingPageV2')
const LandingPageV3 = lazyNamed(() => import('@/modules/core/pages/landing-page-v3'), 'LandingPageV3')
const LandingPageV4 = lazyNamed(() => import('@/modules/core/pages/landing-page-v4'), 'LandingPageV4')
const SubscriptionPlansPage = lazyNamed(() => import('@/modules/subscription/pages/subscription-plans-page'), 'SubscriptionPlansPage')
const SchoolRegistrationPage = lazyNamed(() => import('@/modules/subscription/pages/school-registration-page'), 'SchoolRegistrationPage')
const AdminSubscriptionPage = lazyNamed(() => import('@/modules/subscription/pages/admin-subscription-page'), 'AdminSubscriptionPage')
const PaymentSuccessPage = lazyNamed(() => import('@/modules/subscription/pages/payment-success-page'), 'PaymentSuccessPage')
const PaymentCancelPage = lazyNamed(() => import('@/modules/subscription/pages/payment-cancel-page'), 'PaymentCancelPage')
const PaymentFailedPage = lazyNamed(() => import('@/modules/subscription/pages/payment-failed-page'), 'PaymentFailedPage')
const OnboardingWizardPage = lazyNamed(() => import('@/modules/onboarding/pages/onboarding-wizard-page'), 'OnboardingWizardPage')
const AccountSuspendedPage = lazyNamed(() => import('@/modules/core/pages/account-suspended-page'), 'AccountSuspendedPage')
const PrivacyPolicyPage = lazyNamed(() => import('@/modules/core/pages/privacy-policy-page'), 'PrivacyPolicyPage')
const TermsOfUsePage = lazyNamed(() => import('@/modules/core/pages/terms-of-use-page'), 'TermsOfUsePage')
const CredentialsPage = lazyNamed(() => import('@/modules/core/pages/credentials-page'), 'CredentialsPage')
const ExcuseSubmissionPage = lazyNamed(() => import('@/modules/excuse'), 'ExcuseSubmissionPage')
const ReplySubmissionPage = lazyNamed(() => import('@/modules/reply'), 'ReplySubmissionPage')
const AutoCallDisplayPage = lazyNamed(() => import('@/modules/auto-call/pages/auto-call-display-page'), 'AutoCallDisplayPage')

// ── المعلم ──
const TeacherDashboardPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-dashboard-page'), 'TeacherDashboardPage')
const TeacherSchedulePage = lazyNamed(() => import('@/modules/teacher/pages/teacher-schedule-page'), 'TeacherSchedulePage')
const TeacherMessagesPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-messages-page'), 'TeacherMessagesPage')
const TeacherRepliesPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-replies-page'), 'TeacherRepliesPage')
const TeacherChatPage = lazy(() => import('@/modules/teacher/pages/teacher-chat-page'))
const TeacherPointsPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-points-page'), 'TeacherPointsPage')
const TeacherServicesPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-services-page'), 'TeacherServicesPage')
const TeacherMyServicesPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-my-services-page'), 'TeacherMyServicesPage')
const TeacherActivitiesPage = lazyNamed(() => import('@/modules/activities/pages/teacher-activities-page'), 'TeacherActivitiesPage')
const TeacherReferralsPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-referrals-page'), 'TeacherReferralsPage')
const NewReferralPage = lazyNamed(() => import('@/modules/teacher/pages/new-referral-page'), 'NewReferralPage')
const ReferralDetailPage = lazyNamed(() => import('@/modules/teacher/pages/referral-detail-page'), 'ReferralDetailPage')
const TeacherDelayExcusesPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-delay-excuses-page'), 'TeacherDelayExcusesPage')
const TeacherCoverageRequestPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-coverage-request-page'), 'TeacherCoverageRequestPage')
const TeacherCoverageIncomingPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-coverage-incoming-page'), 'TeacherCoverageIncomingPage')
const TeacherSkillsPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-skills-page'), 'TeacherSkillsPage')
const TeacherLessonPlansPage = lazyNamed(() => import('@/modules/teacher/pages/teacher-lesson-plans-page'), 'TeacherLessonPlansPage')
const TeacherSessionAttendancePage = lazyNamed(() => import('@/modules/teacher/pages/teacher-session-attendance-page'), 'TeacherSessionAttendancePage')

// ── الأدمن: إدارة المدرسة ──
const AdminDashboardPage = lazyNamed(() => import('@/modules/admin/pages/admin-dashboard-page'), 'AdminDashboardPage')
const AdminDashboardV2Page = lazyNamed(() => import('@/modules/admin/pages/admin-dashboard-v2-page'), 'AdminDashboardV2Page')
const AdminSubjectsPage = lazyNamed(() => import('@/modules/admin/pages/admin-subjects-page'), 'AdminSubjectsPage')
const AdminSchedulesPage = lazyNamed(() => import('@/modules/admin/pages/admin-schedules-page'), 'AdminSchedulesPage')
const AdminImportPage = lazyNamed(() => import('@/modules/admin/pages/admin-import-page'), 'AdminImportPage')
const AdminFormsPage = lazyNamed(() => import('@/modules/admin/pages/admin-forms-page'), 'AdminFormsPage')
const AdminFormCreatePage = lazyNamed(() => import('@/modules/admin/pages/admin-form-create-page'), 'AdminFormCreatePage')
const AdminFormDetailPage = lazyNamed(() => import('@/modules/admin/pages/admin-form-detail-page'), 'AdminFormDetailPage')
const AdminFormSubmissionsPage = lazyNamed(() => import('@/modules/admin/pages/admin-form-submissions-page'), 'AdminFormSubmissionsPage')

// ── الأدمن: المعلمون ──
const AdminTeachersPage = lazyNamed(() => import('@/modules/admin/pages/admin-teachers-page'), 'AdminTeachersPage')
const AdminTeacherProfilePage = lazyNamed(() => import('@/modules/admin/pages/admin-teacher-profile-page'), 'AdminTeacherProfilePage')
const AdminTeacherAttendancePage = lazyNamed(() => import('@/modules/admin/pages/admin-teacher-attendance-page'), 'AdminTeacherAttendancePage')
const AdminDelayActionsPage = lazyNamed(() => import('@/modules/admin/delay-actions'), 'AdminDelayActionsPage')
const AdminDutyRostersPage = lazyNamed(() => import('@/modules/admin/pages/admin-duty-rosters-page'), 'AdminDutyRostersPage')
const AdminTeacherStandbyPage = lazyNamed(() => import('@/modules/admin/pages/admin-teacher-standby-page'), 'AdminTeacherStandbyPage')
const AdminTeacherSchedulesPage = lazyNamed(() => import('@/modules/admin/pages/admin-teacher-schedules-page'), 'AdminTeacherSchedulesPage')
const AdminTeacherPreparationPage = lazyNamed(() => import('@/modules/admin/pages/admin-teacher-preparation-page'), 'AdminTeacherPreparationPage')
const AdminMadrasatiReportPage = lazyNamed(() => import('@/modules/admin/pages/admin-madrasati-report-page'), 'AdminMadrasatiReportPage')
const AdminRemoteAttendancePage = lazy(() => import('@/modules/admin/pages/admin-remote-attendance-page'))
const AdminLessonPlansPage = lazyNamed(() => import('@/modules/admin/pages/admin-lesson-plans-page'), 'AdminLessonPlansPage')
const AdminFarisPage = lazy(() => import('@/modules/admin/pages/admin-faris-page'))
const AdminTeamPulsePage = lazyNamed(() => import('@/modules/admin/pages/admin-team-pulse-page'), 'AdminTeamPulsePage')
const LiveTrackerPage = lazyNamed(() => import('@/modules/admin/pages/live-tracker-page'), 'LiveTrackerPage')

// ── الأدمن: الطلاب ──
const AdminStudentsPage = lazyNamed(() => import('@/modules/admin/pages/admin-students-page'), 'AdminStudentsPage')
const AdminStudentProfilePage = lazyNamed(() => import('@/modules/admin/pages/admin-student-profile-page'), 'AdminStudentProfilePage')
const AdminEvaluationSettingsPage = lazyNamed(() => import('@/modules/admin/pages/admin-evaluation-settings-page'), 'AdminEvaluationSettingsPage')
const AdminClassSchedulesPage = lazyNamed(() => import('@/modules/admin/pages/admin-class-schedules-page'), 'AdminClassSchedulesPage')
const AdminClassSessionsPage = lazyNamed(() => import('@/modules/admin/pages/admin-class-sessions-page'), 'AdminClassSessionsPage')
const AdminSchoolTimetablePage = lazyNamed(() => import('@/modules/admin/pages/admin-school-timetable-page'), 'AdminSchoolTimetablePage')
const AdminScheduleSimulatorPage = lazyNamed(() => import('@/modules/admin/pages/admin-schedule-simulator-page'), 'AdminScheduleSimulatorPage')

// ── الأدمن: السلوك والمواظبة ──
const AdminAttendancePage = lazyNamed(() => import('@/modules/admin/pages/admin-attendance-page'), 'AdminAttendancePage')
const AttendanceReportPage = lazyNamed(() => import('@/modules/admin/pages/attendance-report-page'), 'AttendanceReportPage')
const AdminApprovalPage = lazyNamed(() => import('@/modules/admin/pages/admin-approval-page'), 'AdminApprovalPage')
const AdminPeriodAttendancePage = lazyNamed(() => import('@/modules/admin/pages/admin-period-attendance-page'), 'AdminPeriodAttendancePage')
const AdminLateArrivalsPage = lazyNamed(() => import('@/modules/admin/pages/admin-late-arrivals-page'), 'AdminLateArrivalsPage')
const AdminAbsenceExcusesPage = lazyNamed(() => import('@/modules/excuse'), 'AdminAbsenceExcusesPage')
const AdminLeaveRequestsPage = lazyNamed(() => import('@/modules/admin/pages/admin-leave-requests-page'), 'AdminLeaveRequestsPage')
const AdminAbsenceMessagesPage = lazyNamed(() => import('@/modules/admin/pages/admin-absence-messages-page'), 'AdminAbsenceMessagesPage')
const AdminBarcodeAttendancePage = lazyNamed(() => import('@/modules/admin/pages/admin-barcode-attendance-page'), 'AdminBarcodeAttendancePage')
const AdminBarcodeSettingsPage = lazyNamed(() => import('@/modules/admin/pages/admin-barcode-settings-page'), 'AdminBarcodeSettingsPage')
const AdminBarcodePrintPage = lazyNamed(() => import('@/modules/admin/pages/admin-barcode-print-page'), 'AdminBarcodePrintPage')
const AdminBiometricPage = lazyNamed(() => import('@/modules/admin/pages/admin-biometric-page'), 'AdminBiometricPage')
const AdminBehaviorPage = lazyNamed(() => import('@/modules/admin/pages/admin-behavior-page'), 'AdminBehaviorPage')
const AdminBehaviorDetailPage = lazyNamed(() => import('@/modules/admin/pages/admin-behavior-detail-page'), 'AdminBehaviorDetailPage')
const AdminBehaviorPlansPage = lazyNamed(() => import('@/modules/admin/pages/admin-behavior-plans-page'), 'AdminBehaviorPlansPage')
const AdminBehaviorAnalyticsPage = lazyNamed(() => import('@/modules/admin/pages/admin-behavior-analytics-page'), 'AdminBehaviorAnalyticsPage')

// ── الأدمن: التوجيه الطلابي ──
const StudentCasesPage = lazyNamed(() => import('@/modules/admin/pages/student-cases-page'), 'StudentCasesPage')
const StudentCasesListPage = lazyNamed(() => import('@/modules/admin/pages/student-cases-list-page'), 'StudentCasesListPage')
const AdminStudentCaseFormPage = lazyNamed(() => import('@/modules/admin/pages/admin-student-case-form-page'), 'AdminStudentCaseFormPage')
const AdminStudentCaseEditPage = lazyNamed(() => import('@/modules/admin/pages/admin-student-case-form-page'), 'AdminStudentCaseEditPage')
const AdminStudentCaseDetailsPage = lazyNamed(() => import('@/modules/admin/pages/admin-student-case-details-page'), 'AdminStudentCaseDetailsPage')
const TreatmentPlansPage = lazyNamed(() => import('@/modules/admin/pages/treatment-plans-page'), 'TreatmentPlansPage')
const AdminTreatmentPlanFormPage = lazyNamed(() => import('@/modules/admin/pages/admin-treatment-plan-form-page'), 'AdminTreatmentPlanFormPage')
const AdminTreatmentPlanDetailsPage = lazyNamed(() => import('@/modules/admin/pages/admin-treatment-plan-details-page'), 'AdminTreatmentPlanDetailsPage')
const AdminParentMeetingPage = lazy(() => import('@/modules/admin/pages/admin-parent-meeting-page'))
const AdminActivitiesPage = lazyNamed(() => import('@/modules/activities/pages/admin-activities-page'), 'AdminActivitiesPage')
const PointsProgramPage = lazyNamed(() => import('@/modules/admin/pages/points-program-page'), 'PointsProgramPage')
const AdminEStorePage = lazyNamed(() => import('@/modules/admin/pages/admin-e-store-page'), 'AdminEStorePage')
const GuidanceProgramsPage = lazyNamed(() => import('@/modules/admin/pages/guidance-programs-page'), 'GuidanceProgramsPage')
const AdminSummonsPage = lazyNamed(() => import('@/modules/admin/pages/admin-summons-page'), 'AdminSummonsPage')

// ── الأدمن: الإحالات ──
const AdminReferralsPage = lazyNamed(() => import('@/modules/admin/pages/admin-referrals-page'), 'AdminReferralsPage')
const AdminReferralDetailPage = lazyNamed(() => import('@/modules/admin/pages/admin-referral-detail-page'), 'AdminReferralDetailPage')
const AdminParentRepliesPage = lazyNamed(() => import('@/modules/admin/pages/admin-parent-replies-page'), 'AdminParentRepliesPage')

// ── الأدمن: أدوات المدرسة ──
const AdminSchoolBellPage = lazyNamed(() => import('@/modules/admin/pages/admin-school-bell-page'), 'AdminSchoolBellPage')
const AdminAutoCallPage = lazyNamed(() => import('@/modules/admin/pages/admin-auto-call-page'), 'AdminAutoCallPage')
const AdminAcademicCalendarPage = lazyNamed(() => import('@/modules/admin/pages/admin-academic-calendar-page'), 'AdminAcademicCalendarPage')
const AdminChatPage = lazy(() => import('@/modules/admin/pages/admin-chat-page'))
const NotebookWorkspacePage = lazyNamed(() => import('@/modules/notebook/pages/notebook-workspace-page'), 'NotebookWorkspacePage')
const GuideViewerPage = lazyNamed(() => import('@/modules/notebook/pages/guide-viewer-page'), 'GuideViewerPage')

// ── الأدمن: الرسائل ──
const WhatsappHubPage = lazyNamed(() => import('@/modules/admin/pages/whatsapp-hub-page'), 'WhatsappHubPage')
const WhatsAppSendPage = lazyNamed(() => import('@/modules/admin/pages/whatsapp-send-page'), 'WhatsAppSendPage')
const WhatsAppTemplatesPage = lazyNamed(() => import('@/modules/admin/pages/whatsapp-templates-page'), 'WhatsAppTemplatesPage')
const AdminTeacherMessagesPage = lazyNamed(() => import('@/modules/admin/pages/admin-teacher-messages-page'), 'AdminTeacherMessagesPage')
const AdminSmsGatewayPage = lazyNamed(() => import('@/modules/admin/pages/admin-sms-gateway-page'), 'AdminSmsGatewayPage')

// ── الأدمن: الإعدادات والدعم ──
const AdminSettingsPage = lazyNamed(() => import('@/modules/admin/pages/admin-settings-page'), 'AdminSettingsPage')
const AdminThemeSettingsPage = lazyNamed(() => import('@/modules/admin/pages/admin-theme-settings-page'), 'AdminThemeSettingsPage')
const AdminPermissionsPage = lazyNamed(() => import('@/modules/permissions/pages/admin-permissions-page'), 'AdminPermissionsPage')
const AdminAppNotificationsPage = lazy(() => import('@/modules/admin/pages/admin-app-notifications-page'))
const AdminSupportPage = lazyNamed(() => import('@/modules/admin/pages/admin-support-page'), 'AdminSupportPage')

// ── ولي الأمر ──
const GuardianHomePage = lazyNamed(() => import('@/modules/guardian/pages/guardian-home-page'), 'GuardianHomePage')
const GuardianServicesPage = lazyNamed(() => import('@/modules/guardian/pages/guardian-services-page'), 'GuardianServicesPage')
const GuardianFormsPage = lazyNamed(() => import('@/modules/guardian/pages/guardian-forms-page'), 'GuardianFormsPage')
const GuardianMessagesPage = lazyNamed(() => import('@/modules/guardian/pages/guardian-messages-page'), 'GuardianMessagesPage')
const GuardianChatPage = lazy(() => import('@/modules/guardian/pages/guardian-chat-page'))

// ── منصة المشرف العام ──
const PlatformOverviewPage = lazyNamed(() => import('@/modules/super-admin/pages/platform-overview-page'), 'PlatformOverviewPage')
const PlatformSchoolsPage = lazyNamed(() => import('@/modules/super-admin/pages/platform-schools-page'), 'PlatformSchoolsPage')
const PlatformRevenuePage = lazyNamed(() => import('@/modules/super-admin/pages/platform-revenue-page'), 'PlatformRevenuePage')
const PlatformInvoicesPage = lazyNamed(() => import('@/modules/super-admin/pages/platform-invoices-page'), 'PlatformInvoicesPage')
const PlatformAnnouncementsPage = lazyNamed(() => import('@/modules/super-admin/pages/platform-announcements-page'), 'PlatformAnnouncementsPage')

// ── التوجيه (بوابة الموجّه) ──
const GuidanceAccessPage = lazyNamed(() => import('@/modules/guidance/pages'), 'GuidanceAccessPage')
const GuidanceDashboardPage = lazyNamed(() => import('@/modules/guidance/pages'), 'GuidanceDashboardPage')
const GuidanceCasesPage = lazyNamed(() => import('@/modules/guidance/pages'), 'GuidanceCasesPage')
const GuidanceCaseDetailsPage = lazyNamed(() => import('@/modules/guidance/pages'), 'GuidanceCaseDetailsPage')
const GuidanceTreatmentPlansPage = lazyNamed(() => import('@/modules/guidance/pages'), 'TreatmentPlansPage')
const TreatmentPlanFormPage = lazyNamed(() => import('@/modules/guidance/pages'), 'TreatmentPlanFormPage')
const TreatmentPlanDetailsPage = lazyNamed(() => import('@/modules/guidance/pages'), 'TreatmentPlanDetailsPage')
const GuidanceReferralsPage = lazyNamed(() => import('@/modules/guidance/pages'), 'GuidanceReferralsPage')
const GuidanceReferralDetailsPage = lazyNamed(() => import('@/modules/guidance/pages'), 'GuidanceReferralDetailsPage')

/** مؤشر تحميل خفيف يظهر أثناء جلب حزمة الصفحة */
function RouteFallback() {
  return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <span className="ws-spinner" />
    </div>
  )
}

const appRoutes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'landing-v2', element: <LandingPageV2 /> },
      { path: 'landing-v3', element: <LandingPageV3 /> },
      { path: 'story', element: <LandingPageV3 /> },
      { path: 'landing-v4', element: <LandingPageV4 /> },
      { path: 'plans', element: <SubscriptionPlansPage /> },
      { path: 'register', element: <SchoolRegistrationPage /> },
      { path: 'payment/success', element: <PaymentSuccessPage /> },
      { path: 'payment/cancel', element: <PaymentCancelPage /> },
      { path: 'payment/failed', element: <PaymentFailedPage /> },
      {
        path: 'auth/teacher',
        element: (
          <RedirectIfAuthenticated>
            <TeacherLoginPage />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: 'auth/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'auth/admin',
        element: (
          <RedirectIfAuthenticated>
            <AdminLoginPage />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: 'auth/platform',
        element: (
          <RedirectIfAuthenticated>
            <SuperAdminLoginPage />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: 'onboarding',
        element: (
          <RequireOnboarding>
            <OnboardingWizardPage />
          </RequireOnboarding>
        ),
      },
      {
        path: 'teacher',
        element: (
          <RequireAuth role="teacher">
            <TeacherShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="/teacher/dashboard" replace /> },
          { path: 'dashboard', element: <TeacherDashboardPage /> },
          { path: 'schedule', element: <TeacherSchedulePage /> },
          { path: 'messages', element: <TeacherMessagesPage /> },
          { path: 'messages/replies', element: <TeacherRepliesPage /> },
          { path: 'chat', element: <TeacherChatPage /> },
          { path: 'points', element: <TeacherPointsPage /> },
          { path: 'services', element: <TeacherServicesPage /> },
          { path: 'my-services', element: <TeacherMyServicesPage /> },
          { path: 'activities', element: <TeacherActivitiesPage /> },
          { path: 'referrals', element: <TeacherReferralsPage /> },
          { path: 'referrals/new', element: <NewReferralPage /> },
          { path: 'referrals/:id', element: <ReferralDetailPage /> },
          { path: 'delay-excuses', element: <TeacherDelayExcusesPage /> },
          { path: 'coverage-request', element: <TeacherCoverageRequestPage /> },
          { path: 'coverage-incoming', element: <TeacherCoverageIncomingPage /> },
          { path: 'skills', element: <TeacherSkillsPage /> },
          { path: 'lesson-plans', element: <TeacherLessonPlansPage /> },
          { path: 'sessions/:sessionId', element: <TeacherSessionAttendancePage /> },
        ],
      },
      {
        path: 'admin',
        element: (
          <RequireAuth requireManagement>
            <AdminShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'dashboard-v2', element: <AdminDashboardV2Page /> },
          { path: 'teachers', element: <AdminTeachersPage /> },
          { path: 'teacher-profile', element: <AdminTeacherProfilePage /> },
          { path: 'teacher-profile/:teacherId', element: <AdminTeacherProfilePage /> },
          { path: 'students', element: <AdminStudentsPage /> },
          { path: 'students/profile', element: <AdminStudentProfilePage /> },
          { path: 'forms', element: <AdminFormsPage /> },
          { path: 'forms/new', element: <AdminFormCreatePage /> },
          { path: 'forms/:formId', element: <AdminFormDetailPage /> },
          { path: 'forms/:formId/submissions', element: <AdminFormSubmissionsPage /> },
          { path: 'subjects', element: <AdminSubjectsPage /> },
          { path: 'class-sessions', element: <AdminClassSessionsPage /> },
          { path: 'class-schedules', element: <AdminClassSchedulesPage /> },
          { path: 'teacher-schedules', element: <AdminTeacherSchedulesPage /> },
          { path: 'school-timetable', element: <AdminSchoolTimetablePage /> },
          { path: 'schedules', element: <AdminSchedulesPage /> },
          { path: 'import', element: <AdminImportPage /> },
          { path: 'attendance', element: <AdminAttendancePage /> },
          { path: 'teacher-attendance', element: <AdminTeacherAttendancePage /> },
          { path: 'live-tracker', element: <LiveTrackerPage /> },
          { path: 'team-pulse', element: <AdminTeamPulsePage /> },
          { path: 'madrasati-report', element: <AdminMadrasatiReportPage /> },
          { path: 'madrasati-report/:teacherId', element: <AdminMadrasatiReportPage /> },
          { path: 'teacher-preparation', element: <AdminTeacherPreparationPage /> },
          { path: 'approval', element: <AdminApprovalPage /> },
          { path: 'absence-messages', element: <AdminAbsenceMessagesPage /> },
          { path: 'late-arrivals', element: <AdminLateArrivalsPage /> },
          { path: 'delay-actions', element: <AdminDelayActionsPage /> },
          { path: 'duty-rosters', element: <AdminDutyRostersPage /> },
          { path: 'teacher-standby', element: <AdminTeacherStandbyPage /> },
          { path: 'leave-requests', element: <AdminLeaveRequestsPage /> },
          { path: 'barcode-attendance', element: <AdminBarcodeAttendancePage /> },
          { path: 'barcode-settings', element: <AdminBarcodeSettingsPage /> },
          { path: 'barcode-print', element: <AdminBarcodePrintPage /> },
          { path: 'biometric', element: <AdminBiometricPage /> },
          { path: 'period-attendance', element: <AdminPeriodAttendancePage /> },
          { path: 'remote-attendance', element: <AdminRemoteAttendancePage /> },
          { path: 'lesson-plans', element: <AdminLessonPlansPage /> },
          { path: 'faris', element: <AdminFarisPage /> },
          { path: 'parent-meeting', element: <AdminParentMeetingPage /> },
          { path: 'behavior', element: <AdminBehaviorPage /> },
          { path: 'behavior/:violationId', element: <AdminBehaviorDetailPage /> },
          { path: 'behavior/plans', element: <AdminBehaviorPlansPage /> },
          { path: 'behavior/analytics', element: <AdminBehaviorAnalyticsPage /> },
          { path: 'teacher-messages', element: <AdminTeacherMessagesPage /> },
          { path: 'chat', element: <AdminChatPage /> },
          { path: 'student-cases', element: <StudentCasesPage /> },
          { path: 'student-cases/list', element: <StudentCasesListPage /> },
          { path: 'student-cases/new', element: <AdminStudentCaseFormPage mode="create" /> },
          { path: 'student-cases/:caseId', element: <AdminStudentCaseDetailsPage /> },
          { path: 'student-cases/:caseId/edit', element: <AdminStudentCaseEditPage /> },
          { path: 'subscription', element: <AdminSubscriptionPage /> },
          { path: 'treatment-plans', element: <TreatmentPlansPage /> },
          { path: 'treatment-plans/new', element: <AdminTreatmentPlanFormPage /> },
          { path: 'treatment-plans/:planId', element: <AdminTreatmentPlanDetailsPage /> },
          { path: 'points-program', element: <PointsProgramPage /> },
          { path: 'e-store', element: <AdminEStorePage /> },
          { path: 'guidance-programs', element: <GuidanceProgramsPage /> },
          { path: 'summons', element: <AdminSummonsPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
          { path: 'theme', element: <AdminThemeSettingsPage /> },
          { path: 'permissions', element: <AdminPermissionsPage /> },
          { path: 'support', element: <AdminSupportPage /> },
          { path: 'whatsapp', element: <WhatsappHubPage /> },
          { path: 'sms-gateway', element: <AdminSmsGatewayPage /> },
          { path: 'whatsapp-send', element: <WhatsAppSendPage /> },
          { path: 'whatsapp-templates', element: <WhatsAppTemplatesPage /> },
          { path: 'absence-excuses', element: <AdminAbsenceExcusesPage /> },
          { path: 'attendance-report', element: <AttendanceReportPage /> },
          { path: 'school-tools/bell', element: <AdminSchoolBellPage /> },
          { path: 'school-tools/auto-call', element: <AdminAutoCallPage /> },
          { path: 'school-tools/academic-calendar', element: <AdminAcademicCalendarPage /> },
          { path: 'activities', element: <AdminActivitiesPage /> },
          { path: 'referrals', element: <AdminReferralsPage /> },
          { path: 'referrals/guidance', element: <AdminReferralsPage /> },
          { path: 'referrals/behavioral', element: <AdminReferralsPage /> },
          { path: 'referrals/:id', element: <AdminReferralDetailPage /> },
          { path: 'parent-replies', element: <AdminParentRepliesPage /> },
          { path: 'app-notifications', element: <AdminAppNotificationsPage /> },
          { path: 'schedule-simulator', element: <AdminScheduleSimulatorPage /> },
          { path: 'evaluation-settings', element: <AdminEvaluationSettingsPage /> },
          { path: 'notebook', element: <NotebookWorkspacePage /> },
          { path: 'guides/:type', element: <GuideViewerPage /> },
        ],
      },
      {
        path: 'platform',
        element: (
          <RequireAuth role="super_admin">
            <SuperAdminShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="/platform/overview" replace /> },
          { path: 'overview', element: <PlatformOverviewPage /> },
          { path: 'schools', element: <PlatformSchoolsPage /> },
          { path: 'revenue', element: <PlatformRevenuePage /> },
          { path: 'invoices', element: <PlatformInvoicesPage /> },
          { path: 'announcements', element: <PlatformAnnouncementsPage /> },
        ],
      },
      {
        path: 'guardian',
        element: <GuardianShell />,
        children: [
          { index: true, element: <Navigate to="/guardian/home" replace /> },
          { path: 'home', element: <GuardianHomePage /> },
          { path: 'services', element: <GuardianServicesPage /> },
          { path: 'forms', element: <GuardianFormsPage /> },
          { path: 'messages', element: <GuardianMessagesPage /> },
          { path: 'chat', element: <GuardianChatPage /> },
        ],
      },
      // Backwards compatibility for old route
      {
        path: 'guardian/leave-request',
        element: <Navigate to="/guardian/services" replace />,
      },
      {
        path: 'excuse/:token',
        element: <ExcuseSubmissionPage />,
      },
      {
        path: 'reply/:token',
        element: <ReplySubmissionPage />,
      },
      {
        path: 'display/auto-call',
        element: <AutoCallDisplayPage />,
      },
      /* بيانات الدخول التي يفتحها رابطُ بريد الترحيب — عامّةٌ بلا جلسة:
         صاحبُها لم يدخل النظام بعد، وهذه الصفحة هي ما يُدخله. */
      {
        path: 'credentials/:token',
        element: <CredentialsPage />,
      },
      {
        path: 'guidance',
        children: [
          { index: true, element: <GuidanceAccessPage /> },
          { path: 'dashboard', element: <GuidanceDashboardPage /> },
          { path: 'cases', element: <GuidanceCasesPage /> },
          { path: 'cases/:id', element: <GuidanceCaseDetailsPage /> },
          { path: 'treatment-plans', element: <GuidanceTreatmentPlansPage /> },
          { path: 'treatment-plans/new', element: <TreatmentPlanFormPage /> },
          { path: 'treatment-plans/:id', element: <TreatmentPlanDetailsPage /> },
          { path: 'referrals', element: <GuidanceReferralsPage /> },
          { path: 'referrals/:id', element: <GuidanceReferralDetailsPage /> },
        ],
      },
      {
        path: 'privacy-policy',
        element: <PrivacyPolicyPage />,
      },
      {
        path: 'terms',
        element: <TermsOfUsePage />,
      },
      {
        path: 'account-suspended',
        element: <AccountSuspendedPage />,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export function AppRouter() {
  const element = useRoutes(appRoutes)
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}
