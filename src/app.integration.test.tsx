import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from './App';
import { RulesDraftProvider } from './state/rulesDraft';
import { SessionProvider } from './state/sessionStore';
import { LEGACY_SESSION_STORAGE_KEY, SESSION_STORAGE_KEY } from './state/storage';

function renderApp(path = '/') {
  return render(
    <SessionProvider>
      <RulesDraftProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </RulesDraftProvider>
    </SessionProvider>,
  );
}

function preset(title: string) {
  const match = screen.getAllByRole('button').find(
    (button) => button.querySelector('.preset-title')?.textContent === title,
  );
  if (!match) throw new Error(`missing preset ${title}`);
  return match;
}

async function openPicker(user: UserEvent) {
  renderApp();
  await user.click(screen.getByRole('link', { name: '新開局' }));
  await screen.findByRole('heading', { name: '請選擇玩法' });
}

async function openPreset(user: UserEvent, title: string) {
  await user.click(preset(title));
  await screen.findByRole('heading', { name: '玩法設定' });
}

async function confirmRules(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: '確定' }));
  await screen.findByRole('heading', { name: '開局' });
}

async function openTable(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: '開枱' }));
  await screen.findByRole('heading', { name: '枱面' });
}

function radio(groupName: string, player: string) {
  return within(screen.getByRole('radiogroup', { name: groupName })).getByRole('radio', { name: player });
}

function card(name: string) {
  return screen.getByRole('article', { name });
}

function previewRow(name: string) {
  const row = within(screen.getByRole('region', { name: '本鋪預覽' })).getByText(name).closest('li');
  if (!row) throw new Error(`missing preview row ${name}`);
  return row;
}

function scoreRows(): string[][] {
  const table = screen.getByRole('table', { name: '分數表' });
  return within(table).getAllByRole('row').slice(1).map((row) => (
    within(row).getAllByRole('cell').map((cell) => cell.textContent ?? '')
  ));
}

describe('rule picker and settings', () => {
  it('offers only hong kong and pao ma, with the built-in subtitles', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: '香港麻雀' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: /台灣|日本|台麻/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/台灣|日本|台麻/);
    expect(screen.getByText('未有自訂玩法')).toBeInTheDocument();
    const presets = within(screen.getByRole('region', { name: '預設玩法' })).getAllByRole('button');
    expect(presets).toHaveLength(9);
    expect(preset('3番4 半辣上')).toHaveTextContent('全銃 · 3番起糊4 · 8番滿糊32');
    expect(preset('一二蚊 辣辣上')).toHaveTextContent('全銃 · 3番起糊32 · 8番滿糊1024');
    expect(preset('3番4 半辣上 (三人)')).toHaveTextContent('三麻 · 全銃 · 3番起糊3 · 8番滿糊24');

    await user.click(screen.getByRole('tab', { name: '碰槓牌 (跑馬仔)' }));
    const paoMa = within(screen.getByRole('region', { name: '預設玩法' })).getAllByRole('button');
    expect(paoMa).toHaveLength(6);
    expect(preset('1/2')).toHaveTextContent('明槓每位1 · 自模2');
    expect(preset('100/200')).toHaveTextContent('明槓每位100 · 自模200');
    expect(preset('1/2 (三人)')).toHaveTextContent('三麻 · 明槓每位1 · 自模2');
  });

  it('updates the hong kong score table from the curve, stake, and self-draw factor', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await openPreset(user, '二五雞 辣辣上');
    expect(screen.getByText('×1.50')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '辣辣上' })).toHaveAttribute('aria-checked', 'true');
    expect(scoreRows()).toEqual([
      ['3', '8', '12'],
      ['4', '16', '24'],
      ['5', '32', '48'],
      ['6', '64', '96'],
      ['7', '128', '192'],
      ['8', '256', '384'],
    ]);
    await user.click(screen.getByRole('radio', { name: '半辣上' }));
    expect(scoreRows().map((row) => row[1])).toEqual(['8', '16', '24', '32', '48', '64']);
    const factor = screen.getByRole('textbox', { name: '自摸倍數' });
    await user.clear(factor);
    await user.type(factor, '2');
    expect(screen.getByText('×2.00')).toBeInTheDocument();
    expect(scoreRows()[0]).toEqual(['3', '8', '16']);
    fireEvent.change(screen.getByRole('slider', { name: '滿糊番' }), { target: { value: '5' } });
    expect(screen.getByText('5番滿糊')).toBeInTheDocument();
    expect(scoreRows().map((row) => row[0])).toEqual(['3', '4', '5']);
  });

  it('saves, lists, edits, and deletes a custom ruleset', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await user.click(screen.getByRole('tab', { name: '碰槓牌 (跑馬仔)' }));
    await user.click(screen.getByRole('button', { name: '＋增加玩法' }));
    const name = await screen.findByRole('textbox', { name: '玩法名稱' });
    await user.type(name, '我的跑馬');
    const kong = screen.getByRole('textbox', { name: '槓' });
    await user.clear(kong);
    await user.type(kong, '7');
    await user.click(screen.getByRole('button', { name: '另存為自訂' }));
    expect(screen.getByText('已儲存到自訂玩法')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByText('未有自訂玩法')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '碰槓牌 (跑馬仔)' }));
    expect(preset('我的跑馬')).toHaveTextContent('明槓每位7 · 自模2');
    await user.click(preset('我的跑馬'));
    const renamed = await screen.findByRole('textbox', { name: '玩法名稱' });
    await user.clear(renamed);
    await user.type(renamed, '我的跑馬二');
    await user.click(screen.getByRole('button', { name: '儲存自訂' }));
    await user.click(screen.getByRole('button', { name: '返回' }));
    await user.click(screen.getByRole('tab', { name: '碰槓牌 (跑馬仔)' }));
    expect(preset('我的跑馬二')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '刪除 我的跑馬二' }));
    expect(screen.getByText('未有自訂玩法')).toBeInTheDocument();
    expect(screen.queryByText('我的跑馬二')).not.toBeInTheDocument();
  });
});

describe('table flows', () => {
  it('scores a full-chong hand, restores it, settles, and clears the v2 session', async () => {
    const user = userEvent.setup();
    const view = renderApp();
    expect(screen.queryByRole('link', { name: '繼續' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '新開局' }));
    await openPreset(user, '3番4 半辣上');
    await confirmRules(user);
    await openTable(user);
    expect(screen.getByText('3番4 半辣上')).toBeInTheDocument();
    expect(screen.getByText('東圈')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '記槓' })).not.toBeInTheDocument();
    for (const name of ['玩家1', '玩家2', '玩家3', '玩家4']) {
      expect(within(card(name)).getByText('0')).toBeInTheDocument();
    }
    expect(within(card('玩家1')).getByText('莊')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    expect(within(screen.getByRole('radiogroup', { name: '胡牌玩家' })).getAllByRole('radio')).toHaveLength(4);
    await user.click(radio('胡牌玩家', '玩家3'));
    expect(within(screen.getByRole('radiogroup', { name: '出銃玩家' })).queryByRole('radio', { name: '玩家3' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確認入帳' })).toBeDisabled();
    await user.click(radio('出銃玩家', '玩家4'));
    expect(previewRow('玩家3')).toHaveTextContent('+4');
    expect(previewRow('玩家4')).toHaveTextContent('-4');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家3')).getByText('+4')).toBeInTheDocument();
    expect(within(card('玩家2')).getByText('莊')).toBeInTheDocument();
    expect(screen.getByText(/過莊/)).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toContain('"version":2');

    view.unmount();
    renderApp();
    await user.click(await screen.findByRole('link', { name: '繼續' }));
    expect(within(card('玩家3')).getByText('+4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '復原' }));
    expect(within(card('玩家1')).getByText('莊')).toBeInTheDocument();
    expect(within(card('玩家3')).getByText('0')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家3'));
    await user.click(radio('出銃玩家', '玩家4'));
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    await user.click(screen.getByRole('button', { name: '結束並找數' }));
    await user.click(screen.getByRole('button', { name: '去找數' }));
    const nets = screen.getByRole('list', { name: '淨額' });
    expect(within(nets).getByText('玩家3').closest('li')).toHaveTextContent('+4');
    expect(within(nets).getByText('玩家4').closest('li')).toHaveTextContent('-4');
    expect(screen.getByRole('list', { name: '兩兩找數' })).toHaveTextContent('玩家4 付 玩家3');
    await user.click(screen.getByRole('button', { name: '返回枱面' }));
    await user.click(screen.getByRole('button', { name: '結束並找數' }));
    await user.click(screen.getByRole('button', { name: '去找數' }));
    await user.click(screen.getByRole('button', { name: '完成（清局）' }));
    expect(screen.queryByRole('link', { name: '繼續' })).not.toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('applies half chong by seat order', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await openPreset(user, '3番4 半辣上');
    const stake = screen.getByRole('textbox', { name: '起糊分' });
    await user.clear(stake);
    await user.type(stake, '3');
    await user.click(screen.getByRole('button', { name: /全銃\/半銃/ }));
    await user.click(screen.getByRole('radio', { name: '半銃' }));
    await confirmRules(user);
    await openTable(user);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家1'));
    await user.click(radio('出銃玩家', '玩家3'));
    expect(previewRow('玩家1')).toHaveTextContent('+3');
    expect(previewRow('玩家3')).toHaveTextContent('-2');
    expect(previewRow('玩家2')).toHaveTextContent('-1');
    expect(previewRow('玩家4')).toHaveTextContent('0');
  });

  it('does not let jackpot change a self-draw, and can hide the dealer', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await openPreset(user, '二五雞 辣辣上');
    await user.click(screen.getByRole('switch', { name: 'Jackpot' }));
    expect(screen.getByRole('switch', { name: 'Jackpot' })).toHaveAttribute('aria-checked', 'true');
    await confirmRules(user);
    await openTable(user);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家1'));
    await user.click(screen.getByRole('radio', { name: '自摸' }));
    expect(previewRow('玩家1')).toHaveTextContent('+36');
    expect(previewRow('玩家2')).toHaveTextContent('-12');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家1')).getByText('+36')).toBeInTheDocument();
    expect(within(card('玩家1')).getByText('連×1')).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toContain('"jackpotEnabled":true');
  });

  it('keeps drawing and a dealer win on the same seat', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await openPreset(user, '3番4 半辣上');
    await user.click(screen.getByRole('switch', { name: '紀錄莊家及圈風' }));
    await confirmRules(user);
    expect(screen.queryByRole('radiogroup', { name: '初始莊家' })).not.toBeInTheDocument();
    await openTable(user);
    expect(screen.queryByText('莊')).not.toBeInTheDocument();
    expect(screen.queryByText('東圈')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(screen.getByRole('radio', { name: '流局' }));
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(screen.queryByText('莊')).not.toBeInTheDocument();
    expect(screen.queryByText(/連莊|過莊/)).not.toBeInTheDocument();
  });

  it('advances the round wind when the deal returns to the first seat', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await openPreset(user, '3番4 半辣上');
    await confirmRules(user);
    await user.click(radio('初始莊家', '玩家4'));
    await openTable(user);
    expect(within(card('玩家4')).getByText('莊')).toBeInTheDocument();
    expect(screen.getByText('東圈')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家2'));
    await user.click(radio('出銃玩家', '玩家1'));
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家1')).getByText('莊')).toBeInTheDocument();
    expect(screen.getByText('南圈')).toBeInTheDocument();
    expect(screen.getByText(/東圈 → 南圈/)).toBeInTheDocument();
  });

  it('opens three seats from a three-player preset and settles a self draw', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await openPreset(user, '3番4 半辣上 (三人)');
    await confirmRules(user);
    expect(screen.getByRole('textbox', { name: '座位 1' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '座位 3' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '座位 4' })).not.toBeInTheDocument();
    await openTable(user);
    expect(screen.getAllByRole('article')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家1'));
    await user.click(screen.getByRole('radio', { name: '自摸' }));
    expect(previewRow('玩家1')).toHaveTextContent('+10');
    expect(previewRow('玩家2')).toHaveTextContent('-5');
    expect(previewRow('玩家3')).toHaveTextContent('-5');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家2')).getByText('-5')).toBeInTheDocument();
  });

  it('records an exposed kong and a pao ma win without changing the score for 鬥地主', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await user.click(screen.getByRole('tab', { name: '碰槓牌 (跑馬仔)' }));
    await openPreset(user, '1/2');
    expect(screen.getByRole('switch', { name: '包自摸' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('switch', { name: '鬥地主（追）' }));
    const hu = screen.getByRole('textbox', { name: '食糊' });
    expect(hu).toHaveValue('2');
    await confirmRules(user);
    await openTable(user);
    await user.click(screen.getByRole('button', { name: '記槓' }));
    await user.click(radio('槓牌玩家', '玩家1'));
    expect(previewRow('玩家1')).toHaveTextContent('+3');
    expect(previewRow('玩家2')).toHaveTextContent('-1');
    expect(previewRow('玩家4')).toHaveTextContent('-1');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家1')).getByText('+3')).toBeInTheDocument();
    expect(within(card('玩家1')).getByText('莊')).toBeInTheDocument();
    expect(screen.getByText(/莊不變/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '復原' }));
    expect(within(card('玩家1')).getByText('0')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家2'));
    await user.click(radio('出銃玩家', '玩家3'));
    await user.click(screen.getByRole('button', { name: '增加中馬' }));
    expect(previewRow('玩家2')).toHaveTextContent('+4');
    expect(previewRow('玩家3')).toHaveTextContent('-4');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家2')).getByText('+4')).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toContain('"douDiZhuEnabled":true');
  });

  it('lets one player cover a three-player pao ma self draw', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await user.click(screen.getByRole('tab', { name: '碰槓牌 (跑馬仔)' }));
    await openPreset(user, '1/2 (三人)');
    await confirmRules(user);
    await openTable(user);
    expect(screen.getAllByRole('article')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家2'));
    await user.click(screen.getByRole('radio', { name: '自摸' }));
    await user.click(screen.getByRole('button', { name: '增加中馬' }));
    expect(screen.getByRole('button', { name: '確認入帳' })).toBeDisabled();
    await user.click(radio('包自摸玩家', '玩家3'));
    expect(previewRow('玩家2')).toHaveTextContent('+8');
    expect(previewRow('玩家3')).toHaveTextContent('-8');
    expect(previewRow('玩家1')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家3')).getByText('-8')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '復原' }));
    expect(within(card('玩家2')).getByText('0')).toBeInTheDocument();
  });

  it('keeps duplicate names off the table and sends an empty table route home', async () => {
    const user = userEvent.setup();
    await openPicker(user);
    await openPreset(user, '3番4 半辣上');
    await confirmRules(user);
    const first = screen.getByRole('textbox', { name: '座位 1' });
    await user.clear(first);
    await user.type(first, '玩家2');
    expect(screen.getByRole('button', { name: '開枱' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('玩家名要全部唔同');
  });

  it('returns home when a table route has no session', () => {
    renderApp('/hand');
    expect(screen.getByRole('heading', { name: '麻雀計分' })).toBeInTheDocument();
  });

  it('sends a settings visit without a draft back to the picker', async () => {
    renderApp('/rules/edit');
    expect(await screen.findByRole('heading', { name: '請選擇玩法' })).toBeInTheDocument();
  });

  it('offers a v1 session for settlement only', async () => {
    const user = userEvent.setup();
    localStorage.setItem(LEGACY_SESSION_STORAGE_KEY, JSON.stringify({
      id: 'old',
      players: [
        { id: 'a', name: '舊東', score: 5, seatIndex: 0 },
        { id: 'b', name: '舊南', score: -5, seatIndex: 1 },
        { id: 'c', name: '舊西', score: 0, seatIndex: 2 },
        { id: 'd', name: '舊北', score: 0, seatIndex: 3 },
      ],
      startingScores: { a: 0, b: 0, c: 0, d: 0 },
      status: 'active',
    }));
    renderApp();
    expect(screen.queryByRole('link', { name: '繼續' })).not.toBeInTheDocument();
    expect(screen.getByText('舊局只可找數／或丟棄')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '找數' }));
    expect(await screen.findByRole('heading', { name: '舊局找數' })).toBeInTheDocument();
    const nets = screen.getByRole('list', { name: '淨額' });
    expect(within(nets).getByText('舊東').closest('li')).toHaveTextContent('+5');
    expect(within(nets).getByText('舊南').closest('li')).toHaveTextContent('-5');
    await user.click(screen.getByRole('button', { name: '丟棄' }));
    expect(await screen.findByRole('heading', { name: '麻雀計分' })).toBeInTheDocument();
    expect(screen.queryByText('舊局只可找數／或丟棄')).not.toBeInTheDocument();
    expect(localStorage.getItem(LEGACY_SESSION_STORAGE_KEY)).toBeNull();
  });
});
