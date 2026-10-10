import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications(userId: string) {
    const { data, error: queryError } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (queryError) {
      console.error("Notification loading error:", queryError);
      setError("Unable to load notifications right now.");
      return;
    }

    setError("");
    setNotifications((data ?? []) as Notification[]);
  }

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !mounted) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        await loadNotifications(user.id);

        if (!mounted) return;

        channel = supabase
          .channel(`notifications-page-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            () => void loadNotifications(user.id)
          )
          .subscribe();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void setup();

    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  async function markRead(notification: Notification) {
    if (!notification.read) {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification.id);

      if (updateError) {
        console.error("Mark notification read error:", updateError);
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
    }

    if (notification.link) navigate(notification.link);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
    if (!unreadIds.length) return;

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    if (updateError) {
      console.error("Mark all notifications read error:", updateError);
      return;
    }

    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Activity
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Notifications
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Stay up to date with your matches, exchanges, projects and network.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck size={17} />
          Mark all as read
        </button>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading your notifications...
            </p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto text-slate-300" size={34} />
            <h2 className="mt-4 font-bold text-slate-900">Notifications unavailable</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Bell size={23} />
            </div>
            <h2 className="mt-5 font-bold text-slate-900">You&apos;re all caught up</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              New matches, exchanges, project activity and network updates will appear here.
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void markRead(notification)}
              className={`flex w-full gap-4 border-b border-slate-100 p-5 text-left transition last:border-b-0 hover:bg-slate-50 ${
                notification.read ? "bg-white" : "bg-blue-50/40"
              }`}
            >
              <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                notification.read ? "bg-slate-200" : "bg-blue-700"
              }`} />

              <span className="min-w-0 flex-1">
                <span className="flex flex-col justify-between gap-1 sm:flex-row">
                  <span className="font-bold text-slate-900">{notification.title}</span>
                  <span className="text-xs text-slate-400">
                    {formatDate(notification.created_at)}
                  </span>
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  {notification.message}
                </span>
                {notification.link && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                    Open <ExternalLink size={12} />
                  </span>
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
