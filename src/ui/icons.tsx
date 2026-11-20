// Original QueryCraft outline symbols, drawn on a 24-unit grid.
type IconProps = { size?: number; className?: string };

function Outline({ path, size = 20, className }: IconProps & { path: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path d={path} />
    </svg>
  );
}

export function BrandMark({ size = 32, ...props }: IconProps) {
  return (
    <Outline
      size={size}
      {...props}
      path="m2 7 10-5 10 5-10 5z M2 12l10 5 10-5 M2 17l10 5 10-5"
    />
  );
}

export function MapIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      path="M2.5 5.5 9 3l6 2.5L21.5 3v15.5L15 21l-6-2.5L2.5 21z M9 3v15.5 M15 5.5V21"
    />
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      path="m10 3-.5 2.4-2 .9-2.2-.9-2 3.4L5 10.5v2.6l-1.7 1.8 2 3.4 2.3-.7 2 .9.4 2.5h4l.5-2.5 2-.9 2.2.7 2-3.4-1.7-1.8v-2.6l1.7-1.7-2-3.4-2.3.9-2-.9L14 3z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
    />
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      path="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z M12 11v6 M12 7v.2"
    />
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return <Outline {...props} path="m10 5-7 7 7 7 M3 12h18" />;
}

export function TableIcon(props: IconProps) {
  return <Outline {...props} path="M3 4h18v16H3z M3 9h18 M3 14.5h18 M9 9v11" />;
}

export function CodeIcon(props: IconProps) {
  return (
    <Outline {...props} path="m6.5 7-5 5 5 5 M17.5 7l5 5-5 5 M14 4l-4 16" />
  );
}

export function PlanIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      path="M3 2h6v5H3z M15 8h6v5h-6z M15 17h6v5h-6z M6 7v10a2.5 2.5 0 0 0 2.5 2.5H15 M6 10.5h9"
    />
  );
}

export function PlayIcon(props: IconProps) {
  return <Outline {...props} path="m6 3 15 9-15 9z" />;
}

export function CompareIcon(props: IconProps) {
  return <Outline {...props} path="M3 4h18v16H3z M12 4v16" />;
}

export function ResetIcon(props: IconProps) {
  return <Outline {...props} path="M3.5 5v5.5H9 M4 10a8.5 8.5 0 1 1 .7 6" />;
}

export function HintIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      path="M8.5 17c0-3-3.5-4-3.5-8a7 7 0 1 1 14 0c0 4-3.5 5-3.5 8z M9 20h6 M10.5 22h3"
    />
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      path="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z m-15 0 3 3 6.5-6.5"
    />
  );
}

export function WarningIcon(props: IconProps) {
  return <Outline {...props} path="M12 3 1.5 21h21z M12 9v5 M12 17v.2" />;
}

export function LockIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      path="M4.5 10h15v11h-15z M8 10V7a4 4 0 1 1 8 0v3 M12 14v3"
    />
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      path="m12 2 3 6.5 7 1-5 5 1.2 7-6.2-3.4-6.2 3.4 1.2-7-5-5 7-1z"
    />
  );
}

export function DownloadIcon(props: IconProps) {
  return <Outline {...props} path="M12 2v13 m-5-5 5 5 5-5 M3 16v5h18v-5" />;
}

export function UploadIcon(props: IconProps) {
  return <Outline {...props} path="M12 15V2 M7 7l5-5 5 5 M3 16v5h18v-5" />;
}

export function TrashIcon(props: IconProps) {
  return (
    <Outline
      {...props}
      path="M3 6h18 M8 6V3h8v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7"
    />
  );
}

export function CopyIcon(props: IconProps) {
  return <Outline {...props} path="M8 8h13v13H8z M16 8V3H3v13h5" />;
}
