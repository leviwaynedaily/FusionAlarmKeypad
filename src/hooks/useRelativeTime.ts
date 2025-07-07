import { useEffect, useState } from 'react';

export function useRelativeTime(timestampMs?: number) {
  const [label, setLabel] = useState(() => format(timestampMs));

  useEffect(() => {
    const id = setInterval(() => setLabel(format(timestampMs)), 1000);
    return () => clearInterval(id);
  }, [timestampMs]);

  return label;
}

function format(ts?: number) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'Just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`; 
} 