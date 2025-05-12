'use client';

export default function MeetingConfirmation() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-sidebar)',
        fontFamily: 'var(--font-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          boxShadow: '0 4px 24px rgba(26,46,68,0.08)',
          borderRadius: '1rem',
          padding: '1.5rem',
          maxWidth: '22rem',
          width: '100%',
          margin: '0 1rem',
          textAlign: 'center',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <svg
            style={{ display: 'block', margin: '0 auto', height: '3rem', width: '3rem', color: 'var(--color-green)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            marginBottom: '0.75rem',
          }}
        >
          Meeting Successfully Scheduled
        </h1>
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--color-primary)',
            marginBottom: '1rem',
          }}
        >
          Thank you for scheduling your meeting. We look forward to our conversation!
        </p>
      </div>
    </div>
  );
} 