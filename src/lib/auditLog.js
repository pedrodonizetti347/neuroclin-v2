import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function logAction(user, action, details = {}) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId:    user?.id    || 'unknown',
      userName:  user?.full_name || user?.email || 'Desconhecido',
      userEmail: user?.email || '',
      userRole:  user?.role  || 'professional',
      action,
      details,
      timestamp: serverTimestamp(),
    })
  } catch (e) {
    console.warn('[auditLog]', e)
  }
}
