/**
 * Surface d’affichage — iPhone / iPad / ordinateur, mise à jour en continu.
 *
 * iPadOS 13+ se fait passer pour un Mac : on le rattrape via maxTouchPoints.
 * Un iPad en Split View reste une tablette, mais la bande de largeur
 * (s / m / l) recale la grille comme un téléphone si la fenêtre est étroite.
 */
import { useEffect, useState } from 'react';

export const DEVICE_SMARTPHONE = 'smartphone';
export const DEVICE_TABLETTE = 'tablette';
export const DEVICE_ORDINATEUR = 'ordinateur';

function viewportSize(win) {
  const vv = win.visualViewport;
  const w = Math.round(vv?.width || win.innerWidth || 0);
  const h = Math.round(vv?.height || win.innerHeight || 0);
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

export function detectDevice(win = typeof window !== 'undefined' ? window : null) {
  if (!win) {
    return {
      device: DEVICE_ORDINATEUR,
      orient: 'paysage',
      band: 'l',
      apple: null,
      width: 1280,
      height: 800,
    };
  }
  const nav = win.navigator || {};
  const ua = String(nav.userAgent || '');
  const plat = String(nav.platform || nav.userAgentData?.platform || '');
  const touch = Number(nav.maxTouchPoints) || 0;
  const { w, h } = viewportSize(win);
  const short = Math.min(w, h);
  const coarse = Boolean(win.matchMedia?.('(pointer: coarse)')?.matches);
  const canHover = Boolean(win.matchMedia?.('(hover: hover)')?.matches);

  const isiPhone = /iPhone|iPod/i.test(ua);
  const isiPad =
    /iPad/i.test(ua) || ((/Macintosh|MacIntel/i.test(`${plat} ${ua}`) || /Mac/i.test(plat)) && touch > 1);
  const isAndroid = /Android/i.test(ua);
  const androidPhone = isAndroid && /Mobile/i.test(ua);

  let device = DEVICE_ORDINATEUR;
  let apple = null;
  if (isiPhone) {
    device = DEVICE_SMARTPHONE;
    apple = 'iphone';
  } else if (isiPad) {
    device = DEVICE_TABLETTE;
    apple = 'ipad';
  } else if (androidPhone) {
    device = DEVICE_SMARTPHONE;
  } else if (isAndroid) {
    device = DEVICE_TABLETTE;
  } else if (coarse && !canHover) {
    device = short < 600 ? DEVICE_SMARTPHONE : DEVICE_TABLETTE;
  }

  const band = w < 640 ? 's' : w < 1024 ? 'm' : 'l';
  const orient = w >= h ? 'paysage' : 'portrait';
  return { device, orient, band, apple, width: w, height: h };
}

export function applyDeviceToDocument(info, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc?.documentElement) return info;
  const root = doc.documentElement;
  root.dataset.cxDevice = info.device;
  root.dataset.cxOrient = info.orient;
  root.dataset.cxBand = info.band;
  if (info.apple) root.dataset.cxApple = info.apple;
  else delete root.dataset.cxApple;
  root.style.setProperty('--cx-vw', `${info.width}px`);
  root.style.setProperty('--cx-vh', `${info.height}px`);
  return info;
}

export function subscribeDevice(onChange, win = typeof window !== 'undefined' ? window : null) {
  if (!win) return () => {};
  let last = '';
  const emit = () => {
    const info = detectDevice(win);
    const key = `${info.device}|${info.orient}|${info.band}|${info.width}|${info.height}`;
    if (key === last) return;
    last = key;
    applyDeviceToDocument(info, win.document);
    onChange?.(info);
  };
  emit();
  const onResize = () => emit();
  win.addEventListener('resize', onResize);
  win.addEventListener('orientationchange', onResize);
  win.visualViewport?.addEventListener('resize', onResize);
  win.visualViewport?.addEventListener('scroll', onResize);
  const mq = [
    win.matchMedia?.('(pointer: coarse)'),
    win.matchMedia?.('(hover: hover)'),
    win.matchMedia?.('(orientation: portrait)'),
  ].filter(Boolean);
  mq.forEach((m) => m.addEventListener?.('change', onResize));
  return () => {
    win.removeEventListener('resize', onResize);
    win.removeEventListener('orientationchange', onResize);
    win.visualViewport?.removeEventListener('resize', onResize);
    win.visualViewport?.removeEventListener('scroll', onResize);
    mq.forEach((m) => m.removeEventListener?.('change', onResize));
  };
}

export function useDeviceSurface() {
  const [info, setInfo] = useState(() =>
    typeof window === 'undefined' ? detectDevice(null) : detectDevice(window)
  );
  useEffect(() => subscribeDevice(setInfo), []);
  return info;
}
