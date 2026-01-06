import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Github, Star } from "lucide-react";

type CacheEntry = { count: number; fetchedAt: number };

function getCache(key: string, maxAgeMs: number) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEntry> | null;
    if (!parsed || typeof parsed.count !== "number" || typeof parsed.fetchedAt !== "number") return null;
    if (Date.now() - parsed.fetchedAt > maxAgeMs) return null;
    return { count: parsed.count, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

function setCache(key: string, entry: CacheEntry) {
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export function GitHubStarsBadge() {
  const repo = import.meta.env.VITE_GITHUB_REPO as string | undefined;
  const repoSlug = typeof repo === "string" && repo.includes("/") ? repo.trim() : "";
  const repoUrl = useMemo(() => (repoSlug ? `https://github.com/${repoSlug}` : ""), [repoSlug]);
  const cacheKey = useMemo(() => (repoSlug ? `github-stars:${repoSlug}` : ""), [repoSlug]);
  const [count, setCount] = useState<number | null>(null);
  const formatted = useMemo(() => {
    if (count === null) return "—";
    return new Intl.NumberFormat(undefined).format(count);
  }, [count]);

  useEffect(() => {
    if (!repoSlug) return;
    const cached = getCache(cacheKey, 60 * 60_000);
    if (cached) setCount(cached.count);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repoSlug}`, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { stargazers_count?: unknown } | null;
        const next = typeof data?.stargazers_count === "number" ? data.stargazers_count : null;
        if (next === null) return;
        if (cancelled) return;
        setCount(next);
        setCache(cacheKey, { count: next, fetchedAt: Date.now() });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, repoSlug]);

  if (!repoSlug) return null;

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="bg-background/80 backdrop-blur-sm"
      title="GitHub stars"
    >
      <a href={repoUrl} target="_blank" rel="noreferrer">
        <Github className="mr-2 h-4 w-4" />
        <span className="tabular-nums">{formatted}</span>
        <Star className="ml-2 h-4 w-4" />
      </a>
    </Button>
  );
}
