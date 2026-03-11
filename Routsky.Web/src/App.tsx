import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { AppLayout } from './components/AppLayout';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AuthGlobeFlip />} />
            <Route path="/register" element={<AuthGlobeFlip />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/find-route" element={<FindRoutePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/routes" element={<DiscoverPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/team" element={<TravelGroupsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
