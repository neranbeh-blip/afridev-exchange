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

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading] = useState(true);

  async function loadNotifications(userId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Notification loading error:", error);
      return;
    }

    setNotifications((data ?? []) as Notification[]);
  }

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      await loadNotifications(user.id);

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
    }

    void setup();

    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  async function markRead(notification: Notification) {
    if (notification.read) {
      if (notification.link) navigate(notification.link);
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    if (error) {
      console.error("Mark notification read error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );

    if (notification.link) navigate(notification.link);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
    if (!unreadIds.length) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    if (error) {
      console.error("Mark all notifications read error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true }))
    );
  }

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-blue-700">
            <Bell size={16} />
            Updates
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Notifications
          </h1>
          <p className="mt-2 text-slate-500">
            Stay up to date with your matches, exchanges and collaborations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck size={17} />
          Mark all as read
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto text-slate-300" size={34} />
            <h2 className="mt-4 font-bold text-slate-900">
              You're all caught up
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              New matches, exchanges, project activity and contribution updates
              will appear here.
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void markRead(notification)}
              className={`flex w-full gap-4 border-b border-slate-100 p-5 text-left transition last:border-b-0 hover:bg-slate-50 ${
                notification.read ? "bg-white" : "bg-blue-50/50"
              }`}
            >
              <span
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                  notification.read ? "bg-slate-200" : "bg-blue-700"
                }`}
              />

              <span className="min-w-0 flex-1">
                <span className="flex flex-col justify-between gap-1 sm:flex-row">
                  <span className="font-bold text-slate-900">
                    {notification.title}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(notification.created_at)}
                  </span>
                </span>

                <span className="mt-1 block text-sm leading-6 text-slate-600">
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
    </div>
  );
}

export default Notifications;
