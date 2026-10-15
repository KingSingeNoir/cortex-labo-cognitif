import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  Clock3,
  Info,
  ListOrdered,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  COGNITIVE_DOMAINS,
  ROUNDS_PER_GAME_OPTIONS,
  SESSION_MAX_MINUTES,
  getCognitiveDomain,
  getCognitiveExercise,
} from './catalog.js';
import { generateExercise } from './generate.js';
import { applyStaircase, xpForTrial } from './staircase.js';
import { newSessionSeed } from './rng.js';
import {
  eloToIndex,
  loadCognitiveStore,
  recordCognitiveSession,
  recordCognitiveTrial,
  saveCognitiveStore,
  setCognitivePrefs,
  touchCognitiveVisit,
} from './persist.js';
import { CognitiveExerciseHost } from './CognitiveExerciseHost.jsx';
import { HERO_PHOTOS, heroSlotAt } from './heroPhotos.js';
import { coverOf } from './gameCovers.js';
import { ProgressView } from './ProgressView.jsx';
import './cognitive.css';

const EnigmesView = lazy(() => import('./enigmes/EnigmesView.jsx'));

const ACCENT_BTN = 'cx-btn cx-btn-accent';
const GHOST_BTN = 'cx-btn cx-btn-ghost';

const HUB_TABS = Object.freeze([
  { id: 'enigmes', title: 'Test psycho' },
  { id: 'log', title: 'Logique' },
  { id: 'imt', title: 'Mémoire' },
  { id: 'irp', title: 'Raisonnement' },
  { id: 'ivt', title: 'Vitesse' },
  { id: 'att', title: 'Concentration' },
  { id: 'vis', title: 'Yeux' },
]);

function plural(n, one, many) {
  return `${n} ${n > 1 ? many : one}`;
}

function pct(v) {
  return v == null ? '—' : `${Math.round(v * 100)} %`;
}

function formatMmSs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function average(rows, key) {
  if (!rows.length) return null;
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0) / rows.length;
}

function BackButton({ onClick, children = 'Retour', className = 'cx-back' }) {
  return (
    <button type="button" className={className} onClick={onClick}>
      <ArrowLeft size={16} />
      {children}
    </button>
  );
}

export function CognitiveView() {
  const [store, setStore] = useState(() => loadCognitiveStore());
  const [screen, setScreen] = useState('hub');
  const [showSessionChoice, setShowSessionChoice] = useState(true);
  const [hubTab, setHubTab] = useState('enigmes');
  const [plan, setPlanState] = useState(() => store.prefs.plan);
  const [roundsPerGame, setRoundsState] = useState(() => store.prefs.roundsPerGame);
  const [running, setRunning] = useState(null);
  const [recap, setRecap] = useState(null);
  const [sessionGameId, setSessionGameId] = useState(null);
  const [enigmeOpen, setEnigmeOpen] = useState(false);
  const [enigmeBack, setEnigmeBack] = useState(0);
  const sessionLeaveRef = useRef(null);

  const persist = useCallback((next) => {
    setStore(next);
    saveCognitiveStore(next);
  }, []);

  useEffect(() => {
    persist(touchCognitiveVisit());
  }, [persist]);

  const setPlan = (next) => {
    setPlanState(next);
    setStore(setCognitivePrefs({ plan: next }));
  };

  const setRounds = (n) => {
    setRoundsState(n);
    setStore(setCognitivePrefs({ roundsPerGame: n }));
  };

  const goHub = () => {
    setRunning(null);
    setRecap(null);
    setSessionGameId(null);
    setShowSessionChoice(true);
    setScreen('hub');
    window.scrollTo({ top: 0 });
  };

  const goBack = () => {
    if (enigmeOpen) {
      setEnigmeBack((n) => n + 1);
      return;
    }
    if (screen === 'session' && sessionLeaveRef.current) {
      sessionLeaveRef.current();
      return;
    }
    goHub();
  };

  const start = (games) => {
    if (!games.length) return;
    setSessionGameId(games[0]);
    setRunning({ key: newSessionSeed(), plan: games, roundsPerGame });
    setScreen('session');
    window.scrollTo({ top: 0 });
  };

  const canGoBack = screen !== 'hub' || enigmeOpen;

  const goProgress = () => {
    setScreen('progress');
    window.scrollTo({ top: 0 });
  };

  const onEnd = useCallback(
    (record) => {
      persist(recordCognitiveSession(loadCognitiveStore(), record));
      setRecap(record);
      setSessionGameId(null);
      setScreen('recap');
      window.scrollTo({ top: 0 });
    },
    [persist]
  );

  const trials = Object.values(store.exercises || {}).flatMap((e) => e.trials || []);
  const acc = trials.length
    ? `${Math.round((trials.filter((t) => t.success).length / trials.length) * 100)}%`
    : '0%';

  return (
    <div className="cortex-app t3us-cognitive-view relative" data-t3us-cognitive="1">
      <header className="cx-header">
        <div className="cx-header-left">
          {canGoBack && (
            <BackButton className="cx-header-back" onClick={goBack} />
          )}
          <div className="cx-brand">
            CORTEX <span>// LABO COGNITIF</span>
          </div>
        </div>
        <div className="cx-metrics">
          <div className="cx-pill">
            Elo : <span>{Math.round(store.elo?.global ?? 1000)}</span>
          </div>
          <div className="cx-pill">
            Indice : <span>{eloToIndex(store.elo?.global ?? 1000)}</span>
          </div>
          <div className="cx-pill">
            Précision : <span>{acc}</span>
          </div>
          {screen !== 'progress' && screen !== 'session' && (
            <button type="button" className="cx-pill cx-pill-btn" onClick={goProgress}>
              Suivi
            </button>
          )}
        </div>
      </header>
      <div className="t3us-cog-inner relative mx-auto w-full max-w-[1100px] px-4 sm:px-6">
        {screen === 'hub' && !enigmeOpen && <HourlyHero />}
        {(screen === 'session' || enigmeOpen) && (
          <CortexBanner
            src={coverOf(enigmeOpen ? 'enigmes' : sessionGameId)}
            alt="Photo du jeu en cours"
          />
        )}
        {screen === 'compose' && (
          <SessionCompose
            plan={plan}
            setPlan={setPlan}
            roundsPerGame={roundsPerGame}
            setRounds={setRounds}
            onStart={start}
            onBack={goHub}
          />
        )}
        {screen === 'hub' && (
          <>
            <ArrivalScreen
              visible={showSessionChoice}
              onCompose={() => {
                setPlan([]);
                setScreen('compose');
                window.scrollTo({ top: 0 });
              }}
              onHide={() => setShowSessionChoice(false)}
              onShow={() => setShowSessionChoice(true)}
            />
            <CognitiveHub
              initialTab={hubTab}
              onTab={setHubTab}
              onStart={start}
              onEnigmeOpen={setEnigmeOpen}
              enigmeBack={enigmeBack}
            />
          </>
        )}
        {screen === 'session' && running && (
          <CognitiveSession
            key={running.key}
            plan={running.plan}
            roundsPerGame={running.roundsPerGame}
            store={store}
            persist={persist}
            onGame={setSessionGameId}
            onEnd={onEnd}
            onLeave={goHub}
            onBindLeave={(fn) => {
              sessionLeaveRef.current = fn;
            }}
          />
        )}
        {screen === 'recap' && recap && (
          <CognitiveRecap
            recap={recap}
            store={store}
            onReplay={() => start(recap.plan)}
            onBack={goHub}
            onProgress={goProgress}
            onCompose={() => {
              setPlan([]);
              setScreen('compose');
              window.scrollTo({ top: 0 });
            }}
          />
        )}
        {screen === 'progress' && (
          <ProgressView store={store} onBack={goHub} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accueil : composition libre de la séance                            */
/* ------------------------------------------------------------------ */

function CortexBanner({ src, alt }) {
  if (!src) return null;
  return (
    <figure className="cx-hero">
      <div className="cx-hero-frame">
        <img src={src} alt={alt} />
      </div>
    </figure>
  );
}

function HourlyHero() {
  const [slot, setSlot] = useState(() => heroSlotAt());
  useEffect(() => {
    const tick = () => setSlot(heroSlotAt());
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <CortexBanner
      src={HERO_PHOTOS[slot]}
      alt="Photo libre : logique, intelligence ou concentration"
    />
  );
}

function ArrivalScreen({ visible, onCompose, onHide, onShow }) {
  if (!visible) {
    return (
      <div className="cx-arrive cx-arrive-slim">
        <button type="button" className="cx-skip" onClick={onShow}>
          Afficher
        </button>
      </div>
    );
  }
  return (
    <section className="cx-arrive">
      <p className="cx-arrive-kicker">Séance</p>
      <h1>Constituer une séance ?</h1>
      <p className="cx-arrive-lead">
        Choisissez les jeux à enchaîner, ou masquez ce choix pour n’avoir que les
        onglets, plus bas.
      </p>
      <div className="cx-arrive-actions">
        <button type="button" className={ACCENT_BTN} onClick={onCompose}>
          <ListOrdered size={16} />
          Constituer ma séance
        </button>
        <button type="button" className="cx-skip" onClick={onHide}>
          Masquer
        </button>
      </div>
    </section>
  );
}

function SessionCompose({ plan, setPlan, roundsPerGame, setRounds, onStart, onBack }) {
  const toggle = (id) =>
    setPlan(plan.includes(id) ? plan.filter((x) => x !== id) : [...plan, id]);

  return (
    <section className="cx-compose">
      <BackButton onClick={onBack} />
      <p className="cx-arrive-kicker">Nouvelle séance</p>
      <h1 className="cx-compose-title">Quels jeux voulez-vous enchaîner ?</h1>
      <p className="cx-arrive-lead">
        Touchez un nom pour l’ajouter. L’ordre des tapotements sera l’ordre de la
        séance. Quand la liste vous convient, commencez.
      </p>

      {COGNITIVE_DOMAINS.map((domain) => (
        <div key={domain.id} className="cx-compose-group">
          <p className="cx-compose-domain">{domain.title}</p>
          <div className="cx-compose-list">
            {domain.exercises.map((ex) => {
              const on = plan.includes(ex.id);
              const n = plan.indexOf(ex.id) + 1;
              return (
                <button
                  key={ex.id}
                  type="button"
                  className={`cx-pick ${on ? 'on' : ''}`}
                  onClick={() => toggle(ex.id)}
                  aria-pressed={on}
                >
                  <span className={`cx-pick-mark ${on ? 'on' : ''}`}>{on ? n : ''}</span>
                  <span className="min-w-0 flex-1">
                    <span className="cx-pick-name">{ex.title}</span>
                    <span className="cx-pick-blurb">{ex.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="cx-compose-foot">
        <p className="mb-2 text-xs text-[var(--text-muted)]">
          {plan.length
            ? `${plural(plan.length, 'jeu choisi', 'jeux choisis')} · ${roundsPerGame} manches chacun`
            : 'Aucun jeu choisi pour l’instant'}
        </p>
        <div className="mb-3 flex gap-2">
          {ROUNDS_PER_GAME_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRounds(n)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                roundsPerGame === n
                  ? 'bg-[var(--accent)] text-[#0b0f17]'
                  : 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
              }`}
            >
              {n} manches
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${ACCENT_BTN} w-full`}
          disabled={!plan.length}
          onClick={() => onStart(plan)}
        >
          <Play size={16} />
          Commencer
        </button>
      </div>
    </section>
  );
}

function CognitiveHub({ initialTab = 'enigmes', onTab, onStart, onEnigmeOpen, enigmeBack }) {
  const [active, setActive] = useState(initialTab);
  useEffect(() => {
    setActive(initialTab);
  }, [initialTab]);

  const selectTab = (id) => {
    setActive(id);
    onTab?.(id);
  };

  const domain = COGNITIVE_DOMAINS.find((d) => d.id === active);

  return (
    <>
      <nav id="onglets-jeux" className="cx-nav-scroll" aria-label="Jeux">
        {HUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`cx-nav-btn ${active === tab.id ? 'active' : ''}`}
            onClick={() => selectTab(tab.id)}
          >
            {tab.title}
          </button>
        ))}
      </nav>

      {active === 'enigmes' ? (
        <Suspense fallback={<p className="py-10 text-center text-sm text-[var(--text-muted)]">Chargement…</p>}>
          <EnigmesView
            embedded
            onExit={() => selectTab('log')}
            onPlaying={onEnigmeOpen}
            backSignal={enigmeBack}
          />
        </Suspense>
      ) : (
        <ul className="cx-plays">
          {domain.exercises.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                className="cx-play"
                style={coverOf(ex.id) ? { '--play-img': `url("${coverOf(ex.id)}")` } : undefined}
                onClick={() => onStart([ex.id])}
              >
                <span className="cx-play-text">
                  <span className="cx-play-name">{ex.title}</span>
                  <em className="cx-play-hint">{ex.blurb}</em>
                </span>
                <Play size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Séance : présentation → manche → résultat, jeu après jeu            */
/* ------------------------------------------------------------------ */

function CognitiveSession({ plan, roundsPerGame, store, persist, onGame, onEnd, onLeave, onBindLeave }) {
  const seed = useRef(newSessionSeed());
  const startedAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const [gameIndex, setGameIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState('intro');
  const phaseRef = useRef('intro');
  const [trial, setTrial] = useState(null);
  const [rows, setRows] = useState([]);
  const [last, setLast] = useState(null);
  const ended = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const go = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const exId = plan[gameIndex];
  useEffect(() => {
    onGame?.(exId);
  }, [exId, onGame]);
  const meta = getCognitiveExercise(exId);
  const domain = getCognitiveDomain(meta.domainId);
  const elapsed = now - startedAt.current;
  const timeUp = elapsed >= SESSION_MAX_MINUTES * 60 * 1000;
  const isLastRound = round + 1 >= roundsPerGame;
  const isLastGame = gameIndex + 1 >= plan.length;
  const nextMeta = isLastGame ? null : getCognitiveExercise(plan[gameIndex + 1]);
  const gameRows = rows.filter((r) => r.gameIndex === gameIndex);

  const makeRecord = (reason, finalRows = rows) => {
    const endedAt = Date.now();
    const games = plan
      .map((id, gi) => {
        const rs = finalRows.filter((r) => r.gameIndex === gi);
        if (!rs.length) return null;
        return {
          exerciseId: id,
          rounds: rs.length,
          successes: rs.filter((r) => r.success).length,
          accuracy: average(rs, 'accuracy'),
          levelFrom: rs[0].levelBefore,
          levelTo: rs[rs.length - 1].difficulty,
        };
      })
      .filter(Boolean);
    return {
      id: `cog-${seed.current}`,
      startedAt: startedAt.current,
      endedAt,
      day: new Date(startedAt.current).toISOString().slice(0, 10),
      plan,
      domains: [...new Set(plan.map((id) => getCognitiveExercise(id).domainId))],
      seed: seed.current,
      reason,
      trialCount: finalRows.length,
      accuracy: average(finalRows, 'accuracy') ?? 0,
      xp: finalRows.reduce((a, r) => a + (r.xp || 0), 0),
      games,
    };
  };

  const finish = (reason, finalRows = rows) => {
    if (ended.current) return;
    ended.current = true;
    onEnd(makeRecord(reason, finalRows));
  };

  const leave = () => {
    if (rows.length && !ended.current) {
      ended.current = true;
      persist(recordCognitiveSession(loadCognitiveStore(), makeRecord('manual')));
    }
    onLeave();
  };

  useEffect(() => {
    onBindLeave?.(leave);
    return () => onBindLeave?.(null);
  });

  const playRound = () => {
    const difficulty = loadCognitiveStore().exercises?.[exId]?.difficulty ?? 3;
    const trialSeed = (seed.current + (gameIndex * 31 + round + 1) * 9973) >>> 0;
    setTrial(generateExercise(exId, { difficulty, seed: trialSeed }));
    go('play');
  };

  const onComplete = (result) => {
    if (phaseRef.current !== 'play' || !trial) return;
    const prev = loadCognitiveStore().exercises[exId] || {
      difficulty: trial.difficulty,
      streakUp: 0,
    };
    const stair = applyStaircase(prev, result.success);
    const row = {
      at: Date.now(),
      exerciseId: exId,
      gameIndex,
      round,
      success: Boolean(result.success),
      accuracy: Number(result.accuracy) || 0,
      rtMs: result.rtMs,
      levelBefore: trial.difficulty,
      difficulty: stair.difficulty,
      streakUp: stair.streakUp,
      xp: xpForTrial(result.success, trial.difficulty),
      seed: trial.seed,
      detail: result.detail || null,
    };
    persist(recordCognitiveTrial(loadCognitiveStore(), exId, row));
    setRows((rs) => [...rs, row]);
    setLast(row);
    setTrial(null);
    go('feedback');
  };

  const nextGame = () => {
    if (isLastGame || timeUp) {
      finish(timeUp ? 'time' : 'done');
      return;
    }
    setGameIndex((g) => g + 1);
    setRound(0);
    setLast(null);
    go('intro');
    window.scrollTo({ top: 0 });
  };

  const nextRound = () => {
    setRound((r) => r + 1);
    const difficulty = loadCognitiveStore().exercises?.[exId]?.difficulty ?? 3;
    const trialSeed = (seed.current + (gameIndex * 31 + round + 2) * 9973) >>> 0;
    setTrial(generateExercise(exId, { difficulty, seed: trialSeed }));
    go('play');
  };

  const currentLevel = store.exercises?.[exId]?.difficulty ?? 3;

  return (
    <div className="mt-2 space-y-5">
      <SessionProgress
        plan={plan}
        gameIndex={gameIndex}
        rows={rows}
        elapsed={elapsed}
        onBack={leave}
      />

      {phase === 'intro' && (
        <GameIntro
          meta={meta}
          domain={domain}
          gameIndex={gameIndex}
          total={plan.length}
          roundsPerGame={roundsPerGame}
          round={round}
          level={currentLevel}
          onStart={playRound}
          onSkip={nextGame}
          onBack={leave}
          isLastGame={isLastGame}
        />
      )}

      {phase === 'play' && trial && (
        <section className="cx-workspace">
          <div className="cx-module-head">
            <h2 className="cx-module-title">{meta.title}</h2>
            <span className="cx-timer">
              {round + 1}/{roundsPerGame} · N{trial.difficulty}
            </span>
          </div>
          <div className="cx-prompt mb-5 flex gap-3">
            <Info size={18} className="mt-0.5 shrink-0 text-[#1571B0]" />
            <div>
              <p className="mb-0.5 text-[11px] font-black uppercase tracking-wider text-[#1571B0]">
                Consigne
              </p>
              <p className="text-sm leading-relaxed text-slate-700">{trial.prompt}</p>
            </div>
          </div>
          <CognitiveExerciseHost
            key={`${gameIndex}-${round}-${trial.seed}`}
            trial={trial}
            reduceStimuli={store.reduceStimuli}
            onComplete={onComplete}
          />
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <BackButton
              onClick={() => {
                setTrial(null);
                go('intro');
              }}
            >
              Retour aux explications
            </BackButton>
            <button type="button" className="cx-back" onClick={leave}>
              Quitter le jeu
            </button>
          </div>
        </section>
      )}

      {phase === 'feedback' && last && (
        <RoundFeedback
          meta={meta}
          last={last}
          round={round}
          roundsPerGame={roundsPerGame}
          gameRows={gameRows}
          isLastRound={isLastRound}
          nextMeta={nextMeta}
          timeUp={timeUp}
          onNextRound={nextRound}
          onNextGame={nextGame}
          onFinish={() => finish(timeUp ? 'time' : 'done')}
          onBack={leave}
        />
      )}
    </div>
  );
}

function SessionProgress({ plan, gameIndex, rows, elapsed, onBack }) {
  return (
    <div className="cx-workspace !min-h-0 px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <BackButton onClick={onBack} />
        <div className="flex items-center gap-4">
          <p className="text-sm font-semibold text-slate-800">
            Jeu {gameIndex + 1} sur {plan.length}
          </p>
          <span className="inline-flex items-center gap-1.5 font-mono text-sm text-slate-500">
            <Clock3 size={14} />
            {formatMmSs(elapsed)}
          </span>
        </div>
      </div>
      <ol className="flex flex-wrap gap-1.5">
        {plan.map((id, i) => {
          const ex = getCognitiveExercise(id);
          const done = i < gameIndex;
          const current = i === gameIndex;
          const played = rows.some((r) => r.gameIndex === i);
          return (
            <li
              key={`${id}-${i}`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                current
                  ? 'bg-[#1571B0] text-white'
                  : done
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
              aria-current={current ? 'step' : undefined}
            >
              {done && (played ? <Check size={11} /> : <ArrowRight size={11} />)}
              {i + 1}. {ex.title}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function GameIntro({
  meta,
  domain,
  gameIndex,
  total,
  roundsPerGame,
  round,
  level,
  onStart,
  onSkip,
  onBack,
  isLastGame,
}) {
  return (
    <section className="cx-workspace animate-fade-in-up">
      <p className="mb-2 text-xs font-medium text-[#1571B0]">
        {total === 1
          ? domain.title
          : `${gameIndex === 0 ? 'Premier jeu' : `Jeu ${gameIndex + 1} sur ${total}`} · ${domain.title}`}
      </p>
      <h2 className="mb-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {meta.title}
      </h2>
      <p className="mb-6 max-w-2xl text-base leading-relaxed text-slate-600">{meta.goal}</p>

      <h3 className="mb-2 text-sm font-semibold text-slate-900">Comment jouer</h3>
      <ol className="mb-6 space-y-2">
        {meta.howTo.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1571B0]/10 text-xs font-bold text-[#1571B0]">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-500">
            Pour réussir une manche
          </p>
          <p className="text-sm leading-relaxed text-slate-700">{meta.scoring}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-500">
            Déroulement
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            {plural(roundsPerGame, 'manche', 'manches')}, niveau actuel {level} sur 10. Deux
            réussites d’affilée font monter le niveau d’un cran ; un échec le fait baisser
            d’un cran.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onStart} className={ACCENT_BTN}>
          <Play size={16} />
          {round === 0 ? 'Commencer la première manche' : `Reprendre à la manche ${round + 1}`}
        </button>
        <button type="button" onClick={onBack} className={GHOST_BTN}>
          <ArrowLeft size={16} />
          Retour
        </button>
        {total > 1 && (
          <button type="button" onClick={onSkip} className={GHOST_BTN}>
            {isLastGame ? 'Passer ce jeu et terminer' : 'Passer ce jeu'}
          </button>
        )}
      </div>
    </section>
  );
}

function levelSentence(last) {
  if (last.difficulty > last.levelBefore) {
    return `Deux réussites d’affilée : le niveau passe de ${last.levelBefore} à ${last.difficulty}.`;
  }
  if (last.difficulty < last.levelBefore) {
    return `Le niveau baisse d’un cran, de ${last.levelBefore} à ${last.difficulty}, pour rester à votre portée.`;
  }
  if (last.success && last.streakUp > 0) {
    return `Niveau ${last.difficulty} : encore une réussite et il montera d’un cran.`;
  }
  return `Vous restez au niveau ${last.difficulty}.`;
}

function RoundFeedback({
  meta,
  last,
  round,
  roundsPerGame,
  gameRows,
  isLastRound,
  nextMeta,
  timeUp,
  onNextRound,
  onNextGame,
  onFinish,
  onBack,
}) {
  const ok = last.success;
  const showGameSummary = isLastRound || timeUp;
  const successes = gameRows.filter((r) => r.success).length;

  let primary;
  if (timeUp || (isLastRound && !nextMeta)) {
    primary = (
      <button type="button" onClick={onFinish} className={ACCENT_BTN}>
        Voir le bilan de la séance
        <ArrowRight size={16} />
      </button>
    );
  } else if (!isLastRound) {
    primary = (
      <button type="button" onClick={onNextRound} className={ACCENT_BTN} autoFocus>
        Manche suivante ({round + 2} sur {roundsPerGame})
        <ArrowRight size={16} />
      </button>
    );
  } else {
    primary = (
      <button type="button" onClick={onNextGame} className={ACCENT_BTN} autoFocus>
        Passer au jeu suivant : « {nextMeta.title} »
        <ArrowRight size={16} />
      </button>
    );
  }

  return (
    <section className="cx-workspace animate-fade-in-up">
      <p className="mb-2 text-xs font-medium text-slate-500">
        {meta.title} · manche {round + 1} sur {roundsPerGame}
      </p>
      <div
        className={`mb-5 flex items-center gap-3 rounded-2xl p-4 ${
          ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
        }`}
      >
        {ok ? <CircleCheck size={26} /> : <CircleAlert size={26} />}
        <div>
          <p className="text-lg font-semibold">{ok ? 'Manche réussie' : 'Manche non réussie'}</p>
          <p className="text-sm opacity-90">
            Justesse : {pct(last.accuracy)}
            {last.rtMs ? ` · durée : ${Math.round(last.rtMs / 1000)} s` : ''}
          </p>
        </div>
      </div>
      <p className="mb-6 text-sm leading-relaxed text-slate-600">{levelSentence(last)}</p>
      {last.detail?.explanation ? (
        <div className="mb-6 rounded-2xl bg-sky-50 p-4">
          <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-[#1571B0]">
            Explication de cette manche
          </p>
          <p className="text-sm leading-relaxed text-slate-700">{last.detail.explanation}</p>
        </div>
      ) : null}

      {showGameSummary && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-500">
            Bilan de « {meta.title} »
          </p>
          <p className="text-sm text-slate-700">
            {plural(successes, 'manche réussie', 'manches réussies')} sur {gameRows.length} ·
            justesse moyenne : {pct(average(gameRows, 'accuracy'))}
          </p>
        </div>
      )}

      {timeUp && (
        <p className="mb-6 rounded-2xl bg-sky-50 p-4 text-sm leading-relaxed text-sky-900">
          Vous avez atteint {SESSION_MAX_MINUTES} minutes d’entraînement : la séance s’arrête
          ici pour préserver votre attention. Vous pourrez reprendre plus tard.
        </p>
      )}

      {!timeUp && isLastRound && nextMeta && (
        <p className="mb-4 text-sm text-slate-500">
          Ce jeu est terminé. Le jeu suivant vous sera d’abord présenté, puis vous lancerez
          sa première manche quand vous serez prêt.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {primary}
        <button type="button" onClick={onBack} className={GHOST_BTN}>
          <ArrowLeft size={16} />
          Retour
        </button>
        {!timeUp && !isLastRound && (
          <button type="button" onClick={nextMeta ? onNextGame : onFinish} className={GHOST_BTN}>
            {nextMeta ? 'Arrêter ce jeu et passer au suivant' : 'Arrêter ce jeu et voir le bilan'}
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Bilan                                                               */
/* ------------------------------------------------------------------ */

const END_REASONS = {
  done: 'Vous avez joué tous les jeux prévus.',
  manual: 'Vous avez arrêté la séance avant la fin.',
  time: `La séance a atteint la limite de ${SESSION_MAX_MINUTES} minutes.`,
};

function CognitiveRecap({ recap, onReplay, onBack, onCompose, onProgress, store }) {
  const minutes = Math.max(1, Math.round((recap.endedAt - recap.startedAt) / 60000));
  const successes = (recap.games || []).reduce((a, g) => a + g.successes, 0);
  const elo = store?.elo?.global ?? 1000;
  return (
    <section className="mt-2 animate-fade-in-up rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <BackButton onClick={onBack} />
      <p className="mb-2 text-xs font-medium text-[#1571B0]">Fin de la séance</p>
      <h2 className="mb-2 text-2xl font-semibold text-slate-900">Votre bilan</h2>
      <p className="mb-6 text-sm text-slate-500">{END_REASONS[recap.reason] || ''}</p>

      {recap.trialCount === 0 ? (
        <p className="mb-8 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Aucune manche n’a été jouée : il n’y a rien à comptabiliser cette fois-ci.
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ['Manches jouées', recap.trialCount],
              ['Manches réussies', successes],
              ['Justesse moyenne', pct(recap.accuracy)],
              ['Cote interne', Math.round(elo)],
              ['Durée', `${minutes} min`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] text-slate-500">{label}</p>
                <p className="text-xl font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Jeu</th>
                  <th className="py-2 pr-3 font-semibold">Réussites</th>
                  <th className="py-2 pr-3 font-semibold">Justesse</th>
                  <th className="py-2 font-semibold">Niveau</th>
                </tr>
              </thead>
              <tbody>
                {recap.games.map((g) => (
                  <tr key={g.exerciseId} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      {getCognitiveExercise(g.exerciseId)?.title}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {g.successes} sur {g.rounds}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{pct(g.accuracy)}</td>
                    <td className="py-2 text-slate-600">
                      {g.levelFrom === g.levelTo
                        ? `${g.levelTo} (stable)`
                        : `${g.levelFrom} → ${g.levelTo}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mb-8 text-xs leading-relaxed text-slate-500">
            Points d’expérience gagnés : {recap.xp}. Ils dépendent uniquement de vos réussites
            et du niveau atteint, jamais du hasard. Aucune pénalité si vous faites une pause de
            quelques jours.
          </p>
        </>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onReplay} className={ACCENT_BTN}>
          <RotateCcw size={16} />
          Rejouer la même séance
        </button>
        <button type="button" onClick={onProgress} className={GHOST_BTN}>
          Voir ma progression
        </button>
        <button type="button" onClick={onCompose} className={GHOST_BTN}>
          Composer une autre séance
        </button>
        <button type="button" onClick={onBack} className={GHOST_BTN}>
          <ArrowLeft size={16} />
          Retour
        </button>
      </div>
    </section>
  );
}
