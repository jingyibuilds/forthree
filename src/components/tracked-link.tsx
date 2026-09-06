"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import type { EventPayload } from "@/lib/analytics";
import { trackEvent } from "@/lib/analytics-client";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  event: EventPayload;
};

export function TrackedLink({ event, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(clickEvent) => {
        trackEvent(event, true);
        onClick?.(clickEvent);
      }}
    />
  );
}
