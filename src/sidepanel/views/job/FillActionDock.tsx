import React from 'react';
import Spinner from '../../components/Spinner';

interface FillActionDockProps {
  isWeakFit: boolean;
  isBusy: boolean;
  isFilling: boolean;
  onFill: (isForced: boolean) => void;
}

/** The sticky buttons at the bottom: autofill, or for a weak fit, "fill anyway" vs "only my details". */
export default function FillActionDock({ isWeakFit, isBusy, isFilling, onFill }: FillActionDockProps) {
  return (
    <div className="dock" style={{ margin: '0 -16px', position: 'sticky' }}>
      {isWeakFit ? (
        <div className="stack-sm">
          <button className="btn primary big block" type="button" disabled={isBusy} onClick={() => onFill(true)}>
            Fill everything anyway
          </button>
          <button className="btn block" type="button" disabled={isBusy} onClick={() => onFill(false)}>
            Only fill my details
          </button>
          <p className="small muted center">Weak fit, but applying still puts your resume in their database.</p>
        </div>
      ) : (
        <button className="btn primary big block" type="button" disabled={isBusy} onClick={() => onFill(false)}>
          {isFilling ? (
            <>
              <Spinner /> Filling…
            </>
          ) : (
            'Autofill this application'
          )}
        </button>
      )}
    </div>
  );
}
