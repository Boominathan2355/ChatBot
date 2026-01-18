import React from 'react';
import { CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CustomThemeProvider } from './context/ThemeContext';
// import { useAuthStore } from './store/useAuthStore'; // REMOVING
import { useAppSelector } from './store/hooks';
import { AnimatedBackground } from './components';
import { GlobalErrorBoundary } from './components/ErrorBoundary';

import Login from './pages/Login';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import GroupsPage from './pages/GroupsPage';
import SharedChatPage from './pages/SharedChatPage';
import OopsPage from './pages/OopsPage';

const App: React.FC = () => {
  const { token } = useAppSelector((state) => state.auth);

  return (
    <Router>
      <GlobalErrorBoundary>
        <CustomThemeProvider>
          <CssBaseline />
          <AnimatedBackground />
          <Routes>
            <Route path="/" element={token ? <Navigate to="/chat" /> : <Navigate to="/login" />} />
            <Route path="/login" element={!token ? <Login /> : <Navigate to="/chat" />} />
            <Route path="/chat" element={token ? <ChatPage /> : <Navigate to="/login" />} />
            <Route path="/settings" element={token ? <SettingsPage /> : <Navigate to="/login" />} />
            <Route path="/groups" element={token ? <GroupsPage /> : <Navigate to="/login" />} />
            <Route path="/shared/:token" element={<SharedChatPage />} />
            <Route path="/oops" element={<OopsPage />} />
            <Route path="*" element={<OopsPage />} />
          </Routes>
        </CustomThemeProvider>
      </GlobalErrorBoundary>
    </Router>
  );
};

export default App;
