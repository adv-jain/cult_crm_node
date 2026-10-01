import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiSearch,
  FiX,
  FiMapPin,
  FiGlobe,
  FiCheck,
} from "react-icons/fi";

import {
  DOMESTIC_DESTINATIONS,
  INTERNATIONAL_DESTINATIONS,
  getSortedUniqueDestinations,
} from "../../data/destinations";

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function DestinationPicker({
  value = "",
  onChange,
  placeholder = "Search destination...",
  showTabs = true,
  disabled = false,
}) {
  const [mode, setMode] = useState("domestic"); // domestic | international
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  /* =======================================================
     SORTED LISTS
  ======================================================= */

  const domesticList = useMemo(
    () => getSortedUniqueDestinations(DOMESTIC_DESTINATIONS),
    []
  );

  const internationalList = useMemo(
    () => getSortedUniqueDestinations(INTERNATIONAL_DESTINATIONS),
    []
  );

  /* =======================================================
     AUTO-DETECT MODE FROM CURRENT VALUE
  ======================================================= */

  useEffect(() => {
    if (!value) return;

    const isDomestic = domesticList.some(
      (d) => d.toLowerCase() === value.toLowerCase()
    );

    if (isDomestic) {
      setMode("domestic");
      return;
    }

    const isInternational = internationalList.some(
      (d) => d.toLowerCase() === value.toLowerCase()
    );

    if (isInternational) {
      setMode("international");
    }
    // If not in either list (custom), keep current mode
  }, [value, domesticList, internationalList]);

  /* =======================================================
     FILTERED LIST
  ======================================================= */

  const currentList = mode === "domestic" ? domesticList : internationalList;

  const filteredList = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) return currentList.slice(0, 100);

    return currentList
      .filter((item) => item.toLowerCase().includes(trimmed))
      .slice(0, 100);
  }, [currentList, query]);

  /* =======================================================
     CLOSE ON OUTSIDE CLICK
  ======================================================= */

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleSelect = (destination) => {
    onChange?.(destination);
    setQuery("");
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleClear = () => {
    onChange?.("");
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleTabChange = (newMode) => {
    setMode(newMode);
    setQuery("");
    setIsOpen(true);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div ref={containerRef} className="relative">
      {/* =================================================
          MODE TABS
      ================================================= */}

      {showTabs && (
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5 mb-2">
          <button
            type="button"
            onClick={() => handleTabChange("domestic")}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              mode === "domestic"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <FiMapPin size={12} />
            Domestic
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("international")}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              mode === "international"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <FiGlobe size={12} />
            International
          </button>
        </div>
      )}

      {/* =================================================
          SEARCH INPUT
      ================================================= */}

      <div className="relative">
        <FiSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={15}
        />

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-8 h-10 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
        />

        {value && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-600 transition"
          >
            <FiX size={13} />
          </button>
        )}
      </div>

      {/* =================================================
          DROPDOWN
      ================================================= */}

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-72 overflow-y-auto">
          {filteredList.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-gray-500">
                No destinations found
              </p>

              {query.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelect(query.trim())}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-md transition"
                >
                  <FiCheck size={12} />
                  Use "{query.trim()}"
                </button>
              )}
            </div>
          ) : (
            <div className="py-1">
              {filteredList.map((destination) => (
                <button
                  key={destination}
                  type="button"
                  onClick={() => handleSelect(destination)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-gray-50 transition ${
                    value === destination
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-700"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {mode === "domestic" ? (
                      <FiMapPin
                        size={13}
                        className="text-gray-400 shrink-0"
                      />
                    ) : (
                      <FiGlobe
                        size={13}
                        className="text-gray-400 shrink-0"
                      />
                    )}

                    <span className="truncate">{destination}</span>
                  </span>

                  {value === destination && (
                    <FiCheck
                      size={14}
                      className="text-blue-600 shrink-0"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}