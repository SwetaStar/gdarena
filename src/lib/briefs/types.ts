export type KeyTerm = { term: string; meaning: string };

export type FrameworkLens = { name: string; why: string };

export type Brief = {
  plain: {
    what_happened: string;
    why_it_matters: string;
    key_terms: KeyTerm[];
  };
  mba: {
    what_happened: string;
    why_it_matters: string;
    arguments_for: string[];
    arguments_against: string[];
    data_points: string[];
    framework_lens: FrameworkLens;
  };
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isKeyTermArray(value: unknown): value is KeyTerm[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        v &&
        typeof v === "object" &&
        typeof (v as KeyTerm).term === "string" &&
        typeof (v as KeyTerm).meaning === "string"
    )
  );
}

/** Guards against malformed/partial JSON from the model before we cache or render it. */
export function isBrief(value: unknown): value is Brief {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const plain = v.plain as Record<string, unknown> | undefined;
  const mba = v.mba as Record<string, unknown> | undefined;

  if (
    !plain ||
    typeof plain.what_happened !== "string" ||
    typeof plain.why_it_matters !== "string" ||
    !isKeyTermArray(plain.key_terms)
  ) {
    return false;
  }

  if (
    !mba ||
    typeof mba.what_happened !== "string" ||
    typeof mba.why_it_matters !== "string" ||
    !isStringArray(mba.arguments_for) ||
    !isStringArray(mba.arguments_against) ||
    !isStringArray(mba.data_points) ||
    !mba.framework_lens ||
    typeof (mba.framework_lens as FrameworkLens).name !== "string" ||
    typeof (mba.framework_lens as FrameworkLens).why !== "string"
  ) {
    return false;
  }

  return true;
}
