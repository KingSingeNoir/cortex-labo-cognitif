import React, { useEffect, useRef, useState } from 'react';
import { COLOR_WORDS } from './glyphs.js';
import { GlyphMark } from './GlyphView.jsx';

function finish(onComplete, started, extra) {
  onComplete({ rtMs: Date.now() - started, ...extra });
}

export function FocusSwitchBoard({ trial, onComplete, reduceStimuli }) {
  const started = useRef(Date.now());
  const { trials, interruptEvery } = trial.data;
  const [i, setI] = useState(0);
  const [notif, setNotif] = useState(false);
  const okN = useRef(0);
  const clickedNotif = useRef(0);
  const finished = useRef(false);

  const step = (ink) => {
    if (finished.current) return;
    if (ink === trials[i].expected) okN.current += 1;
    const next = i + 1;
    if (next >= trials.length) {
      finished.current = true;
      const acc = okN.current / trials.length;
      const success = acc >= 0.7 && clickedNotif.current === 0;
      finish(onComplete, started.current, {
        success,
        accuracy: clickedNotif.current ? acc * 0.7 : acc,
      });
      return;
    }
    setNotif(!reduceStimuli && next % interruptEvery === 0);
    setI(next);
  };

  const cur = trials[i];
  if (!cur || finished.current) return null;

  return (
    <div className="relative space-y-4">
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
      <p className="text-center text-xs text-slate-500">
        Mot {i + 1} sur {trials.length}
      </p>
      <p className="text-center text-sm font-bold text-[#1571B0]">
        Règle : répondez selon {cur.rule === 'ink' ? 'la couleur de l’encre' : 'le mot écrit'}
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

export function ReadingWatchBoard({ trial, onComplete, reduceStimuli }) {
  const started = useRef(Date.now());
  const { body, q, options, intensity, watch } = trial.data;
  const [step, setStep] = useState(0);
  const [caught, setCaught] = useState(false);
  const caughtRef = useRef(false);
  const [answered, setAnswered] = useState(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!watch?.timeline || step >= watch.timeline.length) return undefined;
    const t = setTimeout(() => setStep((s) => s + 1), watch.isiMs);
    return () => clearTimeout(t);
  }, [step, watch]);

  const tryFinish = (ans, didCatch) => {
    if (finished.current) return;
    if (ans == null) return;
    finished.current = true;
    const readOk = ans === trial.expected.answer;
    const acc = (Number(readOk) + Number(didCatch)) / 2;
    finish(onComplete, started.current, {
      success: readOk && didCatch,
      accuracy: acc,
    });
  };

  const onChannel = (c) => {
    if (caughtRef.current) return;
    const ok =
      watch?.targetAt &&
      c === watch.targetAt.channel &&
      step === watch.targetAt.step;
    if (ok) {
      caughtRef.current = true;
      setCaught(true);
    }
  };

  const row =
    watch?.timeline?.[Math.min(step, (watch.timeline.length || 1) - 1)] || [];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border bg-white p-4">
        {!reduceStimuli && (
          <div
            className="pointer-events-none absolute inset-0 t3us-cog-distractor"
            style={{ opacity: 0.06 + (intensity || 1) * 0.02 }}
            aria-hidden
          />
        )}
        <p className="relative text-sm leading-relaxed text-slate-700">{body}</p>
      </div>
      <p className="text-xs text-slate-500">
        {caught
          ? 'Signal « X » attrapé. Vous pouvez maintenant répondre à la question.'
          : 'Cases à surveiller : touchez celle où un « X » apparaît.'}
      </p>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${watch?.channels || 2}, minmax(0,1fr))`,
        }}
      >
        {row.map((ch, c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChannel(c)}
            className={`rounded-xl border py-3 text-xl font-semibold ${
              caught ? 'border-emerald-400 bg-emerald-50' : 'bg-white'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>
      <p className="text-sm font-semibold">{q}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              setAnswered(o);
              tryFinish(o, caughtRef.current);
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

export function WatchPriorityBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { watch, priority } = trial.data;
  const [phase, setPhase] = useState('watch');
  const [step, setStep] = useState(0);
  const watchOk = useRef(false);
  const answered = useRef(false);

  useEffect(() => {
    if (phase !== 'watch' || !watch?.timeline) return undefined;
    if (step >= watch.timeline.length) {
      setPhase('priority');
      return undefined;
    }
    const t = setTimeout(() => setStep((s) => s + 1), watch.isiMs);
    return () => clearTimeout(t);
  }, [phase, step, watch]);

  const [bars, setBars] = useState(() =>
    (priority?.tasks || []).map((t) => t.urgency)
  );
  const frozen = useRef(false);

  useEffect(() => {
    if (phase !== 'priority') return undefined;
    const speed = priority?.speed || 2;
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
    }, priority?.freezeAfterMs || 4000);
    return () => {
      clearInterval(drift);
      clearTimeout(freeze);
    };
  }, [phase, priority]);

  if (phase === 'watch') {
    const row = watch?.timeline?.[step] || [];
    return (
      <div className="space-y-3">
      <p className="text-center text-xs font-bold uppercase tracking-wide text-[#1571B0]">
        Phase 1 sur 2 · touchez la case où un « X » apparaît
      </p>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${watch?.channels || 2}, minmax(0,1fr))`,
        }}
      >
        {row.map((ch, c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              if (answered.current) return;
              const ok =
                watch?.targetAt &&
                c === watch.targetAt.channel &&
                step === watch.targetAt.step;
              watchOk.current = Boolean(ok);
              answered.current = true;
              setPhase('priority');
            }}
            className="rounded-xl border bg-white py-6 text-2xl font-semibold"
          >
            {ch}
          </button>
        ))}
      </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-[#1571B0]">
        Phase 2 sur 2 · touchez la tâche dont la jauge est la plus haute
      </p>
      {(priority?.tasks || []).map((t, i) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            const max = Math.max(...bars);
            const priOk = bars[i] === max;
            const acc = (Number(watchOk.current) + Number(priOk)) / 2;
            finish(onComplete, started.current, {
              success: watchOk.current && priOk,
              accuracy: acc,
            });
          }}
          className="w-full rounded-xl border bg-white p-3 text-left"
        >
          <div className="mb-1 flex justify-between text-sm font-semibold">
            <span>{t.label}</span>
            <span>{Math.round(bars[i] || 0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-[#1571B0]" style={{ width: `${bars[i]}%` }} />
          </div>
        </button>
      ))}
    </div>
  );
}

export function DelayedSwitchBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { hold, fillers } = trial.data;
  const [phase, setPhase] = useState('encode');
  const [fi, setFi] = useState(0);
  const [buffer, setBuffer] = useState('');
  const t0 = useRef(Date.now());

  useEffect(() => {
    if (phase !== 'encode') return undefined;
    const t = setTimeout(() => setPhase('fill'), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'encode') {
    return (
      <div className="text-center">
        <p className="mb-2 text-xs uppercase text-slate-500">
          À retenir jusqu’à la fin de la manche
        </p>
        <div className="flex h-28 items-center justify-center rounded-2xl border bg-white text-5xl font-semibold">
          {hold}
        </div>
      </div>
    );
  }

  if (phase === 'fill' && fi < (fillers || []).length) {
    const cur = fillers[fi];
    const colors = Array.from(new Set(fillers.map((t) => t.color)));
    const shapes = Array.from(new Set(fillers.map((t) => t.shape)));
    const choices = cur.rule === 'color' ? colors : shapes;
    return (
      <div className="space-y-4">
        <p className="text-center text-xs text-slate-500">
          Tri {fi + 1} sur {fillers.length} · gardez le mot en tête
        </p>
        <p className="text-center text-sm font-bold text-[#1571B0]">
          Règle : touchez {cur.rule === 'color' ? 'la même couleur' : 'la même forme'}
        </p>
        <div className="flex justify-center">
          <GlyphMark
            glyph={{ shape: cur.shape, color: cur.color, count: 1, rotation: 0 }}
            size={64}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {choices.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                void (Date.now() - t0.current);
                if (fi + 1 >= fillers.length) setPhase('recall');
                else {
                  t0.current = Date.now();
                  setFi((x) => x + 1);
                }
              }}
              className="rounded-xl border bg-white py-3"
            >
              {cur.rule === 'color' ? (
                <span className="inline-block h-6 w-6 rounded-full" style={{ background: c }} />
              ) : (
                <GlyphMark
                  glyph={{ shape: c, color: '#334155', count: 1, rotation: 0 }}
                  size={28}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-slate-600">
        Tapez le mot mémorisé au début, tiret et lettre compris, puis validez.
      </p>
      <input
        value={buffer}
        onChange={(e) => setBuffer(e.target.value.toUpperCase())}
        className="w-full rounded-xl border px-3 py-3 text-center font-mono text-xl"
        aria-label="Mot retenu"
        autoFocus
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
