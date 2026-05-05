import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const err = await signIn(email, password)
    if (err) {
      setError('Nieprawidłowy adres e-mail lub hasło.')
      setLoading(false)
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div
        className="fixed top-0 left-0 right-0 pointer-events-none"
        style={{
          height: 300,
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.07) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <div className="relative w-full max-w-sm mx-4" style={{ zIndex: 1 }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div style={{
              width: 42, height: 42,
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.22)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem',
            }}>🦷</div>
            <div className="text-left">
              <h1 className="text-sm font-semibold tracking-wide" style={{ color: '#e4e4e7' }}>Panel Recepcji</h1>
              <p className="text-xs" style={{ color: '#3f3f46' }}>Klinika stomatologiczna</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6" style={{ borderTop: '1px solid rgba(59,130,246,0.25)' }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: '#e4e4e7' }}>Zaloguj się</h2>
          <p className="text-xs mb-6" style={{ color: '#52525b' }}>Wprowadź dane dostępowe</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
                Adres e-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@klinika.pl"
                className="input-dark"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
                Hasło
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-dark"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{
                color: '#f87171',
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.15)',
              }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? 'Logowanie…' : 'Zaloguj się'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
