import React, { useEffect, useState } from 'react';
import { fetchBrandSummary } from './telemetry.js';
import { getCognitiveDomain } from '../catalog.js';
import { goPath } from '../paths.js';
import { api } from '../cloud/api.js';
import './marque.css';

const PIN = String(import.meta.env.VITE_MARQUE_PIN || 'cortex');
const GATE_KEY = 'COG_marque_ok_v1';

const DOMAIN_TITLES = {
  imt: 'Mémoire',
  irp: 'Raisonnement',
  ivt: 'Vitesse',
  att: 'Concentration',
  vis: 'Yeux',
  log: 'Logique',
};

function pct(v) {
  return v == null ? '—' : `${Math.round(v * 100)} %`;
}

function when(at) {
  if (!at) return '—';
  return new Date(at).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MarqueView({ account }) {
  const [ok, setOk] = useState(() => {
    if (account?.role === 'admin') return true;
    try {
      return sessionStorage.getItem(GATE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.surface = 'marque';
    return () => {
      delete document.documentElement.dataset.surface;
    };
  }, []);

  useEffect(() => {
    if (ok || account?.role === 'admin') {
      if (account?.role === 'admin') setOk(true);
      return;
    }
    let live = true;
    api('/v1/auth/me', { silent: true }).then((data) => {
      if (!live || data?.error) return;
      if (data.account?.role === 'admin') setOk(true);
    });
    return () => {
      live = false;
    };
  }, [ok, account]);

  useEffect(() => {
    if (!ok) return;
    let live = true;
    fetchBrandSummary().then((data) => {
      if (live) setSummary(data);
    });
    const id = setInterval(() => {
      fetchBrandSummary().then((data) => {
        if (live) setSummary(data);
      });
    }, 12000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [ok]);

  const unlock = (e) => {
    e.preventDefault();
    if (pin.trim().toLowerCase() !== PIN.toLowerCase()) {
      setErr('Ce code ne correspond pas.');
      return;
    }
    try {
      sessionStorage.setItem(GATE_KEY, '1');
    } catch {
      /* ignore */
    }
    setOk(true);
  };

  if (!ok) {
    return (
      <div className="marque-app">
        <div className="marque-shell">
          <div className="marque-top">
            <p className="marque-brand">Cortex · Marque</p>
            <a href="#lab" onClick={(e) => { e.preventDefault(); goPath('/'); }}>
              Retour au labo
            </a>
          </div>
          <form className="marque-gate" onSubmit={unlock}>
            <p className="marque-kicker">Accès</p>
            <h1>Plateforme de marque</h1>
            <p className="marque-lead">
              Cet espace n’est pas l’application. Il sert à suivre la marque, pas à
              s’entraîner.
            </p>
            <label htmlFor="marque-pin">Code d’accès</label>
            <input
              id="marque-pin"
              type="password"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErr('');
              }}
            />
            {err ? <p className="marque-err">{err}</p> : null}
            <button type="submit">Entrer</button>
          </form>
        </div>
      </div>
    );
  }

  const s = summary;
  const domains = Object.entries(s?.byDomain || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="marque-app">
      <div className="marque-shell">
        <div className="marque-top">
          <p className="marque-brand">Cortex · Marque</p>
          <a href="#lab" onClick={(e) => { e.preventDefault(); goPath('/'); }}>
            Ouvrir le labo
          </a>
        </div>

        <p className="marque-kicker">Suivi</p>
        <h1>La marque, pas le jeu</h1>
        <p className="marque-lead">
          Ici l’on regarde Cortex comme une maison : qui vient, ce qui est pratiqué,
          ce qui tient. L’entraînement reste dans le labo, avec une autre voix.
        </p>
        <p className="marque-source">
          {s?.source === 'server'
            ? 'Chiffres consolidés depuis le serveur de marque.'
            : 'Chiffres de cet appareil, en attendant le serveur de marque.'}
        </p>

        <div className="marque-grid">
          {[
            ['Visites', s?.visits ?? '—'],
            ['Appareils', s?.clients ?? '—'],
            ['Jours actifs', s?.days ?? '—'],
            ['Séances', s?.sessions ?? '—'],
            ['Manches', s?.trials ?? '—'],
            ['Énigmes ouvertes', s?.enigmes ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="marque-kpi">
              <p>{label}</p>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <h2>Territoire de marque</h2>
        <div className="marque-block">
          <p>
            <strong>Promesse.</strong> Un labo calme pour exercer l’attention, la
            mémoire, la logique et le regard — sans spectacle, sans classement public.
          </p>
          <p>
            <strong>Ton.</strong> Français simple, phrases posées, jamais de jargon
            d’expert à expert. On explique, on ne vend pas la performance.
          </p>
          <p>
            <strong>Ce que l’on ne fait pas.</strong> Ni QI clinique, ni promesse
            médicale, ni mélange avec une autre plateforme. Cortex se tient seul.
          </p>
        </div>

        <h2>Domaines pratiqués</h2>
        {domains.length === 0 ? (
          <p className="marque-note">Aucune séance n’a encore été classée.</p>
        ) : (
          <ul className="marque-list">
            {domains.map(([id, n]) => (
              <li key={id}>
                <span>{DOMAIN_TITLES[id] || getCognitiveDomain(id)?.title || id}</span>
                <span>{n} séance{n > 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
        )}

        <h2>Justesse moyenne des séances</h2>
        <div className="marque-block">
          <p>{pct(s?.accuracy)} sur l’ensemble des séances enregistrées.</p>
        </div>

        <h2>Derniers faits</h2>
        {!s?.recent?.length ? (
          <p className="marque-note">Le journal de marque est encore vide.</p>
        ) : (
          <ul className="marque-list">
            {s.recent.map((ev, i) => (
              <li key={`${ev.at}-${i}`}>
                <span>
                  {ev.type === 'visit' && 'Visite du labo'}
                  {ev.type === 'session' && 'Séance terminée'}
                  {ev.type === 'trial' && 'Manche jouée'}
                  {ev.type === 'enigme' && 'Énigme'}
                  {!['visit', 'session', 'trial', 'enigme'].includes(ev.type) && ev.type}
                </span>
                <span>{when(ev.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
