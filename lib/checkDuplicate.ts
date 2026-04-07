import { supabase } from './supabase'

export type DuplicateResult = {
  isDuplicate: boolean
  existingLead?: {
    id: string
    nazwa_firmy: string
    miasto: string
    owner_name: string
    status: string
    matched_on: string // co się powtórzyło
  }
}

export async function checkDuplicate(data: {
  nazwa_firmy: string
  miasto: string
  email?: string
  telefon?: string
}): Promise<DuplicateResult> {
  // Match na nazwa + miasto (case-insensitive, trim)
  const nazwaClean = data.nazwa_firmy.trim().toLowerCase()
  const miastoClean = data.miasto.trim().toLowerCase()
  
  // Buduj zapytanie OR
  const orParts: string[] = [
    `and(nazwa_firmy.ilike.${nazwaClean},miasto.ilike.${miastoClean})`
  ]
  
  if (data.email?.trim()) {
    orParts.push(`email.ilike.${data.email.trim().toLowerCase()}`)
  }
  
  if (data.telefon?.trim()) {
    // Normalizuj telefon: usuń spacje, myślniki, +48
    const telClean = data.telefon.replace(/[\s\-\+]/g, '').replace(/^48/, '')
    orParts.push(`telefon.ilike.%${telClean}%`)
  }
  
  const { data: existing, error } = await supabase
    .from('leads')
    .select(`
      id, nazwa_firmy, miasto, email, telefon, status, owner_id,
      profiles!leads_owner_id_fkey(full_name)
    `)
    .or(orParts.join(','))
    .limit(1)
    .single()
  
  if (error || !existing) return { isDuplicate: false }
  
  // Ustal co się powtórzyło
  let matched_on = 'nazwa firmy + miasto'
  if (data.email && existing.email?.toLowerCase() === data.email.toLowerCase()) {
    matched_on = 'adres email'
  } else if (data.telefon && existing.telefon) {
    matched_on = 'numer telefonu'
  }
  
  return {
    isDuplicate: true,
    existingLead: {
      id: existing.id,
      nazwa_firmy: existing.nazwa_firmy,
      miasto: existing.miasto,
      owner_name: ((existing.profiles as unknown) as { full_name: string } | null)?.full_name ?? 'Nieznany',
      status: existing.status,
      matched_on
    }
  }
}
