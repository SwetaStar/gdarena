"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveInterests, saveKnowledgeLevel } from "@/app/actions/onboarding";
import { INTERESTS, type KnowledgeLevel } from "@/lib/knowledge";
import { setStoredGeminiKey, useStoredGeminiKey } from "@/lib/gemini-key";
import { FeedManager, type Feed } from "@/components/feed-manager";

const KNOWLEDGE_OPTIONS: {
  value: KnowledgeLevel;
  label: string;
  example: string;
}[] = [
  {
    value: "beginner",
    label: "Beginner",
    example: "e.g. I read headlines but skip the business page.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    example:
      "e.g. I follow RBI rate decisions and can explain what repo rate means.",
  },
  {
    value: "aware",
    label: "Aware",
    example:
      "e.g. I track policy shifts and can debate their second-order effects.",
  },
];

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40";

export function OnboardingWizard({
  initialKnowledgeLevel,
  initialInterests,
  initialFeeds,
}: {
  initialKnowledgeLevel: KnowledgeLevel | null;
  initialInterests: string[];
  initialFeeds: Feed[];
}) {
  const [step, setStep] = useState(0);
  const totalSteps = 4;

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <ol className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <li
            key={i}
            className={`h-1.5 w-8 rounded-full ${
              i <= step ? "bg-foreground" : "bg-black/10 dark:bg-white/15"
            }`}
          />
        ))}
      </ol>

      {step === 0 && (
        <KnowledgeStep
          initialValue={initialKnowledgeLevel}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <InterestsStep
          initialValue={initialInterests}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <FeedsStep initialFeeds={initialFeeds} onNext={() => setStep(3)} />
      )}
      {step === 3 && <GeminiKeyStep />}
    </div>
  );
}

function StepShell({
  title,
  skippable,
  onSkip,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
  children,
}: {
  title: string;
  skippable?: boolean;
  onSkip?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
      <div className="flex items-center justify-between gap-3">
        {skippable ? (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-black/50 underline dark:text-white/50"
          >
            Skip
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}

function KnowledgeStep({
  initialValue,
  onNext,
}: {
  initialValue: KnowledgeLevel | null;
  onNext: () => void;
}) {
  const [value, setValue] = useState<KnowledgeLevel | null>(initialValue);
  const [isPending, startTransition] = useTransition();

  return (
    <StepShell
      title="Where are you starting from?"
      skippable
      onSkip={onNext}
      continueDisabled={!value || isPending}
      onContinue={() => {
        if (!value) return;
        startTransition(async () => {
          await saveKnowledgeLevel(value);
          onNext();
        });
      }}
    >
      <div className="flex flex-col gap-2">
        {KNOWLEDGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setValue(opt.value)}
            className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
              value === opt.value
                ? "border-foreground"
                : "border-black/15 dark:border-white/20"
            }`}
          >
            <span className="font-medium">{opt.label}</span>
            <span className="text-black/50 dark:text-white/50">
              {opt.example}
            </span>
          </button>
        ))}
      </div>
    </StepShell>
  );
}

function InterestsStep({
  initialValue,
  onNext,
}: {
  initialValue: string[];
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialValue);
  const [isPending, startTransition] = useTransition();

  function toggle(interest: string) {
    setSelected((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  return (
    <StepShell
      title="What do you want to follow?"
      skippable
      onSkip={onNext}
      continueDisabled={isPending}
      onContinue={() => {
        startTransition(async () => {
          await saveInterests(selected);
          onNext();
        });
      }}
    >
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((interest) => (
          <button
            key={interest}
            type="button"
            onClick={() => toggle(interest)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selected.includes(interest)
                ? "border-foreground bg-foreground text-background"
                : "border-black/15 dark:border-white/20"
            }`}
          >
            {interest}
          </button>
        ))}
      </div>
    </StepShell>
  );
}

function FeedsStep({
  initialFeeds,
  onNext,
}: {
  initialFeeds: Feed[];
  onNext: () => void;
}) {
  return (
    <StepShell title="Your news sources" skippable onSkip={onNext} onContinue={onNext}>
      <FeedManager initialFeeds={initialFeeds} />
    </StepShell>
  );
}

function GeminiKeyStep() {
  const router = useRouter();
  const storedKey = useStoredGeminiKey();
  // null = untouched (show the stored key, if any); once the user types,
  // this takes over and stops tracking the store.
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const value = draft ?? storedKey ?? "";
  // An untouched, already-verified key from a previous visit counts as OK.
  const verified = status === "ok" || (draft === null && Boolean(storedKey));

  async function handleTest() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setStatus("testing");
    setError(null);

    try {
      const res = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed }),
      });
      const data: { ok: boolean; error?: string; rateLimited?: boolean } =
        await res.json();

      if (data.ok) {
        setStatus("ok");
        setStoredGeminiKey(trimmed);
      } else {
        setStatus("error");
        setError(
          data.rateLimited
            ? "Gemini rate limit hit — wait 30s and try again."
            : data.error ?? "Could not verify this key."
        );
      }
    } catch {
      setStatus("error");
      setError("Could not reach the server. Try again.");
    }
  }

  function handleFinish() {
    router.push("/news");
  }

  return (
    <StepShell
      title="Connect your free Gemini key"
      onContinue={handleFinish}
      continueLabel="Finish"
      continueDisabled={!verified}
    >
      <p className="text-sm text-black/60 dark:text-white/60">
        GDArena runs on your own free Gemini API key so it costs nothing to
        use.{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          Get a free key from Google AI Studio →
        </a>
      </p>

      <div className="flex flex-col gap-2">
        <input
          type="password"
          placeholder="Paste your Gemini API key"
          value={value}
          onChange={(e) => {
            setDraft(e.target.value);
            setStatus("idle");
          }}
          className={inputClass}
        />
        <button
          type="button"
          onClick={handleTest}
          disabled={!value.trim() || status === "testing"}
          className="self-start rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
        >
          {status === "testing" ? "Testing…" : "Test key"}
        </button>

        {verified && (
          <p className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
            <span aria-hidden>✓</span> Key verified
          </p>
        )}
        {status === "error" && error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <p className="text-xs text-black/45 dark:text-white/45">
          Stored only in this browser (localStorage). Never sent to our
          database or logged.
        </p>
      </div>
    </StepShell>
  );
}
