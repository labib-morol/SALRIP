export function Sparkline({
  data,
  color = "var(--brand)",
  width = 120,
  height = 34,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const step = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;
  const y = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);
  const pts = data.map((v, i) => `${pad + i * step},${y(v)}`);
  const line = pts.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(" ");
  const area = `${line} L${pad + (data.length - 1) * step},${height} L${pad},${height} Z`;
  const gid = `sg-${Math.abs(data.reduce((a, b) => a + b, 0)).toString(36)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pad + (data.length - 1) * step} cy={y(data[data.length - 1])} r="2" fill={color} />
    </svg>
  );
}
