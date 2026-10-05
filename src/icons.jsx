// Small inline icons. They inherit the text colour and are hidden from screen readers,
// since the buttons and headings that use them always carry their own text.
function Icon({ children, size = 20, className = '' }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export const LeafIcon = (props) => (
  <Icon {...props}>
    <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
    <path d="M5 19c3-5 6-8 11-11" />
  </Icon>
)

export const SproutIcon = (props) => (
  <Icon {...props}>
    <path d="M12 21v-9" />
    <path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Z" />
    <path d="M12 14c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5Z" />
  </Icon>
)

export const CameraIcon = (props) => (
  <Icon {...props}>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
)

export const PlusIcon = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const DropIcon = (props) => (
  <Icon {...props}>
    <path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3Z" />
  </Icon>
)

export const AlertIcon = (props) => (
  <Icon {...props}>
    <path d="M12 4 2.5 20h19L12 4Z" />
    <path d="M12 10v4M12 17.2v.1" />
  </Icon>
)

export const SunIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)

export const MoonIcon = (props) => (
  <Icon {...props}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
  </Icon>
)

export const BookIcon = (props) => (
  <Icon {...props}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
    <path d="M12 4h6.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H12" />
  </Icon>
)

export const PrintIcon = (props) => (
  <Icon {...props}>
    <path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2" />
    <path d="M7 14h10v6H7z" />
  </Icon>
)

// A shopping bag icon for the plant shop.
export const BagIcon = (props) => (
  <Icon {...props}>
    <path d="M5.5 8h13l-1 11.5a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4L5.5 8Z" />
    <path d="M9 10V6.8a3 3 0 0 1 6 0V10" />
  </Icon>
)

export const TruckIcon = (props) => (
  <Icon {...props}>
    <path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7z" />
    <circle cx="7.5" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </Icon>
)

export const CheckIcon = (props) => (
  <Icon {...props}>
    <path d="m5 12.5 4.2 4.2L19 7" />
  </Icon>
)

export const PhoneIcon = (props) => (
  <Icon {...props}>
    <path d="M6.5 4h3l1.6 4-2 1.3a10 10 0 0 0 5.6 5.6l1.3-2 4 1.6v3a2 2 0 0 1-2 2A14 14 0 0 1 4.5 6a2 2 0 0 1 2-2Z" />
  </Icon>
)

// A mail icon for the contact section.
export const MailIcon = (props) => (
  <Icon {...props}>
    <path d="M4 6.5h16v11H4zM4 7l8 6 8-6" />
  </Icon>
)

export const QrIcon = (props) => (
  <Icon {...props}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
    <path d="M14 14h2.5v2.5H14zM18 18h2.5M18 14v1.5M14 18.5V20.5" />
  </Icon>
)

// A larger decorative plant used in the hero and empty states.
export function PlantArt({ className = '' }) {
  return (
    <svg className={`plant-art ${className}`} viewBox="0 0 220 260" fill="none" aria-hidden="true" focusable="false">
      <path d="M110 238V120" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity=".55" />
      <path d="M110 150C70 150 42 124 40 84c40 0 68 26 70 66Z" fill="currentColor" opacity=".9" />
      <path d="M110 120C110 76 138 48 180 46c0 44-28 72-70 74Z" fill="currentColor" opacity=".7" />
      <path d="M110 188c-30 0-52-18-56-46 32 0 54 16 56 46Z" fill="currentColor" opacity=".5" />
      <path d="M110 176c0-26 18-44 46-46 0 26-18 44-46 46Z" fill="currentColor" opacity=".4" />
      <path d="M70 214h80l-9 38H79l-9-38Z" fill="currentColor" opacity=".95" />
      <rect x="64" y="204" width="92" height="14" rx="5" fill="currentColor" />
    </svg>
  )
}
