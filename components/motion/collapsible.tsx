"use client";

import * as React from "react";

/**
 * Height animation for the expandable run breakdown.
 *
 * max-height is measured from the content rather than set to a large constant:
 * a fixed cap makes short sections finish early and long ones look slow, and
 * the easing curve stops matching the visible movement.
 */
export function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = React.useState(0);

  React.useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const measure = () => setMaxHeight(node.scrollHeight);
    measure();

    // The breakdown grows when a run form opens, so keep the cap in step.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      className="overflow-hidden transition-[max-height] duration-200 ease-out"
      style={{ maxHeight: open ? maxHeight : 0 }}
      aria-hidden={!open}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
