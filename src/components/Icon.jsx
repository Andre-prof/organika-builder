export function Icon({ name, size = 20, ...props }) {
  const paths = {
    home: <><path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7" /></>,
    teacher: <><path d="m2 8 10-5 10 5-10 5-10-5ZM6 10v6c4 3 8 3 12 0v-6M22 8v8" /></>,
    book: <><path d="M12 5C8 2 4 3 2 4v16c3-2 6-2 10 0 4-2 7-2 10 0V4c-2-1-6-2-10 1ZM12 5v15" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5" /></>,
    printer: <><path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6ZM17 11h1" /></>,
    save: <><path d="M4 3h13l4 4v14H3V3ZM7 3v6h10V3M7 21v-8h10v8" /></>,
    arrow: <><path d="M4 12h15M13 5l7 7-7 7" /></>,
    undo: <><path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v4" /></>,
    redo: <><path d="m16 4 5 5-5 5M21 9H11a7 7 0 0 0-7 7v4" /></>,
    rotate: <><path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7" /></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" /></>,
    bulb: <><path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z" /></>,
    check: <path d="m5 12 4 4L20 5" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17v.1" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    link: <><path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4M16 8l2-2a4 4 0 0 1 6 6l-4 4" transform="translate(1 0) scale(.9)" /></>,
    hand: <><path d="M8 12V5a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 4-3 6-6 6h-2c-2 0-3-1-4-2l-5-6a2 2 0 0 1 3-3l2 2" /></>,
    leaf: <><path d="M20 3C9 2 2 9 5 16c8 5 16-2 15-13ZM5 20 16 9" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    minus: <path d="M5 12h14" />,
    plus: <path d="M5 12h14M12 5v14" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
