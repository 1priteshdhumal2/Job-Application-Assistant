import type { ReactElement } from "react";
import type { DocumentType } from "@jobpilot/types";

export interface DocumentTypeBadgeProps {
  type: DocumentType;
}

const TYPE_CONFIG: Record<DocumentType, { label: string; className: string }> =
  {
    RESUME: {
      label: "Resume",
      className: "badge badge-success",
    },
    COVER_LETTER: {
      label: "Cover Letter",
      className: "badge badge-primary",
    },
    CERTIFICATE: {
      label: "Certificate",
      className: "badge badge-warning",
    },
    PORTFOLIO: {
      label: "Portfolio",
      className: "badge badge-info",
    },
    OTHER: {
      label: "Other",
      className: "badge badge-neutral",
    },
  };

export function DocumentTypeBadge({
  type,
}: DocumentTypeBadgeProps): ReactElement {
  const config = TYPE_CONFIG[type] ?? {
    label: type,
    className: "badge badge-neutral",
  };

  return <span className={config.className}>{config.label}</span>;
}
