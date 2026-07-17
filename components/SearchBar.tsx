"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { Search, ArrowRight, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchWithConsensus } from "@/lib/api";

const EXAMPLE_MATCHES = [
  { home: "Arsenal", away: "Chelsea", competition: "Premier League" },
  { home: "Real Madrid", away: "Barcelona", competition: "La Liga" },
  { home: "Liverpool", away: "Manchester City", competition: "Premier League" },
  { home: "Bayern Munich", away: "Borussia Dortmund", competition: "Bundesliga" },
  { home: "Inter Milan", away: "AC Milan", competition: "Serie A" },
  { home: "Paris Saint-Germain", away: "Olympique Marseille", competition: "Ligue 1" },
];

interface SearchBarProps {
  matches: MatchWithConsensus[];
  onSelect: (homeTeam: string, awayTeam: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  matches,
  onSelect,
  onSearch,
  placeholder = "Search football teams or fixtures...",
  autoFocus = false,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gc-recent-searches");
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  const saveRecentSearch = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== term);
      const next = [term, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("gc-recent-searches", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const teams = new Map<string, { home: string; away: string }>();
  for (const m of matches) {
    const key = m.homeTeam.toLowerCase();
    if (!teams.has(key)) teams.set(key, { home: m.homeTeam, away: m.awayTeam });
    const awayKey = m.awayTeam.toLowerCase();
    if (!teams.has(awayKey)) teams.set(awayKey, { home: m.homeTeam, away: m.awayTeam });
  }

  const fixtures = new Map<string, { home: string; away: string }>();
  for (const m of matches) {
    const key = `${m.homeTeam.toLowerCase()} vs ${m.awayTeam.toLowerCase()}`;
    if (!fixtures.has(key)) fixtures.set(key, { home: m.homeTeam, away: m.awayTeam });
  }

  const filteredResults: { home: string; away: string; matchType: "team" | "fixture" }[] = [];

  if (query.trim()) {
    const q = query.toLowerCase().trim();

    for (const [, fixture] of fixtures) {
      const label = `${fixture.home} vs ${fixture.away}`;
      if (label.toLowerCase().includes(q)) {
        filteredResults.push({ ...fixture, matchType: "fixture" });
      }
    }

    for (const [, team] of teams) {
      if (
        filteredResults.some(
          (r) => r.home === team.home && r.away === team.away
        )
      )
        continue;
      if (
        team.home.toLowerCase().includes(q) ||
        team.away.toLowerCase().includes(q)
      ) {
        filteredResults.push({ ...team, matchType: "team" });
      }
    }
  }

  const allItems = filteredResults;
  const recentItems = !query.trim() && recentSearches.length > 0
    ? recentSearches.slice(0, 3)
    : [];

  const totalItems = allItems.length + recentItems.length + (!query.trim() ? EXAMPLE_MATCHES.length : 0);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allItems.length) {
        const item = allItems[selectedIndex];
        setQuery(`${item.home} vs ${item.away}`);
        saveRecentSearch(`${item.home} vs ${item.away}`);
        onSelect(item.home, item.away);
        setIsOpen(false);
        setSelectedIndex(-1);
      } else if (selectedIndex >= allItems.length && selectedIndex < allItems.length + recentItems.length) {
        const term = recentItems[selectedIndex - allItems.length];
        setQuery(term);
        setIsOpen(false);
        setSelectedIndex(-1);
        onSearch?.(term);
      } else if (selectedIndex >= allItems.length + recentItems.length) {
        const idx = selectedIndex - allItems.length - recentItems.length;
        if (idx < EXAMPLE_MATCHES.length) {
          const ex = EXAMPLE_MATCHES[idx];
          setQuery(`${ex.home} vs ${ex.away}`);
          saveRecentSearch(`${ex.home} vs ${ex.away}`);
          onSelect(ex.home, ex.away);
          setIsOpen(false);
          setSelectedIndex(-1);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const selectResult = (home: string, away: string) => {
    setQuery(`${home} vs ${away}`);
    saveRecentSearch(`${home} vs ${away}`);
    onSelect(home, away);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const clearQuery = () => {
    setQuery("");
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-text-primary font-medium">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  let itemIndex = -1;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-listbox"
          aria-activedescendant={selectedIndex >= 0 ? `search-option-${selectedIndex}` : undefined}
          aria-label="Search for a match or team"
          className="search-input pl-11 pr-10"
        />
        {query && (
          <button
            onClick={clearQuery}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
          id="search-listbox"
          role="listbox"
          aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-2 bg-surface-3 border border-border rounded-xl shadow-elevated-lg overflow-hidden z-50 max-h-80 overflow-y-auto no-scrollbar"
        >
          {query.trim() && allItems.length > 0 && (
            <div className="p-1.5">
              <div className="px-3 py-1.5 text-2xs text-text-muted uppercase tracking-wider font-medium">
                Matches
              </div>
              {allItems.map((item, i) => {
                itemIndex++;
                const idx = itemIndex;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={`${item.home}-${item.away}`}
                    id={`search-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectResult(item.home, item.away)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors",
                      isSelected
                        ? "bg-accent-green-dim text-text-primary"
                        : "text-text-secondary hover:bg-glass-hover hover:text-text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-surface-4 flex items-center justify-center text-2xs font-mono text-text-tertiary">
                        {item.home.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {highlightMatch(item.home, query)} vs{" "}
                          {highlightMatch(item.away, query)}
                        </div>
                        <div className="text-2xs text-text-muted mt-0.5">
                          {item.matchType === "fixture" ? "Fixture" : "Team match"}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className={cn(
                        "transition-colors",
                        isSelected ? "text-accent-green" : "text-text-muted"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {query.trim() && allItems.length === 0 && (
            <div className="px-4 py-8 text-center">
              <div className="text-sm text-text-tertiary mb-1">
                No matches found for &ldquo;{query}&rdquo;
              </div>
              <div className="text-2xs text-text-muted">
                Try a different team name or fixture
              </div>
            </div>
          )}

          {!query.trim() && recentItems.length > 0 && (
            <div className="p-1.5">
              <div className="px-3 py-1.5 text-2xs text-text-muted uppercase tracking-wider font-medium flex items-center gap-1.5">
                <Clock size={10} />
                Recent
              </div>
              {recentItems.map((term) => {
                itemIndex++;
                const idx = itemIndex;
                return (
                  <button
                    key={`recent-${term}`}
                    id={`search-option-${idx}`}
                    role="option"
                    aria-selected={idx === selectedIndex}
                    onClick={() => {
                      setQuery(term);
                      onSearch?.(term);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      idx === selectedIndex
                        ? "bg-accent-green-dim text-text-primary"
                        : "text-text-secondary hover:bg-glass-hover hover:text-text-primary"
                    )}
                  >
                    <Clock size={12} className="text-text-muted" />
                    <span className="text-sm">{term}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!query.trim() && recentItems.length === 0 && (
            <div className="p-1.5">
              <div className="px-3 py-1.5 text-2xs text-text-muted uppercase tracking-wider font-medium">
                Try a match
              </div>
              {EXAMPLE_MATCHES.map((ex) => {
                itemIndex++;
                const idx = itemIndex;
                return (
                  <button
                    key={`example-${ex.home}-${ex.away}`}
                    id={`search-option-${idx}`}
                    role="option"
                    aria-selected={idx === selectedIndex}
                    onClick={() => selectResult(ex.home, ex.away)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors",
                      idx === selectedIndex
                        ? "bg-accent-green-dim text-text-primary"
                        : "text-text-secondary hover:bg-glass-hover hover:text-text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-surface-4 flex items-center justify-center">
                        <Search size={12} className="text-text-muted" />
                      </div>
                      <span className="text-sm">
                        {ex.home} vs {ex.away}
                      </span>
                    </div>
                    <ArrowRight
                      size={14}
                      className={cn(
                        "transition-colors",
                        idx === selectedIndex ? "text-accent-green" : "text-text-muted"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
