"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function searchLearners(filters: { skill?: string; location?: string }) {
  const profile = await getCurrentProfile();

  if (profile.role !== "employer") {
    throw new Error("Only employers can search learners.");
  }

  const supabase = await createClient();

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

  const { data: verifications, error: verificationError } = await supabase
    .from("skill_verifications")
    .select("competency_rating, verified_at, verification_status, submissions(assessments(skills(name)))")
    .eq("learner_id", learnerId)
    .eq("verification_status", "active")
    .eq("decision", "approved");

  if (verificationError) {
    throw new Error(verificationError.message);
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