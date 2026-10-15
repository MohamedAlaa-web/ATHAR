import { HashRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
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
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scan" element={<ScannerPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/artifact/:id" element={<ArtifactDetailPage />} />
            <Route path="/artifact/:id/story" element={<StoryPlayerPage />} />
            <Route path="/artifact/:id/facts" element={<FactsPage />} />
            <Route path="/print" element={<PrintPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppLayout>
        <PresentationDemo />
      </HashRouter>
    </LanguageProvider>
  );
}
