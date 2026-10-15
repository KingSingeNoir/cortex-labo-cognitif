import React, { useMemo, useState } from 'react';
import { confirmReset } from '../cloud/session.js';
import { goPath } from '../paths.js';
import './auth.css';

function tokenFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('token') || '';
  } catch {
    return '';
  }
}

export function ResetView() {
  const token = useMemo(tokenFromUrl, []);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (password !== again) {
      setErr('Les deux mots de passe ne sont pas identiques.');
      return;
    }
    setBusy(true);
    try {
      await confirmReset({ token, password });
      setOk(true);
    } catch (error) {
      setErr(error.message || 'Ce lien n’a pas pu être utilisé.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cx-auth">
      <form className="cx-auth-card" onSubmit={submit}>
        <p className="cx-auth-kicker">Sécurité</p>
        <h1>Nouveau mot de passe</h1>
        <p className="cx-auth-lead">
          Choisissez un mot de passe d’au moins huit caractères. Le lien de cette
          page expire au bout de deux heures.
        </p>
        {!token && (
          <p className="cx-auth-err">
            Ce lien est incomplet. Demandez un nouvel envoi depuis l’écran de connexion.
          </p>
        )}
        {ok ? (
          <>
            <p className="cx-auth-ok">Le mot de passe est changé. Vous pouvez entrer à nouveau.</p>
            <div className="cx-auth-actions">
              <button type="button" onClick={() => goPath('/')}>
                Aller à la connexion
              </button>
            </div>
          </>
        ) : (
          <>
            <label htmlFor="cx-new-pass">Nouveau mot de passe</label>
            <input
              id="cx-new-pass"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="cx-new-pass-2">Confirmer</label>
            <input
              id="cx-new-pass-2"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={again}
              onChange={(e) => setAgain(e.target.value)}
            />
            {err ? <p className="cx-auth-err">{err}</p> : null}
            <div className="cx-auth-actions">
              <button type="submit" disabled={busy || !token}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" className="cx-auth-link" onClick={() => goPath('/')}>
                Retour
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
