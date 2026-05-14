import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowRight } from 'lucide-react'

const S = {
  card:   '#1A2744',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
}

export default function Analytics() {
  return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 16px' }}>
      <div style={{ background: S.card, borderRadius: 14, border: `1px solid ${S.border}`, padding: '48px 40px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(46,125,50,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <FileText size={28} color={S.greenL} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: '0.02em' }}>
          GERAÇÃO DE LAUDOS
        </h1>
        <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
          A geração de laudos neuropsicológicos foi consolidada na página{' '}
          <strong style={{ color: '#fff' }}>LAUDOS</strong>, com o novo modelo de laudo da Neuroavaliação,
          aprovação do supervisor e exportação para Word.
        </p>
        <Link to="/laudos" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: S.green, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', letterSpacing: '0.04em' }}>
          <FileText size={16} /> IR PARA LAUDOS <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
