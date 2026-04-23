import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthGlobeFlip } from './components/AuthGlobeFlip';
import { ProfilePage } from './pages/ProfilePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TravelGroupsPage } from './pages/TravelGroupsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HomePage } from './pages/HomePage';
import { FindRoutePage } from './pages/FindRoutePage';
import { VisaIntelPage } from './pages/VisaIntelPage';
import { AppLayout } from './components/AppLayout';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthGlobeFlip />} />
            <Route path="/register" element={<AuthGlobeFlip />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<HomePage />} />
                <Route path="/find-route" element={<FindRoutePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/routes" element={<DiscoverPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/team" element={<TravelGroupsPage />} />
                <Route path="/visa-intel" element={<VisaIntelPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
