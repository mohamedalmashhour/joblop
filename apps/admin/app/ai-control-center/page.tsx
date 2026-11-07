import type { CSSProperties } from "react";
import {
  aiAllowed,
  aiControlFilters,
  aiGovernanceRecords,
  aiProhibited,
  governanceDetails,
  page073BoundaryStatements,
  protectedActions,
  statusPanels
} from "./aiControlCenterContent";

export default function AIControlCenterPage() {
  const selectedRecord = aiGovernanceRecords[0];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Joblop / Administration</p>
          <h1 style={styles.title}>AI Control Center</h1>
          <p style={styles.lede}>
            Governed AI policy and control visibility for authorized administrators and super
            administrators. This page displays AI feature governance, permission boundaries,
            evidence source lists, guardrail status, approval policy, simulation mode, AI status,
            usage summaries, and AI audit history without executing AI actions, changing models,
            altering prompts, enabling hidden features, approving decisions, assigning workers, or
            modifying source records.
          </p>
        </div>
        <aside aria-label="Current AI governance context" style={styles.contextPanel}>
          <strong>Role: authorized AI governance scope</strong>
          <span>Scope: organization / residence / department</span>
          <span>Freshness: current / partial / stale / unavailable</span>
        </aside>
      </header>

      <section aria-labelledby="boundary-title" style={styles.boundaryStrip}>
        <div>
          <p style={styles.eyebrowDark}>Frozen boundaries</p>
          <h2 id="boundary-title" style={styles.sectionTitle}>
            AI visibility is not authority to execute recommendations, approve operational
            decisions, alter policies, change financial state, communicate externally, or mutate
            source workflows.
          </h2>
        </div>
        <div style={styles.boundaryGrid}>
          {page073BoundaryStatements.map((statement) => (
            <span key={statement} style={styles.boundaryChip}>
              {statement}
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="filters-title" style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 id="filters-title" style={styles.h2}>
            Filters
          </h2>
          <span style={styles.statusBadge}>Scoped search only</span>
        </div>
        <div style={styles.filterGrid}>
          {aiControlFilters.map((filter) => (
            <label key={filter} style={styles.fieldLabel}>
              {filter}
              <input
                aria-label={`${filter} filter`}
                placeholder={`${filter} filter`}
                readOnly
                style={styles.input}
              />
            </label>
          ))}
        </div>
        <p style={styles.helpText}>
          Filters never reveal restricted AI records or allow inference of hidden users, workers,
          employers, financial records, compliance details, investigations, source prompts, model
          secrets, tokens, hidden system prompts, or protected personal information.
        </p>
      </section>

      <section style={styles.workspace} aria-label="AI control center workspace">
        <article aria-labelledby="ai-list-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="ai-list-title" style={styles.h2}>
              Governed AI Catalogue
            </h2>
            <span style={styles.statusBadge}>Development fixture</span>
          </div>
          <div style={styles.list}>
            {aiGovernanceRecords.map((record) => (
              <article key={record.id} style={styles.aiCard}>
                <div>
                  <strong>{record.title}</strong>
                  <p style={styles.muted}>{record.id}</p>
                  <p style={styles.muted}>
                    {record.category} / {record.scope}
                  </p>
                </div>
                <div style={styles.cardStatuses}>
                  <span style={styles.lifecycleBadge}>{record.lifecycle}</span>
                  <span
                    style={
                      record.freshness === "Stale" || record.freshness === "Partial"
                        ? styles.warningBadge
                        : styles.statusBadge
                    }
                  >
                    {record.freshness}
                  </span>
                </div>
                <p style={styles.cardText}>{record.boundary}</p>
                <p style={styles.privacyText}>{record.privacy}</p>
              </article>
            ))}
          </div>
        </article>

        <article aria-labelledby="selected-ai-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="selected-ai-title" style={styles.h2}>
              Selected AI Governance Summary
            </h2>
            <span style={styles.statusBadge}>Summary only</span>
          </div>
          <dl style={styles.summaryList}>
            <div style={styles.summaryRow}>
              <dt>Model status</dt>
              <dd>{selectedRecord.modelStatus}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Policy version</dt>
              <dd>{selectedRecord.policyVersion}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Capability</dt>
              <dd>{selectedRecord.capability}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Decision boundary</dt>
              <dd>{selectedRecord.boundary}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Confidence guidance</dt>
              <dd>{selectedRecord.confidence}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Evidence sources</dt>
              <dd>{selectedRecord.evidence}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Guardrail status</dt>
              <dd>{selectedRecord.guardrail}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Simulation mode</dt>
              <dd>{selectedRecord.simulation}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Usage summary</dt>
              <dd>{selectedRecord.usage}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>AI audit</dt>
              <dd>{selectedRecord.audit}</dd>
            </div>
          </dl>
          <p style={styles.helpText}>
            AI summaries are not authoritative decisions, workflow execution, assignment approval,
            conflict resolution, financial state, prompt management, model configuration, or hidden
            feature enablement.
          </p>
        </article>
      </section>

      <section style={styles.workspace} aria-label="Governance details and handoffs">
        <article aria-labelledby="governance-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="governance-title" style={styles.h2}>
              Governance Detail
            </h2>
            <span style={styles.statusBadge}>Human authority</span>
          </div>
          <dl style={styles.summaryList}>
            {governanceDetails.map((detail) => (
              <div key={detail.label} style={styles.summaryRow}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article aria-labelledby="actions-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="actions-title" style={styles.h2}>
              Actions and Handoffs
            </h2>
            <span style={styles.warningBadge}>Reason required</span>
          </div>
          <div style={styles.actionGrid}>
            {protectedActions.map((action) => (
              <button disabled key={action} type="button" style={styles.actionButton}>
                {action}
              </button>
            ))}
          </div>
          <label style={styles.fieldLabel}>
            Protected action reason
            <textarea
              placeholder="Reason captured before protected AI governance handoff"
              readOnly
              rows={4}
              style={styles.textarea}
            />
          </label>
          <p style={styles.helpText}>
            Action controls are UI placeholders. They do not execute AI actions, change AI models,
            alter prompts, enable hidden features, approve decisions, assign workers, resolve
            conflicts, change financial state, contact users, or modify source records.
          </p>
        </article>
      </section>

      <section aria-labelledby="states-title" style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 id="states-title" style={styles.h2}>
            Loading, Empty, Stale, Partial, Unavailable, Restricted, Policy, and AI States
          </h2>
          <span style={styles.statusBadge}>Truthful states</span>
        </div>
        <div style={styles.stateGrid}>
          {statusPanels.map((panel) => (
            <article key={panel.title} style={styles.stateCard}>
              <h3 style={styles.h3}>{panel.title}</h3>
              <p style={styles.cardText}>{panel.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.workspace} aria-label="AI and security boundaries">
        <article aria-labelledby="ai-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="ai-title" style={styles.h2}>
              Page-Level AI Boundary
            </h2>
            <span style={styles.statusBadge}>Visibility only</span>
          </div>
          <div style={styles.aiColumns}>
            <BoundaryList title="AI may" items={aiAllowed} tone="allow" />
            <BoundaryList title="AI must never" items={aiProhibited} tone="block" />
          </div>
        </article>

        <article aria-labelledby="privacy-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="privacy-title" style={styles.h2}>
              Security and Privacy Posture
            </h2>
            <span style={styles.statusBadge}>Masked references</span>
          </div>
          <p style={styles.cardText}>
            AI governance visibility preserves policy version, evidence references, guardrail
            status, simulation mode, confidence guidance, usage summaries, AI audit summary, actor,
            role, timestamp, and handoff reference where available.
          </p>
          <p style={styles.privacyText}>
            Never expose prompts containing sensitive information, model secrets, API keys, tokens,
            internal security material, hidden system prompts, protected personal information,
            unrestricted evidence, or confidential source workflow records.
          </p>
        </article>
      </section>
    </main>
  );
}

function BoundaryList({
  items,
  title,
  tone
}: {
  items: readonly string[];
  title: string;
  tone: "allow" | "block";
}) {
  return (
    <div style={tone === "allow" ? styles.allowBox : styles.blockBox}>
      <h3 style={styles.h3}>{title}</h3>
      <ul style={styles.listStack}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    background: "#000000",
    color: "#ece3d1",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh",
    padding: 24
  },
  header: {
    alignItems: "stretch",
    background: "#171511",
    borderRadius: 8,
    color: "white",
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 360px)",
    padding: 28
  },
  eyebrow: {
    color: "#fff8d8",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  eyebrowDark: {
    color: "#f4efe4",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    margin: 0,
    textTransform: "uppercase"
  },
  title: {
    fontSize: "clamp(34px, 5vw, 54px)",
    lineHeight: 1.02,
    margin: "8px 0"
  },
  lede: {
    color: "#faf6ec",
    fontSize: 16,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 860
  },
  contextPanel: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.24)",
    borderRadius: 8,
    display: "grid",
    gap: 8,
    padding: 16
  },
  boundaryStrip: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    display: "grid",
    gap: 16,
    marginTop: 18,
    padding: 18
  },
  sectionTitle: {
    color: "#f4efe4",
    fontSize: 24,
    lineHeight: 1.18,
    margin: "6px 0 0"
  },
  boundaryGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))"
  },
  boundaryChip: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    fontSize: 13,
    fontWeight: 800,
    minHeight: 44,
    padding: "12px 14px"
  },
  panel: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    marginTop: 18,
    padding: 18
  },
  panelHeader: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14
  },
  h2: {
    color: "#f4efe4",
    fontSize: 21,
    margin: 0
  },
  h3: {
    color: "#f4efe4",
    fontSize: 17,
    margin: 0
  },
  statusBadge: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px"
  },
  warningBadge: {
    background: "#0c0c0c",
    border: "1px solid #e8d782",
    borderRadius: 8,
    color: "#8a5600",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px"
  },
  lifecycleBadge: {
    background: "#f0fff8",
    border: "1px solid #9fd8bc",
    borderRadius: 8,
    color: "#1f6f55",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px"
  },
  filterGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))"
  },
  fieldLabel: {
    color: "#f4efe4",
    display: "grid",
    fontSize: 13,
    fontWeight: 900,
    gap: 6
  },
  input: {
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    font: "inherit",
    minHeight: 44,
    padding: "0 12px"
  },
  textarea: {
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    font: "inherit",
    padding: 12,
    resize: "vertical"
  },
  helpText: {
    color: "#f4efe4",
    fontSize: 13,
    lineHeight: 1.55,
    margin: "12px 0 0"
  },
  workspace: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))"
  },
  list: {
    display: "grid",
    gap: 12
  },
  aiCard: {
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    display: "grid",
    gap: 10,
    padding: 14
  },
  cardStatuses: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  muted: {
    color: "#f4efe4",
    fontSize: 13,
    margin: "4px 0"
  },
  cardText: {
    color: "#f4efe4",
    fontSize: 14,
    lineHeight: 1.55,
    margin: 0
  },
  privacyText: {
    color: "#f4efe4",
    fontSize: 13,
    lineHeight: 1.55,
    margin: 0
  },
  summaryList: {
    display: "grid",
    gap: 10,
    margin: 0
  },
  summaryRow: {
    borderTop: "1px solid rgba(201, 162, 75, 0.16)",
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(120px, 0.4fr) minmax(0, 1fr)",
    paddingTop: 10
  },
  actionGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    marginBottom: 14
  },
  actionButton: {
    background: "#171511",
    border: 0,
    borderRadius: 8,
    color: "white",
    cursor: "default",
    font: "inherit",
    fontWeight: 900,
    minHeight: 46,
    padding: "10px 12px",
    textAlign: "left"
  },
  stateGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  stateCard: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    display: "grid",
    gap: 8,
    padding: 14
  },
  aiColumns: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  },
  allowBox: {
    background: "#f0fff8",
    border: "1px solid #9fd8bc",
    borderRadius: 8,
    padding: 14
  },
  blockBox: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    padding: 14
  },
  listStack: {
    color: "#f4efe4",
    display: "grid",
    fontSize: 14,
    gap: 8,
    lineHeight: 1.45,
    margin: "10px 0 0",
    paddingLeft: 18
  }
};
