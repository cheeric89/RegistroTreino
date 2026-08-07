import { Dumbbell } from "lucide-react";

export default function BrandLogo({ compact = false }) {
  return (
    <span className={`brand-logo ${compact ? "brand-logo--compact" : ""}`}>
      <span className="brand-logo__mark" aria-hidden="true">
        <Dumbbell size={compact ? 18 : 22} strokeWidth={2.6} />
      </span>
      <span className="brand-logo__wordmark">
        TREI<span>NO</span>
      </span>
    </span>
  );
}
