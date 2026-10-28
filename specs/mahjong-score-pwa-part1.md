# 麻雀計分 PWA — Part 1 Build Spec

**產品**：無廣告 iPhone PWA  
**玩法**：港麻 ｜ 跑馬仔（開局二選一，整局鎖定）  
**Stack**：Vite + React + TypeScript + PWA（`vite-plugin-pwa`）；`localStorage`；深色友善  
**唔做（Part 1）**：Jackpot、一炮多響、>4 人、雲同步、分享圖、歷史統計頁、台麻／日麻、廣告、帳號、完整番表、翻馬牌動畫

**假設／缺漏**

| 項 | 寫死 |
|---|---|
| 人數 | 4 |
| 起始分 | 全 0 |
| 風位 UI | 只標「莊」＋連莊次數；座位 0→1→2→3 順時過莊 |
| 港麻番 | 玩家手計後輸入正整數「番」；`S = fan × baseScore` |
| 跑馬仔獎馬 | Setup 設總馬數 0–8；記鋪時手填「中幾隻」；唔做翻牌 |
| 包自摸 | 只跑馬仔；記鋪自摸時必選包家 |
| 連莊加台 | Part 1 **唔**自動加番；只改莊家標記 |
| 半銃／自摸公式 | 見 §4（可單測） |

缺漏 → Part 2：內建番表、翻馬、語音、歷史。

---

## 1. 畫面清單

| ID | Route | 名 | 目的 |
|----|-------|----|------|
| S0 | `/` | Home | 新開局／繼續未完局 |
| S1 | `/setup` | 開局設定 | 玩法、名、莊、規則 |
| S2 | `/table` | 枱面 | 分數板、Undo、記鋪／結束 |
| S3 | `/hand` | 記一鋪 | 食糊或流局入帳 |
| S4 | `/settle` | 局結找數 | 淨額＋（可選）兩兩找數 |

導航：S0→S1→S2；S2⇄S3；結束→S4→清局回 S0。iPhone safe-area；無漢堡／無 Search。

---

## 2. 每屏元件／狀態

### S0 Home
- AppTitle
- `BtnPrimary`「新開局」→ S1
- `BtnSecondary`「繼續」— 僅 `session.status === 'active'`
- 一行版本／免責
- State：`hasActiveSession`

### S1 Setup
- Segmented：`港麻` | `跑馬仔`
- 4× 名（預設「玩家1–4」或東南西北；非空、互異）
- `DealerPicker`（初始莊）
- 共用：`baseScore` number > 0（**預設 1**）
- **港麻**：`chongMode`: `full`｜`half`（預設 `full`）；`selfDrawMultiplier` number ≥ 1（**預設 2**）
- **跑馬仔**：`horseCount` 0–8（預設 0）；`horseUnit`（預設＝`baseScore`）；`baoSelfDraw` bool（預設 true）
- CTA「開枱」→ 建 `Session` → S2

### S2 Table
- Header：玩法 chip、第 N 鋪、`Undo`（`hands.length > 0`）
- `ScoreBoard`×4：名、score、`莊`、`連×k`（k>0 先顯示）
- `LastHandSummary`（可空）
- `BtnPrimary`「記一鋪」→ S3
- `BtnDanger`「結束並找數」→ confirm → S4

### S3 Hand
- Outcome：`食糊` | `流局`
- 食糊：
  - `WinnerPicker`（1 人）
  - `WinType`：`出銃` | `自摸`
  - 出銃 → `DiscarderPicker`（≠ winner）
  - 港麻 → `fan` ≥ 1；即時 preview deltas
  - 跑馬仔 → `horsesHit` 0…horseCount；preview
  - 跑馬仔自摸 + `baoSelfDraw` → 必選 `baoPlayerId`（≠ winner）
- CTA「確認入帳」／「取消」
- 校驗：唔准 winner＝discarder；唔提供多贏家

### S4 Settle
- 四人 `net = score - startingScore`
- 可選 `PairwisePayList`（greedy 消債，整數）
- 「完成（清局）」→ 刪 session → S0
- 「返回枱面」→ 唔清 storage

---

## 3. 資料模型

```ts
type PlayerId = string;

interface Player {
  id: PlayerId;
  name: string;
  score: number;
  seatIndex: 0 | 1 | 2 | 3;
}

interface HongKongRules {
  mode: 'hongkong';
  baseScore: number;
  chongMode: 'full' | 'half';
  selfDrawMultiplier: number;
}

interface PaoMaRules {
  mode: 'paoma';
  baseScore: number;
  horseCount: number;
  horseUnit: number;
  baoSelfDraw: boolean;
}

type Rules = HongKongRules | PaoMaRules;

interface HandRecord {
  id: string;
  index: number; // 1-based
  outcome: 'win' | 'draw';
  winnerId?: PlayerId;
  winType?: 'discard' | 'selfDraw';
  discarderId?: PlayerId;
  baoPlayerId?: PlayerId;
  fan?: number;
  horsesHit?: number;
  deltas: Record<PlayerId, number>;
  dealerIdBefore: PlayerId;
  dealerIdAfter: PlayerId;
  dealerStreakBefore: number;
  dealerStreakAfter: number;
  createdAt: string;
}

interface Session {
  id: string;
  rules: Rules;
  players: Player[];
  dealerId: PlayerId;
  dealerStreak: number; // 新莊 0；每連莊 +1
  hands: HandRecord[];
  startingScores: Record<PlayerId, number>; // 全 0
  status: 'active' | 'settled';
  updatedAt: string;
}
```

**Storage**：`localStorage['mahjong-pwa:v1:session']`  
**分數真相**：`startingScores` + fold `hands[].deltas`（Undo = pop last + 重算）。

---

## 4. 結算規則（寫死、可測）

### 4.0 莊家／流局（兩種玩法共用）

- **流局**：全員 delta 0；`dealer` 不變；`dealerStreak += 1`。
- **食糊後**：
  - `winnerId === dealerId` → 連莊：`dealer` 不變，`dealerStreak += 1`
  - 否則過莊：`dealer = nextSeat(dealer)`（seatIndex+1 mod 4），`dealerStreak = 0`

### 4.1 港麻

`S = fan * baseScore`（整數）。

#### 出銃 · 全銃 `full`
| 角色 | delta |
|------|-------|
| W 胡 | `+S` |
| D 銃 | `-S` |
| 其餘 | `0` |

#### 出銃 · 半銃 `half`
令 `dPay = ceil(S / 2)`，`rest = S - dPay`。  
其餘兩家按 `seatIndex` 升序為 O1、O2：  
`o1Pay = ceil(rest / 2)`，`o2Pay = rest - o1Pay`。

| 角色 | delta |
|------|-------|
| W | `+S` |
| D | `-dPay` |
| O1 | `-o1Pay` |
| O2 | `-o2Pay` |

例：S=3 → D-2，O1-1，O2-0，W+3。  
例：S=4 → D-2，O1-1，O2-1，W+4。

#### 自摸
`pay = S * selfDrawMultiplier`  
每名非胡者 `-pay`；W `+(3 * pay)`。  
例：fan=2, base=1, mult=2 → pay=4；三人各 −4；W +12。

### 4.2 跑馬仔

基本糊分 `S = baseScore`（唔輸入番）。  
馬分 `H = horsesHit * horseUnit`（`horsesHit` ∈ 0…horseCount）。

#### 出銃
| 角色 | delta |
|------|-------|
| W | `+(S + H)` |
| D | `-(S + H)` |
| 其餘 | `0` |

例：base=1, hit=2, unit=1 → D-3，W+3。

#### 自摸 · 無包（`baoSelfDraw === false` 或未開）
每名非胡 `-(S + H)`；W `+3*(S + H)`。

#### 自摸 · 包自摸（`baoSelfDraw === true`）
必選包家 B ≠ W：  
`B: -3*(S + H)`；其餘兩家 `0`；`W: +3*(S + H)`。

### 4.3 Undo
Pop 最後 `HandRecord`；由剩餘 hands 重算 score／dealer／streak。

### 4.4 找數
`net[p] = score[p] - startingScores[p]`。  
Pairwise（可選）：greedy 配最大正同最大負直至清零。

---

## 5. UI／PWA（Pixel）

- `manifest` + standalone；可加至 iPhone 主畫面；`theme-color` 深色
- 深色預設；主文字對比 ≥ 4.5:1；輸入 ≥ 16px
- CTA 觸控 ≥ 44×44 pt
- 離線 shell：五條 route 預快取
- 無後端、無廣告；系統字即可
- **唔使 Figma**；簡潔牌桌風（深底、莊金色標）

建議模組：

```
src/domain/{types,hongkong,paoma,dealer,settle}.ts   // pure + Vitest
src/state/sessionStore.ts
src/screens/{Home,Setup,Table,Hand,Settle}.tsx
```

---

## 6. Acceptance Criteria（交 Pixel 收貨）

1. Setup 可選港麻／跑馬仔＋規則；開枱後四人 0 分、莊標正確。
2. 港麻全銃：fan=3, base=1 → W+3, D-3, O 0。
3. 港麻半銃：fan=3, base=1 → W+3, D-2, 其餘合計 -1（按 seat 分）。
4. 港麻自摸：fan=2, base=1, mult=2 → 非胡各 -4，W +12。
5. 連莊／過莊／流局行為符合 §4.0。
6. 跑馬仔出銃：S=1,H=2 → D-3,W+3。
7. 跑馬仔包自摸：B 付滿 `3*(S+H)`，另兩家 0。
8. Undo 還原分數同莊狀態。
9. 找數 net 正確；清局後 Home 無「繼續」。
10. 刷新頁面後 active session 由 localStorage 恢復。
11. PWA manifest 可加主畫面；深色可讀。
12. UI 唔允許一炮多響、winner＝discarder。

---

## 7. 交付物

- 本檔：`/workspace/specs/mahjong-score-pwa-part1.md`
- 無 Figma（按 Will／TOM 指示慳 token）
- TOM forward Pixel 實作；收貨對 §6
