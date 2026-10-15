export function appHref(rel = '/') {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const clean = rel.startsWith('/') ? rel : `/${rel}`;
  return `${base}${clean === '/' ? '/' : clean}`;
}

export function goPath(rel = '/') {
  window.history.pushState({}, '', appHref(rel));
  window.dispatchEvent(new PopStateEvent('popstate'));
}
