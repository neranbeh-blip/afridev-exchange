import {
  Bell,
  CheckCheck,
  ChevronRight,
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
import DeepLText from "./DeepLText";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getAppLanguage } from "../../lib/deepLLanguage";
import afridevLogo from "../../assets/afridev-logo-dark-wordmark.png";
import FirstTimeGuide from "../help/FirstTimeGuide";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  translation_key?: string | null;
  translation_params?: Record<string, unknown> | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  avatar_url: string | null;
};

function TimeAgo({ value }: { value: string }) {
  const [language, setLanguage] = useState(getAppLanguage);

  useEffect(() => {
    const onLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ language: "EN" | "FR" }>;
      setLanguage(customEvent.detail.language);
    };

    window.addEventListener("afridev-language-change", onLanguageChange);
    return () =>
      window.removeEventListener("afridev-language-change", onLanguageChange);
  }, []);

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );

  if (seconds < 60) {
    return <DeepLText text="just now" />;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return language === "FR" ? (
      <>{`il y a ${minutes} min`}</>
    ) : (
      <>{`${minutes}m ago`}</>
    );
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return language === "FR" ? (
      <>{`il y a ${hours} h`}</>
    ) : (
      <>{`${hours}h ago`}</>
    );
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return language === "FR" ? (
      <>{`il y a ${days} j`}</>
    ) : (
      <>{`${days}d ago`}</>
    );
  }

  return (
    <>
      {new Date(value).toLocaleDateString(language === "FR" ? "fr-FR" : "en", {
        day: "numeric",
        month: "short",
      })}
    </>
  );
}

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Discover", path: "/discover", icon: Compass },
  { label: "Exchange", path: "/exchange", icon: Network },
  { label: "Problems", path: "/problems", icon: Sparkles },
  { label: "Projects", path: "/projects", icon: Code2 },
  { label: "Completed Projects", path: "/completed-projects", icon: Code2 },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Developer Passport", path: "/passport", icon: UserRound },
  {
    label: "Community Verification",
    path: "/admin/evidence",
    icon: ShieldCheck,
  },
  { label: "Notifications", path: "/notifications", icon: Bell },
];

const navigationGroups = [
  {
    label: "Overview",
    description: "Your workspace",
    items: navigation.filter((item) => item.path === "/dashboard"),
  },
  {
    label: "Discover & Connect",
    description: "People and collaboration",
    items: navigation.filter((item) =>
      ["/discover", "/exchange", "/messages"].includes(item.path),
    ),
  },
  {
    label: "Build & Solve",
    description: "Projects and challenges",
    items: navigation.filter((item) =>
      ["/problems", "/projects", "/completed-projects"].includes(item.path),
    ),
  },
  {
    label: "Trust & Updates",
    description: "Identity and activity",
    items: navigation.filter((item) =>
      ["/passport", "/admin/evidence", "/notifications"].includes(
        item.path,
      ),
    ),
  },
];

function AppShell() {
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((item) => !item.read).length;

  async function loadNotifications(userId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, type, title, message, link, read, created_at, translation_key, translation_params",
      )
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      const { data: profileData, error: profileError } = await supabase
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

      if (!mounted) return;

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
          () => void loadNotifications(user.id),
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
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification.id);

      if (error) {
        console.error("Notification read error:", error);
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
    }

    setNotificationsOpen(false);

    if (notification.link) navigate(notification.link);
  }

  async function markAllNotificationsRead() {
    const unreadIds = notifications
      .filter((item) => !item.read)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    if (error) {
      console.error("Mark all notifications read error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      setSigningOut(false);
      return;
    }

    setMobileMenuOpen(false);
    navigate("/login", { replace: true });
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

  const displayCountry = profile?.country?.trim() || "Cameroon";

  const initials = (() => {
    const name = displayName.trim();

    if (!name || name === "Developer") return "DV";

    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      <FirstTimeGuide />

      {/* DESKTOP SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 hidden w-[278px] bg-[#07111f] text-white lg:block">
        <div className="flex h-full flex-col">
          <div className="flex min-h-24 items-center gap-3 border-b border-white/10 px-4 py-3">
            <img
              src={afridevLogo}
              alt="AfriDev Developer Exchange logo"
              className="h-10 w-[104px] shrink-0 object-contain object-left"
            />

            <div className="min-w-0 border-l border-white/15 pl-3">
              <p className="text-[11px] font-bold leading-4 text-white">
                <DeepLText text="African Developer Network" />
              </p>
              <p className="mt-1 text-[10px] leading-[1.35] text-slate-400">
                <DeepLText text="Exchange skills. Build together. Prove your impact." />
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navigationGroups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <div className="mb-2 flex items-start gap-2 px-3">
                  <span className="mt-1 h-4 w-1 shrink-0 rounded-full bg-cyan-400/80" />
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-200">
                      <DeepLText text={group.label} />
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                      <DeepLText text={group.description} />
                    </p>
                  </div>
                </div>

                <div className="ml-3 space-y-1 border-l border-white/10 pl-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `group flex items-center gap-3 rounded-r-xl border-l-2 px-3 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? "-ml-[3px] border-cyan-300 bg-gradient-to-r from-cyan-400/20 via-blue-500/10 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]"
                              : "border-transparent text-slate-400 hover:border-slate-600 hover:bg-white/[0.04] hover:text-white"
                          }`
                        }
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-slate-400 transition group-hover:bg-white/[0.08] group-hover:text-cyan-200">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <DeepLText text={item.label} />
                        </span>
                        <ChevronRight
                          size={13}
                          className="shrink-0 opacity-0 transition group-hover:opacity-70"
                        />
                      </NavLink>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={openSettings}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <Settings size={18} />
              <DeepLText text="Settings" />
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={18} />
              <DeepLText text={signingOut ? "Signing out..." : "Sign out"} />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="relative flex h-full w-[290px] flex-col bg-[#07111f] text-white shadow-2xl">
            <div className="flex min-h-24 items-center justify-between gap-2 border-b border-white/10 px-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={afridevLogo}
                  alt="AfriDev Developer Exchange logo"
                  className="h-9 w-[92px] shrink-0 object-contain object-left"
                />
                <div className="min-w-0 border-l border-white/15 pl-2">
                  <p className="text-[10px] font-bold leading-4 text-white">
                    <DeepLText text="African Developer Network" />
                  </p>
                  <p className="mt-0.5 text-[9px] leading-[1.35] text-slate-400">
                    <DeepLText text="Exchange skills. Build together. Prove your impact." />
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
                title="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navigationGroups.map((group) => (
                <section key={group.label} aria-label={group.label}>
                  <div className="mb-2 flex items-start gap-2 px-3">
                    <span className="mt-1 h-4 w-1 shrink-0 rounded-full bg-cyan-400/80" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-200">
                        <DeepLText text={group.label} />
                      </p>
                      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                        <DeepLText text={group.description} />
                      </p>
                    </div>
                  </div>

                  <div className="ml-3 space-y-1 border-l border-white/10 pl-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-r-xl border-l-2 px-3 py-2.5 text-sm font-semibold transition ${
                              isActive
                                ? "-ml-[3px] border-cyan-300 bg-gradient-to-r from-cyan-400/20 via-blue-500/10 to-transparent text-white"
                                : "border-transparent text-slate-400 hover:border-slate-600 hover:bg-white/[0.04] hover:text-white"
                            }`
                          }
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-slate-400">
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <DeepLText text={item.label} />
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>

            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={openSettings}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <Settings size={18} />
                <DeepLText text="Settings" />
              </button>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                <LogOut size={18} />
                <DeepLText text={signingOut ? "Signing out..." : "Sign out"} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN APPLICATION */}
      <div className="lg:pl-[278px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
              title="Open menu"
            >
              <Menu size={22} />
            </button>

            <div className="hidden md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                AfriDev Exchange
              </p>
              <p className="mt-0.5 font-bold text-slate-950">
                <DeepLText text="Build together." />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* NOTIFICATIONS */}
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="fixed left-3 right-3 top-[5.25rem] z-50 mx-auto max-h-[calc(100vh-6rem)] w-auto max-w-[390px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:mx-0 sm:w-[390px]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                    <div>
                      <p className="font-bold text-slate-950">
                        <DeepLText text="Notifications" />
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {unreadCount} <DeepLText text="unread" />
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void markAllNotificationsRead()}
                      disabled={unreadCount === 0}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 disabled:text-slate-300"
                    >
                      <CheckCheck size={14} />
                      <DeepLText text="Mark all read" />
                    </button>
                  </div>

                  <div className="max-h-[28rem] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {notifications.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <Bell
                          size={28}
                          className="mx-auto text-slate-300"
                        />
                        <p className="mt-3 text-sm font-bold text-slate-700">
                          <DeepLText text="You're all caught up" />
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          <DeepLText text="New matches and collaboration updates will appear here." />
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
                              notification.read ? "bg-slate-200" : "bg-blue-600"
                            }`}
                          />

                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                              <span className="min-w-0 break-words font-semibold text-slate-900 [overflow-wrap:anywhere]">
                                <DeepLText text={notification.title} />
                              </span>
                              <span className="max-w-full break-words text-[11px] text-slate-400 [overflow-wrap:anywhere] sm:shrink-0">
                                <TimeAgo value={notification.created_at} />
                              </span>
                            </span>

                            <span className="mt-1 block whitespace-normal break-words text-sm leading-5 text-slate-500 [overflow-wrap:anywhere]">
                              <DeepLText text={notification.message} />
                            </span>

                            {notification.link && (
                              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                                <DeepLText text="Open" />
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
                      className="w-full rounded-xl px-3 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50"
                    >
                      <DeepLText text="View all notifications" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setNotificationsOpen(false);
                navigate("/passport");
              }}
              aria-label="Open your Developer Passport"
              title="Open Developer Passport"
              className="group flex min-w-0 items-center gap-3 rounded-2xl border border-transparent px-2 py-1.5 text-left transition hover:border-cyan-100 hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700 transition group-hover:bg-cyan-100 group-hover:text-cyan-800">
                  {initials}
                </div>
              )}

              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[180px] truncate text-sm font-bold text-slate-950">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">{displayCountry}</p>
              </div>
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;