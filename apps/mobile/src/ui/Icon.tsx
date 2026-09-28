import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';

// Lucide-style icons (24 grid, 2 px stroke, round caps), drawn inline so no icon font and no image
// asset is needed. Add a name here and nowhere else.
export type IconName =
  | 'home'
  | 'calendar'
  | 'bar-chart'
  | 'sliders'
  | 'clock'
  | 'bell'
  | 'user'
  | 'plus'
  | 'minus'
  | 'x'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'check'
  | 'flag'
  | 'lock'
  | 'unlock'
  | 'download'
  | 'share'
  | 'edit'
  | 'log-out'
  | 'refresh'
  | 'mail'
  | 'info'
  | 'trending-up'
  | 'trending-down'
  | 'history'
  | 'image'
  | 'arrow-right'
  | 'swap'
  | 'more'
  | 'users'
  | 'send'
  | 'alert';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color, strokeWidth = 2 }: IconProps) {
  const theme = useTheme();
  const stroke = color ?? theme.color.text;
  const common = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {glyph(name, common)}
    </Svg>
  );
}

type Common = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: string;
};

function glyph(name: IconName, c: Common) {
  switch (name) {
    case 'home':
      return (
        <>
          <Path {...c} d="M3 11 12 3l9 8" />
          <Path {...c} d="M5 10v10h5v-6h4v6h5V10" />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect {...c} x="3" y="5" width="18" height="16" rx="3" />
          <Line {...c} x1="3" y1="10" x2="21" y2="10" />
          <Line {...c} x1="8" y1="3" x2="8" y2="7" />
          <Line {...c} x1="16" y1="3" x2="16" y2="7" />
        </>
      );
    case 'bar-chart':
      return (
        <>
          <Line {...c} x1="4" y1="20" x2="20" y2="20" />
          <Rect {...c} x="6" y="11" width="3" height="9" rx="1" />
          <Rect {...c} x="11" y="5" width="3" height="15" rx="1" />
          <Rect {...c} x="16" y="14" width="3" height="6" rx="1" />
        </>
      );
    case 'sliders':
      return (
        <>
          <Line {...c} x1="6" y1="4" x2="6" y2="20" />
          <Line {...c} x1="12" y1="4" x2="12" y2="20" />
          <Line {...c} x1="18" y1="4" x2="18" y2="20" />
          <Circle {...c} cx="6" cy="14" r="2" fill={c.stroke} />
          <Circle {...c} cx="12" cy="8" r="2" fill={c.stroke} />
          <Circle {...c} cx="18" cy="16" r="2" fill={c.stroke} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle {...c} cx="12" cy="12" r="9" />
          <Polyline {...c} points="12 7 12 12 15 14" />
        </>
      );
    case 'bell':
      return (
        <>
          <Path {...c} d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
          <Path {...c} d="M10 21h4" />
        </>
      );
    case 'user':
      return (
        <>
          <Circle {...c} cx="12" cy="8" r="4" />
          <Path {...c} d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </>
      );
    case 'users':
      return (
        <>
          <Circle {...c} cx="9" cy="8" r="3.5" />
          <Path {...c} d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
          <Path {...c} d="M16 4.5a3.5 3.5 0 0 1 0 7" />
          <Path {...c} d="M18 14c2.2.6 3.5 2.6 3.5 5" />
        </>
      );
    case 'plus':
      return (
        <>
          <Line {...c} x1="12" y1="5" x2="12" y2="19" />
          <Line {...c} x1="5" y1="12" x2="19" y2="12" />
        </>
      );
    case 'minus':
      return <Line {...c} x1="5" y1="12" x2="19" y2="12" />;
    case 'x':
      return (
        <>
          <Line {...c} x1="6" y1="6" x2="18" y2="18" />
          <Line {...c} x1="18" y1="6" x2="6" y2="18" />
        </>
      );
    case 'chevron-left':
      return <Polyline {...c} points="15 5 8 12 15 19" />;
    case 'chevron-right':
      return <Polyline {...c} points="9 5 16 12 9 19" />;
    case 'chevron-down':
      return <Polyline {...c} points="5 9 12 16 19 9" />;
    case 'check':
      return <Polyline {...c} points="4 12 10 18 20 6" />;
    case 'flag':
      return (
        <>
          <Path {...c} d="M5 21V4" />
          <Path {...c} d="M5 4h11l-2 4 2 4H5" />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect {...c} x="5" y="11" width="14" height="10" rx="2" />
          <Path {...c} d="M8 11V7a4 4 0 0 1 8 0v4" />
        </>
      );
    case 'unlock':
      return (
        <>
          <Rect {...c} x="5" y="11" width="14" height="10" rx="2" />
          <Path {...c} d="M8 11V7a4 4 0 0 1 7.5-2" />
        </>
      );
    case 'download':
      return (
        <>
          <Path {...c} d="M12 4v11" />
          <Polyline {...c} points="7 10 12 15 17 10" />
          <Path {...c} d="M4 19h16" />
        </>
      );
    case 'share':
      return (
        <>
          <Path {...c} d="M12 15V4" />
          <Polyline {...c} points="7 9 12 4 17 9" />
          <Path {...c} d="M5 13v6h14v-6" />
        </>
      );
    case 'edit':
      return (
        <>
          <Path {...c} d="M4 20h4l11-11-4-4L4 16z" />
          <Path {...c} d="M13 7l4 4" />
        </>
      );
    case 'log-out':
      return (
        <>
          <Path {...c} d="M10 4H5v16h5" />
          <Path {...c} d="M14 8l4 4-4 4" />
          <Path {...c} d="M9 12h9" />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path {...c} d="M20 11a8 8 0 0 0-14.5-4.5L4 8" />
          <Path {...c} d="M4 4v4h4" />
          <Path {...c} d="M4 13a8 8 0 0 0 14.5 4.5L20 16" />
          <Path {...c} d="M20 20v-4h-4" />
        </>
      );
    case 'mail':
      return (
        <>
          <Rect {...c} x="3" y="5" width="18" height="14" rx="3" />
          <Polyline {...c} points="3 8 12 13 21 8" />
        </>
      );
    case 'info':
      return (
        <>
          <Circle {...c} cx="12" cy="12" r="9" />
          <Line {...c} x1="12" y1="11" x2="12" y2="16" />
          <Circle {...c} cx="12" cy="8" r="0.6" fill={c.stroke} />
        </>
      );
    case 'alert':
      return (
        <>
          <Path {...c} d="M12 3 2 20h20z" />
          <Line {...c} x1="12" y1="9" x2="12" y2="14" />
          <Circle {...c} cx="12" cy="17" r="0.6" fill={c.stroke} />
        </>
      );
    case 'trending-up':
      return (
        <>
          <Polyline {...c} points="3 17 9 11 13 15 21 7" />
          <Polyline {...c} points="15 7 21 7 21 13" />
        </>
      );
    case 'trending-down':
      return (
        <>
          <Polyline {...c} points="3 7 9 13 13 9 21 17" />
          <Polyline {...c} points="15 17 21 17 21 11" />
        </>
      );
    case 'history':
      return (
        <>
          <Path {...c} d="M3 12a9 9 0 1 0 3-6.7" />
          <Polyline {...c} points="3 4 3 9 8 9" />
          <Polyline {...c} points="12 8 12 12 15 14" />
        </>
      );
    case 'image':
      return (
        <>
          <Rect {...c} x="3" y="4" width="18" height="16" rx="3" />
          <Circle {...c} cx="9" cy="10" r="1.5" />
          <Path {...c} d="M21 16l-5-5-8 9" />
        </>
      );
    case 'arrow-right':
      return (
        <>
          <Line {...c} x1="4" y1="12" x2="20" y2="12" />
          <Polyline {...c} points="13 5 20 12 13 19" />
        </>
      );
    case 'swap':
      return (
        <>
          <Path {...c} d="M4 8h13l-3-3" />
          <Path {...c} d="M20 16H7l3 3" />
        </>
      );
    case 'more':
      return (
        <>
          <Circle {...c} cx="6" cy="12" r="1.2" fill={c.stroke} />
          <Circle {...c} cx="12" cy="12" r="1.2" fill={c.stroke} />
          <Circle {...c} cx="18" cy="12" r="1.2" fill={c.stroke} />
        </>
      );
    case 'send':
      return (
        <>
          <Path {...c} d="M21 3 10 14" />
          <Path {...c} d="M21 3l-7 18-4-7-7-4z" />
        </>
      );
    default:
      return null;
  }
}
