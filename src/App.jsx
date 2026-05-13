import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/AuthContext'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Patients from '@/pages/Patients'
import Reports from '@/pages/Reports'
import Tests from '@/pages/Tests'
import MedicalRecords from '@/pages/MedicalRecords'
import Analytics from '@/pages/Analytics'
import AdminSetup from '@/pages/AdminSetup'
import Admin from '@/pages/Admin'
import Settings from '@/pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
})

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/pacientes"  element={<Patients />} />
        <Route path="/laudos"     element={<Reports />} />
        <Route path="/testes"     element={<Tests />} />
        <Route path="/prontuario" element={<MedicalRecords />} />
        <Route path="/relatorios"    element={<Analytics />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="/admin-setup"   element={<AdminSetup />} />
        <Route path="/admin"         element={<Admin />} />
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
