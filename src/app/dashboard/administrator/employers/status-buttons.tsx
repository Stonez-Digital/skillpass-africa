"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEmployerStatus } from "@/lib/admin/employers";

const statuses = ["pending", "approved", "suspended", "revoked"] as const;

export function StatusButtons({
  employerId,
  currentStatus,
}: {
  employerId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick(status: (typeof statuses)[number]) {
    setIsLoading(true);
    try {
      await updateEmployerStatus(employerId, status);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
      {statuses.map((status) => (
        <button
          key={status}
          onClick={() => handleClick(status)}
          disabled={isLoading || status === currentStatus}
          className="button"
          style={{ fontSize: 13, padding: "6px 12px" }}
        >
          {status}
        </button>
      ))}
    </div>
  );
}