// Minimal stroke icon set (24px grid, currentColor).
const P = {
  bag: 'M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 12h16M4 17h10',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'm5 12 4.5 4.5L19 7',
  arrow: 'M19 12H5m6-6-6 6 6 6',
  chevron: 'm15 6-6 6 6 6',
  pen: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Zm9-13 4 4',
  megaphone: 'M4 10v4h3l6 4V6L7 10H4Zm12-1a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12',
  key: 'M14 10a4 4 0 1 1-1.2-2.8M14 10h7m-3 0v3m-3-3v2',
  seal: 'M12 3l2.2 1.6 2.7-.2.8 2.6 2.2 1.6-.9 2.6.9 2.6-2.2 1.6-.8 2.6-2.7-.2L12 21l-2.2-1.6-2.7.2-.8-2.6-2.2-1.6.9-2.6-.9-2.6 2.2-1.6.8-2.6 2.7.2L12 3Zm-3 9 2 2 4-4',
  book: 'M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2V5Zm0 15a2 2 0 0 0 2 2h12',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
  leaf: 'M5 19C5 10 11 5 20 4c0 9-5 15-14 15Zm0 0 8-8',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
  whatsapp: 'M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Zm5-11c0 3 3 6 6 6l1.3-1.3-2-1-1 .8a4 4 0 0 1-2.8-2.8l.8-1-1-2L9 9Z',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4V8Zm0 0 8 4 8-4m-8 4v8',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 0 0 0-6m2.5 15a5 5 0 0 0-3-4.6',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-4h.01',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4m-4-4h10',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Z',
  trash: 'M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  external: 'M14 4h6v6m0-6-9 9M18 14v6H4V6h6',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 20h16',
  shield: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Zm-3 9 2 2 4-4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2',
  bank: 'M3 9l9-5 9 5M5 9v9m4-9v9m6-9v9m4-9v9M3 20h18',
  card: 'M3 6h18v12H3V6Zm0 4h18M7 15h4',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4v-9Z',
  download: 'M12 4v12m-5-5 5 5 5-5M4 20h16',
}

export default function Icon({ name, size = 20, stroke = 1.7, className = '', label }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className}
      aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}
    >
      <path d={P[name] || P.spark} />
    </svg>
  )
}
