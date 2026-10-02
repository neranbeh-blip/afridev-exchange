import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/layout/AppShell";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-950">
        {title}
      </h1>

      <p className="mt-2 text-slate-500">
        This section is coming next.
      </p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Public routes */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* Application */}

        <Route element={<AppShell />}>

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/discover"
            element={<Placeholder title="Discover" />}
          />

          <Route
            path="/exchange"
            element={<Placeholder title="Exchange" />}
          />

          <Route
            path="/projects"
            element={<Placeholder title="Projects" />}
          />

          <Route
            path="/messages"
            element={<Placeholder title="Messages" />}
          />

          <Route
            path="/passport"
            element={<Placeholder title="Developer Passport" />}
          />

          <Route
            path="/notifications"
            element={<Placeholder title="Notifications" />}
          />

          <Route
            path="/settings"
            element={<Placeholder title="Settings" />}
          />

        </Route>


        {/* Default */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;