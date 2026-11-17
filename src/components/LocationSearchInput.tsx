import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Compass,
  Landmark,
  Loader2,
  MapPin,
  Navigation,
  Route,
  X,
} from 'lucide-react';
import { GeoLocation, LocationType } from '../types';

interface LocationSearchInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  selectedLocation?: GeoLocation | null;
  onTextChange?: (text: string) => void;
  onSelectLocation: (location: GeoLocation) => void;
  onClear?: () => void;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  helperText?: string;
}

const TYPE_LABELS_FALLBACK: Record<LocationType, string> = {
  bairro: 'Bairro',
  rua: 'Rua',
  endereco: 'Endereço completo',
  estabelecimento: 'Estabelecimento',
  ponto_interesse: 'Ponto de interesse',
  municipio: 'Município',
};

const getTypeBadgeStyle = (type?: LocationType): string => {
  switch (type) {
    case 'bairro':
      return 'bg-[#E1F7FC] text-[#104A63] dark:bg-[#133342] dark:text-[#7AE4FF]';
    case 'endereco':
      return 'bg-[#E5F6EF] text-[#137A59] dark:bg-[#18392F] dark:text-[#66DBB1]';
    case 'rua':
      return 'bg-[#EEF2F6] text-[#1D293B] dark:bg-[#282E40] dark:text-[#CBD5E1]';
    case 'ponto_interesse':
      return 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#3B2E14] dark:text-[#FCD34D]';
    case 'estabelecimento':
      return 'bg-[#F3E8FF] text-[#6B21A8] dark:bg-[#2E1E44] dark:text-[#D8B4FE]';
    case 'municipio':
      return 'bg-[#E0E7FF] text-[#3730A3] dark:bg-[#1E2547] dark:text-[#A5B4FC]';
    default:
      return 'bg-[#EEF2F6] text-[#596579] dark:bg-[#282E40] dark:text-[#A8B3C7]';
  }
};

const renderSuggestionIcon = (item: GeoLocation) => {
  switch (item.locationType) {
    case 'municipio':
      return <Compass className="w-4 h-4" />;
    case 'ponto_interesse':
      return <Landmark className="w-4 h-4" />;
    case 'estabelecimento':
      return <Building2 className="w-4 h-4" />;
    case 'rua':
      return <Route className="w-4 h-4" />;
    case 'endereco':
      return <Navigation className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
  }
};

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  label,
  placeholder = 'Buscar bairro, rua, ponto de referência ou município...',
  value,
  selectedLocation,
  onTextChange,
  onSelectLocation,
  onClear,
  required = false,
  autoFocus = false,
  className = '',
  helperText,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();

    // If query matches current selected location, don't re-trigger search dropdown
    if (
      selectedLocation &&
      (selectedLocation.name === trimmed || selectedLocation.label === trimmed)
    ) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const resp = await fetch(
          `/api/geocode?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!resp.ok) {
          throw new Error('Falha na resposta do serviço de busca');
        }
        const data = await resp.json();
        const results: GeoLocation[] = Array.isArray(data.results)
          ? data.results
          : [];
        setSuggestions(results);
        setIsOpen(true);
        setFocusedIndex(-1);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.warn('Geocode search error:', err);
        setErrorMessage('Não foi possível carregar sugestões. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, selectedLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setQuery(newText);
    if (onTextChange) {
      onTextChange(newText);
    }
  };

  const handleSelect = (loc: GeoLocation) => {
    setQuery(loc.name || loc.label);
    setSuggestions([]);
    setIsOpen(false);
    setFocusedIndex(-1);
    onSelectLocation(loc);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setErrorMessage(null);
    setFocusedIndex(-1);
    if (onClear) {
      onClear();
    } else if (onTextChange) {
      onTextChange('');
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        handleSelect(suggestions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isCoordinatesVerified = Boolean(
    selectedLocation &&
      (selectedLocation.name === query.trim() ||
        selectedLocation.label === query.trim() ||
        selectedLocation.formattedAddress === query.trim())
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-[12px] font-bold text-[#596579] dark:text-[#A8B3C7] mb-1">
          {label}
          {required && <span className="text-[#E11D60] ml-0.5">*</span>}
        </label>
      )}

      {/* Input container */}
      <div
        className={`h-[48px] px-3.5 rounded-[14px] bg-[#EEF2F6] dark:bg-[#282E40] border flex items-center gap-2.5 transition-colors ${
          isOpen
            ? 'border-[#00D2FF] ring-2 ring-[#00D2FF]/20'
            : isCoordinatesVerified
            ? 'border-[#137A59]/40 dark:border-[#4ADE80]/30'
            : 'border-transparent focus-within:border-[#00D2FF]'
        }`}
      >
        <MapPin
          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
            isCoordinatesVerified
              ? 'text-[#137A59] dark:text-[#4ADE80]'
              : 'text-[#596579] dark:text-[#94A3B8]'
          }`}
          strokeWidth={1.9}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-transparent text-[14px] font-medium text-[#102536] dark:text-white placeholder:text-[#596579] dark:placeholder:text-[#94A3B8] focus:outline-none"
        />

        {isLoading && (
          <Loader2 className="w-[18px] h-[18px] text-[#00D2FF] animate-spin shrink-0" />
        )}

        {!isLoading && query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpar campo de localização"
            className="p-1 rounded-full text-[#596579] dark:text-[#94A3B8] hover:text-[#102536] dark:hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-[15px] h-[15px]" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Validated coordinates indicator */}
      {isCoordinatesVerified && selectedLocation && (
        <div className="flex items-center gap-1.5 mt-1.5 px-1 text-[11px] font-semibold text-[#137A59] dark:text-[#66DBB1]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {selectedLocation.locationTypeLabel
              ? `${selectedLocation.locationTypeLabel} · `
              : ''}
            {selectedLocation.city} ({selectedLocation.lat.toFixed(4)},{' '}
            {selectedLocation.lng.toFixed(4)})
          </span>
        </div>
      )}

      {helperText && !isCoordinatesVerified && (
        <p className="text-[11px] text-[#596579] dark:text-[#94A3B8] mt-1 px-1">
          {helperText}
        </p>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] max-h-[240px] overflow-y-auto rounded-[14px] bg-white dark:bg-[#1E2230] border border-[#DCE3EB] dark:border-[#2C3245] shadow-xl py-1 divide-y divide-[#EEF2F6] dark:divide-[#282E40]">
          {errorMessage && (
            <div className="px-3.5 py-2.5 text-[12px] text-[#C51557] dark:text-[#FF6A9B]">
              {errorMessage}
            </div>
          )}

          {!errorMessage && suggestions.length === 0 && !isLoading && (
            <div className="px-3.5 py-3 text-center text-[12px] text-[#596579] dark:text-[#A8B3C7]">
              Nenhum resultado encontrado em Salvador ou RMS.
              <br />
              <span className="text-[11px] opacity-75">
                Tente digitar o nome do bairro, rua ou ponto de referência.
              </span>
            </div>
          )}

          {suggestions.map((item, idx) => {
            const isFocused = idx === focusedIndex;
            const typeLabel =
              item.locationTypeLabel ||
              (item.locationType && TYPE_LABELS_FALLBACK[item.locationType]) ||
              'Localização';

            return (
              <button
                key={`${item.lat}-${item.lng}-${item.locationType || 'loc'}-${idx}`}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                  isFocused
                    ? 'bg-[#E1F7FC] dark:bg-[#133342]'
                    : 'hover:bg-[#F8F9FA] dark:hover:bg-[#252B3B]'
                }`}
              >
                <div className="mt-0.5 text-[#00A3C4] dark:text-[#00D2FF] shrink-0">
                  {renderSuggestionIcon(item)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-[#102536] dark:text-white truncate">
                      {item.name || item.label}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] shrink-0 whitespace-nowrap ${getTypeBadgeStyle(
                        item.locationType
                      )}`}
                    >
                      {typeLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[11px] text-[#596579] dark:text-[#A8B3C7] truncate">
                      {item.formattedAddress || item.label}
                    </p>
                    {item.city && (
                      <span className="text-[10.5px] font-semibold text-[#596579] dark:text-[#CBD5E1] shrink-0">
                        {item.city}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
