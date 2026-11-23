import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LineBadge } from "./Panels.js";

type SearchResult = { type: "stop" | "line" | "vehicle"; data: any };

export const SearchBar = ({
    lines,
    stops,
    vehicles,
    onSelect
}: {
    lines: any[];
    stops: any[];
    vehicles: any[];
    onSelect: (stop: any) => void;
}) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const results = useMemo<SearchResult[]>(() => {
        const search = query.trim().toLowerCase();
        if (!search) return [];

        const found: SearchResult[] = [];
        for (const stop of stops) if (stop.id.toLowerCase() === search) found.push({ type: "stop", data: stop });
        for (const line of lines) if (line.id.toLowerCase() === search) found.push({ type: "line", data: line });
        for (const vehicle of vehicles)
            if (vehicle.id.toLowerCase() === search) found.push({ type: "vehicle", data: vehicle });

        for (const line of lines)
            if (line.shortName.toLowerCase().includes(search) && !found.some((r) => r.data === line))
                found.push({ type: "line", data: line });
        for (const stop of stops)
            if (!stop.parent && stop.name.toLowerCase().includes(search) && !found.some((r) => r.data === stop))
                found.push({ type: "stop", data: stop });

        return found.slice(0, 8);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setFocused(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const select = (result: SearchResult) => {
        setQuery("");
        setFocused(false);
        if (!result) return;
        if (result.type === "stop") {
            onSelect(result.data);
            navigate("/stops/" + result.data.id);
        } else if (result.type === "line") navigate("/lines/" + result.data.id);
        else {
            onSelect({ lat: result.data.latitude, lon: result.data.longitude });
            navigate("/trips/" + result.data.fullTripId);
        }
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
                    onFocus={() => {
                        if (pathname !== "/") navigate("/");
                        setFocused(true);
                    }}
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
                        <div className="search-empty">Aucun résultat trouvé</div>
                    ) : (
                        results.map((result, i) => (
                            <button key={result.type + "-" + result.data.id} onClick={() => select(result)}>
                                {result.type === "line" ? (
                                    <span className="line-full">
                                        <LineBadge line={result.data} /> {result.data.longName}
                                    </span>
                                ) : result.type === "vehicle" ? (
                                    <span className="line-full">
                                        <LineBadge line={lines.find((line) => line.id === result.data.lineId)} />{" "}
                                        Véhicule {result.data.id}
                                    </span>
                                ) : (
                                    result.data.name
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
