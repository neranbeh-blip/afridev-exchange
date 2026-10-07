import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Skill = {
  id: string;
  name: string;
};

type Candidate = {
  developer_id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
  matching_skills: string[];
  verified_skills: string[];
  compatibility_score: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractOutputText(response: any): string {
  if (typeof response?.output_text === "string") {
    return response.output_text;
  }

  const output = Array.isArray(response?.output) ? response.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const part of content) {
      if (typeof part?.text === "string") {
        return part.text;
      }
    }
  }

  return "";
}

function parseAIJson(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
  }

  return {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          error: "Missing authorization header.",
        },
        401
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAIKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        {
          error: "Supabase environment is incomplete.",
        },
        500
      );
    }

    /*
     * User client
     *
     * Uses the logged-in user's JWT.
     */
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error: "Unauthorized.",
        },
        401
      );
    }

    const body = await req.json().catch(() => ({}));

    const projectId = body?.project_id;

    if (!projectId || typeof projectId !== "string") {
      return jsonResponse(
        {
          error: "project_id is required.",
        },
        400
      );
    }

    /*
     * Service-role client.
     *
     * This is ONLY used server-side inside the Edge Function.
     * The service-role key is never sent to the frontend.
     */
    const admin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    /*
     * Load project.
     */
    const {
      data: project,
      error: projectError,
    } = await admin
      .from("projects")
      .select(
        "id, owner_id, title, description, status"
      )
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return jsonResponse(
        {
          error: "Project not found.",
        },
        404
      );
    }

    /*
     * Only the project owner can generate
     * private AI collaborator recommendations.
     */
    if (project.owner_id !== user.id) {
      return jsonResponse(
        {
          error:
            "Only the project owner can generate collaborator recommendations.",
        },
        403
      );
    }

    /*
     * Load:
     * - required project skills
     * - existing project members
     * - developers who already applied
     */
    const [
      {
        data: projectSkillRows,
        error: projectSkillsError,
      },
      {
        data: memberRows,
        error: membersError,
      },
      {
        data: applicationRows,
        error: applicationsError,
      },
    ] = await Promise.all([
      admin
        .from("project_skills")
        .select("skill_id")
        .eq("project_id", projectId),

      admin
        .from("project_members")
        .select("developer_id")
        .eq("project_id", projectId),

      admin
        .from("project_applications")
        .select("developer_id")
        .eq("project_id", projectId),
    ]);

    if (projectSkillsError) {
      throw projectSkillsError;
    }

    if (membersError) {
      throw membersError;
    }

    if (applicationsError) {
      throw applicationsError;
    }

    const requiredSkillIds =
      (projectSkillRows ?? []).map(
        (row) => row.skill_id
      );

    /*
     * A project without required skills cannot
     * produce meaningful collaborator recommendations.
     */
    if (requiredSkillIds.length === 0) {
      return jsonResponse({
        recommendations: [],
        meta: {
          reason:
            "No required project skills have been defined.",
        },
      });
    }

    /*
     * Load skill names.
     */
    const {
      data: requiredSkillRows,
      error: skillsError,
    } = await admin
      .from("skills")
      .select("id, name")
      .in("id", requiredSkillIds);

    if (skillsError) {
      throw skillsError;
    }

    const requiredSkills =
      (requiredSkillRows ?? []) as Skill[];

    const requiredById = new Map(
      requiredSkills.map((skill) => [
        skill.id,
        skill,
      ])
    );

    /*
     * Developers who must NOT be recommended:
     *
     * - project owner
     * - existing project members
     * - developers who already applied
     */
    const excludedIds = new Set<string>([
      user.id,

      ...(memberRows ?? []).map(
        (row) => row.developer_id
      ),

      ...(applicationRows ?? []).map(
        (row) => row.developer_id
      ),
    ]);

    /*
     * Load all developer skill relationships.
     */
    const {
      data: developerSkillRows,
      error: developerSkillsError,
    } = await admin
      .from("developer_skills")
      .select("developer_id, skill_id");

    if (developerSkillsError) {
      throw developerSkillsError;
    }

    const developerIds = Array.from(
      new Set(
        (developerSkillRows ?? [])
          .map((row) => row.developer_id)
          .filter(
            (id) => !excludedIds.has(id)
          )
      )
    );

    if (developerIds.length === 0) {
      return jsonResponse({
        recommendations: [],
        meta: {
          reason:
            "No eligible developers were found.",
        },
      });
    }

    /*
     * Load developer profiles and verified evidence.
     */
    const [
      {
        data: profileRows,
        error: profilesError,
      },
      {
        data: evidenceRows,
        error: evidenceError,
      },
    ] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, full_name, username, country, city, avatar_url"
        )
        .in("id", developerIds),

      admin
        .from("skill_evidence")
        .select(
          "developer_id, skill_id, status"
        )
        .in("developer_id", developerIds)
        .eq("status", "verified"),
    ]);

    if (profilesError) {
      throw profilesError;
    }

    if (evidenceError) {
      throw evidenceError;
    }

    const profileMap = new Map(
      (profileRows ?? []).map((profile) => [
        profile.id,
        profile,
      ])
    );

    /*
     * Organize skills by developer.
     */
    const skillsByDeveloper =
      new Map<string, string[]>();

    for (const row of developerSkillRows ?? []) {
      if (excludedIds.has(row.developer_id)) {
        continue;
      }

      const list =
        skillsByDeveloper.get(
          row.developer_id
        ) ?? [];

      list.push(row.skill_id);

      skillsByDeveloper.set(
        row.developer_id,
        list
      );
    }

    /*
     * Organize verified evidence by developer.
     */
    const verifiedByDeveloper =
      new Map<string, Set<string>>();

    for (const row of evidenceRows ?? []) {
      const set =
        verifiedByDeveloper.get(
          row.developer_id
        ) ?? new Set<string>();

      set.add(row.skill_id);

      verifiedByDeveloper.set(
        row.developer_id,
        set
      );
    }

    /*
     * Calculate the canonical compatibility score.
     *
     * AI does NOT control this score.
     */
    const candidates: Candidate[] = [];

    for (const developerId of developerIds) {
      const candidateSkillIds =
        new Set(
          skillsByDeveloper.get(
            developerId
          ) ?? []
        );

      const matchingSkillIds =
        requiredSkillIds.filter(
          (skillId) =>
            candidateSkillIds.has(
              skillId
            )
        );

      /*
       * No matching required skills =
       * not a useful collaborator.
       */
      if (
        matchingSkillIds.length === 0
      ) {
        continue;
      }

      const verifiedSet =
        verifiedByDeveloper.get(
          developerId
        ) ?? new Set<string>();

      const verifiedMatchingCount =
        matchingSkillIds.filter(
          (skillId) =>
            verifiedSet.has(skillId)
        ).length;

      /*
       * Base score:
       *
       * 85% skill coverage
       * 15% verified evidence
       */
      const baseCoverage =
        (matchingSkillIds.length /
          requiredSkillIds.length) *
        100;

      const verificationBonus =
        requiredSkillIds.length > 0
          ? (verifiedMatchingCount /
              requiredSkillIds.length) *
            15
          : 0;

      const score = clampScore(
        Math.min(
          100,
          baseCoverage * 0.85 +
            verificationBonus
        )
      );

      const profile =
        profileMap.get(
          developerId
        );

      candidates.push({
        developer_id: developerId,

        full_name:
          profile?.full_name ?? null,

        username:
          profile?.username ?? null,

        country:
          profile?.country ?? null,

        city:
          profile?.city ?? null,

        avatar_url:
          profile?.avatar_url ?? null,

        matching_skills:
          matchingSkillIds
            .map(
              (id) =>
                requiredById.get(id)
                  ?.name
            )
            .filter(Boolean) as string[],

        verified_skills:
          matchingSkillIds
            .filter((id) =>
              verifiedSet.has(id)
            )
            .map(
              (id) =>
                requiredById.get(id)
                  ?.name
            )
            .filter(Boolean) as string[],

        compatibility_score:
          score,
      });
    }

    /*
     * Highest compatibility first.
     */
    candidates.sort(
      (a, b) =>
        b.compatibility_score -
        a.compatibility_score
    );

    /*
     * Only send the strongest candidates
     * to the AI model.
     */
    const topCandidates =
      candidates.slice(0, 8);

    if (topCandidates.length === 0) {
      return jsonResponse({
        recommendations: [],
        meta: {
          reason:
            "No developers currently match the required skills.",
        },
      });
    }

    /*
     * AI enhancement.
     *
     * If OpenAI is unavailable, the function
     * still returns deterministic recommendations.
     */
    let aiRecommendations =
      new Map<
        string,
        {
          explanation: string;
          suggested_role: string;
        }
      >();

    if (openAIKey) {
      const candidateContext =
        topCandidates.map(
          (candidate) => ({
            developer_id:
              candidate.developer_id,

            name:
              candidate.full_name ||
              candidate.username ||
              "Developer",

            location: [
              candidate.city,
              candidate.country,
            ]
              .filter(Boolean)
              .join(", "),

            matching_skills:
              candidate.matching_skills,

            verified_skills:
              candidate.verified_skills,

            compatibility_score:
              candidate.compatibility_score,
          })
        );

      const prompt = `
You are the AI collaborator advisor for AfriDev Exchange, an African developer collaboration platform.

Project:
Title: ${project.title}

Description:
${project.description}

Status:
${project.status}

Required skills:
${requiredSkills
  .map(
    (skill) =>
      `- ${skill.name}`
  )
  .join("\n")}

Candidate developers:
${JSON.stringify(
  candidateContext,
  null,
  2
)}

For every candidate, provide:

1. A concise explanation of why this developer fits the project.
2. A practical suggested role.

STRICT RULES:

- Do not invent skills.
- Do not invent certifications.
- Do not invent projects.
- Do not invent experience.
- Do not invent GitHub activity.
- Only use information contained in the candidate data.
- Do not change the compatibility score.
- Keep explanations concise and useful.

Return ONLY valid JSON:

{
  "recommendations": [
    {
      "developer_id": "uuid",
      "explanation": "short explanation",
      "suggested_role": "role"
    }
  ]
}
`;

      try {
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
                input: prompt,
                temperature: 0.2,
              }),
            }
          );

        if (aiResponse.ok) {
          const aiJson =
            await aiResponse.json();

          const parsed =
            parseAIJson(
              extractOutputText(
                aiJson
              )
            );

          for (const item of Array.isArray(
            parsed?.recommendations
          )
            ? parsed.recommendations
            : []) {
            if (
              typeof item?.developer_id ===
                "string" &&
              topCandidates.some(
                (candidate) =>
                  candidate.developer_id ===
                  item.developer_id
              )
            ) {
              aiRecommendations.set(
                item.developer_id,
                {
                  explanation:
                    typeof item.explanation ===
                    "string"
                      ? item.explanation
                      : "Strong alignment with the project's required skills.",

                  suggested_role:
                    typeof item.suggested_role ===
                    "string"
                      ? item.suggested_role
                      : "Project collaborator",
                }
              );
            }
          }
        } else {
          console.error(
            "OpenAI collaborator matching error:",
            await aiResponse.text()
          );
        }
      } catch (aiError) {
        console.error(
          "OpenAI collaborator matching request failed:",
          aiError
        );
      }
    }

    /*
     * Combine deterministic matching
     * with AI explanations.
     */
    const recommendations =
      topCandidates.map(
        (candidate) => {
          const ai =
            aiRecommendations.get(
              candidate.developer_id
            );

          return {
            ...candidate,

            explanation:
              ai?.explanation ||
              `Strong skill alignment: ${candidate.matching_skills.join(
                ", "
              )}.${
                candidate.verified_skills
                  .length > 0
                  ? ` Verified evidence supports ${candidate.verified_skills.join(
                      ", "
                    )}.`
                  : ""
              }`,

            suggested_role:
              ai?.suggested_role ||
              `Contributor in ${
                candidate.matching_skills[0] ||
                "required skills"
              }`,
          };
        }
      );

    return jsonResponse({
      recommendations,

      meta: {
        required_skills:
          requiredSkills.length,

        candidates_considered:
          candidates.length,

        ai_enhanced:
          aiRecommendations.size > 0,
      },
    });
  } catch (error) {
    console.error(
      "ai-project-match error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected collaborator matching error.",
      },
      500
    );
  }
});