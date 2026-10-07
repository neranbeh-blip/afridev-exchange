import { Route, Routes } from "react-router-dom";

import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import Landing from "./pages/Landing";

import Dashboard from "./pages/dashboard/Dashboard";
import Discover from "./pages/discover/Discover";

import Exchange from "./pages/exchange/Exchange";
import ExchangeWorkspace from "./pages/exchange/ExchangeWorkspace";

import Passport from "./pages/passport/Passport";
import PublicPassport from "./pages/passport/PublicPassport";

import EvidenceVerification from "./pages/admin/EvidenceVerification";

import Projects from "./pages/projects/Projects";
import ProjectDetails from "./pages/projects/ProjectDetails";
import ProjectWorkspace from "./pages/projects/ProjectWorkspace";

import Notifications from "./pages/notifications/Notifications";

import Problems from "./pages/problems/Problems";
import ProblemDetails from "./pages/problems/ProblemDetails";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

function App() {
  return (
    <Routes>
      {/* =====================================================
          PUBLIC ROUTES
      ===================================================== */}

      {/* Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Public Developer Passport */}
      <Route
        path="/developer/:developerId"
        element={<PublicPassport />}
      />

      {/* =====================================================
          PROTECTED APPLICATION
      ===================================================== */}

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Discover */}
        <Route path="/discover" element={<Discover />} />

        {/* Projects */}
        <Route path="/projects" element={<Projects />} />

        <Route
          path="/projects/:projectId"
          element={<ProjectDetails />}
        />

        <Route
          path="/projects/:projectId/workspace"
          element={<ProjectWorkspace />}
        />

        {/* Problems */}
        <Route path="/problems" element={<Problems />} />

        <Route
          path="/problems/:problemId"
          element={<ProblemDetails />}
        />

        {/* Exchange */}
        <Route path="/exchange" element={<Exchange />} />

        <Route
          path="/exchange/workspace/:exchangeId"
          element={<ExchangeWorkspace />}
        />

        <Route
          path="/exchange/:exchangeId"
          element={<ExchangeWorkspace />}
        />

        {/* Developer Passport */}
        <Route path="/passport" element={<Passport />} />

        {/* Evidence Verification */}
        <Route
          path="/admin/evidence"
          element={<EvidenceVerification />}
        />

        {/* Notifications */}
        <Route
          path="/notifications"
          element={<Notifications />}
        />
      </Route>

      {/* =====================================================
          UNKNOWN ROUTES
      ===================================================== */}

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

export default App;