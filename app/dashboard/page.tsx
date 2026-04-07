'use client'
import { useEffect, useState, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { AddLeadModal } from '@/components/AddLeadModal'
import { useRouter } from 'next/navigation'
import { NISZA_COLORS, NISZA_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import { ScriptsTab } from '@/components/ScriptsTab'
import { User } from '@supabase/supabase-js'

export type Lead = {
  id: string;
  nazwa_firmy: string;
  miasto: string;
  email?: string;
  telefon?: string;
  nisza: string;
  status: string;
  platforma?: string;
  notatki?: string;
  owner_id: string;
  created_at: string;
  channel?: string;
  ai_hook?: string;
  profiles: { full_name: string } | null;
}

export type Profile = {
  id: string;
  full_name: string;
}

// Kolory dla awatarów
const AVATAR_COLORS = [
  'bg-pink-600', 'bg-indigo-600', 'bg-emerald-600', 
  'bg-amber-600', 'bg-cyan-600', 'bg-rose-600'
]

const PLATFORM_PILLS_COLORS: Record<string, string> = {
  'Email': 'bg-blue-900/50 text-blue-300',
  'Instagram DM': 'bg-pink-900/50 text-pink-300',
  'Facebook DM': 'bg-indigo-900/50 text-indigo-300',
  'LinkedIn': 'bg-cyan-900/50 text-cyan-300',
  'Telefon': 'bg-green-900/50 text-green-300',
  'WhatsApp': 'bg-emerald-900/50 text-emerald-300',
  'Wizyta osobista': 'bg-orange-900/50 text-orange-300'
}

function getAvatarColor(id: string) {
  const sum = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function getInitials(name?: string, email?: string) {
  if (name?.trim()) return name.substring(0, 2).toUpperCase()
  if (email?.trim()) return email.substring(0, 2).toUpperCase()
  return '??'
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'leady' | 'skrypty'>('leady')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  const [filterNisza, setFilterNisza] = useState('wszystkie')
  const [filterStatus, setFilterStatus] = useState('wszystkie')
  const [filterOwner, setFilterOwner] = useState('wszystkie')
  const [filterToCall, setFilterToCall] = useState(false)
  
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [editingAiHookId, setEditingAiHookId] = useState<string | null>(null)
  const [tempAiHook, setTempAiHook] = useState("")
  
  const router = useRouter()

  const startEditingAiHook = (id: string, current?: string) => {
    setEditingAiHookId(id)
    setTempAiHook(current || "")
  }

  const saveAiHook = async (id: string) => {
    await supabase.from('leads').update({ ai_hook: tempAiHook }).eq('id', id)
    fetchLeads()
    setEditingAiHookId(null)
  }

  const fetchLeads = async () => {
    setLoading(true)
    
    const { data: leadsData, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.log('LEADS ERROR:', error)
      setLoading(false)
      return
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')

    const leadsWithOwner = (leadsData ?? []).map(lead => ({
      ...lead,
      profiles: profilesData?.find(p => p.id === lead.owner_id) ?? null
    }))

    setLeads(leadsWithOwner)
    setLoading(false)
  }

  useEffect(() => {
    fetchLeads()
    supabase.from('profiles').select('*').then(({ data }) => setProfiles(data ?? []))
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user))

    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = leads.filter(l => {
    if (filterToCall) {
      if (l.channel !== 'sms') return false
      if (l.status !== 'contacted' && l.status !== 'called_no_answer') return false
    }
    if (filterNisza !== 'wszystkie' && l.nisza !== filterNisza) return false
    if (filterStatus !== 'wszystkie' && l.status !== filterStatus) return false
    if (filterOwner !== 'wszystkie' && l.owner_id !== filterOwner) return false
    return true
  })

  if (filterToCall) {
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const leadIndex = leads.findIndex(l => l.id === id)
    if (leadIndex === -1) return
    const oldStatus = leads[leadIndex].status

    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))

    const { error } = await supabase
      .from('leads')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Błąd zapisu statusu:', error)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: oldStatus } : l))
      setToastMessage('Błąd zmiany statusu. Przywrócono stan.')
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  const toggleRow = (id: string, currentNotes?: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
    if (!expandedRows[id]) {
      setEditingNotes(prev => ({ ...prev, [id]: currentNotes || '' }))
    }
  }

  const saveNote = async (id: string) => {
    await supabase.from('leads').update({ notatki: editingNotes[id] }).eq('id', id)
    fetchLeads()
  }

  const wyslaneCount = leads.filter(l => l.status === 'contacted').length
  const odpowiedziCount = leads.filter(l => l.status === 'replied').length
  const wonLeadsCount = leads.filter(l => l.status === 'won').length

  const userProfile = profiles.find(p => p.id === currentUser?.id)
  const displayName = userProfile?.full_name || currentUser?.email || 'Niezalogowany'
  const userInitials = getInitials(userProfile?.full_name, currentUser?.email)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-6 pt-4 pb-0 flex flex-col sticky top-0 z-10 shadow-sm border-b border-gray-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full mb-3">
          <div className="flex items-center">
            <h1 className="text-xl font-bold tracking-tight text-white">Lead Hunter</h1>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 shadow-sm whitespace-nowrap">
              + Dodaj lead
            </button>
            <div className="hidden sm:block w-px h-6 bg-gray-800"></div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-semibold text-white shadow-inner">
                  {userInitials}
                </div>
                <span className="text-sm font-medium text-gray-200 truncate max-w-[120px]">{displayName}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="text-gray-400 hover:text-white text-sm transition-colors duration-150 px-2 flex items-center gap-1"
                title="Wyloguj"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </div>

        {/* Zakładki */}
        <div className="flex space-x-6 mt-1">
          <button 
            onClick={() => setActiveTab('leady')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${activeTab === 'leady' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            Leady
          </button>
          <button 
            onClick={() => setActiveTab('skrypty')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${activeTab === 'skrypty' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            Skrypty
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6">
        {activeTab === 'leady' ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm transition-colors duration-150 hover:border-gray-700">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Wszystkie leady</p>
                <p className="text-3xl font-semibold text-white">{leads.length}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm transition-colors duration-150 hover:border-blue-900/50">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Wysłane</p>
                <p className="text-3xl font-semibold text-blue-400">{wyslaneCount}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm transition-colors duration-150 hover:border-green-900/50">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Odpowiedzi</p>
                <p className="text-3xl font-semibold text-green-400">{odpowiedziCount}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm transition-colors duration-150 hover:border-emerald-900/50">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Wygrane</p>
                <p className="text-3xl font-semibold text-emerald-400">{wonLeadsCount}</p>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <select value={filterNisza} onChange={e => setFilterNisza(e.target.value)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors duration-150">
                <option value="wszystkie">Wszystkie nisze</option>
                {Object.entries(NISZA_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors duration-150">
                <option value="wszystkie">Wszystkie statusy</option>
                {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
              <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors duration-150">
                <option value="wszystkie">Cały zespół</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              
              <div className="w-px h-6 bg-gray-800 hidden sm:block mx-1 self-center"></div>
              
              <button 
                onClick={() => setFilterToCall(prev => !prev)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-2 border focus:outline-none ${filterToCall ? 'bg-green-900/40 text-green-400 border-green-800 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'}`}
              >
                <span>📞</span> Do zadzwonienia
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <p className="text-gray-500 text-sm">Przeładowywanie danych...</p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                        <th className="text-left px-5 py-4 w-1/4">Firma</th>
                        <th className="text-left px-5 py-4">Lokalizacja</th>
                        <th className="text-left px-5 py-4">Dane kontaktowe</th>
                        <th className="text-left px-5 py-4">Kanał</th>
                        <th className="text-left px-5 py-4">Nisza</th>
                        <th className="text-left px-5 py-4 max-w-[200px]">Platforma</th>
                        <th className="text-left px-5 py-4">Status</th>
                        <th className="text-left px-4 py-4 w-12"></th>
                        <th className="text-left px-5 py-4">Opiekun</th>
                        <th className="text-left px-5 py-4 text-right">Data dodania</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {filtered.map(lead => {
                        const ownerName = lead.profiles?.full_name || 'Nieznany'
                        let ownerDisplayName = ownerName
                        if (ownerDisplayName.includes('@')) {
                          ownerDisplayName = ownerDisplayName.substring(0, 8)
                        }
                        const ownerInitials = getInitials(ownerDisplayName)
                        const avatarColor = getAvatarColor(lead.owner_id || 'default')
                        const isOwner = lead.owner_id === currentUser?.id
                        
                        const isExpanded = !!expandedRows[lead.id]

                        return (
                          <Fragment key={lead.id}>
                            <tr 
                              onClick={() => toggleRow(lead.id, lead.notatki)}
                              className={`group transition-colors duration-150 cursor-pointer ${isExpanded ? 'bg-gray-800/30' : 'hover:bg-gray-800/40'}`}
                            >
                              <td className="px-5 py-4 min-w-[200px]">
                                <p className="font-semibold text-white truncate max-w-[250px]" title={lead.nazwa_firmy}>{lead.nazwa_firmy}</p>
                                {lead.notatki && (
                                  <p className="text-gray-500 text-[11px] mt-1 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <span>📝</span>
                                    <span className="truncate max-w-[200px]">
                                      {lead.notatki.length > 60 ? lead.notatki.substring(0, 60) + '...' : lead.notatki}
                                    </span>
                                  </p>
                                )}
                              </td>
                              <td className="px-5 py-4 text-gray-300">
                                {lead.miasto}
                              </td>
                              <td className="px-5 py-4">
                                {lead.email && <div className="text-gray-300 truncate max-w-[180px]">{lead.email}</div>}
                                {lead.telefon && <div className="text-gray-500 mt-0.5">{lead.telefon}</div>}
                                {!lead.email && !lead.telefon && <span className="text-gray-600">—</span>}
                              </td>
                              <td className="px-5 py-4">
                                {lead.channel === 'sms' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-green-900/50 text-green-400 border border-green-800">SMS</span>
                                ) : lead.channel === 'email' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-blue-900/50 text-blue-400 border border-blue-800">EMAIL</span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wide font-medium whitespace-nowrap ${NISZA_COLORS[lead.nisza] ?? 'bg-gray-800 text-gray-300 border border-gray-700'}`}>
                                  {NISZA_LABELS[lead.nisza] || lead.nisza}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex gap-1.5 flex-wrap">
                                  {lead.platforma ? lead.platforma.split(',').map((p: string) => {
                                    const pt = p.trim()
                                    if (!pt) return null
                                    return (
                                      <span key={pt} className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-semibold whitespace-nowrap ${PLATFORM_PILLS_COLORS[pt] || 'bg-gray-800 text-gray-400'}`}>
                                        {pt}
                                      </span>
                                    )
                                  }) : <span className="text-gray-600">—</span>}
                                </div>
                              </td>
                              <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                <select 
                                  value={lead.status || 'new'}
                                  onChange={(e) => updateStatus(lead.id, e.target.value)}
                                  className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium shadow-sm leading-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer outline-none ${STATUS_COLORS[lead.status || 'new'] ?? 'bg-gray-800 text-gray-300 border-gray-700'}`}
                                >
                                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                    <option key={val} value={val} className="bg-gray-900 text-gray-200 text-left">{label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 py-4">
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(lead.nazwa_firmy + ' ' + (lead.miasto || ''))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors flex items-center justify-center"
                                    title="Szukaj w Google"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                                      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
                                    </svg>
                                  </a>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (lead.telefon) {
                                        navigator.clipboard.writeText(lead.telefon)
                                        setToastMessage('Skopiowano numer')
                                        setTimeout(() => setToastMessage(null), 2000)
                                      }
                                    }}
                                    disabled={!lead.telefon}
                                    className={`p-1 rounded-md transition-colors flex items-center justify-center ${lead.telefon ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-900/50 text-gray-600 cursor-not-allowed'}`}
                                    title={lead.telefon ? "Skopiuj numer" : "Brak numeru"}
                                  >
                                    <span className="text-[12px] leading-none">📞</span>
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 ${avatarColor}`}>
                                    {ownerInitials}
                                  </div>
                                  <span className="text-gray-300 font-medium truncate max-w-[100px]" title={ownerName}>{ownerDisplayName}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-gray-500 text-right tabular-nums whitespace-nowrap">
                                {new Date(lead.created_at).toLocaleDateString('pl-PL')}
                              </td>
                            </tr>

                            {/* ROZWIJANY PANEL NOTATEK */}
                            {isExpanded && (
                              <tr className="bg-gray-900/80 border-b border-gray-800 shadow-inner">
                                <td colSpan={10} className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex flex-col gap-6 ml-2 border-l-2 border-gray-700 pl-4 py-2">
                                    <div className="flex flex-col gap-2">
                                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <span>✨</span> Notatka AI
                                      </label>
                                      
                                      {editingAiHookId === lead.id ? (
                                        <div className="flex flex-col gap-2 max-w-4xl">
                                          <textarea 
                                            autoFocus
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-y min-h-[80px]"
                                            value={tempAiHook}
                                            onChange={(e) => setTempAiHook(e.target.value)}
                                            onBlur={() => saveAiHook(lead.id)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && e.ctrlKey) {
                                                saveAiHook(lead.id);
                                              }
                                              if (e.key === 'Escape') {
                                                setEditingAiHookId(null);
                                              }
                                            }}
                                            placeholder="Notatka AI dla klienta..."
                                          />
                                        </div>
                                      ) : (
                                        <div 
                                          onClick={() => startEditingAiHook(lead.id, lead.ai_hook)}
                                          className="max-w-4xl bg-gray-800/30 hover:bg-gray-800/60 border border-transparent hover:border-gray-700 rounded-lg px-4 py-3 text-sm transition-colors cursor-text min-h-[46px] group/aihook relative"
                                          title="Kliknij, aby edytować"
                                        >
                                          {lead.ai_hook ? (
                                            <span className="text-gray-300 whitespace-pre-wrap">{lead.ai_hook}</span>
                                          ) : (
                                            <span className="text-gray-500 italic">Brak — hook zostanie wygenerowany automatycznie</span>
                                          )}
                                          <div className="absolute top-2 right-2 opacity-0 group-hover/aihook:opacity-100 text-gray-500 transition-opacity">
                                            ✏️
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <span>📝</span> Notatki do leada
                                      </label>
                                      
                                      {isOwner ? (
                                      <div className="flex flex-col gap-2 max-w-4xl">
                                        <textarea 
                                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-y min-h-[80px]"
                                          value={editingNotes[lead.id] ?? ''}
                                          onChange={(e) => setEditingNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                          placeholder="Brak notatek. Wpisz tutaj szczegóły..."
                                        />
                                        <div className="flex justify-end">
                                          <button 
                                            onClick={() => saveNote(lead.id)}
                                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-md text-xs font-medium transition-colors"
                                          >
                                            Zapisz notatkę
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="max-w-4xl bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 text-sm text-gray-300 min-h-[80px] whitespace-pre-wrap">
                                        {lead.notatki || <span className="text-gray-500 italic">Brak notatek...</span>}
                                      </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-5 py-12 text-center text-gray-500 bg-gray-900/50">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                              <p>Brak leadów spełniających wybrane kryteria</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <ScriptsTab />
        )}
      </main>

      {showModal && (
        <AddLeadModal onClose={() => setShowModal(false)} onSuccess={fetchLeads} />
      )}

      {toastMessage && (
        <div className={`fixed bottom-6 right-6 bg-gray-800 px-5 py-3 rounded-lg shadow-lg border border-gray-700 z-50 flex items-center gap-2 animate-fade-in transition-opacity ${toastMessage.includes('Błąd') ? 'text-red-400' : 'text-green-400'}`}>
          <span>{toastMessage.includes('Błąd') ? '❌' : '✓'}</span>
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
