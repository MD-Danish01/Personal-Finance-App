import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 bg-background text-foreground transition-colors">
      <div className="w-full max-w-md rounded-3xl bg-card border border-card-border p-7 shadow-card space-y-6">
        <div>
          <div className="mb-2.5 text-xs font-bold uppercase tracking-wider text-primary">
            Personal Finance Assistant
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            Plan your money, track actual cashflow, and build long-term wealth with confidence.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/home" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-card-border bg-muted-bg px-4 py-3.5 text-sm font-bold text-foreground hover:bg-card-border/40 transition-all shadow-xs cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        <p className="text-center text-[11px] text-muted">
          Secured by Auth.js & Google OAuth 2.0
        </p>
      </div>
    </main>
  );
}