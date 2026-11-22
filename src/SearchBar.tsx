import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export const SearchBar = ({ stops, onSelect }: { stops: any[] | null; onSelect: (stop: any) => void }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const results = useMemo(() => {
        const search = query.trim().toLowerCase();
        if (!search || !stops) return [];
        return stops.filter((stop) => !stop.parent && stop.name.toLowerCase().includes(search)).slice(0, 8);
    }, [query, stops]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setFocused(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const select = (stop: any) => {
        setQuery("");
        setFocused(false);
        if (!stop) return;
        onSelect(stop);
        navigate("/stops/" + stop.id);
    };

    return (
        <div className="search-bar" ref={containerRef}>
            <div className="search-input">
                <button onClick={() => results[0] && select(results[0])}>
                    <i className="fa-solid fa-magnifying-glass" />
                </button>
                <input
                    placeholder="Rechercher"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onKeyDown={(event) => event.key === "Enter" && results[0] && select(results[0])}
                />
                {query && (
                    <button onClick={() => setQuery("")}>
                        <i className="fa-solid fa-xmark" />
                    </button>
                )}
            </div>
            {focused && query.trim() && (
                <div className="search-results">
                    {results.length === 0 ? (
                        <div className="search-empty">Aucun arrêt trouvé</div>
                    ) : (
                        results.map((stop) => (
                            <button key={stop.id} onClick={() => select(stop)}>
                                {stop.name}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
