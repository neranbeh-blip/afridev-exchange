import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import Landing from "./pages/Landing";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AuthCallback from "./pages/auth/AuthCallback";

import Dashboard from "./pages/dashboard/Dashboard";
import Discover from "./pages/discover/Discover";

import Exchange from "./pages/exchange/Exchange";
import ExchangeWorkspace from "./pages/exchange/ExchangeWorkspace";

import Passport from "./pages/passport/Passport";
import PublicPassport from "./pages/passport/PublicPassport";

import Projects from "./pages/projects/Projects";
import ProjectDetails from "./pages/projects/ProjectDetails";
import ProjectWorkspace from "./pages/projects/ProjectWorkspace";

import Problems from "./pages/problems/Problems";
import ProblemDetails from "./pages/problems/ProblemDetails";

import Messages from "./pages/messages/Messages";
import Notifications from "./pages/notifications/Notifications";

import EvidenceVerification from "./pages/admin/EvidenceVerification";
import Settings from "./pages/settings/Settings";

function App() {
  return (
    <Routes>
      {/* =====================================================
          PUBLIC ROUTES
      ====================================================== */}

      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      {/* Email verification callback */}
      <Route
        path="/auth/callback"
        element={<AuthCallback />}
      />

      {/* Public developer passport */}
      <Route
        path="/developer/:developerId"
        element={<PublicPassport />}
      />

      {/* =====================================================
          PROTECTED APPLICATION
      ====================================================== */}

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/discover"
          element={<Discover />}
        />

        <Route
          path="/projects"
          element={<Projects />}
        />

        <Route
          path="/projects/:projectId"
          element={<ProjectDetails />}
        />

        <Route
          path="/projects/:projectId/workspace"
          element={<ProjectWorkspace />}
        />

        <Route
          path="/problems"
          element={<Problems />}
        />

        <Route
          path="/problems/:problemId"
          element={<ProblemDetails />}
        />

        <Route
          path="/exchange"
          element={<Exchange />}
        />

        <Route
          path="/exchange/workspace/:exchangeId"
          element={<ExchangeWorkspace />}
        />

        <Route
          path="/exchange/:exchangeId"
          element={<ExchangeWorkspace />}
        />

        <Route
          path="/passport"
          element={<Passport />}
        />

        <Route
          path="/messages"
          element={<Messages />}
        />

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        <Route
          path="/admin/evidence"
          element={<EvidenceVerification />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />
      </Route>

      {/* =====================================================
          UNKNOWN ROUTES
      ====================================================== */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;