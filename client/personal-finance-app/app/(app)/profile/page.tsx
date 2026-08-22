import { auth } from "@/auth";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { handleSignOut } from "./actions";

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;
  const name = user?.name ?? "User";
  const email = user?.email ?? "—";

  return (
    <div className="px-5 pb-4">
      <header className="flex items-center justify-between px-1 py-5">
        <h1 className="text-[22px] font-bold tracking-tight">Profile</h1>
      </header>

      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue text-white text-2xl font-bold">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{name}</h2>
          <p className="mt-1 text-sm text-muted truncate">{email}</p>
        </div>
      </Card>

      <section className="mt-7">
        <h3 className="mb-3 px-1 text-sm font-semibold text-muted uppercase tracking-wide">
          Financial profile
        </h3>
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Monthly income</span>
            <span className="text-sm font-bold">—</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Active plan</span>
            <span className="text-sm font-semibold text-brand-green">—</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Savings goals</span>
            <span className="text-sm font-semibold">—</span>
          </div>
        </Card>
      </section>

      <section className="mt-7">
        <h3 className="mb-3 px-1 text-sm font-semibold text-muted uppercase tracking-wide">
          Account
        </h3>
        <Card className="space-y-3 p-4">
          <button className="flex w-full items-center justify-between gap-3 p-2 text-left text-foreground rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="user" size={20} />
              <span className="font-medium">Personal information</span>
            </div>
            <Icon name="chevron-right" size={18} className="text-muted" />
          </button>
          <button className="flex w-full items-center justify-between gap-3 p-2 text-left text-foreground rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="shield" size={20} />
              <span className="font-medium">Security</span>
            </div>
            <Icon name="chevron-right" size={18} className="text-muted" />
          </button>
          <button className="flex w-full items-center justify-between gap-3 p-2 text-left text-foreground rounded-lg hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="bell" size={20} />
              <span className="font-medium">Notifications</span>
            </div>
            <Icon name="chevron-right" size={18} className="text-muted" />
          </button>
        </Card>
      </section>

      <section className="mt-7">
        <h3 className="mb-3 px-1 text-sm font-semibold text-muted uppercase tracking-wide">
          Actions
        </h3>
        <Card className="p-4">
          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-600 font-medium hover:bg-red-100 transition-colors"
            >
              <Icon name="log-out" size={18} />
              Sign out
            </button>
          </form>
        </Card>
      </section>

      <p className="mt-6 text-center text-xs text-muted">
        Version 1.0.0
      </p>
    </div>
  );
}