/**
 * NotFound (404) Page — Item 24
 * ==============================
 * Rendered by the router for any unknown route.
 * Provides a polished, accessible, branded 404 experience.
 */

import { useNavigate } from 'react-router-dom';


export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main
      id="not-found-page"
      role="main"
      aria-labelledby="not-found-heading"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page, #0f172a)',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: 540,
          textAlign: 'center',
        }}
      >
        {/* Large 404 Display */}
        <p
          aria-hidden="true"
          style={{
            fontSize: 'clamp(6rem, 15vw, 10rem)',
            fontWeight: 900,
            lineHeight: 1,
            margin: '0 0 0.5rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            userSelect: 'none',
            letterSpacing: '-0.05em',
          }}
        >
          404
        </p>

        <h1
          id="not-found-heading"
          style={{
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 1rem',
          }}
        >
          Page Not Found
        </h1>

        <p
          style={{
            color: 'var(--text-secondary, #94a3b8)',
            fontSize: '0.95rem',
            lineHeight: 1.7,
            margin: '0 0 2.5rem',
          }}
        >
          The route you&apos;re looking for doesn&apos;t exist or has been moved. Check
          the URL or navigate back to the dashboard.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            id="not-found-go-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back to the previous page"
            style={{
              padding: '0.65rem 1.5rem',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-primary, #f8fafc)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onFocus={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onBlur={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            ← Go Back
          </button>

          <button
            id="not-found-home-btn"
            onClick={() => navigate('/app', { replace: true })}
            aria-label="Return to the Sentraa AI dashboard"
            style={{
              padding: '0.65rem 1.5rem',
              background: 'var(--royal-indigo, #4f46e5)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onFocus={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
            onBlur={e => (e.currentTarget.style.opacity = '1')}
          >
            → Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}

export default NotFoundPage;
