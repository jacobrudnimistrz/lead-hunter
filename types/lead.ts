export type LeadStatus = 'new' | 'contacted' | 'replied' | 'ignored'

export interface Lead {
  id: string
  source: 'CEIDG' | 'KRS'
  company_name: string
  owner_name?: string
  email?: string
  phone?: string
  city?: string
  pkd_code?: string
  pkd_description?: string
  registration_date?: string
  has_website: boolean
  website_url?: string
  status: LeadStatus
  notes?: string
  created_at: string
}

export interface EmailSent {
  id: string
  lead_id: string
  subject: string
  body: string
  sent_at: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  created_at: string
}
