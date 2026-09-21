"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { searchLearners, listSkillCategories } from "@/lib/learners";

type Learner = {
  id: string;
  full_name: string;
  location: string | null;
  biography: string | null;
  selected_skills: string[];
};

type Category = { id: string; name: string };

export default function TalentSearchPage() {
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<Learner[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    listSkillCategories().then(setCategories).catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await searchLearners({
        skill: skill || undefined,
        location: location || undefined,
        categoryId: categoryId || undefined,
      });
      setResults(data);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", marginBottom: 24 }}>
        Discover talent
      </h1>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input
          placeholder="Skill (e.g. React)"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="input"
        />
        <input
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="input"
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
          <option value="">Any verified category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="button" disabled={isLoading}>
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      {hasSearched && results.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No learners found matching those filters.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {results.map((learner) => (
          <div key={learner.id} className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div>
                <h2 style={{ margin: "0 0 8px" }}>{learner.full_name}</h2>
                {learner.location && <p style={{ color: "var(--muted)" }}>{learner.location}</p>}
                {learner.biography && <p>{learner.biography}</p>}
                {learner.selected_skills.length > 0 && (
                  <p style={{ marginTop: 12 }}>
                    <strong>Skills:</strong> {learner.selected_skills.join(", ")}
                  </p>
                )}
              </div>
              <Link href={`/dashboard/employer/talent/${learner.id}`} className="button">
                View profile
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}