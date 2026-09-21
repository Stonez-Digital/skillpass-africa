
import { getCandidateProfile } from "@/lib/learners";

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { candidate, verifications, portfolioItems } = await getCandidateProfile(id);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", marginBottom: 8 }}>
        {candidate.full_name}
      </h1>
      {candidate.location && <p style={{ color: "var(--muted)" }}>{candidate.location}</p>}
      {candidate.biography && <p style={{ marginTop: 16 }}>{candidate.biography}</p>}

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Verified skills</h2>
        {verifications.length === 0 && (
          <p style={{ color: "var(--muted)" }}>No verified skills yet.</p>
        )}
        <div style={{ display: "grid", gap: 12 }}>
          {verifications.map((v, i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <strong>{v.skillName ?? "Unknown skill"}</strong>
              <span style={{ marginLeft: 8, fontSize: 12, color: "var(--green)" }}>
                {v.verification_status}
              </span>
              {v.competency_rating && (
                <span style={{ marginLeft: 8, color: "var(--muted)" }}>
                  Rating: {v.competency_rating}/5
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Portfolio</h2>
        {portfolioItems.length === 0 && (
          <p style={{ color: "var(--muted)" }}>No public portfolio items.</p>
        )}
        <div style={{ display: "grid", gap: 12 }}>
          {portfolioItems.map((item) => (
            <div key={item.id} className="card" style={{ padding: 16 }}>
              <strong>{item.title}</strong>
              {item.description && <p style={{ marginTop: 4 }}>{item.description}</p>}
            </div>
          ))}
        </div>
      </section>

      {candidate.selected_skills.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Self-reported skills</h2>
          <p>{candidate.selected_skills.join(", ")}</p>
        </section>
      )}
    </div>
  );
}