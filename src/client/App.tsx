import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router';
import { HomePage } from '@/pages/home-page';

const RegionPage = lazy(() =>
  import('@/pages/region-page').then((m) => ({ default: m.RegionPage }))
);
const MasterPage = lazy(() =>
  import('@/pages/master-page').then((m) => ({ default: m.MasterPage }))
);
const SavedPage = lazy(() =>
  import('@/pages/saved-page').then((m) => ({ default: m.SavedPage }))
);
const TermsPage = lazy(() =>
  import('@/pages/terms-page').then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import('@/pages/privacy-page').then((m) => ({ default: m.PrivacyPage }))
);
const NotFoundPage = lazy(() =>
  import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage }))
);

function PageFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center" role="status">
      <p className="text-slate-500 font-medium">Завантаження…</p>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/region/:id" element={<RegionPage />} />
          <Route path="/master/:id" element={<MasterPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
