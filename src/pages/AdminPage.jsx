import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const ROLE_LABELS = { admin: 'Administrator', doctor: 'Lekarz', receptionist: 'Recepcjonistka' }

const ROLE_COLORS = {
  admin:        { color: '#c084fc', bg: 'rgba(192,132,252,0.1)',  border: 'rgba(192,132,252,0.25)' },
  doctor:       { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)'  },
  receptionist: { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.25)'  },
}

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] ?? { color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)', border: 'rgba(161,161,170,0.2)' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      color: c.color, background: c.bg, border: `1px solid ${c.border}`,
      letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

const EMPTY_FORM = { email: '', password: '', full_name: '', role: 'receptionist' }

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)
  const [addSuccess, setAddSuccess] = useState(false)

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleRoleChange = async (userId, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
  }

  const handleToggleActive = async (userId, current) => {
    await supabase.from('profiles').update({ active: !current }).eq('id', userId)
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, active: !current } : u))
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    setAddSuccess(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(addForm),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Nieznany błąd')
      setAddSuccess(true)
      setAddForm(EMPTY_FORM)
      fetchUsers()
      setTimeout(() => { setShowAddForm(false); setAddSuccess(false) }, 1800)
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const setField = (field) => (e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div
        className="fixed top-0 left-0 right-0 pointer-events-none"
        style={{
          height: 300,
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(192,132,252,0.05) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        className="relative z-10 sticky top-0"
        style={{
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#71717a', fontSize: 13, cursor: 'pointer',
              background: 'none', border: 'none',
              fontFamily: 'Inter, system-ui, sans-serif', padding: '4px 0',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#a1a1aa' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#71717a' }}
          >
            ‹ Panel Recepcji
          </button>

          <div
            style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}
          />

          <h1 className="text-sm font-semibold" style={{ color: '#e4e4e7' }}>
            Zarządzanie użytkownikami
          </h1>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Actions row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3f3f46' }}>
            Użytkownicy systemu
          </span>
          <button
            onClick={() => { setShowAddForm((s) => !s); setAddError(null); setAddSuccess(false) }}
            className="btn-primary px-4 py-2"
          >
            {showAddForm ? '✕ Anuluj' : '+ Dodaj użytkownika'}
          </button>
        </div>

        {/* Add user form */}
        {showAddForm && (
          <div className="card p-6" style={{ borderTop: '1px solid rgba(192,132,252,0.25)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#e4e4e7' }}>Nowy użytkownik</h2>
            <form onSubmit={handleAddUser}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
                    Imię i nazwisko
                  </label>
                  <input
                    value={addForm.full_name}
                    onChange={setField('full_name')}
                    placeholder="Jan Kowalski"
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
                    Adres e-mail
                  </label>
                  <input
                    required
                    type="email"
                    value={addForm.email}
                    onChange={setField('email')}
                    placeholder="jan@klinika.pl"
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
                    Hasło tymczasowe
                  </label>
                  <input
                    required
                    type="password"
                    value={addForm.password}
                    onChange={setField('password')}
                    placeholder="Min. 8 znaków"
                    minLength={8}
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
                    Rola
                  </label>
                  <div className="relative">
                    <select
                      value={addForm.role}
                      onChange={setField('role')}
                      className="input-dark appearance-none pr-8 cursor-pointer"
                    >
                      <option value="receptionist">Recepcjonistka</option>
                      <option value="doctor">Lekarz</option>
                      <option value="admin">Administrator</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                      <svg className="w-3.5 h-3.5" style={{ color: '#52525b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {addError && (
                <p className="text-xs mt-4 px-3 py-2 rounded-lg" style={{
                  color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)',
                }}>
                  {addError}
                </p>
              )}
              {addSuccess && (
                <p className="text-xs mt-4 px-3 py-2 rounded-lg" style={{
                  color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)',
                }}>
                  Użytkownik został dodany pomyślnie.
                </p>
              )}

              <div className="mt-5">
                <button type="submit" disabled={addLoading} className="btn-primary px-6 py-2.5">
                  {addLoading ? 'Tworzenie konta…' : 'Utwórz konto'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users table */}
        {loading ? (
          <div className="flex items-center gap-2.5 py-10">
            <div
              className="animate-spin"
              style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.25)', borderTopColor: '#3b82f6' }}
            />
            <span className="text-sm" style={{ color: '#3f3f46' }}>Ładowanie…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16" style={{ color: '#27272a' }}>
            <div className="text-4xl mb-3 opacity-40">👤</div>
            <p className="text-sm" style={{ color: '#3f3f46' }}>Brak użytkowników</p>
          </div>
        ) : (
          <div
            className="overflow-x-auto rounded-[0.875rem]"
            style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0a0a10', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Użytkownik', 'Rola', 'Status', 'Zmień rolę', 'Akcje'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left font-semibold whitespace-nowrap"
                      style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3f3f46' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    className="tr-hover"
                    style={{
                      borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      opacity: u.active ? 1 : 0.45,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium" style={{ color: '#d4d4d8' }}>
                        {u.full_name || '—'}
                        {u.id === user?.id && (
                          <span className="ml-1.5 text-xs" style={{ color: '#3f3f46' }}>(Ty)</span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#52525b' }}>{u.email}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <RoleBadge role={u.role} />
                    </td>

                    <td className="px-5 py-3.5">
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                        color: u.active ? '#4ade80' : '#71717a',
                        background: u.active ? 'rgba(74,222,128,0.08)' : 'rgba(113,113,122,0.08)',
                        border: `1px solid ${u.active ? 'rgba(74,222,128,0.2)' : 'rgba(113,113,122,0.2)'}`,
                      }}>
                        {u.active ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      {u.id !== user?.id ? (
                        <div className="relative" style={{ width: 160 }}>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="appearance-none text-xs pl-2.5 pr-7 py-1.5 rounded-md cursor-pointer focus:outline-none w-full"
                            style={{
                              background: '#16161e', border: '1px solid rgba(255,255,255,0.08)',
                              color: '#a1a1aa', fontFamily: 'Inter, system-ui, sans-serif',
                            }}
                          >
                            <option value="receptionist">Recepcjonistka</option>
                            <option value="doctor">Lekarz</option>
                            <option value="admin">Administrator</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg className="w-3 h-3" style={{ color: '#52525b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#3f3f46' }}>Twoje konto</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleActive(u.id, u.active)}
                          className="text-xs font-medium transition-all duration-200 px-2.5 py-1 rounded-md whitespace-nowrap"
                          style={u.active ? {
                            color: '#f87171', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)',
                          } : {
                            color: '#4ade80', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)',
                          }}
                        >
                          {u.active ? 'Dezaktywuj' : 'Aktywuj'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
