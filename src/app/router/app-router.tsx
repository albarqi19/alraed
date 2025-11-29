import { Navigate, useRoutes } from 'react-router-dom'
import { RootLayout } from '../layouts/root-layout'
import { LandingPage } from '@/modules/core/pages/landing-page'
import { TeacherLoginPage } from '@/modules/auth/pages/teacher-login-page'
import { AdminLoginPage } from '@/modules/auth/pages/admin-login-page'
import { ForgotPasswordPage } from '@/modules/auth/pages/forgot-password-page'
import { TeacherDashboardPage } from '@/modules/teacher/pages/teacher-dashboard-page'
import { TeacherMessagesPage } from '@/modules/teacher/pages/teacher-messages-page'
import { TeacherPointsPage } from '@/modules/teacher/pages/teacher-points-page'
import { TeacherServicesPage } from '@/modules/teacher/pages/teacher-services-page'
import { AdminDashboardPage } from '@/modules/admin/pages/admin-dashboard-page'
import { AdminTeachersPage } from '@/modules/admin/pages/admin-teachers-page'
import { AdminStudentsPage } from '@/modules/admin/pages/admin-students-page'
import { AdminStudentProfilePage } from '@/modules/admin/pages/admin-student-profile-page'
import { AdminSubjectsPage } from '@/modules/admin/pages/admin-subjects-page'
import { AdminFormsPage } from '@/modules/admin/pages/admin-forms-page'
import { AdminFormCreatePage } from '@/modules/admin/pages/admin-form-create-page'
import { AdminFormDetailPage } from '@/modules/admin/pages/admin-form-detail-page'
import { AdminFormSubmissionsPage } from '@/modules/admin/pages/admin-form-submissions-page'
import { AdminClassSessionsPage } from '@/modules/admin/pages/admin-class-sessions-page'
import { AdminClassSchedulesPage } from '@/modules/admin/pages/admin-class-schedules-page'
import { AdminTeacherSchedulesPage } from '@/modules/admin/pages/admin-teacher-schedules-page'
import { AdminSchoolTimetablePage } from '@/modules/admin/pages/admin-school-timetable-page'
import { AdminSchedulesPage } from '@/modules/admin/pages/admin-schedules-page'
import { AdminImportPage } from '@/modules/admin/pages/admin-import-page'
import { AdminAttendancePage } from '@/modules/admin/pages/admin-attendance-page'
import { AdminTeacherAttendancePage } from '@/modules/admin/pages/admin-teacher-attendance-page'
import { AdminTeacherPreparationPage } from '@/modules/admin/pages/admin-teacher-preparation-page'
import { AdminApprovalPage } from '@/modules/admin/pages/admin-approval-page'
import { AdminAbsenceMessagesPage } from '@/modules/admin/pages/admin-absence-messages-page'
import { AdminLateArrivalsPage } from '@/modules/admin/pages/admin-late-arrivals-page'
import { AdminDutyRostersPage } from '@/modules/admin/pages/admin-duty-rosters-page'
import { AdminTeacherMessagesPage } from '@/modules/admin/pages/admin-teacher-messages-page'
import { AdminSettingsPage } from '@/modules/admin/pages/admin-settings-page'
import { AdminThemeSettingsPage } from '@/modules/admin/pages/admin-theme-settings-page'
import { WhatsappHubPage } from '@/modules/admin/pages/whatsapp-hub-page'
import { AdminSmsGatewayPage } from '@/modules/admin/pages/admin-sms-gateway-page'
import { AttendanceReportPage } from '@/modules/admin/pages/attendance-report-page'
import { StudentCasesPage } from '@/modules/admin/pages/student-cases-page'
import { TreatmentPlansPage } from '@/modules/admin/pages/treatment-plans-page'
import { PointsProgramPage } from '@/modules/admin/pages/points-program-page'
import { AdminEStorePage } from '@/modules/admin/pages/admin-e-store-page'
import { GuidanceProgramsPage } from '@/modules/admin/pages/guidance-programs-page'
import { SummonsPage } from '@/modules/admin/pages/summons-page'
import { WhatsAppSendPage } from '@/modules/admin/pages/whatsapp-send-page'
import { WhatsAppTemplatesPage } from '@/modules/admin/pages/whatsapp-templates-page'
import { StudentCasesListPage } from '@/modules/admin/pages/student-cases-list-page'
import { StudentCaseDetailsPage } from '@/modules/admin/pages/student-case-details-page'
import { StudentCaseFormPage } from '@/modules/admin/pages/student-case-form-page'
import { AdminLeaveRequestsPage } from '@/modules/admin/pages/admin-leave-requests-page'
import { GuardianLeaveRequestPage } from '@/modules/guardian/pages/guardian-leave-request-page'
import { NotFoundPage } from '@/modules/core/pages/not-found-page'
import { RequireAuth, RedirectIfAuthenticated } from '@/modules/auth/components/route-guards'
import { TeacherShell } from '@/modules/teacher/layouts/teacher-shell'
import { TeacherSchedulePage } from '@/modules/teacher/pages/teacher-schedule-page'
import { AdminShell } from '@/modules/admin/layouts/admin-shell'
import { TeacherSessionAttendancePage } from '@/modules/teacher/pages/teacher-session-attendance-page'
import { SubscriptionPlansPage } from '@/modules/subscription/pages/subscription-plans-page'
import { SchoolRegistrationPage } from '@/modules/subscription/pages/school-registration-page'
import { AdminSubscriptionPage } from '@/modules/subscription/pages/admin-subscription-page'
import { SuperAdminLoginPage } from '@/modules/auth/pages/super-admin-login-page'
import { SuperAdminShell } from '@/modules/super-admin/layouts/super-admin-shell'
import { PlatformOverviewPage } from '@/modules/super-admin/pages/platform-overview-page'
import { PlatformSchoolsPage } from '@/modules/super-admin/pages/platform-schools-page'
import { PlatformRevenuePage } from '@/modules/super-admin/pages/platform-revenue-page'
import { PlatformInvoicesPage } from '@/modules/super-admin/pages/platform-invoices-page'
import { AdminSchoolBellPage } from '@/modules/admin/pages/admin-school-bell-page'
import { AdminAutoCallPage } from '@/modules/admin/pages/admin-auto-call-page'
import { AutoCallDisplayPage } from '@/modules/auto-call/pages/auto-call-display-page'
import { AdminAcademicCalendarPage } from '@/modules/admin/pages/admin-academic-calendar-page'
import { AdminBehaviorPage } from '@/modules/admin/pages/admin-behavior-page'
import { AdminBehaviorDetailPage } from '@/modules/admin/pages/admin-behavior-detail-page'
import { AdminBehaviorPlansPage } from '@/modules/admin/pages/admin-behavior-plans-page'
import { AdminBehaviorAnalyticsPage } from '@/modules/admin/pages/admin-behavior-analytics-page'
import { AdminPermissionsPage } from '@/modules/permissions/pages/admin-permissions-page'
import { ExcuseSubmissionPage, AdminAbsenceExcusesPage } from '@/modules/excuse'
import {
  GuidanceAccessPage,
  GuidanceDashboardPage,
  GuidanceCasesPage,
  GuidanceCaseDetailsPage,
  TreatmentPlansPage as GuidanceTreatmentPlansPage,
  TreatmentPlanFormPage,
  TreatmentPlanDetailsPage,
} from '@/modules/guidance/pages'

const appRoutes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'plans', element: <SubscriptionPlansPage /> },
      { path: 'register', element: <SchoolRegistrationPage /> },
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
          { path: 'points', element: <TeacherPointsPage /> },
          { path: 'services', element: <TeacherServicesPage /> },
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
          { path: 'teachers', element: <AdminTeachersPage /> },
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
          { path: 'teacher-preparation', element: <AdminTeacherPreparationPage /> },
          { path: 'approval', element: <AdminApprovalPage /> },
          { path: 'absence-messages', element: <AdminAbsenceMessagesPage /> },
          { path: 'late-arrivals', element: <AdminLateArrivalsPage /> },
          { path: 'duty-rosters', element: <AdminDutyRostersPage /> },
          { path: 'leave-requests', element: <AdminLeaveRequestsPage /> },
          { path: 'behavior', element: <AdminBehaviorPage /> },
          { path: 'behavior/:violationId', element: <AdminBehaviorDetailPage /> },
          { path: 'behavior/plans', element: <AdminBehaviorPlansPage /> },
          { path: 'behavior/analytics', element: <AdminBehaviorAnalyticsPage /> },
          { path: 'teacher-messages', element: <AdminTeacherMessagesPage /> },
          { path: 'student-cases', element: <StudentCasesPage /> },
          { path: 'student-cases/list', element: <StudentCasesListPage /> },
          { path: 'student-cases/new', element: <StudentCaseFormPage /> },
          { path: 'student-cases/:caseId', element: <StudentCaseDetailsPage /> },
          { path: 'subscription', element: <AdminSubscriptionPage /> },
          { path: 'treatment-plans', element: <TreatmentPlansPage /> },
          { path: 'points-program', element: <PointsProgramPage /> },
          { path: 'e-store', element: <AdminEStorePage /> },
          { path: 'guidance-programs', element: <GuidanceProgramsPage /> },
          { path: 'summons', element: <SummonsPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
          { path: 'theme', element: <AdminThemeSettingsPage /> },
          { path: 'permissions', element: <AdminPermissionsPage /> },
          { path: 'whatsapp', element: <WhatsappHubPage /> },
          { path: 'sms-gateway', element: <AdminSmsGatewayPage /> },
          { path: 'whatsapp-send', element: <WhatsAppSendPage /> },
          { path: 'whatsapp-templates', element: <WhatsAppTemplatesPage /> },
          { path: 'absence-excuses', element: <AdminAbsenceExcusesPage /> },
          { path: 'attendance-report', element: <AttendanceReportPage /> },
          { path: 'school-tools/bell', element: <AdminSchoolBellPage /> },
          { path: 'school-tools/auto-call', element: <AdminAutoCallPage /> },
          { path: 'school-tools/academic-calendar', element: <AdminAcademicCalendarPage /> },
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
        ],
      },
      {
        path: 'guardian/leave-request',
        element: <GuardianLeaveRequestPage />,
      },
      {
        path: 'excuse/:token',
        element: <ExcuseSubmissionPage />,
      },
      {
        path: 'display/auto-call',
        element: <AutoCallDisplayPage />,
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
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export function AppRouter() {
  const element = useRoutes(appRoutes)
  return element
}
