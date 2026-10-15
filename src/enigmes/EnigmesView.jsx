import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleHelp,
  CircleX,
  ChevronDown,
  Clock3,
  Eye,
  Lock,
  Play,
  Search,
  Shuffle,
} from 'lucide-react';
import indexData from './enigmesIndex.json';
import solutionsData from './solutionsIndex.json';
import { PdfRegion } from './PdfRegion.jsx';
import { EXPLANATIONS } from './explanations.js';
import {
  ENIGME_STATUS,
  REVEAL_AFTER_MS,
  addTime,
  loadEnigmesProgress,
  markRevealed,
  markSeen,
  saveEnigmesProgress,
  setStatus,
  statusOf,
} from './enigmesStore.js';

const ENONCES_URL = '/enigmes/enonces.pdf';
const SOLUTIONS_URL = solutionsData.source ? `/enigmes/${solutionsData.source}` : null;
const ENIGMES = indexData.enigmes;
const TOTAL = ENIGMES.length;
const BY_ID = new Map(ENIGMES.map((e) => [e.id, e]));
const SOLUTION_BY_ID = new Map((solutionsData.solutions || []).map((s) => [s.id, s]));
const PAGE_SIZE = 60;

const ACCENT_BTN = 'cx-btn cx-btn-accent';
const GHOST_BTN = 'cx-btn cx-btn-ghost';

const STATUS_LABEL = {
  [ENIGME_STATUS.NEW]: 'Nouvelle',
  [ENIGME_STATUS.SEEN]: 'Vue',
  [ENIGME_STATUS.SOLVED]: 'Trouvée',
  [ENIGME_STATUS.MISSED]: 'Ratée',
};

const STATUS_STYLE = {
  [ENIGME_STATUS.NEW]: 'bg-slate-100 text-slate-500',
  [ENIGME_STATUS.SEEN]: 'bg-sky-50 text-sky-700',
  [ENIGME_STATUS.SOLVED]: 'bg-emerald-50 text-emerald-700',
  [ENIGME_STATUS.MISSED]: 'bg-amber-50 text-amber-800',
};

const TABS = [
  { id: 'new', label: 'Nouvelles', match: (s) => s === ENIGME_STATUS.NEW },
  { id: 'seen', label: 'Vues', match: (s) => s === ENIGME_STATUS.SEEN },
  { id: 'solved', label: 'Trouvées', match: (s) => s === ENIGME_STATUS.SOLVED },
  { id: 'missed', label: 'Ratées', match: (s) => s === ENIGME_STATUS.MISSED },
  { id: 'all', label: 'Toutes', match: () => true },
];

function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatMmSs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function randomUnseenId(progress, exceptId) {
  const pool = ENIGMES.filter(
    (e) => e.id !== exceptId && statusOf(progress, e.id) === ENIGME_STATUS.NEW
  );
  const list = pool.length ? pool : ENIGMES.filter((e) => e.id !== exceptId);
  return list[Math.floor(Math.random() * list.length)].id;
}

export default function EnigmesView({ onExit, embedded = false, onPlaying, backSignal = 0 }) {
  const [progress, setProgress] = useState(() => loadEnigmesProgress());
  const progressRef = useRef(progress);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    onPlaying?.(openId != null);
    return () => onPlaying?.(false);
  }, [openId, onPlaying]);

  useEffect(() => {
    if (!backSignal) return;
    setOpenId(null);
    window.scrollTo({ top: 0 });
  }, [backSignal]);

  /* Sauvegarde immédiate, même si l’écran se ferme juste après. */
  const update = useCallback((fn) => {
    const next = fn(progressRef.current);
    progressRef.current = next;
    saveEnigmesProgress(next);
    setProgress(next);
  }, []);

  const open = (id) => {
    update((p) => markSeen(p, id));
    setOpenId(id);
    window.scrollTo({ top: 0 });
  };

  if (openId != null) {
    return (
      <EnigmeScreen
        key={openId}
        enigme={BY_ID.get(openId)}
        progress={progress}
        update={update}
        onOpen={open}
        onBack={() => {
          setOpenId(null);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }
  return <EnigmesList progress={progress} onOpen={open} onExit={onExit} embedded={embedded} />;
}

/* ------------------------------------------------------------------ */
/* Liste : proposées, puis classées une fois vues                       */
/* ------------------------------------------------------------------ */

function EnigmesList({ progress, onOpen, onExit, embedded }) {
  const [tab, setTab] = useState('new');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const num = /^\d+$/.test(q) ? Number(q) : null;
    const match = TABS.find((t) => t.id === tab).match;
    return ENIGMES.filter((e) => {
      if (!match(statusOf(progress, e.id))) return false;
      if (!q) return true;
      if (num != null) return e.id === num;
      return normalize(`${e.title} ${e.text}`).includes(q);
    });
  }, [progress, tab, query]);

  useEffect(() => setShown(PAGE_SIZE), [tab, query]);

  const last = progress.lastId ? BY_ID.get(progress.lastId) : null;

  return (
    <div className="cx-enig">
      {!embedded && (
        <button type="button" onClick={onExit} className="cx-back">
          <ArrowLeft size={16} /> Retour
        </button>
      )}

      <p
        className="cx-enig-head cx-play"
        style={{ '--play-img': 'url("/games/enigmes.jpg")' }}
      >
        <span className="cx-play-text">
          <span className="cx-play-name">Test psychotechnique</span>
          <em className="cx-play-hint">
            914 énigmes à votre rythme. La réponse devient disponible après 1 min 30 : à vous de
            l’ouvrir.
          </em>
        </span>
      </p>

      <div className="cx-enig-bar">
        {last && (
          <button type="button" onClick={() => onOpen(last.id)} className={ACCENT_BTN}>
            <Play size={16} />
            Reprendre n° {last.id}
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpen(randomUnseenId(progress))}
          className={last ? GHOST_BTN : ACCENT_BTN}
        >
          <Shuffle size={16} />
          Hasard
        </button>
      </div>

      <details className="cx-enig-fold">
        <summary>
          Parcourir
          <ChevronDown size={16} aria-hidden />
        </summary>

        <label className="cx-enig-search">
          <Search size={15} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="N° ou mot"
          />
        </label>

        <div className="cx-enig-filters" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'on' : ''}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="cx-enig-empty">Rien ici.</p>
        ) : (
          <>
            <ul className="cx-enig-list">
              {filtered.slice(0, shown).map((e) => (
                <li key={e.id}>
                  <button type="button" className="cx-enig-row" onClick={() => onOpen(e.id)}>
                    <span className="cx-enig-num">{e.id}</span>
                    <span className="cx-enig-title">{e.title}</span>
                  </button>
                </li>
              ))}
            </ul>
            {shown < filtered.length && (
              <button
                type="button"
                className="cx-enig-more"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
              >
                Plus
              </button>
            )}
          </>
        )}
      </details>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Une énigme : après 1 min 30 la réponse devient ouvrable, jamais seule */
/* ------------------------------------------------------------------ */

function EnigmeScreen({ enigme, progress, update, onOpen, onBack }) {
  const id = enigme.id;
  const item = progress.items[id] || { timeMs: 0, revealed: false, status: ENIGME_STATUS.SEEN };
  const status = statusOf(progress, id);
  const solution = SOLUTION_BY_ID.get(id) || null;

  /* Temps cumulé : déjà enregistré + session en cours (enregistrée toutes les 5 s et à la sortie). */
  const savedMs = useRef(item.timeMs || 0);
  const sinceRef = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const [showAnswer, setShowAnswer] = useState(false);

  /* Le temps passé onglet masqué ne compte pas comme temps de recherche. */
  const flush = useCallback(
    (count = document.visibilityState !== 'hidden') => {
      const t = Date.now();
      const ms = t - sinceRef.current;
      sinceRef.current = t;
      if (!count || ms <= 0) return;
      savedMs.current += ms;
      update((p) => addTime(p, id, ms));
    },
    [id, update]
  );

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 500);
    const save = setInterval(() => flush(), 5000);
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush(true);
      else sinceRef.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(tick);
      clearInterval(save);
      document.removeEventListener('visibilitychange', onVis);
      flush(document.visibilityState !== 'hidden');
    };
  }, [flush]);

  const elapsed = savedMs.current + (now - sinceRef.current);
  const available = elapsed >= REVEAL_AFTER_MS;
  const remaining = Math.max(0, REVEAL_AFTER_MS - elapsed);

  const reveal = () => {
    if (!available) return;
    update((p) => markRevealed(p, id));
    setShowAnswer(true);
  };

  const verdict = (s) => update((p) => setStatus(p, id, s));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <button type="button" onClick={onBack} className="cx-back !mb-0">
          <ArrowLeft size={16} />
          Retour
        </button>
        <div className="flex items-center gap-4">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-sm text-slate-500" title="Temps de recherche cumulé">
            <Clock3 size={14} />
            {formatMmSs(elapsed)}
          </span>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Énigme n° {id} sur {TOTAL} · {enigme.title}
          </h2>
          <span className="text-xs text-slate-400">Thème : {enigme.theme}</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          {enigme.segments.map((seg, i) => (
            <PdfRegion
              key={`${seg.page}-${seg.x0}-${i}`}
              url={ENONCES_URL}
              segment={seg}
              label={`Énoncé de l’énigme n° ${id} : ${enigme.text.slice(0, 300)}`}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        {!showAnswer ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-slate-600">
              {available
                ? 'La réponse est disponible. Ouvrez-la quand vous voulez.'
                : `Cherchez encore un peu : vous pourrez ouvrir la réponse dans ${formatMmSs(remaining)}.`}
            </p>
            <button type="button" onClick={reveal} disabled={!available} className={ACCENT_BTN}>
              {available ? <Eye size={16} /> : <Lock size={16} />}
              Ouvrir la réponse
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#1571B0]">
                Réponse détaillée
              </p>
              <button type="button" onClick={() => setShowAnswer(false)} className="cx-back !mb-0">
                Masquer la réponse
              </button>
            </div>
            {solution && SOLUTIONS_URL ? (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                {solution.segments.map((seg, i) => (
                  <PdfRegion
                    key={`sol-${seg.page}-${seg.x0}-${i}`}
                    url={SOLUTIONS_URL}
                    segment={seg}
                    label={`Solution de l’énigme n° ${id} : ${(solution.text || '').slice(0, 300)}`}
                  />
                ))}
                <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
                  Corrigé officiel : A. Gazagnes, « Énigmes de Âne à Zèbre », IREM de Lyon.
                </p>
              </div>
            ) : null}
            {EXPLANATIONS[id] ? (
              <div className="mt-4 rounded-2xl bg-sky-50 p-4 sm:p-5">
                <p className="mb-2 text-sm font-semibold text-slate-800">Explication pas à pas</p>
                <div className="space-y-2 text-sm leading-relaxed text-slate-700">
                  {EXPLANATIONS[id].map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ) : null}
            {solution && SOLUTIONS_URL ? null : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                La réponse détaillée de l’énigme n° {id} est introuvable dans le document des
                corrigés.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="mb-2 text-sm font-semibold text-slate-800">Votre verdict</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => verdict(ENIGME_STATUS.SOLVED)}
              aria-pressed={status === ENIGME_STATUS.SOLVED}
              className={`${GHOST_BTN} ${status === ENIGME_STATUS.SOLVED ? '!border-emerald-500 !bg-emerald-50 !text-emerald-700' : ''}`}
            >
              <CircleCheck size={16} /> Je l’ai résolue
            </button>
            <button
              type="button"
              onClick={() => verdict(ENIGME_STATUS.MISSED)}
              aria-pressed={status === ENIGME_STATUS.MISSED}
              className={`${GHOST_BTN} ${status === ENIGME_STATUS.MISSED ? '!border-amber-500 !bg-amber-50 !text-amber-800' : ''}`}
            >
              <CircleX size={16} /> Je n’ai pas trouvé
            </button>
            {status !== ENIGME_STATUS.SEEN && (
              <button
                type="button"
                onClick={() => verdict(ENIGME_STATUS.SEEN)}
                className="inline-flex items-center gap-1.5 px-2 text-xs text-slate-400 hover:text-slate-600"
              >
                <CircleHelp size={14} /> Retirer le verdict
              </button>
            )}
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Changer d’énigme">
        <button type="button" onClick={onBack} className={GHOST_BTN}>
          <ArrowLeft size={16} /> Retour
        </button>
        <button type="button" onClick={() => onOpen(id - 1)} disabled={id <= 1} className={GHOST_BTN}>
          <ArrowLeft size={16} /> {id > 1 ? `Précédente (n° ${id - 1})` : 'Précédente'}
        </button>
        <button type="button" onClick={() => onOpen(id + 1)} disabled={id >= TOTAL} className={GHOST_BTN}>
          {id < TOTAL ? `Suivante (n° ${id + 1})` : 'Suivante'} <ArrowRight size={16} />
        </button>
        <button type="button" onClick={() => onOpen(randomUnseenId(progress, id))} className={GHOST_BTN}>
          <Shuffle size={16} /> Une autre au hasard, à découvrir
        </button>
      </nav>
    </div>
  );
}
