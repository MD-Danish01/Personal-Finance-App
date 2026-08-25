import { auth } from "@/auth";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { FinancialProfileCard } from "@/components/ui/FinancialProfileCard";
import { ThemeSelectorCard } from "@/components/ui/ThemeSelectorCard";
import { handleSignOut } from "./actions";
import { ComingSoonButton } from "@/components/ui/ComingSoonDialog";

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;
  const name = user?.name ?? "User";
  const email = user?.email ?? "—";
  const image = user?.image;

  return (
    <div className="px-5 pb-8">
      <header className="flex items-center justify-between px-1 py-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Profile & Settings</h1>
          <p className="text-xs text-muted mt-0.5">Manage your financial baseline and preferences</p>
        </div>
      </header>

      {/* User Info Card */}
      <Card className="flex items-center gap-3.5 p-4">
        {image ? (
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl ring-2 ring-primary/20">
            <Image
              src={image}
              alt={name}
              fill
              sizes="56px"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-sm">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{name}</h2>
          <p className="text-xs text-muted truncate mt-0.5">{email}</p>
        </div>
      </Card>

      {/* Theme & Appearance Section */}
      <section className="mt-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Icon name="palette" size={16} className="text-primary" />
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Theme & Appearance
          </h3>
        </div>
        <Card className="p-4">
          <ThemeSelectorCard />
        </Card>
      </section>

      {/* Financial Profile Section */}
      <section className="mt-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Icon name="wallet" size={16} className="text-primary" />
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Financial Baseline
          </h3>
        </div>
        <Card className="p-4">
          <FinancialProfileCard />
        </Card>
      </section>

      {/* Account Section */}
      <section className="mt-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Icon name="settings" size={16} className="text-primary" />
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Account & Security
          </h3>
        </div>
        <Card className="space-y-1 p-2">
          <ComingSoonButton>
            <div className="flex w-full items-center justify-between gap-3 p-3 text-left text-foreground rounded-xl hover:bg-muted-bg transition-colors">
              <div className="flex items-center gap-3">
                <Icon name="user" size={18} className="text-muted" />
                <span className="text-sm font-medium">Personal information</span>
              </div>
              <Icon name="chevron-right" size={16} className="text-muted" />
            </div>
          </ComingSoonButton>
          <ComingSoonButton>
            <div className="flex w-full items-center justify-between gap-3 p-3 text-left text-foreground rounded-xl hover:bg-muted-bg transition-colors">
              <div className="flex items-center gap-3">
                <Icon name="shield" size={18} className="text-muted" />
                <span className="text-sm font-medium">Security & Privacy</span>
              </div>
              <Icon name="chevron-right" size={16} className="text-muted" />
            </div>
          </ComingSoonButton>
          <ComingSoonButton>
            <div className="flex w-full items-center justify-between gap-3 p-3 text-left text-foreground rounded-xl hover:bg-muted-bg transition-colors">
              <div className="flex items-center gap-3">
                <Icon name="bell" size={18} className="text-muted" />
                <span className="text-sm font-medium">Notification Preferences</span>
              </div>
              <Icon name="chevron-right" size={16} className="text-muted" />
            </div>
          </ComingSoonButton>
        </Card>
      </section>

      {/* Sign out */}
      <section className="mt-6">
        <Card className="p-3">
          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 dark:bg-red-500/15 px-4 py-3 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all duration-150 cursor-pointer"
            >
              <Icon name="log-out" size={17} />
              Sign out
            </button>
          </form>
        </Card>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted">
        Personal Finance Assistant • v1.0.0
      </p>
    </div>
  );
}
