"use client";

import type { CSSProperties, ReactNode } from "react";

export interface IconProps {
  readonly size?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly strokeWidth?: number;
}

const FIcon = ({
  children,
  size = 20,
  className,
  style,
  strokeWidth = 1.75,
}: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconDashboard = (p: IconProps) => (
  <FIcon {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </FIcon>
);

export const IconOrders = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M5 7h14l-1.2 11.1A2 2 0 0 1 15.8 20H8.2a2 2 0 0 1-2-1.9L5 7Z" />
    <path d="M9 7V5a3 3 0 0 1 6 0v2" />
  </FIcon>
);

export const IconChat = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 4v-4H6a2 2 0 0 1-2-2V6Z" />
    <circle cx="9" cy="10" r="0.6" fill="currentColor" />
    <circle cx="12" cy="10" r="0.6" fill="currentColor" />
    <circle cx="15" cy="10" r="0.6" fill="currentColor" />
  </FIcon>
);

export const IconWallet = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" />
    <path d="M3 7.5V17a3 3 0 0 0 3 3h13a1 1 0 0 0 1-1v-4" />
    <path d="M14 12h7v4h-7a2 2 0 0 1 0-4Z" />
    <circle cx="16.5" cy="14" r="0.9" fill="currentColor" />
  </FIcon>
);

export const IconProfile = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6" />
  </FIcon>
);

export const IconBell = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M6 10a6 6 0 1 1 12 0v3l1.5 3h-15L6 13v-3Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </FIcon>
);

export const IconSearch = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </FIcon>
);

export const IconSettings = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="12" cy="12" r="2.5" />
    <path d="M19 12a7 7 0 0 0-.15-1.4l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2.4-1.4L13.5 2h-3l-.55 2.5A7 7 0 0 0 7.55 5.9L5.15 5 3.15 8.4l2 1.6A7 7 0 0 0 5 12c0 .5.05 1 .15 1.4l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2.4 1.4L10.5 22h3l.55-2.5a7 7 0 0 0 2.4-1.4l2.4.9 2-3.4-2-1.6c.1-.4.15-.9.15-1.4Z" />
  </FIcon>
);

export const IconSpark = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.5 5.5l3.5 3.5M15 15l3.5 3.5M5.5 18.5 9 15M15 9l3.5-3.5" />
  </FIcon>
);

export const IconShield = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M12 3 4.5 6v6c0 4.5 3 8 7.5 9 4.5-1 7.5-4.5 7.5-9V6L12 3Z" />
    <path d="m8.5 12 2.5 2.5L16 10" />
  </FIcon>
);

export const IconLightning = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
  </FIcon>
);

export const IconCompass = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.5 8.5-2 5.5-5 2 2-5.5 5-2Z" />
  </FIcon>
);

export const IconBook = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4Z" />
    <path d="M5 4v12a4 4 0 0 0 4 4" />
  </FIcon>
);

export const IconUsers = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c.8-3.3 3-5 6-5s5.2 1.7 6 5" />
    <circle cx="17" cy="7" r="2.5" />
    <path d="M16 14c2.8 0 4.8 1.5 5.5 4" />
  </FIcon>
);

export const IconCheck = (p: IconProps) => (
  <FIcon {...p}>
    <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />
  </FIcon>
);

export const IconArrowRight = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </FIcon>
);

export const IconArrowLeft = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </FIcon>
);

export const IconArrowUp = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </FIcon>
);

export const IconArrowDown = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </FIcon>
);

export const IconPlus = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M12 5v14M5 12h14" />
  </FIcon>
);

export const IconMinus = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M5 12h14" />
  </FIcon>
);

export const IconClose = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </FIcon>
);

export const IconPaperclip = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M20 12.5 12.5 20a5 5 0 0 1-7-7L13 5.5a3.5 3.5 0 0 1 5 5l-7.5 7.5a2 2 0 0 1-3-3l6.5-6.5" />
  </FIcon>
);

export const IconSend = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M21 3 3 10l7 3 3 7 8-17Z" />
    <path d="m10 13 5-5" />
  </FIcon>
);

export const IconMic = (p: IconProps) => (
  <FIcon {...p}>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </FIcon>
);

export const IconFile = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
    <path d="M14 3v6h6" />
  </FIcon>
);

export const IconClock = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </FIcon>
);

export const IconStar = (p: IconProps) => (
  <FIcon {...p}>
    <path d="m12 3 2.7 5.9 6.3.6-4.8 4.4 1.4 6.4L12 17l-5.6 3.3 1.4-6.4L3 9.5l6.3-.6L12 3Z" />
  </FIcon>
);

export const IconStarFilled = ({ size = 16, className, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
    focusable="false"
  >
    <path d="m12 3 2.7 5.9 6.3.6-4.8 4.4 1.4 6.4L12 17l-5.6 3.3 1.4-6.4L3 9.5l6.3-.6L12 3Z" />
  </svg>
);

export const IconLock = (p: IconProps) => (
  <FIcon {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </FIcon>
);

export const IconPhone = (p: IconProps) => (
  <FIcon {...p}>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <path d="M10 19h4" />
  </FIcon>
);

export const IconArrowUpRight = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </FIcon>
);

export const IconExternalLink = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
  </FIcon>
);

export const IconChevronDown = (p: IconProps) => (
  <FIcon {...p}>
    <path d="m6 9 6 6 6-6" />
  </FIcon>
);

export const IconChevronUp = (p: IconProps) => (
  <FIcon {...p}>
    <path d="m6 15 6-6 6 6" />
  </FIcon>
);

export const IconChevronLeft = (p: IconProps) => (
  <FIcon {...p}>
    <path d="m15 18-6-6 6-6" />
  </FIcon>
);

export const IconChevronRight = (p: IconProps) => (
  <FIcon {...p}>
    <path d="m9 6 6 6-6 6" />
  </FIcon>
);

export const IconCalendar = (p: IconProps) => (
  <FIcon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </FIcon>
);

export const IconEye = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </FIcon>
);

export const IconEyeOff = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A11.3 11.3 0 0 1 12 6c6 0 10 6 10 6a17.5 17.5 0 0 1-3.6 4.4M6.6 6.6A17 17 0 0 0 2 12s4 6 10 6a11.5 11.5 0 0 0 4.4-.9" />
    <path d="M9.9 9.9a3 3 0 1 0 4.2 4.2" />
  </FIcon>
);

export const IconEdit = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7" />
    <path d="m18 2 4 4-11 11H7v-4L18 2Z" />
  </FIcon>
);

export const IconTrash = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="m6 6 1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    <path d="M10 11v6M14 11v6" />
  </FIcon>
);

export const IconCopy = (p: IconProps) => (
  <FIcon {...p}>
    <rect x="8" y="8" width="13" height="13" rx="2" />
    <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
  </FIcon>
);

export const IconUpload = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m17 8-5-5-5 5" />
    <path d="M12 3v12" />
  </FIcon>
);

export const IconDownload = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </FIcon>
);

export const IconRefresh = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 4v5h-5" />
  </FIcon>
);

export const IconAlert = (p: IconProps) => (
  <FIcon {...p}>
    <path d="m12 3 10 18H2L12 3Z" />
    <path d="M12 9v5M12 17.5v.5" />
  </FIcon>
);

export const IconInfo = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v5h1" />
  </FIcon>
);

export const IconCircleCheck = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </FIcon>
);

export const IconCircleX = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </FIcon>
);

export const IconHeart = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M12 21s-7-5-7-11a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 6-7 11-7 11Z" />
  </FIcon>
);

export const IconBookmark = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M6 3h12v18l-6-4-6 4V3Z" />
  </FIcon>
);

export const IconMore = (p: IconProps) => (
  <FIcon {...p}>
    <circle cx="6" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="18" cy="12" r="1.2" fill="currentColor" />
  </FIcon>
);

export const IconLogout = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </FIcon>
);

export const IconLink = (p: IconProps) => (
  <FIcon {...p}>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </FIcon>
);

export const IconBriefcase = (p: IconProps) => (
  <FIcon {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M3 12h18" />
  </FIcon>
);

export const IconLogo = ({ size = 28, className, style }: { size?: number; className?: string; style?: CSSProperties }) => {
  const id = `flk-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true" className={className} style={style}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B6D9FC" />
          <stop offset="1" stopColor="#4F2BC7" />
        </linearGradient>
      </defs>
      <path
        d="M6 4v20M6 11c0-3 2.5-5 5.5-5h3M6 16c0-2.5 2-4.5 4.5-4.5h2"
        stroke={`url(#${id})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="18.5" cy="7" r="2.2" fill={`url(#${id})`} />
    </svg>
  );
};
