"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;

function subscribe() {
  return () => {};
}

function getLastLogin() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("spendly_last_login");
}

function getServerSnapshot() {
  return null;
}

export default function LandingEntry({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const lastLogin = useSyncExternalStore(
    subscribe,
    getLastLogin,
    getServerSnapshot
  );

  useEffect(() => {
    if (!lastLogin) {
      return;
    }

    const lastLoginTime = Number(lastLogin);

    if (!Number.isFinite(lastLoginTime)) {
      return;
    }

    const elapsed = Date.now() - lastLoginTime;

    if (elapsed >= 0 && elapsed <= FOUR_DAYS) {
      router.replace("/home");
    }
  }, [lastLogin, router]);

  return <>{children}</>;
}