import {
  ArrowLeft,
  Check,
  Clock3,
  MessageCircle,
  MessageSquare,
  Search,
  Send,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  country: string | null;
};

type Conversation = {
  id: string;
  exchange_id: string | null;
  project_id: string | null;
  created_at: string;
  partner: Profile | null;
  lastMessage: {
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type ConversationRequest = {
  id: string;
  sender_id: string;
  recipient_id: string;
  conversation_id: string | null;
  initial_message: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  sender: Profile | null;
};

type RpcResult = {
  conversation_id?: string;
  request_id?: string;
  [key: string]: unknown;
};

function initials(profile: Profile | null) {
  const name = profile?.full_name?.trim() || profile?.username?.trim() || "";
  if (!name) return "AD";

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function profileName(profile: Profile | null) {
  return profile?.full_name || (profile?.username ? `@${profile.username}` : "Developer");
}

function getConversationId(result: unknown) {
  if (!result || typeof result !== "object") return null;

  const value = result as RpcResult;
  const direct = value.conversation_id;

  return typeof direct === "string" ? direct : null;
}

export default function Messages() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<ConversationRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [developerSearch, setDeveloperSearch] = useState("");
  const [developers, setDevelopers] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<"messages" | "requests">("messages");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedDeveloper, setSelectedDeveloper] = useState<Profile | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [developersLoading, setDevelopersLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [requestAction, setRequestAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      const name = conversation.partner?.full_name?.toLowerCase() || "";
      const username = conversation.partner?.username?.toLowerCase() || "";
      const message = conversation.lastMessage?.content?.toLowerCase() || "";

      return name.includes(query) || username.includes(query) || message.includes(query);
    });
  }, [conversations, search]);

  async function loadConversations(userId: string) {
    const { data: participantRows, error: participantError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("developer_id", userId);

    if (participantError) throw participantError;

    const ids = Array.from(
      new Set((participantRows ?? []).map((row) => row.conversation_id).filter(Boolean)),
    );

    if (!ids.length) {
      setConversations([]);
      setSelectedId(null);
      return;
    }

    const { data: conversationRows, error: conversationError } = await supabase
      .from("conversations")
      .select("id, exchange_id, project_id, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });

    if (conversationError) throw conversationError;

    const { data: otherParticipants, error: otherError } = await supabase
      .from("conversation_participants")
      .select(
        "conversation_id, developer_id, profile:profiles(id, full_name, username, avatar_url, country)",
      )
      .in("conversation_id", ids)
      .neq("developer_id", userId);

    if (otherError) throw otherError;

    const profileByConversation = new Map<string, Profile>();

    for (const row of (otherParticipants ?? []) as Array<{
      conversation_id: string;
      developer_id: string;
      profile: Profile | Profile[] | null;
    }>) {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      if (profile) profileByConversation.set(row.conversation_id, profile);
    }

    const conversationData = await Promise.all(
      (conversationRows ?? []).map(async (conversation) => {
        const { data: lastRows, error: lastError } = await supabase
          .from("messages")
          .select("content, sender_id, created_at")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (lastError) throw lastError;

        return {
          ...conversation,
          partner: profileByConversation.get(conversation.id) ?? null,
          lastMessage: lastRows?.[0] ?? null,
        } as Conversation;
      }),
    );

    setConversations(conversationData);

    if (!selectedId || !conversationData.some((item) => item.id === selectedId)) {
      setSelectedId(conversationData[0]?.id ?? null);
    }
  }

  async function loadRequests(userId: string) {
    setRequestsLoading(true);

    try {
      const { data, error: requestError } = await supabase
        .from("conversation_requests")
        .select(
          "id, sender_id, recipient_id, conversation_id, initial_message, status, created_at, responded_at",
        )
        .eq("recipient_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;

      const rows = data ?? [];
      const senderIds = Array.from(new Set(rows.map((row) => row.sender_id)));

      let profileMap = new Map<string, Profile>();

      if (senderIds.length) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, country")
          .in("id", senderIds);

        if (profileError) throw profileError;

        profileMap = new Map(
          ((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]),
        );
      }

      setRequests(
        rows.map((row) => ({
          ...row,
          sender: profileMap.get(row.sender_id) ?? null,
        })) as ConversationRequest[],
      );
    } catch (err) {
      console.error("Request loading error:", err);
      setError("Unable to load message requests.");
    } finally {
      setRequestsLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    setMessagesLoading(true);

    const { data, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messageError) {
      console.error("Message loading error:", messageError);
      setError("Unable to load this conversation.");
      setMessages([]);
    } else {
      setError("");
      setMessages((data ?? []) as Message[]);
    }

    setMessagesLoading(false);
  }

  async function searchDevelopers(query: string) {
    setDeveloperSearch(query);

    const cleanQuery = query.trim();
    if (cleanQuery.length < 2 || !currentUserId) {
      setDevelopers([]);
      return;
    }

    setDevelopersLoading(true);

    const { data, error: searchError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, country")
      .neq("id", currentUserId)
      .or(`full_name.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%`)
      .limit(12);

    if (searchError) {
      console.error("Developer search error:", searchError);
      setError("Unable to search developers.");
      setDevelopers([]);
    } else {
      setDevelopers((data ?? []) as Profile[]);
    }

    setDevelopersLoading(false);
  }

  async function sendNewMessage() {
    const content = requestMessage.trim();

    if (
      !selectedDeveloper ||
      !currentUserId ||
      !content ||
      content.length > 500 ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("start_direct_conversation", {
      p_recipient_id: selectedDeveloper.id,
      p_initial_message: content,
    });

    if (rpcError) {
      console.error("Start direct conversation error:", rpcError);
      setError(rpcError.message || "Unable to start this conversation.");
      setSending(false);
      return;
    }

    const conversationId = getConversationId(data);

    setRequestMessage("");
    setSelectedDeveloper(null);
    setDeveloperSearch("");
    setDevelopers([]);
    setShowNewMessage(false);
    setSending(false);

    await loadRequests(currentUserId);
    await loadConversations(currentUserId);

    if (conversationId) {
      setSelectedId(conversationId);
      setActiveTab("messages");
    } else {
      setActiveTab("requests");
    }
  }

  async function acceptRequest(request: ConversationRequest) {
    if (requestAction) return;

    setRequestAction(request.id);
    setError("");

    const { data, error: acceptError } = await supabase.rpc(
      "accept_conversation_request",
      { p_request_id: request.id },
    );

    if (acceptError) {
      console.error("Accept request error:", acceptError);
      setError(acceptError.message || "Unable to accept this request.");
      setRequestAction(null);
      return;
    }

    const conversationId = getConversationId(data);

    await loadRequests(currentUserId);
    await loadConversations(currentUserId);

    if (conversationId) {
      setSelectedId(conversationId);
      setActiveTab("messages");
    }

    setRequestAction(null);
  }

  async function declineRequest(request: ConversationRequest) {
    if (requestAction) return;

    setRequestAction(request.id);
    setError("");

    const { error: declineError } = await supabase.rpc(
      "decline_conversation_request",
      { p_request_id: request.id },
    );

    if (declineError) {
      console.error("Decline request error:", declineError);
      setError(declineError.message || "Unable to decline this request.");
      setRequestAction(null);
      return;
    }

    await loadRequests(currentUserId);
    setRequestAction(null);
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !selectedId || !currentUserId || sending) return;

    setSending(true);
    setError("");

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedId,
        sender_id: currentUserId,
        content,
      })
      .select("id, conversation_id, sender_id, content, created_at")
      .single();

    if (sendError) {
      console.error("Message send error:", sendError);
      setError("Unable to send this message.");
      setSending(false);
      return;
    }

    setMessages((current) => {
      if (current.some((message) => message.id === data.id)) return current;
      return [...current, data as Message];
    });

    setDraft("");
    setSending(false);
    void loadConversations(currentUserId);
  }

  useEffect(() => {
    if (!currentUserId) return;

    const developerId = searchParams.get("developer");
    if (!developerId || developerId === currentUserId) return;

    let cancelled = false;

    async function openDeveloperFromPassport() {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, country")
        .eq("id", developerId)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error("Preselected developer loading error:", profileError);
        setError("Unable to load this developer.");
        return;
      }

      if (!data) {
        setError("Developer profile not found.");
        return;
      }

      setSelectedDeveloper(data as Profile);
      setRequestMessage("");
      setDeveloperSearch("");
      setDevelopers([]);
      setShowNewMessage(true);
    }

    void openDeveloperFromPassport();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, searchParams]);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        if (mounted) setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      try {
        await Promise.all([loadConversations(user.id), loadRequests(user.id)]);
      } catch (err) {
        console.error("Messaging setup error:", err);
        if (mounted) setError("Unable to load your messages.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void setup();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedId);

    const channel = supabase
      .channel(`messages-page-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        () => {
          void loadMessages(selectedId);
          if (currentUserId) void loadConversations(currentUserId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`message-requests-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_requests",
        },
        () => {
          void loadRequests(currentUserId);
          void loadConversations(currentUserId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
          <p className="mt-4 text-sm text-slate-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Communication
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Messages
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Connect directly with African developers and collaborate with your network.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowNewMessage(true);
            setSelectedDeveloper(null);
            setDeveloperSearch("");
            setDevelopers([]);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
        >
          <MessageCircle size={17} />
          New message
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 rounded-lg p-1 hover:bg-red-100"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col border-b border-slate-200 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab("messages")}
              className={`border-b-2 px-5 py-4 text-sm font-bold transition ${
                activeTab === "messages"
                  ? "border-blue-700 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Messages
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={`relative border-b-2 px-5 py-4 text-sm font-bold transition ${
                activeTab === "requests"
                  ? "border-blue-700 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Message requests
              {requests.length > 0 && (
                <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {requests.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "messages" && (
            <div className="px-4 pb-3 lg:pb-0 lg:pr-4">
              <div className="relative lg:w-72">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}
        </div>

        {activeTab === "requests" ? (
          <div className="min-h-[620px] p-4 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-950">Message requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                Developers outside your direct network can introduce themselves here.
              </p>
            </div>

            {requestsLoading ? (
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
              </div>
            ) : requests.length === 0 ? (
              <div className="flex min-h-[400px] items-center justify-center text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Clock3 size={26} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    No pending requests
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    New introductions from developers will appear here for your review.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-3">
                {requests.map((request) => {
                  const sender = request.sender;
                  const busy = requestAction === request.id;

                  return (
                    <article
                      key={request.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5"
                    >
                      <div className="flex gap-4">
                        {sender?.avatar_url ? (
                          <img
                            src={sender.avatar_url}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            {initials(sender)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col justify-between gap-1 sm:flex-row">
                            <div>
                              <Link
                                to={sender ? `/developer/${sender.id}` : "#"}
                                className="font-bold text-slate-950 hover:text-blue-700"
                              >
                                {profileName(sender)}
                              </Link>
                              {sender?.username && (
                                <span className="ml-2 text-xs text-slate-400">
                                  @{sender.username}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {formatDate(request.created_at)}
                            </span>
                          </div>

                          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                            {request.initial_message}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void acceptRequest(request)}
                              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                            >
                              <Check size={15} />
                              Accept
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void declineRequest(request)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <X size={15} />
                              Decline
                            </button>

                            {sender && (
                              <Link
                                to={`/developer/${sender.id}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              >
                                View Passport
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="grid min-h-[620px] lg:grid-cols-[330px_1fr]">
            <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
              <div className="max-h-[620px] overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <MessageSquare size={21} />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-800">
                      No conversations yet
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Start a conversation with another developer to build your network.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewMessage(true)}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
                    >
                      <UserPlus size={15} />
                      Find a developer
                    </button>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const active = conversation.id === selectedId;
                    const partner = conversation.partner;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedId(conversation.id)}
                        className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition ${
                          active ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        {partner?.avatar_url ? (
                          <img
                            src={partner.avatar_url}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            {initials(partner)}
                          </div>
                        )}

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-bold text-slate-900">
                              {profileName(partner)}
                            </span>
                            {conversation.lastMessage && (
                              <span className="text-[11px] text-slate-400">
                                {formatTime(conversation.lastMessage.created_at)}
                              </span>
                            )}
                          </span>

                          <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                            {!conversation.exchange_id && !conversation.project_id && (
                              <MessageCircle size={12} className="shrink-0 text-blue-500" />
                            )}
                            <span className="truncate">
                              {conversation.lastMessage?.content || "Start the conversation"}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <main className="flex min-h-[620px] flex-col">
              {!selectedConversation ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <div>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Users size={26} />
                    </div>
                    <h2 className="mt-5 text-lg font-bold text-slate-900">
                      Your conversations
                    </h2>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      Select a conversation or start a new message with a developer.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      {selectedConversation.partner?.avatar_url ? (
                        <img
                          src={selectedConversation.partner.avatar_url}
                          alt=""
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                          {initials(selectedConversation.partner)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h2 className="truncate font-bold text-slate-950">
                          {profileName(selectedConversation.partner)}
                        </h2>

                        {selectedConversation.partner?.username && (
                          <Link
                            to={`/developer/${selectedConversation.partner.id}`}
                            className="text-xs font-semibold text-blue-700 hover:underline"
                          >
                            @{selectedConversation.partner.username}
                          </Link>
                        )}
                      </div>
                    </div>

                    {selectedConversation.partner && (
                      <Link
                        to={`/developer/${selectedConversation.partner.id}`}
                        className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"
                      >
                        View Passport
                      </Link>
                    )}
                  </header>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-5 sm:p-6">
                    {messagesLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center">
                        <div>
                          <MessageSquare className="mx-auto text-slate-300" size={32} />
                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No messages yet
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Send the first message to start collaborating.
                          </p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const mine = message.sender_id === currentUserId;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                                mine
                                  ? "rounded-br-md bg-blue-700 text-white"
                                  : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <p
                                className={`mt-1 text-[10px] ${
                                  mine ? "text-blue-100" : "text-slate-400"
                                }`}
                              >
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendMessage();
                    }}
                    className="border-t border-slate-100 bg-white p-4"
                  >
                    <div className="flex items-end gap-3">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void sendMessage();
                          }
                        }}
                        rows={2}
                        placeholder="Write a message..."
                        className="min-h-12 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="submit"
                        disabled={!draft.trim() || sending}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Send message"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Press Enter to send. Shift + Enter for a new line.
                    </p>
                  </form>
                </>
              )}
            </main>
          </div>
        )}
      </section>

      {showNewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                  New conversation
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Message a developer
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowNewMessage(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </header>

            <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
              {!selectedDeveloper ? (
                <>
                  <label className="text-sm font-bold text-slate-800">
                    Find a developer
                  </label>

                  <div className="relative mt-2">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      autoFocus
                      value={developerSearch}
                      onChange={(event) => void searchDevelopers(event.target.value)}
                      placeholder="Search by name or username..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {developerSearch.trim().length < 2 ? (
                    <div className="py-12 text-center">
                      <Users className="mx-auto text-slate-300" size={34} />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        Search the developer network
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Enter at least 2 characters to find developers.
                      </p>
                    </div>
                  ) : developersLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
                    </div>
                  ) : developers.length === 0 ? (
                    <div className="py-12 text-center">
                      <Search className="mx-auto text-slate-300" size={34} />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No developers found
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Try another name or username.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                      {developers.map((developer) => (
                        <button
                          key={developer.id}
                          type="button"
                          onClick={() => setSelectedDeveloper(developer)}
                          className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50"
                        >
                          {developer.avatar_url ? (
                            <img
                              src={developer.avatar_url}
                              alt=""
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                              {initials(developer)}
                            </div>
                          )}

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-900">
                              {profileName(developer)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {developer.username
                                ? `@${developer.username}`
                                : developer.country || "African developer"}
                              {developer.country && developer.username
                                ? ` · ${developer.country}`
                                : ""}
                            </span>
                          </span>

                          <MessageCircle size={18} className="text-blue-600" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedDeveloper(null)}
                    className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900"
                  >
                    <ArrowLeft size={15} />
                    Choose another developer
                  </button>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {selectedDeveloper.avatar_url ? (
                      <img
                        src={selectedDeveloper.avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {initials(selectedDeveloper)}
                      </div>
                    )}

                    <div>
                      <p className="font-bold text-slate-950">
                        {profileName(selectedDeveloper)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedDeveloper.username
                          ? `@${selectedDeveloper.username}`
                          : selectedDeveloper.country || "Developer"}
                      </p>
                    </div>
                  </div>

                  <label className="mt-5 block text-sm font-bold text-slate-800">
                    Your first message
                  </label>

                  <textarea
                    autoFocus
                    value={requestMessage}
                    onChange={(event) =>
                      setRequestMessage(event.target.value.slice(0, 500))
                    }
                    rows={5}
                    placeholder="Introduce yourself and explain why you'd like to connect..."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />

                  <div className="mt-2 flex items-start justify-between gap-3 text-[11px] text-slate-400">
                    <span>
                      If you're mutually connected, your conversation starts immediately.
                      Otherwise, this becomes a message request.
                    </span>
                    <span className="shrink-0 font-semibold">
                      {requestMessage.length}/500
                    </span>
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewMessage(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={!requestMessage.trim() || sending}
                      onClick={() => void sendNewMessage()}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <Send size={16} />
                      )}
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
