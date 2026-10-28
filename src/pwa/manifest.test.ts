import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_ROUTES, manifest, navigateFallbackAllowlist } from './manifest';

function channel(hex: string, index: number): number {
  const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const normalized = hex.replace('#', '');
  const red = channel(normalized, 0);
  const green = channel(normalized, 2);
  const blue = channel(normalized, 4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function cssVar(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match?.[1]) throw new Error(`missing ${name}`);
  return match[1];
}

describe('pwa shell', () => {
  it('exposes a dark standalone manifest and precaches the five routes', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#0c1210');
    expect(manifest.background_color).toBe('#0c1210');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512', '512x512']);
    expect(luminance(manifest.theme_color)).toBeLessThan(0.05);
    for (const route of APP_ROUTES) {
      expect(navigateFallbackAllowlist.some((pattern) => pattern.test(route))).toBe(true);
    }
    expect(navigateFallbackAllowlist.some((pattern) => pattern.test('/history'))).toBe(false);
    for (const file of [
      'public/icons/icon-192.png',
      'public/icons/icon-512.png',
      'public/icons/icon-512-maskable.png',
      'public/icons/apple-touch-icon.png',
    ]) {
      expect(existsSync(file)).toBe(true);
    }
  });

  it('marks the document for an iPhone home-screen install', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('name="theme-color" content="#0c1210"');
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('apple-touch-icon');
    expect(html).toContain('lang="zh-Hant"');
  });

  it('keeps dark text and touch targets readable', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const bg = cssVar(css, '--bg');
    const raised = cssVar(css, '--bg-raised');
    const pairs = [
      [cssVar(css, '--text'), bg],
      [cssVar(css, '--text-dim'), bg],
      [cssVar(css, '--text'), raised],
      [cssVar(css, '--text-dim'), raised],
      [cssVar(css, '--primary-ink'), cssVar(css, '--primary')],
      [cssVar(css, '--gold-ink'), cssVar(css, '--gold')],
      [cssVar(css, '--danger-ink'), cssVar(css, '--danger')],
      [cssVar(css, '--positive'), bg],
      [cssVar(css, '--negative'), bg],
      [cssVar(css, '--positive'), raised],
      [cssVar(css, '--negative'), raised],
    ];
    for (const [foreground, background] of pairs) {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(css).toMatch(/font-size:\s*16px/);
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toMatch(/min-width:\s*44px/);
    expect(css).toContain('safe-area-inset');
  });
});
