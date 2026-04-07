'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { checkDuplicate } from '@/lib/checkDuplicate'
import { NISZA_LABELS, STATUS_LABELS, PLATFORMA_LABELS } from '@/lib/constants'

export function AddLeadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    nazwa_firmy: '',
    miasto: '',
    email: '',
    telefon: '',
    nip: '',
    strona_www: '',
    notatki: '',
    nisza: 'zdrowie',
    status: 'wyslano',
    platforma: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [duplicate, setDuplicate] = useState<Awaited<ReturnType<typeof checkDuplicate>>['existingLead']>()
  const [error, setError] = useState('')

  const handlePlatformToggle = (platform: string) => {
    setForm(prev => {
      const isSelected = prev.platforma.includes(platform)
      const newPlatforms = isSelected
        ? prev.platforma.filter(p => p !== platform)
        : [...prev.platforma, platform]
      return { ...prev, platforma: newPlatforms }
    })
  }

  const handleSubmit = async () => {
    if (!form.nazwa_firmy || !form.miasto) {
      setError('Nazwa firmy i miasto są wymagane.')
      return
    }
    setLoading(true)
    setDuplicate(undefined)
    setError('')

    // 1. Sprawdź duplikaty
    const result = await checkDuplicate({
      nazwa_firmy: form.nazwa_firmy,
      miasto: form.miasto,
      email: form.email,
      telefon: form.telefon,
    })

    if (result.isDuplicate && result.existingLead) {
      setDuplicate(result.existingLead)
      setLoading(false)
      return
    }

    // 2. Pobierz zalogowanego usera
    const { data: { user } } = await supabase.auth.getUser()

    // 3. Zapisz lead
    const { error: insertError } = await supabase.from('leads').insert({
      ...form,
      platforma: form.platforma.join(', '), // Zapisujemy jako tekst rozdzielony przecinkami
      owner_id: user?.id,
    })

    if (insertError) {
      setError('Błąd zapisu: ' + insertError.message)
    } else {
      onSuccess()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-white text-lg font-medium">Dodaj nowy lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {duplicate && (
          <div className="bg-red-900/40 border border-red-600 rounded-lg p-4 text-sm">
            <p className="text-red-300 font-medium mb-1">⚠ Duplikat wykryty — pasuje: {duplicate.matched_on}</p>
            <p className="text-gray-300">Firma <strong>{duplicate.nazwa_firmy}</strong> ({duplicate.miasto})</p>
            <p className="text-gray-400">
              Właściciel: <strong className="text-white">{duplicate.owner_name}</strong> · 
              Status: <span className="text-yellow-400">{STATUS_LABELS[duplicate.status] || duplicate.status}</span>
            </p>
            <p className="text-gray-500 mt-1 text-xs">Lead nie został zapisany. Skontaktuj się z właścicielem jeśli chcesz przejąć kontakt.</p>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Nazwa firmy *</label>
            <input className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={form.nazwa_firmy} onChange={e => setForm(f => ({ ...f, nazwa_firmy: e.target.value }))} placeholder="np. Gabinet Zdrowia" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Miasto *</label>
            <input className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={form.miasto} onChange={e => setForm(f => ({ ...f, miasto: e.target.value }))} placeholder="np. Warszawa" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">NIP</label>
            <input className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={form.nip} onChange={e => setForm(f => ({ ...f, nip: e.target.value }))} placeholder="0000000000" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Email</label>
            <input className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="kontakt@firma.pl" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Telefon</label>
            <input className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={form.telefon} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))} placeholder="48 123 456 789" />
          </div>
          <div className="col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Strona WWW</label>
            <input className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={form.strona_www} onChange={e => setForm(f => ({ ...f, strona_www: e.target.value }))} placeholder="https://firma.pl" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Nisza</label>
            <select className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={form.nisza} onChange={e => setForm(f => ({ ...f, nisza: e.target.value }))}>
              {Object.entries(NISZA_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Status</label>
            <select className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          
          <div className="col-span-2 mt-2">
            <label className="text-gray-400 text-xs mb-2 block">Platforma kontaktu (można wybrać kilka)</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(PLATFORMA_LABELS).map(platform => {
                const isSelected = form.platforma.includes(platform)
                return (
                  <label 
                    key={platform} 
                    className={`cursor-pointer inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={isSelected}
                      onChange={() => handlePlatformToggle(platform)}
                    />
                    {platform}
                  </label>
                )
              })}
            </div>
          </div>
          
          <div className="col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Notatki</label>
            <textarea className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none transition-colors"
              rows={3} value={form.notatki} onChange={e => setForm(f => ({ ...f, notatki: e.target.value }))} placeholder="Dodatkowe informacje..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-800 transition-colors">
            Anuluj
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? 'Zapisywanie...' : 'Dodaj lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
