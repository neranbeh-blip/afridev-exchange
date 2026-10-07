import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Users,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import MatchingEngine from "../../components/exchange/MatchingEngine";

type Skill = {
  id: string;
  name: string;
  category: string | null;
};

type Offer = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  skills: Skill[];
};

type Need = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  skills: Skill[];
};

type FormMode = "offer" | "need" | null;

function Exchange() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const [skillSearch, setSkillSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadExchangeData();
  }, []);

  async function loadExchangeData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in.");
      }

      const [
        { data: offersData, error: offersError },
        { data: needsData, error: needsError },
        { data: skillsData, error: skillsError },
      ] = await Promise.all([
        supabase
          .from("offers")
          .select(
            "id, title, description, status, created_at, updated_at"
          )
          .eq("developer_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("needs")
          .select(
            "id, title, description, status, created_at, updated_at"
          )
          .eq("developer_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("skills")
          .select("id, name, category")
          .order("name"),
      ]);

      if (offersError) {
        throw offersError;
      }

      if (needsError) {
        throw needsError;
      }

      if (skillsError) {
        throw skillsError;
      }

      const offersWithSkills: Offer[] = [];
      const needsWithSkills: Need[] = [];

      for (const offer of offersData || []) {
        const { data: skillRows, error: skillError } =
          await supabase
            .from("offer_skills")
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
            .eq("offer_id", offer.id);

        if (skillError) {
          throw skillError;
        }

        offersWithSkills.push({
          ...offer,
          skills: (skillRows || [])
            .map((row) => row.skill)
            .filter(Boolean) as unknown as Skill[],
        });
      }

      for (const need of needsData || []) {
        const { data: skillRows, error: skillError } =
          await supabase
            .from("need_skills")
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
            .eq("need_id", need.id);

        if (skillError) {
          throw skillError;
        }

        needsWithSkills.push({
          ...need,
          skills: (skillRows || [])
            .map((row) => row.skill)
            .filter(Boolean) as unknown as Skill[],
        });
      }

      setOffers(offersWithSkills);
      setNeeds(needsWithSkills);
      setAvailableSkills(skillsData || []);
    } catch (err) {
      console.error("Exchange loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load exchange data."
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm(mode: "offer" | "need") {
    setFormMode(mode);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSelectedSkillIds([]);
    setSkillSearch("");
    setError("");
  }

  function openEditForm(
    mode: "offer" | "need",
    item: Offer | Need
  ) {
    setFormMode(mode);
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setSelectedSkillIds(item.skills.map((skill) => skill.id));
    setSkillSearch("");
    setError("");
  }

  function closeForm() {
    setFormMode(null);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSelectedSkillIds([]);
    setSkillSearch("");
    setError("");
  }

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((current) => {
      if (current.includes(skillId)) {
        return current.filter((id) => id !== skillId);
      }

      return [...current, skillId];
    });
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (selectedSkillIds.length === 0) {
      setError("Please select at least one skill.");
      return;
    }

    if (!formMode) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in.");
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
      };

      if (formMode === "offer") {
        let offerId = editingId;

        if (editingId) {
          const { error: updateError } = await supabase
            .from("offers")
            .update(payload)
            .eq("id", editingId)
            .eq("developer_id", user.id);

          if (updateError) {
            throw updateError;
          }

          const { error: deleteSkillsError } = await supabase
            .from("offer_skills")
            .delete()
            .eq("offer_id", editingId);

          if (deleteSkillsError) {
            throw deleteSkillsError;
          }
        } else {
          const { data: createdOffer, error: insertError } =
            await supabase
              .from("offers")
              .insert({
                developer_id: user.id,
                ...payload,
                status: "active",
              })
              .select("id")
              .single();

          if (insertError) {
            throw insertError;
          }

          offerId = createdOffer.id;
        }

        const skillRows = selectedSkillIds.map((skillId) => ({
          offer_id: offerId,
          skill_id: skillId,
        }));

        const { error: skillsInsertError } = await supabase
          .from("offer_skills")
          .insert(skillRows);

        if (skillsInsertError) {
          if (!editingId && offerId) {
            await supabase
              .from("offers")
              .delete()
              .eq("id", offerId)
              .eq("developer_id", user.id);
          }

          throw skillsInsertError;
        }
      } else {
        let needId = editingId;

        if (editingId) {
          const { error: updateError } = await supabase
            .from("needs")
            .update(payload)
            .eq("id", editingId)
            .eq("developer_id", user.id);

          if (updateError) {
            throw updateError;
          }

          const { error: deleteSkillsError } = await supabase
            .from("need_skills")
            .delete()
            .eq("need_id", editingId);

          if (deleteSkillsError) {
            throw deleteSkillsError;
          }
        } else {
          const { data: createdNeed, error: insertError } =
            await supabase
              .from("needs")
              .insert({
                developer_id: user.id,
                ...payload,
                status: "active",
              })
              .select("id")
              .single();

          if (insertError) {
            throw insertError;
          }

          needId = createdNeed.id;
        }

        const skillRows = selectedSkillIds.map((skillId) => ({
          need_id: needId,
          skill_id: skillId,
        }));

        const { error: skillsInsertError } = await supabase
          .from("need_skills")
          .insert(skillRows);

        if (skillsInsertError) {
          if (!editingId && needId) {
            await supabase
              .from("needs")
              .delete()
              .eq("id", needId)
              .eq("developer_id", user.id);
          }

          throw skillsInsertError;
        }
      }

      closeForm();
      await loadExchangeData();
    } catch (err) {
      console.error("Exchange save error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your exchange item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOffer(id: string) {
    if (!window.confirm("Are you sure you want to delete this offer?")) {
      return;
    }

    const { error } = await supabase
      .from("offers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete offer error:", error);
      alert(error.message);
      return;
    }

    await loadExchangeData();
  }

  async function deleteNeed(id: string) {
    if (!window.confirm("Are you sure you want to delete this need?")) {
      return;
    }

    const { error } = await supabase
      .from("needs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete need error:", error);
      alert(error.message);
      return;
    }

    await loadExchangeData();
  }

  const filteredSkills = availableSkills.filter((skill) => {
    const search = skillSearch.toLowerCase().trim();

    if (!search) {
      return true;
    }

    return (
      skill.name.toLowerCase().includes(search) ||
      skill.category?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-slate-500">
            Loading your exchange center...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-blue-600">
          Skill Exchange
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Exchange Center
        </h1>

        <p className="mt-2 max-w-2xl text-slate-500">
          Tell the AfriDev community what you can offer and what
          you need. AfriDev uses these skills to discover
          complementary opportunities.
        </p>
      </div>

      {error && !formMode && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Explanation */}
      <section className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
            <ArrowRightLeft size={23} />
          </div>

          <div>
            <h2 className="font-bold text-slate-950">
              Exchange skills, not just profiles
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              AfriDev compares the skills you offer with the
              skills other developers need.
            </p>
          </div>
        </div>
      </section>

      {/* Offer / Need */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* I OFFER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={19} />
                </div>

                <h2 className="text-xl font-bold text-slate-950">
                  I Offer
                </h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Skills, knowledge, or help you can provide.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openCreateForm("offer")}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Plus size={17} />
              Add
            </button>
          </div>

          {offers.length === 0 ? (
            <EmptyExchangeState
              title="No offers yet"
              description="Add something you can teach, build, review, design, or contribute."
              buttonLabel="Create an offer"
              onClick={() => openCreateForm("offer")}
            />
          ) : (
            <div className="mt-6 space-y-4">
              {offers.map((offer) => (
                <ExchangeItem
                  key={offer.id}
                  item={offer}
                  type="offer"
                  onEdit={() => openEditForm("offer", offer)}
                  onDelete={() => deleteOffer(offer.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* I NEED */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <Clock3 size={19} />
                </div>

                <h2 className="text-xl font-bold text-slate-950">
                  I Need
                </h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Skills, knowledge, or help you want to receive.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openCreateForm("need")}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Plus size={17} />
              Add
            </button>
          </div>

          {needs.length === 0 ? (
            <EmptyExchangeState
              title="No needs yet"
              description="Tell the community what you want to learn or get help with."
              buttonLabel="Create a need"
              onClick={() => openCreateForm("need")}
            />
          ) : (
            <div className="mt-6 space-y-4">
              {needs.map((need) => (
                <ExchangeItem
                  key={need.id}
                  item={need}
                  type="need"
                  onEdit={() => openEditForm("need", need)}
                  onDelete={() => deleteNeed(need.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* REAL MATCHING ENGINE */}
      <MatchingEngine />

      {/* EXCHANGE REQUESTS + WORKSPACE */}
      <ExchangeRequests />

      {/* Modal */}
      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {editingId
                    ? `Edit ${
                        formMode === "offer" ? "Offer" : "Need"
                      }`
                    : `Create ${
                        formMode === "offer" ? "Offer" : "Need"
                      }`}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {formMode === "offer"
                    ? "Describe what you can contribute and select your skills."
                    : "Describe what you need and select the required skills."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-6">
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Title
              </label>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  formMode === "offer"
                    ? "e.g. React & Supabase Development"
                    : "e.g. Flutter Development"
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <label className="mb-2 mt-5 block text-sm font-semibold text-slate-700">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
                placeholder={
                  formMode === "offer"
                    ? "Explain what you can help another developer with..."
                    : "Explain what you want to learn or get help with..."
                }
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">
                    Skills
                  </label>

                  <span className="text-xs font-medium text-blue-600">
                    {selectedSkillIds.length} selected
                  </span>
                </div>

                <input
                  value={skillSearch}
                  onChange={(event) =>
                    setSkillSearch(event.target.value)
                  }
                  placeholder="Search skills..."
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {filteredSkills.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No skills found.
                    </div>
                  ) : (
                    filteredSkills.map((skill) => {
                      const selected =
                        selectedSkillIds.includes(skill.id);

                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition ${
                            selected
                              ? "bg-blue-50 text-blue-700"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              {skill.name}
                            </p>

                            {skill.category && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {skill.category}
                              </p>
                            )}
                          </div>

                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border ${
                              selected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {selected && <CheckCircle2 size={14} />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExchangeItem({
  item,
  type,
  onEdit,
  onDelete,
}: {
  item: Offer | Need;
  type: "offer" | "need";
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">
              {item.title}
            </h3>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                item.status === "active"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.status}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {item.description}
          </p>

          {item.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.skills.map((skill) => (
                <span
                  key={skill.id}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    type === "offer"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-orange-50 text-orange-700"
                  }`}
                >
                  {skill.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
            aria-label={`Edit ${type}`}
          >
            <Edit3 size={17} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${type}`}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyExchangeState({
  title,
  description,
  buttonLabel,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h3 className="font-semibold text-slate-900">{title}</h3>

      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-800"
      >
        <Plus size={17} />
        {buttonLabel}
      </button>
    </div>
  );
}



/* =========================================================
   EXCHANGE REQUESTS / WORKSPACE
========================================================= */

type MatchRecord = {
  id: string;
  offer_id: string | null;
  need_id: string | null;
  offer_developer_id: string;
  need_developer_id: string;
  compatibility_score: number | null;
  explanation: string | null;
  status: string;
};

type ExchangeRecord = {
  id: string;
  match_id: string | null;
  title: string;
  description: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Participant = {
  exchange_id: string;
  developer_id: string;
  role: "owner" | "participant";
  joined_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
};

type ExchangeView = ExchangeRecord & {
  match: MatchRecord | null;
  participants: Participant[];
  otherDeveloper: Profile | null;
  currentRole: Participant["role"] | null;
  incoming: boolean;
};

function ExchangeRequests() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ExchangeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ExchangeView | null>(null);

  useEffect(() => {
    loadExchanges();
  }, []);

  async function loadExchanges() {
    setError("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("You must be logged in.");

      const { data: exchangeData, error: exchangeError } = await supabase
        .from("exchanges")
        .select("id, match_id, title, description, status, started_at, completed_at, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (exchangeError) throw exchangeError;

      const exchanges = (exchangeData || []) as ExchangeRecord[];
      if (!exchanges.length) {
        setItems([]);
        return;
      }

      const exchangeIds = exchanges.map((x) => x.id);
      const matchIds = exchanges.map((x) => x.match_id).filter((x): x is string => Boolean(x));

      const [{ data: participantData, error: participantError }, { data: matchData, error: matchError }] = await Promise.all([
        supabase
          .from("exchange_participants")
          .select("exchange_id, developer_id, role, joined_at")
          .in("exchange_id", exchangeIds),
        matchIds.length
          ? supabase
              .from("matches")
              .select("id, offer_id, need_id, offer_developer_id, need_developer_id, compatibility_score, explanation, status")
              .in("id", matchIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (participantError) throw participantError;
      if (matchError) throw matchError;

      const participants = (participantData || []) as Participant[];
      const matches = (matchData || []) as MatchRecord[];
      const matchMap = new Map(matches.map((m) => [m.id, m]));
      const participantMap = new Map<string, Participant[]>();

      for (const participant of participants) {
        const list = participantMap.get(participant.exchange_id) || [];
        list.push(participant);
        participantMap.set(participant.exchange_id, list);
      }

      const developerIds = new Set<string>();
      for (const exchange of exchanges) {
        const match = exchange.match_id ? matchMap.get(exchange.match_id) : null;
        for (const participant of participantMap.get(exchange.id) || []) {
          if (participant.developer_id !== user.id) developerIds.add(participant.developer_id);
        }
        if (match) {
          if (match.offer_developer_id !== user.id) developerIds.add(match.offer_developer_id);
          if (match.need_developer_id !== user.id) developerIds.add(match.need_developer_id);
        }
      }

      let profiles: Profile[] = [];
      if (developerIds.size) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, username, country, city, avatar_url")
          .in("id", Array.from(developerIds));
        if (profileError) throw profileError;
        profiles = (data || []) as Profile[];
      }

      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      const result = exchanges.map((exchange) => {
        const match = exchange.match_id ? matchMap.get(exchange.match_id) || null : null;
        const exchangeParticipants = participantMap.get(exchange.id) || [];
        const me = exchangeParticipants.find((p) => p.developer_id === user.id) || null;
        let otherId = exchangeParticipants.find((p) => p.developer_id !== user.id)?.developer_id || null;

        if (!otherId && match) {
          otherId = match.offer_developer_id === user.id
            ? match.need_developer_id
            : match.offer_developer_id;
        }

        return {
          ...exchange,
          match,
          participants: exchangeParticipants,
          otherDeveloper: otherId ? profileMap.get(otherId) || null : null,
          currentRole: me?.role || null,
          incoming: me?.role === "participant" && exchange.status === "pending",
        };
      });

      setItems(result);
    } catch (err: any) {
      console.error("Exchange loading error:", err);
      setError(err?.message || "Unable to load exchange requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function notify(developerId: string, title: string, message: string) {
    const { error } = await supabase.from("notifications").insert({
      user_id: developerId,
      type: "exchange",
      title,
      message,
      link: "/exchange",
    });
    if (error) console.warn("Notification error:", error.message);
  }

  async function updateStatus(exchange: ExchangeView, status: "negotiating" | "accepted" | "active" | "completed" | "cancelled") {
    if (actionId) return;
    setActionId(exchange.id);
    setError("");

    try {
      const payload: Record<string, string> = { status };
      if (status === "active") payload.started_at = new Date().toISOString();
      if (status === "completed") payload.completed_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("exchanges")
        .update(payload)
        .eq("id", exchange.id);
      if (updateError) throw updateError;

      if (exchange.match && (status === "accepted" || status === "cancelled")) {
        const { error: matchError } = await supabase
          .from("matches")
          .update({ status: status === "accepted" ? "accepted" : "rejected" })
          .eq("id", exchange.match.id);
        if (matchError) throw matchError;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const other = exchange.participants.find((p) => p.developer_id !== user?.id);
      if (other) {
        const messages: Record<string, [string, string]> = {
          negotiating: ["Exchange negotiation", `The exchange "${exchange.title}" is now being negotiated.`],
          accepted: ["Exchange accepted", `The exchange "${exchange.title}" was accepted.`],
          active: ["Collaboration started", `The collaboration "${exchange.title}" is now active.`],
          completed: ["Exchange completed", `The exchange "${exchange.title}" has been completed.`],
          cancelled: ["Exchange rejected", `The exchange "${exchange.title}" was rejected.`],
        };
        const [title, message] = messages[status];
        await notify(other.developer_id, title, message);
      }

      await loadExchanges();
      setSelected(null);

      if (status === "active") {
        navigate(`/exchange/workspace/${exchange.id}`);
      }
    } catch (err: any) {
      console.error("Exchange status error:", err);
      setError(err?.message || "Unable to update exchange.");
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 size={20} className="animate-spin text-blue-600" />
          Loading your exchanges...
        </div>
      </section>
    );
  }

  const incoming = items.filter((x) => x.incoming);
  const active = items.filter((x) => ["negotiating", "accepted", "active"].includes(x.status));
  const completed = items.filter((x) => x.status === "completed");

  return (
    <>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ArrowRightLeft size={21} />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-600">Collaboration</p>
                <h2 className="text-xl font-bold text-slate-950">My Exchanges</h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Manage exchange requests, collaborations and completed exchanges.
            </p>
          </div>

          <button
            type="button"
            onClick={() => { setRefreshing(true); loadExchanges(); }}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>

        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <ExchangeSection
          title="Incoming Exchange Requests"
          description="Developers who want to exchange skills with you."
          empty="No pending exchange requests."
          count={incoming.length}
        >
          {incoming.map((exchange) => (
            <RequestCard
              key={exchange.id}
              exchange={exchange}
              loading={actionId === exchange.id}
              onView={() => setSelected(exchange)}
              onAccept={() => updateStatus(exchange, "accepted")}
              onNegotiate={() => updateStatus(exchange, "negotiating")}
              onReject={() => updateStatus(exchange, "cancelled")}
            />
          ))}
        </ExchangeSection>

        <ExchangeSection
          title="Active Exchanges"
          description="Accepted and ongoing collaborations."
          empty="No active exchanges yet."
        >
          {active.map((exchange) => (
            <WorkspaceCard
              key={exchange.id}
              exchange={exchange}
              loading={actionId === exchange.id}
              onView={() => setSelected(exchange)}
              onStart={() => updateStatus(exchange, "active")}
              onComplete={() => updateStatus(exchange, "completed")}
            />
          ))}
        </ExchangeSection>

        <ExchangeSection
          title="Completed Exchanges"
          description="Your completed skill exchanges."
          empty="Completed exchanges will appear here."
        >
          {completed.map((exchange) => (
            <button
              key={exchange.id}
              type="button"
              onClick={() => setSelected(exchange)}
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left hover:border-emerald-300"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 size={21} className="text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900">{exchange.title}</p>
                  <p className="text-sm text-emerald-700">Exchange completed successfully.</p>
                </div>
              </div>
            </button>
          ))}
        </ExchangeSection>
      </section>

      {selected && (
        <WorkspaceModal
          exchange={selected}
          loading={actionId === selected.id}
          onClose={() => setSelected(null)}
          onAccept={() => updateStatus(selected, "accepted")}
          onNegotiate={() => updateStatus(selected, "negotiating")}
          onReject={() => updateStatus(selected, "cancelled")}
          onStart={() => updateStatus(selected, "active")}
          onComplete={() => updateStatus(selected, "completed")}
        />
      )}
    </>
  );
}

function ExchangeSection({ title, description, empty, count, children }: { title: string; description: string; empty: string; count?: number; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {typeof count === "number" && count > 0 && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">{count}</span>
        )}
      </div>
      {!hasChildren ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">{empty}</div>
      ) : (
        <div className="mt-4 space-y-4">{children}</div>
      )}
    </div>
  );
}

function RequestCard({ exchange, loading, onView, onAccept, onNegotiate, onReject }: { exchange: ExchangeView; loading: boolean; onView: () => void; onAccept: () => void; onNegotiate: () => void; onReject: () => void }) {
  const developer = exchange.otherDeveloper;
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-orange-600">New exchange request</p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar profile={developer} />
            <div>
              <h4 className="font-bold text-slate-950">{developer?.full_name || "Developer"}</h4>
              {developer?.username && <p className="text-xs text-slate-500">@{developer.username}</p>}
            </div>
          </div>
          <h5 className="mt-4 font-semibold text-slate-900">{exchange.title}</h5>
          <p className="mt-2 text-sm leading-6 text-slate-600">{exchange.description || exchange.match?.explanation || "A developer wants to exchange skills with you."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">{Math.round(exchange.match?.compatibility_score || 0)}% compatibility</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700">Pending</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
          <button type="button" onClick={onView} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">View</button>
          <button type="button" onClick={onReject} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><XCircle size={16} />Reject</button>
          <button type="button" onClick={onNegotiate} disabled={loading} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">Negotiate</button>
          <button type="button" onClick={onAccept} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Accept</button>
        </div>
      </div>
    </div>
  );
}

function WorkspaceCard({
  exchange,
  loading,
  onStart,
  onComplete,
}: {
  exchange: ExchangeView;
  loading: boolean;
  onView: () => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Exchange workspace</p>
          <h4 className="mt-1 truncate font-bold text-slate-950">{exchange.title}</h4>
          <p className="mt-1 text-sm text-slate-500">with {exchange.otherDeveloper?.full_name || "Developer"}</p>
        </div>
        <StatusBadge status={exchange.status} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{exchange.description || exchange.match?.explanation || "Exchange collaboration."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><Users size={13} />{exchange.participants.length} participants</span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{Math.round(exchange.match?.compatibility_score || 0)}% match</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(`/exchange/workspace/${exchange.id}`)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Open Workspace
        </button>
        {exchange.status === "accepted" && <button type="button" onClick={onStart} disabled={loading} className="flex-1 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{loading ? "Starting..." : "Start Collaboration"}</button>}
        {exchange.status === "active" && <button type="button" onClick={onComplete} disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Complete</button>}
      </div>
    </div>
  );
}

function WorkspaceModal({ exchange, loading, onClose, onAccept, onNegotiate, onReject, onStart, onComplete }: { exchange: ExchangeView; loading: boolean; onClose: () => void; onAccept: () => void; onNegotiate: () => void; onReject: () => void; onStart: () => void; onComplete: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Exchange Workspace</p>
            <h2 className="mt-1 truncate text-xl font-bold text-slate-950 sm:text-2xl">{exchange.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2"><StatusBadge status={exchange.status} /><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{Math.round(exchange.match?.compatibility_score || 0)}% compatibility</span></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={21} /></button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2"><Users size={19} className="text-blue-700" /><h3 className="font-bold text-slate-950">Participants</h3></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Participant name="You" label="Your role" />
              <Participant name={exchange.otherDeveloper?.full_name || "Developer"} label="Exchange partner" username={exchange.otherDeveloper?.username} />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-950">Exchange Objective</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{exchange.description || exchange.match?.explanation || "No additional description was provided."}</p>
          </div>

          {exchange.match?.explanation && <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5"><h3 className="font-bold text-blue-950">Why this match?</h3><p className="mt-2 text-sm leading-6 text-blue-900">{exchange.match.explanation}</p></div>}

          <div className="mt-5 rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-950">Exchange Progress</h3>
            <div className="mt-5 space-y-4">
              <Timeline label="Request sent" active completed />
              <Timeline label="Negotiating" active={["negotiating", "accepted", "active", "completed"].includes(exchange.status)} completed={["accepted", "active", "completed"].includes(exchange.status)} />
              <Timeline label="Accepted" active={["accepted", "active", "completed"].includes(exchange.status)} completed={["active", "completed"].includes(exchange.status)} />
              <Timeline label="Collaboration active" active={["active", "completed"].includes(exchange.status)} completed={exchange.status === "completed"} />
              <Timeline label="Completed" active={exchange.status === "completed"} completed={exchange.status === "completed"} />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Feature icon={<MessageSquare size={20} />} title="Messages" text="Exchange communication will be connected here." />
            <Feature icon={<ArrowRightLeft size={20} />} title="Contributions" text="Track work contributed to the exchange." />
            <Feature icon={<CheckCircle2 size={20} />} title="Verification" text="Validate completed contributions." />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          {exchange.status === "pending" && <><button type="button" onClick={onReject} disabled={loading} className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50">Reject</button><button type="button" onClick={onNegotiate} disabled={loading} className="flex-1 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">Negotiate</button><button type="button" onClick={onAccept} disabled={loading} className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">Accept Exchange</button></>}
          {exchange.status === "negotiating" && <button type="button" onClick={onAccept} disabled={loading} className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">Accept Exchange</button>}
          {exchange.status === "accepted" && <button type="button" onClick={onStart} disabled={loading} className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">Start Collaboration</button>}
          {exchange.status === "active" && <button type="button" onClick={onComplete} disabled={loading} className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800">Mark Exchange Completed</button>}
          {exchange.status === "completed" && <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18} />Exchange Completed</div>}
          {exchange.status === "cancelled" && <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><XCircle size={18} />Exchange Cancelled</div>}
        </div>
      </div>
    </div>
  );
}

function Avatar({ profile }: { profile: Profile | null }) {
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />;
  return <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{(profile?.full_name || "D").charAt(0).toUpperCase()}</div>;
}

function Participant({ name, label, username }: { name: string; label: string; username?: string | null }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{name.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="truncate font-semibold text-slate-900">{name}</p>{username && <p className="truncate text-xs text-slate-500">@{username}</p>}</div></div>;
}

function Timeline({ label, active, completed }: { label: string; active: boolean; completed: boolean }) {
  return <div className="flex items-center gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-full ${completed ? "bg-emerald-600 text-white" : active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>{completed ? <CheckCircle2 size={17} /> : <Clock3 size={16} />}</div><span className={`text-sm font-medium ${completed ? "text-emerald-700" : active ? "text-blue-700" : "text-slate-400"}`}>{label}</span></div>;
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">{icon}</div><h4 className="mt-3 text-sm font-bold text-slate-950">{title}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { pending: "bg-orange-100 text-orange-700", negotiating: "bg-purple-100 text-purple-700", accepted: "bg-blue-100 text-blue-700", active: "bg-emerald-100 text-emerald-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
  return <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${styles[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>;
}

export default Exchange;