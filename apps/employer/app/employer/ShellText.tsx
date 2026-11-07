"use client";

import { useT } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";

// Lets the server-rendered page frame show text in the employer's chosen language.
export function ShellText({ k }: Readonly<{ k: MessageKey }>) {
  return <>{useT()(k)}</>;
}
