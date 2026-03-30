import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";
import type { Category } from "@/declarations/aseed_backend.did";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: { FoodDrink: null }, label: "Food/drink" },
  { value: { StorageSpace: null }, label: "Storage space" },
  { value: { KitchenSpace: null }, label: "Kitchen space" },
  { value: { DistributionSpace: null }, label: "Distribution space" },
  { value: { Equipment: null }, label: "Equipment" },
  { value: { Publicity: null }, label: "Publicity" },
  { value: { EventSpace: null }, label: "Event Space" },
  { value: { Other: null }, label: "Other" },
];

const fieldClass =
  "w-full rounded-2xl border border-border/80 bg-background px-4 py-2.5 text-sm shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 500;

export default function Post() {
  const [type, setType] = useState<"resource" | "need">("resource");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>({ FoodDrink: null });
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const actor = useBackendActor();
  const { addToast } = useToast();
  const categoryRef = useRef<HTMLDivElement>(null);

  const categoryLabel = useMemo(() => {
    return (
      CATEGORIES.find((c) => JSON.stringify(c.value) === JSON.stringify(category))?.label ??
      "Other"
    );
  }, [category]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;

    const dateRange: [] | [{ startNs: bigint; endNs: bigint }] =
      startDate && endDate
        ? [
            {
              startNs: BigInt(new Date(startDate).getTime()) * BigInt(1_000_000),
              endNs: BigInt(new Date(endDate).getTime()) * BigInt(1_000_000),
            },
          ]
        : [];

    setLoading(true);
    try {
      if (type === "resource") {
        const result = await actor.create_resource(title, description, category, dateRange);
        if (result && result.length > 0) {
          addToast("Resource posted");
          setTitle("");
          setDescription("");
        } else addToast("Failed to post resource", "error");
      } else {
        const result = await actor.create_need(title, description, category, dateRange);
        if (result && result.length > 0) {
          addToast("Need posted");
          setTitle("");
          setDescription("");
        } else addToast("Failed to post need (check active group)", "error");
      }
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-10 rounded-[2rem] bg-muted/30 p-5 md:p-8 lg:p-10">
      <div className="flex justify-center">
        <section
          className="w-full max-w-md flex flex-col rounded-[1.75rem] bg-card border border-border/70 shadow-sm px-5 pt-5 pb-6"
          aria-labelledby="post-heading"
        >
          <h1
            id="post-heading"
            className="text-lg font-bold tracking-tight text-foreground mb-5 text-center"
          >
            Post
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="block text-sm font-medium mb-2">Type</span>
              <div className="flex gap-2 w-full" role="group" aria-label="Post type">
                <button
                  type="button"
                  onClick={() => setType("resource")}
                  className={cn(
                    "flex-1 rounded-2xl border border-transparent px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors",
                    type === "resource"
                      ? "bg-[#2e7d32] text-white"
                      : "bg-black text-white hover:bg-black/90"
                  )}
                >
                  Resource
                </button>
                <button
                  type="button"
                  onClick={() => setType("need")}
                  className={cn(
                    "flex-1 rounded-2xl border border-transparent px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors",
                    type === "need"
                      ? "bg-[#c62828] text-white"
                      : "bg-black text-white hover:bg-black/90"
                  )}
                >
                  Need
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline gap-2 mb-2">
                <label htmlFor="post-title" className="text-sm font-medium">
                  Title
                </label>
                <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <input
                id="post-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                maxLength={TITLE_MAX}
                className={fieldClass}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-baseline gap-2 mb-2">
                <label htmlFor="post-description" className="text-sm font-medium">
                  Description
                </label>
                <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
              <textarea
                id="post-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                maxLength={DESCRIPTION_MAX}
                className={cn(fieldClass, "min-h-[120px] resize-y")}
                rows={4}
                required
              />
            </div>

            <div ref={categoryRef} className="relative">
              <span id="post-category-label" className="block text-sm font-medium mb-2">
                Category
              </span>
              <button
                type="button"
                id="post-category-trigger"
                aria-haspopup="listbox"
                aria-expanded={categoryOpen}
                aria-labelledby="post-category-label post-category-trigger"
                onClick={() => setCategoryOpen((o) => !o)}
                className={cn(
                  fieldClass,
                  "flex w-full items-center justify-between gap-2 text-left font-normal"
                )}
              >
                <span className="truncate">{categoryLabel}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    categoryOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
              {categoryOpen && (
                <ul
                  role="listbox"
                  aria-labelledby="post-category-label"
                  className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-2xl border border-border/80 bg-card py-1 shadow-md"
                >
                  {CATEGORIES.map((c) => {
                    const selected = JSON.stringify(c.value) === JSON.stringify(category);
                    return (
                      <li key={c.label} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={cn(
                            "flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors",
                            selected
                              ? "bg-muted/80 font-medium text-foreground"
                              : "text-foreground hover:bg-muted/50"
                          )}
                          onClick={() => {
                            setCategory(c.value);
                            setCategoryOpen(false);
                          }}
                        >
                          {c.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium mb-2">Optional date range</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={cn(fieldClass, "flex-1 min-w-0")}
                />
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={cn(fieldClass, "flex-1 min-w-0")}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full rounded-2xl h-11 text-base font-semibold border-0 shadow-sm",
                type === "resource"
                  ? "bg-[#2e7d32] text-white hover:bg-[#1b5e20]"
                  : "bg-[#c62828] text-white hover:bg-[#b71c1c]"
              )}
            >
              {loading ? "Posting..." : "Post"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
