# 麻雀計分

無廣告 iPhone PWA，計 **港麻** 同 **跑馬仔**。開局揀一種玩法，整局鎖定。分數留喺呢部機嘅 `localStorage`（`mahjong-pwa:v1:session`），無帳號、無後端。

規格：[`specs/mahjong-score-pwa-part1.md`](specs/mahjong-score-pwa-part1.md)

## 開發

```bash
npm install
npm test
npm run dev
npm run build
npm run preview
```

iPhone Safari：分享 → 加入主畫面。App 以獨立畫面開，深色 `theme-color`。五條 route（`/`、`/setup`、`/table`、`/hand`、`/settle`）由預快取殼離線打開。

## 範圍

Part 1 只做四人、起始 0 分、手計番（港麻）同手填中馬數（跑馬仔）。唔做翻馬動畫、番表、一炮多響、台麻、日麻、Jackpot、雲同步、分享圖、歷史統計、廣告或帳號。
