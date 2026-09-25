"use client";

import { useState } from "react";
import { toggleOpportunityBookmark } from "@/lib/bookmarks";

export function BookmarkButton({
  opportunityId,
  initialBookmarked,
}: {
  opportunityId: string;
  initialBookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const result = await toggleOpportunityBookmark(opportunityId);
      setBookmarked(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update bookmark."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="button"
      >
        {loading ? "Saving..." : bookmarked ? "★ Saved" : "☆ Save"}
      </button>

      {error && (
        <p style={{ color: "#991b1b", fontSize: 13, marginTop: 4 }}>
          {error}
        </p>
      )}
    </div>
  );
}
