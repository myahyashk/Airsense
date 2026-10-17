import React, { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isLoading = false,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-[#112338] border border-[#1d3b61] rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {isDestructive && (
              <div className="p-2 rounded-xl bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <h3 id="modal-title" className="text-lg font-bold text-white tracking-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {description && <p className="text-sm text-slate-300 mb-5 leading-relaxed">{description}</p>}
        {children && <div className="mb-6">{children}</div>}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1d3b61]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-[#152c46] border border-[#1d3b61] rounded-xl transition-all"
          >
            {cancelLabel}
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-5 py-2 text-sm font-semibold rounded-xl text-white shadow-md transition-all disabled:opacity-50 ${
                isDestructive
                  ? "bg-[#ef4444] hover:bg-[#dc2626]"
                  : "bg-[#4f9eff] text-slate-950 hover:bg-[#3b82f6]"
              }`}
            >
              {isLoading ? "Processing..." : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
