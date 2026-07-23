import type { CSSProperties } from "react";
import {
  aiAllowed,
  aiProhibited,
  governanceDetails,
  page071BoundaryStatements,
  protectedActions,
  settingFilters,
  settingRecords,
  statusPanels
} from "./systemSettingsContent";

export default function SystemSettingsPage() {
  const selectedSetting = settingRecords[0];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Resident Workforce OS / Administration</p>
          <h1 style={styles.title}>System Settings</h1>
          <p style={styles.lede}>
            Governed system-level configuration visibility for authorized super administrators. This
            page displays configuration categories, policy settings, feature flags, security setting
            references, notification policy settings, localization settings, approval requirements,
            and configuration audit history without changing runtime configuration, exposing
            secrets, managing infrastructure, executing workflows, or modifying source code.
          </p>
        </div>
        <aside aria-label="Current system settings context" style={styles.contextPanel}>
          <strong>Role: authorized super administrator scope</strong>
          <span>Scope: organization / residence / department</span>
          <span>Freshness: current / partial / stale / restricted</span>
        </aside>
      </header>

      <section aria-labelledby="boundary-title" style={styles.boundaryStrip}>
        <div>
          <p style={styles.eyebrowDark}>Frozen boundaries</p>
          <h2 id="boundary-title" style={styles.sectionTitle}>
            System settings visibility is not authority to activate settings, reveal secrets, run
            migrations, deploy code, execute workflows, or self-permission AI.
          </h2>
        </div>
        <div style={styles.boundaryGrid}>
          {page071BoundaryStatements.map((statement) => (
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
          {settingFilters.map((filter) => (
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
          Filters never reveal restricted settings or allow inference of hidden users, workers,
          employers, financial records, compliance details, investigations, runtime secrets, source
          code changes, database state, or payment processor configuration.
        </p>
      </section>

      <section style={styles.workspace} aria-label="System settings workspace">
        <article aria-labelledby="settings-list-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="settings-list-title" style={styles.h2}>
              Governed Settings List
            </h2>
            <span style={styles.statusBadge}>Development fixture</span>
          </div>
          <div style={styles.list}>
            {settingRecords.map((record) => (
              <article key={record.id} style={styles.settingCard}>
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
                <p style={styles.cardText}>{record.settingState}</p>
                <p style={styles.privacyText}>{record.privacy}</p>
              </article>
            ))}
          </div>
        </article>

        <article aria-labelledby="selected-setting-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="selected-setting-title" style={styles.h2}>
              Selected Setting Summary
            </h2>
            <span style={styles.statusBadge}>Summary only</span>
          </div>
          <dl style={styles.summaryList}>
            <div style={styles.summaryRow}>
              <dt>Status</dt>
              <dd>{selectedSetting.lifecycle}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Setting state</dt>
              <dd>{selectedSetting.settingState}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Proposal</dt>
              <dd>{selectedSetting.proposalState}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Approval</dt>
              <dd>{selectedSetting.approvalRequirement}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Feature flag</dt>
              <dd>{selectedSetting.featureFlag}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Security reference</dt>
              <dd>{selectedSetting.securityReference}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Localization</dt>
              <dd>{selectedSetting.localization}</dd>
            </div>
            <div style={styles.summaryRow}>
              <dt>Audit</dt>
              <dd>{selectedSetting.audit}</dd>
            </div>
          </dl>
          <p style={styles.helpText}>
            Setting summaries are not active configuration changes, legal policy, feature approval,
            permission grants, runtime secrets, infrastructure management, database migrations,
            source code changes, or workflow execution.
          </p>
        </article>
      </section>

      <section style={styles.workspace} aria-label="Governance details and handoffs">
        <article aria-labelledby="governance-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="governance-title" style={styles.h2}>
              Governance Detail
            </h2>
            <span style={styles.statusBadge}>Auditable</span>
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
              placeholder="Reason captured before protected settings handoff"
              readOnly
              rows={4}
              style={styles.textarea}
            />
          </label>
          <p style={styles.helpText}>
            Action controls are UI placeholders. They do not activate settings, modify
            configuration, grant permissions, expose secrets, change source code, run migrations,
            execute workflows, configure payment processors, deploy infrastructure, or write
            authoritative state.
          </p>
        </article>
      </section>

      <section aria-labelledby="states-title" style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 id="states-title" style={styles.h2}>
            Loading, Empty, Error, Stale, Handoff, Export, Audit, and Restricted States
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

        <article aria-labelledby="audit-title" style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 id="audit-title" style={styles.h2}>
              Audit and Privacy Posture
            </h2>
            <span style={styles.statusBadge}>Least privilege</span>
          </div>
          <p style={styles.cardText}>
            Conceptually preserve page opened, setting record viewed, filter applied, sensitive
            detail opened, action proposed, action confirmed, action denied, export requested,
            workflow handoff, error, and stale-data warning with actor, role, timestamp, scope,
            reason, policy version, and handoff reference where relevant.
          </p>
          <p style={styles.privacyText}>
            Never expose passwords, secrets, tokens, recovery codes, banking data, tax data, health
            data, runtime values, source code changes, database migration detail, payment processor
            secrets, or protected personal information.
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
  settingCard: {
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
    color: "#ffffff",
    fontWeight: 900,
    minHeight: 44,
    padding: "0 14px"
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
    minHeight: 126,
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
    background: "#fff4f4",
    border: "1px solid #e5a4a4",
    borderRadius: 8,
    padding: 14
  },
  listStack: {
    color: "#0b1f3a",
    display: "grid",
    gap: 8,
    margin: "12px 0 0",
    paddingLeft: 20
  }
};
