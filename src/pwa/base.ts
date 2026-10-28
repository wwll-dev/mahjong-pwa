/** Vite `base`, always `/` or a leading-and-trailing-slash path such as `/mahjong-pwa/`. */
export function normalizeBase(raw: string | undefined): string {
  if (!raw || raw === '/' || raw === './') return '/';
  let value = raw.trim();
  if (!value.startsWith('/')) value = `/${value}`;
  if (!value.endsWith('/')) value = `${value}/`;
  return value;
}

/** React Router basename has no trailing slash. Root hosting uses the default. */
export function routerBasename(baseUrl: string): string | undefined {
  const base = normalizeBase(baseUrl);
  if (base === '/') return undefined;
  return base.slice(0, -1);
}

/** Pathnames the service worker may answer with the precached shell. */
export function navigationAllowlist(base: string): RegExp[] {
  const prefix = base === '/' ? '' : base.replace(/\/$/, '');
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [
    new RegExp(`^${escaped}/$`),
    new RegExp(`^${escaped}/rules$`),
    new RegExp(`^${escaped}/rules/edit$`),
    new RegExp(`^${escaped}/setup$`),
    new RegExp(`^${escaped}/table$`),
    new RegExp(`^${escaped}/hand$`),
    new RegExp(`^${escaped}/kong$`),
    new RegExp(`^${escaped}/settle$`),
    new RegExp(`^${escaped}/legacy$`),
    new RegExp(`^${escaped}/history$`),
    new RegExp(`^${escaped}/history/[^/]+$`),
  ];
}
