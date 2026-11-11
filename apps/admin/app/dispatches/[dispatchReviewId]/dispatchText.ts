import type { PageText } from "../../i18n/pageTextCore";

// Staff copy for the dispatch page's offer area, in English, French (Québec) and Arabic.
// On the live site an offer sent from here never becomes an assignment: the assignment handoff
// (ASSIGNMENT_HANDOFF_ENABLED) is off and is not allowed in production. The only way a worker gets
// the shift is to take it from the job board, so staff are told that in plain words.

type DispatchCopy = Readonly<{
  boardOnlyTitle: string;
  boardOnlyBody: string;
  createOfferNote: string;
}>;

const en: DispatchCopy = {
  boardOnlyTitle: "Workers take the shift from the job board",
  boardOnlyBody:
    "On the live site, sending an offer does not give the worker the shift, and no assignment is created. The worker must take the shift from the job board: Find work → open the job → Accept. Tell interested workers the job is open there.",
  createOfferNote: "The worker still has to take the shift on the job board."
};

const fr: DispatchCopy = {
  boardOnlyTitle: "Les travailleurs prennent le quart sur le babillard d’emplois",
  boardOnlyBody:
    "Sur le site en ligne, envoyer une offre ne donne pas le quart au travailleur, et aucune affectation n’est créée. Le travailleur doit prendre le quart sur le babillard d’emplois : Trouver du travail → ouvrir l’emploi → Accepter. Dites aux travailleurs intéressés que l’emploi y est ouvert.",
  createOfferNote: "Le travailleur doit quand même prendre le quart sur le babillard d’emplois."
};

const ar: DispatchCopy = {
  boardOnlyTitle: "يأخذ العمال المناوبة من لوحة الوظائف",
  boardOnlyBody:
    "على الموقع الفعلي، إرسال عرض لا يعطي العامل المناوبة، ولا يُنشأ أي تعيين. يجب أن يأخذ العامل المناوبة بنفسه من لوحة الوظائف: ابحث عن عمل ← افتح الوظيفة ← قبول. أخبر العمال المهتمين أن الوظيفة مفتوحة هناك.",
  createOfferNote: "ما زال على العامل أن يأخذ المناوبة من لوحة الوظائف."
};

export type { DispatchCopy };
export const dispatchText: PageText<DispatchCopy> = { en, fr, ar };
