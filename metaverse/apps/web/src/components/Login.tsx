import { useState } from 'react';
import { z } from 'zod';
import { SignupSchema, SigninSchema, getZodMessage } from '../schemas';
import { useUserStore } from '../store';
import { api } from '../utils/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Role = 'user' | 'admin';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<Role>('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useUserStore((state) => state.setAuth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const decodeToken = (token: string) => {
    try {
      const payloadB64 = token.split('.')[1];
      return JSON.parse(atob(payloadB64)) as { userId: string; role: string };
    } catch { return null; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        SigninSchema.parse({ username, password });
        const res = await api.post('/signin', { username, password });
        if (!res.data.token) throw new Error(res.data.message || 'Login failed');
        const payload = decodeToken(res.data.token);
        const userRole: Role = payload?.role === 'Admin' ? 'admin' : 'user';
        setAuth(res.data.token, payload?.userId ?? '', userRole, res.data.username);
        navigate(returnTo ?? (userRole === 'admin' ? '/admin' : '/dashboard'));
      } else {
        SignupSchema.parse({ username, password, type: role });
        const signupRes = await api.post('/signup', { username, password, type: role });
        if (signupRes.data?.message) throw new Error(signupRes.data.message);
        const loginRes = await api.post('/signin', { username, password });
        if (!loginRes.data.token) throw new Error('Login after signup failed');
        const payload = decodeToken(loginRes.data.token);
        const userRole: Role = payload?.role === 'Admin' ? 'admin' : 'user';
        setAuth(loginRes.data.token, payload?.userId ?? signupRes.data.userId, userRole, loginRes.data.username);
        navigate(returnTo ?? (userRole === 'admin' ? '/admin' : '/dashboard'));
      }
    } catch (err: unknown) {
      if (err instanceof z.ZodError) setError(getZodMessage(err));
      else if (err instanceof Error) setError(err.message);
      else setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="glass auth-card animate-fade-in">
        <div className="auth-logo">🌐</div>
        <h1 className="auth-title">{isLogin ? 'Welcome Back' : 'Join Metaverse'}</h1>
        <p className="auth-subtitle">{isLogin ? 'Enter your world' : 'Create your presence'}</p>

        {/* Role Toggle */}
        <div className="role-toggle">
          <button
            type="button"
            className={`role-btn ${role === 'user' ? 'active' : ''}`}
            onClick={() => setRole('user')}
          >
            👤 User
          </button>
          <button
            type="button"
            className={`role-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            🛡️ Admin
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label">Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={role === 'admin' ? 'Admin username' : 'e.g. Gaurav'}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-full" disabled={loading}
            style={role === 'admin' ? { background: 'var(--purple)' } : {}}>
            {loading ? <span className="spinner" /> : isLogin ? `Sign In as ${role === 'admin' ? 'Admin' : 'User'} →` : `Create ${role === 'admin' ? 'Admin' : 'User'} Account →`}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" className="link-btn" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

