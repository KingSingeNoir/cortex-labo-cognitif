import React, { useRef } from 'react';
import { cellKey } from './generators/cortex.js';

function finish(onComplete, started, extra) {
  onComplete({
    rtMs: Date.now() - started,
    ...extra,
  });
}

const LEGACY = ['circle', 'square', 'triangle'];
const LEGACY_COLORS = ['#1571B0', '#d97706', '#0d9488'];

function normalizeCell(c) {
  if (!c) return { shape: 'circle', count: 1, angle: 0, color: '#38bdf8', fill: 'solid', size: 'm' };
  if (c.shape) {
    return {
      shape: c.shape,
      count: Math.max(1, Math.min(4, Number(c.count) || 1)),
      angle: Number(c.angle) || 0,
      color: c.color || '#38bdf8',
      fill: c.fill || 'solid',
      size: c.size || 'm',
    };
  }
  const i = Number(c.shapeType) || 0;
  return {
    shape: LEGACY[i] || 'circle',
    count: Math.max(1, Math.min(4, Number(c.count) || 1)),
    angle: Number(c.angle) || 0,
    color: LEGACY_COLORS[i % 3],
    fill: 'solid',
    size: 'm',
  };
}

function ShapePath({ shape, color, fill, hatchId }) {
  const outline = fill === 'outline';
  const stripe = fill === 'stripe';
  const paint = stripe ? `url(#${hatchId})` : outline ? 'none' : color;
  const sw = outline || stripe ? 1.5 : 0;
  const common = { fill: paint, stroke: color, strokeWidth: sw, strokeLinejoin: 'round', strokeLinecap: 'round' };
  if (shape === 'square') return <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.2" {...common} />;
  if (shape === 'triangle') return <polygon points="8,1.4 14.6,14.4 1.4,14.4" {...common} />;
  if (shape === 'diamond') return <polygon points="8,1.2 14.8,8 8,14.8 1.2,8" {...common} />;
  if (shape === 'hex') return <polygon points="8,1.3 13.6,4.4 13.6,11.6 8,14.7 2.4,11.6 2.4,4.4" {...common} />;
  if (shape === 'star') {
    return <polygon points="8,1.2 9.6,6 14.6,6 10.6,9 12.2,14 8,11 3.8,14 5.4,9 1.4,6 6.4,6" {...common} />;
  }
  if (shape === 'plus') return <path d="M6.4 1.6 h3.2 v4.8 h4.8 v3.2 h-4.8 v4.8 h-3.2 v-4.8 h-4.8 v-3.2 h4.8 z" {...common} />;
  if (shape === 'cross') {
    return <path d="M4.2 2.2 L8 6 l3.8-3.8 L14 4.4 10.2 8 14 11.6 11.8 13.8 8 10 4.2 13.8 2 11.6 5.8 8 2 4.4 z" {...common} />;
  }
  if (shape === 'ring') return <circle cx="8" cy="8" r="5.4" fill="none" stroke={color} strokeWidth="2.1" />;
  if (shape === 'pentagon') return <polygon points="8,1.4 14.4,6.2 12,14.4 4,14.4 1.6,6.2" {...common} />;
  if (shape === 'arrow') return <polygon points="8,1.2 14.2,8 10.2,8 10.2,14.6 5.8,14.6 5.8,8 1.8,8" {...common} />;
  if (shape === 'chevron') return <polygon points="8,2 14.6,9.6 11.8,9.6 8,5.6 4.2,9.6 1.4,9.6" {...common} />;
  if (shape === 'hourglass') return <polygon points="2.4 2 13.6 2 8 8 13.6 14 2.4 14 8 8" {...common} />;
  if (shape === 'teardrop') return <path d="M8 1.4 C12.4 6 13.4 10 8 14.6 C2.6 10 3.6 6 8 1.4 z" {...common} />;
  if (shape === 'leaf') return <path d="M8 1.6 C13.2 4.8 14.2 10.4 8 14.6 C1.8 10.4 2.8 4.8 8 1.6 z" {...common} />;
  if (shape === 'bolt') return <polygon points="9.6,1.4 3.8,8.6 7.2,8.6 5.4,14.6 12.4,6.8 8.6,6.8" {...common} />;
  if (shape === 'heart') {
    return <path d="M8 14.2 C3.2 10.4 2.2 6.8 4.8 4.6 C6.4 3.4 7.6 4.4 8 6 C8.4 4.4 9.6 3.4 11.2 4.6 C13.8 6.8 12.8 10.4 8 14.2 z" {...common} />;
  }
  if (shape === 'bar') return <rect x="1.4" y="5.8" width="13.2" height="4.4" rx="1" {...common} />;
  if (shape === 'pill') return <rect x="1.2" y="5" width="13.6" height="6" rx="3" {...common} />;
  if (shape === 'crescent') return <path d="M10.2 2.2 A6.4 6.4 0 1 0 10.2 13.8 A4.8 4.8 0 1 1 10.2 2.2 z" {...common} />;
  return <circle cx="8" cy="8" r="5.5" {...common} />;
}

function markOffset(layout, count, i) {
  if (count <= 1) return { x: 0, y: 0 };
  const spread = count >= 4 ? 15 : count === 3 ? 17 : 19;
  if (layout === 'stack') return { x: 0, y: (i - (count - 1) / 2) * spread };
  if (layout === 'orbit') {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    const r = count === 2 ? 12 : 14;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }
  if (layout === 'fan') {
    const a = (-0.65 + (1.3 * i) / Math.max(1, count - 1)) * Math.PI;
    return { x: Math.cos(a) * 13, y: Math.sin(a) * 10 };
  }
  return { x: (i - (count - 1) / 2) * spread, y: 0 };
}

export function AxisGlyph({
  count,
  angle,
  shapeType,
  shape,
  color,
  fill,
  size,
  layout = 'row',
  showAxis = true,
  gid = 'g',
}) {
  const cell = normalizeCell({ count, angle, shapeType, shape, color, fill, size });
  const scale =
    (cell.size === 's' ? 1.15 : cell.size === 'l' ? 1.55 : 1.35) * (cell.count >= 3 ? 0.88 : 1);
  const hatchId = `cxh-${gid}-${cell.shape}-${(cell.color || '').replace('#', '')}-${cell.count}-${Math.round(cell.angle)}`;
  const marks = [];
  for (let i = 0; i < cell.count; i += 1) {
    const { x, y } = markOffset(layout, cell.count, i);
    marks.push(
      <g key={i} transform={`translate(${x} ${y}) scale(${scale}) translate(-8 -8)`}>
        <ShapePath shape={cell.shape} color={cell.color} fill={cell.fill} hatchId={`${hatchId}-${i}`} />
      </g>
    );
  }
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        {Array.from({ length: cell.count }).map((_, i) => (
          <pattern
            key={i}
            id={`${hatchId}-${i}`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <rect width="5" height="5" fill={cell.color} opacity="0.18" />
            <line x1="0" y1="0" x2="0" y2="5" stroke={cell.color} strokeWidth="1.6" />
          </pattern>
        ))}
      </defs>
      <g transform={`rotate(${cell.angle} 40 40)`}>
        {showAxis && (
          <line x1="40" y1="5" x2="40" y2="13" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
        )}
        <g transform="translate(40 44)">{marks}</g>
      </g>
    </svg>
  );
}

function glyphProps(cell, trial) {
  return {
    ...normalizeCell(cell),
    layout: trial.data.layout || 'row',
    showAxis: trial.data.showAxis !== false,
  };
}

export function SvgMatrixBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { cells, options } = trial.data;
  return (
    <div className="space-y-4">
      <div className="mx-auto grid w-[min(100%,280px)] grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {cells.map((c, i) => (
          <div
            key={i}
            className="flex aspect-square items-center justify-center rounded-xl border border-slate-200 bg-white"
          >
            <AxisGlyph {...glyphProps(c, trial)} gid={`m${i}`} />
          </div>
        ))}
        <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-[#1571B0] text-2xl font-semibold text-[#1571B0]">
          ?
        </div>
      </div>
      <p className="text-center text-xs text-slate-500">Propositions : touchez la figure manquante.</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((c, i) => (
          <button
            key={cellKey(c) || i}
            type="button"
            onClick={() => {
              const ok = cellKey(c) === trial.expected.key;
              finish(onComplete, started.current, {
                success: ok,
                accuracy: ok ? 1 : 0,
                detail: { explanation: trial.explanation },
              });
            }}
            className="flex min-h-[88px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
          >
            <AxisGlyph {...glyphProps(c, trial)} gid={`mo${i}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function NumberSequenceBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  if (trial.data.mode === 'figures') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
          {trial.data.sequence.map((c, i) => (
            <div
              key={`${cellKey(c)}-${i}`}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border border-slate-200 bg-white"
            >
              <AxisGlyph {...glyphProps(c, trial)} gid={`s${i}`} />
            </div>
          ))}
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border-2 border-dashed border-[#1571B0] text-xl font-semibold text-[#1571B0]">
            ?
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {trial.data.options.map((c, i) => (
            <button
              key={cellKey(c) || i}
              type="button"
              onClick={() => {
                const ok = cellKey(c) === (trial.expected.key || trial.expected.answer);
                finish(onComplete, started.current, {
                  success: ok,
                  accuracy: ok ? 1 : 0,
                  detail: { explanation: trial.explanation },
                });
              }}
              className="flex min-h-[88px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
            >
              <AxisGlyph {...glyphProps(c, trial)} gid={`so${i}`} />
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-center font-mono text-xl tracking-wide text-[#1571B0] sm:text-2xl">
        {trial.data.sequence.join('  ·  ')}  ·  ?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {trial.data.options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              const ok = n === trial.expected.answer;
              finish(onComplete, started.current, {
                success: ok,
                accuracy: ok ? 1 : 0,
                detail: { explanation: trial.explanation },
              });
            }}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] py-4 font-mono text-lg font-semibold transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SyllogismBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  return (
    <div className="space-y-4">
      <div className="whitespace-pre-line rounded-2xl border-l-4 border-[#1571B0] bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
        {trial.data.premises}
      </div>
      <div className="grid gap-2">
        {trial.data.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              const ok = opt === trial.expected.answer;
              finish(onComplete, started.current, {
                success: ok,
                accuracy: ok ? 1 : 0,
                detail: { explanation: trial.explanation },
              });
            }}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-left text-sm leading-relaxed transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
