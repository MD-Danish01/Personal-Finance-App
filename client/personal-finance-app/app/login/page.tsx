import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 bg-background text-foreground transition-colors">
      <div className="w-full max-w-md rounded-3xl bg-card border border-card-border p-7 shadow-card space-y-6">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
            Personal Finance Assistant
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Welcome</h1>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            Plan your money, track actual cashflow, and build long-term wealth with confidence.
          </p>
        </div>

        <AuthForm />

        <p className="text-center text-[11px] text-muted">
          Secured by Auth.js • Google OAuth & Credentials
        </p>
      </div>
    </main>
  );
}