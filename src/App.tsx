import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Home } from './screens/Home';
import { Setup } from './screens/Setup';
import { Table } from './screens/Table';
import { Hand } from './screens/Hand';
import { Settle } from './screens/Settle';
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
      <Route path="/setup" element={<Setup />} />
      <Route path="/table" element={<RequireActive><Table /></RequireActive>} />
      <Route path="/hand" element={<RequireActive><Hand /></RequireActive>} />
      <Route path="/settle" element={<RequireActive><Settle /></RequireActive>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SessionProvider>
  );
}
