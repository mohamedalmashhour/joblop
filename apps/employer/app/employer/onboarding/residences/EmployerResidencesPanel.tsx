"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  calendarPartialState,
  type AuthenticatedViewState,
  type EmployerResidenceDto
} from "@rwos/shared";
import { styles } from "../../employerStyles";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type ResidencesState =
  | AuthenticatedViewState<readonly EmployerResidenceDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

// Persisted, org-scoped residences read (GET /api/residences → /organizations/:id/residences).
// Replaces the development fixtures with authoritative data — never shows fixtures as persisted.
export function EmployerResidencesPanel() {
  const [state, setState] = useState<ResidencesState>({ status: "loading" });
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/residences", { cache: "no-store" });
      if (generation !== generationRef.current) return;
      if (response.status === 409) {
        const body = await response.json().catch(() => null);
        if (generation !== generationRef.current) return;
        if (body && body.status === "organization_required" && Array.isArray(body.organizations)) {
          return setState({ status: "organization_required", organizations: body.organizations });
        }
      }
      if (!response.ok) return setState(calendarFailureState(response.status));
      // The route has already parsed the API record into this shape, and parsing it again would fail.
      const payload = (await response.json()) as { residences: readonly EmployerResidenceDto[] };
      if (generation !== generationRef.current) return;
      const residences = payload.residences;
      setState(residences.length > 0 ? calendarListState(residences) : calendarPartialState(residences));
    } catch {
      if (generation === generationRef.current) setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  if (state.status === "loading") {
    return (
      <ResidencesMessage
        title="Loading residences"
        message="Checking your authenticated organization context."
      />
    );
  }
  if (state.status === "denied") {
    return (
      <ResidencesMessage
        title="Sign in to view residences"
        message="Residences are shown only for your authenticated organization."
        action={{ href: "/signin", label: "Go to sign in" }}
      />
    );
  }
  if (state.status === "organization_required") {
    return (
      <ResidencesMessage
        title="Select your organization"
        message="Choose your organization on the request calendar, then return to view its residences."
        action={{ href: "/employer/calendar", label: "Open request calendar" }}
      />
    );
  }
  if (state.status === "empty") {
    return (
      <ResidencesMessage
        title="No residences yet"
        message="Residences you create for this organization will appear here — no fixture records are shown."
      />
    );
  }
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <ResidencesMessage
        title={
          state.status === "unavailable"
            ? "Residences unavailable"
            : state.status === "stale"
              ? "Residences changed"
              : "Residences could not be loaded"
        }
        message="No fixture records are shown as persisted data. Retry when the service is available."
        onRetry={load}
      />
    );
  }

  return (
    <div style={styles.cardGrid}>
      {state.data.map((residence) => (
        <article key={residence.residenceId} style={styles.card}>
          <span style={styles.statusBadge}>{residence.status.replaceAll("_", " ")}</span>
          <h3 style={styles.cardTitle}>{residence.name}</h3>
          {formatLocation(residence) ? (
            <p style={styles.cardText}>{formatLocation(residence)}</p>
          ) : null}
          <p style={styles.cardText}>Reference: {residence.publicId}</p>
          <SiteLocationForm residenceId={residence.residenceId} onSaved={load} />
        </article>
      ))}
    </div>
  );
}

// Workers search by distance, so a site without a location never appears in their results.
function SiteLocationForm({ residenceId, onSaved }: Readonly<{ residenceId: string; onSaved: () => Promise<void> }>) {
  const [postalCode, setPostalCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setProblem(false);
    const response = await fetch(`/api/residences/${encodeURIComponent(residenceId)}/location`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postalCode })
    }).catch(() => null);
    setBusy(false);
    if (response?.ok) return onSaved();
    setProblem(true);
  };
  return (
    <form onSubmit={(event) => void save(event)} style={styles.formGrid}>
      <label style={styles.fieldLabel}>
        Postal code, so workers can find this site
        <input
          autoComplete="postal-code"
          onChange={(event) => setPostalCode(event.target.value)}
          placeholder="e.g. H7V 1A1"
          required
          style={styles.input}
          value={postalCode}
        />
      </label>
      {problem ? <p role="alert" style={styles.warning}>That postal code could not be found. Check it and try again.</p> : null}
      <button disabled={busy} style={styles.primaryButton} type="submit">
        {busy ? "Saving…" : "Save location"}
      </button>
    </form>
  );
}

function formatLocation(residence: EmployerResidenceDto) {
  return [residence.addressSummary, residence.city, residence.region, residence.country]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(", ");
}

function ResidencesMessage({
  title,
  message,
  action,
  onRetry
}: Readonly<{
  title: string;
  message: string;
  action?: Readonly<{ href: string; label: string }>;
  onRetry?: () => void;
}>) {
  return (
    <div aria-live="polite" style={styles.panel}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <p style={styles.sectionCopy}>{message}</p>
      {action ? (
        <a href={action.href} style={styles.primaryButton}>
          {action.label}
        </a>
      ) : null}
      {onRetry ? (
        <button
          onClick={onRetry}
          style={{ ...styles.secondaryButton, cursor: "pointer" }}
          type="button"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
