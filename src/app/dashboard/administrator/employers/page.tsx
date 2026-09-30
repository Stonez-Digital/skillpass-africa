import { listEmployers } from "@/lib/admin/employers";
import { StatusButtons } from "./status-buttons";

export default async function AdminEmployersPage() {
  const employers = await listEmployers();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section>
        <p className="eyebrow">Administrator controls</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>
          Employer verification
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 760 }}>
          Review and approve employer accounts. Only approved employers can publish opportunities.
        </p>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <h2 style={{ margin: "0 0 16px" }}>{employers.length} employers</h2>
        <div style={{ display: "grid", gap: 14 }}>
          {employers.map((employer) => (
            <article key={employer.id} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <strong>{employer.full_name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{employer.email}</div>
                  {employer.company_name && (
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{employer.company_name}</div>
                  )}
                </div>
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: employer.employer_status === "approved" ? "#dcfce7" : "#fef3c7",
                    color: employer.employer_status === "approved" ? "#166534" : "#92400e",
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "capitalize",
                  }}
                >
                  {employer.employer_status ?? "pending"}
                </span>
              </div>
              <StatusButtons employerId={employer.id} currentStatus={employer.employer_status ?? "pending"} />
            </article>
          ))}
          {employers.length === 0 && (
            <p style={{ color: "var(--muted)" }}>No employer accounts yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}