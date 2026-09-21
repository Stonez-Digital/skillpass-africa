"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function listSkillCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name").order("name");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function searchLearners(filters: { skill?: string; location?: string; categoryId?: string }) {
  const profile = await getCurrentProfile();

  if (profile.role !== "employer") {
    throw new Error("Only employers can search learners.");
  }

  const supabase = await createClient();

  let learnerIdsWithVerifiedCategory: string[] | null = null;

  if (filters.categoryId) {
    const { data: skills, error: skillsError } = await supabase
      .from("skills")
      .select("id")
      .eq("category_id", filters.categoryId);
    if (skillsError) throw new Error(skillsError.message);
    const skillIds = skills.map((s) => s.id);

    const { data: assessments, error: assessmentsError } = await supabase
      .from("assessments")
      .select("id")
      .in("skill_id", skillIds.length > 0 ? skillIds : ["00000000-0000-0000-0000-000000000000"]);
    if (assessmentsError) throw new Error(assessmentsError.message);
    const assessmentIds = assessments.map((a) => a.id);

    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id")
      .in("assessment_id", assessmentIds.length > 0 ? assessmentIds : ["00000000-0000-0000-0000-000000000000"]);
    if (submissionsError) throw new Error(submissionsError.message);
    const submissionIds = submissions.map((s) => s.id);

    const { data: verifications, error: verificationsError } = await supabase
      .from("skill_verifications")
      .select("learner_id")
      .in("submission_id", submissionIds.length > 0 ? submissionIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("decision", "approved")
      .eq("verification_status", "active");
    if (verificationsError) throw new Error(verificationsError.message);

    learnerIdsWithVerifiedCategory = [...new Set(verifications.map((v) => v.learner_id))];
  }

  let query = supabase
    .from("profiles")
    .select("id, full_name, location, biography, selected_skills")
    .eq("role", "learner");

  if (filters.skill) {
    query = query.contains("selected_skills", [filters.skill]);
  }

  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  if (learnerIdsWithVerifiedCategory !== null) {
    query = query.in("id", learnerIdsWithVerifiedCategory.length > 0 ? learnerIdsWithVerifiedCategory : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, error } = await query.order("full_name");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getCandidateProfile(learnerId: string) {
  const profile = await getCurrentProfile();

  if (profile.role !== "employer") {
    throw new Error("Only employers can view candidate profiles.");
  }

  const supabase = await createClient();

  const { data: candidate, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, location, biography, selected_skills")
    .eq("id", learnerId)
    .eq("role", "learner")
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: rawVerifications, error: verificationError } = await supabase
    .from("skill_verifications")
    .select("competency_rating, verified_at, submission_id, verification_status")
    .eq("learner_id", learnerId)
    .eq("verification_status", "active")
    .eq("decision", "approved");

  if (verificationError) {
    throw new Error(verificationError.message);
  }

  const submissionIds = rawVerifications.map((v) => v.submission_id);

  let verifications: { competency_rating: number | null; verified_at: string; skillName: string | null; verification_status: string }[] = [];

  if (submissionIds.length > 0) {
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, assessment_id")
      .in("id", submissionIds);

    if (submissionsError) {
      throw new Error(submissionsError.message);
    }

    const assessmentIds = submissions.map((s) => s.assessment_id);

    const { data: assessments, error: assessmentsError } = await supabase
      .from("assessments")
      .select("id, skill_id")
      .in("id", assessmentIds);

    if (assessmentsError) {
      throw new Error(assessmentsError.message);
    }

    const skillIds = assessments.map((a) => a.skill_id);

    const { data: skills, error: skillsError } = await supabase
      .from("skills")
      .select("id, name")
      .in("id", skillIds);

    if (skillsError) {
      throw new Error(skillsError.message);
    }

    verifications = rawVerifications.map((v) => {
      const submission = submissions.find((s) => s.id === v.submission_id);
      const assessment = submission ? assessments.find((a) => a.id === submission.assessment_id) : undefined;
      const skill = assessment ? skills.find((sk) => sk.id === assessment.skill_id) : undefined;
      return {
        competency_rating: v.competency_rating,
        verified_at: v.verified_at,
        skillName: skill?.name ?? null,
        verification_status: v.verification_status,
      };
    });
  }

  const { data: portfolioItems, error: portfolioError } = await supabase
    .from("portfolio_items")
    .select("id, title, description")
    .eq("learner_id", learnerId)
    .eq("is_public", true);

  if (portfolioError) {
    throw new Error(portfolioError.message);
  }

  return { candidate, verifications, portfolioItems: portfolioItems ?? [] };
}
