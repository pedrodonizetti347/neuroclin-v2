import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Patients from '@/pages/Patients'
import Reports from '@/pages/Reports'
import Tests from '@/pages/Tests'
import MedicalRecords from '@/pages/MedicalRecords'
import Analytics from '@/pages/Analytics'
import AdminSetup from '@/pages/AdminSetup'
import Admin      from '@/pages/Admin'
import Settings    from '@/pages/Settings'
import Devolutivas from '@/pages/Devolutivas'
import Manual      from '@/pages/Manual'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
})

function HomeRedirect() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor'
  const shown   = sessionStorage.getItem('neuroclin_manual_shown')
  if (!isAdmin && !shown) return <Navigate to="/manual" replace />
  return <Dashboard />
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<HomeRedirect />} />
        <Route path="/pacientes"     element={<Patients />} />
        <Route path="/pacientes/:id" element={<MedicalRecords />} />
        <Route path="/laudos"        element={<Reports />} />
        <Route path="/testes"        element={<Tests />} />
        <Route path="/prontuario"    element={<MedicalRecords />} />
        <Route path="/relatorios"    element={<Analytics />} />
        <Route path="/devolutivas"   element={<Devolutivas />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="/admin"         element={<Admin />} />
        <Route path="/admin-setup"   element={<AdminSetup />} />
        <Route path="/manual"        element={<Manual />} />
        <Route path="*"              element={<Dashboard />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
