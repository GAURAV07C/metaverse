import { useState } from 'react';
import { z } from 'zod';
import { SignupSchema, SigninSchema, getZodMessage } from '../schemas';
import { useUserStore } from '../store';
import { api } from '../utils/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Role = 'user' | 'admin';

interface LoginProps {
  mode?: Role;
}

export function Login({ mode = 'user' }: LoginProps) {
  const isAdmin = mode === 'admin';
  const role: Role = isAdmin ? 'admin' : 'user';
  const [isLogin, setIsLogin] = useState(true);
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
    <div className="login-split-page">
      <div className="login-hero-side">
        <div className="hero-overlay" />
        <img src="/login-hero.jpg" alt="Virtual Office" className="hero-image" />
        <div className="hero-content">
          <div className="hero-logo-badge">{isAdmin ? 'Admin Console' : 'Clone'}</div>
          <h1>The virtual office<br/>that feels real.</h1>
          <p>Collaborate, create, and connect in a pixel-perfect world.</p>
        </div>
      </div>
      <div className="login-form-side">
        <div className="login-form-container animate-fade-in">
          <div className="login-header">
            <div className="auth-logo">{isAdmin ? '🛡️' : '🌐'}</div>
            <h2 className="auth-title">{isLogin ? (isAdmin ? 'Admin Portal' : 'Welcome Back') : (isAdmin ? 'Create Admin Account' : 'Join the Metaverse')}</h2>
            <p className="auth-subtitle">{isLogin ? 'Log in to your workspace' : 'Create your account to get started'}</p>
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
                placeholder={isAdmin ? 'Admin username' : 'e.g. Gaurav'}
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
            <button type="submit" className="btn btn-full login-btn" disabled={loading}>
              {loading ? <span className="spinner" /> : isLogin ? 'Sign In →' : 'Sign Up →'}
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
    </div>
  );
}

