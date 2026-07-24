"use client";

import { useEffect, useState } from "react";
import { styles } from "../../employerStyles";
import {
  defaultShiftDraft,
  shiftDraftStorageKey,
  type ShiftDraft,
  validateShiftDraft
} from "../shiftCreationModel";

type ClientLearningCapsule = {
  description: string;
  experience: string;
  title: string;
};

const clientLearningCapsuleStorageKey = "rwos.employer.clientLearningCapsules.v1";

const fields: readonly {
  key: keyof ShiftDraft;
  label: string;
  placeholder: string;
}[] = [
  { key: "employerOrganization", label: "Employer organization", placeholder: "Organization" },
  { key: "residence", label: "Residence", placeholder: "Residence" },
  { key: "department", label: "Department", placeholder: "Department" },
  { key: "role", label: "Role", placeholder: "Role needed" },
  { key: "date", label: "Date", placeholder: "YYYY-MM-DD" },
  { key: "startTime", label: "Start time", placeholder: "HH:MM" },
  { key: "endTime", label: "End time", placeholder: "HH:MM" },
  { key: "timezone", label: "Timezone", placeholder: "Timezone" },
  { key: "workerCount", label: "Required worker count", placeholder: "Worker count" },
  { key: "responsibilities", label: "Responsibilities", placeholder: "Responsibilities" },
  { key: "qualificationRequirements", label: "Qualification requirements", placeholder: "Requirements" },
  { key: "experienceRequirement", label: "Experience requirement", placeholder: "Experience" },
  { key: "rate", label: "Rate", placeholder: "Rate summary" },
  { key: "urgentPremium", label: "Urgent premium", placeholder: "Premium where governed" },
  { key: "transportTerms", label: "Transport terms", placeholder: "Transport terms" },
  { key: "travelAllowance", label: "Travel allowance", placeholder: "Allowance where governed" },
  { key: "notes", label: "Notes", placeholder: "Operational notes" },
  { key: "recurrence", label: "Recurrence", placeholder: "Not recurring / rule summary" }
];

export function CreateShiftDraftForm() {
  const [draft, setDraft] = useState<ShiftDraft>(defaultShiftDraft);
  const [learningCapsules, setLearningCapsules] = useState<ClientLearningCapsule[]>([]);
  const [learningDescription, setLearningDescription] = useState("");
  const [learningExperience, setLearningExperience] = useState("");
  const [learningTitle, setLearningTitle] = useState("");
  const validation = validateShiftDraft(draft);

  useEffect(() => {
    const saved = window.localStorage.getItem(shiftDraftStorageKey);
    if (saved) {
      setDraft({ ...defaultShiftDraft, ...JSON.parse(saved) });
    }

    const savedCapsules = window.localStorage.getItem(clientLearningCapsuleStorageKey);
    if (savedCapsules) {
      setLearningCapsules(JSON.parse(savedCapsules));
    }
  }, []);

  function updateField(key: keyof ShiftDraft, value: string) {
    const nextDraft = { ...draft, [key]: value, publicationState: validation.state };
    setDraft(nextDraft);
    window.localStorage.setItem(shiftDraftStorageKey, JSON.stringify(nextDraft));
  }

  function saveDraft() {
    const nextDraft = { ...draft, publicationState: validation.state };
    setDraft(nextDraft);
    window.localStorage.setItem(shiftDraftStorageKey, JSON.stringify(nextDraft));
  }

  function saveLearningCapsule() {
    const title = learningTitle.trim();
    if (!title) return;

    const nextCapsules = [
      ...learningCapsules,
      {
        description: learningDescription.trim() || "Client-described job capsule pending review.",
        experience: learningExperience.trim() || "Experience requirements pending client detail.",
        title
      }
    ];

    setLearningCapsules(nextCapsules);
    setLearningTitle("");
    setLearningDescription("");
    setLearningExperience("");
    window.localStorage.setItem(clientLearningCapsuleStorageKey, JSON.stringify(nextCapsules));
  }

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.eyebrowDark}>Working shift draft</p>
        <h2 style={styles.sectionTitle}>Complete fields, validate locally, then review.</h2>
        <p style={styles.sectionCopy}>
          This uses browser local storage only. It does not create a server shift, publish a shift,
          notify workers, assign anyone, or calculate finance.
        </p>
      </div>
      <div style={styles.formGrid}>
        {fields.map((field) => (
          <label key={field.key} style={styles.fieldLabel}>
            {field.label}
            <input
              value={String(draft[field.key])}
              placeholder={field.placeholder}
              onChange={(event) => updateField(field.key, event.target.value)}
              style={styles.input}
            />
          </label>
        ))}
        <label style={styles.fieldLabel}>
          Shift type
          <select
            value={draft.shiftType}
            onChange={(event) => updateField("shiftType", event.target.value)}
            style={styles.input}
          >
            <option>Normal</option>
            <option>Recurring</option>
            <option>Urgent</option>
          </select>
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        <button type="button" onClick={saveDraft} style={styles.primaryButton}>
          Validate draft locally
        </button>
        <a href="/employer/shifts/review" style={styles.secondaryButton}>
          Review shift
        </a>
      </div>
      <p style={styles.warning}>
        Local state: {validation.state}. Missing required fields:{" "}
        {validation.missing.length === 0 ? "none" : validation.missing.join(", ")}.
      </p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Client learning capsules</p>
          <h3 style={styles.cardTitle}>Add a new job type when the existing capsules do not fit.</h3>
          <p style={styles.cardText}>
            These client capsules are saved in browser local storage only. They help capture new
            staffing language for future AI review, but they do not train AI, publish shifts, or
            create approved roles automatically.
          </p>
        </div>
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>
            New job capsule
            <input
              onChange={(event) => setLearningTitle(event.target.value)}
              placeholder="Example: pastry cook, evening server, HVAC helper"
              style={styles.input}
              value={learningTitle}
            />
          </label>
          <label style={styles.fieldLabel}>
            Description
            <input
              onChange={(event) => setLearningDescription(event.target.value)}
              placeholder="What work does the client need?"
              style={styles.input}
              value={learningDescription}
            />
          </label>
          <label style={styles.fieldLabel}>
            Experience needed
            <input
              onChange={(event) => setLearningExperience(event.target.value)}
              placeholder="Experience, tools, language, site context"
              style={styles.input}
              value={learningExperience}
            />
          </label>
        </div>
        <button
          disabled={!learningTitle.trim()}
          onClick={saveLearningCapsule}
          style={!learningTitle.trim() ? styles.disabledAction : styles.secondaryButton}
          type="button"
        >
          Save client capsule locally
        </button>
        <div style={styles.pillGrid}>
          {learningCapsules.map((capsule) => (
            <article key={`${capsule.title}-${capsule.description}`} style={styles.tintedCard}>
              <h3 style={styles.cardTitle}>{capsule.title}</h3>
              <p style={styles.cardText}>{capsule.description}</p>
              <p style={styles.cardText}>{capsule.experience}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
