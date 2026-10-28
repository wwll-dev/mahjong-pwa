import { render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from './App';
import { SessionProvider } from './state/sessionStore';
import { SESSION_STORAGE_KEY } from './state/storage';

function renderApp(path = '/') {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </SessionProvider>,
  );
}

async function openSetup(user: UserEvent) {
  renderApp();
  await user.click(screen.getByRole('link', { name: '新開局' }));
  await screen.findByRole('heading', { name: '開局設定' });
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

async function setCount(user: UserEvent, label: string, target: number) {
  const current = 1;
  for (let value = current; value < target; value += 1) {
    await user.click(screen.getByRole('button', { name: label }));
  }
}

describe('mahjong table flows', () => {
  it('opens a hong kong table at zero, blocks a shared winner and discarder, then settles and clears', async () => {
    const user = userEvent.setup();
    const view = renderApp();
    expect(screen.queryByRole('link', { name: '繼續' })).not.toBeInTheDocument();
    expect(screen.getByText(/朋友局計分/)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '新開局' }));
    expect(screen.getByRole('radio', { name: '港麻' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '全銃' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('textbox', { name: '底分' })).toHaveValue('1');
    expect(screen.getByRole('textbox', { name: '自摸倍數' })).toHaveValue('2');
    expect(screen.getByRole('textbox', { name: '座位 1' })).toHaveValue('玩家1');
    await openTable(user);

    expect(screen.getByText('第 1 鋪')).toBeInTheDocument();
    expect(screen.getByText('未有牌鋪')).toBeInTheDocument();
    for (const name of ['玩家1', '玩家2', '玩家3', '玩家4']) {
      expect(within(card(name)).getByText('0')).toBeInTheDocument();
    }
    expect(within(card('玩家1')).getByText('莊')).toBeInTheDocument();
    expect(screen.queryByText(/連×/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    const winners = screen.getByRole('radiogroup', { name: '胡牌玩家' });
    expect(within(winners).getAllByRole('radio')).toHaveLength(4);
    await user.click(radio('胡牌玩家', '玩家2'));
    await user.click(radio('胡牌玩家', '玩家3'));
    expect(radio('胡牌玩家', '玩家3')).toHaveAttribute('aria-checked', 'true');
    expect(radio('胡牌玩家', '玩家2')).toHaveAttribute('aria-checked', 'false');
    expect(within(screen.getByRole('radiogroup', { name: '出銃玩家' })).queryByRole('radio', { name: '玩家3' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確認入帳' })).toBeDisabled();

    await user.click(radio('出銃玩家', '玩家4'));
    await user.click(radio('胡牌玩家', '玩家4'));
    expect(within(screen.getByRole('radiogroup', { name: '出銃玩家' })).queryByRole('radio', { name: '玩家4' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確認入帳' })).toBeDisabled();

    await user.click(radio('胡牌玩家', '玩家3'));
    await user.click(radio('出銃玩家', '玩家4'));
    await setCount(user, '增加番', 3);
    expect(previewRow('玩家3')).toHaveTextContent('+3');
    expect(previewRow('玩家4')).toHaveTextContent('-3');
    expect(previewRow('玩家1')).toHaveTextContent('0');
    expect(previewRow('玩家2')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));

    expect(within(card('玩家3')).getByText('+3')).toBeInTheDocument();
    expect(within(card('玩家4')).getByText('-3')).toBeInTheDocument();
    expect(within(card('玩家2')).getByText('莊')).toBeInTheDocument();
    expect(within(card('玩家3')).queryByText('莊')).not.toBeInTheDocument();
    expect(screen.getByText(/過莊/)).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toContain('"mode":"hongkong"');

    view.unmount();
    renderApp();
    await user.click(await screen.findByRole('link', { name: '繼續' }));
    expect(within(card('玩家3')).getByText('+3')).toBeInTheDocument();
    expect(within(card('玩家2')).getByText('莊')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '復原' }));
    expect(within(card('玩家1')).getByText('莊')).toBeInTheDocument();
    expect(within(card('玩家3')).getByText('0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '復原' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家3'));
    await user.click(radio('出銃玩家', '玩家4'));
    await setCount(user, '增加番', 3);
    await user.click(screen.getByRole('button', { name: '確認入帳' }));

    await user.click(screen.getByRole('button', { name: '結束並找數' }));
    await user.click(screen.getByRole('button', { name: '去找數' }));
    const nets = screen.getByRole('list', { name: '淨額' });
    expect(within(nets).getByText('玩家3').closest('li')).toHaveTextContent('+3');
    expect(within(nets).getByText('玩家4').closest('li')).toHaveTextContent('-3');
    expect(screen.getByRole('list', { name: '兩兩找數' })).toHaveTextContent('玩家4 付 玩家3');
    await user.click(screen.getByRole('button', { name: '返回枱面' }));
    expect(within(card('玩家3')).getByText('+3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '結束並找數' }));
    await user.click(screen.getByRole('button', { name: '去找數' }));
    await user.click(screen.getByRole('button', { name: '完成（清局）' }));
    expect(screen.queryByRole('link', { name: '繼續' })).not.toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('applies half chong by seat order', async () => {
    const user = userEvent.setup();
    await openSetup(user);
    await user.click(screen.getByRole('radio', { name: '半銃' }));
    await openTable(user);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家1'));
    await user.click(radio('出銃玩家', '玩家3'));
    await setCount(user, '增加番', 3);
    expect(previewRow('玩家1')).toHaveTextContent('+3');
    expect(previewRow('玩家3')).toHaveTextContent('-2');
    expect(previewRow('玩家2')).toHaveTextContent('-1');
    expect(previewRow('玩家4')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家2')).getByText('-1')).toBeInTheDocument();
    expect(within(card('玩家4')).getByText('0')).toBeInTheDocument();
  });

  it('charges every other player on a hong kong self draw', async () => {
    const user = userEvent.setup();
    await openSetup(user);
    await openTable(user);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家1'));
    await user.click(screen.getByRole('radio', { name: '自摸' }));
    expect(screen.queryByRole('radiogroup', { name: '出銃玩家' })).not.toBeInTheDocument();
    await setCount(user, '增加番', 2);
    expect(previewRow('玩家1')).toHaveTextContent('+12');
    for (const name of ['玩家2', '玩家3', '玩家4']) {
      expect(previewRow(name)).toHaveTextContent('-4');
    }
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家1')).getByText('+12')).toBeInTheDocument();
    expect(within(card('玩家1')).getByText('連×1')).toBeInTheDocument();
  });

  it('continues the dealer on a draw and on a dealer win', async () => {
    const user = userEvent.setup();
    await openSetup(user);
    await openTable(user);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(screen.getByRole('radio', { name: '流局' }));
    expect(screen.queryByRole('radiogroup', { name: '胡牌玩家' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家1')).getByText('連×1')).toBeInTheDocument();
    expect(within(card('玩家1')).getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/連莊/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家1'));
    await user.click(radio('出銃玩家', '玩家2'));
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家1')).getByText('連×2')).toBeInTheDocument();
    expect(within(card('玩家1')).getByText('+1')).toBeInTheDocument();
    expect(within(card('玩家2')).getByText('-1')).toBeInTheDocument();
  });

  it('scores a pao ma discard from base score plus horses', async () => {
    const user = userEvent.setup();
    await openSetup(user);
    await user.click(screen.getByRole('radio', { name: '跑馬仔' }));
    expect(screen.queryByRole('radio', { name: '全銃' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '包自摸' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: '增加馬數' }));
    await user.click(screen.getByRole('button', { name: '增加馬數' }));
    await openTable(user);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家2'));
    await user.click(radio('出銃玩家', '玩家3'));
    await user.click(screen.getByRole('button', { name: '增加中馬' }));
    await user.click(screen.getByRole('button', { name: '增加中馬' }));
    expect(previewRow('玩家2')).toHaveTextContent('+3');
    expect(previewRow('玩家3')).toHaveTextContent('-3');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家2')).getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('跑馬仔')).toBeInTheDocument();
  });

  it('lets one player cover a pao ma self draw, or splits it when bao is off', async () => {
    const user = userEvent.setup();
    await openSetup(user);
    await user.click(screen.getByRole('radio', { name: '跑馬仔' }));
    await user.click(screen.getByRole('button', { name: '增加馬數' }));
    await user.click(screen.getByRole('button', { name: '增加馬數' }));
    await openTable(user);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家2'));
    await user.click(screen.getByRole('radio', { name: '自摸' }));
    await user.click(screen.getByRole('button', { name: '增加中馬' }));
    await user.click(screen.getByRole('button', { name: '增加中馬' }));
    expect(within(screen.getByRole('radiogroup', { name: '包自摸玩家' })).queryByRole('radio', { name: '玩家2' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '確認入帳' })).toBeDisabled();
    await user.click(radio('包自摸玩家', '玩家4'));
    expect(previewRow('玩家2')).toHaveTextContent('+9');
    expect(previewRow('玩家4')).toHaveTextContent('-9');
    expect(previewRow('玩家1')).toHaveTextContent('0');
    expect(previewRow('玩家3')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家4')).getByText('-9')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '復原' }));
    expect(within(card('玩家2')).getByText('0')).toBeInTheDocument();
    expect(within(card('玩家4')).getByText('0')).toBeInTheDocument();
  });

  it('splits a pao ma self draw when bao is turned off', async () => {
    const user = userEvent.setup();
    await openSetup(user);
    await user.click(screen.getByRole('radio', { name: '跑馬仔' }));
    await user.click(screen.getByRole('switch', { name: '包自摸' }));
    await openTable(user);
    await user.click(screen.getByRole('button', { name: '記一鋪' }));
    await user.click(radio('胡牌玩家', '玩家1'));
    await user.click(screen.getByRole('radio', { name: '自摸' }));
    expect(screen.queryByRole('radiogroup', { name: '包自摸玩家' })).not.toBeInTheDocument();
    expect(previewRow('玩家1')).toHaveTextContent('+3');
    expect(previewRow('玩家2')).toHaveTextContent('-1');
    await user.click(screen.getByRole('button', { name: '確認入帳' }));
    expect(within(card('玩家2')).getByText('-1')).toBeInTheDocument();
  });

  it('keeps duplicate names off the table', async () => {
    const user = userEvent.setup();
    await openSetup(user);
    const first = screen.getByRole('textbox', { name: '座位 1' });
    await user.clear(first);
    await user.type(first, '玩家2');
    expect(screen.getByRole('button', { name: '開枱' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('玩家名要四個唔同');
  });

  it('returns home when a table route has no session', () => {
    renderApp('/hand');
    expect(screen.getByRole('heading', { name: '麻雀計分' })).toBeInTheDocument();
  });
});
