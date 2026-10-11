export function Icon({ name, size = 20, className = '' }) {
  const icons = {
    home: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.5z" />,
    training: <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 17l-6.5 3.5 2-7L2 9h7l3-7z" />,
    progress: <path d="M3 3v18h18M7 14l4-4 4 4 5-6" />,
    history: <path d="M12 8v4l3 3M3.05 11a9 9 0 101.5-4.5M3 3v5h5" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>,
    back: <path d="M19 12H5M12 19l-7-7 7-7" />,
    play: <path d="M5 3l14 9-14 9V3z" />,
    pause: <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>,
    mic: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" /></>,
    speaker: <><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" /></>,
    check: <path d="M20 6L9 17l-5-5" />,
    x: <path d="M18 6L6 18M6 6l12 12" />,
    flame: <path d="M12 22c-4-3-7-7-7-11a7 7 0 0114 0c0 4-3 8-7 11z" />,
    zap: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
    trophy: <><path d="M6 9H4a2 2 0 01-2-2V5h4" /><path d="M18 9h2a2 2 0 002-2V5h-4" /><path d="M6 5h12v6a6 6 0 01-12 0V5z" /><path d="M12 15v4M8 22h8" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

export default Icon;
