export const workerJourney = [
  "Create profile",
  "Add roles and credentials",
  "Set availability",
  "Review available shifts",
  "Apply or accept",
  "Work approved shift",
  "See earnings records"
] as const;

export const employerJourney = [
  "Request staff",
  "Share shift requirements",
  "Receive AI-assisted suggestions",
  "Human review and confirmation",
  "Track shift and attendance",
  "Approve timesheet",
  "Receive billing records"
] as const;

export const lifecyclePhases = [
  {
    title: "Before the shift",
    statuses: ["Pending", "Review required", "Approved"],
    responsibilities: {
      Employer: [
        "Create or request a shift.",
        "Define role, time, location, requirements, and urgency.",
        "Review AI-assisted matches.",
        "Confirm the selected worker."
      ],
      Worker: [
        "Complete and maintain the verified profile.",
        "Set availability.",
        "Review the shift details.",
        "Accept or apply for the shift.",
        "Confirm readiness."
      ],
      Platform: [
        "Check eligibility and required credentials.",
        "Detect scheduling conflicts.",
        "Provide matching recommendations.",
        "Send confirmations and reminders."
      ]
    }
  },
  {
    title: "During the shift",
    statuses: ["In progress", "Coverage risk", "Support needed"],
    responsibilities: {
      Employer: [
        "Confirm arrival where required.",
        "View attendance status.",
        "Communicate with the worker.",
        "Request support or replacement when necessary."
      ],
      Worker: [
        "Navigate to the workplace.",
        "Check in.",
        "Perform the assigned work.",
        "Communicate operational issues.",
        "Check out."
      ],
      Platform: [
        "Record attendance events.",
        "Support authorized location and time verification.",
        "Surface lateness, no-show, or coverage risks.",
        "Preserve an auditable activity record."
      ]
    }
  },
  {
    title: "After the shift",
    statuses: ["Completed", "Needs follow-up", "Dispute review"],
    responsibilities: {
      Employer: [
        "Review and approve the timesheet.",
        "Report discrepancies.",
        "Receive the invoice.",
        "Rate the completed assignment where permitted."
      ],
      Worker: [
        "Review submitted hours.",
        "Report corrections if needed.",
        "View earnings and payment status.",
        "Provide appropriate feedback."
      ],
      Platform: [
        "Finalize the timesheet workflow.",
        "Generate billing records.",
        "Calculate worker compensation according to approved rules.",
        "Maintain the audit trail.",
        "Surface unresolved disputes for human review."
      ]
    }
  }
] as const;

export const aiAssistance = [
  "AI helps organize information.",
  "AI can identify missing details.",
  "AI can suggest matches.",
  "AI cannot hire, assign, dispatch, approve timesheets, approve pay, discipline, or make compliance decisions by itself."
] as const;

export const trustLayer = [
  "Verified onboarding",
  "Credentials",
  "Attendance evidence",
  "Documents",
  "Communication records",
  "Auditability",
  "Privacy commitments"
] as const;

