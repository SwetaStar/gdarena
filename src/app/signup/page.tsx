import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your GDArena account
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Free GD prep and daily news for MBA aspirants.
        </p>
      </div>
      <SignupForm />
    </main>
  );
}
