import {
  Bell,
  Code2,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Discover",
    path: "/discover",
    icon: Compass,
  },
  {
    label: "Exchange",
    path: "/exchange",
    icon: Network,
  },
  {
    label: "Projects",
    path: "/projects",
    icon: Code2,
  },
  {
    label: "Messages",
    path: "/messages",
    icon: MessageSquare,
  },
  {
    label: "Developer Passport",
    path: "/passport",
    icon: UserRound,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
];

function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">

        <div className="flex h-full flex-col">

          {/* Logo */}
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
              <Code2 size={21} />
            </div>

            <div>
              <p className="font-bold text-slate-950">
                AfriDev
              </p>

              <p className="text-xs text-slate-500">
                Exchange
              </p>
            </div>

          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-6">

            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`
                  }
                >
                  <Icon size={19} />
                  {item.label}
                </NavLink>
              );
            })}

          </nav>

          {/* Bottom */}
          <div className="border-t border-slate-100 p-3">

            <NavLink
              to="/settings"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Settings size={19} />
              Settings
            </NavLink>

            <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
              <LogOut size={19} />
              Sign out
            </button>

          </div>

        </div>

      </aside>


      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">

          <div
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="relative h-full w-72 bg-white shadow-xl">

            <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
                  <Code2 size={21} />
                </div>

                <div>
                  <p className="font-bold">
                    AfriDev
                  </p>

                  <p className="text-xs text-slate-500">
                    Exchange
                  </p>
                </div>

              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>

            <nav className="space-y-1 px-3 py-6">

              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`
                    }
                  >
                    <Icon size={19} />
                    {item.label}
                  </NavLink>
                );
              })}

            </nav>

          </aside>

        </div>
      )}


      {/* Main Area */}
      <div className="lg:pl-64">

        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">

          <div className="flex items-center gap-3">

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-500">
                AfriDev Exchange
              </p>

              <p className="font-semibold text-slate-950">
                Build together.
              </p>
            </div>

          </div>


          <div className="flex items-center gap-3">

            <button className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100">

              <Bell size={20} />

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />

            </button>


            <div className="hidden h-8 w-px bg-slate-200 sm:block" />


            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                AD
              </div>

              <div className="hidden sm:block">

                <p className="text-sm font-semibold text-slate-950">
                  Developer
                </p>

                <p className="text-xs text-slate-500">
                  Cameroon 🇨🇲
                </p>

              </div>

            </div>

          </div>

        </header>


        {/* Page */}
        <main className="min-h-[calc(100vh-5rem)]">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default AppShell;