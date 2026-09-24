"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ChangePasswordModal } from "@/components/ui/ChangePasswordModal";

interface SecurityPrivacyButtonProps {
  userEmail: string;
}

export function SecurityPrivacyButton({ userEmail }: SecurityPrivacyButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left text-foreground rounded-xl hover:bg-muted-bg transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Icon name="shield" size={18} className="text-muted" />
          <span className="text-sm font-medium">Security &amp; Privacy</span>
        </div>
        <Icon name="chevron-right" size={16} className="text-muted" />
      </button>

      {open && (
        <ChangePasswordModal
          userEmail={userEmail}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
