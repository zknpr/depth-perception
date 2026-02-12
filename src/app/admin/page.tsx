"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  AdminPuzzleForm,
  type PuzzleFormData,
} from "@/components/admin-puzzle-form";

// Shape of a puzzle as returned by the admin GET endpoint, including
// nested events with all fields visible (sortDate, orderIndex, etc.)
interface AdminPuzzle {
  id: string;
  title: string;
  category: string;
  isDaily: boolean;
  dailyDate: string | null;
  createdAt: string;
  events: {
    id: string;
    text: string;
    date: string;
    sortDate: string;
    url: string | null;
    orderIndex: number;
  }[];
}

// Admin page — provides CRUD operations for puzzles via the admin API.
// Access is gated: unauthenticated users are prompted to connect a wallet,
// and non-admin users see a 403 error. The page displays a list of existing
// puzzles with delete functionality and a toggleable create form.
export default function AdminPage() {
  const { data: session, status } = useSession();

  // ── State ──────────────────────────────────────────────────────────────────
  // List of puzzles fetched from the admin API
  const [puzzles, setPuzzles] = useState<AdminPuzzle[]>([]);
  // Loading/error states for the initial puzzle list fetch
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Controls visibility of the create puzzle form
  const [showForm, setShowForm] = useState(false);
  // Tracks which puzzle is currently being deleted (for loading indicator)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch puzzles from admin API ──────────────────────────────────────────
  // Fetches the full puzzle list on mount and whenever the session changes.
  // A 403 response sets the error state without crashing the page.
  const fetchPuzzles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/puzzles");

      if (res.status === 403) {
        setError("You do not have admin access.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to load puzzles (${res.status})`);
      }

      const data: AdminPuzzle[] = await res.json();
      setPuzzles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load puzzles");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount (only when authenticated)
  useEffect(() => {
    if (status === "authenticated") {
      fetchPuzzles();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, fetchPuzzles]);

  // ── Create puzzle handler ──────────────────────────────────────────────────
  // Called by AdminPuzzleForm on submit. POSTs the form data to the admin API
  // and prepends the newly created puzzle to the local list.
  const handleCreate = useCallback(
    async (data: PuzzleFormData) => {
      const res = await fetch("/api/admin/puzzles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Create failed (${res.status})`);
      }

      const created: AdminPuzzle = await res.json();
      // Prepend to show the newest puzzle at the top of the list
      setPuzzles((prev) => [created, ...prev]);
      // Hide the form after successful creation
      setShowForm(false);
    },
    []
  );

  // ── Delete puzzle handler ──────────────────────────────────────────────────
  // DELETEs a puzzle by ID and removes it from the local list on success.
  // Uses window.confirm() for a basic deletion confirmation dialog.
  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this puzzle?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/puzzles/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Delete failed (${res.status})`);
      }

      // Remove the deleted puzzle from the local state
      setPuzzles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete puzzle");
    } finally {
      setDeletingId(null);
    }
  }, []);

  // ── Auth guard: show login prompt for unauthenticated users ────────────────
  if (status === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy/20 border-t-navy" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user?.id) {
    return (
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex flex-col items-center justify-center py-20">
          <h1 className="mb-2 text-2xl font-bold text-navy">Admin Panel</h1>
          <p className="text-sm text-gray-500">
            Please connect your wallet to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4">
      <h1 className="mb-6 text-2xl font-bold text-navy">Admin Panel</h1>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Create puzzle toggle + form ────────────────────────────────────── */}
      {!error && (
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
          >
            {showForm ? "Cancel" : "Create New Puzzle"}
          </button>

          {showForm && (
            <div className="mt-4 rounded-lg border border-gray-200 p-6">
              <h2 className="mb-4 text-lg font-semibold text-navy">
                New Puzzle
              </h2>
              <AdminPuzzleForm onSubmit={handleCreate} />
            </div>
          )}
        </div>
      )}

      {/* ── Loading spinner ────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy/20 border-t-navy" />
        </div>
      )}

      {/* ── Puzzle list ────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-navy">
            Puzzles ({puzzles.length})
          </h2>

          {puzzles.length === 0 ? (
            <p className="text-sm text-gray-500">
              No puzzles found. Create one above.
            </p>
          ) : (
            puzzles.map((puzzle) => (
              <div
                key={puzzle.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-navy">{puzzle.title}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      {/* Category badge */}
                      <span className="rounded-full bg-navy/10 px-2 py-0.5 font-medium text-navy">
                        {puzzle.category}
                      </span>
                      {/* Daily badge — shown only for daily puzzles */}
                      {puzzle.isDaily && (
                        <span className="rounded-full bg-lime px-2 py-0.5 font-medium text-navy">
                          Daily{puzzle.dailyDate ? ` (${puzzle.dailyDate})` : ""}
                        </span>
                      )}
                      {/* Event count */}
                      <span>{puzzle.events.length} events</span>
                    </div>
                  </div>

                  {/* Delete button with loading state */}
                  <button
                    type="button"
                    onClick={() => handleDelete(puzzle.id)}
                    disabled={deletingId === puzzle.id}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === puzzle.id ? "Deleting..." : "Delete"}
                  </button>
                </div>

                {/* Collapsible event list preview */}
                <div className="mt-3 space-y-1">
                  {puzzle.events.map((event, i) => (
                    <div
                      key={event.id}
                      className="flex items-baseline gap-2 text-xs text-gray-600"
                    >
                      {/* 1-indexed position label */}
                      <span className="w-5 shrink-0 text-right font-mono text-gray-400">
                        {i + 1}.
                      </span>
                      {/* Truncated event text */}
                      <span className="truncate">{event.text}</span>
                      {/* Display date */}
                      <span className="shrink-0 text-gray-400">
                        ({event.date})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
