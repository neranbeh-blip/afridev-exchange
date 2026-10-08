import {
  Bell,
  CheckCheck,
  Code2,
  Compass,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import afridevLogo from "../../assets/afridev-logo-dark-wordmark.png";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  avatar_url: string | null;
};

function timeAgo(value: string) {
  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(value).getTime()) / 1000
    )
  );

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
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
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const notificationRef =
    useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  async function loadNotifications(
    userId: string
  ) {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, type, title, message, link, read, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (error) {
      console.error(
        "Notification loading error:",
        error
      );
      return;
    }

    setNotifications(
      (data ?? []) as Notification[]
    );
  }

  useEffect(() => {
    let mounted = true;

    let channel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    async function setupNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        return;
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, full_name, username, country, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error("Profile loading error:", profileError);
      } else if (mounted) {
        setProfile(profileData as Profile | null);
      }

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

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        notificationsOpen &&
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target as Node
        )
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [notificationsOpen]);

  async function markNotificationRead(
    notification: Notification
  ) {
    if (!notification.read) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification.id);

      if (error) {
        console.error(
          "Notification read error:",
          error
        );
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );
    }

    setNotificationsOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  }

  async function markAllNotificationsRead() {
    const unreadIds = notifications
      .filter((item) => !item.read)
      .map((item) => item.id);

    if (unreadIds.length === 0) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    if (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
      }))
    );
  }

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Sign out error:",
        error
      );

      setSigningOut(false);
      return;
    }

    setMobileMenuOpen(false);

    navigate("/login", {
      replace: true,
    });
  }

  function openSettings() {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);

    navigate("/settings");
  }

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    "Developer";

  const displayCountry =
    profile?.country?.trim() || "Cameroon";

  const initials = (() => {
    const name = displayName.trim();

    if (!name || name === "Developer") {
      return "DV";
    }

    const parts = name
      .split(/\\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside className="fixed inset-y-0 left-0 hidden w-[278px] bg-[#07111f] text-white lg:block">

        <div className="flex h-full flex-col">

          {/* BRAND */}

          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">

            <div className="flex items-center">
              <img
                src={afridevLogo}
                alt="AfriDev Developer Exchange"
                className="h-11 w-auto max-w-[190px] object-contain"
              />
            </div>

          </div>

          {/* NAVIGATION */}

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">

            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Workspace
            </p>

            {navigation
              .slice(0, 6)
              .map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}

            <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Identity & Trust
            </p>

            {navigation
              .slice(6)
              .map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}

          </nav>

          {/* NETWORK CARD */}

          <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-white/5 p-4">

            <p className="text-xs font-bold text-white">
              African Developer Network
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Exchange skills. Build together.
              Prove your impact.
            </p>

          </div>

          {/* SETTINGS + SIGN OUT */}

          <div className="border-t border-white/10 p-3">

            <button
              type="button"
              onClick={openSettings}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <Settings size={18} />

              Settings
            </button>

            <button
              type="button"
              onClick={() =>
                void handleSignOut()
              }
              disabled={signingOut}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={18} />

              {signingOut
                ? "Signing out..."
                : "Sign out"}
            </button>

          </div>

        </div>

      </aside>

      {/* =====================================================
          MOBILE DRAWER
      ====================================================== */}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">

          <div
            className="absolute inset-0 bg-slate-950/60"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          />

          <aside className="relative flex h-full w-[290px] flex-col bg-[#07111f] text-white shadow-2xl">

            {/* MOBILE BRAND */}

            <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">

              <div className="flex items-center">
                <img
                  src={afridevLogo}
                  alt="AfriDev Developer Exchange"
                  className="h-11 w-auto max-w-[190px] object-contain"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(false)
                }
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>

            </div>

            {/* MOBILE NAV */}

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">

              <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Workspace
              </p>

              {navigation
                .slice(0, 6)
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() =>
                        setMobileMenuOpen(false)
                      }
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      <Icon size={18} />
                      {item.label}
                    </NavLink>
                  );
                })}

              <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Identity & Trust
              </p>

              {navigation
                .slice(6)
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() =>
                        setMobileMenuOpen(false)
                      }
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      <Icon size={18} />
                      {item.label}
                    </NavLink>
                  );
                })}

            </nav>

            {/* MOBILE SETTINGS */}

            <div className="border-t border-white/10 p-3">

              <button
                type="button"
                onClick={openSettings}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <Settings size={18} />

                Settings
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSignOut()
                }
                disabled={signingOut}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                <LogOut size={18} />

                {signingOut
                  ? "Signing out..."
                  : "Sign out"}
              </button>

            </div>

          </aside>

        </div>
      )}

      {/* =====================================================
          MAIN APPLICATION
      ====================================================== */}

      <div className="lg:pl-[278px]">

        {/* TOP BAR */}

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">

          {/* LEFT */}

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(true)
              }
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div className="hidden md:block">

              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                AfriDev Exchange
              </p>

              <p className="mt-0.5 font-bold text-slate-950">
                Build together.
              </p>

            </div>

          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-3">

            {/* NOTIFICATIONS */}

            <div
              ref={notificationRef}
              className="relative"
            >

              <button
                type="button"
                onClick={() =>
                  setNotificationsOpen(
                    (open) => !open
                  )
                }
                className="relative rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100"
                aria-label="Notifications"
              >

                <Bell size={20} />

                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}

              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">

                    <div>
                      <p className="font-bold text-slate-950">
                        Notifications
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {unreadCount} unread
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void markAllNotificationsRead()
                      }
                      disabled={
                        unreadCount === 0
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 disabled:text-slate-300"
                    >
                      <CheckCheck size={14} />

                      Mark all read
                    </button>

                  </div>

                  <div className="max-h-[28rem] overflow-y-auto">

                    {notifications.length ===
                    0 ? (

                      <div className="px-5 py-10 text-center">

                        <Bell
                          size={28}
                          className="mx-auto text-slate-300"
                        />

                        <p className="mt-3 text-sm font-bold text-slate-700">
                          You're all caught up
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          New matches and collaboration
                          updates will appear here.
                        </p>

                      </div>

                    ) : (

                      notifications.map(
                        (notification) => (
                          <button
                            key={
                              notification.id
                            }
                            type="button"
                            onClick={() =>
                              void markNotificationRead(
                                notification
                              )
                            }
                            className={`flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 ${
                              notification.read
                                ? "bg-white"
                                : "bg-blue-50/50"
                            }`}
                          >

                            <span
                              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                notification.read
                                  ? "bg-slate-200"
                                  : "bg-blue-600"
                              }`}
                            />

                            <span className="min-w-0 flex-1">

                              <span className="flex items-start justify-between gap-3">

                                <span className="font-semibold text-slate-900">
                                  {
                                    notification.title
                                  }
                                </span>

                                <span className="shrink-0 text-[11px] text-slate-400">
                                  {timeAgo(
                                    notification.created_at
                                  )}
                                </span>

                              </span>

                              <span className="mt-1 block text-sm leading-5 text-slate-500">
                                {
                                  notification.message
                                }
                              </span>

                              {notification.link && (
                                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                                  Open

                                  <ExternalLink
                                    size={12}
                                  />
                                </span>
                              )}

                            </span>

                          </button>
                        )
                      )

                    )}

                  </div>

                  <div className="border-t border-slate-100 p-2">

                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(
                          false
                        );

                        navigate(
                          "/notifications"
                        );
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50"
                    >
                      View all notifications
                    </button>

                  </div>

                </div>
              )}

            </div>

            {/* SEPARATOR */}

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            {/* USER */}

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">
                {initials}
              </div>

              <div className="hidden sm:block">

                <p className="max-w-[180px] truncate text-sm font-bold text-slate-950">
                  {displayName}
                </p>

                <p className="text-xs text-slate-500">
                  {displayCountry}
                </p>

              </div>

            </div>

          </div>

        </header>

        {/* PAGE CONTENT */}

        <main className="min-h-[calc(100vh-5rem)]">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default AppShell;