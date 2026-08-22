import Link from "next/link";

interface ProfileAvatarProps {
  name: string;
}

export function ProfileAvatar({ name }: ProfileAvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <Link href="/profile" aria-label="Profile" className="flex items-center justify-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white text-sm font-semibold">
        {initial}
      </div>
    </Link>
  );
}