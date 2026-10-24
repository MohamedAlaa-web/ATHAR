import { useEffect, type ReactNode } from 'react';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { NavProvider } from './nav/NavProvider';
import { RewardsProvider } from './rewards/RewardsContext';
import { PlanProvider } from './planner/PlanContext';
import { NavLayout } from './nav/components/NavLayout';
import { PlanPage } from './nav/pages/PlanPage';
import { RewardsPage } from './nav/pages/RewardsPage';
import { OnboardingPage } from './nav/pages/OnboardingPage';
import { MapPage } from './nav/pages/MapPage';
import { SearchPage } from './nav/pages/SearchPage';
import { ArtifactNavPage } from './nav/pages/ArtifactNavPage';
import { QrPage } from './nav/pages/QrPage';
import { SettingsPage } from './nav/pages/SettingsPage';
import { DebugPage } from './nav/pages/DebugPage';
import { PrintQrPage } from './nav/pages/PrintQrPage';
import { AdminNavPage } from './nav/pages/AdminNavPage';
import { DeviceCheckPage } from './nav/pages/DeviceCheckPage';
import { NotFoundPage } from './nav/pages/NotFoundNavPage';
import { AppLayout } from './components/AppLayout';
import { PresentationDemo } from './components/PresentationDemo';
import { HomePage } from './pages/HomePage';
import { ScannerPage } from './pages/ScannerPage';
import { ArtifactDetailPage } from './pages/ArtifactDetailPage';
import { StoryPlayerPage } from './pages/StoryPlayerPage';
import { FactsPage } from './pages/FactsPage';
import { ExplorePage } from './pages/ExplorePage';
import { PrintPage } from './pages/PrintPage';
import { AdminPage } from './pages/AdminPage';
import { PositioningPage } from './pages/PositioningPage';

/**
 * Demo build: `VITE_DEMO_BUILD=1` (see `.env.demo` / `npm run build:demo`).
 * The flag is replaced at build time, so when it is on the legacy route table
 * below is statically eliminated together with every legacy page import —
 * they never reach the demo bundle. The matching Vite config also skips
 * copying the 33 MB legacy media into dist/.
 */
const DEMO_BUILD = import.meta.env.VITE_DEMO_BUILD === '1';

function Legacy({ children }: { children: ReactNode }) {
  return (
    <>
      <AppLayout>{children}</AppLayout>
      <PresentationDemo />
    </>
  );
}

function DebugShortcut() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const hashQuery = new URLSearchParams(location.search).get('debug');
    const pageQuery =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('debug') : null;
    if ((hashQuery === '1' || pageQuery === '1') && location.pathname !== '/debug') {
      navigate('/debug', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);
  return null;
}

export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <NavProvider>
          <RewardsProvider>
          <PlanProvider>
          <DebugShortcut />
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="/print-qr" element={<PrintQrPage />} />

            <Route element={<NavLayout />}>
              <Route path="/" element={<MapPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/item/:id" element={<ArtifactNavPage />} />
              <Route path="/qr" element={<QrPage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/rewards" element={<RewardsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/device-check" element={<DeviceCheckPage />} />
              <Route path="/admin" element={<AdminNavPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {!DEMO_BUILD && (
              <>
                <Route path="/legacy" element={<Legacy><HomePage /></Legacy>} />
                <Route path="/explore" element={<Legacy><ExplorePage /></Legacy>} />
                <Route path="/scan" element={<Legacy><ScannerPage /></Legacy>} />
                <Route path="/artifact/:id" element={<Legacy><ArtifactDetailPage /></Legacy>} />
                <Route path="/artifact/:id/story" element={<Legacy><StoryPlayerPage /></Legacy>} />
                <Route path="/artifact/:id/facts" element={<Legacy><FactsPage /></Legacy>} />
                <Route path="/positioning" element={<Legacy><PositioningPage /></Legacy>} />
                <Route path="/print" element={<Legacy><PrintPage /></Legacy>} />
                <Route path="/media-admin" element={<Legacy><AdminPage /></Legacy>} />
              </>
            )}
          </Routes>
          </PlanProvider>
          </RewardsProvider>
        </NavProvider>
      </HashRouter>
    </LanguageProvider>
  );
}
