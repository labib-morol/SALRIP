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

  // Flat, low-opacity fill instead of a gradient — reads as a measured trend
  // line, not a marketing chart.
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <path d={area} fill={color} fillOpacity={0.06} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pad + (data.length - 1) * step} cy={y(data[data.length - 1])} r="2" fill={color} />
    </svg>
  );
}
