import React, { useMemo } from 'react';
import { ArrowLeft, TrendingDown, TrendingUp, Minus, CircleDashed } from 'lucide-react';
import { eloToIndex } from './persist.js';
import {
  PALIER_LABEL,
  TREND_LABEL,
  formatPct,
  formatWhen,
  summarizeGlobal,
} from './progress.js';
import {
  ENIGME_CATALOG_SIZE,
  loadEnigmesProgress,
  summarizeEnigmes,
} from './enigmes/enigmesStore.js';

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
  early: CircleDashed,
};

function Trend({ id }) {
  const Icon = TREND_ICON[id] || Minus;
  return (
    <span className={`cx-trend cx-trend-${id}`}>
      <Icon size={14} />
      {TREND_LABEL[id] || TREND_LABEL.early}
    </span>
  );
}

export function ProgressView({ store, onBack }) {
  const global = useMemo(() => summarizeGlobal(store), [store]);
  const enigmes = useMemo(
    () => summarizeEnigmes(loadEnigmesProgress(), ENIGME_CATALOG_SIZE),
    [store]
  );
  const elo = store?.elo?.global ?? 1000;

  return (
    <section className="cx-suivi">
      <button type="button" className="cx-back" onClick={onBack}>
        <ArrowLeft size={16} />
        Retour
      </button>

      <p className="cx-arrive-kicker">Suivi</p>
      <h1 className="cx-suivi-title">Votre progression</h1>
      <p className="cx-arrive-lead">
        Chaque manche et chaque énigme restent enregistrées, classées par domaine et par
        jeu. Rien ne s’efface d’une connexion à l’autre.
      </p>

      <div className="cx-suivi-kpis">
        {[
          ['Jours d’entraînement', global.daysActive],
          ['Manches jouées', global.trials],
          ['Justesse', formatPct(global.accuracy)],
          ['Jeux abordés', `${global.played} / ${global.catalog}`],
          ['Cote', Math.round(elo)],
          ['Indice', eloToIndex(elo)],
        ].map(([label, value]) => (
          <div key={label} className="cx-suivi-kpi">
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      {global.trials === 0 && enigmes.opened === 0 ? (
        <p className="cx-suivi-empty">
          Jouez une première manche, ou ouvrez une énigme : le suivi se remplit tout
          seul.
        </p>
      ) : (
        <p className="cx-suivi-trend-line">
          Tendance globale <Trend id={global.trend} />
        </p>
      )}

      <h2 className="cx-suivi-h">Par domaine</h2>
      <ul className="cx-suivi-domains">
        {global.domains.map((d) => (
          <li key={d.id} className="cx-suivi-domain">
            <div className="cx-suivi-domain-top">
              <strong>{d.title}</strong>
              <Trend id={d.trend} />
            </div>
            <p>
              {d.played
                ? `${d.played} jeu${d.played > 1 ? 'x' : ''} · ${d.n} manche${d.n > 1 ? 's' : ''} · ${formatPct(d.accuracy)} · niveau ${d.level}`
                : 'Pas encore abordé'}
            </p>
          </li>
        ))}
      </ul>

      <h2 className="cx-suivi-h">Test psychotechnique</h2>
      <div className="cx-suivi-enig">
        <p>
          {enigmes.opened
            ? `${enigmes.solved} trouvée${enigmes.solved > 1 ? 's' : ''} · ${enigmes.missed} ratée${enigmes.missed > 1 ? 's' : ''} · ${enigmes.seen} vue${enigmes.seen > 1 ? 's' : ''} · ${enigmes.fresh} encore intactes sur ${enigmes.catalog}`
            : `Aucune énigme ouverte pour l’instant, sur ${enigmes.catalog}.`}
        </p>
        {enigmes.lastAt ? (
          <p className="cx-suivi-meta">Dernière ouverture : {formatWhen(enigmes.lastAt)}</p>
        ) : null}
      </div>

      <h2 className="cx-suivi-h">Chaque jeu</h2>
      {global.domains.map((d) => (
        <div key={`g-${d.id}`} className="cx-suivi-block">
          <p className="cx-suivi-domain-name">{d.title}</p>
          <ul className="cx-suivi-games">
            {d.games.map((g) => (
              <li key={g.id} className={`cx-suivi-game ${g.n ? '' : 'is-idle'}`}>
                <div className="cx-suivi-game-top">
                  <strong>{g.title}</strong>
                  <span className={`cx-palier cx-palier-${g.palier}`}>
                    {PALIER_LABEL[g.palier]}
                  </span>
                </div>
                {g.n ? (
                  <p>
                    {g.n} manche{g.n > 1 ? 's' : ''} · {formatPct(g.accuracyRecent)}
                    {g.n >= 4 ? ` (était ${formatPct(g.accuracyFirst)})` : ''} · niveau {g.level}
                    {' · '}
                    {formatWhen(g.lastAt)}
                  </p>
                ) : (
                  <p>En attente de la première manche.</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {global.recentSessions.length > 0 && (
        <>
          <h2 className="cx-suivi-h">Séances</h2>
          <ol className="cx-suivi-sessions">
            {global.recentSessions.map((s) => (
              <li key={s.id || s.endedAt}>
                <strong>{formatWhen(s.endedAt || s.startedAt)}</strong>
                <span>
                  {s.trialCount || 0} manche{(s.trialCount || 0) > 1 ? 's' : ''} ·{' '}
                  {formatPct(s.accuracy)} · {(s.games || []).length} jeu
                  {(s.games || []).length > 1 ? 'x' : ''}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
