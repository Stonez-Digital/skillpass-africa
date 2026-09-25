"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { Opportunity } from "@/types/database";

type VerifiedSkill = {
  skill_name: string;
  competency_rating: number | null;
};

export type OpportunityRecommendation = Opportunity & {
  score: number;
  reasons: string[];
  matched_skills: string[];
  verified_skill_matches: string[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function skillMatches(required: string, learnerSkill: string): boolean {
  const requiredNormalized = normalize(required);
  const learnerNormalized = normalize(learnerSkill);

  return (
    requiredNormalized === learnerNormalized ||
    requiredNormalized.includes(learnerNormalized) ||
    learnerNormalized.includes(requiredNormalized)
  );
}

function locationMatches(
  learnerLocation: string | null,
  opportunityLocation: string | null
): boolean {
  if (!learnerLocation || !opportunityLocation) {
    return false;
  }

  const learner = normalize(learnerLocation);
  const opportunity = normalize(opportunityLocation);

  return (
    learner === opportunity ||
    learner.includes(opportunity) ||
    opportunity.includes(learner)
  );
}

export async function getOpportunityRecommendations(
  limit = 10
): Promise<OpportunityRecommendation[]> {
  const profile = await getCurrentProfile();

  if (profile.role !== "learner") {
    return [];
  }

  const supabase = await createClient();

  /*
   * Get the learner's verified skills through:
   *
   * skill_verifications
   *   → submissions
   *   → assessments
   *   → skills
   */
  const { data: verifications, error: verificationError } = await supabase
    .from("skill_verifications")
    .select(`
      competency_rating,
      decision,
      verification_status,
      submissions!inner(
        learner_id,
        assessments!inner(
          skill_id,
          skills!inner(
            name
          )
        )
      )
    `)
    .eq("learner_id", profile.id)
    .eq("decision", "approved")
    .eq("verification_status", "active");

  if (verificationError) {
    throw new Error(verificationError.message);
  }

  const verifiedSkills: VerifiedSkill[] = [];

  for (const verification of verifications ?? []) {
    const submission = verification.submissions;

    if (!submission) {
      continue;
    }

    const assessment = submission.assessments;

    if (!assessment) {
      continue;
    }

    const skill = assessment.skills;

    if (!skill) {
      continue;
    }

    verifiedSkills.push({
      skill_name: skill.name,
      competency_rating: verification.competency_rating,
    });
  }

  const selectedSkills = profile.selected_skills ?? [];

  /*
   * Get published opportunities.
   */
  const { data: opportunities, error: opportunityError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (opportunityError) {
    throw new Error(opportunityError.message);
  }

  const recommendations: OpportunityRecommendation[] = [];

  for (const opportunity of opportunities ?? []) {
    let score = 0;

    const reasons: string[] = [];
    const matchedSkills: string[] = [];
    const verifiedSkillMatches: string[] = [];

    /*
     * 1. Match required skills against verified skills.
     * This is the strongest signal.
     */
    for (const requiredSkill of opportunity.required_skills ?? []) {
      const verifiedMatch = verifiedSkills.find((skill) =>
        skillMatches(requiredSkill, skill.skill_name)
      );

      if (verifiedMatch) {
        matchedSkills.push(requiredSkill);
        verifiedSkillMatches.push(requiredSkill);

        score += 40;

        if (verifiedMatch.competency_rating) {
          score += verifiedMatch.competency_rating;
        }
      }
    }

    /*
     * 2. Match required skills against profile skills.
     */
    for (const requiredSkill of opportunity.required_skills ?? []) {
      const profileMatch = selectedSkills.some((skill) =>
        skillMatches(requiredSkill, skill)
      );

      if (profileMatch && !verifiedSkillMatches.includes(requiredSkill)) {
        matchedSkills.push(requiredSkill);
        score += 15;
      }
    }

    /*
     * 3. Location compatibility.
     *
     * Remote opportunities don't require a location match.
     */
    if (opportunity.work_arrangement === "remote") {
      score += 15;
      reasons.push("This opportunity is remote.");
    } else if (
      locationMatches(profile.location, opportunity.location)
    ) {
      score += 10;
      reasons.push("The opportunity is in your location.");
    }

    /*
     * 4. Work arrangement.
     *
     * Remote is already handled above.
     * Hybrid receives a small compatibility signal.
     */
    if (opportunity.work_arrangement === "hybrid") {
      score += 5;
      reasons.push("This opportunity offers a hybrid work arrangement.");
    }

    /*
     * 5. Generate skill explanations.
     */
    if (verifiedSkillMatches.length > 0) {
      reasons.push(
        `You have verified ${verifiedSkillMatches.join(", ")} skill${
          verifiedSkillMatches.length > 1 ? "s" : ""
        }.`
      );
    } else if (matchedSkills.length > 0) {
      reasons.push(
        `Your profile includes ${matchedSkills.join(", ")}.`
      );
    }

    /*
     * 6. Give a small signal to opportunities
     * with no required skills rather than treating
     * them as impossible matches.
     */
    if ((opportunity.required_skills ?? []).length === 0) {
      score += 5;
      reasons.push("This opportunity has no specific skill requirements.");
    }

    /*
     * Only return opportunities that have at least
     * one meaningful matching signal.
     */
    if (score > 0) {
      recommendations.push({
        ...opportunity,
        score,
        reasons,
        matched_skills: [...new Set(matchedSkills)],
        verified_skill_matches: [...new Set(verifiedSkillMatches)],
      });
    }
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
