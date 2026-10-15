import React, { useEffect, useState } from 'react';
import { api } from '../cloud/api.js';
import { goPath } from '../paths.js';
import { AdminSuiviView } from './AdminSuiviView.jsx';
import './admin.css';

function when(at) {
  if (!at) return '—';
  return new Date(at).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminView({ account, onLogout }) {
  const [tab, setTab] = useState('comptes');
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [mail, setMail] = useState([]);
  const [health, setHealth] = useState(null);
  const [msg, setMsg] = useState(null);
  const [letter, setLetter] = useState({ to: '', subject: '', text: '' });

  const flash = (kind, text) => setMsg({ kind, text });

  const refreshAccounts = async () => {
    const data = await api('/v1/admin/accounts');
    setAccounts(data.accounts || []);
  };

  const refreshMail = async () => {
    const data = await api('/v1/admin/mail');
    setMail(data.messages || []);
  };

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [acc, h] = await Promise.all([
          api('/v1/admin/accounts'),
          api('/v1/health'),
        ]);
        if (!live) return;
        setAccounts(acc.accounts || []);
        setHealth(h);
      } catch (err) {
        if (live) flash('err', err.message);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== 'courrier') return;
    refreshMail().catch((err) => flash('err', err.message));
  }, [tab]);

  const openAccount = async (id) => {
    setSelected(id);
    const data = await api(`/v1/admin/accounts/${encodeURIComponent(id)}`);
    setDetail(data);
    setLetter((cur) => ({ ...cur, to: data.account?.email || cur.to }));
  };

  const patch = async (id, body, okText) => {
    await api(`/v1/admin/accounts/${encodeURIComponent(id)}`, { method: 'PATCH', body });
    await refreshAccounts();
    if (selected === id) await openAccount(id);
    flash('ok', okText);
  };

  const sendMail = async (e) => {
    e.preventDefault();
    const rec = await api('/v1/admin/mail', { method: 'POST', body: letter });
    flash(
      'ok',
      rec.status === 'sent'
        ? 'Le message a été envoyé.'
        : rec.status === 'error'
          ? `Le message est enregistré, mais l’envoi SMTP a échoué : ${rec.error}`
          : 'Le message est dans la file. Sans SMTP, il reste consultable ici.'
    );
    setLetter({ to: letter.to, subject: '', text: '' });
    if (tab === 'courrier') await refreshMail();
  };

  const exportOne = async (id) => {
    const data = await api(`/v1/admin/accounts/${encodeURIComponent(id)}/export`);
    downloadJson(`cortex-${id}.json`, data);
    flash('ok', 'Export téléchargé — état et archive de ce compte seulement.');
  };

  return (
    <div className="cx-admin">
      <header className="cx-admin-head">
        <div>
          <h1>Administration CORTEX</h1>
          <p>
            {account?.displayName} · tous les comptes, leurs sauvegardes et les courriers.
          </p>
        </div>
        <nav className="cx-admin-nav">
          {[
            ['comptes', 'Comptes'],
            ['suivi', 'Suivi'],
            ['courrier', 'Courrier'],
            ['sante', 'Santé'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-on={tab === id ? '1' : '0'}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          <button type="button" className="cx-admin-link" onClick={() => goPath('/')}>
            Laboratoire
          </button>
          <button type="button" className="cx-admin-link" onClick={onLogout}>
            Quitter
          </button>
        </nav>
      </header>

      <div className="cx-admin-body">
        {msg ? (
          <p className="cx-admin-msg" data-k={msg.kind}>
            {msg.text}
          </p>
        ) : null}

        {tab === 'comptes' && (
          <div className="cx-admin-grid">
            <div className="cx-admin-card">
              <h2>{accounts.length} compte{accounts.length > 1 ? 's' : ''}</h2>
              <table className="cx-admin-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Adresse</th>
                    <th>Rôle</th>
                    <th>État</th>
                    <th>Vu</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <button type="button" onClick={() => openAccount(a.id)}>
                          {a.displayName}
                        </button>
                      </td>
                      <td>{a.email}</td>
                      <td>{a.role}</td>
                      <td>
                        <span className="cx-admin-status" data-s={a.status}>
                          {a.status === 'active' ? 'actif' : 'désactivé'}
                        </span>
                      </td>
                      <td>{when(a.lastSeenAt || a.lastLoginAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="cx-admin-card">
              {!detail ? (
                <>
                  <h2>Fiche</h2>
                  <p>Ouvrez un compte pour le désactiver, l’exporter ou lui écrire.</p>
                </>
              ) : (
                <>
                  <h2>{detail.account.displayName}</h2>
                  <p>
                    {detail.account.email}
                    <br />
                    Créé le {when(detail.account.createdAt)}
                    <br />
                    Archive : {detail.archive?.events?.length || 0} événement
                    {(detail.archive?.events?.length || 0) > 1 ? 's' : ''}
                  </p>
                  <div className="cx-admin-actions">
                    <button
                      type="button"
                      onClick={() =>
                        patch(
                          detail.account.id,
                          {
                            status:
                              detail.account.status === 'active' ? 'disabled' : 'active',
                          },
                          detail.account.status === 'active'
                            ? 'Compte désactivé.'
                            : 'Compte réactivé.'
                        )
                      }
                    >
                      {detail.account.status === 'active' ? 'Désactiver' : 'Réactiver'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patch(
                          detail.account.id,
                          {
                            role: detail.account.role === 'admin' ? 'apprenant' : 'admin',
                          },
                          'Rôle mis à jour.'
                        )
                      }
                    >
                      {detail.account.role === 'admin'
                        ? 'Repasser apprenant'
                        : 'Nommer admin'}
                    </button>
                    <button type="button" onClick={() => exportOne(detail.account.id)}>
                      Exporter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(detail.account.id);
                        setTab('suivi');
                      }}
                    >
                      Voir le suivi
                    </button>
                  </div>
                  <h2>Dernière sauvegarde</h2>
                  <pre className="cx-admin-pre">
                    {JSON.stringify(
                      {
                        updatedAt: detail.state?.updatedAt
                          ? new Date(detail.state.updatedAt).toISOString()
                          : null,
                        cognitive: Boolean(detail.state?.cognitive),
                        enigmes: Boolean(detail.state?.enigmes),
                      },
                      null,
                      2
                    )}
                  </pre>
                </>
              )}
            </aside>
          </div>
        )}

        {tab === 'suivi' && (
          <AdminSuiviView embedded initialId={selected} />
        )}

        {tab === 'courrier' && (
          <div className="cx-admin-grid">
            <form className="cx-admin-card" onSubmit={sendMail}>
              <h2>Écrire</h2>
              <p>
                Sans serveur SMTP, le message est tout de même enregistré dans la
                file — utile en démo. Avec SMTP, il part vraiment.
              </p>
              <label htmlFor="cx-mail-to">Destinataire</label>
              <input
                id="cx-mail-to"
                type="email"
                required
                value={letter.to}
                onChange={(e) => setLetter({ ...letter, to: e.target.value })}
              />
              <label htmlFor="cx-mail-sub">Objet</label>
              <input
                id="cx-mail-sub"
                required
                value={letter.subject}
                onChange={(e) => setLetter({ ...letter, subject: e.target.value })}
              />
              <label htmlFor="cx-mail-text">Message</label>
              <textarea
                id="cx-mail-text"
                rows={7}
                required
                value={letter.text}
                onChange={(e) => setLetter({ ...letter, text: e.target.value })}
              />
              <div className="cx-admin-actions">
                <button type="submit">Mettre en file / envoyer</button>
              </div>
            </form>
            <div className="cx-admin-card cx-admin-mail">
              <h2>File ({mail.length})</h2>
              {mail.length === 0 ? (
                <p>Aucun courrier pour l’instant.</p>
              ) : (
                [...mail].reverse().map((m) => (
                  <article key={m.id}>
                    <h3>{m.subject}</h3>
                    <p>
                      {m.to} · {m.kind} · {m.status} · {when(m.at)}
                    </p>
                    <p>{m.text}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'sante' && (
          <div className="cx-admin-health">
            {[
              ['Service', health?.service || '—'],
              ['Comptes', health?.accounts ?? '—'],
              ['Actifs', health?.active ?? '—'],
              ['Courriers', health?.mail ?? '—'],
              ['Uptime (s)', health?.uptimeSec ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="cx-admin-kpi">
                <p>{label}</p>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
