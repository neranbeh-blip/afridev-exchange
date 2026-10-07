import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Skill = {
  id: string;
  name: string;
  category: string | null;
};

type ExchangeItem = {
  id: string;
  developer_id: string;
  title: string;
  description: string;
  status: string;
  skills: Skill[];
};

type DeveloperProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
};

type PotentialMatch = {
  developer: DeveloperProfile;
  score: number;
  yourNeedsMatched: Skill[];
  yourOffersMatched: Skill[];
  theirOffers: Skill[];
  theirNeeds: Skill[];
  explanation: string;

  // The actual public.matches.id
  matchId: string | null;

  saved: boolean;
};

function MatchingEngine() {
  const [matches, setMatches] = useState<PotentialMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMatches, setSavingMatches] = useState(false);
  const [error, setError] = useState("");

  const [selectedMatch, setSelectedMatch] =
    useState<PotentialMatch | null>(null);

  useEffect(() => {
    findMatches();
  }, []);

  async function findMatches() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You must be logged in.");
      }

      // =====================================================
      // YOUR OFFERS
      // =====================================================

      const {
        data: yourOffersData,
        error: yourOffersError,
      } = await supabase
        .from("offers")
        .select(
          `
          id,
          developer_id,
          title,
          description,
          status
        `
        )
        .eq("developer_id", user.id)
        .eq("status", "active");

      if (yourOffersError) {
        throw new Error(
          `Unable to load your offers: ${yourOffersError.message}`
        );
      }

      // =====================================================
      // YOUR NEEDS
      // =====================================================

      const {
        data: yourNeedsData,
        error: yourNeedsError,
      } = await supabase
        .from("needs")
        .select(
          `
          id,
          developer_id,
          title,
          description,
          status
        `
        )
        .eq("developer_id", user.id)
        .in("status", ["active", "matched"]);

      if (yourNeedsError) {
        throw new Error(
          `Unable to load your needs: ${yourNeedsError.message}`
        );
      }

      // =====================================================
      // LOAD YOUR OFFER SKILLS
      // =====================================================

      const yourOffers: ExchangeItem[] = [];

      for (const offer of yourOffersData || []) {
        const {
          data: rows,
          error: rowsError,
        } = await supabase
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

        if (rowsError) {
          throw new Error(
            `Unable to load skills for offer "${offer.title}": ${rowsError.message}`
          );
        }

        yourOffers.push({
          ...offer,
          skills: (rows || [])
            .map((row: any) => row.skill)
            .filter(Boolean) as Skill[],
        });
      }

      // =====================================================
      // LOAD YOUR NEED SKILLS
      // =====================================================

      const yourNeeds: ExchangeItem[] = [];

      for (const need of yourNeedsData || []) {
        const {
          data: rows,
          error: rowsError,
        } = await supabase
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

        if (rowsError) {
          throw new Error(
            `Unable to load skills for need "${need.title}": ${rowsError.message}`
          );
        }

        yourNeeds.push({
          ...need,
          skills: (rows || [])
            .map((row: any) => row.skill)
            .filter(Boolean) as Skill[],
        });
      }

      const yourOfferSkills = uniqueSkills(
        yourOffers.flatMap((offer) => offer.skills)
      );

      const yourNeedSkills = uniqueSkills(
        yourNeeds.flatMap((need) => need.skills)
      );

      // =====================================================
      // OTHER DEVELOPERS' OFFERS
      // =====================================================

      const {
        data: otherOffersData,
        error: otherOffersError,
      } = await supabase
        .from("offers")
        .select(
          `
          id,
          developer_id,
          title,
          description,
          status
        `
        )
        .eq("status", "active")
        .neq("developer_id", user.id);

      if (otherOffersError) {
        throw new Error(
          `Unable to load other developers' offers: ${otherOffersError.message}`
        );
      }

      // =====================================================
      // OTHER DEVELOPERS' NEEDS
      // =====================================================

      const {
        data: otherNeedsData,
        error: otherNeedsError,
      } = await supabase
        .from("needs")
        .select(
          `
          id,
          developer_id,
          title,
          description,
          status
        `
        )
        .eq("status", "active")
        .neq("developer_id", user.id);

      if (otherNeedsError) {
        throw new Error(
          `Unable to load other developers' needs: ${otherNeedsError.message}`
        );
      }

      // =====================================================
      // GROUP DEVELOPERS
      // =====================================================

      const developers = new Map<
        string,
        {
          offers: ExchangeItem[];
          needs: ExchangeItem[];
        }
      >();

      // =====================================================
      // OTHER OFFERS + SKILLS
      // =====================================================

      for (const offer of otherOffersData || []) {
        if (!developers.has(offer.developer_id)) {
          developers.set(offer.developer_id, {
            offers: [],
            needs: [],
          });
        }

        const {
          data: rows,
          error: rowsError,
        } = await supabase
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

        if (rowsError) {
          throw new Error(
            `Unable to load skills for another developer's offer "${offer.title}": ${rowsError.message}`
          );
        }

        developers.get(offer.developer_id)!.offers.push({
          ...offer,
          skills: (rows || [])
            .map((row: any) => row.skill)
            .filter(Boolean) as Skill[],
        });
      }

      // =====================================================
      // OTHER NEEDS + SKILLS
      // =====================================================

      for (const need of otherNeedsData || []) {
        if (!developers.has(need.developer_id)) {
          developers.set(need.developer_id, {
            offers: [],
            needs: [],
          });
        }

        const {
          data: rows,
          error: rowsError,
        } = await supabase
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

        if (rowsError) {
          throw new Error(
            `Unable to load skills for another developer's need "${need.title}": ${rowsError.message}`
          );
        }

        developers.get(need.developer_id)!.needs.push({
          ...need,
          skills: (rows || [])
            .map((row: any) => row.skill)
            .filter(Boolean) as Skill[],
        });
      }

      // =====================================================
      // PROFILES
      // =====================================================

      const developerIds = Array.from(
        developers.keys()
      );

      if (developerIds.length === 0) {
        setMatches([]);
        return;
      }

      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, country, city, avatar_url"
        )
        .in("id", developerIds);

      if (profilesError) {
        throw new Error(
          `Unable to load developer profiles: ${profilesError.message}`
        );
      }

      // =====================================================
      // CALCULATE MATCHES
      // =====================================================

      const calculatedMatches: PotentialMatch[] = [];

      for (const profile of profiles || []) {
        const developerData = developers.get(
          profile.id
        );

        if (!developerData) {
          continue;
        }

        const theirOffers = uniqueSkills(
          developerData.offers.flatMap(
            (offer) => offer.skills
          )
        );

        const theirNeeds = uniqueSkills(
          developerData.needs.flatMap(
            (need) => need.skills
          )
        );

        // Skills they offer that you need
        const yourNeedsMatched =
          yourNeedSkills.filter((skill) =>
            theirOffers.some(
              (theirSkill) =>
                theirSkill.id === skill.id
            )
          );

        // Skills you offer that they need
        const yourOffersMatched =
          yourOfferSkills.filter((skill) =>
            theirNeeds.some(
              (theirSkill) =>
                theirSkill.id === skill.id
            )
          );

        const needCoverage =
          yourNeedSkills.length > 0
            ? (yourNeedsMatched.length /
                yourNeedSkills.length) *
              50
            : 0;

        const offerCoverage =
          yourOfferSkills.length > 0
            ? (yourOffersMatched.length /
                yourOfferSkills.length) *
              50
            : 0;

        const score = Math.round(
          needCoverage + offerCoverage
        );

        if (
          yourNeedsMatched.length === 0 &&
          yourOffersMatched.length === 0
        ) {
          continue;
        }

        const explanationParts: string[] = [];

        if (yourNeedsMatched.length > 0) {
          explanationParts.push(
            `They offer ${formatSkillList(
              yourNeedsMatched
            )}, which you need.`
          );
        }

        if (yourOffersMatched.length > 0) {
          explanationParts.push(
            `You offer ${formatSkillList(
              yourOffersMatched
            )}, which they need.`
          );
        }

        calculatedMatches.push({
          developer: profile,
          score,
          yourNeedsMatched,
          yourOffersMatched,
          theirOffers,
          theirNeeds,
          explanation:
            explanationParts.join(" "),
          matchId: null,
          saved: false,
        });
      }

      calculatedMatches.sort(
        (a, b) => b.score - a.score
      );

      // =====================================================
      // SAVE MATCHES
      // =====================================================

      setSavingMatches(true);

      for (const match of calculatedMatches) {
        const theirData = developers.get(
          match.developer.id
        );

        if (!theirData) {
          continue;
        }

        // ---------------------------------------------------
        // Find the exact reciprocal offer/need
        // ---------------------------------------------------

        const yourNeed =
          yourNeeds.find((need) =>
            need.skills.some((skill) =>
              match.yourNeedsMatched.some(
                (matched) =>
                  matched.id === skill.id
              )
            )
          );

        const theirOffer =
          theirData.offers.find((offer) =>
            offer.skills.some((skill) =>
              match.yourNeedsMatched.some(
                (matched) =>
                  matched.id === skill.id
              )
            )
          );

        const yourOffer =
          yourOffers.find((offer) =>
            offer.skills.some((skill) =>
              match.yourOffersMatched.some(
                (matched) =>
                  matched.id === skill.id
              )
            )
          );

        const theirNeed =
          theirData.needs.find((need) =>
            need.skills.some((skill) =>
              match.yourOffersMatched.some(
                (matched) =>
                  matched.id === skill.id
              )
            )
          );

        let offerId: string | null = null;
        let needId: string | null = null;
        let offerDeveloperId: string | null =
          null;
        let needDeveloperId: string | null =
          null;

        // ---------------------------------------------------
        // Relationship 1:
        //
        // THEIR OFFER → YOUR NEED
        // ---------------------------------------------------

        if (yourNeed && theirOffer) {
          offerId = theirOffer.id;
          needId = yourNeed.id;

          offerDeveloperId =
            match.developer.id;

          needDeveloperId = user.id;
        }

        // ---------------------------------------------------
        // Relationship 2:
        //
        // YOUR OFFER → THEIR NEED
        // ---------------------------------------------------

        else if (yourOffer && theirNeed) {
          offerId = yourOffer.id;
          needId = theirNeed.id;

          offerDeveloperId = user.id;

          needDeveloperId =
            match.developer.id;
        }

        if (
          !offerId ||
          !needId ||
          !offerDeveloperId ||
          !needDeveloperId
        ) {
          console.warn(
            "Could not determine offer/need relationship for match:",
            match
          );

          continue;
        }

        // ---------------------------------------------------
        // Check if match already exists
        // ---------------------------------------------------

        const {
          data: existingMatch,
          error: existingMatchError,
        } = await supabase
          .from("matches")
          .select("id")
          .eq("offer_id", offerId)
          .eq("need_id", needId)
          .limit(1)
          .maybeSingle();

        if (existingMatchError) {
          throw new Error(
            `Unable to check existing match: ${existingMatchError.message}`
          );
        }

        // ---------------------------------------------------
        // UPDATE EXISTING MATCH
        // ---------------------------------------------------

        if (existingMatch) {
          const {
            data: updatedMatch,
            error: updateError,
          } = await supabase
            .from("matches")
            .update({
              offer_developer_id:
                offerDeveloperId,
              need_developer_id:
                needDeveloperId,
              compatibility_score:
                match.score,
              explanation:
                match.explanation,
            })
            .eq("id", existingMatch.id)
            .select("id")
            .single();

          if (updateError) {
            throw new Error(
              `Unable to update match: ${updateError.message}`
            );
          }

          if (!updatedMatch) {
            throw new Error(
              "Match update completed but no match ID was returned."
            );
          }

          // IMPORTANT
          match.matchId =
            updatedMatch.id;

          match.saved = true;
        }

        // ---------------------------------------------------
        // CREATE NEW MATCH
        // ---------------------------------------------------

        else {
          const {
            data: newMatch,
            error: insertError,
          } = await supabase
            .from("matches")
            .insert({
              offer_id: offerId,
              need_id: needId,

              // Required by your database schema
              offer_developer_id:
                offerDeveloperId,
              need_developer_id:
                needDeveloperId,

              compatibility_score:
                match.score,

              explanation:
                match.explanation,

              status: "suggested",
            })
            .select("id")
            .single();

          if (insertError) {
            throw new Error(
              `Unable to save match: ${insertError.message}${
                insertError.details
                  ? ` — ${insertError.details}`
                  : ""
              }${
                insertError.hint
                  ? ` — Hint: ${insertError.hint}`
                  : ""
              }`
            );
          }

          if (!newMatch) {
            throw new Error(
              "Match was inserted but no match ID was returned."
            );
          }

          // =================================================
          // CRITICAL FIX
          //
          // Keep the actual database match ID.
          // Start Exchange will use this exact ID.
          // =================================================

          match.matchId = newMatch.id;

          match.saved = true;
        }
      }

      setMatches(calculatedMatches);
    } catch (err: any) {
      console.error(
        "========================================"
      );
      console.error(
        "MATCHING ENGINE ERROR"
      );
      console.error(
        "========================================"
      );
      console.error("Error:", err);
      console.error("Message:", err?.message);
      console.error("Details:", err?.details);
      console.error("Hint:", err?.hint);
      console.error("Code:", err?.code);

      let errorMessage =
        "Unable to calculate matches.";

      if (err?.message) {
        errorMessage = err.message;
      }

      if (err?.details) {
        errorMessage += ` — ${err.details}`;
      }

      if (err?.hint) {
        errorMessage += ` — Hint: ${err.hint}`;
      }

      setError(errorMessage);
    } finally {
      setSavingMatches(false);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2
            size={20}
            className="animate-spin text-blue-600"
          />

          <div>
            <h2 className="font-bold text-slate-950">
              Finding complementary developers...
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              AfriDev is comparing your offers
              and needs with other developers.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-bold text-red-900">
          Matching engine error
        </h2>

        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-red-700">
          {error}
        </p>

        <button
          type="button"
          onClick={findMatches}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Sparkles size={20} />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Skill Exchange Engine
                </p>

                <h2 className="text-xl font-bold text-slate-950">
                  Complementary Matches
                </h2>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              AfriDev compares your needs with
              other developers' offers, and your
              offers with their needs.
            </p>
          </div>

          <button
            type="button"
            onClick={findMatches}
            disabled={savingMatches}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
          >
            {savingMatches ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Refresh matches
              </>
            )}
          </button>
        </div>

        {matches.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <UserRound size={22} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No complementary matches yet
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              As more developers publish offers
              and needs, AfriDev will identify
              people whose skills complement yours.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {matches.map((match) => (
              <MatchCard
                key={match.developer.id}
                match={match}
                onStartExchange={() =>
                  setSelectedMatch(match)
                }
              />
            ))}
          </div>
        )}
      </section>

      {selectedMatch && (
        <ExchangeRequestModal
          match={selectedMatch}
          onClose={() =>
            setSelectedMatch(null)
          }
        />
      )}
    </>
  );
}

function MatchCard({
  match,
  onStartExchange,
}: {
  match: PotentialMatch;
  onStartExchange: () => void;
}) {
  const initials =
    match.developer.full_name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  return (
    <div className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          {match.developer.avatar_url ? (
            <img
              src={match.developer.avatar_url}
              alt={
                match.developer.full_name ||
                "Developer"
              }
              className="h-14 w-14 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">
              {initials}
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-950">
                {match.developer.full_name ||
                  "Developer"}
              </h3>

              <CheckCircle2
                size={16}
                className="text-blue-600"
              />
            </div>

            {match.developer.username && (
              <p className="text-sm text-slate-500">
                @{match.developer.username}
              </p>
            )}

            {(match.developer.city ||
              match.developer.country) && (
              <p className="mt-1 text-xs text-slate-500">
                {[
                  match.developer.city,
                  match.developer.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-blue-50 px-5 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Compatibility
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-700">
            {match.score}%
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <div className="flex gap-3">
          <Sparkles
            size={18}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Why you're matched
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {match.explanation}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
            You need
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {match.yourNeedsMatched.map(
              (skill) => (
                <span
                  key={skill.id}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700"
                >
                  {skill.name}
                </span>
              )
            )}
          </div>

          <div className="my-3 flex items-center gap-2 text-xs font-medium text-orange-600">
            <ArrowRight size={14} />
            They offer these skills
          </div>

          <div className="flex flex-wrap gap-2">
            {match.theirOffers.map(
              (skill) => (
                <span
                  key={skill.id}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {skill.name}
                </span>
              )
            )}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            You offer
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {match.yourOffersMatched.map(
              (skill) => (
                <span
                  key={skill.id}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700"
                >
                  {skill.name}
                </span>
              )
            )}
          </div>

          <div className="my-3 flex items-center gap-2 text-xs font-medium text-emerald-600">
            <ArrowRight size={14} />
            They need these skills
          </div>

          <div className="flex flex-wrap gap-2">
            {match.theirNeeds.map(
              (skill) => (
                <span
                  key={skill.id}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {skill.name}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
          <CheckCircle2 size={16} />

          {match.saved
            ? "Match saved to AfriDev"
            : "Match not saved"}
        </p>

        <button
          type="button"
          onClick={onStartExchange}
          disabled={!match.matchId}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
          Start Exchange
        </button>
      </div>
    </div>
  );
}

function ExchangeRequestModal({
  match,
  onClose,
}: {
  match: PotentialMatch;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(
    `Hi ${
      match.developer.full_name ||
      "there"
    }, I found a complementary match between our skills on AfriDev Exchange. I'd like to explore an exchange where we can help each other.`
  );

  const [sending, setSending] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  async function sendRequest() {
    setSending(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      // ===================================================
      // USE THE EXACT SAVED MATCH ID.
      //
      // We DO NOT search using compatibility_score.
      // ===================================================

      if (!match.matchId) {
        throw new Error(
          "This match has not been saved yet. Please refresh matches and try again."
        );
      }

      // ===================================================
      // VERIFY THE MATCH
      // ===================================================

      const {
        data: databaseMatch,
        error: matchError,
      } = await supabase
        .from("matches")
        .select(
          `
          id,
          offer_id,
          need_id,
          offer_developer_id,
          need_developer_id,
          compatibility_score,
          explanation,
          status
        `
        )
        .eq("id", match.matchId)
        .maybeSingle();

      if (matchError) {
        throw new Error(
          `Unable to verify saved match: ${matchError.message}`
        );
      }

      if (!databaseMatch) {
        throw new Error(
          "The saved match no longer exists. Please refresh matches."
        );
      }

      // Make sure the logged-in user belongs to
      // this match.
      if (
        databaseMatch.offer_developer_id !==
          user.id &&
        databaseMatch.need_developer_id !==
          user.id
      ) {
        throw new Error(
          "You are not a participant in this match."
        );
      }

      // ===================================================
      // CREATE EXCHANGE
      // ===================================================

      const {
        data: exchange,
        error: exchangeError,
      } = await supabase
        .from("exchanges")
        .insert({
          match_id: databaseMatch.id,

          title: `Skill exchange with ${
            match.developer.full_name ||
            "developer"
          }`,

          description: message.trim(),

          status: "pending",
        })
        .select("id")
        .single();

      if (exchangeError) {
        throw new Error(
          `Unable to create exchange: ${exchangeError.message}${
            exchangeError.details
              ? ` — ${exchangeError.details}`
              : ""
          }${
            exchangeError.hint
              ? ` — Hint: ${exchangeError.hint}`
              : ""
          }`
        );
      }

      if (!exchange) {
        throw new Error(
          "The exchange was created but no exchange ID was returned."
        );
      }

      // ===================================================
      // ADD CURRENT USER AS OWNER
      // ===================================================

      const {
        error: ownerError,
      } = await supabase
        .from("exchange_participants")
        .insert({
          exchange_id: exchange.id,
          developer_id: user.id,
          role: "owner",
        });

      if (ownerError) {
        throw new Error(
          `Unable to add exchange owner: ${ownerError.message}`
        );
      }

      // ===================================================
      // ADD OTHER DEVELOPER AS PARTICIPANT
      // ===================================================

      const {
        error: participantError,
      } = await supabase
        .from("exchange_participants")
        .insert({
          exchange_id: exchange.id,
          developer_id:
            match.developer.id,
          role: "participant",
        });

      if (participantError) {
        throw new Error(
          `Unable to add exchange participant: ${participantError.message}`
        );
      }

      // ===================================================
      // SEND NOTIFICATION
      // ===================================================

      const {
        data: currentUserData,
      } = await supabase.auth.getUser();

      const senderEmail =
        currentUserData.user?.email ||
        "A developer";

      const {
        error: notificationError,
      } = await supabase
        .from("notifications")
        .insert({
          user_id: match.developer.id,
          type: "exchange_request",
          title: "New exchange request",
          message: `${senderEmail} sent you an exchange request.`,
          link: `/exchange`,
        });

      /*
       * The exchange itself is already created.
       * Therefore notification failure should not
       * destroy the exchange.
       */
      if (notificationError) {
        console.warn(
          "Exchange created but notification failed:",
          notificationError
        );
      }

      // ===================================================
      // SUCCESS
      // ===================================================

      setSuccess(true);
    } catch (err: any) {
      console.error(
        "========================================"
      );
      console.error(
        "EXCHANGE REQUEST ERROR"
      );
      console.error(
        "========================================"
      );
      console.error("Error:", err);
      console.error("Message:", err?.message);
      console.error("Details:", err?.details);
      console.error("Hint:", err?.hint);
      console.error("Code:", err?.code);

      let errorMessage =
        "Unable to send exchange request.";

      if (err?.message) {
        errorMessage = err.message;
      }

      if (err?.details) {
        errorMessage += ` — ${err.details}`;
      }

      if (err?.hint) {
        errorMessage += ` — Hint: ${err.hint}`;
      }

      setError(errorMessage);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* =================================================
            HEADER
        ================================================== */}

        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Exchange Request
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Propose an exchange
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* =================================================
              MATCHED DEVELOPER
          ================================================== */}

          <div className="rounded-xl bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Matched developer
                </p>

                <p className="mt-1 font-bold text-slate-950">
                  {match.developer.full_name ||
                    "Developer"}
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs text-blue-600">
                  Compatibility
                </p>

                <p className="text-xl font-bold text-blue-700">
                  {match.score}%
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              EXCHANGE DETAILS
          ================================================== */}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                They help you with
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {match.yourNeedsMatched.map(
                  (skill) => (
                    <span
                      key={skill.id}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700"
                    >
                      {skill.name}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                You help them with
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {match.yourOffersMatched.map(
                  (skill) => (
                    <span
                      key={skill.id}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700"
                    >
                      {skill.name}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* =================================================
              MESSAGE
          ================================================== */}

          <div>
            <label className="text-sm font-semibold text-slate-900">
              Message
            </label>

            <textarea
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              rows={5}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* =================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6 text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* =================================================
              SUCCESS
          ================================================== */}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex gap-3">
                <CheckCircle2
                  size={22}
                  className="shrink-0 text-emerald-600"
                />

                <div>
                  <h3 className="font-bold text-emerald-900">
                    Exchange request sent
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-emerald-700">
                    The developer has been
                    notified. You can continue
                    from the Exchange workspace
                    once the request is accepted.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={sendRequest}
                disabled={
                  sending ||
                  !message.trim() ||
                  !match.matchId
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Exchange Request
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function uniqueSkills(skills: Skill[]) {
  const map = new Map<string, Skill>();

  for (const skill of skills) {
    map.set(skill.id, skill);
  }

  return Array.from(map.values());
}

function formatSkillList(skills: Skill[]) {
  return skills
    .map((skill) => skill.name)
    .join(", ");
}

export default MatchingEngine;