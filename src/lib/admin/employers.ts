"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function listEmployers() {
  const profile = await getCurrentProfile();

  if (profile.role !== "administrator") {
    throw new Error("Only administrators can view employer verification status.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, company_name, employer_status, created_at")
    .eq("role", "employer")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateEmployerStatus(userId: string, status: "pending" | "approved" | "suspended" | "revoked") {
  const profile = await getCurrentProfile();

  if (profile.role !== "administrator") {
    throw new Error("Only administrators can update employer status.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ employer_status: status })
    .eq("id", userId)
    .eq("role", "employer")
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/administrator/employers");
  return data;
}