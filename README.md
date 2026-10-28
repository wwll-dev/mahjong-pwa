# 麻雀計分

無廣告 iPhone PWA，計 **香港麻雀** 同 **碰槓牌（跑馬仔）**。先揀預設或自訂玩法，再填玩家名開枱。分數留喺呢部機嘅 `localStorage`，無帳號、無後端。

- 新局：`mahjong-pwa:v3:session`（讀到 v2 會喺下次寫入時升上 v3）
- 歷史：`mahjong-pwa:v3:history`（最多 50 局）
- 自訂玩法：`mahjong-pwa:v3:customPresets`
- Part 1 舊局（`mahjong-pwa:v1:session`）只可以找數或者丟棄，唔會用新分數表續鋪。

規格：[`specs/mahjong-score-pwa-part2.md`](specs/mahjong-score-pwa-part2.md)（Part 1：[`specs/mahjong-score-pwa-part1.md`](specs/mahjong-score-pwa-part1.md)）

## 開發

```bash
npm install
npm test
npm run dev
npm run build
npm run preview
```

iPhone Safari：分享 → 加入主畫面。App 以獨立畫面開，深色 `theme-color`。

## GitHub Pages

Push 去 `main` 會跑 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)：`npm test`，再用 `VITE_BASE=/mahjong-pwa/` build，部署 `dist`。

網站：https://wwll-dev.github.io/mahjong-pwa/

第一次之前，repo **Settings → Pages → Build and deployment → Source** 要揀 **GitHub Actions**。`dist/404.html` 係 `index.html` 嘅副本，未裝 service worker 之前直接開子 route 都返到殼。

## 範圍

Part 2 做港麻分數表（半辣／辣辣、自摸 ×1.5）、跑馬仔槓／食糊／獎馬、三人桌、自訂玩法、圈風，同明槓。Part 3 加歷史、港麻番表、跑馬仔翻馬、Jackpot 真池，同明槓／暗槓／加槓／點槓。鬥地主（追）仍然只係開關。唔做台麻、日麻、語音、一炮多響、雲同步、分享圖或廣告。
