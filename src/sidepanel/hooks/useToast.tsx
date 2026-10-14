import React, { useCallback, useEffect, useRef, useState } from 'react';

const TOAST_MILLISECONDS = 2200;

/** A short confirmation ("Copied", "Deleted") at the bottom of the panel. */
export function useToast() {
  const [toastText, setToastText] = useState('');
  const hideTimeout = useRef<number>();
  const show = useCallback((message: string) => {
    setToastText(message);
    window.clearTimeout(hideTimeout.current);
    hideTimeout.current = window.setTimeout(() => setToastText(''), TOAST_MILLISECONDS);
  }, []);
  useEffect(() => () => window.clearTimeout(hideTimeout.current), []);
  const toastElement = toastText ? (
    <div className="toast" role="status">
      {toastText}
    </div>
  ) : null;
  return { show, node: toastElement };
}
