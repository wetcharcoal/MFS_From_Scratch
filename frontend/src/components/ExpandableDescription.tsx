import { useState } from "react";
import { cn } from "@/lib/utils";

const PREVIEW_LEN = 100;

type ExpandableDescriptionProps = {
  text: string;
  className?: string;
};

export function ExpandableDescription({ text, className }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const over = text.length > PREVIEW_LEN;

  const base = "text-sm text-foreground/90 leading-relaxed break-words";

  if (!over) {
    return <p className={cn(base, className)}>{text}</p>;
  }

  if (!expanded) {
    return (
      <p className={cn(base, className)}>
        {text.slice(0, PREVIEW_LEN)}
        {" "}
        <button
          type="button"
          className="font-semibold text-foreground underline underline-offset-2 hover:text-foreground/80"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
        >
          more
        </button>
      </p>
    );
  }

  return (
    <div className={cn(base, className)}>
      <p className="leading-relaxed whitespace-pre-wrap">{text}</p>
      <button
        type="button"
        className="mt-2 font-semibold text-foreground underline underline-offset-2 hover:text-foreground/80"
        onClick={() => setExpanded(false)}
        aria-expanded
      >
        less
      </button>
    </div>
  );
}
