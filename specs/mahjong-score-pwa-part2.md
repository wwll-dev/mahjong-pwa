# 麻雀計分 PWA — Part 2 Build Spec

**基準**：Part 1 已上 main — https://github.com/wwll-dev/mahjong-pwa ／ live https://wwll-dev.github.io/mahjong-pwa/  
**Part 1 spec**：`/workspace/specs/mahjong-score-pwa-part1.md`  
**參考圖**：`/workspace/specs/mahjong-part2-refs/01–04-*.jpg`  
**玩法範圍**：只做 **港麻＋跑馬仔**（參考圖台灣／日本／港式台麻 tab → **唔做**）  
**視覺**：結構跟參考（預設列表 → 玩法設定）；**延續 Part 1 深色**（唔跟參考淺色）  
**Stack**：維持 Vite + React + TS PWA；`localStorage`；純函式 + Vitest  
**唔寫 code（本文件只係 spec）**

---

## 0. Part 2 Scope 決策（對照參考圖）

| 功能 | 決策 | 理由 |
|------|------|------|
| 港麻預設列表（3番4／二五雞／五一／一二蚊 × 半辣／辣辣） | **IN** | 圖 01 核心 |
| 港麻玩法設定（人數、全／半銃、番區間、分數表、×自摸） | **IN** | 圖 02 |
| 跑馬仔預設（1/2…100/200、三人） | **IN** | 圖 03 |
| 跑馬仔設定（名稱、人數、槓／食糊／獎馬、記錄莊家） | **IN** | 圖 04；槓為 Part 1 未有 |
| 三人麻（3 players） | **IN** | 兩玩法都有三人預設 |
| 自訂玩法（＋增加玩法、命名、本地保存） | **IN** | 圖 01／03；只限港麻｜跑馬仔 |
| 紀錄莊家 | **IN** | Part 1 已有；設定 toggle 預設 **ON**（開咗先顯示莊／連莊／過莊） |
| 紀錄圈風 | **IN（簡）** | 圖 02「紀錄莊家及圈風」；見 §4.3 |
| 自摸分數 ×1.5（可調） | **IN** | 取代 Part 1 `selfDrawMultiplier` 對「每家付 S×mult」嘅舊模型；見 §5 |
| Jackpot | **UI IN／計分 OUT** | 圖 02 有 toggle；規則未見於圖 → persist + disabled scoring；Open Q1 |
| 鬥地主（追） | **UI IN／計分 OUT** | 圖 04 有 toggle；規則未見 → Open Q2 |
| 台／日／港式台麻 | **OUT** | Will／TOM 約束 |
| 翻馬牌動畫／完整番型表／雲同步／分享圖 | **OUT** | 維持手填番／手填中馬 |
| 一炮多響 | **OUT** | 同 Part 1 |
| 淺色 theme | **OUT** | 深色延續 Part 1 |

**對 Part 1 破壞性變更（要 migration）**

- 港麻：由 `S = fan × baseScore` → **查表** `discardScore(fan)`／`selfDrawPay(fan)`（半辣／辣辣曲線）。
- 跑馬仔：由單一 `baseScore` → **`kong`／`hu`／`horse` 三分**；記鋪要可記 **明槓**。
- `selfDrawMultiplier` → `selfDrawFactor`（預設 **1.5**，對食糊分）。
- Storage key → `mahjong-pwa:v2`；讀到 v1 session 可「只讀結算／棄用開新」或映射（見 §8）。

---

## 1. 畫面／Routes（相對 Part 1）

| ID | Route | 名 | Part 2 變更 |
|----|-------|----|-------------|
| S0 | `/` | Home | 不變 |
| S1a | `/rules` | 請選擇玩法 | **新**：取代舊 Setup 開頭；Tab 只顯示「香港麻雀」「碰槓牌(跑馬仔)」；預設列表＋自訂區＋「＋增加玩法」 |
| S1b | `/rules/edit` | 玩法設定 | **新**：由預設／自訂進入；港麻＝圖 02 結構；跑馬仔＝圖 04 結構；確定後 → 帶 `rules` 去 S1c |
| S1c | `/setup` | 開局（玩家） | **瘦身**：只留 玩家名 ×N、初始莊（若 recordDealer）、開枱 |
| S2 | `/table` | 枱面 | 支援 3／4 人；可選圈風 chip；跑馬仔快捷「記槓」 |
| S3 | `/hand` | 記一鋪 | 港麻：番 ∈ [minFan, maxFan]；跑馬仔：食糊／自摸／流局＋中馬；包自摸保留 |
| S3k | `/kong` 或 Hand 內 sheet | 記明槓 | **新（跑馬仔）** |
| S4 | `/settle` | 局結找數 | 人數 3／4 |

導航：S0 → S1a → S1b → S1c → S2 ⇄ S3／S3k → S4 → S0。

---

## 2. 每屏 UI（結構跟參考、深色皮）

### S1a 請選擇玩法
- Header：標題「請選擇玩法」＋關閉（回 S0）
- Tabs（僅 2）：`香港麻雀`｜`碰槓牌 (跑馬仔)`
- **自訂玩法**區：有則 list；無則 empty「未有自訂玩法」＋`＋增加玩法`（→ S1b 空白表，mode 鎖定當前 tab）
- **預設玩法**區：該 mode 嘅 built-in presets（§3）；行＝標題＋副標規則摘要＋chevron → S1b（載入該 preset）

### S1b 玩法設定 — 港麻
- 人數：`四人麻雀`｜`三人麻雀`
- 全銃／半銃
- 番數設定：雙 thumb `minFan`…`maxFan`（可選範圍 1–13；預設 3–8）
- 即時分數表三欄：`番`｜`食糊分數`｜`自摸分數`（header badge `×{selfDrawFactor}`，預設 1.50）
- 曲線：`halfDouble`（半辣上）｜`fullDouble`（辣辣上）— 由 preset 帶入；自訂可改
- `起糊分` startScore（preset 寫死；自訂可編）
- Jackpot：toggle（預設 OFF；**開咗唔改分數**，只存 flag）
- 紀錄莊家及圈風：toggle（預設 ON）
- 玩法名稱（自訂／另存時必填）
- CTA「確定」→ S1c；可「另存為自訂」

### S1b 玩法設定 — 跑馬仔
- 玩法名稱
- 人數：四人｜三人
- 分數：`槓`／`食糊`／`獎馬`（正整數）
- 記錄莊家：toggle（預設 ON）
- 鬥地主（追）：toggle（預設 OFF；**開咗唔改分數**）
- 保留 Part 1：`baoSelfDraw`（包自摸）toggle（預設 ON；參考圖無但 Part 1 已有——見 Open Q3）
- `horseCountMax`（記鋪中馬上限，預設 8；參考圖無明確 UI，可收進進階或固定 8）

### S1c 開局玩家
- N 個名（N＝rules.playerCount）
- 初始莊（若 recordDealer）
- 「開枱」

### S2／S3／S3k／S4
- 同 Part 1 互動模型；人數改為 `playerCount`
- 跑馬仔 Table 加「記槓」→ 選誰槓（明槓）；可選誰打出（點槓）— Part 2 **只實作明槓：其餘各付 `kong` 分**（見 §5.2）；暗槓／加槓 Open Q4
- 圈風：若 `recordWind`：顯示 東／南／西／北圈；莊連走完一輪（每人做過莊且過莊）→ 下一個風（簡規 §4.3）

---

## 3. Presets 數值（寫死）

### 3.1 港麻 `HongKongPreset`

共通：`chongMode: 'full'`（列表副標皆全銃；設定頁可改）、`minFan: 3`、`maxFan: 8`、`selfDrawFactor: 1.5`。

| id | name | curve | startScore | 副標摘要 | playerCount |
|----|------|-------|------------|----------|-------------|
| hk-3f4-half | 3番4 半辣上 | halfDouble | 4 | 全銃 · 3番起糊4 · 8番滿糊32 | 4 |
| hk-3f4-full | 3番4 辣辣上 | fullDouble | 4 | 全銃 · 3番起糊4 · 8番滿糊128 | 4 |
| hk-25-half | 二五雞 半辣上 | halfDouble | 8 | 全銃 · 3番起糊8 · 8番滿糊64 | 4 |
| hk-25-full | 二五雞 辣辣上 | fullDouble | 8 | 全銃 · 3番起糊8 · 8番滿糊256 | 4 |
| hk-51-half | 五一 半辣上 | halfDouble | 16 | 全銃 · 3番起糊16 · 8番滿糊128 | 4 |
| hk-51-full | 五一 辣辣上 | fullDouble | 16 | 全銃 · 3番起糊16 · 8番滿糊512 | 4 |
| hk-12-half | 一二蚊 半辣上 | halfDouble | 32 | 全銃 · 3番起糊32 · 8番滿糊256 | 4 |
| hk-12-full | 一二蚊 辣辣上 | fullDouble | 32 | 全銃 · 3番起糊32 · 8番滿糊1024 | 4 |
| hk-3f4-half-3p | 3番4 半辣上 (三人) | halfDouble | 3 | 三麻 · 全銃 · 3番起糊3 · 8番滿糊24 | 3 |

驗算滿糊：`discardScore(maxFan)` 須等於表列「滿糊」值（§5.1）。

### 3.2 跑馬仔 `PaoMaPreset`

| id | name | kong | hu | horse | playerCount | 副標 |
|----|------|------|----|-------|-------------|------|
| pm-1-2 | 1/2 | 1 | 2 | 2 | 4 | 明槓每位1 · 自模2 |
| pm-5-10 | 5/10 | 5 | 10 | 10 | 4 | 明槓每位5 · 自模10 |
| pm-10-20 | 10/20 | 10 | 20 | 20 | 4 | … |
| pm-50-100 | 50/100 | 50 | 100 | 100 | 4 | … |
| pm-100-200 | 100/200 | 100 | 200 | 200 | 4 | … |
| pm-1-2-3p | 1/2 (三人) | 1 | 2 | 2 | 3 | 三麻 · 明槓每位1 · 自模2 |

註：預設 `horse = hu`（同圖 04 嘅 1/2 → 獎馬 2）；用戶可喺設定改。

---

## 4. 資料模型（v2）

```ts
type PlayerId = string;
type Curve = 'halfDouble' | 'fullDouble';

interface Player {
  id: PlayerId;
  name: string;
  score: number;
  seatIndex: number; // 0..playerCount-1
}

interface HongKongRules {
  mode: 'hongkong';
  name: string;
  playerCount: 3 | 4;
  chongMode: 'full' | 'half';
  minFan: number;
  maxFan: number;
  startScore: number;
  curve: Curve;
  selfDrawFactor: number; // default 1.5
  jackpotEnabled: boolean; // UI only Part 2
  recordDealer: boolean;
  recordWind: boolean;
}

interface PaoMaRules {
  mode: 'paoma';
  name: string;
  playerCount: 3 | 4;
  kong: number;
  hu: number;
  horse: number;
  horseCountMax: number; // default 8
  baoSelfDraw: boolean;
  recordDealer: boolean;
  douDiZhuEnabled: boolean; // UI only Part 2
}

type Rules = HongKongRules | PaoMaRules;

type Wind = 'E' | 'S' | 'W' | 'N';

interface HandRecord {
  id: string;
  index: number;
  kind: 'win' | 'draw' | 'kong';
  // win
  winnerId?: PlayerId;
  winType?: 'discard' | 'selfDraw';
  discarderId?: PlayerId;
  baoPlayerId?: PlayerId;
  fan?: number;
  horsesHit?: number;
  // kong
  kongPlayerId?: PlayerId;
  // common
  deltas: Record<PlayerId, number>;
  dealerIdBefore: PlayerId;
  dealerIdAfter: PlayerId;
  dealerStreakBefore: number;
  dealerStreakAfter: number;
  windBefore?: Wind;
  windAfter?: Wind;
  createdAt: string;
}

interface Session {
  id: string;
  version: 2;
  rules: Rules;
  players: Player[];
  dealerId: PlayerId;
  dealerStreak: number;
  wind: Wind; // 啟用 recordWind 先有意義；否則可固定 'E'
  windsCompleted: number; // 已完成幾圈（可選顯示）
  hands: HandRecord[];
  startingScores: Record<PlayerId, number>;
  status: 'active' | 'settled';
  updatedAt: string;
}

interface CustomPreset {
  id: string;
  rules: Rules;
  createdAt: string;
}
```

**Storage**
- `mahjong-pwa:v2:session`
- `mahjong-pwa:v2:customPresets`（CustomPreset[]）

分數真相：繼續 fold `hands[].deltas`。

---

## 5. Scoring Math（可測）

### 5.1 港麻分數表

```ts
const HALF_MULT = [1, 2, 3, 4, 6, 8]; // index = fan - minFan；適用 maxFan-minFan === 5（3–8）

function discardScore(fan, rules: HongKongRules): number {
  assert(fan >= rules.minFan && fan <= rules.maxFan);
  const i = fan - rules.minFan;
  if (rules.curve === 'fullDouble') return rules.startScore * (2 ** i);
  // halfDouble：通用化——若 i < HALF_MULT.length 用表；否則推斷
  // 對標準 3–8：HALF_MULT[i] * startScore
  return rules.startScore * halfDoubleMultiplier(i);
}

/** 半辣上倍率：0→1, 1→2, 2→3, 3→4, 4→6, 5→8；之後每 +2 index 再 ×2 循環形態 */
function halfDoubleMultiplier(i: number): number {
  if (i < 0) throw new Error('fan < min');
  if (i <= 5) return [1, 2, 3, 4, 6, 8][i];
  // 延伸：以每兩級 ×2 嘅半辣模式
  const base = halfDoubleMultiplier(i - 2);
  return base * 2;
}

function selfDrawPayPerLoser(fan, rules): number {
  // 四捨五入到整數（銀行家？→ 用 Math.round）
  return Math.round(discardScore(fan, rules) * rules.selfDrawFactor);
}
```

**驗算表（必須 Vitest）**

| preset | fan3 | fan4 | fan5 | fan6 | fan7 | fan8 |
|--------|------|------|------|------|------|------|
| 3番4 半辣 | 4 | 8 | 12 | 16 | 24 | 32 |
| 3番4 辣辣 | 4 | 8 | 16 | 32 | 64 | 128 |
| 二五雞 半辣 | 8 | 16 | 24 | 32 | 48 | 64 |
| 二五雞 辣辣 | 8 | 16 | 32 | 64 | 128 | 256 |
| 五一 半辣 | 16 | 32 | 48 | 64 | 96 | 128 |
| 五一 辣辣 | 16 | 32 | 64 | 128 | 256 | 512 |
| 一二蚊 半辣 | 32 | 64 | 96 | 128 | 192 | 256 |
| 一二蚊 辣辣 | 32 | 64 | 128 | 256 | 512 | 1024 |
| 3番4 半辣三人 | 3 | 6 | 9 | 12 | 18 | 24 |

自摸（factor 1.5）例：二五雞辣辣 fan3 → 食糊 8，自摸每位 `round(8*1.5)=12`（對齊圖 02）。

#### 出銃付款（`others = playerCount - 2` 名非胡非銃）

**全銃**：D `-S`；W `+S`；其餘 0。`S = discardScore(fan)`。

**半銃**（繼承 Part 1，改用 S）：  
`dPay = ceil(S/2)`，`rest = S - dPay`；其餘按 seatIndex 升序分 `rest`（O1=`ceil(rest/2)` …）。

#### 自摸付款

`pay = selfDrawPayPerLoser(fan)`  
每名非胡 `-pay`；W `+(playerCount-1)*pay`。  
（3 人桌：兩家付；4 人桌：三家付。）

Jackpot enabled：**唔改以上 deltas**（Part 2）。

### 5.2 跑馬仔

令 `H = horsesHit * rules.horse`（`0 ≤ horsesHit ≤ horseCountMax`）。

#### 明槓 `kind:'kong'`
每名非槓者 `-kong`；槓者 `+(playerCount-1)*kong`。  
**唔改莊／風**（除非 Open Q4 另定）。

#### 出銃食糊
D `-(hu + H)`；W `+(hu + H)`；其餘 0。

#### 自摸（無包）
每非胡 `-(hu + H)`；W `+(playerCount-1)*(hu + H)`。

#### 自摸 + 包
B `-(playerCount-1)*(hu + H)`；其餘非胡 0；W 收同等總額。

鬥地主 enabled：**唔改 deltas**（Part 2）。

### 5.3 莊／風／流局

若 `!recordDealer`：唔顯示莊；流局／食糊都唔改 dealer 欄位（可內部固定 seat 0）。

若 `recordDealer`（預設 ON）：
- 流局：dealer 不變；`dealerStreak += 1`
- 胡：winner===dealer → streak+1；否則過莊 `nextSeat`，streak=0

若 `recordWind`（港麻設定；跑馬仔無此項則 false）：
- 初始 wind＝東
- 每次「過莊」且新莊嘅 `seatIndex === 0`（回到開局東位玩家做莊）→ 風推下一檔（E→S→W→N→E），`windsCompleted++`
- 連莊唔轉風  
（簡規；Open Q5 可改「每 4 次過莊」計）

### 5.4 Undo／找數
同 Part 1；`kind:'kong'` 一併可 Undo。

---

## 6. 建議模組

```
src/domain/
  presets/hongkong.ts
  presets/paoma.ts
  score/hongkongCurve.ts   // discardScore, selfDrawPayPerLoser
  score/hongkongPay.ts
  score/paomaPay.ts
  dealer.ts                  // + wind
  settle.ts
src/state/
  sessionStore.ts            // v2 + migrate
  customPresetsStore.ts
src/screens/
  RulePicker, RuleSettings, Setup, Table, Hand, KongSheet, Settle, Home
```

---

## 7. Vitest 清單（最低）

1. 所有 §3.1 預設 fan3–8 `discardScore` 對表。  
2. 二五雞辣辣 + factor1.5 → fan3 selfDrawPay=12；表列 12,24,48,96,192,384。  
3. 全銃／半銃 4 人；半銃 S=3 → D-2 其餘合計 -1。  
4. 自摸 4 人／3 人付款人數。  
5. 跑馬仔明槓 4 人 kong=1 → 槓者 +3，各 −1。  
6. 跑馬仔出銃 hu=2 hit=1 horse=2 → D-4 W+4。  
7. 包自摸 3 人：B 付 `2*(hu+H)`。  
8. 過莊轉風：seat 3 胡 → 新莊 seat0 → wind E→S。  
9. Undo kong + win。  
10. customPresets 增刪讀寫（unit／store mock）。

---

## 8. Migration

- 讀 `v1:session`：Home 提示「舊局只可找數／或丟棄」；**唔自動用舊公式繼續記鋪**。  
- 新局一律 v2。  
- Part 1 AC 公式測試可留在 `hongkong.legacy.ts` 或刪（由實作者定；唔阻 Part 2）。

---

## 9. Acceptance Criteria（Pixel／cloud agent 收貨）

1. RulePicker 只有港麻｜跑馬仔兩 tab；台／日入口唔存在。  
2. 九個港麻＋六個跑馬仔預設可選，副標同 §3。  
3. 進入港麻設定可見人數、全／半銃、番 slider、分數表隨 curve／start／factor 即時更新；對齊 §5.1 表。  
4. 自摸欄 badge 顯示 ×selfDrawFactor；預設 1.50。  
5. 三人預設開局只有 3 個座位／分數卡。  
6. 跑馬仔設定可改槓／食糊／獎馬；枱面可記明槓且分數正確。  
7. 食糊／自摸／流局／Undo／找數喺 3／4 人下正確。  
8. 自訂玩法可另存、列表出現、可再編輯；只存 localStorage。  
9. Jackpot／鬥地主 toggle 可開關並寫入 rules；**唔影響** deltas。  
10. 深色 UI；PWA 仍然可加主畫面。  
11. Vitest §7 全綠。  
12. 唔引入台／日模式 code path（無 dead tab）。

---

## 10. Open Questions（回 TOM／Will）

1. **Jackpot**：要唔要 Part 2.1 做池（滿糊觸發、莊家抽成等）？而家只留 toggle。  
2. **鬥地主（追）**：追嘅觸發同倍數點算？而家只留 toggle。  
3. **包自摸**：參考圖無；Part 2 預設保留 Part 1 toggle —— 要隱藏定留？  
4. **暗槓／加槓／點槓**：Part 2 只做「明槓每位付 kong」；要唔要擴？  
5. **圈風簡規**（返到 seat0 先轉風）是否 OK？  
6. **半辣倍率表** `[1,2,3,4,6,8]` 已對齊参考滿糊數字；若 Will 嘅茶樓習慣不同（例如 4,4,8,8,16,16）要講。  
7. **自摸 factor** 參考係 1.5；Part 1 用過每家 ×2——確認全面改 1.5 查表模型。

---

## 11. 交付

- 本檔：`/workspace/specs/mahjong-score-pwa-part2.md`  
- 參考圖目錄：`/workspace/specs/mahjong-part2-refs/`  
- 無新 Figma；無 code  
