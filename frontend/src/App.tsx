import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import theme from './theme';
import { useAuthStore } from './store/useAuthStore';

// Lazy load components
// const Login = React.lazy(() => import('./pages/Login'));
// const Dashboard = React.lazy(() => import('./pages/Dashboard'));

import Login from './pages/Login';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import GroupsPage from './pages/GroupsPage';

const App: React.FC = () => {
  const { token } = useAuthStore();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={token ? <Navigate to="/chat" /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={token ? <ChatPage /> : <Navigate to="/login" />} />
          <Route path="/settings" element={token ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/groups" element={token ? <GroupsPage /> : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
