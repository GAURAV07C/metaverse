import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUserStore } from './store';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Arena } from './components/Arena';
import { AdminDashboard } from './components/AdminDashboard';
import { CreateOfficeWizard } from './components/CreateOfficeWizard';
import { Studio } from './components/Studio';
import { DeskManager } from './components/DeskManager';
import { JoinSpace } from './components/JoinSpace';
import './index.css';

function App() {
  const token = useUserStore((state) => state.token);
  const type = useUserStore((state) => state.type);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!token ? <Login /> : <Navigate to={type === 'admin' ? '/admin' : '/dashboard'} />}
        />
        <Route
          path="/admin/login"
          element={!token ? <Login mode="admin" /> : <Navigate to={type === 'admin' ? '/admin' : '/dashboard'} />}
        />
        <Route
          path="/dashboard"
          element={token ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route path="/create" element={token ? <CreateOfficeWizard /> : <Navigate to="/login" />} />
        <Route path="/space/:spaceId/join" element={token ? <JoinSpace /> : <Navigate to="/login" />} />
        <Route path="/studio/:spaceId" element={token ? <Studio /> : <Navigate to="/login" />} />
        <Route path="/desk-manager/:spaceId" element={token ? <DeskManager /> : <Navigate to="/login" />} />
        <Route
          path="/admin/*"
          element={token && type === 'admin' ? <AdminDashboard /> : <Navigate to={token ? '/dashboard' : '/login'} />}
        />
        <Route
          path="/space/:spaceId"
          element={token ? <Arena /> : <Navigate to={`/login?returnTo=${encodeURIComponent('/space/' + window.location.pathname.split('/space/')[1])}`} />}
        />
        <Route path="*" element={<Navigate to={token ? (type === 'admin' ? '/admin' : '/dashboard') : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

