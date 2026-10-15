import React, { useEffect, useRef, useState } from 'react';

function finish(onComplete, started, extra) {
  onComplete({ rtMs: Date.now() - started, ...extra });
}

export function VisAccomBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { letter, options, farMs, nearMs } = trial.data;
  const [phase, setPhase] = useState('near');
  const [left, setLeft] = useState(farMs);
  const finished = useRef(false);

  useEffect(() => {
    if (phase !== 'near') return undefined;
    const t = setTimeout(() => setPhase('far'), nearMs);
    return () => clearTimeout(t);
  }, [phase, nearMs]);

  useEffect(() => {
    if (phase !== 'far') return undefined;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const r = Math.max(0, farMs - (Date.now() - t0));
      setLeft(r);
      if (r <= 0) {
        clearInterval(iv);
        setPhase('ask');
      }
    }, 200);
    return () => clearInterval(iv);
  }, [phase, farMs]);

  if (phase === 'near') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Fixez cette lettre et retenez-la
        </p>
        <p className="t3us-vis-near text-7xl font-black text-slate-900">{letter}</p>
      </div>
    );
  }

  if (phase === 'far') {
    const sec = Math.ceil(left / 1000);
    return (
      <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50 p-6 text-center">
        <p className="text-sm font-semibold text-sky-950">
          Levez les yeux de l’écran
        </p>
        <p className="text-sm leading-relaxed text-sky-900">
          Regardez un point réel éloigné, idéalement à six mètres ou plus (une
          fenêtre, le fond de la pièce), pendant encore{' '}
          <span className="font-mono text-lg">{sec} s</span>.
        </p>
        <p className="text-[11px] text-sky-800/80">
          Règle des 20-20-20 : toutes les 20 minutes d’écran, regardez à environ
          6 mètres (20 pieds) pendant 20 secondes.
        </p>
        <button
          type="button"
          disabled={left > farMs - 8000}
          onClick={() => setPhase('ask')}
          className="text-xs text-sky-700 underline disabled:opacity-40"
        >
          {left > farMs - 8000 ? 'Gardez le regard au loin…' : 'Je reviens à l’écran'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-slate-600">
        Quelle lettre avez-vous fixée avant de regarder au loin ?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              if (finished.current) return;
              finished.current = true;
              const ok = o === trial.expected.letter;
              finish(onComplete, started.current, {
                success: ok,
                accuracy: ok ? 1 : 0,
              });
            }}
            className="rounded-xl border bg-white py-4 text-2xl font-semibold"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function VisPursuitBoard({ trial, onComplete, reduceStimuli }) {
  const started = useRef(Date.now());
  const { durationMs, probes, speed } = trial.data;
  const path = trial.data.path || { fx: 1, fy: 2, px: 0, py: 0 };
  const box = { w: 280, h: 170 };
  const [pos, setPos] = useState({ x: box.w / 2, y: box.h / 2 });
  const [hot, setHot] = useState(false);
  const hits = useRef(0);
  const probeI = useRef(0);
  const hotRef = useRef(false);
  const finished = useRef(false);

  useEffect(() => {
    const t0 = Date.now();
    let raf;
    const loop = () => {
      const t = (Date.now() - t0) / 1000;
      const sp = reduceStimuli ? speed * 0.7 : speed;
      setPos({
        x: box.w / 2 + (box.w / 2 - 18) * Math.sin(t * sp * path.fx + path.px),
        y: box.h / 2 + (box.h / 2 - 18) * Math.sin(t * sp * path.fy + path.py),
      });
      const elapsed = Date.now() - t0;
      const p = probes[probeI.current];
      if (p && elapsed >= p.atMs && elapsed < p.atMs + p.windowMs) {
        if (!hotRef.current) {
          hotRef.current = true;
          setHot(true);
        }
      } else if (p && elapsed >= p.atMs + p.windowMs) {
        if (hotRef.current) {
          hotRef.current = false;
          setHot(false);
        }
        probeI.current += 1;
      }
      if (elapsed >= durationMs) {
        if (!finished.current) {
          finished.current = true;
          const total = probes.length;
          const acc = total ? hits.current / total : 0;
          finish(onComplete, started.current, {
            success: acc >= 0.6,
            accuracy: acc,
          });
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, probes, speed, reduceStimuli, box.w, box.h]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          if (!hotRef.current) return;
          hits.current += 1;
          hotRef.current = false;
          setHot(false);
          probeI.current += 1;
        }}
        className="relative mx-auto block overflow-hidden rounded-2xl border bg-slate-900"
        style={{ width: box.w, height: box.h }}
        aria-label="Zone de poursuite oculaire"
      >
        <span
          className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: pos.x,
            top: pos.y,
            background: hot ? '#f59e0b' : '#22d3ee',
            boxShadow: hot ? '0 0 16px #f59e0b' : '0 0 10px #22d3ee',
          }}
        />
      </button>
      <p className="text-center text-xs text-slate-500">
        Suivez le point des yeux. Touchez la zone dès qu’il devient orange.
      </p>
    </div>
  );
}

export function VisSaccadeBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { trials, isiMs } = trial.data;
  const [i, setI] = useState(0);
  const okN = useRef(0);
  const finished = useRef(false);
  const corners = [
    'left-3 top-3',
    'right-3 top-3',
    'left-3 bottom-3',
    'right-3 bottom-3',
  ];

  const cur = trials[i];

  const pickLetter = (letter) => {
    if (finished.current || !cur) return;
    if (letter === cur.letter) okN.current += 1;
    if (i + 1 >= trials.length) {
      finished.current = true;
      const acc = okN.current / trials.length;
      finish(onComplete, started.current, { success: acc >= 0.7, accuracy: acc });
    } else setI((v) => v + 1);
  };

  useEffect(() => {
    if (!cur || finished.current) return undefined;
    const t = setTimeout(() => pickLetter(''), isiMs + 200);
    return () => clearTimeout(t);
  }, [i, isiMs]);

  if (!cur || finished.current) return null;

  return (
    <div className="space-y-2">
    <p className="text-center text-xs text-slate-500">
      Lettre {i + 1} sur {trials.length}
    </p>
    <div
      className="relative mx-auto rounded-2xl border bg-slate-50"
      style={{ width: 280, height: 220 }}
    >
      <button
        type="button"
        onClick={() => pickLetter(cur.letter)}
        className={`absolute h-12 w-12 rounded-xl bg-white text-xl font-black shadow ${corners[cur.pos]}`}
        style={{ animation: `t3us-vis-pop ${Math.min(isiMs, 900)}ms ease` }}
      >
        {cur.letter}
      </button>
    </div>
    </div>
  );
}

export function VisBlinkBoard({ trial, onComplete }) {
  const started = useRef(Date.now());
  const { blinks, palmMs, letter } = trial.data;
  const [phase, setPhase] = useState('blink');
  const [n, setN] = useState(0);
  const [left, setLeft] = useState(palmMs);
  const finished = useRef(false);

  useEffect(() => {
    if (phase !== 'palm') return undefined;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const r = Math.max(0, palmMs - (Date.now() - t0));
      setLeft(r);
      if (r <= 0) {
        clearInterval(iv);
        setPhase('ask');
      }
    }, 200);
    return () => clearInterval(iv);
  }, [phase, palmMs]);

  if (phase === 'blink') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-slate-600">
          Clignez <strong>lentement et complètement</strong>, en gardant les
          paupières fermées un court instant. Touchez le bouton après chaque
          clignement.
        </p>
        <p className="text-4xl font-semibold">
          {n} / {blinks}
        </p>
        <button
          type="button"
          onClick={() => {
            const next = n + 1;
            setN(next);
            if (next >= blinks) setPhase('palm');
          }}
          className="w-full rounded-xl bg-[#1571B0] py-4 text-sm font-semibold text-white"
        >
          Clignement fait
        </button>
      </div>
    );
  }

  if (phase === 'palm') {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-900 p-6 text-center text-slate-100">
        <p className="text-sm font-semibold">Repos sous les paumes (palming)</p>
        <p className="text-sm leading-relaxed text-slate-300">
          Fermez les yeux et couvrez-les avec vos paumes, sans appuyer dessus.
          Respirez calmement. Encore {Math.ceil(left / 1000)} s.
        </p>
        <div className="t3us-cog-breath mx-auto h-16 w-16 rounded-full bg-white/10" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-slate-600">
        Rouvrez doucement les yeux et fixez ces lettres jusqu’à les voir
        parfaitement nettes.
      </p>
      <p className="text-center text-5xl font-black">{letter}</p>
      <p className="text-center text-[11px] text-slate-400">
        Cette refocalisation termine l’exercice de détente.
      </p>
      <button
        type="button"
        onClick={() => {
          if (finished.current) return;
          finished.current = true;
          finish(onComplete, started.current, { success: true, accuracy: 1 });
        }}
        className="w-full rounded-xl bg-[#1571B0] py-3 text-sm font-semibold text-white"
      >
        Je les vois nettes
      </button>
    </div>
  );
}
