import type { ReactNode } from "react";

export function NavIcon({ name, className = "size-4 shrink-0" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />,
    check: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.2l2.3 2.3 4.7-5" />,
    grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    link: <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7L12.7 18" />,
    bot: <path d="M12 8V5M8 8h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3zM9 13h.01M15 13h.01" />,
    sliders: <path d="M4 8h16M4 16h16M8 8v0M16 16v0M9 6v4M15 14v4" />,
    shield: <path d="M12 3 5 6v6c0 4.5 3 7 7 9 4-2 7-4.5 7-9V6z" />,
    list: <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />,
    building: <path d="M4 20h16M6 20V6h12v14M10 10h.01M14 10h.01M10 14h.01M14 14h.01" />,
    users: <path d="M16 19v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1M10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1a3 3 0 0 0-2-2.8M16 6.1a3 3 0 0 1 0 5.8" />,
    gear: (
      <>
        <path d="M10.2 4h3.6l.4 2.1a5.8 5.8 0 0 1 1.6.9l2-1 2.2 2.2-1 2c.3.5.6 1 .8 1.6l2.1.4v3.6l-2.1.4a5.8 5.8 0 0 1-.8 1.6l1 2-2.2 2.2-2-1a5.8 5.8 0 0 1-1.6.9l-.4 2.1h-3.6l-.4-2.1a5.8 5.8 0 0 1-1.6-.9l-2 1-2.2-2.2 1-2a5.8 5.8 0 0 1-.8-1.6L4 14.6v-3.6l2.1-.4c.2-.6.5-1.1.8-1.6l-1-2L8 5.8l2 1c.5-.4 1-.7 1.6-.9z" />
        <circle cx="12" cy="12" r="2.6" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    user: <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 19.5a7 7 0 0 1 14 0" />,
    globe: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.4 2.7 3.6 5.7 3.6 9s-1.2 6.3-3.6 9c-2.4-2.7-3.6-5.7-3.6-9s1.2-6.3 3.6-9z" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
