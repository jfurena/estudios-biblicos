import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Studies from './pages/Studies';
import People from './pages/People';
import Schedule from './pages/Schedule';
import Profile from './pages/Profile';
import GroupDetail from './pages/GroupDetail';
import Admin from './pages/Admin';
import BibleGuide from './pages/BibleGuide';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="people" element={<People />} />
            <Route path="groups/:id" element={<GroupDetail />} />
            <Route path="studies" element={<Studies />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="guide" element={<BibleGuide />} />
            <Route path="messages" element={<Chat />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/:userId" element={<Profile />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
