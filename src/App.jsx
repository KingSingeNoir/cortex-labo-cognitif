import React, { useEffect, useState } from 'react';
import { CognitiveView } from './CognitiveView.jsx';
import { MarqueView } from './marque/MarqueView.jsx';
import { AuthView } from './auth/AuthView.jsx';
import { ResetView } from './auth/ResetView.jsx';
import { AdminView } from './admin/AdminView.jsx';
import { hydrateSession, logout } from './cloud/session.js';
import { flushAccountCloudNow } from './cloud/sync.js';
import { useDeviceSurface } from './device.js';
import { appHref } from './paths.js';
import './auth/auth.css';

function relativePath() {
  const raw = window.location.pathname || '/';
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  if (base && raw.startsWith(base)) {
    return raw.slice(base.length) || '/';
  }
  return raw || '/';
}

export default function App() {
  useDeviceSurface();
  const [path, setPath] = useState(relativePath);
  const [boot, setBoot] = useState(true);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const onPop = () => setPath(relativePath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    let live = true;
    hydrateSession().then((acc) => {
      if (!live) return;
      setAccount(acc);
      setBoot(false);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!account) return undefined;
    const flush = () => {
      flushAccountCloudNow();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [account]);

  useEffect(() => {
    if (!account || account.role === 'admin') return;
    if (path !== '/admin' && !path.startsWith('/admin/')) return;
    window.history.replaceState({}, '', appHref('/'));
    setPath('/');
  }, [account, path]);

  const onLogout = async () => {
    await logout();
    setAccount(null);
    window.history.replaceState({}, '', appHref('/'));
    setPath('/');
  };

  if (path === '/reset' || path.startsWith('/reset/')) {
    return <ResetView />;
  }

  if (boot) {
    return (
      <div className="cx-auth">
        <div className="cx-auth-card">
          <p className="cx-auth-kicker">CORTEX</p>
          <h1>Ouverture du laboratoire</h1>
          <p className="cx-auth-lead">
            Nous vérifions votre session et, s’il y en a une, nous rechargeons
            la sauvegarde de ce compte.
          </p>
        </div>
      </div>
    );
  }

  if (path === '/marque' || path.startsWith('/marque/')) {
    return <MarqueView account={account} />;
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!account) {
      return <AuthView onReady={setAccount} />;
    }
    if (account.role !== 'admin') {
      return <CognitiveView account={account} onLogout={onLogout} />;
    }
    return <AdminView account={account} onLogout={onLogout} />;
  }

  if (!account) {
    return <AuthView onReady={setAccount} />;
  }

  return <CognitiveView account={account} onLogout={onLogout} />;
}
