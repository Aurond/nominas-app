import { useColorScheme } from 'react-native';

export const claro = {
  bg: '#F3F5F7', surface: '#FFFFFF', surface2: '#E9EDF1', line: '#D5DCE3', ink: '#14212E', muted: '#5B6B7A',
  accent: '#1F5FD1', accentInk: '#FFFFFF',
  net: '#0E8A6A', ss: '#D9822B', irpf: '#C2416B', other: '#7A6BD1', gross: '#1F5FD1',
  goodBg: '#DDF3EA', good: '#0B6B52', badBg: '#FBE3E8', bad: '#A3284F',
};
export const oscuro: typeof claro = {
  bg: '#0E151C', surface: '#16202A', surface2: '#1D2935', line: '#2A3846', ink: '#E6EDF3', muted: '#93A3B3',
  accent: '#5B93F5', accentInk: '#0B1622',
  net: '#3CC79E', ss: '#F0A458', irpf: '#EE7A9F', other: '#A99DF0', gross: '#5B93F5',
  goodBg: '#12382D', good: '#7FE0BF', badBg: '#3E1A26', bad: '#F7A3BC',
};
export type Tema = typeof claro;
export function useTema(): Tema { return useColorScheme() === 'dark' ? oscuro : claro; }

export const F = {
  display: 'BricolageGrotesque_700Bold',
  sans: 'IBMPlexSans_400Regular',
  sansMed: 'IBMPlexSans_500Medium',
  sansBold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMed: 'IBMPlexMono_500Medium',
};
