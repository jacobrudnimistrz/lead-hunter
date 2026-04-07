'use client'
import { useState } from 'react'
import { OUTREACH_SCRIPTS, OutreachScript } from '@/lib/scripts'
import { NISZA_LABELS } from '@/lib/constants'

const PLATFORM_BADGE_COLORS: Record<string, string> = {
  'Email': 'bg-blue-900/50 text-blue-300 border-blue-800',
  'Instagram DM': 'bg-pink-900/50 text-pink-300 border-pink-800',
  'Facebook DM': 'bg-indigo-900/50 text-indigo-300 border-indigo-800',
  'LinkedIn': 'bg-cyan-900/50 text-cyan-300 border-cyan-800',
  'SMS/WhatsApp': 'bg-emerald-900/50 text-emerald-300 border-emerald-800',
  'Follow-up': 'bg-orange-900/50 text-orange-300 border-orange-800',
}

export function ScriptsTab() {
  const [filterPlatform, setFilterPlatform] = useState('wszystkie')
  const [filterNisza, setFilterNisza] = useState('wszystkie')
  const [expandedScript, setExpandedScript] = useState<string | null>(null)
  const [copiedScript, setCopiedScript] = useState<string | null>(null)

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedScript(id)
    setTimeout(() => setCopiedScript(null), 2000)
  }

  const filteredScripts = OUTREACH_SCRIPTS.filter(script => {
    if (filterPlatform !== 'wszystkie' && script.platform !== filterPlatform) return false
    if (filterNisza !== 'wszystkie' && script.nisza !== filterNisza) return false
    return true
  })

  // Format variables like [VARIABLE] with styling
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\[[^\]]+\])/g)
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return <span key={i} className="bg-yellow-900/50 text-yellow-300 px-1 rounded mx-0.5">{part}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div className="space-y-6">
      {/* Filtry */}
      <div className="flex gap-3 flex-wrap bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-sm">
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
          className="bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors">
          <option value="wszystkie">Wszystkie platformy</option>
          <option value="Email">Email</option>
          <option value="Instagram DM">Instagram DM</option>
          <option value="Facebook DM">Facebook DM</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="SMS/WhatsApp">SMS / WhatsApp</option>
          <option value="Follow-up">Follow-up</option>
        </select>

        <select value={filterNisza} onChange={e => setFilterNisza(e.target.value)}
          className="bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors">
          <option value="wszystkie">Wszystkie nisze</option>
          <option value="uniwersalny">Uniwersalne</option>
          {Object.entries(NISZA_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>

      {/* Karty skryptów */}
      {filteredScripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-gray-500">Brak skryptów spełniających wybrane kryteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredScripts.map(script => (
            <div key={script.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm flex flex-col hover:border-gray-700 transition-colors">
              
              {/* Header karty */}
              <div className="p-5 flex flex-col gap-3 flex-1 border-b border-gray-800/50">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${PLATFORM_BADGE_COLORS[script.platform] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                        {script.platform}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap bg-gray-800 text-gray-400 border-gray-700">
                        {script.nisza === 'uniwersalny' ? 'Uniwersalny' : (NISZA_LABELS[script.nisza] || script.nisza)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white text-lg leading-tight mt-1">{script.tytul}</h3>
                  </div>
                </div>

                {/* Snippet preview */}
                <div className="text-gray-400 text-sm mt-2 line-clamp-3 italic opacity-80">
                  {script.tresc.length > 180 ? script.tresc.substring(0, 180) + '...' : script.tresc}
                </div>
              </div>

              {/* Akcje karty */}
              <div className="px-5 py-3 bg-gray-900/50 flex justify-between items-center shrink-0">
                <button 
                  onClick={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  {expandedScript === script.id ? 'Ukryj podgląd' : 'Pełny podgląd'}
                </button>
                
                <button
                  onClick={() => handleCopy(script.id, script.tresc)}
                  className={`text-sm font-semibold px-4 py-1.5 rounded-lg border transition-all ${
                    copiedScript === script.id 
                      ? 'bg-green-900/30 text-green-400 border-green-800/50' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {copiedScript === script.id ? 'Skopiowano ✓' : 'Kopiuj treść'}
                </button>
              </div>

              {/* Rozwinięty panel */}
              {expandedScript === script.id && (
                <div className="p-5 bg-[#0d1017] border-t border-gray-800">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-[13px] leading-relaxed text-gray-300 whitespace-pre-wrap">
                    {renderFormattedText(script.tresc)}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => handleCopy(script.id + '_full', script.tresc)}
                      className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                        copiedScript === script.id + '_full'
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {copiedScript === script.id + '_full' ? 'Skopiowano pomyślnie ✓' : 'Kopiuj całość'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
