import { useState } from "react";
import { Button } from "@/components/ui/button";
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

export default function Post() {
  const [type, setType] = useState<"resource" | "need">("resource");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>({ FoodDrink: null });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const actor = useBackendActor();
  const { addToast } = useToast();

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
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-4">Post</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "resource" | "need")}
            className="w-full px-3 py-2 border rounded bg-background"
          >
            <option value="resource">Resource</option>
            <option value="need">Need</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-background"
            rows={4}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={JSON.stringify(category)}
            onChange={(e) => setCategory(JSON.parse(e.target.value) as Category)}
            className="w-full px-3 py-2 border rounded bg-background"
          >
            {CATEGORIES.map((c) => (
              <option key={c.label} value={JSON.stringify(c.value)}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Optional date range</label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2 border rounded bg-background"
            />
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-2 border rounded bg-background"
            />
          </div>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Posting..." : "Post"}
        </Button>
      </form>
    </div>
  );
}
