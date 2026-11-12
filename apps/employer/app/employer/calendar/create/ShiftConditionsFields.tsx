"use client";

import { dressCodeLabel } from "@rwos/shared";
import { styles } from "../../employerStyles";
import type { Translate } from "../../../i18n/LocaleProvider";
import type { Lang } from "../../../i18n/localText";
import { DRESS_CODE_PRESETS, SHIFT_CONDITION_LIMITS, type ConditionsForm } from "./shiftConditionsForm";

// "Before the worker goes": optional break, dress code, equipment, arrival instructions and notes for
// workers. Shown on the new-request, edit-draft and duplicate forms.
export function ShiftConditionsFields({
  value,
  onChange,
  disabled,
  lang,
  t
}: {
  value: ConditionsForm;
  onChange: (next: ConditionsForm) => void;
  disabled: boolean;
  lang: Lang;
  t: Translate;
}) {
  const set = <K extends keyof ConditionsForm>(key: K, v: ConditionsForm[K]) => onChange({ ...value, [key]: v });
  return (
    <section style={{ marginTop: 24 }} aria-labelledby="shift-conditions-title" data-testid="shift-conditions-fields">
      <p id="shift-conditions-title" style={styles.metaLabel}>{t("create.conditionsTitle")}</p>
      <p style={styles.cardText}>{t("create.conditionsNote")}</p>
      <div style={{ ...styles.formGrid, gap: 18, marginTop: 12 }}>
        <label style={styles.fieldLabel}>
          {t("create.breakLabel")}
          <select disabled={disabled} style={styles.input} value={value.breakChoice} onChange={(e) => set("breakChoice", e.target.value as ConditionsForm["breakChoice"])}>
            <option value="unset">{t("create.breakNotSaid")}</option>
            <option value="none">{t("create.breakNone")}</option>
            <option value="minutes">{t("create.breakSome")}</option>
          </select>
          {value.breakChoice === "minutes" ? (
            <input
              aria-label={t("create.breakMinutesLabel")}
              disabled={disabled}
              inputMode="numeric"
              max={SHIFT_CONDITION_LIMITS.breakMinutesMax}
              min={1}
              onChange={(e) => set("breakMinutes", e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              style={styles.input}
              type="number"
              value={value.breakMinutes}
            />
          ) : null}
          <span style={styles.cardText}>{t("create.breakInfoNote")}</span>
        </label>
        <label style={styles.fieldLabel}>
          {t("create.dressCode")}
          <select disabled={disabled} style={styles.input} value={value.dressChoice} onChange={(e) => set("dressChoice", e.target.value as ConditionsForm["dressChoice"])}>
            <option value="">{t("create.dressNone")}</option>
            {DRESS_CODE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>{dressCodeLabel(preset, lang)}</option>
            ))}
            <option value="other">{t("create.dressOther")}</option>
          </select>
          {value.dressChoice === "other" ? (
            <input
              aria-label={t("create.dressOtherLabel")}
              disabled={disabled}
              maxLength={SHIFT_CONDITION_LIMITS.dressCode}
              onChange={(e) => set("dressOther", e.target.value)}
              style={styles.input}
              value={value.dressOther}
            />
          ) : null}
        </label>
        <label style={styles.fieldLabel}>
          {t("create.equipment")}
          <input disabled={disabled} maxLength={SHIFT_CONDITION_LIMITS.equipmentToBring} onChange={(e) => set("equipmentToBring", e.target.value)} style={styles.input} value={value.equipmentToBring} />
        </label>
        <label style={styles.fieldLabel}>
          {t("create.arrival")}
          <textarea disabled={disabled} maxLength={SHIFT_CONDITION_LIMITS.arrivalInstructions} onChange={(e) => set("arrivalInstructions", e.target.value)} rows={3} style={styles.input} value={value.arrivalInstructions} />
          <span style={styles.cardText}>{t("create.arrivalNote")}</span>
        </label>
        <label style={styles.fieldLabel}>
          {t("create.workerNotes")}
          <textarea disabled={disabled} maxLength={SHIFT_CONDITION_LIMITS.workerNotes} onChange={(e) => set("workerNotes", e.target.value)} rows={3} style={styles.input} value={value.workerNotes} />
        </label>
      </div>
    </section>
  );
}
