"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "../i18n/LocaleProvider";

// The worker guide: "How Joblop works for you". Eight short steps (account → help), why Joblop,
// and an FAQ — phone-first, in the dark brand (black, cream, gold). Follows the site language
// (EN / FR-CA / AR with RTL from <html dir>). All art is inline SVG + CSS; motion is off for
// people who ask for less motion. Only facts that are true in the product today — no numbers,
// no testimonials, no payment dates.

type Lang = "en" | "fr" | "ar";
type StepId = "start" | "profile" | "cv" | "work" | "before" | "day" | "pay" | "help";
type BenefitIcon = "eye" | "shield" | "pin" | "grid" | "tag" | "phone" | "calendar" | "people";
type GuideLink = { href: string; label: string; primary?: boolean };
type Step = {
  id: StepId;
  nav: string;
  title: string;
  intro: string;
  points: string[];
  tip?: string;
  links: GuideLink[];
};
type Copy = {
  hero: { eyebrow: string; title: string; sub: string; search: string; create: string };
  navLabel: string;
  stepWord: string;
  tipLabel: string;
  cvWhere: { title: string; menu: string; item: string; text: string };
  steps: Step[];
  why: { title: string; sub: string; items: { icon: BenefitIcon; title: string; body: string }[] };
  faq: { title: string; items: [string, string][] };
  final: { title: string; sub: string; search: string; create: string; cv: string; calendar: string };
  arrow: string;
};

const COPY: Record<Lang, Copy> = {
  en: {
    hero: {
      eyebrow: "Guide for workers",
      title: "How Joblop works for you",
      sub: "Find paid shifts near you, see the pay before you say yes, and get help from real people. Here is everything, step by step.",
      search: "Search jobs",
      create: "Create free account"
    },
    navLabel: "Guide steps",
    stepWord: "Step",
    tipLabel: "Good to know",
    cvWhere: {
      title: "Where is it?",
      menu: "Menu",
      item: "Build CV",
      text: "Open the menu at the top of any page and tap **Build CV**. It is always there, even before you sign in."
    },
    steps: [
      {
        id: "start",
        nav: "Start",
        title: "Create your free account",
        intro: "Look around first: you can search jobs without an account. When you find something you like, create a free account to see the details and apply.",
        points: [
          "Give your name, your mobile number and your email.",
          "Sign in with your mobile number: we text you a 6-digit code. **No password** to remember.",
          "Free to join, free to use."
        ],
        links: [
          { href: "/#auth-card", label: "Create free account", primary: true },
          { href: "/", label: "Search jobs" }
        ]
      },
      {
        id: "profile",
        nav: "Profile",
        title: "Finish your profile and papers",
        intro: "Your profile tells employers who you are. Your papers show you are ready to work.",
        points: [
          "Complete your worker profile.",
          "Upload your documents in **Documents** and **Verification**.",
          "The Joblop team checks your papers.",
          "Verified workers get offered **more shifts**."
        ],
        links: [
          { href: "/onboarding", label: "Finish my profile", primary: true },
          { href: "/documents", label: "My documents" },
          { href: "/verification", label: "Verification" }
        ]
      },
      {
        id: "cv",
        nav: "CV",
        title: "Build a free CV in minutes",
        intro: "No CV, or an old one? Joblop helps you make a professional CV, step by step, for free.",
        points: [
          "Fill it in step by step. It only takes a few minutes.",
          "A professional CV helps employers **pick you**.",
          "**Worker Pro** (C$12.99 a month, 14-day free trial) adds the Pro CV and first pick of job offers. It is optional: the CV builder is free."
        ],
        links: [{ href: "/cv-builder", label: "Build my CV", primary: true }]
      },
      {
        id: "work",
        nav: "Find work",
        title: "Find work and accept shifts",
        intro: "Two places to find work: your Joblop calendar, and JobScanner for even more jobs.",
        points: [
          "**My calendar** shows every open Joblop job, day by day, with the pay per hour and how many places are left.",
          "**★** means a bonus job: it pays extra.",
          "Tap **Accept** to take a shift. The shift goes into your schedule and the employer is told.",
          "**JobScanner** shows more jobs from partner job boards across Québec. It pulls from licensed partners like Adzuna: partner feeds only, never scraping.",
          "Choose **“Email me new jobs”**: at most one email a day with new jobs that match you."
        ],
        tip: "Accepting is final. Only accept a shift you are sure you can do.",
        links: [
          { href: "/jobs-calendar", label: "Open my calendar", primary: true },
          { href: "/job-scanner", label: "Open JobScanner" }
        ]
      },
      {
        id: "before",
        nav: "Before",
        title: "Before the shift",
        intro: "You always know where you stand.",
        points: [
          "You get a **confirmation** by text and by email.",
          "You get a **reminder** the day before.",
          "If a shift is cancelled or changed, you get a text and an email **right away**, and it shows in **red** on your calendar."
        ],
        links: [{ href: "/jobs-calendar", label: "Open my calendar" }]
      },
      {
        id: "day",
        nav: "On the day",
        title: "On the day",
        intro: "Your phone is all you need.",
        points: [
          "**Clock in** when you start and **clock out** when you finish, on your phone.",
          "Your hours are recorded."
        ],
        links: []
      },
      {
        id: "pay",
        nav: "Pay",
        title: "Getting paid",
        intro: "No surprises: you know the pay before you say yes.",
        points: [
          "You see the **pay per hour before you accept**.",
          "Pay statements come by email and are in **My pay**.",
          "Bonuses appear as a **“Bonus”** line.",
          "If an employer cancels **less than 24 hours** before the start, Joblop **reviews your case with you**."
        ],
        links: [{ href: "/pay", label: "Open My pay", primary: true }]
      },
      {
        id: "help",
        nav: "Help",
        title: "Help when you need it",
        intro: "Questions, problems, or just want to talk to someone? Use Contact Joblop.",
        points: [
          "The Joblop assistant answers first.",
          "A Joblop team member takes over when needed: safety, disputes, your account, or simply **ask for a person**.",
          "Replies also come by email."
        ],
        tip: "Never share your bank number or your social insurance number in the chat.",
        links: [{ href: "/contact", label: "Contact Joblop", primary: true }]
      }
    ],
    why: {
      title: "Why workers use Joblop",
      sub: "Simple, honest and made for your phone.",
      items: [
        { icon: "eye", title: "See the pay first", body: "The pay per hour is shown before you accept." },
        { icon: "shield", title: "No fake jobs", body: "Real employers. Every request is reviewed by Joblop staff." },
        { icon: "pin", title: "Jobs near you", body: "Find shifts close to where you live." },
        { icon: "grid", title: "Every kind of work", body: "Cleaning, kitchen, warehouse, retail, events, driving, construction, care." },
        { icon: "tag", title: "Free to use", body: "Searching, applying and the CV builder cost nothing." },
        { icon: "phone", title: "Sign in with your phone", body: "A texted code. No password to forget." },
        { icon: "calendar", title: "One calendar", body: "Jobs, your shifts and changes, all in one place." },
        { icon: "people", title: "Real people", body: "A Joblop team member is behind the assistant." }
      ]
    },
    faq: {
      title: "Questions workers ask",
      items: [
        ["Does Joblop cost anything?", "No. Joblop is free for workers. Worker Pro is optional: C$12.99 a month after a 14-day free trial."],
        ["Do I need a password?", "No. You sign in with your mobile number and a 6-digit code we text you."],
        ["Can I look at jobs before I sign up?", "Yes. Search freely. Create a free account when you want to see the details and apply."],
        ["Where do I find the CV builder?", "Open the menu and tap “Build CV”. It is free and takes a few minutes."],
        ["What does the ★ mean?", "It is a bonus job: it pays extra. Bonuses show on your pay statement as a “Bonus” line."],
        ["What happens when I tap Accept?", "Accepting is final. The shift goes into your schedule, the employer is told, and you get a confirmation by text and email."],
        ["How will I know if a shift changes?", "You get a text and an email right away, and the shift shows in red on your calendar."],
        ["What if the employer cancels at the last minute?", "If an employer cancels less than 24 hours before the start, Joblop reviews each case with you."],
        ["Are the jobs real?", "Yes. Joblop jobs come from real employers and every request is reviewed by Joblop staff. JobScanner jobs come from licensed partner job boards."],
        ["How do I talk to a person?", "Open Contact Joblop and ask for a person. A Joblop team member takes over, and replies also come by email."]
      ]
    },
    final: {
      title: "Ready to start?",
      sub: "Search jobs now. Create your free account when you find one you like.",
      search: "Search jobs",
      create: "Create free account",
      cv: "Build my CV",
      calendar: "Open my calendar"
    },
    arrow: "→"
  },
  fr: {
    hero: {
      eyebrow: "Guide pour les travailleurs",
      title: "Comment Joblop fonctionne pour vous",
      sub: "Trouvez des quarts payés près de chez vous, voyez la paie avant de dire oui et obtenez de l'aide de vraies personnes. Voici tout, étape par étape.",
      search: "Chercher des emplois",
      create: "Créer un compte gratuit"
    },
    navLabel: "Étapes du guide",
    stepWord: "Étape",
    tipLabel: "Bon à savoir",
    cvWhere: {
      title: "Où le trouver?",
      menu: "Menu",
      item: "Créer un CV",
      text: "Ouvrez le menu en haut de n'importe quelle page et touchez **Créer un CV**. Il est toujours là, même avant de vous connecter."
    },
    steps: [
      {
        id: "start",
        nav: "Début",
        title: "Créez votre compte gratuit",
        intro: "Regardez d'abord : vous pouvez chercher des emplois sans compte. Quand un emploi vous intéresse, créez un compte gratuit pour voir les détails et postuler.",
        points: [
          "Indiquez votre nom, votre numéro de cellulaire et votre courriel.",
          "Connectez-vous avec votre numéro de cellulaire : on vous envoie un code à 6 chiffres par texto. **Aucun mot de passe** à retenir.",
          "Gratuit pour s'inscrire, gratuit à utiliser."
        ],
        links: [
          { href: "/#auth-card", label: "Créer un compte gratuit", primary: true },
          { href: "/", label: "Chercher des emplois" }
        ]
      },
      {
        id: "profile",
        nav: "Profil",
        title: "Complétez votre profil et vos papiers",
        intro: "Votre profil dit aux employeurs qui vous êtes. Vos papiers montrent que vous êtes prêt à travailler.",
        points: [
          "Complétez votre profil de travailleur.",
          "Téléversez vos documents dans **Documents** et **Vérification**.",
          "L'équipe Joblop vérifie vos papiers.",
          "Les travailleurs vérifiés se font offrir **plus de quarts**."
        ],
        links: [
          { href: "/onboarding", label: "Compléter mon profil", primary: true },
          { href: "/documents", label: "Mes documents" },
          { href: "/verification", label: "Vérification" }
        ]
      },
      {
        id: "cv",
        nav: "CV",
        title: "Un CV gratuit en quelques minutes",
        intro: "Pas de CV, ou un vieux CV? Joblop vous aide à faire un CV professionnel, étape par étape, gratuitement.",
        points: [
          "Remplissez-le étape par étape. Ça prend seulement quelques minutes.",
          "Un CV professionnel aide les employeurs à **vous choisir**.",
          "**Travailleur Pro** (12,99 $ CA par mois, essai gratuit de 14 jours) ajoute le CV Pro et le premier choix des offres d'emploi. C'est optionnel : le créateur de CV est gratuit."
        ],
        links: [{ href: "/cv-builder", label: "Créer mon CV", primary: true }]
      },
      {
        id: "work",
        nav: "Trouver du travail",
        title: "Trouvez du travail et acceptez des quarts",
        intro: "Deux endroits pour trouver du travail : votre calendrier Joblop, et JobScanner pour encore plus d'emplois.",
        points: [
          "**Mon calendrier** montre chaque emploi Joblop ouvert, jour par jour, avec le salaire à l'heure et le nombre de places restantes.",
          "**★** veut dire emploi avec prime : il paie plus.",
          "Touchez **Accepter** pour prendre un quart. Le quart s'ajoute à votre horaire et l'employeur est avisé.",
          "**JobScanner** montre plus d'emplois provenant de sites d'emploi partenaires partout au Québec. Il puise chez des partenaires licenciés comme Adzuna : fils partenaires seulement, jamais de scraping.",
          "Choisissez **« M'envoyer les nouveaux emplois »** : au plus un courriel par jour avec les nouveaux emplois qui vous correspondent."
        ],
        tip: "Accepter est définitif. Acceptez seulement un quart que vous êtes certain de pouvoir faire.",
        links: [
          { href: "/jobs-calendar", label: "Ouvrir mon calendrier", primary: true },
          { href: "/job-scanner", label: "Ouvrir JobScanner" }
        ]
      },
      {
        id: "before",
        nav: "Avant",
        title: "Avant le quart",
        intro: "Vous savez toujours où vous en êtes.",
        points: [
          "Vous recevez une **confirmation** par texto et par courriel.",
          "Vous recevez un **rappel** la veille.",
          "Si un quart est annulé ou modifié, vous recevez un texto et un courriel **tout de suite**, et il s'affiche en **rouge** dans votre calendrier."
        ],
        links: [{ href: "/jobs-calendar", label: "Ouvrir mon calendrier" }]
      },
      {
        id: "day",
        nav: "Le jour J",
        title: "Le jour du quart",
        intro: "Votre cellulaire suffit.",
        points: [
          "**Pointez à l'arrivée** et **pointez au départ** sur votre cellulaire.",
          "Vos heures sont enregistrées."
        ],
        links: []
      },
      {
        id: "pay",
        nav: "Paie",
        title: "Être payé",
        intro: "Pas de surprise : vous connaissez la paie avant de dire oui.",
        points: [
          "Vous voyez le **salaire à l'heure avant d'accepter**.",
          "Les relevés de paie arrivent par courriel et sont dans **Ma paie**.",
          "Les primes apparaissent sur une ligne **« Prime »**.",
          "Si un employeur annule **moins de 24 heures** avant le début, Joblop **examine votre cas avec vous**."
        ],
        links: [{ href: "/pay", label: "Ouvrir Ma paie", primary: true }]
      },
      {
        id: "help",
        nav: "Aide",
        title: "De l'aide quand vous en avez besoin",
        intro: "Une question, un problème ou envie de parler à quelqu'un? Utilisez Contacter Joblop.",
        points: [
          "L'assistant Joblop répond en premier.",
          "Un membre de l'équipe Joblop prend le relais au besoin : sécurité, litiges, votre compte, ou simplement **demandez une personne**.",
          "Les réponses arrivent aussi par courriel."
        ],
        tip: "Ne partagez jamais votre numéro de compte bancaire ni votre numéro d'assurance sociale dans le clavardage.",
        links: [{ href: "/contact", label: "Contacter Joblop", primary: true }]
      }
    ],
    why: {
      title: "Pourquoi les travailleurs choisissent Joblop",
      sub: "Simple, honnête et fait pour votre cellulaire.",
      items: [
        { icon: "eye", title: "La paie d'abord", body: "Le salaire à l'heure est affiché avant que vous acceptiez." },
        { icon: "shield", title: "Pas de faux emplois", body: "De vrais employeurs. Chaque demande est vérifiée par l'équipe Joblop." },
        { icon: "pin", title: "Des emplois près de vous", body: "Trouvez des quarts proches de chez vous." },
        { icon: "grid", title: "Tous les types de travail", body: "Entretien, cuisine, entrepôt, commerce de détail, événements, conduite, construction, soins." },
        { icon: "tag", title: "Gratuit", body: "Chercher, postuler et créer votre CV ne coûte rien." },
        { icon: "phone", title: "Connexion par cellulaire", body: "Un code par texto. Aucun mot de passe à oublier." },
        { icon: "calendar", title: "Un seul calendrier", body: "Les emplois, vos quarts et les changements, au même endroit." },
        { icon: "people", title: "De vraies personnes", body: "Un membre de l'équipe Joblop est derrière l'assistant." }
      ]
    },
    faq: {
      title: "Questions fréquentes",
      items: [
        ["Est-ce que Joblop coûte quelque chose?", "Non. Joblop est gratuit pour les travailleurs. Travailleur Pro est optionnel : 12,99 $ CA par mois après un essai gratuit de 14 jours."],
        ["Ai-je besoin d'un mot de passe?", "Non. Vous vous connectez avec votre numéro de cellulaire et un code à 6 chiffres envoyé par texto."],
        ["Puis-je voir les emplois avant de m'inscrire?", "Oui. Cherchez librement. Créez un compte gratuit quand vous voulez voir les détails et postuler."],
        ["Où trouver le créateur de CV?", "Ouvrez le menu et touchez « Créer un CV ». C'est gratuit et ça prend quelques minutes."],
        ["Que veut dire le ★?", "C'est un emploi avec prime : il paie plus. Les primes apparaissent sur votre relevé de paie sur une ligne « Prime »."],
        ["Que se passe-t-il quand je touche Accepter?", "Accepter est définitif. Le quart s'ajoute à votre horaire, l'employeur est avisé et vous recevez une confirmation par texto et par courriel."],
        ["Comment saurai-je si un quart change?", "Vous recevez un texto et un courriel tout de suite, et le quart s'affiche en rouge dans votre calendrier."],
        ["Et si l'employeur annule à la dernière minute?", "Si un employeur annule moins de 24 heures avant le début, Joblop examine chaque cas avec vous."],
        ["Les emplois sont-ils vrais?", "Oui. Les emplois Joblop viennent de vrais employeurs et chaque demande est vérifiée par l'équipe Joblop. Les emplois de JobScanner viennent de sites d'emploi partenaires licenciés."],
        ["Comment parler à une personne?", "Ouvrez Contacter Joblop et demandez une personne. Un membre de l'équipe Joblop prend le relais, et les réponses arrivent aussi par courriel."]
      ]
    },
    final: {
      title: "Prêt à commencer?",
      sub: "Cherchez des emplois maintenant. Créez votre compte gratuit quand un emploi vous plaît.",
      search: "Chercher des emplois",
      create: "Créer un compte gratuit",
      cv: "Créer mon CV",
      calendar: "Ouvrir mon calendrier"
    },
    arrow: "→"
  },
  ar: {
    hero: {
      eyebrow: "دليل العامل",
      title: "كيف يعمل جوب‑لوب من أجلك",
      sub: "اعثر على مناوبات مدفوعة قريبة منك، واعرف الأجر قبل أن توافق، واحصل على مساعدة من أشخاص حقيقيين. إليك كل شيء خطوة بخطوة.",
      search: "ابحث عن وظائف",
      create: "أنشئ حسابًا مجانيًا"
    },
    navLabel: "خطوات الدليل",
    stepWord: "الخطوة",
    tipLabel: "معلومة مهمة",
    cvWhere: {
      title: "أين أجدها؟",
      menu: "القائمة",
      item: "إنشاء السيرة",
      text: "افتح القائمة أعلى أي صفحة واضغط **إنشاء السيرة**. إنها موجودة دائمًا، حتى قبل تسجيل الدخول."
    },
    steps: [
      {
        id: "start",
        nav: "البداية",
        title: "أنشئ حسابك المجاني",
        intro: "تصفّح أولًا: يمكنك البحث عن الوظائف دون حساب. وعندما تجد ما يعجبك، أنشئ حسابًا مجانيًا لترى التفاصيل وتتقدّم.",
        points: [
          "أدخل اسمك ورقم هاتفك المحمول وبريدك الإلكتروني.",
          "سجّل الدخول برقم هاتفك المحمول: نرسل لك رمزًا من 6 أرقام في رسالة نصية. **بلا كلمة مرور** تحفظها.",
          "التسجيل مجاني والاستخدام مجاني."
        ],
        links: [
          { href: "/#auth-card", label: "أنشئ حسابًا مجانيًا", primary: true },
          { href: "/", label: "ابحث عن وظائف" }
        ]
      },
      {
        id: "profile",
        nav: "الملف",
        title: "أكمل ملفك وأوراقك",
        intro: "ملفك يعرّف أصحاب العمل بك. وأوراقك تُظهر أنك جاهز للعمل.",
        points: [
          "أكمل ملفك كعامل.",
          "ارفع مستنداتك في **المستندات** و**التحقق**.",
          "فريق جوب‑لوب يراجع أوراقك.",
          "العمال الذين تم التحقق منهم يُعرض عليهم **مناوبات أكثر**."
        ],
        links: [
          { href: "/onboarding", label: "أكمل ملفي", primary: true },
          { href: "/documents", label: "مستنداتي" },
          { href: "/verification", label: "التحقق" }
        ]
      },
      {
        id: "cv",
        nav: "السيرة",
        title: "سيرة ذاتية مجانية في دقائق",
        intro: "ليست لديك سيرة ذاتية، أو لديك سيرة قديمة؟ يساعدك جوب‑لوب على إنشاء سيرة احترافية، خطوة بخطوة، مجانًا.",
        points: [
          "املأها خطوة بخطوة. لا تستغرق إلا دقائق.",
          "السيرة الاحترافية تساعد أصحاب العمل على **اختيارك**.",
          "**Worker Pro** (‏12.99 دولارًا كنديًا شهريًا، مع تجربة مجانية لمدة 14 يومًا) يضيف السيرة الاحترافية وأولوية اختيار عروض العمل. وهو اختياري: أداة إنشاء السيرة مجانية."
        ],
        links: [{ href: "/cv-builder", label: "أنشئ سيرتي", primary: true }]
      },
      {
        id: "work",
        nav: "إيجاد عمل",
        title: "اعثر على عمل واقبل المناوبات",
        intro: "مكانان لإيجاد العمل: تقويمك في جوب‑لوب، وJobScanner لمزيد من الوظائف.",
        points: [
          "**تقويمي** يعرض كل وظيفة مفتوحة في جوب‑لوب، يومًا بيوم، مع الأجر في الساعة وعدد الأماكن المتبقية.",
          "**★** تعني وظيفة بمكافأة: أجرها أعلى.",
          "اضغط **اقبل** لتأخذ المناوبة. تُضاف المناوبة إلى جدولك ويُبلَّغ صاحب العمل.",
          "**JobScanner** يعرض وظائف أكثر من مواقع توظيف شريكة في أنحاء كيبيك. يسحب من شركاء مرخَّصين مثل Adzuna: مصادر الشركاء فقط، دون أي استخلاص للبيانات.",
          "اختر **«أرسل لي الوظائف الجديدة»**: رسالة بريد واحدة في اليوم على الأكثر بالوظائف الجديدة المناسبة لك."
        ],
        tip: "القبول نهائي. لا تقبل إلا مناوبة أنت متأكد أنك تستطيع القيام بها.",
        links: [
          { href: "/jobs-calendar", label: "افتح تقويمي", primary: true },
          { href: "/job-scanner", label: "افتح JobScanner" }
        ]
      },
      {
        id: "before",
        nav: "قبل المناوبة",
        title: "قبل المناوبة",
        intro: "تعرف دائمًا أين تقف.",
        points: [
          "يصلك **تأكيد** برسالة نصية وبالبريد الإلكتروني.",
          "يصلك **تذكير** في اليوم السابق.",
          "إذا أُلغيت مناوبة أو تغيّرت، تصلك رسالة نصية وبريد إلكتروني **فورًا**، وتظهر باللون **الأحمر** في تقويمك."
        ],
        links: [{ href: "/jobs-calendar", label: "افتح تقويمي" }]
      },
      {
        id: "day",
        nav: "يوم العمل",
        title: "يوم العمل",
        intro: "هاتفك هو كل ما تحتاجه.",
        points: [
          "**سجّل حضورك** عند البدء و**سجّل انصرافك** عند الانتهاء، من هاتفك.",
          "تُسجَّل ساعات عملك."
        ],
        links: []
      },
      {
        id: "pay",
        nav: "الأجر",
        title: "استلام أجرك",
        intro: "بلا مفاجآت: تعرف الأجر قبل أن توافق.",
        points: [
          "ترى **الأجر في الساعة قبل أن تقبل**.",
          "كشوف الأجر تصلك بالبريد الإلكتروني وتجدها في **أجري**.",
          "تظهر المكافآت في سطر **«مكافأة»**.",
          "إذا ألغى صاحب العمل **قبل أقل من 24 ساعة** من البدء، **تراجع جوب‑لوب حالتك معك**."
        ],
        links: [{ href: "/pay", label: "افتح أجري", primary: true }]
      },
      {
        id: "help",
        nav: "المساعدة",
        title: "مساعدة عندما تحتاجها",
        intro: "سؤال، مشكلة، أو تريد التحدث مع شخص؟ استخدم «تواصل مع Joblop».",
        points: [
          "مساعد جوب‑لوب يجيب أولًا.",
          "يتولّى أحد أعضاء فريق جوب‑لوب الأمر عند الحاجة: السلامة، النزاعات، حسابك، أو ببساطة **اطلب التحدث مع شخص**.",
          "تصلك الردود أيضًا بالبريد الإلكتروني."
        ],
        tip: "لا تشارك أبدًا رقم حسابك البنكي أو رقم التأمين الاجتماعي في المحادثة.",
        links: [{ href: "/contact", label: "تواصل مع Joblop", primary: true }]
      }
    ],
    why: {
      title: "لماذا يختار العمال جوب‑لوب",
      sub: "بسيط، صادق، ومصمَّم لهاتفك.",
      items: [
        { icon: "eye", title: "الأجر أولًا", body: "يظهر الأجر في الساعة قبل أن تقبل." },
        { icon: "shield", title: "لا وظائف وهمية", body: "أصحاب عمل حقيقيون. كل طلب يراجعه فريق جوب‑لوب." },
        { icon: "pin", title: "وظائف قريبة منك", body: "اعثر على مناوبات قريبة من مكان سكنك." },
        { icon: "grid", title: "كل أنواع العمل", body: "تنظيف، مطابخ، مستودعات، متاجر، فعاليات، قيادة، بناء، رعاية." },
        { icon: "tag", title: "مجاني", body: "البحث والتقديم وإنشاء السيرة بلا أي تكلفة." },
        { icon: "phone", title: "الدخول بهاتفك", body: "رمز برسالة نصية. بلا كلمة مرور تنساها." },
        { icon: "calendar", title: "تقويم واحد", body: "الوظائف ومناوباتك والتغييرات، في مكان واحد." },
        { icon: "people", title: "أشخاص حقيقيون", body: "خلف المساعد عضو حقيقي من فريق جوب‑لوب." }
      ]
    },
    faq: {
      title: "أسئلة يطرحها العمال",
      items: [
        ["هل يكلّف جوب‑لوب شيئًا؟", "لا. جوب‑لوب مجاني للعمال. Worker Pro اختياري: ‏12.99 دولارًا كنديًا شهريًا بعد تجربة مجانية لمدة 14 يومًا."],
        ["هل أحتاج إلى كلمة مرور؟", "لا. تسجّل الدخول برقم هاتفك المحمول ورمز من 6 أرقام نرسله لك برسالة نصية."],
        ["هل يمكنني رؤية الوظائف قبل التسجيل؟", "نعم. ابحث بحرية. وأنشئ حسابًا مجانيًا عندما تريد رؤية التفاصيل والتقديم."],
        ["أين أجد أداة إنشاء السيرة الذاتية؟", "افتح القائمة واضغط «إنشاء السيرة». إنها مجانية وتستغرق دقائق."],
        ["ماذا تعني ★؟", "إنها وظيفة بمكافأة: أجرها أعلى. تظهر المكافآت في كشف أجرك في سطر «مكافأة»."],
        ["ماذا يحدث عندما أضغط «اقبل»؟", "القبول نهائي. تُضاف المناوبة إلى جدولك، ويُبلَّغ صاحب العمل، ويصلك تأكيد برسالة نصية وبالبريد الإلكتروني."],
        ["كيف أعرف إذا تغيّرت مناوبة؟", "تصلك رسالة نصية وبريد إلكتروني فورًا، وتظهر المناوبة باللون الأحمر في تقويمك."],
        ["ماذا لو ألغى صاحب العمل في آخر لحظة؟", "إذا ألغى صاحب العمل قبل أقل من 24 ساعة من البدء، تراجع جوب‑لوب كل حالة معك على حدة."],
        ["هل الوظائف حقيقية؟", "نعم. وظائف جوب‑لوب من أصحاب عمل حقيقيين، وكل طلب يراجعه فريق جوب‑لوب. ووظائف JobScanner من مواقع توظيف شريكة مرخَّصة."],
        ["كيف أتحدث مع شخص؟", "افتح «تواصل مع Joblop» واطلب التحدث مع شخص. يتولّى أحد أعضاء الفريق الأمر، وتصلك الردود أيضًا بالبريد الإلكتروني."]
      ]
    },
    final: {
      title: "مستعد للبدء؟",
      sub: "ابحث عن وظائف الآن. وأنشئ حسابك المجاني عندما تجد ما يعجبك.",
      search: "ابحث عن وظائف",
      create: "أنشئ حسابًا مجانيًا",
      cv: "أنشئ سيرتي",
      calendar: "افتح تقويمي"
    },
    arrow: "←"
  }
};

/** Renders **bold** segments inside a translated string. */
function rich(text: string): ReactNode {
  return text.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

export function HowItWorks() {
  const locale = useLocale();
  const lang: Lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  const c = COPY[lang];
  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [animate, setAnimate] = useState(false);
  const [active, setActive] = useState<StepId>("start");

  // Entrance animation: content is fully visible without JS; once mounted, sections fade up as
  // they scroll into view. People who prefer less motion see everything at once (CSS below).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".jg-reveal"));
    if (typeof IntersectionObserver === "undefined") return;
    setAnimate(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lang]);

  // Highlight the step currently on screen in the sticky navigator.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-step]"));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) setActive(first.target.getAttribute("data-step") as StepId);
      },
      { rootMargin: "-130px 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lang]);

  // Keep the active chip visible in the horizontally scrolling navigator (works in LTR and RTL).
  useEffect(() => {
    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!nav || !chip) return;
    const n = nav.getBoundingClientRect();
    const r = chip.getBoundingClientRect();
    const delta = r.left + r.width / 2 - (n.left + n.width / 2);
    const calm = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (Math.abs(delta) > 4) nav.scrollBy({ left: delta, behavior: calm ? "auto" : "smooth" });
  }, [active]);

  return (
    <div className={animate ? "jg jg-anim" : "jg"} ref={rootRef}>
      <style>{CSS}</style>

      <header className="jg-hero">
        <div className="jg-hero-copy jg-reveal">
          <span className="jg-eyebrow">{c.hero.eyebrow}</span>
          <h1>{c.hero.title}</h1>
          <p>{c.hero.sub}</p>
          <div className="jg-actions">
            <a className="jg-btn jg-btn-gold" href="/">{c.hero.search}</a>
            <a className="jg-btn jg-btn-line" href="/?tab=signup#auth-card">{c.hero.create}</a>
          </div>
        </div>
        <div className="jg-hero-art jg-reveal" aria-hidden="true">
          <HeroArt />
        </div>
      </header>

      <nav className="jg-nav" aria-label={c.navLabel} ref={navRef}>
        <ol>
          {c.steps.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} data-chip={s.id} aria-current={active === s.id ? "step" : undefined} className={active === s.id ? "on" : ""}>
                <span className="jg-chip-n">{i + 1}</span>
                {s.nav}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="jg-steps">
        {c.steps.map((s, i) => (
          <section key={s.id} id={s.id} data-step={s.id} className="jg-step jg-reveal" aria-labelledby={`${s.id}-title`}>
            <div className="jg-art" aria-hidden="true">
              <StepArt id={s.id} />
            </div>
            <div className="jg-body">
              <span className="jg-kicker">
                {c.stepWord} {i + 1} · {s.nav}
              </span>
              <h2 id={`${s.id}-title`}>{s.title}</h2>
              <p className="jg-intro">{s.intro}</p>
              {s.id === "cv" ? (
                <div className="jg-where">
                  <b>{c.cvWhere.title}</b>
                  <div className="jg-menu" aria-hidden="true">
                    <span className="jg-burger"><i /><i /><i /></span>
                    <span>{c.cvWhere.menu}</span>
                    <span className="jg-menu-arrow">{c.arrow}</span>
                    <span className="jg-menu-item">{c.cvWhere.item}</span>
                  </div>
                  <p>{rich(c.cvWhere.text)}</p>
                </div>
              ) : null}
              <ul className="jg-points">
                {s.points.map((p) => (
                  <li key={p}>
                    <span className="jg-tick" aria-hidden="true" />
                    <span>{rich(p)}</span>
                  </li>
                ))}
              </ul>
              {s.tip ? (
                <p className="jg-tip">
                  <b>{c.tipLabel}</b> {s.tip}
                </p>
              ) : null}
              {s.links.length ? (
                <div className="jg-actions">
                  {s.links.map((l) => (
                    <a key={l.href + l.label} className={l.primary ? "jg-btn jg-btn-gold" : "jg-btn jg-btn-line"} href={l.href}>
                      {l.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <section className="jg-why" aria-labelledby="jg-why-title">
        <div className="jg-head jg-reveal">
          <h2 id="jg-why-title">{c.why.title}</h2>
          <p>{c.why.sub}</p>
        </div>
        <ul className="jg-grid">
          {c.why.items.map((b, i) => (
            <li key={b.title} className="jg-benefit jg-reveal" style={{ transitionDelay: `${(i % 4) * 70}ms` }}>
              <span className="jg-bicon" aria-hidden="true"><BenefitGlyph icon={b.icon} /></span>
              <b>{b.title}</b>
              <span>{b.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="jg-faq" aria-labelledby="jg-faq-title">
        <div className="jg-head jg-reveal">
          <h2 id="jg-faq-title">{c.faq.title}</h2>
        </div>
        <div className="jg-faq-list jg-reveal">
          {c.faq.items.map(([q, a]) => (
            <details key={q}>
              <summary>
                <span>{q}</span>
                <span className="jg-plus" aria-hidden="true" />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="jg-final jg-reveal" aria-labelledby="jg-final-title">
        <h2 id="jg-final-title">{c.final.title}</h2>
        <p>{c.final.sub}</p>
        <div className="jg-actions jg-actions-center">
          <a className="jg-btn jg-btn-gold" href="/">{c.final.search}</a>
          <a className="jg-btn jg-btn-line" href="/?tab=signup#auth-card">{c.final.create}</a>
          <a className="jg-btn jg-btn-line" href="/cv-builder">{c.final.cv}</a>
          <a className="jg-btn jg-btn-line" href="/jobs-calendar">{c.final.calendar}</a>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- art (inline SVG, no assets) */

function HeroArt() {
  return (
    <svg viewBox="0 0 220 240" className="jg-svg">
      <rect x="50" y="8" width="120" height="224" rx="20" className="ln" />
      <rect x="92" y="18" width="36" height="5" rx="2.5" className="gd" />
      {[0, 1, 2].map((i) => (
        <g key={i} className="jg-slide" style={{ animationDelay: `${0.2 + i * 0.35}s` }}>
          <rect x="62" y={40 + i * 56} width="96" height="46" rx="10" className={i === 1 ? "card hi" : "card"} />
          <rect x="72" y={50 + i * 56} width="44" height="6" rx="3" className="cr" />
          <rect x="72" y={62 + i * 56} width="30" height="5" rx="2.5" className="dim" />
          <rect x="72" y={72 + i * 56} width="22" height="5" rx="2.5" className="gd" />
          {i === 1 ? <path d={star(142, 57 + i * 56, 7)} className="gd jg-twinkle" /> : null}
        </g>
      ))}
      <rect x="66" y="208" width="88" height="16" rx="8" className="gd jg-pulse" />
      <path d="M100 216l5 4 9-8" className="ink" />
    </svg>
  );
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let k = 0; k < 10; k += 1) {
    const rad = (Math.PI / 5) * k - Math.PI / 2;
    const rr = k % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(1)} ${(cy + rr * Math.sin(rad)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

function StepArt({ id }: { id: StepId }) {
  switch (id) {
    case "start":
      return (
        <svg viewBox="0 0 160 120" className="jg-svg">
          <rect x="52" y="6" width="56" height="108" rx="11" className="ln" />
          <rect x="60" y="20" width="40" height="18" rx="6" className="card" />
          <rect x="65" y="26" width="22" height="3" rx="1.5" className="cr" />
          <rect x="65" y="31" width="14" height="3" rx="1.5" className="dim" />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <rect key={k} x={57.5 + k * 7.8} y="52" width="6.4" height="11" rx="2" className="gd jg-code" style={{ animationDelay: `${k * 0.22}s` }} />
          ))}
          <rect x="60" y="84" width="40" height="13" rx="6.5" className="gd" />
          <path d="M74 90.5l4 3.5 8-7" className="ink" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 160 120" className="jg-svg">
          <rect x="42" y="10" width="68" height="96" rx="9" className="ln" />
          <circle cx="76" cy="36" r="11" className="ln" />
          <path d="M60 64c3-8 9-11 16-11s13 3 16 11" className="ln" />
          <rect x="54" y="74" width="44" height="5" rx="2.5" className="cr" />
          <rect x="54" y="85" width="30" height="5" rx="2.5" className="dim" />
          <g className="jg-pop">
            <circle cx="110" cy="84" r="16" className="gd" />
            <path d="M102 84l6 6 11-12" className="ink" />
          </g>
        </svg>
      );
    case "cv":
      return (
        <svg viewBox="0 0 160 120" className="jg-svg">
          <rect x="40" y="8" width="80" height="104" rx="8" className="ln" />
          <rect x="40" y="8" width="80" height="24" rx="8" className="gd" />
          <circle cx="56" cy="20" r="7" className="ink-fill" />
          <rect x="68" y="15" width="38" height="4" rx="2" className="ink-fill" />
          <rect x="68" y="22" width="24" height="4" rx="2" className="ink-fill" />
          {[44, 56, 68, 80, 92].map((y, k) => (
            <line key={y} x1="52" y1={y} x2={k % 2 ? 94 : 108} y2={y} className="cr-line jg-draw" style={{ animationDelay: `${0.3 + k * 0.25}s` }} />
          ))}
        </svg>
      );
    case "work":
      return (
        <svg viewBox="0 0 160 120" className="jg-svg">
          <rect x="22" y="12" width="116" height="92" rx="10" className="ln" />
          <rect x="22" y="12" width="116" height="18" rx="9" className="gd" />
          {Array.from({ length: 15 }, (_, k) => {
            const col = k % 5;
            const row = Math.floor(k / 5);
            return <rect key={k} x={32 + col * 20} y={38 + row * 20} width="16" height="15" rx="4" className={k === 7 ? "gd jg-pulse" : "card"} />;
          })}
          <path d={star(80, 65.5, 5)} className="ink-fill" />
          <path d={star(122, 85.5, 6)} className="gd jg-twinkle" />
        </svg>
      );
    case "before":
      return (
        <svg viewBox="0 0 160 120" className="jg-svg">
          <rect x="18" y="44" width="70" height="50" rx="7" className="ln" />
          <path d="M18 50l35 24 35-24" className="ln" />
          <g className="jg-swing">
            <path d="M112 30c-12 0-18 9-18 20v14l-6 8h48l-6-8V50c0-11-6-20-18-20z" className="ln gd-soft" />
            <path d="M106 78a6 6 0 0012 0" className="ln" />
          </g>
          <circle cx="128" cy="32" r="7" className="red jg-pulse" />
        </svg>
      );
    case "day":
      return (
        <svg viewBox="0 0 160 120" className="jg-svg">
          <circle cx="80" cy="60" r="44" className="ln" />
          {Array.from({ length: 12 }, (_, k) => {
            const a = (Math.PI / 6) * k;
            return <line key={k} x1={80 + 37 * Math.sin(a)} y1={60 - 37 * Math.cos(a)} x2={80 + 41 * Math.sin(a)} y2={60 - 41 * Math.cos(a)} className="dim-line" />;
          })}
          <line x1="80" y1="60" x2="80" y2="36" className="cr-line" />
          <line x1="80" y1="60" x2="80" y2="26" className="gd-line jg-spin" />
          <circle cx="80" cy="60" r="4" className="gd" />
          <g className="jg-pop">
            <circle cx="122" cy="94" r="13" className="gd" />
            <path d="M116 94l4 4 8-8" className="ink" />
          </g>
        </svg>
      );
    case "pay":
      return (
        <svg viewBox="0 0 160 120" className="jg-svg">
          <rect x="30" y="10" width="72" height="100" rx="8" className="ln" />
          <rect x="40" y="22" width="40" height="5" rx="2.5" className="cr" />
          <rect x="40" y="38" width="52" height="4" rx="2" className="dim" />
          <rect x="40" y="48" width="52" height="4" rx="2" className="dim" />
          <rect x="36" y="60" width="60" height="12" rx="4" className="gd-soft jg-pulse" />
          <rect x="40" y="64" width="22" height="4" rx="2" className="gd" />
          <rect x="40" y="84" width="52" height="6" rx="3" className="cr" />
          {[0, 1, 2].map((k) => (
            <g key={k} className="jg-bounce" style={{ animationDelay: `${k * 0.18}s` }}>
              <ellipse cx="124" cy={92 - k * 12} rx="16" ry="6" className="gd" />
            </g>
          ))}
        </svg>
      );
    case "help":
      return (
        <svg viewBox="0 0 160 120" className="jg-svg">
          <path d="M18 22h76a8 8 0 018 8v26a8 8 0 01-8 8H42l-14 12V64h-10a8 8 0 01-8-8V30a8 8 0 018-8z" className="ln" />
          {[0, 1, 2].map((k) => (
            <circle key={k} cx={44 + k * 14} cy="43" r="4" className="cr jg-dot" style={{ animationDelay: `${k * 0.2}s` }} />
          ))}
          <path d="M66 62h68a8 8 0 018 8v20a8 8 0 01-8 8h-6v12l-14-12H66a8 8 0 01-8-8V70a8 8 0 018-8z" className="gd-soft ln" />
          <circle cx="82" cy="80" r="6" className="gd" />
          <rect x="94" y="74" width="36" height="4" rx="2" className="cr" />
          <rect x="94" y="83" width="24" height="4" rx="2" className="dim" />
        </svg>
      );
  }
}

function BenefitGlyph({ icon }: { icon: BenefitIcon }) {
  const p = {
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
    pin: <><path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    tag: <><path d="M3 12V4h8l10 10-7 7z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
    phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18h2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.2c3 .3 5.5 2.6 5.5 5.8" /></>
  }[icon];
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {p}
    </svg>
  );
}

/* ---------------------------------------------------------------- styles */

const CSS = `
.jg{--k:#000;--k2:#0d0b08;--k3:#16130d;--cr:#f4efe4;--cr2:rgba(244,239,228,.74);--cr3:rgba(244,239,228,.45);
  --gd:#f8b808;--gd2:rgba(248,184,8,.14);--gdl:rgba(248,184,8,.28);
  background:var(--k);color:var(--cr);max-width:1080px;margin:0 auto;padding:0 16px 56px;overflow-x:clip}
.jg *{box-sizing:border-box}
.jg h1,.jg h2{font-family:var(--font-serif,inherit);letter-spacing:-.015em;color:var(--cr)}
.jg strong{color:var(--cr);font-weight:800}
.jg a{color:inherit}

/* hero */
.jg-hero{display:grid;gap:18px;padding:28px 0 18px;align-items:center}
.jg-eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--gd);
  border:1px solid var(--gdl);border-radius:999px;padding:5px 12px;margin-bottom:14px}
.jg-hero h1{font-size:clamp(30px,8vw,52px);line-height:1.05;margin:0 0 12px}
.jg-hero p{font-size:clamp(16px,2.4vw,19px);line-height:1.55;color:var(--cr2);margin:0 0 20px;max-width:44ch}
.jg-hero-art{justify-self:center;width:min(240px,62vw)}
@media(min-width:760px){.jg-hero{grid-template-columns:1.25fr .75fr;padding:48px 0 28px}.jg-hero-art{width:240px}}

/* buttons */
.jg-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
.jg-actions-center{justify-content:center}
.jg-btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:12px 20px;border-radius:12px;
  font-weight:800;font-size:15px;text-decoration:none;transition:transform .15s,background .2s,border-color .2s}
.jg-btn:active{transform:scale(.98)}
.jg-btn-gold{background:var(--gd);color:#000 !important;border:1px solid var(--gd)}
.jg-btn-gold:hover{background:#ffc93a}
.jg-btn-line{border:1px solid var(--gdl);color:var(--cr) !important;background:transparent}
.jg-btn-line:hover{border-color:var(--gd);background:var(--gd2)}
.jg-btn:focus-visible,.jg-nav a:focus-visible,.jg summary:focus-visible{outline:2px solid var(--gd);outline-offset:3px}
@media(max-width:480px){.jg-hero .jg-actions .jg-btn,.jg-final .jg-btn{flex:1 1 100%}}

/* sticky step navigator */
.jg-nav{position:sticky;top:60px;z-index:5;margin:8px -16px 18px;padding:10px 16px;background:rgba(0,0,0,.9);
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid var(--gd2);
  overflow-x:auto;scrollbar-width:none}
.jg-nav::-webkit-scrollbar{display:none}
.jg-nav ol{display:flex;gap:8px;list-style:none;margin:0;padding:0;width:max-content}
.jg-nav a{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;text-decoration:none;font-size:14px;font-weight:700;
  color:var(--cr2);border:1px solid var(--gd2);border-radius:999px;padding:7px 13px 7px 8px;transition:all .2s}
[dir="rtl"] .jg-nav a{padding:7px 8px 7px 13px}
.jg-nav a.on{color:#000;background:var(--gd);border-color:var(--gd)}
.jg-chip-n{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;font-size:12px;font-weight:800;
  background:var(--gd2);color:var(--gd)}
.jg-nav a.on .jg-chip-n{background:#000;color:var(--gd)}

/* step cards */
.jg-steps{display:grid;gap:16px}
.jg-step{scroll-margin-top:130px;display:grid;gap:4px;background:linear-gradient(170deg,var(--k3),var(--k2));
  border:1px solid var(--gd2);border-radius:20px;padding:18px 18px 22px;position:relative;overflow:hidden}
.jg-step::before{content:"";position:absolute;inset-inline-start:0;top:22px;bottom:22px;width:3px;border-radius:3px;
  background:linear-gradient(var(--gd),transparent)}
.jg-art{height:128px;display:grid;place-items:center;border-radius:14px;background:radial-gradient(circle at 50% 60%,rgba(248,184,8,.1),transparent 70%)}
.jg-art .jg-svg{height:118px;width:auto}
.jg-kicker{display:block;margin-top:8px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--gd)}
.jg-step h2{font-size:clamp(22px,5.4vw,30px);line-height:1.15;margin:6px 0 8px}
.jg-intro{margin:0 0 12px;color:var(--cr2);font-size:16px;line-height:1.55}
.jg-points{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:10px}
.jg-points li{display:flex;gap:10px;align-items:flex-start;font-size:15.5px;line-height:1.5;color:var(--cr2)}
.jg-tick{flex:none;width:20px;height:20px;margin-top:2px;border-radius:50%;background:var(--gd2);position:relative}
.jg-tick::after{content:"";position:absolute;left:6px;top:4px;width:5px;height:9px;border:solid var(--gd);border-width:0 2px 2px 0;transform:rotate(45deg)}
.jg-tip{margin:4px 0 14px;padding:11px 14px;border-radius:12px;background:var(--gd2);border:1px solid var(--gdl);
  font-size:14.5px;line-height:1.5;color:var(--cr)}
.jg-tip b{color:var(--gd);margin-inline-end:4px}
.jg-where{margin:0 0 14px;padding:12px 14px;border-radius:14px;border:1px dashed var(--gdl);background:rgba(248,184,8,.05)}
.jg-where > b{display:block;color:var(--gd);font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
.jg-where p{margin:8px 0 0;font-size:14.5px;line-height:1.5;color:var(--cr2)}
.jg-menu{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14px;font-weight:700}
.jg-burger{display:inline-grid;gap:3px;padding:7px 8px;border:1px solid var(--gdl);border-radius:8px}
.jg-burger i{display:block;width:14px;height:2px;background:var(--cr);border-radius:2px}
.jg-menu-arrow{color:var(--gd)}
.jg-menu-item{background:var(--gd);color:#000;border-radius:8px;padding:5px 10px}
@media(min-width:760px){
  .jg-step{grid-template-columns:220px 1fr;gap:26px;padding:26px 28px 28px}
  .jg-art{height:auto;min-height:190px;align-self:stretch}
  .jg-art .jg-svg{height:160px}
  .jg-kicker{margin-top:0}
}

/* why */
.jg-why,.jg-faq{margin-top:44px}
.jg-head h2{font-size:clamp(24px,5.6vw,34px);margin:0 0 6px}
.jg-head p{margin:0 0 18px;color:var(--cr2);font-size:16px}
.jg-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
@media(min-width:760px){.jg-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}}
.jg-benefit{display:flex;flex-direction:column;gap:6px;padding:15px;border-radius:16px;background:var(--k3);border:1px solid var(--gd2)}
.jg-benefit b{font-size:15px;line-height:1.25}
.jg-benefit > span:last-child{font-size:13.5px;line-height:1.45;color:var(--cr2)}
.jg-bicon{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--gd2);color:var(--gd);margin-bottom:4px}

/* faq */
.jg-head:has(+ .jg-faq-list) h2{margin-bottom:14px}
.jg-faq-list{display:grid;gap:8px}
.jg-faq details{border:1px solid var(--gd2);border-radius:14px;background:var(--k2);transition:border-color .2s}
.jg-faq details[open]{border-color:var(--gdl);background:var(--k3)}
.jg-faq summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:15px 16px;font-weight:700;font-size:15.5px;line-height:1.35;min-height:52px}
.jg-faq summary::-webkit-details-marker{display:none}
.jg-plus{flex:none;width:22px;height:22px;border-radius:50%;background:var(--gd2);position:relative}
.jg-plus::before,.jg-plus::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:2px;background:var(--gd);
  border-radius:2px;transform:translate(-50%,-50%);transition:transform .25s}
.jg-plus::after{transform:translate(-50%,-50%) rotate(90deg)}
.jg-faq details[open] .jg-plus::after{transform:translate(-50%,-50%) rotate(0)}
.jg-faq details p{margin:0;padding:0 16px 16px;color:var(--cr2);font-size:15px;line-height:1.55}

/* final */
.jg-final{margin-top:44px;text-align:center;padding:30px 18px;border-radius:22px;border:1px solid var(--gdl);
  background:radial-gradient(circle at 50% 0%,rgba(248,184,8,.16),transparent 70%),var(--k2)}
.jg-final h2{font-size:clamp(26px,6vw,36px);margin:0 0 8px}
.jg-final p{margin:0 auto 18px;color:var(--cr2);max-width:44ch;font-size:16px}

/* svg palette */
.jg-svg{display:block;overflow:visible}
.jg-svg .ln{fill:none;stroke:var(--gd);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.jg-svg .gd{fill:var(--gd)}
.jg-svg .gd-soft{fill:rgba(248,184,8,.16)}
.jg-svg .cr{fill:var(--cr)}
.jg-svg .dim{fill:var(--cr3)}
.jg-svg .card{fill:#1d1912;stroke:rgba(248,184,8,.22);stroke-width:1}
.jg-svg .card.hi{stroke:var(--gd);stroke-width:1.5}
.jg-svg .ink{fill:none;stroke:#000;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.jg-svg .ink-fill{fill:#000}
.jg-svg .red{fill:#e5484d}
.jg-svg .cr-line{stroke:var(--cr);stroke-width:3;stroke-linecap:round}
.jg-svg .gd-line{stroke:var(--gd);stroke-width:2.6;stroke-linecap:round}
.jg-svg .dim-line{stroke:var(--cr3);stroke-width:2;stroke-linecap:round}

/* motion — only when the visitor has not asked for less */
@media (prefers-reduced-motion: no-preference){
  html:has(.jg){scroll-behavior:smooth}
  .jg-anim .jg-reveal{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s cubic-bezier(.2,.7,.2,1)}
  .jg-anim .jg-reveal.in{opacity:1;transform:none}
  .jg-svg *{transform-box:fill-box;transform-origin:center}
  .jg-code{animation:jg-blink 2.6s ease-in-out infinite}
  .jg-pop{animation:jg-pop 2.8s ease-in-out infinite}
  .jg-draw{stroke-dasharray:60;stroke-dashoffset:60;animation:jg-draw 3.2s ease-in-out infinite}
  .jg-twinkle{animation:jg-twinkle 2.2s ease-in-out infinite}
  .jg-pulse{animation:jg-pulse 2s ease-in-out infinite}
  .jg-swing{transform-origin:50% 0 !important;animation:jg-swing 2.4s ease-in-out infinite}
  .jg-spin{transform-box:view-box !important;transform-origin:80px 60px !important;animation:jg-spin 6s linear infinite}
  .jg-bounce{animation:jg-bounce 2.4s ease-in-out infinite}
  .jg-dot{animation:jg-dot 1.4s ease-in-out infinite}
  .jg-slide{animation:jg-slide .8s cubic-bezier(.2,.7,.2,1) both}
}
@keyframes jg-blink{0%,100%{opacity:.35}40%,60%{opacity:1}}
@keyframes jg-pop{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@keyframes jg-draw{0%{stroke-dashoffset:60}45%,80%{stroke-dashoffset:0}100%{stroke-dashoffset:-60}}
@keyframes jg-twinkle{0%,100%{transform:scale(1) rotate(0);opacity:1}50%{transform:scale(1.3) rotate(18deg);opacity:.8}}
@keyframes jg-pulse{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes jg-swing{0%,100%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-12deg)}45%{transform:rotate(8deg)}60%{transform:rotate(0)}}
@keyframes jg-spin{to{transform:rotate(360deg)}}
@keyframes jg-bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
@keyframes jg-dot{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
@keyframes jg-slide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
`;
