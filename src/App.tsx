import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import Landing from "./pages/Landing";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import Dashboard from "./pages/dashboard/Dashboard";
import Discover from "./pages/discover/Discover";

import Exchange from "./pages/exchange/Exchange";
import ExchangeWorkspace from "./pages/exchange/ExchangeWorkspace";

import Messages from "./pages/messages/Messages";

import Passport from "./pages/passport/Passport";
import PublicPassport from "./pages/passport/PublicPassport";

import Projects from "./pages/projects/Projects";
import ProjectDetails from "./pages/projects/ProjectDetails";
import ProjectWorkspace from "./pages/projects/ProjectWorkspace";

import Problems from "./pages/problems/Problems";
import ProblemDetails from "./pages/problems/ProblemDetails";

import Notifications from "./pages/notifications/Notifications";

import EvidenceVerification from "./pages/admin/EvidenceVerification";

import Settings from "./pages/settings/Settings";

function App() {
  return (
    <Routes>

      {/* =====================================================
          PUBLIC PAGES
      ====================================================== */}

      {/* LANDING PAGE */}
      <Route
        path="/"
        element={<Landing />}
      />

      {/* AUTHENTICATION */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      {/* PUBLIC DEVELOPER PASSPORT */}
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

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* DISCOVER */}
        <Route
          path="/discover"
          element={<Discover />}
        />

        {/* =================================================
            EXCHANGE
        ================================================== */}

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

        {/* =================================================
            PROJECTS
        ================================================== */}

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

        {/* =================================================
            PROBLEMS
        ================================================== */}

        <Route
          path="/problems"
          element={<Problems />}
        />

        <Route
          path="/problems/:problemId"
          element={<ProblemDetails />}
        />

        {/* =================================================
            MESSAGES
        ================================================== */}

        <Route
          path="/messages"
          element={<Messages />}
        />

        {/* =================================================
            DEVELOPER PASSPORT
        ================================================== */}

        <Route
          path="/passport"
          element={<Passport />}
        />

        {/* =================================================
            ADMIN
        ================================================== */}

        <Route
          path="/admin/evidence"
          element={<EvidenceVerification />}
        />

        {/* =================================================
            NOTIFICATIONS
        ================================================== */}

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        {/* =================================================
            SETTINGS
        ================================================== */}

        <Route
          path="/settings"
          element={<Settings />}
        />

      </Route>

      {/* =====================================================
          FALLBACK
      ====================================================== */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}

export default App;