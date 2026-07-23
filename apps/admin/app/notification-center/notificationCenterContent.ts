export const page074BoundaryStatements = [
  "Notification != State change",
  "Delivery failed != Workflow failed",
  "Template approved != Legal approval",
  "Preference visible != Consent override",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const notificationFilters = [
  "Search",
  "Category",
  "Delivery status",
  "Read status",
  "Priority",
  "Source",
  "Freshness"
] as const;

export const notificationRecords = [
  {
    id: "NTF-2041",
    title: "Booking confirmed transactional notice",
    category: "Transactional notification",
    source: "Booking workflow reference",
    priority: "Standard priority",
    deliveryStatus: "Delivered",
    readStatus: "Unread",
    timestamp: "Locale-aware timestamp reference",
    expiry: "Expiry summary active",
    archiveStatus: "Not archived",
    retention: "Retention active",
    auditReference: "Delivery audit reference",
    freshness: "Current",
    boundary: "Delivered != Read",
    privacy:
      "Recipient and payload references masked; no secrets, tokens, or protected personal information shown"
  },
  {
    id: "NTF-2198",
    title: "Payment proof received notice",
    category: "Financial workflow notification",
    source: "Payment proof workflow reference",
    priority: "Important priority",
    deliveryStatus: "Delivery failed",
    readStatus: "Unread",
    timestamp: "Locale-aware timestamp partial",
    expiry: "Expiry summary pending",
    archiveStatus: "Not archived",
    retention: "Retention summary visible",
    auditReference: "Delivery failure audit reference",
    freshness: "Partial",
    boundary: "Delivery failed != Workflow failed",
    privacy:
      "Financial payload details, internal delivery metadata, and confidential messages hidden"
  },
  {
    id: "NTF-2315",
    title: "Template governance reference",
    category: "Template governance",
    source: "Template policy reference",
    priority: "Governance priority",
    deliveryStatus: "Unavailable",
    readStatus: "Read",
    timestamp: "Timestamp stale",
    expiry: "Expired",
    archiveStatus: "Archived",
    retention: "Retention limited",
    auditReference: "Notification audit unavailable",
    freshness: "Stale",
    boundary: "Template approved != Legal approval",
    privacy:
      "Hidden payloads, security events, provider metadata, and restricted system messages hidden"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source boundary",
    value: "Notification events, templates, delivery status, and preference references"
  },
  {
    label: "Human authority",
    value:
      "Protected notification views and exports require explicit permission, reason capture, and owner-workflow handoff"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to notification event, template governance, preference reference, delivery audit, or support owner workflow without sending or retrying"
  },
  {
    label: "Notification scope",
    value:
      "Event catalogue, transactional visibility, template governance, delivery status, retry status, failure handling, preference references, and notification audit history"
  }
] as const;

export const protectedActions = [
  "Open notification source reference",
  "Request template governance review",
  "Open delivery audit reference",
  "Request governed export",
  "Add human-reviewed notification note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show notification placeholders only. Do not guess delivery, read, expiry, archive, retention, or audit details."
  },
  {
    title: "Empty state",
    text: "No notification records found in the authorized scope. Hidden notifications are never hinted."
  },
  {
    title: "Stale data",
    text: "This notification summary may be outdated. Open the notification source before relying on it."
  },
  {
    title: "Partial data",
    text: "Some delivery, read, source, template, preference, retention, or audit references are unavailable."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this notification detail. Request access through the approved path."
  },
  {
    title: "Restricted state",
    text: "Sensitive notification content is hidden by policy, role, or scope."
  },
  {
    title: "Unavailable state",
    text: "A notification source is unavailable. The page must not infer workflow or delivery state."
  },
  {
    title: "Delivery failed",
    text: "Delivery failure is informational only. It must not mark the authoritative workflow as failed."
  },
  {
    title: "Expired state",
    text: "The notification is expired. Expiry does not delete history or change workflow state."
  },
  {
    title: "Archived state",
    text: "The notification is archived for visibility. Archive status is not deletion authority."
  }
] as const;

export const aiAllowed = [
  "Summarize visible notifications",
  "Explain notification categories",
  "Identify missing information",
  "Draft human-reviewed notification summaries",
  "Suggest navigation to owner workflows"
] as const;

export const aiProhibited = [
  "Send notifications",
  "Retry delivery",
  "Acknowledge notifications",
  "Change notification state",
  "Modify workflow",
  "Expose restricted information",
  "Trigger emails",
  "Trigger SMS",
  "Trigger push notifications",
  "Edit notification history"
] as const;
