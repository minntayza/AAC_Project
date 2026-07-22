interface ParentModalProps {
  mathA: number;
  mathB: number;
  mathInput: string;
  mathError: string;
  onInputChange: (value: string) => void;
  onUnlock: () => void;
  onClose: () => void;
}

export function ParentModal({
  mathA,
  mathB,
  mathInput,
  mathError,
  onInputChange,
  onUnlock,
  onClose,
}: ParentModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Parent mode unlock">
      <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
        <button className="portal-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="portal-lock-icon">🔒</div>
        <div className="portal-title">Parent / Teacher Mode</div>
        <p className="portal-subtitle">Solve the math problem to unlock settings</p>
        <div className="portal-math-box">
          <div className="portal-math-question">{mathA} + {mathB} = ?</div>
          <input
            className="portal-math-input"
            type="number"
            value={mathInput}
            onChange={(e) => { onInputChange(e.target.value); }}
            onKeyDown={(e) => e.key === 'Enter' && onUnlock()}
            placeholder="?"
            autoFocus
            aria-label="Answer"
          />
          {mathError && <p className="error-hint">{mathError}</p>}
        </div>
        <button className="btn-portal-unlock" onClick={onUnlock}>
          Unlock
        </button>
      </div>
    </div>
  );
}
