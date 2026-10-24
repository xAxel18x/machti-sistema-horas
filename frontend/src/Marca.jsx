
export default function MarcaMach({ tamano = 28, color = 'currentColor' }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="26" height="26" rx="6" stroke={color} strokeWidth="2" />
      <rect x="6" y="7" width="16" height="3" rx="1.5" fill={color} />
      <rect x="6" y="12.5" width="11" height="3" rx="1.5" fill={color} />
      <rect x="6" y="18" width="14" height="3" rx="1.5" fill={color} />
    </svg>
  );
}