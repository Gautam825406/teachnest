"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  IndianRupee,
  Menu,
  MessageSquare,
  Play,
  Smartphone,
  Sparkles,
  Video,
  Wallet,
  X,
} from "lucide-react";
import { Button, ThemeToggle } from "@/components/ui";
import { CountUp, Reveal, useInView } from "@/components/motion";
import { getToken } from "@/lib/api";

/** Student Android app (APK) download link shown in the footer.
 *  Updated whenever a new EAS preview build is published (currently v3.1.0 —
 *  new UI, Doubt Engine, password registration; build 7a4c546b). */
const ANDROID_APK_URL =
  "https://expo.dev/artifacts/eas/cC0VQAS9Ob5BH0lZmPNWW-5MjJRJX-UuoVKP8U0-QuE.apk";

/** Shared hover micro-interaction for landing-page buttons. */
const BTN_HOVER = "duration-300 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98]";
/** Shared hover lift for landing-page cards. */
const CARD_HOVER =
  "transition duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Courses & video lectures",
    text: "Organise courses into subjects, topics and video lectures, with free previews and structured learning paths for every class.",
  },
  {
    icon: ClipboardList,
    title: "Test series & AI question papers",
    text: "Build test series with MCQ and negative marking, and generate question papers from your syllabus with the AI generator — then review and edit every question.",
  },
  {
    icon: Smartphone,
    title: "White-label student mobile app",
    text: "Your institute gets its own branded student app. What you publish in the admin panel shows up in the app automatically.",
  },
  {
    icon: IndianRupee,
    title: "Secure payments via Cashfree",
    text: "Sell courses and bundles with Cashfree checkout, track every order, and manage wallet balance and storage from one place.",
  },
  {
    icon: Video,
    title: "Live classes & seminars",
    text: "Schedule seminars and live classes, share the join link with enrolled students, and keep attendance and recordings organised.",
  },
  {
    icon: Bell,
    title: "WhatsApp, push & engagement",
    text: "Send WhatsApp templates and push notifications for enrolments, payments and test reminders, and keep students engaged with current affairs and jobs.",
  },
];

const FAQS = [
  {
    q: "What is TeachNest?",
    a: "TeachNest is a white-label platform for coaching institutes. It gives you a web admin panel to manage courses, teachers, students, tests and payments, plus a branded student mobile app that reflects everything you publish in the panel.",
  },
  {
    q: "Do students need a separate app?",
    a: "Yes — students learn on your institute's white-label app, available for Android. They sign in with their mobile number and OTP, buy courses, watch lectures, take tests and see their scores there. Everything in the app comes from your admin panel.",
  },
  {
    q: "How do payments work?",
    a: "Payments run through Cashfree. When a student buys a course or bundle, TeachNest creates a Cashfree order and verifies the payment on the server before granting access. You can track every order, refund and wallet transaction in the admin panel.",
  },
  {
    q: "Can I migrate from ClassWalla or WordPress?",
    a: "Yes. TeachNest covers the same core workflows — courses, categories, test series, students, orders and banners — so your content can be moved across. Talk to us about your current setup and we will help you plan the move.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. The Starter plan is free to start, and paid plans include a 14-day free trial. There is no setup fee, and no credit card is required to create your institute account.",
  },
  {
    q: "Who owns my institute's data?",
    a: "You do. Your courses, students, orders and content belong to your institute. TeachNest stores them securely under your institute's account, and only your authorised staff can access them through role-based permissions.",
  },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white" aria-hidden>
        <GraduationCap size={18} />
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">TeachNest</span>
    </Link>
  );
}

/** CSS-only preview of the real admin panel — labelled sample numbers, not real data. */
function DashboardMock() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const stats = [
    { label: "Total Students", value: 128 },
    { label: "Total Courses", value: 12 },
    { label: "Total Orders", value: 45 },
  ];
  const courses = [
    { title: "Physics — Class 11", meta: "12 subjects • 48 videos" },
    { title: "Chemistry — Class 12", meta: "10 subjects • 36 videos" },
    { title: "Mathematics — Class 10", meta: "8 subjects • 30 videos" },
  ];
  return (
    <div ref={ref} className="overflow-hidden rounded-[10px] border border-stone-200 bg-white text-left shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300 dark:bg-stone-700" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300 dark:bg-stone-700" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300 dark:bg-stone-700" aria-hidden />
        <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">teachnest — Admin Panel</span>
      </div>
      <div className="flex">
        <div className="hidden w-44 shrink-0 flex-col gap-1 border-r border-stone-200 p-3 sm:flex dark:border-stone-800">
          {["Dashboard", "Courses", "Test Series", "Students", "Orders", "Settings"].map((item, i) => (
            <span
              key={item}
              className={`rounded-lg px-3 py-2 text-[13px] font-medium ${
                i === 1 ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : "text-stone-600 dark:text-stone-400"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <p className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">Good morning, Demo Academy</p>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Here is what is happening at your institute today.</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 60} className="h-full">
                <div className="h-full rounded-[10px] border border-stone-200 p-3 dark:border-stone-800">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">{stat.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-100">
                    <CountUp value={stat.value} start={inView} />
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={180}>
            <div className="mt-4 rounded-[10px] border border-stone-200 dark:border-stone-800">
            {courses.map((c, i) => (
              <div
                key={c.title}
                className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-stone-200 dark:border-stone-800" : ""}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white" aria-hidden>
                  <Play size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-stone-900 dark:text-stone-100">{c.title}</span>
                  <span className="block text-xs text-stone-500 dark:text-stone-400">{c.meta}</span>
                </span>
                <span className="ml-auto hidden text-xs font-medium text-brand-700 sm:block dark:text-brand-300">View</span>
              </div>
            ))}
          </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getToken()));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      {/* Top nav */}
      <header className={`sticky top-0 z-40 border-b border-stone-200 bg-white transition-shadow duration-300 dark:border-stone-800 dark:bg-stone-900 ${scrolled ? "shadow-sm" : ""}`}>
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
          <Wordmark />
          <nav className="ml-8 hidden items-center gap-6 md:flex" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-stone-600 transition-colors duration-300 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {signedIn ? (
              <Link href="/dashboard">
                <Button className={BTN_HOVER}>Go to dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="secondary" className={BTN_HOVER}>Log in</Button>
                </Link>
                <Link href="/signup">
                  <Button className={BTN_HOVER}>Get started</Button>
                </Link>
              </>
            )}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 md:hidden dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-stone-200 px-4 py-3 md:hidden dark:border-stone-800" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  {l.label}
                </a>
              ))}
              {!signedIn && (
                <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                  Log in
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-16 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
                <Sparkles size={13} className="text-brand-700 dark:text-brand-300" aria-hidden />
                Built for coaching institutes in India
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                Run your entire coaching institute from one place
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-400 sm:text-lg">
                TeachNest gives you an admin panel, test series, live classes and a white-label
                student app — with payments through Cashfree — so you can teach, test and get
                paid without juggling five different tools.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup">
                  <Button className={`h-11 px-5 text-[15px] ${BTN_HOVER}`}>
                    Start free trial <ArrowRight size={16} aria-hidden />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button variant="secondary" className={`h-11 px-5 text-[15px] ${BTN_HOVER}`}>
                    See how it works
                  </Button>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-4 text-[13px] text-stone-500 dark:text-stone-400">
                No credit card required &bull; Set up in minutes &bull; Free to start
              </p>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <div className="mx-auto mt-12 max-w-4xl">
              <DashboardMock />
              <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-400">
                A preview of the TeachNest admin panel — the same panel your staff will use every day.
              </p>
              <p className="mt-1 text-center text-xs text-stone-500 dark:text-stone-400">
                Sample preview — your dashboard will show your institute&apos;s real numbers.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Features */}
        <section id="features" className="border-y border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <Reveal>
            <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
              <p className="text-xs font-medium uppercase tracking-wider text-brand-700 dark:text-brand-300">Features</p>
              <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything an institute needs, in one system
              </h2>
              <p className="mt-2 max-w-2xl text-[15px] text-stone-600 dark:text-stone-400">
                From the first course you publish to the last fee you collect, TeachNest keeps
                content, students and payments connected.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f, i) => (
                  <Reveal key={f.title} delay={(i % 3) * 60} className="h-full">
                    <div className={`h-full rounded-[10px] border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 ${CARD_HOVER}`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400" aria-hidden>
                        <f.icon size={18} />
                      </span>
                      <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{f.text}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-700 dark:text-brand-300">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Live in three steps</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  n: "1",
                  title: "Create your institute",
                  text: "Sign up, add your institute details and invite your teachers. Your admin panel is ready in minutes — no setup fee, no installation.",
                },
                {
                  n: "2",
                  title: "Add courses, tests & teachers",
                  text: "Upload video lectures, organise them into subjects and topics, build test series, and generate question papers with AI.",
                },
                {
                  n: "3",
                  title: "Students learn, you get paid",
                  text: "Students use your branded app to buy courses, watch lectures and take tests. Payments arrive through Cashfree, tracked order by order.",
                },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 60} className="h-full">
                  <div className={`h-full rounded-[10px] border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 ${CARD_HOVER}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-semibold text-white" aria-hidden>
                      {s.n}
                    </span>
                    <h3 className="mt-4 text-base font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Product sections */}
        <section className="border-y border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <Reveal>
            <div className="mx-auto max-w-[1200px] space-y-16 px-4 py-16 sm:px-6">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700 dark:text-brand-300">Admin panel &amp; student app</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">The panel is the master. The app is its reflection.</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
                  Change a course, publish a test or update a banner in the admin panel and it
                  appears in the student app. Purchases, test attempts and submissions flow
                  straight back into the panel.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {["Courses, subjects, topics and videos in one structure", "Test series, assignments, notes, e-books and previous papers", "Students, leads, orders and banners — all in one place", "Role-based permissions for your staff"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[10px] border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-950">
                <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Admin panel</p>
                <div className="mt-3 space-y-2">
                  {["Courses", "Test Series", "Students", "Orders"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-medium dark:border-stone-800 dark:bg-stone-900">
                      {item}
                      <ArrowRight size={15} className="text-stone-400" aria-hidden />
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-2 text-[13px] text-stone-500 dark:text-stone-400">
                  <Smartphone size={15} aria-hidden /> Reflects instantly in your branded student app
                </p>
              </div>
            </div>

            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="rounded-[10px] border border-stone-200 bg-stone-50 p-5 md:order-1 dark:border-stone-800 dark:bg-stone-950">
                <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Payments &amp; wallet</p>
                <div className="mt-3 space-y-2">
                  {[
                    { icon: IndianRupee, label: "Cashfree checkout for courses & bundles" },
                    { icon: BarChart3, label: "Every order tracked, with payment status" },
                    { icon: Wallet, label: "Wallet top-up and storage billing" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-medium dark:border-stone-800 dark:bg-stone-900">
                      <r.icon size={16} className="shrink-0 text-stone-500 dark:text-stone-400" aria-hidden />
                      {r.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:order-2">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700 dark:text-brand-300">Payments</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Sell courses, get paid, keep track</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
                  Students pay through Cashfree and get access only after the payment is verified
                  on the server. You see every order, its payment status and your wallet balance
                  without opening another tool.
                </p>
              </div>
            </div>

            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700 dark:text-brand-300">TeachNest AI</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Question papers, generated from your syllabus</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
                  Upload a syllabus or paste your notes, choose the topic, class and difficulty,
                  and the AI question-paper generator drafts MCQs and short-answer questions.
                  You review and edit every question before saving it to a test series.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {["Upload PDF, Word, Excel or text — or paste content directly", "MCQ and short-answer questions, up to 20 at a time", "Edit drafts, then save straight into a test series"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[10px] border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-950">
                <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">AI question-paper generator</p>
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm dark:border-stone-800 dark:bg-stone-900">
                    <p className="font-medium">Which organelle is known as the powerhouse of the cell?</p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">MCQ • Biology • Class 10 • Medium</p>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm dark:border-stone-800 dark:bg-stone-900">
                    <p className="font-medium">Explain the difference between speed and velocity.</p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Short answer • Physics • Class 11 • Easy</p>
                  </div>
                </div>
                <p className="mt-4 flex items-center gap-2 text-[13px] text-stone-500 dark:text-stone-400">
                  <Sparkles size={15} aria-hidden /> Drafts only — a teacher approves every question
                </p>
              </div>
            </div>
          </div>
          </Reveal>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-700 dark:text-brand-300">Pricing</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Simple plans that grow with your institute</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-stone-600 dark:text-stone-400">
            Start free, then move up when your institute grows. Paid plans include a 14-day
            free trial and no setup fee.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Reveal delay={0} className="h-full">
              <div className={`h-full rounded-[10px] border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 ${CARD_HOVER}`}>
                <h3 className="text-base font-semibold tracking-tight">Starter</h3>
              <p className="mt-1 text-2xl font-semibold tracking-tight">Free to start</p>
              <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-400">For institutes getting started online.</p>
              <ul className="mt-5 space-y-2 text-sm text-stone-700 dark:text-stone-300">
                {["Up to 3 courses", "Up to 100 students", "Test series, notes & e-books", "Admin panel access"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 block">
                <Button variant="secondary" className={`w-full ${BTN_HOVER}`}>Start free</Button>
              </Link>
              </div>
            </Reveal>
            <Reveal delay={60} className="h-full">
              <div className="relative h-full rounded-[10px] border-2 border-brand-700 bg-white p-6 shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:shadow-md dark:bg-stone-900">
              <span className="absolute -top-3 left-6 rounded-md bg-brand-700 px-2 py-0.5 text-[11px] font-medium text-white">Most popular</span>
              <h3 className="text-base font-semibold tracking-tight">Growth</h3>
              <p className="mt-1 text-2xl font-semibold tracking-tight">Custom</p>
              <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-400">For growing institutes that sell online.</p>
              <ul className="mt-5 space-y-2 text-sm text-stone-700 dark:text-stone-300">
                {["Unlimited courses & students", "Cashfree payments & order tracking", "AI question-paper generator", "WhatsApp & push notifications", "Live classes & seminars"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 block">
                <Button className={`w-full ${BTN_HOVER}`}>Contact sales</Button>
              </Link>
              </div>
            </Reveal>
            <Reveal delay={120} className="h-full">
              <div className={`h-full rounded-[10px] border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 ${CARD_HOVER}`}>
                <h3 className="text-base font-semibold tracking-tight">Scale</h3>
              <p className="mt-1 text-2xl font-semibold tracking-tight">Custom</p>
              <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-400">For institutes that want their own brand everywhere.</p>
              <ul className="mt-5 space-y-2 text-sm text-stone-700 dark:text-stone-300">
                {["Everything in Growth", "White-label student app", "Priority support", "Onboarding help for your team"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 block">
                <Button variant="secondary" className={`w-full ${BTN_HOVER}`}>Contact sales</Button>
              </Link>
              </div>
            </Reveal>
          </div>
          <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
            Plan limits shown above are part of the plan design and may change as TeachNest evolves. Custom pricing is confirmed with you before billing starts.
          </p>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-y border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <Reveal>
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
              <p className="text-xs font-medium uppercase tracking-wider text-brand-700 dark:text-brand-300">FAQ</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Questions, answered</h2>
              <div className="mt-8 space-y-3">
                {FAQS.map((f, i) => (
                  <Reveal key={f.q} delay={(i % 3) * 60}>
                    <div className="rounded-[10px] border border-stone-200 dark:border-stone-800">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[15px] font-medium"
                        aria-expanded={openFaq === i}
                      >
                        {f.q}
                        <ChevronDown size={17} className={`shrink-0 text-stone-500 transition-transform duration-300 ease-out ${openFaq === i ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                      <div
                        className={`grid transition-all duration-300 ease-out ${openFaq === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                      >
                        <div className="overflow-hidden">
                          <p className="px-5 pb-5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{f.a}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="bg-brand-800 dark:bg-brand-950">
          <Reveal>
            <div className="mx-auto max-w-[1200px] px-4 py-16 text-center sm:px-6">
              <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Ready to run your institute on TeachNest?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[15px] text-brand-100">
                Create your institute account today. No credit card required, no setup fee.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup">
                  <Button variant="inverse" className={`h-11 px-5 text-[15px] ${BTN_HOVER}`}>Get started free</Button>
                </Link>
                <Link href="/login">
                  <Button variant="outlineLight" className={`h-11 px-5 text-[15px] ${BTN_HOVER}`}>Log in</Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <Reveal>
          <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
          <div className="grid gap-10 md:grid-cols-5">
            <div className="md:col-span-2">
              <Wordmark />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                TeachNest is the white-label platform for coaching institutes — admin panel,
                test series, live classes and a branded student app, with payments through Cashfree.
              </p>
              <p className="mt-4 flex items-center gap-2 text-[13px] text-stone-500 dark:text-stone-400">
                <MessageSquare size={14} aria-hidden /> Made for coaching institutes in India
              </p>
              <a
                href={ANDROID_APK_URL}
                className={`mt-5 inline-flex items-center gap-2 rounded-xl bg-[#312e81] px-4 py-2.5 text-sm font-semibold text-white ${BTN_HOVER}`}
              >
                <Smartphone size={16} aria-hidden /> Download Android app (APK)
              </a>
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                For students — install directly, no Play Store needed. v3.1.0, ~65 MB.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  { label: "Features", href: "#features" },
                  { label: "How it works", href: "#how-it-works" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "FAQ", href: "#faq" },
                  { label: "Android app (APK)", href: ANDROID_APK_URL },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Company</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/signup" className="text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Get started</Link>
                </li>
                <li>
                  <Link href="/login" className="text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Log in</Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Admin panel</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">Legal</p>
              <ul className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-400">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Refund Policy</li>
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                Full policies are available inside the admin panel under Account Settings.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-6 text-[13px] text-stone-500 dark:border-stone-800 dark:text-stone-400">
            <span>&copy; 2026 TeachNest</span>
            <span>Learn. Practice. Achieve.</span>
          </div>
        </div>
        </Reveal>
      </footer>
    </div>
  );
}
