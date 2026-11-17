import { useEffect } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { store } from './services/store'
import { canAccessAdmin } from './services/selectors'
import { useAppState } from './hooks/useApp'
import { syncReminders } from './services/notifications'
import { ErrorState, LoadingScreen } from './components/ui/common'
import { ConfirmProvider, ToastProvider } from './components/ui/Feedback'
import { AppShell } from './components/layout/AppShell'
import { AdminLayout } from './components/layout/AdminLayout'
import { WelcomeScreen } from './screens/auth/WelcomeScreen'
import { LoginScreen } from './screens/auth/LoginScreen'
import { RegisterScreen } from './screens/auth/RegisterScreen'
import { ForgotPasswordScreen } from './screens/auth/ForgotPasswordScreen'
import { HomeScreen } from './screens/app/HomeScreen'
import { PoliciesScreen } from './screens/app/PoliciesScreen'
import { PolicyDetailScreen } from './screens/app/PolicyDetailScreen'
import { CatalogScreen } from './screens/app/CatalogScreen'
import { ProductDetailScreen } from './screens/app/ProductDetailScreen'
import { FundScreen } from './screens/app/FundScreen'
import { MovementsScreen } from './screens/app/MovementsScreen'
import { ProfileScreen } from './screens/app/ProfileScreen'
import { EditProfileScreen } from './screens/app/EditProfileScreen'
import { ChangePasswordScreen } from './screens/app/ChangePasswordScreen'
import { CompanyInfoScreen } from './screens/app/CompanyInfoScreen'
import { HelpScreen } from './screens/app/HelpScreen'
import { NotificationsScreen } from './screens/app/NotificationsScreen'
import { AdminDashboard } from './screens/admin/AdminDashboard'
import { AdminUsers } from './screens/admin/AdminUsers'
import { AdminUserDetail } from './screens/admin/AdminUserDetail'
import { AdminUserForm } from './screens/admin/AdminUserForm'
import { AdminInsurances } from './screens/admin/AdminInsurances'
import { AdminInsuranceForm } from './screens/admin/AdminInsuranceForm'
import { AdminPayments } from './screens/admin/AdminPayments'
import { AdminFund } from './screens/admin/AdminFund'
import { AdminSettings } from './screens/admin/AdminSettings'
import { AdminRoles } from './screens/admin/AdminRoles'
import { AdminAudit } from './screens/admin/AdminAudit'
import { AdminAnnouncements } from './screens/admin/AdminAnnouncements'
import { NotFoundScreen } from './screens/NotFoundScreen'

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])
  return null
}

function ProtectedRoutes() {
  const { session } = useAppState()
  if (!session) return <Navigate to="/bienvenida" replace />
  return <Outlet />
}

function AdminRoutes() {
  const { session } = useAppState()
  if (!session) return <Navigate to="/bienvenida" replace />
  if (!canAccessAdmin(session)) return <Navigate to="/inicio" replace />
  return <Outlet />
}

function RootRedirect() {
  const { session } = useAppState()
  return <Navigate to={session ? '/inicio' : '/bienvenida'} replace />
}

export default function App() {
  const state = useAppState()

  useEffect(() => {
    let active = true
    store
      .init()
      .then(() => {
        if (!active) return
        return syncReminders().catch((error) => console.warn('No se pudieron generar recordatorios', error))
      })
      .catch((error) => console.error('Error al iniciar FinPoliza', error))
    return () => {
      active = false
    }
  }, [])

  if (state.status === 'loading' || state.status === 'error') {
    if (state.status === 'error') {
      return (
        <ErrorState
          message={state.error ?? 'No se pudo cargar la información.'}
          onRetry={() => window.location.reload()}
        />
      )
    }
    return <LoadingScreen />
  }

  return (
    <HashRouter>
      <ScrollToTop />
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/bienvenida" element={<WelcomeScreen />} />
            <Route path="/ingresar" element={<LoginScreen />} />
            <Route path="/registro" element={<RegisterScreen />} />
            <Route path="/recuperar" element={<ForgotPasswordScreen />} />

            <Route element={<ProtectedRoutes />}>
              <Route element={<AppShell />}>
                <Route path="/inicio" element={<HomeScreen />} />
                <Route path="/seguros" element={<PoliciesScreen />} />
                <Route path="/seguros/:policyId" element={<PolicyDetailScreen />} />
                <Route path="/catalogo" element={<CatalogScreen />} />
                <Route path="/catalogo/:productId" element={<ProductDetailScreen />} />
                <Route path="/fondo" element={<FundScreen />} />
                <Route path="/movimientos" element={<MovementsScreen />} />
                <Route path="/notificaciones" element={<NotificationsScreen />} />
                <Route path="/perfil" element={<ProfileScreen />} />
                <Route path="/perfil/editar" element={<EditProfileScreen />} />
                <Route path="/perfil/password" element={<ChangePasswordScreen />} />
                <Route path="/perfil/empresa" element={<CompanyInfoScreen />} />
                <Route path="/perfil/ayuda" element={<HelpScreen />} />
              </Route>

              <Route element={<AdminRoutes />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/usuarios" element={<AdminUsers />} />
                  <Route path="/admin/usuarios/nuevo" element={<AdminUserForm />} />
                  <Route path="/admin/usuarios/:id" element={<AdminUserDetail />} />
                  <Route path="/admin/usuarios/:id/editar" element={<AdminUserForm />} />
                  <Route path="/admin/seguros" element={<AdminInsurances />} />
                  <Route path="/admin/seguros/nuevo" element={<AdminInsuranceForm />} />
                  <Route path="/admin/seguros/:id/editar" element={<AdminInsuranceForm />} />
                  <Route path="/admin/pagos" element={<AdminPayments />} />
                  <Route path="/admin/fondo" element={<AdminFund />} />
                  <Route path="/admin/avisos" element={<AdminAnnouncements />} />
                  <Route path="/admin/configuracion" element={<AdminSettings />} />
                  <Route path="/admin/roles" element={<AdminRoles />} />
                  <Route path="/admin/auditoria" element={<AdminAudit />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </HashRouter>
  )
}
