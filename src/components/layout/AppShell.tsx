import {
  Bell,
  Code2,
  Compass,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  Settings,
  UserRound,
  Sparkles,
  X,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

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
    label: "Problems",
    path: "/problems",
    icon: Sparkles,
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
    label: "Evidence Verification",
    path: "/admin/evidence",
    icon: ShieldCheck,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
];

function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((item) => !item.read).length;

  async function loadNotifications(userId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Notification loading error:", error);
      return;
    }

    setNotifications((data ?? []) as Notification[]);
  }

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      await loadNotifications(user.id);

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void loadNotifications(user.id);
          }
        )
        .subscribe();
    }

    void setupNotifications();

    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        notificationsOpen &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [notificationsOpen]);

  async function markNotificationRead(notification: Notification) {
    if (!notification.read) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
    }

    setNotificationsOpen(false);
    if (notification.link) navigate(notification.link);
  }

  async function markAllNotificationsRead() {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    if (error) {
      console.error("Mark all notifications read error:", error);
      return;
    }

    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }

  async function handleSignOut() {
    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      setSigningOut(false);
      return;
    }

    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}
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
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <Settings size={19} />
              Settings
            </NavLink>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={19} />

              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MOBILE MENU
      ====================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <aside className="relative flex h-full w-72 flex-col bg-white shadow-xl">
            {/* Mobile Header */}
            <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
              <div className="flex items-center gap-3">
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

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
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

            {/* Mobile Bottom */}
            <div className="border-t border-slate-100 p-3">
              <NavLink
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`
                }
              >
                <Settings size={19} />
                Settings
              </NavLink>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={19} />

                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================
          MAIN AREA
      ====================================================== */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
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

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-950">Notifications</p>
                      <p className="text-xs text-slate-500">
                        {unreadCount} unread
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void markAllNotificationsRead()}
                      disabled={unreadCount === 0}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 disabled:text-slate-300"
                    >
                      <CheckCheck size={14} />
                      Mark all read
                    </button>
                  </div>

                  <div className="max-h-[28rem] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <Bell className="mx-auto text-slate-300" size={28} />
                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          You're all caught up
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          New matches and collaboration updates will appear here.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => void markNotificationRead(notification)}
                          className={`flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 ${
                            notification.read ? "bg-white" : "bg-blue-50/50"
                          }`}
                        >
                          <span
                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                              notification.read ? "bg-slate-200" : "bg-blue-700"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span className="font-semibold text-slate-900">
                                {notification.title}
                              </span>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {timeAgo(notification.created_at)}
                              </span>
                            </span>
                            <span className="mt-1 block text-sm leading-5 text-slate-500">
                              {notification.message}
                            </span>
                            {notification.link && (
                              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                                Open
                                <ExternalLink size={12} />
                              </span>
                            )}
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate("/notifications");
                      }}
                      className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            {/* User */}
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