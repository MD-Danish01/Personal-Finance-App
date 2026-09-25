import { auth } from "@/auth";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { FinancialProfileCard } from "@/components/ui/FinancialProfileCard";
import { ThemeSelectorCard } from "@/components/ui/ThemeSelectorCard";
import { handleSignOut } from "./actions";
import { ComingSoonButton } from "@/components/ui/ComingSoonDialog";
import { SecurityPrivacyButton } from "@/components/ui/SecurityPrivacyButton";

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;
  const name = user?.name ?? "User";
  const email = user?.email ?? "—";
  const image = user?.image;

  return (
    <div className="profile-page pb-8">
      <div
        className="dashboard-enter"
        style={{ animationDelay: "0ms" }}
      >
        <header className="flex items-center justify-between px-1 py-5">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">Profile & Settings</h1>
            <p className="text-xs text-muted mt-0.5">Manage your financial baseline and preferences</p>
          </div>
        </header>
      </div>

      {/* User Info Card */}
      <div
        className="dashboard-enter"
        style={{ animationDelay: "70ms" }}
      >
        <Card className="profile-user-card flex items-center gap-3.5 p-4">
          {image ? (
            <div className="profile-avatar-pulse relative h-14 w-14 overflow-hidden rounded-2xl ring-2 ring-primary/20 shadow-xs">
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
            <div className="profile-avatar-pulse flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-xs">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{name}</h2>
            <p className="text-xs text-muted truncate mt-0.5">{email}</p>
          </div>
        </Card>
      </div>

      {/* Theme & Appearance Section */}
      <section
        className="dashboard-enter mt-6"
        style={{ animationDelay: "140ms" }}
      >
        <div className="flex items-center gap-2 mb-3 px-1">
          <Icon name="palette" size={16} className="text-primary" />
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Theme & Appearance
          </h3>
        </div>
        <Card className="profile-section-card p-4">
          <ThemeSelectorCard />
        </Card>
      </section>

      {/* Financial Profile Section */}
      <section
        className="dashboard-enter mt-6"
        style={{ animationDelay: "210ms" }}
      >
        <div className="flex items-center gap-2 mb-3 px-1">
          <Icon name="wallet" size={16} className="text-primary" />
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Financial Baseline
          </h3>
        </div>
        <Card className="profile-section-card p-4">
          <FinancialProfileCard />
        </Card>
      </section>

      {/* Account Section */}
      <section
        className="dashboard-enter mt-6"
        style={{ animationDelay: "280ms" }}
      >
        <div className="flex items-center gap-2 mb-3 px-1">
          <Icon name="settings" size={16} className="text-primary" />
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Account & Security
          </h3>
        </div>
        <Card className="profile-section-card space-y-1 p-2">
          <ComingSoonButton>
            <div className="profile-nav-item flex w-full items-center justify-between gap-3 p-3 text-left text-foreground rounded-xl hover:bg-muted-bg transition-all">
              <div className="flex items-center gap-3">
                <Icon name="user" size={18} className="text-muted" />
                <span className="text-sm font-medium">Personal information</span>
              </div>
              <Icon name="chevron-right" size={16} className="text-muted" />
            </div>
          </ComingSoonButton>
          <SecurityPrivacyButton userEmail={email} />
          <ComingSoonButton>
            <div className="profile-nav-item flex w-full items-center justify-between gap-3 p-3 text-left text-foreground rounded-xl hover:bg-muted-bg transition-all">
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
      <section
        className="dashboard-enter mt-6"
        style={{ animationDelay: "350ms" }}
      >
        <Card className="profile-section-card p-3">
          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 dark:bg-red-500/15 px-4 py-3 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 cursor-pointer shadow-xs"
            >
              <Icon name="log-out" size={17} />
              Sign out
            </button>
          </form>
        </Card>
      </section>

      <div
        className="dashboard-enter mt-6 text-center"
        style={{ animationDelay: "420ms" }}
      >
        <p className="text-[11px] text-muted">
          Personal Finance Assistant • v1.0.0
        </p>
      </div>
    </div>
  );
}
