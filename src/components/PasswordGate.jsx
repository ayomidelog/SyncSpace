import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Zap } from 'lucide-react';

function PasswordGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch(`/api/auth/status?t=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!res.ok) {
        console.log('Auth status check failed:', res.status);
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      console.log('Auth status:', data);
      setAuthenticated(data.authenticated === true);
    } catch (e) {
      console.error('Auth check failed:', e);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.authenticated) {
        setAuthenticated(true);
      } else {
        setError(data.error || 'Invalid password');
        setPassword('');
      }
    } catch (e) {
      console.error('Auth error:', e);
      setError('Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="animate-pulse text-2xl font-black">Loading...</div>
      </div>
    );
  }

  if (authenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] text-black flex flex-col items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-neo p-8 max-w-md w-full">
        <div className="flex items-center gap-4 mb-8 justify-center">
          <div className="w-16 h-16 bg-black text-white flex items-center justify-center border-2 border-white shadow-sm">
            <Zap size={32} fill="currentColor" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter italic">
            SYNC<span className="text-neo-blue">SPACE</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 mb-6 bg-yellow-100 border-2 border-yellow-500 p-4">
          <Lock size={24} className="text-yellow-600" />
          <p className="font-bold text-yellow-800">Protected Area - Enter Password</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block font-bold mb-2 uppercase">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-4 border-black font-mono text-lg focus:outline-none focus:ring-4 focus:ring-yellow-400"
              placeholder="Enter password"
              autoComplete="off"
              autoFocus
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 bg-red-100 border-2 border-red-500 p-3 text-red-700">
              <AlertCircle size={20} />
              <span className="font-bold">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full bg-black text-white py-4 font-black text-lg uppercase border-4 border-black shadow-neo hover:shadow-neo-hover hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-neo"
          >
            {submitting ? 'Verifying...' : 'Unlock'}
          </button>
        </form>
      </div>

      <p className="mt-8 text-gray-500 font-mono text-sm">
        Access is restricted. Contact administrator for access.
      </p>
    </div>
  );
}

export default PasswordGate;
