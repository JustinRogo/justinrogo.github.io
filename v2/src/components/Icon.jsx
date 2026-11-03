const paths = {
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  projects: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  tools:
    "m14 6 4 4 M4 20l9-9 M20 3a6 6 0 0 1-8 8L4 19a2 2 0 0 1-3-3l8-8a6 6 0 0 1 8-8l-4 4 3 3Z",
  about: "M20 21v-2a7 7 0 0 0-14 0v2 M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  more: "M4 6h16 M4 12h16 M4 18h16",
  arrow: "M5 12h14 m-6-6 6 6-6 6",
  external: "M7 17 17 7 M7 7h10v10",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  sun: "M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  moon: "M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  close: "m6 6 12 12 M6 18 18 6",
  calendar: "M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16",
  mail: "M3 5h18v14H3z m0 0 9 7 9-7",
  chat: "M20 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3v4l5-4h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z M7 9h10 M7 13h6",
  phone:
    "M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a14 14 0 0 1-7-7l2-2Z",
  code: "m8 5-7 7 7 7 m8-14 7 7-7 7 M14 2l-4 20",
  book: "M12 5C8 2 3 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z M12 5v16",
  refresh:
    "M20 7v5h-5 M4 17v-5h5 M5 7a8 8 0 0 1 14-1l1 6 M4 12l1 6a8 8 0 0 0 14-1",
  check: "m5 12 4 4L19 6",
  heart: "M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-5 5 8 15 8 15S25 10 20 5Z",
};
export default function Icon({ name, size = 20, ...props }) {
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
      {...props}
    >
      <path d={paths[name] || paths.external} />
    </svg>
  );
}
