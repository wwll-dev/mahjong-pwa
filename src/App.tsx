import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Home } from './screens/Home';
import { RulePicker } from './screens/RulePicker';
import { RuleSettings } from './screens/RuleSettings';
import { Setup } from './screens/Setup';
import { Table } from './screens/Table';
import { Hand } from './screens/Hand';
import { KongSheet } from './screens/KongSheet';
import { Settle } from './screens/Settle';
import { LegacySettle } from './screens/LegacySettle';
import { routerBasename } from './pwa/base';
import { RulesDraftProvider } from './state/rulesDraft';
import { SessionProvider, useSession } from './state/sessionStore';

function RequireActive({ children }: { children: ReactNode }) {
  const { session } = useSession();
  if (!session || session.status !== 'active') return <Navigate to="/" replace />;
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/rules" element={<RulePicker />} />
      <Route path="/rules/edit" element={<RuleSettings />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/table" element={<RequireActive><Table /></RequireActive>} />
      <Route path="/hand" element={<RequireActive><Hand /></RequireActive>} />
      <Route path="/kong" element={<RequireActive><KongSheet /></RequireActive>} />
      <Route path="/settle" element={<RequireActive><Settle /></RequireActive>} />
      <Route path="/legacy" element={<LegacySettle />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <SessionProvider>
      <RulesDraftProvider>
        <BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
          <AppRoutes />
        </BrowserRouter>
      </RulesDraftProvider>
    </SessionProvider>
  );
}
