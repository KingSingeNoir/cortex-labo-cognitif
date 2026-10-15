import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../cloud/api.js';
import { hydrateCognitiveStore } from '../persist.js';
import { formatPct, summarizeGlobal } from '../progress.js';
import {
  ENIGME_CATALOG_SIZE,
  hydrateEnigmesProgress,
  summarizeEnigmes,
} from '../enigmes/enigmesStore.js';
import { ProgressView } from '../ProgressView.jsx';
import '../cognitive.css';
import './admin.css';

function when(at) {
  if (!at) return 'jamais';
  return new Date(at).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rowSummary(row) {
  const store = hydrateCognitiveStore(row.state?.cognitive);
  const global = summarizeGlobal(store);
  const enigmes = summarizeEnigmes(
    hydrateEnigmesProgress(row.state?.enigmes),
    ENIGME_CATALOG_SIZE
  );
  return {
    store,
    global,
    enigmes,
    lastAt: global.lastAt || enigmes.lastAt || row.account.lastSeenAt,
  };
}

export function AdminSuiviView({ onBack, embedded = false, initialId = null }) {
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState(initialId);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    try {
      const data = await api('/v1/admin/suivi');
      const list = data.accounts || [];
      setRows(list);
      setPicked((cur) => {
        const prefer = cur || initialId;
        if (prefer && list.some((r) => r.account.id === prefer)) return prefer;
        return list[0]?.account.id || null;
      });
      setErr('');
    } catch (error) {
      setErr(error.message || 'Impossible de lire les archives.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const current = rows.find((r) => r.account.id === picked) || null;
  const summary = useMemo(
    () => (current ? rowSummary(current) : null),
    [current]
  );

  return (
    <div className={`cx-admin-suivi ${embedded ? 'is-embedded' : ''}`}>
      {!embedded && typeof onBack === 'function' ? (
        <button type="button" className="cx-back" onClick={onBack}>
          Retour
        </button>
      ) : null}

      <p className="cx-arrive-kicker">Suivi administrateur</p>
      <h1 className="cx-suivi-title">Tous les laboratoires</h1>
      <p className="cx-arrive-lead">
        Chaque compte garde ses jeux, ses scores, ses préférences et ses énigmes.
        Ouvrez un nom pour lire son suivi comme il le voit — rien n’est mélangé
        d’un utilisateur à l’autre.
      </p>

      {err ? <p className="cx-admin-msg" data-k="err">{err}</p> : null}
      {busy && !rows.length ? (
        <p className="cx-suivi-empty">Chargement des archives…</p>
      ) : null}

      <ul className="cx-admin-roster">
        {rows.map((row) => {
          const snap = rowSummary(row);
          const on = row.account.id === picked;
          return (
            <li key={row.account.id}>
              <button
                type="button"
                data-on={on ? '1' : '0'}
                onClick={() => setPicked(row.account.id)}
              >
                <strong>{row.account.displayName}</strong>
                <span>{row.account.email}</span>
                <span>
                  {snap.global.trials} manche{snap.global.trials > 1 ? 's' : ''} ·{' '}
                  {formatPct(snap.global.accuracy)} · {snap.enigmes.opened} énigme
                  {snap.enigmes.opened > 1 ? 's' : ''}
                </span>
                <span>Vu {when(snap.lastAt)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {summary && current ? (
        <ProgressView
          store={summary.store}
          enigmes={current.state?.enigmes}
          person={current.account.displayName}
          title={`Progression de ${current.account.displayName}`}
          lead={`${current.account.email} · ${current.account.role === 'admin' ? 'administrateur' : 'apprenant'} · dernière sauvegarde ${current.state?.updatedAt ? when(current.state.updatedAt) : 'encore vide'}.`}
          showTrials
        />
      ) : null}
    </div>
  );
}
