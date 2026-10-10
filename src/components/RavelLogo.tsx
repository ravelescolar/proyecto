import React from 'react';

interface RavelLogoProps {
  variant?: 'badge' | 'color' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  className?: string;
  customLogoUrl?: string;
}

export const RavelLogo: React.FC<RavelLogoProps> = ({
  variant = 'badge',
  size = 'md',
  showSlogan = true,
  className = '',
  customLogoUrl,
}) => {
  const sizeMap = {
    sm: { width: 100, height: 42, text: 10 },
    md: { width: 145, height: 60, text: 13 },
    lg: { width: 195, height: 80, text: 15 },
    xl: { width: 250, height: 102, text: 18 },
  };

  const { width, height } = sizeMap[size];

  // If the user uploaded a custom logo image file (e.g. valid dataUrl), render it
  const isValidCustomLogo =
    typeof customLogoUrl === 'string' &&
    customLogoUrl.trim().length > 20 &&
    (customLogoUrl.startsWith('data:image/') || customLogoUrl.startsWith('http'));

  if (isValidCustomLogo) {
    return (
      <div className={`inline-flex items-center justify-center overflow-hidden rounded-xl ${className}`}>
        <img
          src={customLogoUrl}
          alt="TRANSPORTES RAVEL - donde quieras llegar"
          className="object-contain max-h-16"
          style={{ width: `${width}px` }}
        />
      </div>
    );
  }

  // Exact reproduction of the uploaded RAVEL logo
  // Dark charcoal background: #28333c
  const isBadge = variant === 'badge';
  const bgColor = isBadge ? '#28333c' : variant === 'dark' ? '#1e293b' : 'transparent';
  const strokeColor = isBadge || variant === 'dark' || variant === 'light' ? '#ffffff' : '#064e3b';
  const sloganColor = isBadge || variant === 'dark' || variant === 'light' ? '#f8fafc' : '#065f46';
  const pinDotColor = isBadge ? '#28333c' : variant === 'dark' ? '#1e293b' : '#ffffff';

  return (
    <div
      className={`inline-flex items-center justify-center transition-transform ${
        isBadge ? 'rounded-xl p-2.5 shadow-sm' : ''
      } ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <svg
        viewBox="0 0 240 100"
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible select-none"
      >
        {/* Continuous highway line / stylized "ravel" emblem */}
        <g
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* R: Upper bar rounded left -> curves down -> loops into stem and foot */}
          <path d="M 28 32 H 48 C 58 32 58 52 48 52 H 30 V 68" />
          <path d="M 43 52 C 48 52 52 68 62 68" />

          {/* a: Smooth lower bowl */}
          <path d="M 62 68 C 66 68 76 68 78 58 C 80 47 71 46 66 50 C 60 55 60 64 68 68 C 76 72 82 68 85 58" />

          {/* Location Pin stem rising above 'a' */}
          <path d="M 85 58 L 98 38" />

          {/* v: Valley descending from pin marker down to base then up */}
          <path d="M 103 40 L 118 68 L 134 46" />

          {/* e: Looping curve */}
          <path d="M 134 56 H 154 C 154 44 140 44 136 54 C 132 64 142 69 152 68" />

          {/* l: Baseline connection rising into tall vertical rounded top */}
          <path d="M 152 68 C 160 68 168 68 174 68 L 174 32" />
        </g>

        {/* Location Pin Head (GPS icon marker) */}
        <circle
          cx="100"
          cy="34"
          r="8"
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <circle cx="100" cy="34" r="3.2" fill={pinDotColor} />

        {/* Official Slogan: donde quieras llegar */}
        {showSlogan && (
          <text
            x="120"
            y="92"
            textAnchor="middle"
            fill={sloganColor}
            fontSize="14.5"
            fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
            fontWeight="500"
            letterSpacing="0.04em"
          >
            donde quieras llegar
          </text>
        )}
      </svg>
    </div>
  );
};
