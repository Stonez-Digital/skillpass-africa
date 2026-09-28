"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

type BookmarkRow = {
  id: string;
  opportunity_id: string;
  learner_id: string;
  created_at?: string;
};

export async function getMyBookmarkedOpportunityIds(): Promise<string[]> {
  const profile = await getCurrentProfile();

  if (profile.role !== "learner") {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunity_bookmarks" as never)
    .select("opportunity_id")
    .eq("learner_id", profile.id);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as Pick<BookmarkRow, "opportunity_id">[]).map(
    (bookmark) => bookmark.opportunity_id
  );
}

export async function toggleOpportunityBookmark(
  opportunityId: string
): Promise<boolean> {
  const profile = await getCurrentProfile();

  if (profile.role !== "learner") {
    throw new Error("Only learners can bookmark opportunities.");
  }

  const supabase = await createClient();

  const { data: existing, error: lookupError } = await supabase
    .from("opportunity_bookmarks" as never)
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("learner_id", profile.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const existingBookmark = existing as unknown as { id: string } | null;

  if (existingBookmark) {
    const { error } = await supabase
      .from("opportunity_bookmarks" as never)
      .delete()
      .eq("id", existingBookmark.id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/opportunities");
    return false;
  }

  const { error } = await supabase
    .from("opportunity_bookmarks" as never)
    .insert({
      opportunity_id: opportunityId,
      learner_id: profile.id,
    } as never);

  if (error) {
    if (error.code === "23505") {
      return true;
    }

    throw new Error(error.message);
  }

  revalidatePath("/opportunities");
  return true;
}
