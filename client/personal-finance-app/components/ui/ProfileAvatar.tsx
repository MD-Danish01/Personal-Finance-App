import Link from "next/link";
import Image from "next/image";

interface ProfileAvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "lg";
}

export function ProfileAvatar({ name, image, size = "sm" }: ProfileAvatarProps) {
  const dimensions = size === "lg" ? "h-14 w-14 text-2xl" : "h-8 w-8 text-sm";
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <Link href="/profile" aria-label="Profile" className="flex items-center justify-center">
      {image ? (
        <div className={`relative ${dimensions} overflow-hidden rounded-full`}>
          <Image
            src={image}
            alt={name ?? "Profile"}
            fill
            sizes={size === "lg" ? "56px" : "32px"}
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className={`flex ${dimensions} items-center justify-center rounded-full bg-brand-blue text-white font-semibold`}>
          {initial}
        </div>
      )}
    </Link>
  );
}