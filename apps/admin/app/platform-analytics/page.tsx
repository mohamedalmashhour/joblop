import type { CSSProperties } from "react";
import {
  aiAllowed,
  aiProhibited,
  analyticsFilters,
  analyticsRecords,
  governanceDetails,
  page075BoundaryStatements,
  protectedActions,
  statusPanels
} from "./platformAnalyticsContent";

export default function PlatformAnalyticsPage() {
  const selectedRecord = analyticsRecords[0];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Resident Workforce OS / Administration</p>
          <h1 style={styles.title}>Platform Analytics</h1>
          <p style={styles.lede}>
            Governed platform analytics visibility for authorized administrators, finance users, and
            super administrators. This page displays KPI summaries, growth and risk analytics,
            data-quality notes, trend visibility, analytics export requests, metric definition
            review, and analytics audit history without editing source records, executing
            operations, making financial approvals, ranking workers, or treating forecasts as
            authoritative facts.
          </p>
        </div>
        <aside aria-label="Current platform analytics context" style={styles.contextPanel}>
          <strong>Role: authorized analytics scope</strong>
          <span>Scope: organization / residence / department</span>
          <span>Freshness: current / partial / stale / restricted</span>
        </aside>
      </header>

      <section aria-labelledby="boundary-title" style={styles.boundaryStrip}>
        <div>
          <p style={styles.eyebrowDark}>Frozen boundaries</p>
          <h2 id="boundary-title" style={styles.sectionTitle}>
            Analytics visibility is not authority to modify records, execute workflows, approve
            finance, calculate payroll, assign workers, trigger notifications, or make individual
            performance findings.
          </h2>
        </div>
        <div style={styles.boundaryGrid}>
          {page075BoundaryStatements.map((statement) => (
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
          <span style={styles.statusBadge}>Scoped aggregate search</span>
        </div>
        <div style={styles.filterGrid}>
          {analyticsFilters.map((filter) => (
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
          Filters never reveal restricted analytics or allow inference of hidden users, workers,
          employers, financial records, compliance details, investigations, raw operational records,
          protected classes, fraud indicators, or source workflow state.
        </p>
      </section>

      <section style={styles.workspace} aria-label="Platform analytics workspace">
        <article aria-labelledby="analytics-list-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="analytics-list-title" style={styles.h2}>
              Governed Analytics Summaries
            </h2>
            <span style={styles.statusBadge}>Development fixture</span>
          </div>
          <div style={styles.list}>
            {analyticsRecords.map((record) => (
              <article key={record.id} style={styles.analyticsCard}>
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

        <article aria-labelledby="selected-analytics-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="selected-analytics-title" style={styles.h2}>
              Selected Analytics Summary
            </h2>
            <span style={styles.statusBadge}>Aggregate only</span>
          </div>
          <dl style={styles.summaryList}>
            <div style={styles.summaryRow}>
              <dt>Metric definition</dt>
              <dd>{selectedRecord.metricDefinition}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>KPI summary</dt>
              <dd>{selectedRecord.kpiSummary}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Trend summary</dt>
              <dd>{selectedRecord.trendSummary}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Utilization</dt>
              <dd>{selectedRecord.utilizationSummary}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Staffing trend</dt>
              <dd>{selectedRecord.staffingTrend}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Forecast reference</dt>
              <dd>{selectedRecord.forecastReference}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>AI insight</dt>
              <dd>{selectedRecord.aiInsight}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Comparison period</dt>
              <dd>{selectedRecord.comparisonPeriod}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Generated</dt>
              <dd>{selectedRecord.generatedAt}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Data quality</dt>
              <dd>{selectedRecord.dataQuality}</dd>
            </div>
          </dl>
          <p style={styles.helpText}>
            Chart alternative: this summary describes aggregate KPI, trend, utilization, comparison,
            freshness, and data-quality status in text. It does not expose raw records or individual
            findings.
          </p>
        </article>
      </section>

      <section style={styles.workspace} aria-label="Governance details and handoffs">
        <article aria-labelledby="governance-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="governance-title" style={styles.h2}>
              Governance Detail
            </h2>
            <span style={styles.statusBadge}>Read-only analytics</span>
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
              <button key={action} type="button" style={styles.actionButton}>
                {action}
              </button>
            ))}
          </div>
          <label style={styles.fieldLabel}>
            Protected action reason
            <textarea
              placeholder="Reason captured before protected analytics handoff"
              readOnly
              rows={4}
              style={styles.textarea}
            />
          </label>
          <p style={styles.helpText}>
            Action controls are UI placeholders. They do not edit source records, run workflows,
            approve finance, calculate payroll, assign workers, generate reports automatically,
            trigger notifications, change AI policy, or change operational state.
          </p>
        </article>
      </section>

      <section aria-labelledby="states-title" style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 id="states-title" style={styles.h2}>
            Loading, Empty, Stale, Partial, Unavailable, Restricted, Comparison, and Data States
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

      <section style={styles.workspace} aria-label="AI and privacy boundaries">
        <article aria-labelledby="ai-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="ai-title" style={styles.h2}>
              AI Boundary
            </h2>
            <span style={styles.statusBadge}>Advisor only</span>
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
            <span style={styles.statusBadge}>Aggregated data only</span>
          </div>
          <p style={styles.cardText}>
            Platform analytics visibility preserves metric definitions, KPI snapshots, report-run
            references, data-quality notes, comparison periods, freshness indicators, generated
            timestamps, export request references, and analytics audit history where available.
          </p>
          <p style={styles.privacyText}>
            Never expose protected personal information, banking, tax, health, credential data,
            secrets, investigations, internal fraud indicators, protected-class analysis, individual
            rankings, or raw operational records.
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
    background: "#eef3f8",
    color: "#0b1f3a",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh",
    padding: 24
  },
  header: {
    alignItems: "stretch",
    background: "#071f4d",
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
    color: "#123b78",
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
    color: "#dce8e8",
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
    background: "#ffffff",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    display: "grid",
    gap: 16,
    marginTop: 18,
    padding: 18
  },
  sectionTitle: {
    color: "#071f4d",
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
    background: "#f7faf9",
    border: "1px solid #dce8e8",
    borderRadius: 8,
    color: "#071f4d",
    fontSize: 13,
    fontWeight: 800,
    minHeight: 44,
    padding: "12px 14px"
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #dce8e8",
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
    color: "#071f4d",
    fontSize: 21,
    margin: 0
  },
  h3: {
    color: "#071f4d",
    fontSize: 17,
    margin: 0
  },
  statusBadge: {
    background: "#eef4ff",
    border: "1px solid #bfd0f5",
    borderRadius: 8,
    color: "#071f4d",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px"
  },
  warningBadge: {
    background: "#fff8d8",
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
    color: "#0b1f3a",
    display: "grid",
    fontSize: 13,
    fontWeight: 900,
    gap: 6
  },
  input: {
    border: "1px solid #bccdce",
    borderRadius: 8,
    color: "#0b1f3a",
    font: "inherit",
    minHeight: 44,
    padding: "0 12px"
  },
  textarea: {
    border: "1px solid #bccdce",
    borderRadius: 8,
    color: "#0b1f3a",
    font: "inherit",
    padding: 12,
    resize: "vertical"
  },
  helpText: {
    color: "#607276",
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
  analyticsCard: {
    border: "1px solid #dce8e8",
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
    color: "#607276",
    fontSize: 13,
    margin: "4px 0"
  },
  cardText: {
    color: "#0b1f3a",
    fontSize: 14,
    lineHeight: 1.55,
    margin: 0
  },
  privacyText: {
    color: "#607276",
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
    borderTop: "1px solid #e7eeee",
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
    background: "#071f4d",
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
    background: "#f7faf9",
    border: "1px solid #dce8e8",
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
    background: "#fff8f3",
    border: "1px solid #f0c2ad",
    borderRadius: 8,
    padding: 14
  },
  listStack: {
    color: "#0b1f3a",
    display: "grid",
    fontSize: 14,
    gap: 8,
    lineHeight: 1.45,
    margin: "10px 0 0",
    paddingLeft: 18
  }
};
