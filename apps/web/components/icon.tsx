const paths: Record<string, string> = {
  overview: "M12 3 21 12 12 21 3 12ZM12 8v8M8 12h8",
  dashboard: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
  calendar: "M5 5h14v15H5ZM8 3v4M16 3v4M5 10h14M9 14h2M14 14h2",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  tasks: "M9 5h11M9 12h11M9 19h11M3 5l1 1 2-3M3 12l1 1 2-3M3 19l1 1 2-3",
  budget: "M12 3a9 9 0 1 0 9 9h-9ZM15 3v6h6",
  expense: "M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 7h6M9 11h6M9 15h3",
  meeting: "M4 4h16v13H9l-5 4ZM8 8h8M8 12h5",
  folder: "M3 6h7l2 2h9v12H3Z",
  document: "M5 3h9l5 5v13H5ZM14 3v6h5M9 13h6M9 17h6",
  team: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 7M18 15a6 6 0 0 1 4 6",
  partner: "M3 20V8l9-5 9 5v12ZM8 20v-7h8v7M8 9h.01M16 9h.01",
  mail: "M3 5h18v14H3ZM3 5l9 8 9-8",
  chart: "M4 3v17h17M8 16v-5M13 16V7M18 16V4",
  settings: "M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  external: "M14 3h7v7M21 3 10 14M10 3H3v18h18v-7",
  alert: "M12 3 22 21H2ZM12 9v5M12 17h.01",
  check: "M5 12l4 4L19 6",
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.document} />
    </svg>
  );
}
