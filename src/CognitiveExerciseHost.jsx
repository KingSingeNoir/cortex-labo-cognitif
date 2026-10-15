import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COLOR_WORDS, visualKey } from './glyphs.js';
import { GlyphMark, VoxelIso } from './GlyphView.jsx';
import { createRng } from './rng.js';
import {
  FocusSwitchBoard,
  ReadingWatchBoard,
  WatchPriorityBoard,
  DelayedSwitchBoard,
} from './MixBoards.jsx';
import {
  VisAccomBoard,
  VisPursuitBoard,
  VisSaccadeBoard,
  VisBlinkBoard,
} from './VisionBoards.jsx';
import {
  SvgMatrixBoard,
  NumberSequenceBoard,
  SyllogismBoard,
} from './CortexBoards.jsx';

function finish(onComplete, started, extra) {
  onComplete({
    rtMs: Date.now() - started,
    ...extra,
  });
}

function ChoiceGrid({ options, render, onPick }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(opt, i)}
          className="flex min-h-[72px] items-center justify-center rounded-xl border border-slate-200 bg-white p-3 hover:border-[#1571B0]"
        >
          {render(opt, i)}
        </button>
      ))}
    </div>
  );
}

function StreamLetter({ value }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-2xl border border-slate-200 bg-white text-5xl font-semibold tracking-widest text-slate-900">
      {value}
    </div>
  );
}

function SpatialGrid({ index }) {
  return (
    <div className="mx-auto grid w-40 grid-cols-3 gap-1.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`aspect-square rounded-lg border ${
            i === index ? 'border-[#1571B0] bg-[#1571B0]' : 'border-slate-200 bg-slate-50'
          }`}
        />
      ))}
    </div>
  );
}

function playTone(letter) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const code = String(letter || 'A').charCodeAt(0);
    o.frequency.value = 220 + (code % 12) * 40;
    o.type = 'sine';
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.18);
  } catch {
    /* ignore */
  }
}

export function NbackBoard({ trial, onComplete }) {
  const { items, matches, isiMs, n, modality } = trial.data;
  const started = useRef(Date.now());
  const [i, setI] = useState(0);
  const [pressedAt, setPressedAt] = useState(-1);
  const hits = useRef([]);
  const item = items[i];

  useEffect(() => {
    if (modality === 'audio' || modality === 'dual') playTone(item?.audio);
  }, [i, modality, item]);

  const finished = useRef(false);

  useEffect(() => {
    if (i >= items.length) {
      if (finished.current) return;
      finished.current = true;
      const user = hits.current;
      let tp = 0;
      let fp = 0;
      let fn = 0;
      matches.forEach((m, idx) => {
        const u = Boolean(user[idx]);
        if (m && u) tp += 1;
        if (!m && u) fp += 1;
        if (m && !u) fn += 1;
      });
      const denom = tp + fp + fn;
      const accuracy = denom === 0 ? 1 : tp / denom;
      finish(onComplete, started.current, {
        success: accuracy >= 0.65,
        accuracy,
        detail: { n, tp, fp, fn },
      });
    }
  }, [i, items.length, matches, n, onComplete]);

  useEffect(() => {
    if (i >= items.length) return undefined;
    const t = setTimeout(() => setI((v) => v + 1), isiMs);
    return () => clearTimeout(t);
  }, [i, isiMs, items.length]);

  if (i >= items.length) return null;
  const pressed = pressedAt === i;

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-slate-500">
        Élément {i + 1} sur {items.length}
        {i < n ? ' · pas encore de comparaison possible, mémorisez' : ''}
      </p>
      {modality !== 'spatial' ? <StreamLetter value={item.vis} /> : null}
      {(modality === 'spatial' || modality === 'dual') && (
        <SpatialGrid index={item.pos} />
      )}
      <button
        type="button"
        disabled={pressed}
        onClick={() => {
          hits.current[i] = true;
          setPressedAt(i);
        }}
        className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition ${
          pressed ? 'bg-emerald-600' : 'bg-[#1571B0]'
        }`}
      >
        {pressed ? 'Noté : identique' : 'Identique'}
      </button>
    </div>
  );
}

function RecallKeys({ keys, onKey, onErase }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          className="h-11 w-11 rounded-lg border border-slate-200 bg-white text-lg font-semibold hover:border-[#1571B0]"
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onClick={onErase}
        className="rounded-lg border border-slate-200 px-3 text-sm"
      >
        Effacer
      </button>
    </div>
  );
}

export function SpanBoard({ trial, onComplete }) {
  const { sequence, showMs, interference } = trial.data;
  const started = useRef(Date.now());
  const [phase, setPhase] = useState('show');
  const [idx, setIdx] = useState(0);
  const [buffer, setBuffer] = useState('');
  const [parityLeft, setParityLeft] = useState(null);

  useEffect(() => {
    if (phase !== 'show') return undefined;
    if (idx >= sequence.length) {
      setPhase('recall');
      return undefined;
    }
    if (interference) {
      const n = Number(sequence[idx]);
      if (Number.isFinite(n)) setParityLeft(n);
    }
    const t = setTimeout(() => {
      setParityLeft(null);
      setIdx((v) => v + 1);
    }, showMs + (interference ? 700 : 0));
    return () => clearTimeout(t);
  }, [phase, idx, sequence, showMs, interference]);

  if (phase === 'show') {
    return (
      <div className="space-y-3">
        <p className="text-center text-xs text-slate-500">
          Mémorisez · élément {Math.min(idx + 1, sequence.length)} sur {sequence.length}
        </p>
        <StreamLetter value={sequence[idx] || '…'} />
        {parityLeft != null && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-slate-500">Ce chiffre est-il pair ou impair ?</span>
            {['Pair', 'Impair'].map((lab) => (
              <button
                key={lab}
                type="button"
                onClick={() => setParityLeft(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm hover:border-[#1571B0]"
              >
                {lab}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const keys = Array.from(new Set(sequence)).sort();
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-slate-600">
        Tapez la séquence à l’envers, en commençant par le dernier élément vu.
      </p>
      <p className="text-center font-mono text-2xl tracking-[0.3em]">{buffer || '—'}</p>
      <RecallKeys
        keys={keys}
        onKey={(k) => setBuffer((b) => (b.length < sequence.length ? b + k : b))}
        onErase={() => setBuffer((b) => b.slice(0, -1))}
      />
      <button
        type="button"
        onClick={() => {
          const ok = buffer === trial.expected.answer;
          finish(onComplete, started.current, {
            success: ok,
            accuracy: ok ? 1 : 0,
          });
        }}
        className="w-full rounded-xl bg-[#1571B0] py-3 text-sm font-semibold text-white"
      >
        Valider
      </button>
    </div>
  );
}

export function RunningBoard({ trial, onComplete }) {
  const { stream, isiMs, window } = trial.data;
  const started = useRef(Date.now());
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState('stream');
  const [buffer, setBuffer] = useState('');

  useEffect(() => {
    if (phase !== 'stream') return undefined;
    if (i >= stream.length) {
      setPhase('recall');
      return undefined;
    }
    const t = setTimeout(() => setI((v) => v + 1), isiMs);
    return () => clearTimeout(t);
  }, [i, stream, isiMs, phase]);

  if (phase === 'stream') {
    return (
      <div className="space-y-3">
        <p className="text-center text-xs text-slate-500">
          Flux en cours · gardez en tête les {window} dernières lettres
        </p>
        <StreamLetter value={stream[i] || '…'} />
      </div>
    );
  }

  const keys = Array.from(new Set(stream)).sort();
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-slate-600">
        Le flux est terminé. Tapez les {window} dernières lettres, dans leur ordre
        d’apparition.
      </p>
      <p className="text-center font-mono text-2xl tracking-[0.3em]">{buffer || '—'}</p>
      <RecallKeys
        keys={keys}
        onKey={(k) => setBuffer((b) => (b.length < window ? b + k : b))}
        onErase={() => setBuffer((b) => b.slice(0, -1))}
      />
      <button
        type="button"
        onClick={() => {
          const ok = buffer === trial.expected.answer;
          finish(onComplete, started.current, {
            success: ok,
            accuracy: ok ? 1 : 0,
          });
        }}
        className="w-full rounded-xl bg-[#1571B0] py-3 text-sm font-semibold text-white"
      >
        Valider
      </button>
    </div>
  );
}

export function DualBoard({ trial, onComplete }) {
  const { hold, secondary } = trial.data;
  const started = useRef(Date.now());
  const [phase, setPhase] = useState('encode');
  const [si, setSi] = useState(0);
  const [buffer, setBuffer] = useState('');
  const parityOk = useRef(0);
  const parityN = useRef(0);

  useEffect(() => {
    if (phase !== 'encode') return undefined;
    const t = setTimeout(() => setPhase('busy'), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'encode') {
    return (
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          À retenir jusqu’à la fin de la manche
        </p>
        <StreamLetter value={hold} />
      </div>
    );
  }

  if (phase === 'busy') {
    const n = secondary[si];
    return (
      <div className="space-y-3 text-center">
        <p className="text-xs text-slate-500">
          Ce nombre est-il pair ou impair ? ({si + 1} sur {secondary.length})
        </p>
        <p className="text-4xl font-semibold">{n}</p>
        <div className="grid grid-cols-2 gap-2">
          {['Pair', 'Impair'].map((lab, k) => (
            <button
              key={lab}
              type="button"
              onClick={() => {
                parityN.current += 1;
                const even = n % 2 === 0;
                if ((k === 0 && even) || (k === 1 && !even)) parityOk.current += 1;
                if (si + 1 >= secondary.length) setPhase('recall');
                else setSi((v) => v + 1);
              }}
              className="rounded-xl border border-slate-200 bg-white py-3 font-semibold"
            >
              {lab}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-slate-600">
        Tapez l’élément que vous deviez retenir, puis validez.
      </p>
      <input
        value={buffer}
        onChange={(e) => setBuffer(e.target.value.toUpperCase())}
        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-center font-mono text-xl"
        aria-label="Élément retenu"
        autoFocus
      />
      <button
        type="button"
        onClick={() => {
          const ok = buffer.trim() === String(trial.expected.answer);
          const pAcc = parityN.current ? parityOk.current / parityN.current : 1;
          const accuracy = ok ? 0.7 + 0.3 * pAcc : 0.3 * pAcc;
          finish(onComplete, started.current, {
            success: ok && pAcc >= 0.5,
            accuracy,
          });
        }}
        className="w-full rounded-xl bg-[#1571B0] py-3 text-sm font-semibold text-white"
      >
        Valider
      </button>
    </div>
  );
}

export function DelayedBoard({ trial, onComplete }) {
  const { hold, tasks } = trial.data;
  const started = useRef(Date.now());
  const [phase, setPhase] = useState('encode');
  const [ti, setTi] = useState(0);
  const [buffer, setBuffer] = useState('');

  useEffect(() => {
    if (phase !== 'encode') return undefined;
    const t = setTimeout(() => setPhase('fill'), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'encode') {
    return (
      <div className="text-center">
        <p className="mb-2 text-xs uppercase text-slate-500">À retenir</p>
        <StreamLetter value={hold} />
      </div>
    );
  }

  if (phase === 'fill' && ti < tasks.length) {
    const t = tasks[ti];
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-slate-500">Combien font {t.a} × {t.b} ?</p>
        <div className="grid grid-cols-2 gap-2">
          {[t.a * t.b, t.a * t.b + 2, t.a + t.b, t.a * (t.b + 1)].map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (ti + 1 >= tasks.length) setPhase('recall');
                else setTi((x) => x + 1);
              }}
              className="rounded-xl border bg-white py-3 font-semibold"
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-slate-600">Restituez maintenant</p>
      <input
        value={buffer}
        onChange={(e) => setBuffer(e.target.value.toUpperCase())}
        className="w-full rounded-xl border px-3 py-3 text-center font-mono text-xl"
      />
      <button
        type="button"
        onClick={() => {
          const ok = buffer.trim() === trial.expected.answer;
          finish(onComplete, started.current, { success: ok, accuracy: ok ? 1 : 0 });
        }}
        className="w-full rounded-xl bg-[#1571B0] py-3 text-sm font-semibold text-white"
      >
        Valider
      </button>
    </div>
  );
}

export function MatrixBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { size, cells, options } = trial.data;
  return (
    <div className="space-y-4">
      <div
        className="mx-auto grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, maxWidth: 240 }}
      >
        {cells.map((g, i) => (
          <div
            key={i}
            className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white"
          >
            {g ? <GlyphMark glyph={g} /> : <span className="text-slate-300">?</span>}
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">Propositions : touchez votre réponse.</p>
      <ChoiceGrid
        options={options}
        render={(g) => <GlyphMark glyph={g} />}
        onPick={(g) => {
          const ok = visualKey(g) === trial.expected.key;
          finish(onComplete, started.current, { success: ok, accuracy: ok ? 1 : 0 });
        }}
      />
    </div>
  );
}

export function RotationBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center rounded-2xl border bg-white p-3">
        <p className="mb-1 text-xs font-semibold text-slate-500">Objet de référence</p>
        <VoxelIso voxels={trial.data.obj} size={120} />
      </div>
      <p className="text-center text-xs text-slate-500">
        Laquelle de ces vues montre le même objet, simplement tourné ?
      </p>
      <ChoiceGrid
        options={trial.data.options}
        render={(o) => <VoxelIso voxels={o.voxels} size={88} />}
        onPick={(o) => {
          const ok = o.id === trial.expected.id;
          finish(onComplete, started.current, { success: ok, accuracy: ok ? 1 : 0 });
        }}
      />
    </div>
  );
}

export function AnalogyBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { a, b, c, options } = trial.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400">
        {[
          ['A', a],
          ['B', b],
        ].map(([label, g], i) => (
          <React.Fragment key={label}>
            {i === 1 && <span>→</span>}
            <figure className="flex flex-col items-center">
              <GlyphMark glyph={g} />
              <figcaption className="text-xs font-bold text-slate-500">{label}</figcaption>
            </figure>
          </React.Fragment>
        ))}
        <span className="px-3 text-sm text-slate-500">comme</span>
        <figure className="flex flex-col items-center">
          <GlyphMark glyph={c} />
          <figcaption className="text-xs font-bold text-slate-500">C</figcaption>
        </figure>
        <span>→</span>
        <figure className="flex flex-col items-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-slate-300 text-2xl">
            ?
          </span>
          <figcaption className="text-xs font-bold text-slate-500">D</figcaption>
        </figure>
      </div>
      <p className="text-center text-xs text-slate-500">Quelle figure doit remplacer D ?</p>
      <ChoiceGrid
        options={options}
        render={(g) => <GlyphMark glyph={g} />}
        onPick={(g) => {
          const ok = visualKey(g) === trial.expected.key;
          finish(onComplete, started.current, { success: ok, accuracy: ok ? 1 : 0 });
        }}
      />
    </div>
  );
}

export function SeriesBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {trial.data.series.map((g, i) => (
          <div key={i} className="rounded-xl border bg-white p-2">
            <GlyphMark glyph={g} />
          </div>
        ))}
        <div className="rounded-xl border border-dashed p-4 text-slate-400">?</div>
      </div>
      <p className="text-center text-xs text-slate-500">Quelle figure vient ensuite ?</p>
      <ChoiceGrid
        options={trial.data.options}
        render={(g) => <GlyphMark glyph={g} />}
        onPick={(g) => {
          const ok = visualKey(g) === trial.expected.key;
          finish(onComplete, started.current, { success: ok, accuracy: ok ? 1 : 0 });
        }}
      />
    </div>
  );
}

export function CodeSymbolBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { key, items } = trial.data;
  const [i, setI] = useState(0);
  const okN = useRef(0);

  if (i >= items.length) return null;
  const cur = items[i];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-3">
        <p className="mb-2 text-center text-xs font-semibold text-slate-500">Clé de correspondance</p>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          {key.map((k) => (
            <span key={k.sym} className="rounded-lg bg-slate-50 px-2 py-1">
              {k.sym} = {k.digit}
            </span>
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-slate-500">
        Symbole {i + 1} sur {items.length} : quel chiffre lui correspond ?
      </p>
      <p className="text-center text-4xl">{cur.sym}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {key.map((k) => (
          <button
            key={k.digit}
            type="button"
            onClick={() => {
              const good = k.digit === cur.digit;
              if (good) okN.current += 1;
              if (i + 1 >= items.length) {
                const acc = okN.current / items.length;
                finish(onComplete, started.current, {
                  success: acc >= 0.7,
                  accuracy: acc,
                });
              } else setI((v) => v + 1);
            }}
            className="h-10 w-10 rounded-lg border bg-white font-semibold"
          >
            {k.digit}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BarrageBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { cols, cells, target } = trial.data;
  const [picked, setPicked] = useState(() => new Set());

  const submit = (set) => {
    const expected = new Set(trial.expected.targets);
    let tp = 0;
    let fp = 0;
    set.forEach((i) => {
      if (expected.has(i)) tp += 1;
      else fp += 1;
    });
    const fn = expected.size - tp;
    const acc = expected.size ? tp / (expected.size + fp) : 0;
    finish(onComplete, started.current, {
      success: fn === 0 && fp <= 1,
      accuracy: acc,
      detail: { tp, fp, fn },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells.map((ch, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              const next = new Set(picked);
              if (next.has(i)) next.delete(i);
              else next.add(i);
              setPicked(next);
            }}
            className={`aspect-square rounded-md text-sm font-bold ${
              picked.has(i) ? 'bg-[#1571B0] text-white' : 'bg-white text-slate-700'
            } border border-slate-200`}
          >
            {ch}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">
        Lettre cherchée : « {target} » · {picked.size}{' '}
        {picked.size > 1 ? 'cases sélectionnées' : 'case sélectionnée'}
      </p>
      <button
        type="button"
        onClick={() => submit(picked)}
        className="w-full rounded-xl bg-[#1571B0] py-3 text-sm font-semibold text-white"
      >
        J’ai terminé
      </button>
    </div>
  );
}

export function StroopBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { trials } = trial.data;
  const [i, setI] = useState(0);
  const okN = useRef(0);

  const step = (ink) => {
    if (ink === trials[i].expectedInk) okN.current += 1;
    if (i + 1 >= trials.length) {
      const acc = okN.current / trials.length;
      finish(onComplete, started.current, { success: acc >= 0.7, accuracy: acc });
    } else setI((v) => v + 1);
  };

  const cur = trials[i];
  if (!cur) return null;
  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-slate-500">
        Mot {i + 1} sur {trials.length} · de quelle couleur est l’encre ?
      </p>
      <p className="text-center text-4xl font-black" style={{ color: cur.ink }}>
        {cur.word}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {COLOR_WORDS.map((c) => (
          <button
            key={c.word}
            type="button"
            onClick={() => step(c.ink)}
            className="rounded-xl py-3 text-sm font-semibold text-white"
            style={{ background: c.ink }}
          >
            {c.word}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompareBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { trials, expoMs } = trial.data;
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(true);
  const okN = useRef(0);

  useEffect(() => {
    setShown(true);
    const t = setTimeout(() => setShown(false), expoMs);
    return () => clearTimeout(t);
  }, [i, expoMs]);

  const step = (same) => {
    if (same === trials[i].same) okN.current += 1;
    if (i + 1 >= trials.length) {
      const acc = okN.current / trials.length;
      finish(onComplete, started.current, { success: acc >= 0.7, accuracy: acc });
    } else setI((v) => v + 1);
  };

  const cur = trials[i];
  if (!cur) return null;
  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-slate-500">
        Comparaison {i + 1} sur {trials.length}
      </p>
      <div className="flex h-12 items-center justify-center gap-6 font-mono text-3xl font-semibold">
        {shown ? (
          <>
            <span>{cur.a}</span>
            <span>{cur.b}</span>
          </>
        ) : (
          <span className="text-base font-sans font-normal text-slate-400">
            Identiques ou différentes ?
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => step(true)}
          className="rounded-xl border bg-white py-3 font-semibold"
        >
          Identiques
        </button>
        <button
          type="button"
          onClick={() => step(false)}
          className="rounded-xl border bg-white py-3 font-semibold"
        >
          Différentes
        </button>
      </div>
    </div>
  );
}

export function ReadingBoard({ trial, onComplete, reduceStimuli }) {
  const started = useRef(Date.now());
  const { body, q, options, intensity } = trial.data;
  return (
    <div className="relative space-y-4 overflow-hidden">
      {!reduceStimuli && (
        <div
          className="pointer-events-none absolute inset-0 t3us-cog-distractor"
          style={{ opacity: 0.08 + intensity * 0.03 }}
          aria-hidden
        />
      )}
      <p className="relative rounded-xl border bg-white p-4 text-sm leading-relaxed text-slate-700">
        {body}
      </p>
      <p className="relative text-sm font-semibold">{q}</p>
      <div className="relative grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              const ok = o === trial.expected.answer;
              finish(onComplete, started.current, { success: ok, accuracy: ok ? 1 : 0 });
            }}
            className="rounded-xl border bg-white py-3 text-sm font-semibold"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MotBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { objects, targets, speed, durationMs, seed } = trial.data;
  const box = 260;
  const rng = useMemo(() => createRng(seed), [seed]);
  const [phase, setPhase] = useState('cue');
  const [picked, setPicked] = useState([]);
  const balls = useRef(
    Array.from({ length: objects }, (_, i) => ({
      id: i,
      x: 20 + rng() * (box - 40),
      y: 20 + rng() * (box - 40),
      vx: (rng() - 0.5) * speed * 4,
      vy: (rng() - 0.5) * speed * 4,
      target: i < targets,
    }))
  );
  const [, tick] = useState(0);

  useEffect(() => {
    const cueT = setTimeout(() => setPhase('track'), 1600);
    const endT = setTimeout(() => setPhase('pick'), 1600 + durationMs);
    let raf;
    const loop = () => {
      balls.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 12 || b.x > box - 12) b.vx *= -1;
        if (b.y < 12 || b.y > box - 12) b.vy *= -1;
      });
      tick((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      clearTimeout(cueT);
      clearTimeout(endT);
      cancelAnimationFrame(raf);
    };
  }, [durationMs, box]);

  const submit = (ids) => {
    const want = balls.current.filter((b) => b.target).map((b) => b.id);
    const ok = want.every((id) => ids.includes(id)) && ids.length === want.length;
    finish(onComplete, started.current, {
      success: ok,
      accuracy: want.filter((id) => ids.includes(id)).length / want.length,
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="relative mx-auto rounded-2xl border bg-slate-900"
        style={{ width: box, height: box }}
      >
        {balls.current.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={phase !== 'pick'}
            onClick={() => {
              if (phase !== 'pick') return;
              const next = picked.includes(b.id)
                ? picked.filter((x) => x !== b.id)
                : [...picked, b.id];
              setPicked(next);
              if (next.length >= targets) submit(next);
            }}
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: b.x,
              top: b.y,
              background:
                phase === 'cue' && b.target
                  ? '#22d3ee'
                  : picked.includes(b.id)
                    ? '#1571B0'
                    : '#94a3b8',
            }}
          />
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">
        {phase === 'cue' && 'Mémorisez la cible claire'}
        {phase === 'track' && 'Suivez du regard…'}
        {phase === 'pick' && 'Touchez la ou les cibles'}
      </p>
    </div>
  );
}

export function FocusBoard({ trial, onComplete, reduceStimuli }) {
  const started = useRef(Date.now());
  const { stream, interruptEvery, isiMs } = trial.data;
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState('stream');
  const [guess, setGuess] = useState('');
  const [notif, setNotif] = useState(false);
  const clickedNotif = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    if (phase !== 'stream') return undefined;
    if (i >= stream.length) {
      setPhase('ask');
      return undefined;
    }
    const t = setTimeout(() => {
      setI((v) => v + 1);
      setNotif(!reduceStimuli && (i + 1) % interruptEvery === 0);
    }, isiMs);
    return () => clearTimeout(t);
  }, [i, stream, isiMs, interruptEvery, reduceStimuli, phase]);

  const submit = () => {
    if (finished.current) return;
    finished.current = true;
    const expected = trial.expected.sum;
    const val = Number(guess);
    const acc = Number.isFinite(val)
      ? 1 - Math.min(1, Math.abs(val - expected) / Math.max(expected, 1))
      : 0;
    const success = acc >= 0.85 && clickedNotif.current === 0;
    finish(onComplete, started.current, {
      success,
      accuracy: clickedNotif.current ? acc * 0.7 : acc,
    });
  };

  return (
    <div className="relative space-y-3">
      {notif && !reduceStimuli && (
        <button
          type="button"
          onClick={() => {
            clickedNotif.current += 1;
            setNotif(false);
          }}
          className="absolute right-0 top-0 z-10 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-amber-950 shadow"
        >
          Nouveau message
        </button>
      )}
      {phase === 'stream' ? (
        <>
          <p className="text-center text-xs text-slate-500">Additionnez — ignorez les notifications</p>
          <p className="text-center text-4xl font-semibold">
            {stream[Math.min(i, stream.length - 1)]}
          </p>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-slate-600">Quel est le total ?</p>
          <input
            type="number"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="w-full rounded-xl border px-3 py-3 text-center text-xl"
          />
          <button
            type="button"
            onClick={submit}
            className="w-full rounded-xl bg-[#1571B0] py-3 text-sm font-semibold text-white"
          >
            Valider
          </button>
        </div>
      )}
    </div>
  );
}

export function BreathBoard({ trial, onComplete, reduceStimuli }) {
  const [ready, setReady] = useState(false);
  const { durationMs, nested } = trial.data;

  useEffect(() => {
    const t = setTimeout(() => setReady(true), Math.min(durationMs, 45000));
    return () => clearTimeout(t);
  }, [durationMs]);

  if (!ready) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="t3us-cog-breath h-28 w-28 rounded-full bg-[#1571B0]/20" />
        <p className="text-sm text-slate-600">Inspirez… expirez. La tâche suit.</p>
        <button
          type="button"
          onClick={() => setReady(true)}
          className="text-xs text-slate-500 underline"
        >
          Passer l’ancrage
        </button>
      </div>
    );
  }

  return (
    <StroopBoard
      trial={{ ...nested, expected: trial.expected }}
      onComplete={onComplete}
      reduceStimuli={reduceStimuli}
    />
  );
}

export function SwitchBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { trials } = trial.data;
  const [i, setI] = useState(0);
  const okN = useRef(0);
  const switchRt = useRef([]);
  const stayRt = useRef([]);
  const t0 = useRef(Date.now());

  const cur = trials[i];
  if (!cur) return null;

  const colors = Array.from(new Set(trials.map((t) => t.color)));
  const shapes = Array.from(new Set(trials.map((t) => t.shape)));
  const choices = cur.rule === 'color' ? colors : shapes;

  const pickChoice = (val) => {
    const rt = Date.now() - t0.current;
    const correct = cur.rule === 'color' ? val === cur.color : val === cur.shape;
    if (correct) okN.current += 1;
    if (cur.switched) switchRt.current.push(rt);
    else stayRt.current.push(rt);
    if (i + 1 >= trials.length) {
      const acc = okN.current / trials.length;
      const sw =
        switchRt.current.length && stayRt.current.length
          ? avg(switchRt.current) - avg(stayRt.current)
          : 0;
      finish(onComplete, started.current, {
        success: acc >= 0.7,
        accuracy: acc,
        detail: { switchCostMs: Math.round(sw) },
      });
    } else {
      t0.current = Date.now();
      setI((v) => v + 1);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-xs font-bold uppercase tracking-wide text-[#1571B0]">
        Règle : {cur.rule === 'color' ? 'couleur' : 'forme'}
      </p>
      <div className="flex justify-center">
        <GlyphMark glyph={{ shape: cur.shape, color: cur.color, count: 1, rotation: 0 }} size={64} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => pickChoice(c)}
            className="rounded-xl border bg-white py-3"
          >
            {cur.rule === 'color' ? (
              <span className="inline-block h-6 w-6 rounded-full" style={{ background: c }} />
            ) : (
              <GlyphMark glyph={{ shape: c, color: '#334155', count: 1, rotation: 0 }} size={28} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function WatchBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { timeline, isiMs, channels, targetAt } = trial.data;
  const [step, setStep] = useState(0);
  const answered = useRef(false);

  useEffect(() => {
    if (step >= timeline.length) {
      if (!answered.current) {
        finish(onComplete, started.current, { success: false, accuracy: 0 });
      }
      return undefined;
    }
    const t = setTimeout(() => setStep((s) => s + 1), isiMs);
    return () => clearTimeout(t);
  }, [step, timeline, isiMs, onComplete]);

  if (step >= timeline.length) return null;
  const row = timeline[step];
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${channels}, minmax(0,1fr))` }}>
      {row.map((ch, c) => (
        <button
          key={c}
          type="button"
          onClick={() => {
            if (answered.current) return;
            answered.current = true;
            const ok = c === targetAt.channel && step === targetAt.step;
            finish(onComplete, started.current, { success: ok, accuracy: ok ? 1 : 0 });
          }}
          className="rounded-xl border bg-white py-6 text-2xl font-semibold"
        >
          {ch}
        </button>
      ))}
    </div>
  );
}

export function PriorityBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { tasks, speed, freezeAfterMs } = trial.data;
  const [bars, setBars] = useState(tasks.map((t) => t.urgency));
  const frozen = useRef(false);

  useEffect(() => {
    const drift = setInterval(() => {
      if (frozen.current) return;
      setBars((prev) =>
        prev.map((v, i) => {
          const dir = i % 2 === 0 ? 1 : -1;
          return Math.max(5, Math.min(98, v + dir * speed * (0.8 + (i % 3))));
        })
      );
    }, 180);
    const freeze = setTimeout(() => {
      frozen.current = true;
    }, freezeAfterMs);
    return () => {
      clearInterval(drift);
      clearTimeout(freeze);
    };
  }, [speed, freezeAfterMs]);

  return (
    <div className="space-y-2">
      {trial.data.tasks.map((t, i) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            const max = Math.max(...bars);
            const ok = bars[i] === max;
            finish(onComplete, started.current, { success: ok, accuracy: ok ? 1 : 0 });
          }}
          className="w-full rounded-xl border bg-white p-3 text-left"
        >
          <div className="mb-1 flex justify-between text-sm font-semibold">
            <span>{t.label}</span>
            <span>{Math.round(bars[i])}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-[#1571B0]"
              style={{ width: `${bars[i]}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

export function CognitiveExerciseHost({ trial, reduceStimuli, onComplete }) {
  const ui = trial?.ui;
  const props = { trial, reduceStimuli, onComplete };
  if (ui === 'nback') return <NbackBoard {...props} />;
  if (ui === 'span') return <SpanBoard {...props} />;
  if (ui === 'running') return <RunningBoard {...props} />;
  if (ui === 'dual') return <DualBoard {...props} />;
  if (ui === 'delayed') return <DelayedBoard {...props} />;
  if (ui === 'matrix') return <MatrixBoard {...props} />;
  if (ui === 'rotation') return <RotationBoard {...props} />;
  if (ui === 'analogy') return <AnalogyBoard {...props} />;
  if (ui === 'series') return <SeriesBoard {...props} />;
  if (ui === 'codeSymbol') return <CodeSymbolBoard {...props} />;
  if (ui === 'barrage') return <BarrageBoard {...props} />;
  if (ui === 'stroop') return <StroopBoard {...props} />;
  if (ui === 'compare') return <CompareBoard {...props} />;
  if (ui === 'reading') return <ReadingBoard {...props} />;
  if (ui === 'mot') return <MotBoard {...props} />;
  if (ui === 'focusSwitch') return <FocusSwitchBoard {...props} />;
  if (ui === 'readingWatch') return <ReadingWatchBoard {...props} />;
  if (ui === 'watchPriority') return <WatchPriorityBoard {...props} />;
  if (ui === 'delayedSwitch') return <DelayedSwitchBoard {...props} />;
  if (ui === 'visAccom') return <VisAccomBoard {...props} />;
  if (ui === 'visPursuit') return <VisPursuitBoard {...props} />;
  if (ui === 'visSaccade') return <VisSaccadeBoard {...props} />;
  if (ui === 'visBlink') return <VisBlinkBoard {...props} />;
  if (ui === 'svgMatrix') return <SvgMatrixBoard {...props} />;
  if (ui === 'numberSequence') return <NumberSequenceBoard {...props} />;
  if (ui === 'syllogism') return <SyllogismBoard {...props} />;
  return <p className="text-sm text-slate-500">Exercice indisponible.</p>;
}
