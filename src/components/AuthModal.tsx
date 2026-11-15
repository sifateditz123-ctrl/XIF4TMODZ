import React, { useState } from 'react';
import { Loader2, Lock, Mail, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const {
    authModalOpen,
    closeAuthModal,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        toast.success('Welcome back!');
      } else {
        await registerWithEmail(email, password, displayName);
        toast.success('Account created successfully!');
      }
      closeAuthModal(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      toast.error(msg.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google!');
      closeAuthModal(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      toast.error(msg.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div className="cyber-card cyber-glow-border relative w-full max-w-md rounded-2xl p-6 shadow-neon-purple">
        <button
          type="button"
          onClick={() => closeAuthModal(false)}
          aria-label="Close sign in dialog"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/80 text-slate-300 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="auth-modal-title" className="font-display text-xl font-bold text-white">
          {mode === 'login' ? 'Sign In to Continue' : 'Create Account'}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Sessions stay saved on this device automatically.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#090b14] p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`min-h-[38px] rounded-lg py-2 text-xs font-bold transition ${
              mode === 'login'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`min-h-[38px] rounded-lg py-2 text-xs font-bold transition ${
              mode === 'register'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-display-name" className="sr-only">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="auth-display-name"
                  type="text"
                  required
                  placeholder="Display Name / Gamer Tag"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#090b14] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="sr-only">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="auth-email"
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#090b14] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="sr-only">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#090b14] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 py-2.5 text-sm font-bold text-white shadow-neon-purple transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-800" />
          <span>OR</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-[#0b0e1a] py-2.5 text-sm font-bold text-white transition hover:border-cyan-400/60 hover:bg-slate-800/70"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.4 1.7 14.9 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 8.9 0 11.1 0 13.3s.6 4.4 1.6 6.3l3.7-2.8z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
