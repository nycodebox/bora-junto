import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      {...props}
      className={`w-full h-[54px] rounded-[16px] bg-[#00D2FF] hover:bg-[#00C4EF] active:scale-[0.99] text-[#102536] font-bold text-[15.5px] tracking-[-0.01em] flex items-center justify-center transition-all cursor-pointer select-none ${className}`}
    >
      {children}
    </button>
  );
};

export type BadgeVariant = 'green' | 'cyan' | 'pink' | 'neutral';

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  children,
  className = '',
}) => {
  const styles: Record<BadgeVariant, string> = {
    green: 'bg-[#E5F6EF] text-[#137A59] dark:bg-[#18392F] dark:text-[#66DBB1]',
    cyan: 'bg-[#E1F7FC] text-[#104A63] dark:bg-[#133342] dark:text-[#7AE4FF]',
    pink: 'bg-[#FDEAF1] text-[#C51557] dark:bg-[#3B2034] dark:text-[#FF6A9B]',
    neutral: 'bg-[#F1F5F9] text-[#1D293B] dark:bg-[#141925] dark:text-[#E2E8F0]',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold text-[12px] leading-none whitespace-nowrap ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

/* Custom crisp icons matching Figma geometry */
export const WalkingIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="13" cy="4.5" r="1.75" stroke="currentColor" strokeWidth="1.9" />
    <path
      d="M9.5 10.5l2.5-2 2.4 2.1 2.6 1.2M12 8.5l-1.2 5.2m0 0l-2.6 5.8m2.6-5.8l3.5 2.4 1 3.4"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CarFrontIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M5.5 11l1.4-4.1A1.8 1.8 0 0 1 8.6 5.7h6.8a1.8 1.8 0 0 1 1.7 1.2L18.5 11m-13 0h13a1.5 1.5 0 0 1 1.5 1.5v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-.7H7v.7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4A1.5 1.5 0 0 1 5.5 11Z"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="7.7" cy="14.2" r="1" fill="currentColor" />
    <circle cx="16.3" cy="14.2" r="1" fill="currentColor" />
  </svg>
);

export const PixLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <rect
      x="16"
      y="3.5"
      width="17.6"
      height="17.6"
      rx="3.2"
      transform="rotate(45 16 3.5)"
      stroke="currentColor"
      strokeWidth="2.1"
    />
    <path
      d="M10.8 10.8L21.2 21.2M21.2 10.8L10.8 21.2"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
    />
  </svg>
);

interface IllustrativeMapProps {
  mode: 'preview' | 'active';
  destinationLabel?: string;
  transportMode?: 'bando' | 'racha' | 'carona';
}

export const IllustrativeMap: React.FC<IllustrativeMapProps> = ({
  mode,
  destinationLabel = 'Saúde',
  transportMode = 'racha',
}) => {
  const heightClass = mode === 'preview' ? 'h-[156px]' : 'h-[186px]';

  return (
    <div
      className={`relative w-full ${heightClass} rounded-[20px] overflow-hidden bg-[#EBEFF4] dark:bg-[#222736] border border-[#E4E9F0] dark:border-[#2C3245] select-none`}
    >
      {/* Slanted illustrative road blocks */}
      <svg
        viewBox="0 0 342 186"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <g transform="rotate(-11 171 93)">
          <rect
            x="24"
            y="-30"
            width="44"
            height="250"
            rx="16"
            className="fill-white/85 dark:fill-[#2B3144]"
          />
          <rect
            x="92"
            y="-30"
            width="44"
            height="250"
            rx="16"
            className="fill-white/85 dark:fill-[#2B3144]"
          />
          <rect
            x="160"
            y="-30"
            width="44"
            height="250"
            rx="16"
            className="fill-white/85 dark:fill-[#2B3144]"
          />
          <rect
            x="228"
            y="-30"
            width="44"
            height="250"
            rx="16"
            className="fill-white/85 dark:fill-[#2B3144]"
          />
          <rect
            x="296"
            y="-30"
            width="44"
            height="250"
            rx="16"
            className="fill-white/85 dark:fill-[#2B3144]"
          />
        </g>

        {/* Route Path */}
        {mode === 'preview' ? (
          <path
            d="M 50 56 H 138 Q 152 56 152 70 V 104 Q 152 118 166 118 H 276"
            fill="none"
            stroke="#00C4F4"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <>
            {/* Remaining gray segment */}
            <path
              d="M 152 94 V 118 Q 152 132 166 132 H 276"
              fill="none"
              className="stroke-[#CBD5E1] dark:stroke-[#94A3B8]/55"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Completed cyan segment */}
            <path
              d="M 50 54 H 138 Q 152 54 152 68 V 94"
              fill="none"
              stroke="#00C4F4"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Start point (Campus) */}
        <circle
          cx="50"
          cy={mode === 'preview' ? 56 : 54}
          r="8.5"
          className="fill-[#102536] dark:fill-[#12151E]"
          stroke="#00C4F4"
          strokeWidth="4.5"
        />

        {/* Destination point */}
        <circle
          cx="276"
          cy={mode === 'preview' ? 118 : 132}
          r="7.5"
          fill="#F42563"
        />
      </svg>

      {/* Active marker in Screen 07 */}
      {mode === 'active' && (
        <div
          className="absolute left-[44.4%] top-[50.5%] -translate-x-1/2 -translate-y-1/2 w-[38px] h-[38px] rounded-full bg-[#00D2FF] ring-[3px] ring-white dark:ring-[#1E2230] shadow-md flex items-center justify-center text-[#102536]"
          aria-hidden="true"
        >
          {transportMode === 'bando' ? (
            <WalkingIcon className="w-[20px] h-[20px]" />
          ) : (
            <CarFrontIcon className="w-[20px] h-[20px]" />
          )}
        </div>
      )}

      {/* Floating Campus Tag */}
      <div className="absolute left-[26px] top-[12px] px-3 py-[4px] rounded-full bg-white/95 dark:bg-[#191D29] text-[#102536] dark:text-white text-[11px] font-bold shadow-xs">
        Campus
      </div>

      {/* Floating Destination Tag */}
      <div
        className={`absolute right-[24px] ${
          mode === 'preview' ? 'bottom-[12px]' : 'bottom-[14px]'
        } px-4 py-[4px] rounded-full bg-white/95 dark:bg-[#191D29] text-[#102536] dark:text-white text-[11px] font-bold shadow-xs max-w-[120px] truncate`}
      >
        {destinationLabel}
      </div>

      {/* Caption */}
      <span className="absolute left-[38%] bottom-[8px] text-[10px] font-medium text-[#596579] dark:text-[#94A3B8]">
        Mapa ilustrativo
      </span>
    </div>
  );
};
