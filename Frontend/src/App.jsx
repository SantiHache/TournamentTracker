import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import TournamentScopeLayout from "./components/TournamentScopeLayout";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import JugadoresPage from "./pages/JugadoresPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import ConfiguracionTorneoPage from "./pages/ConfiguracionTorneoPage";
import TournamentInicioPage from "./pages/TournamentInicioPage";
import TournamentParejasPage from "./pages/TournamentParejasPage";
import TournamentPresentismoPagosPage from "./pages/TournamentPresentismoPagosPage";
import TournamentZonasPage from "./pages/TournamentZonasPage";
import TournamentEliminatoriasPage from "./pages/TournamentEliminatoriasPage";
import SuperAdminUsuariosPage from "./pages/SuperAdminUsuariosPage";
import SuperAdminJugadoresPage from "./pages/SuperAdminJugadoresPage";
import SuperAdminTorneosPage from "./pages/SuperAdminTorneosPage";
import SuperAdminAuditoriaPage from "./pages/SuperAdminAuditoriaPage";
import { useAuthStore } from "./store/authStore";

function Protected({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireSuperAdmin({ children }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== "superadmin") return <Navigate to="/torneos" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/torneos" replace />} />
        <Route path="torneos" element={<HomePage />} />
        <Route path="jugadores" element={<JugadoresPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
        <Route path="configuracion/torneo" element={<ConfiguracionTorneoPage />} />
        <Route path="torneos/:id" element={<TournamentScopeLayout />}>
          <Route index element={<Navigate to="inicio" replace />} />
          <Route path="inicio" element={<TournamentInicioPage />} />
          <Route path="parejas" element={<TournamentParejasPage />} />
          <Route path="presentismo-pagos" element={<TournamentPresentismoPagosPage />} />
          <Route path="zonas" element={<TournamentZonasPage />} />
          <Route path="eliminatorias" element={<TournamentEliminatoriasPage />} />
        </Route>

        <Route
          path="superadmin/usuarios"
          element={<RequireSuperAdmin><SuperAdminUsuariosPage /></RequireSuperAdmin>}
        />
        <Route
          path="superadmin/jugadores"
          element={<RequireSuperAdmin><SuperAdminJugadoresPage /></RequireSuperAdmin>}
        />
        <Route
          path="superadmin/torneos"
          element={<RequireSuperAdmin><SuperAdminTorneosPage /></RequireSuperAdmin>}
        />
        <Route
          path="superadmin/auditoria"
          element={<RequireSuperAdmin><SuperAdminAuditoriaPage /></RequireSuperAdmin>}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
