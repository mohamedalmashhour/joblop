"use client";

import { useMemo, useState } from "react";
import {
  applicantFilters,
  applicantFixtures,
  applicantSorts,
  filterApplicants
} from "../assignmentWorkflowContent";
import { styles } from "../employerStyles";

export function ApplicantReviewPanel() {
  const [filter, setFilter] = useState<(typeof applicantFilters)[number]>("All applicants");
  const [sort, setSort] = useState<(typeof applicantSorts)[number]>("Newest first");
  const applicants = useMemo(() => filterApplicants(filter, applicantFixtures), [filter]);

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.eyebrowDark}>Fixture-backed applicant review</p>
        <h2 style={styles.sectionTitle}>Filter applicants without exposing sensitive data.</h2>
        <p style={styles.sectionCopy}>
          This list uses labelled development fixtures. It does not approve, reject, assign,
          notify, or contact workers.
        </p>
      </div>
      <div style={styles.formGrid}>
        <label style={styles.fieldLabel}>
          Filter
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} style={styles.input}>
            {applicantFilters.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label style={styles.fieldLabel}>
          Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} style={styles.input}>
            {applicantSorts.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <p style={styles.warning}>Sort selected: {sort}. Sorting is a local display control only, not AI ranking.</p>
      <div style={styles.cardGrid}>
        {applicants.map((applicant) => (
          <article key={applicant.id} style={styles.card}>
            <h3 style={styles.cardTitle}>{applicant.displayName}</h3>
            <p style={styles.cardText}>Status: {applicant.status}</p>
            <p style={styles.cardText}>Role fit: {applicant.roleFit}</p>
            <p style={styles.cardText}>Availability: {applicant.availability}</p>
            <p style={styles.cardText}>{applicant.privacyLevel}</p>
            <a href="/employer/applicants/detail" style={{ ...styles.secondaryButton, marginTop: 12 }}>
              Open applicant detail
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
