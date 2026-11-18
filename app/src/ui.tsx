import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from './store';
import { F, useTema } from './theme';

export function Pantalla({ children, titulo, derecha }: { children: React.ReactNode; titulo?: string; derecha?: React.ReactNode }) {
  const t = useTema();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
      {titulo ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><H1>{titulo}</H1>{derecha}</View> : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTema();
  return <View style={[{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 16, gap: 12 }, style]}>{children}</View>;
}

export const H1 = ({ children }: { children: React.ReactNode }) => { const t = useTema(); return <Text style={{ fontFamily: F.display, fontSize: 28, color: t.ink, letterSpacing: -0.3 }}>{children}</Text>; };
export const H2 = ({ children }: { children: React.ReactNode }) => { const t = useTema(); return <Text style={{ fontFamily: F.display, fontSize: 20, color: t.ink }}>{children}</Text>; };
export const H3 = ({ children }: { children: React.ReactNode }) => { const t = useTema(); return <Text style={{ fontFamily: F.display, fontSize: 16, color: t.ink }}>{children}</Text>; };

export function Txt({ children, muted, small, bold, mono, color, style, center }: { children: React.ReactNode; muted?: boolean; small?: boolean; bold?: boolean; mono?: boolean; color?: string; style?: TextStyle; center?: boolean }) {
  const t = useTema();
  return <Text style={[{ fontFamily: mono ? F.mono : bold ? F.sansBold : F.sans, fontSize: small ? 12.5 : 15, lineHeight: small ? 17 : 21, color: color || (muted ? t.muted : t.ink), textAlign: center ? 'center' : undefined, fontVariant: mono ? ['tabular-nums'] : undefined }, style]}>{children}</Text>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const t = useTema();
  return <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: t.muted }}>{children}</Text>;
}

export function Btn({ children, onPress, tipo = 'normal', small, disabled, cargando, style }: { children: React.ReactNode; onPress: () => void; tipo?: 'normal' | 'primario' | 'peligro'; small?: boolean; disabled?: boolean; cargando?: boolean; style?: ViewStyle }) {
  const t = useTema();
  const bg = tipo === 'primario' ? t.accent : tipo === 'peligro' ? t.badBg : t.surface2;
  const fg = tipo === 'primario' ? t.accentInk : tipo === 'peligro' ? t.bad : t.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled || cargando} style={({ pressed }) => [{ backgroundColor: bg, borderRadius: small ? 10 : 12, paddingVertical: small ? 7 : 12, paddingHorizontal: small ? 12 : 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, style]}>
      {cargando ? <ActivityIndicator color={fg} size="small" /> : null}
      <Text style={{ fontFamily: F.sansBold, fontSize: small ? 13 : 15, color: fg }}>{children}</Text>
    </Pressable>
  );
}

export function Pill({ children, tipo }: { children: React.ReactNode; tipo?: 'bien' | 'mal' | 'aviso' | 'ejemplo' }) {
  const t = useTema();
  const bg = tipo === 'bien' ? t.goodBg : tipo === 'mal' ? t.badBg : tipo === 'ejemplo' ? t.accent : t.surface2;
  const fg = tipo === 'bien' ? t.good : tipo === 'mal' ? t.bad : tipo === 'ejemplo' ? t.accentInk : tipo === 'aviso' ? t.ss : t.muted;
  return <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', borderWidth: tipo === 'aviso' ? 1 : 0, borderColor: t.ss }}><Text style={{ fontFamily: F.sansBold, fontSize: 11, color: fg }}>{children}</Text></View>;
}

export function Banner({ children, tipo }: { children: React.ReactNode; tipo?: 'mal' | 'bien' }) {
  const t = useTema();
  return <View style={{ backgroundColor: tipo === 'mal' ? t.badBg : tipo === 'bien' ? t.goodBg : t.surface2, borderRadius: 12, padding: 12 }}><Txt small color={tipo === 'mal' ? t.bad : tipo === 'bien' ? t.good : t.muted}>{children}</Txt></View>;
}

export function Fila({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Tiles({ items }: { items: { l: string; v: string; s?: string; color?: string }[] }) {
  const t = useTema();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {items.map((x, i) => (
        <View key={i} style={{ width: '48%', flexGrow: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 12, gap: 3 }}>
          <Eyebrow>{x.l}</Eyebrow>
          <Text style={{ fontFamily: F.mono, fontSize: 18, color: x.color || t.ink }}>{x.v}</Text>
          {x.s ? <Txt small muted>{x.s}</Txt> : null}
        </View>
      ))}
    </View>
  );
}

export function Campo({ label, mitad, ...p }: TextInputProps & { label: string; mitad?: boolean }) {
  const t = useTema();
  return (
    <View style={mitad ? { gap: 4, flexGrow: 1, flexBasis: '45%' } : { gap: 4 }}>
      <Txt small muted>{label}</Txt>
      <TextInput placeholderTextColor={t.muted} {...p} style={[{ borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.sans, fontSize: 16, color: t.ink }, p.style as any]} />
    </View>
  );
}

export function Chips<T extends string | number>({ opciones, valor, onChange }: { opciones: { v: T; l: string }[]; valor: T; onChange: (v: T) => void }) {
  const t = useTema();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {opciones.map((o) => {
        const on = o.v === valor;
        return (
          <Pressable key={String(o.v)} onPress={() => onChange(o.v)} style={{ borderWidth: 1, borderColor: on ? t.ink : t.line, backgroundColor: on ? t.ink : t.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 13, color: on ? t.bg : t.ink }}>{o.l}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Tabla sencilla: primera columna flexible y el resto a la derecha. */
export function Tabla({ cab, filas, total, anchos }: { cab: string[]; filas: React.ReactNode[][]; total?: React.ReactNode[]; anchos?: number[] }) {
  const t = useTema();
  const w = (i: number) => (i === 0 ? { flex: 1, minWidth: 0 } : { width: anchos?.[i] ?? 84 });
  const celda = (c: React.ReactNode, i: number, bold?: boolean) => (
    <View key={i} style={[w(i), { alignItems: i === 0 ? 'flex-start' : 'flex-end' }]}>
      {typeof c === 'string' || typeof c === 'number'
        ? <Text style={{ fontFamily: i === 0 ? (bold ? F.sansBold : F.sans) : (bold ? F.monoMed : F.mono), fontSize: 13.5, color: t.ink, textAlign: i === 0 ? 'left' : 'right', fontVariant: ['tabular-nums'] }}>{c}</Text>
        : c}
    </View>
  );
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 6, borderBottomWidth: 1, borderColor: t.line }}>
        {cab.map((c, i) => <View key={i} style={[w(i), { alignItems: i === 0 ? 'flex-start' : 'flex-end' }]}><Eyebrow>{c}</Eyebrow></View>)}
      </View>
      {filas.map((f, j) => <View key={j} style={{ flexDirection: 'row', gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderColor: t.line }}>{f.map((c, i) => celda(c, i))}</View>)}
      {total ? <View style={{ flexDirection: 'row', gap: 6, paddingTop: 8, borderTopWidth: 1.5, borderColor: t.ink }}>{total.map((c, i) => celda(c, i, true))}</View> : null}
    </View>
  );
}

export function Toast() {
  const t = useTema(); const ins = useSafeAreaInsets(); const { toast } = useStore();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: ins.bottom + 80, backgroundColor: t.ink, borderRadius: 12, padding: 12 }}>
      <Text style={{ fontFamily: F.sansMed, color: t.bg, fontSize: 14 }}>{toast}</Text>
    </View>
  );
}
