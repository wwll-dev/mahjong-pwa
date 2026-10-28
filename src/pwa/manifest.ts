export const APP_ROUTES = [
  '/',
  '/rules',
  '/rules/edit',
  '/setup',
  '/table',
  '/hand',
  '/kong',
  '/settle',
  '/legacy',
] as const;

export const manifest = {
  name: '麻雀計分',
  short_name: '麻雀計分',
  description: '港麻同跑馬仔計分，無廣告。',
  lang: 'zh-Hant',
  display: 'standalone' as const,
  orientation: 'portrait' as const,
  background_color: '#0c1210',
  theme_color: '#0c1210',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
