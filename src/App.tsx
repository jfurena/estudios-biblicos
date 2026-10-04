import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Studies = lazy(() => import('./pages/Studies'));
const People = lazy(() => import('./pages/People'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Profile = lazy(() => import('./pages/Profile'));
const GroupDetail = lazy(() => import('./pages/GroupDetail'));
const Admin = lazy(() => import('./pages/Admin'));
const BibleGuide = lazy(() => import('./pages/BibleGuide'));
const Chat = lazy(() => import('./pages/Chat'));

function PageLoader() {
  return <div className="flex items-center justify-center py-20 text-slate-500">Cargando...</div>;
}

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
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="people" element={<Suspense fallback={<PageLoader />}><People /></Suspense>} />
            <Route path="groups/:id" element={<Suspense fallback={<PageLoader />}><GroupDetail /></Suspense>} />
            <Route path="studies" element={<Suspense fallback={<PageLoader />}><Studies /></Suspense>} />
            <Route path="schedule" element={<Suspense fallback={<PageLoader />}><Schedule /></Suspense>} />
            <Route path="guide" element={<Suspense fallback={<PageLoader />}><BibleGuide /></Suspense>} />
            <Route path="messages" element={<Suspense fallback={<PageLoader />}><Chat /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
            <Route path="profile/:userId" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
            <Route path="admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
