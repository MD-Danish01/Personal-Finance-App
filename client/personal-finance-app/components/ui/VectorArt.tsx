import React from "react";

interface VectorArtProps {
  className?: string;
  size?: number | string;
}

/**
 * Razorpay Gateway Hero Art
 * A 3D isometric stylized card with holographic chip, floating shield, and glowing particles.
 */
export function RazorpayGatewayHeroArt({ className = "", size = 160 }: VectorArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Glow & Backdrop Gradients */}
        <radialGradient id="rzpGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cardGradPrimary" x1="20" y1="40" x2="180" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="cardGradAccent" x1="30" y1="45" x2="170" y2="145" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
        <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="cardShadow" x="10" y="30" width="180" height="150" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#312e81" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Ambient background glow */}
      <circle cx="100" cy="100" r="85" fill="url(#rzpGlow)" />

      {/* Floating geometric decorative particles */}
      <circle cx="34" cy="46" r="4" fill="#a5b4fc" opacity="0.6" className="animate-pulse" />
      <circle cx="172" cy="52" r="3" fill="#67e8f9" opacity="0.7" />
      <polygon points="175,145 180,154 170,154" fill="#f472b6" opacity="0.6" />
      <circle cx="28" cy="148" r="3.5" fill="#fde047" opacity="0.8" />

      {/* Floating Sparkle Stars */}
      <path
        d="M165 30 L167 36 L173 38 L167 40 L165 46 L163 40 L157 38 L163 36 Z"
        fill="#fef08a"
        opacity="0.9"
      />
      <path
        d="M42 165 L43.5 169 L48 170.5 L43.5 172 L42 176 L40.5 172 L36 170.5 L40.5 169 Z"
        fill="#a7f3d0"
        opacity="0.8"
      />

      {/* Main 3D Angled Card Container */}
      <g filter="url(#cardShadow)">
        {/* Card Body */}
        <rect
          x="30"
          y="50"
          width="140"
          height="92"
          rx="14"
          fill="url(#cardGradPrimary)"
          stroke="url(#cardGradAccent)"
          strokeWidth="1.5"
        />

        {/* Decorative holographic card swooshes */}
        <path
          d="M30 105 C 70 85, 120 135, 170 100"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M45 142 C 85 110, 130 150, 170 125"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* EMV Smart Chip */}
        <rect x="46" y="70" width="22" height="17" rx="3.5" fill="url(#chipGrad)" />
        <rect x="48" y="74" width="18" height="9" rx="1.5" fill="none" stroke="#713f12" strokeWidth="0.8" opacity="0.6" />
        <line x1="57" y1="70" x2="57" y2="87" stroke="#713f12" strokeWidth="0.8" opacity="0.6" />

        {/* Contactless Wi-Fi Waves */}
        <path d="M78 74 A 6 6 0 0 1 78 84" stroke="rgba(255,255,255,0.8)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M83 71 A 11 11 0 0 1 83 87" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" fill="none" />

        {/* Monospace Card Number Dots */}
        <g fill="rgba(255,255,255,0.9)">
          <circle cx="48" cy="114" r="2.2" />
          <circle cx="55" cy="114" r="2.2" />
          <circle cx="62" cy="114" r="2.2" />
          <circle cx="69" cy="114" r="2.2" />

          <circle cx="80" cy="114" r="2.2" />
          <circle cx="87" cy="114" r="2.2" />
          <circle cx="94" cy="114" r="2.2" />
          <circle cx="101" cy="114" r="2.2" />

          <circle cx="112" cy="114" r="2.2" />
          <circle cx="119" cy="114" r="2.2" />
          <circle cx="126" cy="114" r="2.2" />
          <circle cx="133" cy="114" r="2.2" />
        </g>

        {/* Card Holder Name Line & Expiry */}
        <rect x="46" y="126" width="45" height="5" rx="2.5" fill="rgba(255,255,255,0.7)" />
        <rect x="100" y="126" width="22" height="5" rx="2.5" fill="rgba(255,255,255,0.5)" />

        {/* Dual Interlocking Brand Circles (Card Logo) */}
        <circle cx="146" cy="128" r="8" fill="#ef4444" opacity="0.9" />
        <circle cx="156" cy="128" r="8" fill="#f59e0b" opacity="0.9" />
      </g>

      {/* Floating Verified Security Shield Emblem (Bottom Left Overlay) */}
      <g transform="translate(132, 28)">
        <polygon
          points="18,0 36,7 36,25 18,36 0,25 0,7"
          fill="url(#shieldGrad)"
          stroke="#ffffff"
          strokeWidth="1.8"
        />
        <path
          d="M11 18 L16 23 L26 12"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/**
 * UPI Mobile Art
 * A modern smartphone with QR code, lightning pay icon, and fast transfer arrows.
 */
export function UpiMobileArt({ className = "", size = 140 }: VectorArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="upiGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="phoneBody" x1="40" y1="20" x2="140" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="48" y1="36" x2="132" y2="144" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <circle cx="90" cy="90" r="75" fill="url(#upiGlow)" />

      {/* Decorative Fast Flow Arrows */}
      <path
        d="M24 75 C 24 45, 60 25, 90 25"
        stroke="#60a5fa"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="4 4"
        opacity="0.7"
      />
      <path
        d="M156 105 C 156 135, 120 155, 90 155"
        stroke="#34d399"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="4 4"
        opacity="0.7"
      />

      {/* Smartphone Chassis */}
      <rect
        x="50"
        y="22"
        width="80"
        height="136"
        rx="18"
        fill="url(#phoneBody)"
        stroke="#475569"
        strokeWidth="2.5"
      />

      {/* Screen Area */}
      <rect
        x="56"
        y="32"
        width="68"
        height="116"
        rx="12"
        fill="url(#screenGrad)"
      />

      {/* Speaker Bar & Camera Notch */}
      <rect x="76" y="27" width="28" height="3" rx="1.5" fill="#64748b" />

      {/* Screen Elements: Mini QR & UPI Symbol */}
      <g transform="translate(68, 48)">
        <rect x="0" y="0" width="44" height="44" rx="8" fill="#ffffff" />
        {/* QR corners */}
        <rect x="5" y="5" width="12" height="12" rx="2" fill="#1e293b" />
        <rect x="7" y="7" width="8" height="8" rx="1" fill="#ffffff" />
        <rect x="9" y="9" width="4" height="4" fill="#1e293b" />

        <rect x="27" y="5" width="12" height="12" rx="2" fill="#1e293b" />
        <rect x="29" y="7" width="8" height="8" rx="1" fill="#ffffff" />
        <rect x="31" y="9" width="4" height="4" fill="#1e293b" />

        <rect x="5" y="27" width="12" height="12" rx="2" fill="#1e293b" />
        <rect x="7" y="29" width="8" height="8" rx="1" fill="#ffffff" />
        <rect x="9" y="31" width="4" height="4" fill="#1e293b" />

        {/* Center dot pattern */}
        <rect x="20" y="20" width="4" height="4" fill="#2563eb" />
        <rect x="27" y="27" width="6" height="6" fill="#1e293b" />
        <rect x="21" y="28" width="3" height="5" fill="#1e293b" />
      </g>

      {/* Amount Pill */}
      <rect x="66" y="102" width="48" height="16" rx="8" fill="rgba(255,255,255,0.2)" />
      <text x="90" y="114" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
        ₹ FAST PAY
      </text>

      {/* Floating Lightning Bolt Badge */}
      <g transform="translate(112, 102)">
        <circle cx="16" cy="16" r="16" fill="#0f172a" stroke="#eab308" strokeWidth="2" />
        <path
          d="M17 6 L10 17 L15 17 L13 26 L23 14 L18 14 Z"
          fill="url(#boltGrad)"
        />
      </g>
    </svg>
  );
}

/**
 * Transfer Success Celebration Art
 * Celebratory golden/emerald starburst and checkmark badge.
 */
export function TransferSuccessArt({ className = "", size = 150 }: VectorArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="successGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="badgeGrad" x1="30" y1="30" x2="150" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Sunburst Radiant Glow */}
      <circle cx="90" cy="90" r="80" fill="url(#successGlow)" />

      {/* Starburst rays */}
      <g stroke="#6ee7b7" strokeWidth="2" opacity="0.6" strokeLinecap="round">
        <line x1="90" y1="12" x2="90" y2="24" />
        <line x1="90" y1="156" x2="90" y2="168" />
        <line x1="12" y1="90" x2="24" y2="90" />
        <line x1="156" y1="90" x2="168" y2="90" />
        <line x1="35" y1="35" x2="44" y2="44" />
        <line x1="136" y1="136" x2="145" y2="145" />
        <line x1="35" y1="145" x2="44" y2="136" />
        <line x1="136" y1="44" x2="145" y2="35" />
      </g>

      {/* Floating Gold & Emerald Confetti */}
      <circle cx="48" cy="42" r="3.5" fill="#fbbf24" />
      <circle cx="138" cy="48" r="4" fill="#38bdf8" />
      <circle cx="32" cy="120" r="3" fill="#f472b6" />
      <circle cx="148" cy="116" r="3.5" fill="#fbbf24" />
      <polygon points="128,140 134,146 124,148" fill="#a78bfa" />
      <polygon points="50,140 56,134 52,146" fill="#34d399" />

      {/* Outer Pulse Ring */}
      <circle cx="90" cy="90" r="54" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeDasharray="6 6" opacity="0.8" />

      {/* Center Shield Badge */}
      <circle cx="90" cy="90" r="44" fill="url(#badgeGrad)" stroke="#ffffff" strokeWidth="3" />

      {/* Bold White Checkmark */}
      <path
        d="M68 90 L82 104 L114 74"
        stroke="#ffffff"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Empty Transfers Art
 * Minimalist vector graphic for empty transfer history.
 */
export function EmptyTransfersArt({ className = "", size = 130 }: VectorArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="emptyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#64748b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      <circle cx="80" cy="80" r="70" fill="url(#emptyGlow)" />

      {/* Flight trajectory dashed loop */}
      <path
        d="M32 110 C 20 60, 80 40, 100 70 C 115 90, 80 125, 60 115 C 40 105, 60 70, 115 50"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeDasharray="5 5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Paper airplane */}
      <g transform="translate(100, 36) rotate(15)">
        <polygon points="0,20 38,0 12,38 12,22" fill="url(#planeGrad)" />
        <polygon points="0,20 38,0 12,22" fill="#93c5fd" />
      </g>

      {/* Base wallet outline */}
      <rect x="42" y="90" width="76" height="48" rx="12" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      <rect x="42" y="90" width="76" height="16" rx="8" fill="#334155" />
      <circle cx="102" cy="114" r="5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Security & RBI Compliance Shield Art
 */
export function SecurityShieldArt({ className = "", size = 36 }: VectorArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <polygon
        points="24,2 44,10 44,24 24,46 4,24 4,10"
        fill="#10b981"
        fillOpacity="0.12"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Padlock inside shield */}
      <rect x="16" y="22" width="16" height="12" rx="3" fill="#10b981" />
      <path
        d="M19 22 V 17 C 19 14.2 21.2 12 24 12 C 26.8 12 29 14.2 29 17 V 22"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="24" cy="27" r="1.8" fill="#ffffff" />
    </svg>
  );
}

/**
 * Payment Network Mini Badges
 */
export function PaymentNetworkBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* VISA Badge */}
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#1a1f71] text-[10px] font-black tracking-wider shadow-2xs">
        VISA
      </span>
      {/* Mastercard Badge */}
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold shadow-2xs">
        <span className="h-2.5 w-2.5 rounded-full bg-[#eb001b] inline-block" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f79e1b] inline-block -ml-1.5 opacity-90" />
      </span>
      {/* RuPay Badge */}
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#097939] text-[10px] font-black tracking-tight shadow-2xs">
        RuPay<span className="text-[#092f61]">❯</span>
      </span>
      {/* UPI Badge */}
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-[#006633]/10 border border-[#006633]/20 text-[#006633] dark:text-emerald-400 text-[10px] font-bold shadow-2xs">
        UPI ⚡
      </span>
      {/* NetBanking Badge */}
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium">
        NetBanking
      </span>
    </div>
  );
}
