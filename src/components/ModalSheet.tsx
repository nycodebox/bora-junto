import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const ModalSheet: React.FC<ModalSheetProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-[#102536]/45 dark:bg-black/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-[28px] bg-white dark:bg-[#1E2230] text-[#102536] dark:text-white border-t border-[#E4E9F0] dark:border-[#2C3245] px-6 pt-3 pb-7 shadow-2xl max-h-[82%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-[#DCE3EB] dark:bg-[#343B4F] mx-auto mb-4" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-[19px] font-bold tracking-[-0.02em] text-[#102536] dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[13px] text-[#596579] dark:text-[#A8B3C7] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 -mr-1 rounded-full bg-[#EEF2F6] dark:bg-[#282E40] flex items-center justify-center text-[#596579] dark:text-[#CBD5E1] hover:opacity-80 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};
