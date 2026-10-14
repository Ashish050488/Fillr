import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDropdownPlacement } from '../hooks/useDropdownPlacement';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  isCompact?: boolean;
}

const SEARCH_SHOWN_ABOVE_OPTION_COUNT = 8;

/** Hand-drawn replacement for the native select, whose open list the browser draws in its own style. */
export default function Dropdown({
  value,
  options,
  onChange,
  id,
  ariaLabel,
  placeholder = 'Select…',
  isCompact = false,
}: DropdownProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const placementStyle = useDropdownPlacement(triggerRef, isOpen);

  const hasSearch = options.length > SEARCH_SHOWN_ABOVE_OPTION_COUNT;
  const visibleOptions = options.filter((option) => option.label.toLowerCase().includes(searchText.toLowerCase()));
  const selectedOption = options.find((option) => option.value === value);

  const openList = () => {
    setSearchText('');
    setHighlightedIndex(Math.max(0, options.indexOf(selectedOption as DropdownOption)));
    setIsOpen(true);
  };
  const closeList = (shouldRefocus = true) => {
    setIsOpen(false);
    if (shouldRefocus) triggerRef.current?.focus();
  };
  const handleChoose = (option: DropdownOption) => {
    onChange(option.value);
    closeList();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !popoverRef.current?.contains(target)) closeList(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    popoverRef.current
      ?.querySelector(`[data-option-index="${highlightedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    const lastIndex = visibleOptions.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(lastIndex, highlightedIndex + 1),
      ArrowUp: Math.max(0, highlightedIndex - 1),
      Home: 0,
      End: lastIndex,
    };
    if (event.key in moves) {
      event.preventDefault();
      setHighlightedIndex(moves[event.key]);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const highlightedOption = visibleOptions[highlightedIndex];
      if (highlightedOption) handleChoose(highlightedOption);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
    } else if (event.key === 'Tab') closeList(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={`dropdown ${isCompact ? 'compact' : ''} ${isOpen ? 'open' : ''}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="dropdown-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => (isOpen ? closeList() : openList())}
      >
        <span className={selectedOption ? '' : 'dropdown-placeholder'}>{selectedOption?.label ?? placeholder}</span>
        <svg className="dropdown-chevron" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1.5c1.6 1.4 3.3 3 5 4.8 1.6-1.9 3.3-3.4 5-4.9" />
        </svg>
      </button>
      {isOpen &&
        createPortal(
          <div ref={popoverRef} className="dropdown-popover" style={placementStyle}>
            {hasSearch && (
              <input
                autoFocus
                className="dropdown-search"
                placeholder="Type to search…"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setHighlightedIndex(0);
                }}
              />
            )}
            <ul id={listId} role="listbox" className="dropdown-list" aria-label={ariaLabel}>
              {visibleOptions.map((option, optionIndex) => (
                <li
                  key={option.value}
                  role="option"
                  data-option-index={optionIndex}
                  aria-selected={option.value === value}
                  className={`dropdown-option ${optionIndex === highlightedIndex ? 'highlighted' : ''}`}
                  onPointerEnter={() => setHighlightedIndex(optionIndex)}
                  title={option.label}
                  onClick={() => handleChoose(option)}
                >
                  {option.label}
                </li>
              ))}
              {!visibleOptions.length && <li className="dropdown-empty">Nothing matches</li>}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
