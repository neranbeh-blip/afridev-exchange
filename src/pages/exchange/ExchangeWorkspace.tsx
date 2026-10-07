import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Code2,
  FileText,
  GitBranch,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  github_url: string | null;
};

type ExchangeStatus =
  | "pending"
  | "negotiating"
  | "accepted"
  | "active"
  | "completed"
  | "cancelled";

type Exchange = {
  id: string;
  title: string;
  description: string | null;
  status: ExchangeStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type ExchangeParticipant = {
  exchange_id: string;
  developer_id: string;
  role: "owner" | "participant";
  joined_at: string;
  profile: Profile | null;
};

type Conversation = {
  id: string;
  exchange_id: string | null;
  created_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type ContributionStatus =
  | "claimed"
  | "under_review"
  | "verified"
  | "disputed";

type ContributionType =
  | "code"
  | "design"
  | "documentation"
  | "testing"
  | "research"
  | "management"
  | "other";

type Contribution = {
  id: string;
  contributor_id: string;
  exchange_id: string | null;
  title: string;
  description: string;
  contribution_type: ContributionType;
  repository_url: string | null;
  pull_request_url: string | null;
  status: ContributionStatus;
  created_at: string;
  contributor: Profile | null;
};

type ValidationDecision =
  | "approved"
  | "rejected"
  | "needs_revision";

type Validation = {
  id: string;
  contribution_id: string;
  validator_id: string;
  decision: ValidationDecision;
  comment: string | null;
  created_at: string;
};

const contributionTypes: ContributionType[] = [
  "code",
  "design",
  "documentation",
  "testing",
  "research",
  "management",
  "other",
];

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClasses(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";

    case "accepted":
      return "bg-blue-100 text-blue-700";

    case "completed":
      return "bg-purple-100 text-purple-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    case "pending":
      return "bg-amber-100 text-amber-700";

    case "negotiating":
      return "bg-orange-100 text-orange-700";

    case "verified":
      return "bg-emerald-100 text-emerald-700";

    case "under_review":
      return "bg-blue-100 text-blue-700";

    case "disputed":
      return "bg-red-100 text-red-700";

    case "claimed":
      return "bg-slate-100 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function contributionIcon(type: ContributionType) {
  switch (type) {
    case "code":
      return <Code2 size={17} />;

    case "documentation":
      return <FileText size={17} />;

    default:
      return <Sparkles size={17} />;
  }
}

export default function ExchangeWorkspace() {
  const { exchangeId } = useParams<{ exchangeId: string }>();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [exchange, setExchange] =
    useState<Exchange | null>(null);

  const [participants, setParticipants] =
    useState<ExchangeParticipant[]>([]);

  const [conversation, setConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [contributions, setContributions] =
    useState<Contribution[]>([]);

  const [validations, setValidations] =
    useState<Validation[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sendingMessage, setSendingMessage] =
    useState(false);

  const [creatingContribution, setCreatingContribution] =
    useState(false);

  const [validating, setValidating] =
    useState(false);

  const [messageText, setMessageText] = useState("");

  const [showContributionForm, setShowContributionForm] =
    useState(false);

  const [selectedContribution, setSelectedContribution] =
    useState<Contribution | null>(null);

  const [realtimeStatus, setRealtimeStatus] =
    useState<"connecting" | "connected" | "error">("connecting");

  const [onlineDeveloperIds, setOnlineDeveloperIds] =
    useState<string[]>([]);

  const [contributionTitle, setContributionTitle] =
    useState("");

  const [contributionDescription, setContributionDescription] =
    useState("");

  const [contributionType, setContributionType] =
    useState<ContributionType>("code");

  const [repositoryUrl, setRepositoryUrl] =
    useState("");

  const [pullRequestUrl, setPullRequestUrl] =
    useState("");

  const [error, setError] = useState("");

  const otherParticipant = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return (
      participants.find(
        (participant) =>
          participant.developer_id !== currentUserId
      ) ?? null
    );
  }, [participants, currentUserId]);

  async function getCurrentUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return null;
    }

    setCurrentUserId(user.id);

    return user.id;
  }

  async function loadMessages(conversationId: string) {
    setLoadingMessages(true);

    const { data, error: messagesError } =
      await supabase
        .from("messages")
        .select(
          `
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            read_at
          `
        )
        .eq("conversation_id", conversationId)
        .order("created_at", {
          ascending: true,
        });

    if (messagesError) {
      setLoadingMessages(false);
      throw messagesError;
    }

    setMessages(data ?? []);
    setLoadingMessages(false);
  }

  async function loadContributions() {
    if (!exchangeId) {
      return;
    }

    const {
      data,
      error: contributionError,
    } = await supabase
      .from("contributions")
      .select(
        `
          id,
          contributor_id,
          exchange_id,
          title,
          description,
          contribution_type,
          repository_url,
          pull_request_url,
          status,
          created_at,
          contributor:profiles(
            id,
            full_name,
            username,
            avatar_url,
            bio,
            country,
            city,
            github_url
          )
        `
      )
      .eq("exchange_id", exchangeId)
      .order("created_at", {
        ascending: false,
      });

    if (contributionError) {
      throw contributionError;
    }

    const normalized =
      (data ?? []).map((item: any) => ({
        ...item,
        contributor: Array.isArray(item.contributor)
          ? item.contributor[0] ?? null
          : item.contributor ?? null,
      })) as Contribution[];

    setContributions(normalized);

    const ids = normalized.map(
      (contribution) => contribution.id
    );

    if (ids.length === 0) {
      setValidations([]);
      return;
    }

    const {
      data: validationData,
      error: validationError,
    } = await supabase
      .from("contribution_validations")
      .select("*")
      .in("contribution_id", ids)
      .order("created_at", {
        ascending: false,
      });

    if (validationError) {
      throw validationError;
    }

    setValidations(validationData ?? []);
  }

  async function setupConversation(
    participantData: ExchangeParticipant[],
    userId: string
  ) {
    if (!exchangeId) {
      return;
    }

    const {
      data: existingConversation,
      error: conversationError,
    } = await supabase
      .from("conversations")
      .select(
        "id, exchange_id, created_at"
      )
      .eq("exchange_id", exchangeId)
      .limit(1)
      .maybeSingle();

    if (conversationError) {
      throw conversationError;
    }

    let activeConversation =
      existingConversation;

    if (!activeConversation) {
      const {
        data: createdConversation,
        error: createError,
      } = await supabase
        .from("conversations")
        .insert({
          exchange_id: exchangeId,
        })
        .select(
          "id, exchange_id, created_at"
        )
        .single();

      if (createError) {
        throw createError;
      }

      activeConversation = createdConversation;
    }

    setConversation(activeConversation);

    const {
      data: existingParticipants,
      error: existingParticipantsError,
    } = await supabase
      .from("conversation_participants")
      .select("developer_id")
      .eq(
        "conversation_id",
        activeConversation.id
      );

    if (existingParticipantsError) {
      throw existingParticipantsError;
    }

    const existingIds = new Set(
      (existingParticipants ?? []).map(
        (participant) =>
          participant.developer_id
      )
    );

    const missingParticipants =
      participantData
        .filter(
          (participant) =>
            !existingIds.has(
              participant.developer_id
            )
        )
        .map((participant) => ({
          conversation_id:
            activeConversation!.id,
          developer_id:
            participant.developer_id,
        }));

    if (missingParticipants.length > 0) {
      const {
        error: insertError,
      } = await supabase
        .from("conversation_participants")
        .insert(missingParticipants);

      if (insertError) {
        throw insertError;
      }
    }

    await loadMessages(
      activeConversation.id
    );

    void userId;
  }

  async function loadExchange(userId: string) {
    if (!exchangeId) {
      setError("Exchange ID is missing.");
      return;
    }

    const {
      data: exchangeData,
      error: exchangeError,
    } = await supabase
      .from("exchanges")
      .select(
        `
          id,
          title,
          description,
          status,
          created_at,
          started_at,
          completed_at
        `
      )
      .eq("id", exchangeId)
      .single();

    if (exchangeError) {
      throw exchangeError;
    }

    setExchange(exchangeData);

    const {
      data: participantData,
      error: participantError,
    } = await supabase
      .from("exchange_participants")
      .select(
        `
          exchange_id,
          developer_id,
          role,
          joined_at,
          profile:profiles(
            id,
            full_name,
            username,
            avatar_url,
            bio,
            country,
            city,
            github_url
          )
        `
      )
      .eq("exchange_id", exchangeId);

    if (participantError) {
      throw participantError;
    }

    const normalizedParticipants =
      (participantData ?? []).map(
        (participant: any) => ({
          ...participant,
          profile: Array.isArray(
            participant.profile
          )
            ? participant.profile[0] ?? null
            : participant.profile ?? null,
        })
      ) as ExchangeParticipant[];

    setParticipants(normalizedParticipants);

    await loadContributions();

    await setupConversation(
      normalizedParticipants,
      userId
    );
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setLoading(true);
        setError("");

        const userId =
          await getCurrentUserId();

        if (!userId || !mounted) {
          return;
        }

        await loadExchange(userId);
      } catch (err: any) {
        console.error(err);

        if (mounted) {
          setError(
            err?.message ??
              "Unable to load the exchange workspace."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [exchangeId]);

  useEffect(() => {
    if (!conversation?.id || !exchangeId || !currentUserId) return;

    setRealtimeStatus("connecting");

    const channel = supabase.channel(
      `exchange-workspace-${exchangeId}-${conversation.id}`,
      { config: { presence: { key: currentUserId } } }
    );

    channel
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const incoming = payload.new as Message;
        setMessages((current) =>
          current.some((m) => m.id === incoming.id)
            ? current
            : [...current, incoming]
        );
        if (incoming.sender_id !== currentUserId) {
          void markMessagesAsRead();
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages((current) =>
          current.map((m) =>
            m.id === updated.id ? { ...m, ...updated } : m
          )
        );
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "contributions",
        filter: `exchange_id=eq.${exchangeId}`,
      }, async () => {
        try { await loadContributions(); }
        catch (err) { console.error("Realtime contribution refresh failed:", err); }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "contributions",
        filter: `exchange_id=eq.${exchangeId}`,
      }, async () => {
        try { await loadContributions(); }
        catch (err) { console.error("Realtime contribution update failed:", err); }
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "contribution_validations",
      }, async () => {
        try { await loadContributions(); }
        catch (err) { console.error("Realtime validation refresh failed:", err); }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = Object.values(state)
          .flat()
          .map((p) => p.user_id)
          .filter(Boolean);
        setOnlineDeveloperIds([...new Set(ids)]);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const ids = newPresences
          .map((p) => (p as unknown as { user_id?: string }).user_id)
          .filter(Boolean) as string[];
        setOnlineDeveloperIds((current) => [...new Set([...current, ...ids])]);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const leaving = new Set(
          leftPresences
            .map((p) => (p as unknown as { user_id?: string }).user_id)
            .filter(Boolean)
        );
        setOnlineDeveloperIds((current) =>
          current.filter((id) => !leaving.has(id))
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          const trackResult = await channel.track({
  user_id: currentUserId,
});

if (trackResult !== "ok") {
  console.error("Presence tracking failed:", trackResult);
}
          if (error) console.error("Presence tracking failed:", error);
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("error");
        }
      });

    return () => {
      setOnlineDeveloperIds([]);
      void supabase.removeChannel(channel);
    };
  }, [conversation?.id, exchangeId, currentUserId]);

  async function markMessagesAsRead() {
    if (!conversation?.id || !currentUserId) return;

    const { error: readError } = await supabase.rpc(
      "mark_exchange_messages_read",
      { p_conversation_id: conversation.id }
    );

    if (readError) {
      console.error("Unable to mark messages as read:", readError);
      return;
    }

    const readAt = new Date().toISOString();
    setMessages((current) =>
      current.map((message) =>
        message.sender_id !== currentUserId && !message.read_at
          ? { ...message, read_at: readAt }
          : message
      )
    );
  }

  useEffect(() => {
    if (conversation?.id && currentUserId) {
      void markMessagesAsRead();
    }
  }, [conversation?.id, currentUserId]);

  async function sendMessage(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !currentUserId ||
      !conversation?.id
    ) {
      return;
    }

    const content = messageText.trim();

    if (!content) {
      return;
    }

    setSendingMessage(true);
    setError("");

    try {
      const {
        data,
        error: insertError,
      } = await supabase
        .from("messages")
        .insert({
          conversation_id:
            conversation.id,
          sender_id: currentUserId,
          content,
        })
        .select(
          `
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            read_at
          `
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      setMessages((current) => {
        if (
          current.some(
            (message) =>
              message.id === data.id
          )
        ) {
          return current;
        }

        return [...current, data];
      });

      setMessageText("");
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ??
          "Unable to send the message."
      );
    } finally {
      setSendingMessage(false);
    }
  }

  async function createContribution(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !currentUserId ||
      !exchangeId
    ) {
      return;
    }

    const title =
      contributionTitle.trim();

    const description =
      contributionDescription.trim();

    if (!title) {
      setError(
        "Please enter a contribution title."
      );
      return;
    }

    if (!description) {
      setError(
        "Please describe your contribution."
      );
      return;
    }

    setCreatingContribution(true);
    setError("");

    try {
      const {
        error: insertError,
      } = await supabase
        .from("contributions")
        .insert({
          contributor_id: currentUserId,
          exchange_id: exchangeId,
          title,
          description,
          contribution_type:
            contributionType,
          repository_url:
            repositoryUrl.trim() || null,
          pull_request_url:
            pullRequestUrl.trim() || null,
          status: "claimed",
        });

      if (insertError) {
        throw insertError;
      }

      setContributionTitle("");
      setContributionDescription("");
      setContributionType("code");
      setRepositoryUrl("");
      setPullRequestUrl("");
      setShowContributionForm(false);

      await loadContributions();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ??
          "Unable to create the contribution."
      );
    } finally {
      setCreatingContribution(false);
    }
  }

  async function submitForReview(
    contribution: Contribution
  ) {
    if (
      !currentUserId ||
      contribution.contributor_id !==
        currentUserId
    ) {
      return;
    }

    setError("");

    try {
      const {
        error: updateError,
      } = await supabase
        .from("contributions")
        .update({
          status: "under_review",
        })
        .eq("id", contribution.id)
        .eq(
          "contributor_id",
          currentUserId
        );

      if (updateError) {
        throw updateError;
      }

      await loadContributions();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ??
          "Unable to submit the contribution."
      );
    }
  }

  async function validateContribution(
    contribution: Contribution,
    decision: ValidationDecision
  ) {
    if (!currentUserId) {
      return;
    }

    if (
      contribution.contributor_id ===
      currentUserId
    ) {
      setError(
        "You cannot validate your own contribution."
      );
      return;
    }

    if (contribution.status !== "under_review") {
      setError(
        "Only contributions currently under review can be validated."
      );
      return;
    }

    setValidating(true);
    setError("");

    try {
      const comment =
        decision === "approved"
          ? "Contribution approved."
          : decision === "rejected"
            ? "Contribution rejected."
            : "Please revise and resubmit this contribution.";

      const { error: reviewError } =
        await supabase.rpc(
          "review_exchange_contribution",
          {
            p_contribution_id: contribution.id,
            p_decision: decision,
            p_comment: comment,
          }
        );

      if (reviewError) {
        throw reviewError;
      }

      await loadContributions();

      if (
        selectedContribution?.id ===
        contribution.id
      ) {
        setSelectedContribution(null);
      }
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ??
          "Unable to validate the contribution."
      );
    } finally {
      setValidating(false);
    }
  }

  async function updateExchangeStatus(
    status: ExchangeStatus
  ) {
    if (
      !exchangeId ||
      !currentUserId ||
      !exchange
    ) {
      return;
    }

    setError("");

    try {
      const update: Record<
        string,
        string | null
      > = {
        status,
      };

      if (
        status === "active" &&
        !exchange.started_at
      ) {
        update.started_at =
          new Date().toISOString();
      }

      if (status === "completed") {
        update.completed_at =
          new Date().toISOString();

        if (!exchange.started_at) {
          update.started_at =
            new Date().toISOString();
        }
      }

      const {
        data,
        error: updateError,
      } = await supabase
        .from("exchanges")
        .update(update)
        .eq("id", exchangeId)
        .select(
          `
            id,
            title,
            description,
            status,
            created_at,
            started_at,
            completed_at
          `
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      setExchange(data);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ??
          "Unable to update the exchange."
      );
    }
  }

  const canValidate = (
    contribution: Contribution
  ) =>
    Boolean(
      currentUserId &&
        contribution.contributor_id !== currentUserId &&
        contribution.status === "under_review"
    );

  const isPartnerOnline = Boolean(
    otherParticipant &&
      onlineDeveloperIds.includes(otherParticipant.developer_id)
  );

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={36}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading exchange workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!exchange) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-800">
            Exchange unavailable
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error ||
              "We could not find this exchange."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/exchange")
            }
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Exchanges
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

      {/* HEADER */}

      <div className="mb-6">
        <button
          type="button"
          onClick={() =>
            navigate("/exchange")
          }
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={17} />
          Back to Exchanges
        </button>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {exchange.title}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                  exchange.status
                )}`}
              >
                {statusLabel(
                  exchange.status
                )}
              </span>
            </div>

            <p className="max-w-3xl text-slate-500">
              {exchange.description ||
                "Collaborate, exchange skills and build together."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            {exchange.status ===
              "accepted" && (
              <button
                type="button"
                onClick={() =>
                  updateExchangeStatus(
                    "active"
                  )
                }
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Start Exchange
              </button>
            )}

            {exchange.status ===
              "active" && (
              <button
                type="button"
                onClick={() =>
                  updateExchangeStatus(
                    "completed"
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 size={17} />
                Complete Exchange
              </button>
            )}

          </div>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* PARTICIPANTS */}

      <section className="mb-6 grid gap-4 md:grid-cols-2">

        {participants.map(
          (participant) => {
            const profile =
              participant.profile;

            const isCurrentUser =
              participant.developer_id ===
              currentUserId;

            return (
              <div
                key={
                  participant.developer_id
                }
                className={`rounded-2xl border p-5 ${
                  isCurrentUser
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">

                    {profile?.avatar_url ? (
                      <img
                        src={
                          profile.avatar_url
                        }
                        alt={
                          profile.full_name
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={22} />
                    )}

                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">

                      <h2 className="font-bold text-slate-950">
                        {profile?.full_name ||
                          "AfriDev Developer"}
                      </h2>

                      {isCurrentUser && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          You
                        </span>
                      )}

                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {profile?.username
                        ? `@${profile.username}`
                        : "Developer"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">

                      {profile?.city && (
                        <span>
                          {profile.city}
                          {profile.country
                            ? `, ${profile.country}`
                            : ""}
                        </span>
                      )}

                      <span>
                        {participant.role ===
                        "owner"
                          ? "Exchange owner"
                          : "Exchange participant"}
                      </span>

                    </div>

                    {profile?.github_url && (
                      <a
                        href={
                          profile.github_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600"
                      >
                        <GitBranch size={15} />
                        GitHub
                      </a>
                    )}

                  </div>
                </div>
              </div>
            );
          }
        )}

      </section>

      {/* MAIN WORKSPACE */}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">

        {/* LEFT */}

        <div className="space-y-6">

          {/* CONVERSATION */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                  <MessageCircle
                    size={19}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950">
                    Workspace Conversation
                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-slate-500">
                      Communicate directly with your exchange partner.
                    </p>
                    {otherParticipant && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isPartnerOnline ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        {isPartnerOnline ? "Partner online" : "Partner offline"}
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                        realtimeStatus === "connected"
                          ? "text-emerald-600"
                          : realtimeStatus === "error"
                            ? "text-red-600"
                            : "text-amber-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          realtimeStatus === "connected"
                            ? "bg-emerald-500"
                            : realtimeStatus === "error"
                              ? "bg-red-500"
                              : "bg-amber-500"
                        }`}
                      />
                      {realtimeStatus === "connected"
                        ? "Live"
                        : realtimeStatus === "error"
                          ? "Realtime unavailable"
                          : "Connecting..."}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            <div className="h-[420px] overflow-y-auto bg-slate-50 p-5">

              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2
                    size={28}
                    className="animate-spin text-blue-600"
                  />
                </div>
              ) : messages.length ===
                0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">

                  <MessageCircle
                    size={35}
                    className="text-slate-300"
                  />

                  <p className="mt-3 font-semibold text-slate-600">
                    Start the conversation
                  </p>

                  <p className="mt-1 max-w-sm text-sm text-slate-400">
                    Discuss the exchange, clarify expectations and coordinate your work.
                  </p>

                </div>
              ) : (
                <div className="space-y-4">

                  {messages.map(
                    (message) => {
                      const own =
                        message.sender_id ===
                        currentUserId;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            own
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                              own
                                ? "rounded-br-md bg-blue-600 text-white"
                                : "rounded-bl-md bg-white text-slate-800 shadow-sm"
                            }`}
                          >

                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {
                                message.content
                              }
                            </p>

                            <div
                              className={`mt-1 flex items-center justify-end gap-2 text-[10px] ${
                                own ? "text-blue-100" : "text-slate-400"
                              }`}
                            >
                              <span>{formatDate(message.created_at)}</span>
                              {own && (
                                <span
                                  className={
                                    message.read_at
                                      ? "font-bold text-emerald-300"
                                      : "font-bold text-white"
                                  }
                                  title={
                                    message.read_at
                                      ? "Read"
                                      : isPartnerOnline
                                        ? "Delivered — recipient is online"
                                        : "Sent — recipient is offline"
                                  }
                                >
                                  {message.read_at
                                    ? "✓✓"
                                    : isPartnerOnline
                                      ? "✓✓"
                                      : "✓"}
                                </span>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

            <form
              onSubmit={sendMessage}
              className="border-t border-slate-200 p-4"
            >
              <div className="flex gap-2">

                <input
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(
                      event.target.value
                    )
                  }
                  placeholder="Write a message..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="submit"
                  disabled={
                    sendingMessage ||
                    !messageText.trim()
                  }
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingMessage ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={17} />
                  )}

                  <span className="hidden sm:inline">
                    Send
                  </span>
                </button>

              </div>
            </form>

          </section>

          {/* CONTRIBUTIONS */}

          <section className="rounded-2xl border border-slate-200 bg-white">

            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">

              <div>
                <h2 className="font-bold text-slate-950">
                  Contributions
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Track work and verify what has been delivered.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowContributionForm(
                    (value) => !value
                  )
                }
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {showContributionForm
                  ? "Close"
                  : "Add Contribution"}
              </button>

            </div>

            {showContributionForm && (
              <form
                onSubmit={
                  createContribution
                }
                className="border-b border-slate-200 bg-slate-50 p-5"
              >

                <div className="grid gap-4">

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Contribution title
                    </label>

                    <input
                      value={
                        contributionTitle
                      }
                      onChange={(event) =>
                        setContributionTitle(
                          event.target.value
                        )
                      }
                      placeholder="e.g. Build authentication flow"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Description
                    </label>

                    <textarea
                      value={
                        contributionDescription
                      }
                      onChange={(event) =>
                        setContributionDescription(
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="Describe exactly what you contributed..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Contribution type
                      </label>

                      <select
                        value={
                          contributionType
                        }
                        onChange={(event) =>
                          setContributionType(
                            event.target
                              .value as ContributionType
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        {contributionTypes.map(
                          (type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {statusLabel(
                                type
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Repository URL
                      </label>

                      <input
                        value={
                          repositoryUrl
                        }
                        onChange={(event) =>
                          setRepositoryUrl(
                            event.target.value
                          )
                        }
                        placeholder="https://github.com/..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Pull request URL
                    </label>

                    <input
                      value={
                        pullRequestUrl
                      }
                      onChange={(event) =>
                        setPullRequestUrl(
                          event.target.value
                        )
                      }
                      placeholder="https://github.com/.../pull/..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="flex justify-end">

                    <button
                      type="submit"
                      disabled={
                        creatingContribution
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {creatingContribution && (
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                      )}

                      Create Contribution
                    </button>

                  </div>

                </div>

              </form>
            )}

            <div className="divide-y divide-slate-100">

              {contributions.length ===
              0 ? (
                <div className="px-5 py-12 text-center">

                  <Sparkles
                    size={32}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 font-semibold text-slate-600">
                    No contributions yet
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Add your first contribution to start documenting the work.
                  </p>

                </div>
              ) : (
                contributions.map(
                  (contribution) => {
                    const own =
                      contribution.contributor_id ===
                      currentUserId;

                    const validation =
                      validations.find(
                        (item) =>
                          item.contribution_id ===
                          contribution.id
                      );

                    return (
                      <div
                        key={
                          contribution.id
                        }
                        className="p-5"
                      >

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <div className="text-blue-600">
                                {contributionIcon(
                                  contribution.contribution_type
                                )}
                              </div>

                              <h3 className="font-bold text-slate-950">
                                {
                                  contribution.title
                                }
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses(
                                  contribution.status
                                )}`}
                              >
                                {statusLabel(
                                  contribution.status
                                )}
                              </span>

                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {
                                contribution.description
                              }
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">

                              <span>
                                By{" "}
                                <strong className="text-slate-700">
                                  {contribution
                                    .contributor
                                    ?.full_name ||
                                    "Developer"}
                                </strong>
                              </span>

                              <span>
                                {formatDate(
                                  contribution.created_at
                                )}
                              </span>

                            </div>

                            {(contribution.repository_url ||
                              contribution.pull_request_url) && (
                              <div className="mt-3 flex flex-wrap gap-3">

                                {contribution.repository_url && (
                                  <a
                                    href={
                                      contribution.repository_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600"
                                  >
                                    <GitBranch
                                      size={14}
                                    />
                                    Repository
                                  </a>
                                )}

                                {contribution.pull_request_url && (
                                  <a
                                    href={
                                      contribution.pull_request_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                  >
                                    Pull Request
                                  </a>
                                )}

                              </div>
                            )}

                            {validation && (
                              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">

                                <div className="flex items-center gap-2">

                                  {validation.decision ===
                                  "approved" ? (
                                    <CheckCircle2
                                      size={16}
                                      className="text-emerald-600"
                                    />
                                  ) : validation.decision ===
                                    "rejected" ? (
                                    <XCircle
                                      size={16}
                                      className="text-red-600"
                                    />
                                  ) : (
                                    <CircleDot
                                      size={16}
                                      className="text-amber-600"
                                    />
                                  )}

                                  <span className="text-xs font-bold text-slate-700">
                                    {statusLabel(
                                      validation.decision
                                    )}
                                  </span>

                                </div>

                                {validation.comment && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {
                                      validation.comment
                                    }
                                  </p>
                                )}

                              </div>
                            )}

                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedContribution(contribution)
                              }
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                            >
                              View Contribution
                            </button>

                            {own &&
                              contribution.status ===
                                "claimed" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    submitForReview(
                                      contribution
                                    )
                                  }
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                  Submit for Review
                                </button>
                              )}

                            {!own &&
                              contribution.status ===
                                "verified" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  setError("");
                                  try {
                                    const { error: reopenError } =
                                      await supabase.rpc(
                                        "reopen_exchange_contribution",
                                        {
                                          p_contribution_id:
                                            contribution.id,
                                        }
                                      );

                                    if (reopenError) throw reopenError;
                                    await loadContributions();
                                  } catch (err: any) {
                                    console.error(err);
                                    setError(
                                      err?.message ??
                                        "Unable to reopen this contribution for review."
                                    );
                                  }
                                }}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                              >
                                Reopen Review
                              </button>
                            )}

                            {!own &&
                              contribution.status ===
                                "under_review" &&
                              canValidate(
                                contribution
                              ) && (
                                <>
                                  <button
                                    type="button"
                                    disabled={
                                      validating
                                    }
                                    onClick={() =>
                                      validateContribution(
                                        contribution,
                                        "approved"
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    <CheckCircle2
                                      size={14}
                                    />
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      validating
                                    }
                                    onClick={() =>
                                      validateContribution(
                                        contribution,
                                        "needs_revision"
                                      )
                                    }
                                    className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                                  >
                                    Revision
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      validating
                                    }
                                    onClick={() =>
                                      validateContribution(
                                        contribution,
                                        "rejected"
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    <XCircle
                                      size={14}
                                    />
                                    Reject
                                  </button>
                                </>
                              )}

                          </div>

                        </div>

                      </div>
                    );
                  }
                )
              )}

            </div>

          </section>

        </div>

        {/* RIGHT SIDEBAR */}

        <aside className="space-y-6">

          {/* PROGRESS */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <ShieldCheck
                  size={19}
                />
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  Exchange Progress
                </h2>

                <p className="text-xs text-slate-500">
                  Build trust through verified work.
                </p>
              </div>

            </div>

            <div className="mt-5 space-y-4">

              {[
                {
                  label:
                    "Exchange accepted",
                  done: [
                    "accepted",
                    "active",
                    "completed",
                  ].includes(
                    exchange.status
                  ),
                },
                {
                  label:
                    "Exchange active",
                  done: [
                    "active",
                    "completed",
                  ].includes(
                    exchange.status
                  ),
                },
                {
                  label:
                    "Contributions submitted",
                  done:
                    contributions.length >
                    0,
                },
                {
                  label:
                    "Contribution verified",
                  done:
                    contributions.some(
                      (item) =>
                        item.status ===
                        "verified"
                    ),
                },
                {
                  label:
                    "Exchange completed",
                  done:
                    exchange.status ===
                    "completed",
                },
              ].map((step) => (
                <div
                  key={step.label}
                  className="flex items-center gap-3"
                >

                  {step.done ? (
                    <CheckCircle2
                      size={19}
                      className="text-emerald-600"
                    />
                  ) : (
                    <CircleDot
                      size={19}
                      className="text-slate-300"
                    />
                  )}

                  <span
                    className={`text-sm ${
                      step.done
                        ? "font-semibold text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>

                </div>
              ))}

            </div>

          </section>

          {/* EXCHANGE DETAILS */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5">

            <h2 className="font-bold text-slate-950">
              Exchange Details
            </h2>

            <div className="mt-4 space-y-4">

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Created
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {formatDate(
                    exchange.created_at
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Started
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {formatDate(
                    exchange.started_at
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Completed
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {formatDate(
                    exchange.completed_at
                  )}
                </p>
              </div>

            </div>

          </section>

          {/* PARTNER */}

          {otherParticipant && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">

              <h2 className="font-bold text-slate-950">
                Exchange Partner
              </h2>

              <div className="mt-4 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-100">

                  {otherParticipant
                    .profile
                    ?.avatar_url ? (
                    <img
                      src={
                        otherParticipant
                          .profile
                          .avatar_url
                      }
                      alt={
                        otherParticipant
                          .profile
                          .full_name
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User
                      size={20}
                      className="text-slate-400"
                    />
                  )}

                </div>

                <div className="min-w-0">

                  <p className="font-semibold text-slate-900">
                    {otherParticipant
                      .profile
                      ?.full_name ||
                      "Developer"}
                  </p>

                  <p className="text-xs text-slate-500">
                    {otherParticipant
                      .profile
                      ?.username
                      ? `@${otherParticipant.profile.username}`
                      : "AfriDev Developer"}
                  </p>

                </div>

              </div>

              {otherParticipant
                .profile?.bio && (
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {
                    otherParticipant
                      .profile.bio
                  }
                </p>
              )}

            </section>
          )}

        </aside>

      </div>


      {selectedContribution && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setSelectedContribution(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div className="min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-950">
                    {selectedContribution.title}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses(
                      selectedContribution.status
                    )}`}
                  >
                    {statusLabel(selectedContribution.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedContribution.contributor?.full_name ||
                    "AfriDev Developer"}
                  {" · "}
                  {statusLabel(selectedContribution.contribution_type)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedContribution(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close contribution details"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </p>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {selectedContribution.description}
                  </p>
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Contribution Information
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-400">Contributor</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedContribution.contributor?.full_name ||
                        "Developer"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-400">Type</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {statusLabel(
                        selectedContribution.contribution_type
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
                    <p className="text-xs text-slate-400">Submitted</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {formatDate(selectedContribution.created_at)}
                    </p>
                  </div>
                </div>
              </section>

              {(selectedContribution.repository_url ||
                selectedContribution.pull_request_url) && (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Evidence
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {selectedContribution.repository_url && (
                      <a
                        href={selectedContribution.repository_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        <GitBranch size={16} />
                        View Repository
                      </a>
                    )}
                    {selectedContribution.pull_request_url && (
                      <a
                        href={selectedContribution.pull_request_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <FileText size={16} />
                        View Pull Request
                      </a>
                    )}
                  </div>
                </section>
              )}

              {(() => {
                const validation = validations.find(
                  (item) =>
                    item.contribution_id === selectedContribution.id
                );

                if (!validation) return null;

                return (
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Latest Review
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {validation.decision === "approved" ? (
                        <CheckCircle2
                          size={17}
                          className="text-emerald-600"
                        />
                      ) : validation.decision === "rejected" ? (
                        <XCircle
                          size={17}
                          className="text-red-600"
                        />
                      ) : (
                        <CircleDot
                          size={17}
                          className="text-amber-600"
                        />
                      )}
                      <span className="font-semibold text-slate-800">
                        {statusLabel(validation.decision)}
                      </span>
                    </div>
                    {validation.comment && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {validation.comment}
                      </p>
                    )}
                  </section>
                );
              })()}

              {selectedContribution.contributor_id !== currentUserId &&
                selectedContribution.status === "verified" && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <p className="font-semibold text-emerald-800">
                      This contribution is verified.
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-emerald-700">
                    Verification is locked. Reopen the review only if there
                    is a legitimate reason to review the work again.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      setError("");
                      try {
                        const { error: reopenError } =
                          await supabase.rpc(
                            "reopen_exchange_contribution",
                            {
                              p_contribution_id:
                                selectedContribution.id,
                            }
                          );

                        if (reopenError) throw reopenError;

                        setSelectedContribution({
                          ...selectedContribution,
                          status: "under_review",
                        });
                        await loadContributions();
                      } catch (err: any) {
                        console.error(err);
                        setError(
                          err?.message ??
                            "Unable to reopen this contribution for review."
                        );
                      }
                    }}
                    className="mt-4 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                  >
                    Reopen Review
                  </button>
                </section>
              )}

              {selectedContribution.contributor_id !== currentUserId &&
                selectedContribution.status === "under_review" && (
                  <section className="border-t border-slate-200 pt-5">
                    <p className="text-sm font-semibold text-slate-800">
                      Review This Contribution
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Inspect the description and evidence before making a
                      verification decision.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={validating}
                        onClick={() =>
                          validateContribution(
                            selectedContribution,
                            "approved"
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={validating}
                        onClick={() =>
                          validateContribution(
                            selectedContribution,
                            "needs_revision"
                          )
                        }
                        className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                      >
                        Request Revision
                      </button>
                      <button
                        type="button"
                        disabled={validating}
                        onClick={() =>
                          validateContribution(
                            selectedContribution,
                            "rejected"
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  </section>
                )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}