"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminDispatchReview } from "../api/dispatches/dispatchBoundary";

type DispatchState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; dispatch: AdminDispatchReview | null }>
  | Readonly<{ status: "denied" | "unavailable" | "error" }>;

export function DispatchHandoffPanel({ jobRequestId }: Readonly<{ jobRequestId: string }>) {
  const [state, setState] = useState<DispatchState>({ status: "loading" });
  const [priority, setPriority] = useState<AdminDispatchReview["priority"]>("normal");
  const [confirming, setConfirming] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const createGuard = useRef(false);
  const createTrigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogWasOpen = useRef(false);

  const load = useCallback(async () => {
    const current = ++generation.current;
    setState({ status: "loading" });
    try {
      const response = await fetch(
        `/api/dispatches?jobRequestId=${encodeURIComponent(jobRequestId)}`,
        { cache: "no-store" }
      );
      if (current !== generation.current) return;
      if (!response.ok) {
        setState({
          status:
            response.status === 401 ? "denied" : response.status === 503 ? "unavailable" : "error"
        });
        return;
      }
      const payload = (await response.json()) as { dispatches?: AdminDispatchReview[] };
      setState({
        status: "ready",
        dispatch: Array.isArray(payload.dispatches) ? (payload.dispatches[0] ?? null) : null
      });
    } catch {
      if (current === generation.current) setState({ status: "unavailable" });
    }
  }, [jobRequestId]);

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (confirming) {
      dialogWasOpen.current = true;
      if (!dialog.current?.open) dialog.current?.showModal();
      return;
    }
    if (dialog.current?.open) dialog.current.close();
    if (dialogWasOpen.current) {
      dialogWasOpen.current = false;
      createTrigger.current?.focus();
    }
  }, [confirming]);

  async function createDispatch() {
    if (createGuard.current) return;
    createGuard.current = true;
    setCreating(true);
    setMessage("Creating the persisted dispatch review.");
    try {
      const response = await fetch("/api/dispatches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobRequestId, priority })
      });
      if (!response.ok) {
        setConfirming(false);
        if (response.status === 401) {
          setMessage("Administrator authorization is required.");
          return;
        }
        setMessage(
          response.status === 409
            ? "A dispatch review changed or may already exist. Checking the current record."
            : "Creation did not return a confirmed result. Checking for an existing review."
        );
        await load();
        return;
      }
      const payload = (await response.json()) as { dispatchReview?: AdminDispatchReview };
      if (!payload.dispatchReview) throw new Error("RWOS_MISSING_DISPATCH");
      setState({ status: "ready", dispatch: payload.dispatchReview });
      setConfirming(false);
      setMessage("Dispatch review created. No worker has been contacted or assigned.");
    } catch {
      setConfirming(false);
      setMessage("The create result is unknown. Checking for an existing review before retry.");
      await load();
    } finally {
      createGuard.current = false;
      setCreating(false);
    }
  }

  if (state.status === "loading") {
    return <p aria-live="polite">Checking for an existing persisted dispatch review…</p>;
  }
  if (state.status !== "ready") {
    return (
      <>
        <p role={state.status === "denied" ? "alert" : "status"}>
          {state.status === "denied"
            ? "Administrator authorization is required to access dispatch."
            : "Dispatch review is unavailable. No fixture record is substituted."}
        </p>
        <button onClick={() => void load()} style={button.secondary} type="button">
          Retry dispatch check
        </button>
      </>
    );
  }
  if (state.dispatch) {
    return (
      <>
        <p aria-live="polite" role="status">
          {message || "Dispatch review already exists."}
        </p>
        <p>
          State: <strong>{state.dispatch.state.replaceAll("_", " ")}</strong> · Priority:{" "}
          <strong>{state.dispatch.priority}</strong> · Required:{" "}
          <strong>{state.dispatch.requiredWorkerCount}</strong> · Still requested:{" "}
          <strong>{state.dispatch.remainingWorkerCount}</strong>
        </p>
        <a href={dispatchHref(state.dispatch.id)} style={button.link}>
          Open dispatch review
        </a>
      </>
    );
  }

  return (
    <>
      <p aria-live="polite">
        {message ||
          "No dispatch review exists. Creating one opens an operational review only; it does not contact or assign workers."}
      </p>
      <label style={button.label}>
        Dispatch priority
        <select
          disabled={creating || confirming}
          onChange={(event) => setPriority(event.target.value as AdminDispatchReview["priority"])}
          style={button.select}
          value={priority}
        >
          <option value="normal">Normal</option>
          <option value="urgent">Urgent</option>
          <option value="emergency">Emergency</option>
        </select>
      </label>
      <button
        disabled={creating || confirming}
        onClick={() => setConfirming(true)}
        ref={createTrigger}
        style={button.primary}
        type="button"
      >
        Create dispatch review
      </button>
      {confirming ? (
        <dialog
          aria-describedby="confirm-dispatch-copy"
          aria-labelledby="confirm-dispatch"
          onCancel={() => setConfirming(false)}
          ref={dialog}
          style={button.confirmation}
        >
          <h3 id="confirm-dispatch">Confirm dispatch handoff</h3>
          <p id="confirm-dispatch-copy">
            Create one {priority} dispatch review for this approved request. This does not contact,
            shortlist, offer work to, or assign any worker.
          </p>
          <div style={button.actions}>
            <button
              autoFocus
              disabled={creating}
              onClick={() => setConfirming(false)}
              style={button.secondary}
              type="button"
            >
              Cancel
            </button>
            <button
              disabled={creating}
              onClick={() => void createDispatch()}
              style={button.primary}
              type="button"
            >
              {creating ? "Creating…" : "Confirm creation"}
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  );
}

function dispatchHref(dispatchReviewId: string) {
  return "/dispatches/" + encodeURIComponent(dispatchReviewId);
}

const button = {
  actions: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  confirmation: {
    background: "#0c0c0c",
    border: "1px solid #e8d782",
    borderRadius: 12,
    marginTop: 18,
    padding: 18
  },
  label: { display: "grid", fontWeight: 800, gap: 8, margin: "16px 0", maxWidth: 260 },
  select: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, font: "inherit", padding: 12 },
  primary: {
    background: "#171511",
    border: 0,
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  secondary: {
    background: "#fff",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    color: "#000000",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  link: {
    alignItems: "center",
    background: "#171511",
    borderRadius: 8,
    color: "#fff",
    display: "inline-flex",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px",
    textDecoration: "none"
  }
} as const;
