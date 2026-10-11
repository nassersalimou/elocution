import { formatTime } from '../../utils/dateUtils';

export function CircularTimer({ seconds, total, label, size = 160, active = true, color = 'var(--violet)' }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? seconds / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="circular-timer" style={{ textAlign: 'center' }}>
      {label && <p className="circular-timer-label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>}
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={active ? color : 'var(--text-secondary)'}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatTime(seconds)}</span>
        </div>
      </div>
    </div>
  );
}

export default CircularTimer;
