import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Skill = {
  id: string;
  name: string;
  category: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
};

type Problem = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string | null;
  location: string | null;
  status: string;
  created_at: string;
  converted_project_id: string | null;
};

type Interest = {
  id: string;
  developer_id: string;
  message: string | null;
  status: string;
  created_at: string;
  developer: Profile | null;
};

function ProblemDetails() {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [interestMessage, setInterestMessage] = useState("");
  const [showInterestForm, setShowInterestForm] = useState(false);

  useEffect(() => {
    if (problemId) void loadProblem(problemId);
  }, [problemId]);

  async function loadProblem(id: string) {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("You must be logged in.");
      setCurrentUserId(user.id);

      const { data: problemData, error: problemError } = await supabase
        .from("problems")
        .select(
          "id, creator_id, title, description, category, location, status, created_at, converted_project_id"
        )
        .eq("id", id)
        .single();

      if (problemError) throw problemError;

      const [
        { data: creatorData, error: creatorError },
        { data: skillLinks, error: skillLinkError },
        { data: interestRows, error: interestError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, country, city, avatar_url")
          .eq("id", problemData.creator_id)
          .single(),
        supabase
          .from("problem_skills")
          .select(
            `
              skill_id,
              skill:skills (
                id,
                name,
                category
              )
            `
          )
          .eq("problem_id", id),
        supabase
          .from("problem_interests")
          .select(
            `
              id,
              developer_id,
              message,
              status,
              created_at,
              developer:profiles (
                id,
                full_name,
                username,
                country,
                city,
                avatar_url
              )
            `
          )
          .eq("problem_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (creatorError) throw creatorError;
      if (skillLinkError) throw skillLinkError;
      if (interestError) throw interestError;

      setProblem(problemData);
      setCreator(creatorData);
      setSkills(
        (skillLinks || [])
          .map((row) => row.skill)
          .filter(Boolean) as unknown as Skill[]
      );
      setInterests(
        (interestRows || []) as unknown as Interest[]
      );
    } catch (err) {
      console.error("Problem details loading error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load this problem."
      );
    } finally {
      setLoading(false);
    }
  }

  async function expressInterest() {
    if (!problem || !currentUserId) return;

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      if (problem.creator_id === currentUserId) {
        throw new Error("You cannot express interest in your own problem.");
      }

      const { data: existing, error: existingError } = await supabase
        .from("problem_interests")
        .select("id, status")
        .eq("problem_id", problem.id)
        .eq("developer_id", currentUserId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.status === "pending" || existing?.status === "accepted") {
        throw new Error("You have already expressed interest in this problem.");
      }

      const { error: insertError } = await supabase
        .from("problem_interests")
        .upsert(
          {
            problem_id: problem.id,
            developer_id: currentUserId,
            message: interestMessage.trim() || null,
            status: "pending",
          },
          { onConflict: "problem_id,developer_id" }
        );

      if (insertError) throw insertError;

      await supabase.from("notifications").insert({
        user_id: problem.creator_id,
        type: "problem_interest",
        title: "New developer interested",
        message: `A developer is interested in helping with "${problem.title}".`,
        link: `/problems/${problem.id}`,
      });

      setInterestMessage("");
      setShowInterestForm(false);
      setSuccess("Your interest has been sent to the problem creator.");
      await loadProblem(problem.id);
    } catch (err) {
      console.error("Problem interest error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to express interest."
      );
    } finally {
      setWorking(false);
    }
  }

  async function reviewInterest(
    interestId: string,
    decision: "accepted" | "rejected"
  ) {
    if (!problem) return;

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "review_problem_interest",
        {
          p_interest_id: interestId,
          p_decision: decision,
        }
      );

      if (rpcError) throw rpcError;

      const reviewed = data as Interest;

      if (reviewed?.developer_id) {
        await supabase.from("notifications").insert({
          user_id: reviewed.developer_id,
          type: "problem_interest",
          title:
            decision === "accepted"
              ? "Your problem interest was accepted"
              : "Problem interest update",
          message:
            decision === "accepted"
              ? `You were accepted to help with "${problem.title}".`
              : `The creator declined your interest in "${problem.title}".`,
          link: `/problems/${problem.id}`,
        });
      }

      setSuccess(
        decision === "accepted"
          ? "Developer accepted."
          : "Developer interest rejected."
      );

      await loadProblem(problem.id);
    } catch (err) {
      console.error("Problem interest review error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to review interest."
      );
    } finally {
      setWorking(false);
    }
  }

  async function convertToProject() {
    if (!problem) return;

    const confirmed = window.confirm(
      "Convert this problem into a project? The problem title, description and required skills will be carried into the new project."
    );

    if (!confirmed) return;

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const { data: project, error: rpcError } = await supabase.rpc(
        "convert_problem_to_project",
        {
          p_problem_id: problem.id,
        }
      );

      if (rpcError) throw rpcError;

      const projectId =
        Array.isArray(project) && project.length > 0
          ? project[0]?.id
          : (project as { id?: string } | null)?.id;

      if (!projectId) {
        throw new Error("The project was created but its ID was not returned.");
      }

      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error("Problem conversion error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to convert problem."
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <AlertCircle className="mx-auto text-slate-300" size={40} />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          Problem not found
        </h1>
        <Link
          to="/problems"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"
        >
          <ArrowLeft size={16} />
          Back to Problems
        </Link>
      </div>
    );
  }

  const isCreator = problem.creator_id === currentUserId;
  const myInterest = interests.find(
    (interest) => interest.developer_id === currentUserId
  );
  const acceptedInterests = interests.filter(
    (interest) => interest.status === "accepted"
  );
  const pendingInterests = interests.filter(
    (interest) => interest.status === "pending"
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/problems"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700"
      >
        <ArrowLeft size={16} />
        Back to Problems
      </Link>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <main className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {problem.category || "General"}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {problem.status}
              </span>

              {problem.converted_project_id && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Converted to project
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
              {problem.title}
            </h1>

            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {problem.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
              {problem.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={15} />
                  {problem.location}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5">
                <Users size={15} />
                {interests.length} interested
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                <Sparkles size={19} />
              </div>
              <div>
                <h2 className="font-bold text-slate-950">Required Skills</h2>
                <p className="text-xs text-slate-500">
                  Capabilities needed to turn this problem into a project.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </section>

          {!isCreator && !problem.converted_project_id && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 text-blue-700" size={20} />
                <div className="flex-1">
                  <h2 className="font-bold text-slate-950">
                    Can you help solve this?
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Express interest and tell the creator how you can
                    contribute.
                  </p>

                  {myInterest ? (
                    <div className="mt-4 rounded-xl border border-white bg-white p-4">
                      <p className="text-sm font-semibold text-slate-800">
                        Your interest:{" "}
                        <span className="capitalize">{myInterest.status}</span>
                      </p>
                      {myInterest.message && (
                        <p className="mt-2 text-sm text-slate-500">
                          {myInterest.message}
                        </p>
                      )}
                    </div>
                  ) : showInterestForm ? (
                    <div className="mt-4 rounded-xl border border-white bg-white p-4">
                      <textarea
                        value={interestMessage}
                        onChange={(event) =>
                          setInterestMessage(event.target.value)
                        }
                        rows={4}
                        placeholder="Explain the skills or experience you can bring..."
                        className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void expressInterest()}
                          disabled={working}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                          <Send size={15} />
                          {working ? "Sending..." : "Send Interest"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowInterestForm(false)}
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowInterestForm(true)}
                      className="mt-4 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      I'm Interested
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {isCreator && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-950">
                    Developer Interest
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Review developers who want to help solve your problem.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {pendingInterests.length} pending
                </span>
              </div>

              {interests.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <Users className="mx-auto text-slate-300" size={30} />
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No developers have expressed interest yet.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {interests.map((interest) => (
                    <div
                      key={interest.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            {interest.developer?.avatar_url ? (
                              <img
                                src={interest.developer.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserRound size={18} />
                            )}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {interest.developer?.full_name ||
                                "AfriDev Developer"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {interest.developer?.username
                                ? `@${interest.developer.username}`
                                : "Developer"}
                            </p>
                          </div>
                        </div>

                        <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                          {interest.status}
                        </span>
                      </div>

                      {interest.message && (
                        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                          {interest.message}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={`/developer/${interest.developer_id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Passport
                          <ExternalLink size={13} />
                        </Link>

                        {interest.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void reviewInterest(
                                  interest.id,
                                  "accepted"
                                )
                              }
                              disabled={working}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <CheckCircle2 size={14} />
                              Accept
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void reviewInterest(
                                  interest.id,
                                  "rejected"
                                )
                              }
                              disabled={working}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Problem Creator
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-700">
                {creator?.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={19} />
                )}
              </div>

              <div>
                <p className="font-bold text-slate-950">
                  {creator?.full_name || "AfriDev Developer"}
                </p>
                {creator?.username && (
                  <p className="text-xs text-slate-500">
                    @{creator.username}
                  </p>
                )}
              </div>
            </div>

            {(creator?.city || creator?.country) && (
              <p className="mt-3 text-xs text-slate-500">
                {[creator.city, creator.country].filter(Boolean).join(", ")}
              </p>
            )}

            <Link
              to={`/developer/${problem.creator_id}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View Passport
              <ExternalLink size={15} />
            </Link>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Collaboration
            </p>

            <div className="mt-4 space-y-3">
              <Stat
                icon={<Users size={16} />}
                label="Interested developers"
                value={interests.length}
              />
              <Stat
                icon={<CheckCircle2 size={16} />}
                label="Accepted"
                value={acceptedInterests.length}
              />
            </div>

            {isCreator && !problem.converted_project_id && (
              <button
                type="button"
                onClick={() => void convertToProject()}
                disabled={working}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                <Sparkles size={16} />
                {working ? "Creating Project..." : "Convert to Project"}
              </button>
            )}

            {problem.converted_project_id && (
              <Link
                to={`/projects/${problem.converted_project_id}`}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Open Project
                <ArrowLeft className="rotate-180" size={16} />
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span className="text-blue-700">{icon}</span>
        {label}
      </div>
      <span className="font-bold text-slate-950">{value}</span>
    </div>
  );
}

export default ProblemDetails;
