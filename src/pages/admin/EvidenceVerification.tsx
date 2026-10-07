import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

type EvidenceStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "changes_requested";

type Evidence = {
  id: string;
  developer_id: string;
  skill_id: string;
  evidence_type: string;
  title: string;
  description: string | null;
  url: string | null;
  verified: boolean;
  verification_status: EvidenceStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
};

type DeveloperProfile = {
  id: string;
  full_name: string | null;
  country: string | null;
};

type Skill = {
  id: string;
  name: string;
};

type EvidenceWithDetails = Evidence & {
  developer?: DeveloperProfile;
  skill?: Skill;
};

type FilterType = "all" | EvidenceStatus;

function EvidenceVerification() {
  const [evidence, setEvidence] = useState<EvidenceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<FilterType>("pending");
  const [search, setSearch] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [selectedEvidence, setSelectedEvidence] =
    useState<EvidenceWithDetails | null>(null);

  const [decision, setDecision] = useState<
    "verified" | "rejected" | "changes_requested" | null
  >(null);

  const [comment, setComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ============================================================
  // LOAD CURRENT USER
  // ============================================================

  async function loadCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }
  }

  // ============================================================
  // LOAD EVIDENCE
  // ============================================================

  async function loadEvidence(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setMessage(null);

      const { data, error } = await supabase
        .from("skill_evidence")
        .select(
          `
          id,
          developer_id,
          skill_id,
          evidence_type,
          title,
          description,
          url,
          verified,
          verification_status,
          reviewed_by,
          reviewed_at,
          review_comment,
          created_at
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as Evidence[];

      if (rows.length === 0) {
        setEvidence([]);
        return;
      }

      // ----------------------------------------------------------
      // Load developers
      // ----------------------------------------------------------

      const developerIds = [
        ...new Set(rows.map((item) => item.developer_id)),
      ];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, country")
        .in("id", developerIds);

      if (profilesError) {
        console.warn(
          "Could not load developer profiles:",
          profilesError.message
        );
      }

      // ----------------------------------------------------------
      // Load skills
      // ----------------------------------------------------------

      const skillIds = [...new Set(rows.map((item) => item.skill_id))];

      const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select("id, name")
        .in("id", skillIds);

      if (skillsError) {
        console.warn(
          "Could not load skills:",
          skillsError.message
        );
      }

      const profileMap = new Map<string, DeveloperProfile>();

      (profiles ?? []).forEach((profile) => {
        profileMap.set(profile.id, profile);
      });

      const skillMap = new Map<string, Skill>();

      (skills ?? []).forEach((skill) => {
        skillMap.set(skill.id, skill);
      });

      const enriched: EvidenceWithDetails[] = rows.map((item) => ({
        ...item,
        developer: profileMap.get(item.developer_id),
        skill: skillMap.get(item.skill_id),
      }));

      setEvidence(enriched);
    } catch (error) {
      console.error("Failed to load evidence:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load evidence."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    void loadCurrentUser();
    void loadEvidence();
  }, []);

  // ============================================================
  // FILTERING
  // ============================================================

  const filteredEvidence = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return evidence.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        item.verification_status === filter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const developerName =
        item.developer?.full_name?.toLowerCase() ?? "";

      const skillName =
        item.skill?.name?.toLowerCase() ?? "";

      const title = item.title?.toLowerCase() ?? "";

      const description =
        item.description?.toLowerCase() ?? "";

      return (
        developerName.includes(normalizedSearch) ||
        skillName.includes(normalizedSearch) ||
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });
  }, [evidence, filter, search]);

  // ============================================================
  // STATISTICS
  // ============================================================

  const statistics = useMemo(() => {
    return {
      total: evidence.length,
      pending: evidence.filter(
        (item) => item.verification_status === "pending"
      ).length,
      verified: evidence.filter(
        (item) => item.verification_status === "verified"
      ).length,
      rejected: evidence.filter(
        (item) => item.verification_status === "rejected"
      ).length,
      changesRequested: evidence.filter(
        (item) =>
          item.verification_status === "changes_requested"
      ).length,
    };
  }, [evidence]);

  // ============================================================
  // OPEN REVIEW
  // ============================================================

  function openReview(item: EvidenceWithDetails) {
    setSelectedEvidence(item);
    setDecision(null);
    setComment("");
    setMessage(null);
  }

  // ============================================================
  // CLOSE REVIEW
  // ============================================================

  function closeReview() {
    if (reviewing) {
      return;
    }

    setSelectedEvidence(null);
    setDecision(null);
    setComment("");
    setMessage(null);
  }

  // ============================================================
  // REVIEW EVIDENCE
  // ============================================================

  async function submitReview() {
    if (!selectedEvidence || !decision || !currentUserId) {
      return;
    }

    if (selectedEvidence.developer_id === currentUserId) {
      setMessage(
        "You cannot verify your own evidence."
      );
      return;
    }

    try {
      setReviewing(true);
      setMessage(null);

      const { error } = await supabase.rpc(
        "review_skill_evidence",
        {
          p_evidence_id: selectedEvidence.id,
          p_decision: decision,
          p_comment: comment.trim() || null,
        }
      );

      if (error) {
        throw error;
      }

      setSelectedEvidence(null);
      setDecision(null);
      setComment("");

      await loadEvidence(true);
    } catch (error) {
      console.error("Evidence review failed:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to complete the verification."
      );
    } finally {
      setReviewing(false);
    }
  }

  // ============================================================
  // STATUS HELPERS
  // ============================================================

  function getStatusLabel(status: EvidenceStatus) {
    switch (status) {
      case "verified":
        return "Verified";
      case "rejected":
        return "Rejected";
      case "changes_requested":
        return "Changes requested";
      default:
        return "Pending";
    }
  }

  function getStatusClasses(status: EvidenceStatus) {
    switch (status) {
      case "verified":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";

      case "changes_requested":
        return "bg-amber-50 text-amber-700 border-amber-200";

      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <ShieldCheck className="h-4 w-4" />
            Community Trust
          </div>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Evidence Verification
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Help the AfriDev community verify developer skills and
            experience. Review evidence submitted by other developers
            and help keep the Developer Passport trustworthy.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadEvidence(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* ======================================================
          COMMUNITY MESSAGE
      ====================================================== */}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <FileCheck2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Verification is community-powered
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Every developer can contribute to trust on AfriDev.
              You can verify evidence from another developer, but
              you cannot verify your own evidence.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total"
          value={statistics.total}
          icon={<FileCheck2 className="h-5 w-5" />}
        />

        <StatCard
          label="Pending"
          value={statistics.pending}
          icon={<Clock3 className="h-5 w-5" />}
        />

        <StatCard
          label="Verified"
          value={statistics.verified}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <StatCard
          label="Rejected"
          value={statistics.rejected}
          icon={<XCircle className="h-5 w-5" />}
        />

        <StatCard
          label="Changes requested"
          value={statistics.changesRequested}
          icon={<RefreshCw className="h-5 w-5" />}
        />
      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filter === "pending"}
              onClick={() => setFilter("pending")}
              label={`Pending (${statistics.pending})`}
            />

            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`All (${statistics.total})`}
            />

            <FilterButton
              active={filter === "verified"}
              onClick={() => setFilter("verified")}
              label={`Verified (${statistics.verified})`}
            />

            <FilterButton
              active={filter === "rejected"}
              onClick={() => setFilter("rejected")}
              label={`Rejected (${statistics.rejected})`}
            />

            <FilterButton
              active={filter === "changes_requested"}
              onClick={() => setFilter("changes_requested")}
              label={`Changes (${statistics.changesRequested})`}
            />
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search developer, skill or evidence..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* ======================================================
          ERROR / MESSAGE
      ====================================================== */}

      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      {/* ======================================================
          EVIDENCE LIST
      ====================================================== */}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            Loading evidence...
          </p>
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <FileCheck2 className="mx-auto h-8 w-8 text-slate-300" />

          <h3 className="mt-3 font-semibold text-slate-900">
            No evidence found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            There are no evidence records matching the current
            filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvidence.map((item) => {
            const isOwnEvidence =
              item.developer_id === currentUserId;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          item.verification_status
                        )}`}
                      >
                        {getStatusLabel(
                          item.verification_status
                        )}
                      </span>

                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {item.evidence_type}
                      </span>

                      {item.skill?.name && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {item.skill.name}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-slate-950">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Submitted by{" "}
                      <span className="font-semibold text-slate-700">
                        {item.developer?.full_name ||
                          "AfriDev Developer"}
                      </span>

                      {item.developer?.country
                        ? ` · ${item.developer.country}`
                        : ""}
                    </p>

                    {item.description && (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-slate-400">
                      Submitted{" "}
                      {new Date(
                        item.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View evidence
                      </a>
                    )}

                    {item.verification_status === "pending" &&
                      !isOwnEvidence && (
                        <button
                          type="button"
                          onClick={() => openReview(item)}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Verify
                        </button>
                      )}

                    {isOwnEvidence && (
                      <span className="inline-flex items-center rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-500">
                        Your evidence
                      </span>
                    )}
                  </div>
                </div>

                {item.review_comment && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <MessageSquare className="h-4 w-4" />
                      Review comment
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.review_comment}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================
          REVIEW MODAL
      ====================================================== */}

      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Community Verification
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Review evidence
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeReview}
                  disabled={reviewing}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Evidence
                </p>

                <h3 className="mt-1 font-bold text-slate-900">
                  {selectedEvidence.title}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedEvidence.developer?.full_name ||
                    "AfriDev Developer"}
                  {selectedEvidence.skill?.name
                    ? ` · ${selectedEvidence.skill.name}`
                    : ""}
                </p>

                {selectedEvidence.description && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedEvidence.description}
                  </p>
                )}

                {selectedEvidence.url && (
                  <a
                    href={selectedEvidence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open evidence
                  </a>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">
                  Your decision
                </p>

                <div className="grid gap-2 sm:grid-cols-3">
                  <DecisionButton
                    active={decision === "verified"}
                    onClick={() => setDecision("verified")}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Verify"
                    variant="green"
                  />

                  <DecisionButton
                    active={decision === "changes_requested"}
                    onClick={() =>
                      setDecision("changes_requested")
                    }
                    icon={<RefreshCw className="h-4 w-4" />}
                    label="Request changes"
                    variant="amber"
                  />

                  <DecisionButton
                    active={decision === "rejected"}
                    onClick={() => setDecision("rejected")}
                    icon={<XCircle className="h-4 w-4" />}
                    label="Reject"
                    variant="red"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Comment
                  <span className="ml-1 font-normal text-slate-400">
                    optional
                  </span>
                </label>

                <textarea
                  value={comment}
                  onChange={(event) =>
                    setComment(event.target.value)
                  }
                  rows={4}
                  placeholder="Explain why you verified, rejected, or requested changes..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {message && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeReview}
                  disabled={reviewing}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void submitReview()}
                  disabled={!decision || reviewing}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reviewing && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}

                  {reviewing
                    ? "Submitting..."
                    : "Submit verification"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-950">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// FILTER BUTTON
// ============================================================

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================
// DECISION BUTTON
// ============================================================

function DecisionButton({
  active,
  onClick,
  icon,
  label,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant: "green" | "amber" | "red";
}) {
  const classes = {
    green: active
      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
      : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50",

    amber: active
      ? "border-amber-500 bg-amber-50 text-amber-700"
      : "border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50",

    red: active
      ? "border-red-500 bg-red-50 text-red-700"
      : "border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${classes[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
}

export default EvidenceVerification;