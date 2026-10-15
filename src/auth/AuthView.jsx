import React, { useState } from 'react';
import { login, register, requestReset } from '../cloud/session.js';
import './auth.css';

const MODES = {
  login: {
    kicker: 'Compte',
    title: 'Ouvrir votre laboratoire',
    lead: 'Chaque compte garde ses entraînements, ses énigmes et son suivi. Rien n’est mélangé avec un autre utilisateur.',
    submit: 'Entrer',
  },
  register: {
    kicker: 'Nouveau compte',
    title: 'Créer votre espace',
    lead: 'Choisissez une adresse que vous lisez vraiment : c’est elle qui recevra l’accueil et, si besoin, le lien pour changer le mot de passe.',
    submit: 'Créer le compte',
  },
  forgot: {
    kicker: 'Mot de passe',
    title: 'Recevoir un lien',
    lead: 'Indiquez l’adresse du compte. S’il existe, un message part avec un lien valable deux heures. On ne dit jamais si l’adresse est inconnue.',
    submit: 'Envoyer le lien',
  },
};

export function AuthView({ onReady, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const copy = MODES[mode];

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setOk('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const account = await login({ email, password });
        onReady(account);
        return;
      }
      if (mode === 'register') {
        const account = await register({ email, password, displayName });
        onReady(account);
        return;
      }
      await requestReset(email);
      setOk(
        'Si un compte correspond à cette adresse, un message vient d’être préparé. Vérifiez votre boîte, ou demandez à l’administrateur de lire la file des courriers.'
      );
    } catch (error) {
      setErr(error.message || 'La connexion n’a pas abouti.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cx-auth">
      <form className="cx-auth-card" onSubmit={submit}>
        <p className="cx-auth-kicker">{copy.kicker}</p>
        <h1>{copy.title}</h1>
        <p className="cx-auth-lead">{copy.lead}</p>

        {mode === 'register' && (
          <>
            <label htmlFor="cx-name">Prénom ou nom affiché</label>
            <input
              id="cx-name"
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </>
        )}

        <label htmlFor="cx-email">Adresse e-mail</label>
        <input
          id="cx-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {mode !== 'forgot' && (
          <>
            <label htmlFor="cx-pass">Mot de passe</label>
            <input
              id="cx-pass"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        {err ? <p className="cx-auth-err">{err}</p> : null}
        {ok ? <p className="cx-auth-ok">{ok}</p> : null}

        <div className="cx-auth-actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Un instant…' : copy.submit}
          </button>
          {mode !== 'login' && (
            <button type="button" className="cx-auth-link" onClick={() => setMode('login')}>
              J’ai déjà un compte
            </button>
          )}
          {mode !== 'register' && (
            <button type="button" className="cx-auth-link" onClick={() => setMode('register')}>
              Créer un compte
            </button>
          )}
          {mode !== 'forgot' && (
            <button type="button" className="cx-auth-link" onClick={() => setMode('forgot')}>
              Mot de passe oublié
            </button>
          )}
        </div>
        <p className="cx-auth-note">
          Vos données restent attachées à ce compte. L’administrateur peut les
          consulter, les exporter et vous écrire — il ne les mélange pas avec un
          autre laboratoire.
        </p>
      </form>
    </div>
  );
}
