import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type Profile = Record<string, unknown>;

type Offer = {
  id: string;
  developer_id: string;
  title: string;
  description: string | null;
  status: string;
};

type Need = {
  id: string;
  developer_id: string;
  title: string;
  description: string | null;
  status: string;
};

type SkillLink = {
  offer_id?: string;
  need_id?: string;
  skill_id: string;
};

type Skill = {
  id: string;
  name: string;
};

type Candidate = {
  developer_id: string;
  offer_id: string;
  need_id: string;
  offer_title: string;
  offer_description: string | null;
  need_title: string;
  need_description: string | null;
  matching_skills: string[];
  base_score: number;
  direction: "their_offer_matches_my_need" | "my_offer_matches_their_need";
};

type AIMatchResult = {
  developer_id: string;
  explanation: string;
  exchange_value: string;
};

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getProfileName(profile: Profile | undefined): string {
  if (!profile) {
    return "Developer";
  }

  const possibleNames = [
    profile.full_name,
    profile.display_name,
    profile.name,
    profile.username,
  ];

  for (const value of possibleNames) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "Developer";
}

function getProfileAvatar(profile: Profile | undefined): string | null {
  if (!profile) {
    return null;
  }

  const value = profile.avatar_url;

  return typeof value === "string" && value.trim()
    ? value
    : null;
}

function calculateCompatibility(
  matchingSkillCount: number,
  targetSkillCount: number,
): number {
  if (targetSkillCount === 0) {
    return 0;
  }

  const ratio = matchingSkillCount / targetSkillCount;

  return clampScore(ratio * 100);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function extractOutputText(data: Record<string, unknown>): string {
  const directOutputText = data.output_text;

  if (typeof directOutputText === "string" && directOutputText.trim()) {
    return directOutputText.trim();
  }

  const output = data.output;

  if (!Array.isArray(output)) {
    return "";
  }

  const textParts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const typedItem = item as Record<string, unknown>;
    const content = typedItem.content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue;
      }

      const typedContent = contentItem as Record<string, unknown>;

      if (
        typedContent.type === "output_text" &&
        typeof typedContent.text === "string"
      ) {
        textParts.push(typedContent.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

function parseAIJson(
  text: string,
): AIMatchResult[] {
  if (!text.trim()) {
    return [];
  }

  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  try {
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) &&
          typeof item === "object",
      )
      .map((item) => ({
        developer_id:
          typeof item.developer_id === "string"
            ? item.developer_id
            : "",
        explanation:
          typeof item.explanation === "string"
            ? item.explanation
            : "",
        exchange_value:
          typeof item.exchange_value === "string"
            ? item.exchange_value
            : "",
      }))
      .filter(
        (item) =>
          item.developer_id &&
          item.explanation,
      );
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const openAIKey =
      Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(
        {
          error:
            "Supabase environment variables are missing.",
        },
        500,
      );
    }

    if (!openAIKey) {
      return jsonResponse(
        {
          error:
            "OPENAI_API_KEY is not configured.",
        },
        500,
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        {
          error:
            "Authorization header is required.",
        },
        401,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    );

    const token =
      authorization.replace(/^Bearer\s+/i, "");

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse(
        {
          error: "Invalid or expired access token.",
        },
        401,
      );
    }

    /*
     * ------------------------------------------------------------
     * 1. Load the current developer's active offers and needs
     * ------------------------------------------------------------
     */

    const [
      myOffersResult,
      myNeedsResult,
    ] = await Promise.all([
      supabase
        .from("offers")
        .select(
          "id, developer_id, title, description, status",
        )
        .eq("developer_id", user.id)
        .eq("status", "active"),

      supabase
        .from("needs")
        .select(
          "id, developer_id, title, description, status",
        )
        .eq("developer_id", user.id)
        .eq("status", "active"),
    ]);

    if (myOffersResult.error) {
      console.error(
        "Failed to load current offers:",
        myOffersResult.error,
      );

      return jsonResponse(
        {
          error:
            "Failed to load your active offers.",
        },
        500,
      );
    }

    if (myNeedsResult.error) {
      console.error(
        "Failed to load current needs:",
        myNeedsResult.error,
      );

      return jsonResponse(
        {
          error:
            "Failed to load your active needs.",
        },
        500,
      );
    }

    const myOffers =
      (myOffersResult.data ?? []) as Offer[];

    const myNeeds =
      (myNeedsResult.data ?? []) as Need[];

    /*
     * ------------------------------------------------------------
     * 2. If the developer has no exchange intent, return empty
     * ------------------------------------------------------------
     */

    if (
      myOffers.length === 0 &&
      myNeeds.length === 0
    ) {
      return jsonResponse({
        matches: [],
        message:
          "Add at least one active offer or need to generate matches.",
      });
    }

    /*
     * ------------------------------------------------------------
     * 3. Load skill relationships
     * ------------------------------------------------------------
     */

    const myOfferIds =
      myOffers.map((offer) => offer.id);

    const myNeedIds =
      myNeeds.map((need) => need.id);

    const [
      myOfferSkillsResult,
      myNeedSkillsResult,
    ] = await Promise.all([
      myOfferIds.length > 0
        ? supabase
            .from("offer_skills")
            .select("offer_id, skill_id")
            .in("offer_id", myOfferIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      myNeedIds.length > 0
        ? supabase
            .from("need_skills")
            .select("need_id, skill_id")
            .in("need_id", myNeedIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (myOfferSkillsResult.error) {
      console.error(
        "Failed to load offer skills:",
        myOfferSkillsResult.error,
      );

      return jsonResponse(
        {
          error:
            "Failed to load your offer skills.",
        },
        500,
      );
    }

    if (myNeedSkillsResult.error) {
      console.error(
        "Failed to load need skills:",
        myNeedSkillsResult.error,
      );

      return jsonResponse(
        {
          error:
            "Failed to load your need skills.",
        },
        500,
      );
    }

    const myOfferSkills =
      (myOfferSkillsResult.data ?? []) as SkillLink[];

    const myNeedSkills =
      (myNeedSkillsResult.data ?? []) as SkillLink[];

    /*
     * ------------------------------------------------------------
     * 4. Load other developers' active offers and needs
     * ------------------------------------------------------------
     */

    const [
      otherOffersResult,
      otherNeedsResult,
    ] = await Promise.all([
      supabase
        .from("offers")
        .select(
          "id, developer_id, title, description, status",
        )
        .eq("status", "active")
        .neq("developer_id", user.id),

      supabase
        .from("needs")
        .select(
          "id, developer_id, title, description, status",
        )
        .eq("status", "active")
        .neq("developer_id", user.id),
    ]);

    if (otherOffersResult.error) {
      console.error(
        "Failed to load other offers:",
        otherOffersResult.error,
      );

      return jsonResponse(
        {
          error:
            "Failed to load available developer offers.",
        },
        500,
      );
    }

    if (otherNeedsResult.error) {
      console.error(
        "Failed to load other needs:",
        otherNeedsResult.error,
      );

      return jsonResponse(
        {
          error:
            "Failed to load available developer needs.",
        },
        500,
      );
    }

    const otherOffers =
      (otherOffersResult.data ?? []) as Offer[];

    const otherNeeds =
      (otherNeedsResult.data ?? []) as Need[];

    /*
     * ------------------------------------------------------------
     * 5. Load skill links for other developers
     * ------------------------------------------------------------
     */

    const otherOfferIds =
      otherOffers.map((offer) => offer.id);

    const otherNeedIds =
      otherNeeds.map((need) => need.id);

    const [
      otherOfferSkillsResult,
      otherNeedSkillsResult,
    ] = await Promise.all([
      otherOfferIds.length > 0
        ? supabase
            .from("offer_skills")
            .select("offer_id, skill_id")
            .in("offer_id", otherOfferIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      otherNeedIds.length > 0
        ? supabase
            .from("need_skills")
            .select("need_id, skill_id")
            .in("need_id", otherNeedIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (otherOfferSkillsResult.error) {
      console.error(
        "Failed to load other offer skills:",
        otherOfferSkillsResult.error,
      );

      return jsonResponse(
        {
          error:
            "Failed to load developer offer skills.",
        },
        500,
      );
    }

    if (otherNeedSkillsResult.error) {
      console.error(
        "Failed to load other need skills:",
        otherNeedSkillsResult.error,
      );

      return jsonResponse(
        {
          error:
            "Failed to load developer need skills.",
        },
        500,
      );
    }

    const otherOfferSkills =
      (otherOfferSkillsResult.data ?? []) as SkillLink[];

    const otherNeedSkills =
      (otherNeedSkillsResult.data ?? []) as SkillLink[];

    /*
     * ------------------------------------------------------------
     * 6. Load skill names
     * ------------------------------------------------------------
     */

    const allSkillIds = uniqueStrings([
      ...myOfferSkills.map(
        (item) => item.skill_id,
      ),
      ...myNeedSkills.map(
        (item) => item.skill_id,
      ),
      ...otherOfferSkills.map(
        (item) => item.skill_id,
      ),
      ...otherNeedSkills.map(
        (item) => item.skill_id,
      ),
    ]);

    let skills: Skill[] = [];

    if (allSkillIds.length > 0) {
      const {
        data: skillsData,
        error: skillsError,
      } = await supabase
        .from("skills")
        .select("id, name")
        .in("id", allSkillIds);

      if (skillsError) {
        console.error(
          "Failed to load skills:",
          skillsError,
        );

        return jsonResponse(
          {
            error:
              "Failed to load skill information.",
          },
          500,
        );
      }

      skills =
        (skillsData ?? []) as Skill[];
    }

    const skillNameById =
      new Map<string, string>();

    for (const skill of skills) {
      skillNameById.set(
        skill.id,
        skill.name,
      );
    }

    /*
     * ------------------------------------------------------------
     * 7. Build lookup maps
     * ------------------------------------------------------------
     */

    const myOfferSkillMap =
      new Map<string, string[]>();

    for (const item of myOfferSkills) {
      const existing =
        myOfferSkillMap.get(item.offer_id!) ?? [];

      existing.push(item.skill_id);

      myOfferSkillMap.set(
        item.offer_id!,
        existing,
      );
    }

    const myNeedSkillMap =
      new Map<string, string[]>();

    for (const item of myNeedSkills) {
      const existing =
        myNeedSkillMap.get(item.need_id!) ?? [];

      existing.push(item.skill_id);

      myNeedSkillMap.set(
        item.need_id!,
        existing,
      );
    }

    const otherOfferSkillMap =
      new Map<string, string[]>();

    for (const item of otherOfferSkills) {
      const existing =
        otherOfferSkillMap.get(item.offer_id!) ?? [];

      existing.push(item.skill_id);

      otherOfferSkillMap.set(
        item.offer_id!,
        existing,
      );
    }

    const otherNeedSkillMap =
      new Map<string, string[]>();

    for (const item of otherNeedSkills) {
      const existing =
        otherNeedSkillMap.get(item.need_id!) ?? [];

      existing.push(item.skill_id);

      otherNeedSkillMap.set(
        item.need_id!,
        existing,
      );
    }

    /*
     * ------------------------------------------------------------
     * 8. Deterministic matching engine
     *
     * Direction A:
     * Their OFFER satisfies MY NEED.
     *
     * Direction B:
     * My OFFER satisfies THEIR NEED.
     *
     * This remains the canonical compatibility calculation.
     * AI does not invent the score.
     * ------------------------------------------------------------
     */

    const candidates: Candidate[] = [];

    // A: their offer -> my need
    for (const myNeed of myNeeds) {
      const requiredSkillIds =
        uniqueStrings(
          myNeedSkillMap.get(myNeed.id) ?? [],
        );

      for (const otherOffer of otherOffers) {
        const offeredSkillIds =
          uniqueStrings(
            otherOfferSkillMap.get(
              otherOffer.id,
            ) ?? [],
          );

        const matchingSkillIds =
          requiredSkillIds.filter((skillId) =>
            offeredSkillIds.includes(skillId),
          );

        if (
          matchingSkillIds.length === 0
        ) {
          continue;
        }

        const matchingSkills =
          matchingSkillIds.map(
            (skillId) =>
              skillNameById.get(skillId) ??
              "Unknown skill",
          );

        const score =
          calculateCompatibility(
            matchingSkillIds.length,
            requiredSkillIds.length,
          );

        candidates.push({
          developer_id:
            otherOffer.developer_id,
          offer_id:
            otherOffer.id,
          need_id:
            myNeed.id,
          offer_title:
            otherOffer.title,
          offer_description:
            otherOffer.description,
          need_title:
            myNeed.title,
          need_description:
            myNeed.description,
          matching_skills:
            matchingSkills,
          base_score: score,
          direction:
            "their_offer_matches_my_need",
        });
      }
    }

    // B: my offer -> their need
    for (const myOffer of myOffers) {
      const offeredSkillIds =
        uniqueStrings(
          myOfferSkillMap.get(myOffer.id) ?? [],
        );

      for (const otherNeed of otherNeeds) {
        const requiredSkillIds =
          uniqueStrings(
            otherNeedSkillMap.get(
              otherNeed.id,
            ) ?? [],
          );

        const matchingSkillIds =
          offeredSkillIds.filter((skillId) =>
            requiredSkillIds.includes(skillId),
          );

        if (
          matchingSkillIds.length === 0
        ) {
          continue;
        }

        const matchingSkills =
          matchingSkillIds.map(
            (skillId) =>
              skillNameById.get(skillId) ??
              "Unknown skill",
          );

        const score =
          calculateCompatibility(
            matchingSkillIds.length,
            requiredSkillIds.length,
          );

        candidates.push({
          developer_id:
            otherNeed.developer_id,
          offer_id:
            myOffer.id,
          need_id:
            otherNeed.id,
          offer_title:
            myOffer.title,
          offer_description:
            myOffer.description,
          need_title:
            otherNeed.title,
          need_description:
            otherNeed.description,
          matching_skills:
            matchingSkills,
          base_score: score,
          direction:
            "my_offer_matches_their_need",
        });
      }
    }

    /*
     * ------------------------------------------------------------
     * 9. Remove duplicates
     * ------------------------------------------------------------
     */

    const uniqueCandidateMap =
      new Map<string, Candidate>();

    for (const candidate of candidates) {
      const key = [
        candidate.developer_id,
        candidate.offer_id,
        candidate.need_id,
      ].join(":");

      const existing =
        uniqueCandidateMap.get(key);

      if (
        !existing ||
        candidate.base_score >
          existing.base_score
      ) {
        uniqueCandidateMap.set(
          key,
          candidate,
        );
      }
    }

    const uniqueCandidates =
      [...uniqueCandidateMap.values()]
        .sort(
          (a, b) =>
            b.base_score -
            a.base_score,
        )
        .slice(0, 20);

    /*
     * ------------------------------------------------------------
     * 10. If no deterministic candidates exist,
     * return an empty result.
     * ------------------------------------------------------------
     */

    if (uniqueCandidates.length === 0) {
      return jsonResponse({
        matches: [],
        message:
          "No complementary skill matches were found yet. Add more skills, offers, or needs.",
      });
    }

    /*
     * ------------------------------------------------------------
     * 11. Load candidate profiles
     * ------------------------------------------------------------
     */

    const candidateDeveloperIds =
      uniqueStrings(
        uniqueCandidates.map(
          (candidate) =>
            candidate.developer_id,
        ),
      );

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("*")
      .in(
        "id",
        candidateDeveloperIds,
      );

    if (profileError) {
      console.error(
        "Failed to load profiles:",
        profileError,
      );

      return jsonResponse(
        {
          error:
            "Failed to load developer profiles.",
        },
        500,
      );
    }

    const profiles =
      (profileData ?? []) as Profile[];

    const profileById =
      new Map<string, Profile>();

    for (const profile of profiles) {
      const id = profile.id;

      if (typeof id === "string") {
        profileById.set(id, profile);
      }
    }

    /*
     * ------------------------------------------------------------
     * 12. Prepare compact AI input
     * ------------------------------------------------------------
     */

    const aiCandidates =
      uniqueCandidates.map(
        (candidate, index) => ({
          index,
          developer_id:
            candidate.developer_id,
          developer_name:
            getProfileName(
              profileById.get(
                candidate.developer_id,
              ),
            ),
          offer: {
            title:
              candidate.offer_title,
            description:
              candidate.offer_description,
          },
          need: {
            title:
              candidate.need_title,
            description:
              candidate.need_description,
          },
          matching_skills:
            candidate.matching_skills,
          compatibility_score:
            candidate.base_score,
          direction:
            candidate.direction,
        }),
      );

    /*
     * ------------------------------------------------------------
     * 13. Ask OpenAI for human-readable explanations
     *
     * The AI does NOT change the canonical compatibility score.
     * ------------------------------------------------------------
     */

    const systemPrompt = `
You are the AI matching assistant for AfriDev Exchange,
an African developer skill-exchange platform.

Your job is to explain why developers are good exchange
partners based ONLY on the information provided.

Rules:
1. Do not invent skills, experience, projects, certifications,
   technologies, locations, or achievements.
2. Do not change or reinterpret the compatibility_score.
3. The compatibility_score is calculated by the platform.
4. Give a concise, useful explanation of the exchange value.
5. Prefer practical explanations such as:
   "This developer offers PostgreSQL while you need PostgreSQL,
   and you offer Flutter which matches their need."
6. If the match is one-directional, explain that clearly.
7. Return ONLY valid JSON.
8. Return an array of objects with:
   developer_id
   explanation
   exchange_value
`;

    const userPrompt = JSON.stringify(
      {
        platform:
          "AfriDev Exchange",
        task:
          "Explain these developer matches.",
        candidates:
          aiCandidates,
      },
    );

    const aiResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${openAIKey}`,
          },
          body: JSON.stringify({
            model: "gpt-6-luna",
            input: [
              {
                role: "system",
                content:
                  systemPrompt,
              },
              {
                role: "user",
                content:
                  userPrompt,
              },
            ],
            max_output_tokens: 1600,
          }),
        },
      );

    /*
     * ------------------------------------------------------------
     * 14. Fallback if AI request fails
     * ------------------------------------------------------------
     */

    let aiResults: AIMatchResult[] = [];

    if (aiResponse.ok) {
      const aiData =
        (await aiResponse.json()) as Record<
          string,
          unknown
        >;

      const outputText =
        extractOutputText(aiData);

      aiResults =
        parseAIJson(outputText);
    } else {
      const errorText =
        await aiResponse.text();

      console.error(
        "OpenAI request failed:",
        aiResponse.status,
        errorText,
      );
    }

    const aiByDeveloper =
      new Map<string, AIMatchResult>();

    for (const result of aiResults) {
      if (
        !aiByDeveloper.has(
          result.developer_id,
        )
      ) {
        aiByDeveloper.set(
          result.developer_id,
          result,
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * 15. Build final response
     * ------------------------------------------------------------
     */

    const finalMatches =
      uniqueCandidates.map(
        (candidate) => {
          const profile =
            profileById.get(
              candidate.developer_id,
            );

          const ai =
            aiByDeveloper.get(
              candidate.developer_id,
            );

          const fallbackExplanation =
            candidate.direction ===
            "their_offer_matches_my_need"
              ? `This developer offers ${candidate.offer_title}, which matches your need "${candidate.need_title}". Matching skills: ${candidate.matching_skills.join(", ")}.`
              : `Your offer "${candidate.offer_title}" matches this developer's need "${candidate.need_title}". Matching skills: ${candidate.matching_skills.join(", ")}.`;

          const fallbackExchangeValue =
            candidate.direction ===
            "their_offer_matches_my_need"
              ? `You may be able to exchange your skills or services for ${getProfileName(profile)}'s ${candidate.offer_title}.`
              : `${getProfileName(profile)} may benefit from your ${candidate.offer_title} while helping you with "${candidate.need_title}".`;

          return {
            developer_id:
              candidate.developer_id,

            developer_name:
              getProfileName(profile),

            developer_avatar:
              getProfileAvatar(profile),

            offer_id:
              candidate.offer_id,

            need_id:
              candidate.need_id,

            offer_title:
              candidate.offer_title,

            need_title:
              candidate.need_title,

            matching_skills:
              candidate.matching_skills,

            /*
             * Canonical score calculated by the platform.
             */
            compatibility_score:
              candidate.base_score,

            explanation:
              ai?.explanation ||
              fallbackExplanation,

            exchange_value:
              ai?.exchange_value ||
              fallbackExchangeValue,

            direction:
              candidate.direction,
          };
        },
      );

    /*
     * ------------------------------------------------------------
     * 16. Sort by canonical compatibility
     * ------------------------------------------------------------
     */

    finalMatches.sort(
      (a, b) =>
        b.compatibility_score -
        a.compatibility_score,
    );

    return jsonResponse({
      matches:
        finalMatches.slice(0, 10),

      meta: {
        total_candidates:
          finalMatches.length,

        ai_enhanced:
          aiResults.length > 0,

        scoring:
          "deterministic",

        model:
          aiResults.length > 0
            ? "gpt-6-luna"
            : null,
      },
    });
  } catch (error) {
    console.error(
      "AI matching function error:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500,
    );
  }
});