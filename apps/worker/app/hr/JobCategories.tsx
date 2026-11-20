"use client";

import { useEffect, useState } from "react";
import { useT } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";

type Category = Readonly<{ key: string; label: string; selected: boolean }>;

const LABEL_KEY: Record<string, MessageKey> = {
  kitchen: "cat.kitchen",
  care_nursing: "cat.careNursing",
  housekeeping_support: "cat.housekeepingSupport",
  maintenance: "cat.maintenance",
  pharmacy: "cat.pharmacy",
  factory_production: "cat.factoryProduction",
  warehouse_logistics: "cat.warehouseLogistics",
  construction_trades: "cat.constructionTrades",
  retail_sales: "cat.retailSales",
  hospitality_events: "cat.hospitalityEvents",
  transport_delivery: "cat.transportDelivery",
  security: "cat.security",
  office_admin: "cat.officeAdmin",
  childcare_education: "cat.childcareEducation",
  farming_agriculture: "cat.farmingAgriculture"
};

// The worker taps the kinds of work they want. Each tap saves, so there is no form to submit.
export function JobCategories() {
  const t = useT();
  const [categories, setCategories] = useState<readonly Category[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/job-categories", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((p: { categories: Category[] }) => setCategories(p.categories))
      .catch(() => setFailed(true));
  }, []);

  const toggle = async (key: string) => {
    if (!categories) return;
    const previous = categories;
    const next = categories.map((c) => (c.key === key ? { ...c, selected: !c.selected } : c));
    setCategories(next);
    setFailed(false);
    const saved = await fetch("/api/job-categories", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keys: next.filter((c) => c.selected).map((c) => c.key) })
    }).then((r) => r.ok).catch(() => false);
    if (!saved) { setCategories(previous); setFailed(true); }
  };

  if (!categories && !failed) return null;

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="role">{t("cat.title")}</div>
      <p className="when">{t("cat.intro")}</p>
      {failed ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{t("cat.saveError")}</p> : null}
      <div className="chips">
        {(categories ?? []).map((c) => (
          <button key={c.key} type="button" className={c.selected ? "btn" : "btn ghost"} aria-pressed={c.selected} onClick={() => void toggle(c.key)}>
            {c.selected ? "✓ " : ""}{LABEL_KEY[c.key] ? t(LABEL_KEY[c.key]!) : c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
