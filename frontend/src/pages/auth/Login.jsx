import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigate(result.user?.role === 'ADMIN' ? '/admin' : '/employee');
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error("Login redirect error:", err);
      setError("An error occurred while redirecting. Check the console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      backgroundImage: `
        radial-gradient(at 10% 10%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
        radial-gradient(at 90% 90%, rgba(59, 130, 246, 0.06) 0px, transparent 50%)
      `,
      padding: '24px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle ambient backdrop lighting */}
      <div className="login-ambient" style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
        filter: 'blur(60px)',
        borderRadius: '50%',
        top: '-10%',
        left: '20%',
        pointerEvents: 'none'
      }} />

      {/* Modern White Glass Card Container */}
      <div className="login-card" style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '32px',
        padding: '48px 40px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        zIndex: 1,
        position: 'relative'
      }}>
        {/* Top Header & Large Borderless Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ 
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '24px',
            filter: 'drop-shadow(0 8px 16px rgba(99, 102, 241, 0.15))'
          }}>
            <img 
              src="/logo.png" 
              className="login-logo"
              alt="Nexoratel Logo" 
              style={{ 
                height: '150px', 
                width: 'auto', 
                objectFit: 'contain', 
                display: 'block' 
              }} 
            />
          </div>
          <h1 style={{ 
            color: '#0f172a', 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            letterSpacing: '-0.03em', 
            marginBottom: '8px' 
          }}>
            Welcome back
          </h1>
          <p style={{ 
            color: '#64748b', 
            fontSize: '0.92rem', 
            fontWeight: '400', 
            letterSpacing: '0.01em' 
          }}>
            Your secure operations workspace
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '14px 16px',
              borderRadius: '16px',
              fontSize: '0.875rem',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.05)'
            }}>
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <span style={{ lineHeight: '1.4' }}>{error}</span>
            </div>
          )}
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: '#334155', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              marginBottom: '8px',
              letterSpacing: '0.01em'
            }}>
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@nexoratel.com"
              style={{
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                padding: '14px 18px',
                color: '#0f172a',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.background = '#ffffff';
                e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.background = '#f8fafc';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <div style={{ marginBottom: '32px' }}>
            <label style={{ 
              display: 'block', 
              color: '#334155', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              marginBottom: '8px',
              letterSpacing: '0.01em'
            }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                padding: '14px 18px',
                color: '#0f172a',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.background = '#ffffff';
                e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.background = '#f8fafc';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting} 
            style={{
              width: '100%',
              background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3b82f6 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '15px 20px',
              fontSize: '0.98rem',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isSubmitting ? 'none' : '0 10px 20px -4px rgba(99, 102, 241, 0.4)',
              letterSpacing: '0.02em',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 14px 24px -4px rgba(99, 102, 241, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 20px -4px rgba(99, 102, 241, 0.4)';
              }
            }}
            onMouseDown={(e) => {
              if (!isSubmitting) e.target.style.transform = 'translateY(0)';
            }}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
