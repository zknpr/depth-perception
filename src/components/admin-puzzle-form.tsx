"use client";

import { useState } from "react";

// Shape of a single event row in the form. Fields map directly to the
// puzzle_events table columns. `sortDate` is an ISO date string used for
// chronological ordering; `date` is the human-readable display label.
interface EventRow {
  text: string;
  date: string;
  sortDate: string;
  url: string;
}

// Data structure submitted by the form. Matches the POST/PUT request body
// expected by the admin puzzles API.
export interface PuzzleFormData {
  title: string;
  category: string;
  isDaily: boolean;
  dailyDate: string;
  events: EventRow[];
}

interface AdminPuzzleFormProps {
  // Called when the form is submitted with validated data. The parent
  // component handles the actual API call.
  onSubmit: (data: PuzzleFormData) => Promise<void>;
  // Optional initial values for editing an existing puzzle. When provided,
  // the form pre-fills all fields.
  initialData?: PuzzleFormData;
}

// Default empty event row used when adding new events to the form
function emptyEvent(): EventRow {
  return { text: "", date: "", sortDate: "", url: "" };
}

// AdminPuzzleForm renders a form for creating or editing puzzles. It manages
// a dynamic list of event rows that can be added or removed. The `isDaily`
// checkbox conditionally reveals the `dailyDate` date picker. On submit,
// it calls the parent's onSubmit handler with the form data.
export function AdminPuzzleForm({ onSubmit, initialData }: AdminPuzzleFormProps) {
  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(initialData?.title || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [isDaily, setIsDaily] = useState(initialData?.isDaily || false);
  const [dailyDate, setDailyDate] = useState(initialData?.dailyDate || "");
  const [events, setEvents] = useState<EventRow[]>(
    initialData?.events || [emptyEvent(), emptyEvent()]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Event row management ──────────────────────────────────────────────────

  // Updates a specific field within an event row at the given index.
  // Creates a shallow copy of the events array to trigger a React re-render.
  const updateEvent = (index: number, field: keyof EventRow, value: string) => {
    setEvents((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Appends a new empty event row to the end of the list
  const addEvent = () => {
    setEvents((prev) => [...prev, emptyEvent()]);
  };

  // Removes the event row at the given index. Prevents removing the last
  // remaining row since at least one event is required.
  const removeEvent = (index: number) => {
    if (events.length <= 1) return;
    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit handler ────────────────────────────────────────────────────────
  // Validates required fields, constructs the form data, and delegates to the
  // parent's onSubmit callback.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic client-side validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!category.trim()) {
      setError("Category is required");
      return;
    }
    if (isDaily && !dailyDate) {
      setError("Daily date is required when 'Is Daily' is checked");
      return;
    }

    // Validate each event row has the minimum required fields
    for (let i = 0; i < events.length; i++) {
      if (!events[i].text.trim()) {
        setError(`Event ${i + 1} is missing text`);
        return;
      }
      if (!events[i].date.trim()) {
        setError(`Event ${i + 1} is missing date`);
        return;
      }
      if (!events[i].sortDate) {
        setError(`Event ${i + 1} is missing sort date`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        category: category.trim(),
        isDaily,
        dailyDate,
        events,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save puzzle");
    } finally {
      setSubmitting(false);
    }
  };

  // Shared Tailwind classes for form input fields
  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Error message banner ───────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Puzzle metadata fields ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="puzzle-title" className="mb-1 block text-sm font-medium text-navy">
            Title
          </label>
          <input
            id="puzzle-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="e.g. January 2026 News"
          />
        </div>

        <div>
          <label htmlFor="puzzle-category" className="mb-1 block text-sm font-medium text-navy">
            Category
          </label>
          <input
            id="puzzle-category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
            placeholder="e.g. Leviathan News"
          />
        </div>
      </div>

      {/* ── Daily challenge toggle ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-navy">
          <input
            type="checkbox"
            checked={isDaily}
            onChange={(e) => setIsDaily(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
          />
          Is Daily Challenge
        </label>

        {/* Daily date picker — only shown when isDaily is checked */}
        {isDaily && (
          <div>
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* ── Dynamic event rows ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy">
            Events ({events.length})
          </h3>
          <button
            type="button"
            onClick={addEvent}
            className="rounded-lg bg-navy/10 px-3 py-1 text-xs font-medium text-navy transition-colors hover:bg-navy/20"
          >
            + Add Event
          </button>
        </div>

        {events.map((event, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Event {index + 1}
              </span>
              {/* Remove button — hidden when only one event remains */}
              {events.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEvent(index)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Event text — textarea allows multi-line event descriptions */}
            <div>
              <label
                htmlFor={`event-text-${index}`}
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                Text
              </label>
              <textarea
                id={`event-text-${index}`}
                value={event.text}
                onChange={(e) => updateEvent(index, "text", e.target.value)}
                className={inputClass + " min-h-[60px] resize-y"}
                placeholder="Event description..."
              />
            </div>

            {/* Date (display label), Sort Date (chronological ordering), URL (source link) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor={`event-date-${index}`}
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Date (display)
                </label>
                <input
                  id={`event-date-${index}`}
                  type="text"
                  value={event.date}
                  onChange={(e) => updateEvent(index, "date", e.target.value)}
                  className={inputClass}
                  placeholder="Jan 15, 2026"
                />
              </div>

              <div>
                <label
                  htmlFor={`event-sortDate-${index}`}
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Sort Date
                </label>
                <input
                  id={`event-sortDate-${index}`}
                  type="date"
                  value={event.sortDate}
                  onChange={(e) =>
                    updateEvent(index, "sortDate", e.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`event-url-${index}`}
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  URL (optional)
                </label>
                <input
                  id={`event-url-${index}`}
                  type="text"
                  value={event.url}
                  onChange={(e) => updateEvent(index, "url", e.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Submit button ──────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Saving..." : initialData ? "Update Puzzle" : "Create Puzzle"}
      </button>
    </form>
  );
}
