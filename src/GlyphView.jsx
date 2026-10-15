import React from 'react';

export function GlyphMark({ glyph, size = 44 }) {
  const g = glyph || { shape: 'circle', color: '#1571B0', rotation: 0, count: 1 };
  const n = Math.max(1, Math.min(4, g.count || 1));
  const s = Math.max(18, size / Math.sqrt(n));
  return (
    <div
      className="inline-flex flex-wrap items-center justify-center gap-0.5"
      style={{ width: size + 8, minHeight: size }}
    >
      {Array.from({ length: n }).map((_, i) => (
        <svg
          key={i}
          width={s}
          height={s}
          viewBox="0 0 32 32"
          style={{ transform: `rotate(${g.rotation || 0}deg)` }}
          aria-hidden
        >
          <GlyphPath shape={g.shape} color={g.color} />
        </svg>
      ))}
    </div>
  );
}

function GlyphPath({ shape, color }) {
  if (shape === 'square') {
    return <rect x="6" y="6" width="20" height="20" rx="3" fill={color} />;
  }
  if (shape === 'triangle') {
    return <polygon points="16,5 28,27 4,27" fill={color} />;
  }
  if (shape === 'diamond') {
    return <polygon points="16,4 28,16 16,28 4,16" fill={color} />;
  }
  if (shape === 'hex') {
    return <polygon points="16,4 27,10 27,22 16,28 5,22 5,10" fill={color} />;
  }
  return <circle cx="16" cy="16" r="11" fill={color} />;
}

export function VoxelIso({ voxels, size = 88 }) {
  const cells = (voxels || []).slice().sort((a, b) => a.x + a.z + a.y - (b.x + b.z + b.y));
  const w = size;
  const h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 120 120" aria-hidden>
      {cells.map((v, i) => {
        const ox = 36 + (v.x - v.z) * 22;
        const oy = 28 + (v.x + v.z) * 12 - v.y * 18;
        return (
          <g key={i} transform={`translate(${ox} ${oy})`}>
            <polygon points="0,8 18,0 36,8 18,16" fill={v.color} opacity="0.95" />
            <polygon points="0,8 18,16 18,32 0,24" fill={v.color} opacity="0.7" />
            <polygon points="18,16 36,8 36,24 18,32" fill={v.color} opacity="0.55" />
          </g>
        );
      })}
    </svg>
  );
}
