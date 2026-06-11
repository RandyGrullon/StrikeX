import { useWindowDimensions } from 'react-native';

export const colors = {
  bg: '#0B0F1A',
  card: '#141A2A',
  cardAlt: '#1B2236',
  border: '#242D45',
  text: '#F2F5FC',
  textMuted: '#8A94B0',
  primary: '#6C5CE7',
  primarySoft: '#2A2655',
  accent: '#FF8A3D',
  success: '#2ECC71',
  danger: '#FF5C5C',
  warning: '#F5B12E',
  gold: '#F5B12E',
  silver: '#B9C2D8',
  bronze: '#CD8A50',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const font = {
  title: 28,
  h1: 22,
  h2: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

export type Breakpoint = 'sm' | 'md' | 'lg';

/** sm: teléfono · md: tablet / ventana mediana · lg: web ancha */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= 1024) return 'lg';
  if (width >= 640) return 'md';
  return 'sm';
}

/** Ancho máximo del contenido para que en web no se estire de borde a borde */
export const MAX_CONTENT_WIDTH = 920;
