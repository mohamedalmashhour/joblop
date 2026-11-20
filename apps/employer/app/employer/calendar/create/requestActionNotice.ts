import type { Translate } from "../../../i18n/LocaleProvider";

// The text shown right beside the form's action buttons. The form is long, so the status line at the
// top is out of sight by the time the employer presses a button: without this, a disabled button gives
// no reason and a successful submit looks like nothing happened.
export function requestActionNotice(input: {
  editing: boolean;
  message: string;
  rateUnpriced: boolean;
  missingFields: string[];
  t: Translate;
}): string {
  if (input.editing && input.rateUnpriced) return input.t("create.gateUnpriced");
  if (input.editing && input.missingFields.length > 0) {
    return input.t("create.msgCompleteList", { fields: input.missingFields.join(", ") });
  }
  return input.message;
}
