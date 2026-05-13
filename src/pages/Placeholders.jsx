import React from 'react'
import { FlaskConical, BookOpen, BarChart3, Construction } from 'lucide-react'

function Placeholder({ icon: Icon, title, description, color, bg }) {
  return (
    <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px'
      }}>
        <Icon size={32} color={color} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#042C53', margin: '0 0 8px' }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>{description}</p>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
        padding: '8px 16px', borderRadius: 20, background: '#F4F6FA',
        fontSize: 12, color: '#aaa'
      }}>
        <Construction size={14} /> Em desenvolvimento — em breve disponível
      </div>
    </div>
  )
}

export function Tests() {
  return <Placeholder
    icon={FlaskConical} title="Testes neuropsicológicos"
    description="Aqui você poderá aplicar e registrar os resultados de todos os testes diretamente no sistema. Os dados alimentam automaticamente o gerador de laudos com IA."
    color="#854F0B" bg="#FAEEDA"
  />
}

export function MedicalRecords() {
  return <Placeholder
    icon={BookOpen} title="Prontuário eletrônico"
    description="Histórico completo de cada paciente: anamnese, testes aplicados, laudos gerados e evolução clínica ao longo do tempo."
    color="#3B6D11" bg="#EAF3DE"
  />
}

export function Analytics() {
  return <Placeholder
    icon={BarChart3} title="Relatórios e gráficos"
    description="Métricas da clínica: laudos gerados por período, testes mais aplicados, evolução dos pacientes e indicadores de produtividade."
    color="#993556" bg="#FBEAF0"
  />
}
