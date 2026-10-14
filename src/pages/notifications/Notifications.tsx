
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { localizeNotification } from "../../lib/deepLNotification";
import { getAppLanguage, type AppLanguage } from "../../lib/deepLLanguage";
import { supabase } from "../../lib/supabase";
import DeepLText from "../../components/layout/DeepLText";

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

type TranslatedNotification = {
  title: string;
  message: string;
};

function formatDate(value: string, language: AppLanguage) {
  return new Date(value).toLocaleString(
    language === "FR" ? "fr-FR" : "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export default function Notifications() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState<AppLanguage>(getAppLanguage);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [translatedNotifications, setTranslatedNotifications] = useState<
    Record<string, TranslatedNotification>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<{ language: AppLanguage }>;
      setLanguage(customEvent.detail.language);
    }

    window.addEventListener("afridev-language-change", handleLanguageChange);

    return () =>
      window.removeEventListener(
        "afridev-language-change",
        handleLanguageChange,
      );
  }, []);

  async function loadNotifications(userId: string) {
    const { data, error: queryError } = await supabase
      .from("notifications")
      .select(
        "id, type, title, message, link, read, created_at, translation_key, translation_params",
      )
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

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user || !mounted) return;

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
            () => {
              void loadNotifications(user.id);
            },
          )
          .subscribe();
      } catch (setupError) {
        console.error("Notification setup error:", setupError);

        if (mounted) {
          setError("Unable to load notifications right now.");
        }
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

  useEffect(() => {
    let cancelled = false;

    async function translateNotifications() {
      if (language === "EN") {
        setTranslatedNotifications(
          Object.fromEntries(
            notifications.map((notification) => [
              notification.id,
              {
                title: notification.title,
                message: notification.message,
              },
            ]),
          ),
        );
        return;
      }

      const results = await Promise.all(
        notifications.map(async (notification) => {
          try {
            const translated = await localizeNotification(notification);

            return [
              notification.id,
              translated,
            ] as const;
          } catch (translationError) {
            console.error(
              `Translation failed for notification ${notification.id}:`,
              translationError,
            );

            return [
              notification.id,
              {
                title: notification.title,
                message: notification.message,
              },
            ] as const;
          }
        }),
      );

      if (!cancelled) {
        setTranslatedNotifications(Object.fromEntries(results));
      }
    }

    void translateNotifications();

    return () => {
      cancelled = true;
    };
  }, [notifications, language]);

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
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
    }

    if (notification.link) navigate(notification.link);
  }

  async function markAllRead() {
    const unreadIds = notifications
      .filter((item) => !item.read)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    if (updateError) {
      console.error("Mark all notifications read error:", updateError);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  }

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            <DeepLText text="Activity" />
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            <DeepLText text="Notifications" />
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            <DeepLText text="Stay up to date with your matches, exchanges, projects and network." />
          </p>
        </div>

        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck size={17} />
          <DeepLText text="Mark all as read" />
        </button>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

            <p className="mt-4 text-sm font-medium text-slate-500">
              <DeepLText text="Loading your notifications..." />
            </p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto text-slate-300" size={34} />

            <h2 className="mt-4 font-bold text-slate-900">
              <DeepLText text="Notifications unavailable" />
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              <DeepLText text={error} />
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Bell size={23} />
            </div>

            <h2 className="mt-5 font-bold text-slate-900">
              <DeepLText text="You’re all caught up" />
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              <DeepLText text="New matches, exchanges, project activity and network updates will appear here." />
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const translated = translatedNotifications[notification.id];

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => void markRead(notification)}
                className={`flex w-full min-w-0 gap-3 border-b border-slate-100 p-4 text-left transition last:border-b-0 hover:bg-slate-50 sm:gap-4 sm:p-5 ${
                  notification.read ? "bg-white" : "bg-blue-50/40"
                }`}
              >
                <span
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                    notification.read ? "bg-slate-200" : "bg-blue-700"
                  }`}
                />

                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 flex-col justify-between gap-1 sm:flex-row sm:items-start">
                    <span className="min-w-0 break-words font-bold text-slate-900 [overflow-wrap:anywhere]">
                      {translated?.title ?? notification.title}
                    </span>

                    <span className="max-w-full break-words text-left text-xs text-slate-400 [overflow-wrap:anywhere] sm:shrink-0 sm:text-right">
                      {formatDate(notification.created_at, language)}
                    </span>
                  </span>

                  <span className="mt-1 block whitespace-normal break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                    {translated?.message ?? notification.message}
                  </span>

                  {notification.link && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                      <DeepLText text="Open" />
                      <ExternalLink size={12} />
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
