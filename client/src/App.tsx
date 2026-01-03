import React from 'react';
import { CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CustomThemeProvider } from './context/ThemeContext';
import { useAuthStore } from './store/useAuthStore';
import { AnimatedBackground } from './components';

import Login from './pages/Login';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import GroupsPage from './pages/GroupsPage';
import SharedChatPage from './pages/SharedChatPage';
// import ComponentShowcase from './pages/ComponentShowcase';

const App: React.FC = () => {
  const { token } = useAuthStore();

  return (
    <CustomThemeProvider>
      <CssBaseline />
      <AnimatedBackground />
      <Router>
        <Routes>
          <Route path="/" element={token ? <Navigate to="/chat" /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={token ? <ChatPage /> : <Navigate to="/login" />} />
          <Route path="/settings" element={token ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/groups" element={token ? <GroupsPage /> : <Navigate to="/login" />} />
          <Route path="/shared/:token" element={<SharedChatPage />} />
          {/* <Route path="/showcase" element={<ComponentShowcase />} /> */}
        </Routes>
      </Router>
    </CustomThemeProvider>
  );
};

export default App;
