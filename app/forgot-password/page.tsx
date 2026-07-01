'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      router.push('/login');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    setCountdown(null);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
      setCountdown(10);
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err.response as { data?: { error?: string } })?.data?.error
          : 'Failed to request password reset';
      setError(errorMessage || 'Failed to request password reset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundImage: 'url("/background.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: '20px',
      position: 'relative'
    }}>
      <div style={{ 
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.88) 100%)'
      }} />
      <div style={{ 
        width: '100%', 
        maxWidth: '440px', 
        background: 'linear-gradient(145deg, rgba(24, 24, 27, 0.98) 0%, rgba(30, 30, 35, 0.95) 100%)', 
        border: '1px solid rgba(63, 63, 70, 0.5)', 
        borderRadius: '24px', 
        padding: '40px 36px',
        position: 'relative',
        zIndex: 1,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
      }}>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <img 
              src="/logo.png" 
              alt="BugFlow Logo" 
              style={{ width: '80px', height: 'auto' }}
            />
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '800', 
            color: '#f9fafb', 
            margin: '0 0 6px 0',
            letterSpacing: '-0.5px'
          }}>Reset Password</h1>
          <p style={{ fontSize: '15px', color: '#a1a1aa', margin: 0, fontWeight: '400' }}>We'll send you a reset link</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: '#e4e4e7' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#71717a'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 46px',
                  fontSize: '15px',
                  backgroundColor: '#18181b',
                  border: '2px solid #27272a',
                  borderRadius: '12px',
                  color: '#f9fafb',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                onBlur={(e) => e.target.style.borderColor = '#27272a'}
              />
            </div>
          </div>

          {error && (
            <div style={{ 
              padding: '14px', 
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p style={{ fontSize: '14px', color: '#fca5a5', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!email || isLoading}
            style={{
              padding: '15px',
              fontSize: '16px',
              fontWeight: '700',
              background: !email || isLoading 
                ? 'linear-gradient(135deg, #3f3f46 0%, #27272a 100%)' 
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              cursor: !email || isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: !email || isLoading 
                ? 'none' 
                : '0 10px 30px -10px rgba(245, 158, 11, 0.6)',
              transition: 'all 0.3s ease'
            }}
          >
            {isLoading ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: '28px',
            padding: '16px', 
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.08) 100%)', 
            border: '1px solid rgba(34, 197, 94, 0.3)', 
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p style={{ fontSize: '14px', color: '#86efac', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>{message}</p>
            </div>
            {countdown !== null && (
              <div style={{ 
                marginTop: '4px', 
                paddingTop: '12px', 
                borderTop: '1px solid rgba(34, 197, 94, 0.2)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#a3e635', 
                  margin: 0, 
                  fontWeight: '600' 
                }}>
                  ⚠️ You will be redirected back to Sign In in {countdown} second{countdown !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{ 
          textAlign: 'center', 
          marginTop: '28px', 
          fontSize: '14px', 
          color: '#a1a1aa',
          paddingTop: '24px',
          borderTop: '1px solid #27272a'
        }}>
          Remember your password?{' '}
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#60a5fa',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: 0,
              transition: 'color 0.2s ease'
            }}
          >
            Sign In
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}