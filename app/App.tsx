import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Historial, Anual, Comparar } from './src/screens/Historial';
import { Inicio } from './src/screens/Inicio';
import { Login } from './src/screens/Login';
import { Detalle } from './src/screens/Nomina';
import { PorCobrar } from './src/screens/PorCobrar';
import { Revisar } from './src/screens/Revisar';
import { StoreProvider, useStore } from './src/store';
import { F, useTema } from './src/theme';
import { Toast } from './src/ui';

type Tab = 'inicio' | 'historial' | 'anual' | 'revisar' | 'cobrar' | 'comparar';
const TABS: { k: Tab; l: string }[] = [
  { k: 'inicio', l: 'Inicio' }, { k: 'historial', l: 'Historial' }, { k: 'anual', l: 'Anual' },
  { k: 'revisar', l: 'Revisar' }, { k: 'cobrar', l: 'Por cobrar' }, { k: 'comparar', l: 'Comparar' },
];

function Icono({ k, color }: { k: Tab; color: string }) {
  const p = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {k === 'inicio' && <><Path d="M4 11l8-7 8 7v9H4z" {...p} /><Path d="M10 20v-6h4v6" {...p} /></>}
      {k === 'historial' && <><Path d="M4 19h16" {...p} /><Path d="M5 15l4-5 4 3 6-7" {...p} /></>}
      {k === 'anual' && <><Rect x={4} y={5} width={16} height={15} rx={2} {...p} /><Path d="M4 10h16M9 3v4M15 3v4" {...p} /></>}
      {k === 'revisar' && <><Circle cx={12} cy={12} r={8.5} {...p} /><Path d="M8.5 12.2l2.4 2.4 4.6-5" {...p} /></>}
      {k === 'cobrar' && <><Rect x={3.5} y={6} width={17} height={13} rx={2} {...p} /><Path d="M3.5 10h17M15 14.5h2.5" {...p} /></>}
      {k === 'comparar' && <><Path d="M7 4v16M17 4v16" {...p} /><Path d="M3 8h8M13 16h8" {...p} /></>}
    </Svg>
  );
}

function Principal() {
  const t = useTema(); const ins = useSafeAreaInsets();
  const { session, listo, docs } = useStore();
  const [tab, setTab] = useState<Tab>('inicio');
  const [abierto, setAbierto] = useState<string | null>(null);

  if (!listo) return <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (!session) return <Login />;
  const pend = Object.values(docs).filter((x: any) => String(x.id).startsWith('pc-') && x.estado !== 'cobrado').length;
  const irA = (k: string) => setTab(k as Tab);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top }}>
      {tab === 'inicio' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 30, color: t.ink }}>Mis Nóminas</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        {tab === 'inicio' && <Inicio abrir={setAbierto} irA={irA} />}
        {tab === 'historial' && <Historial abrir={setAbierto} />}
        {tab === 'anual' && <Anual />}
        {tab === 'revisar' && <Revisar irA={irA} />}
        {tab === 'cobrar' && <PorCobrar />}
        {tab === 'comparar' && <Comparar />}
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: t.line, backgroundColor: t.surface, paddingBottom: ins.bottom + 2, paddingTop: 6 }}>
        {TABS.map((x) => {
          const on = tab === x.k, c = on ? t.accent : t.muted;
          return (
            <Pressable key={x.k} onPress={() => setTab(x.k)} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 }}>
              <Icono k={x.k} color={c} />
              <Text numberOfLines={1} style={{ fontFamily: F.sansBold, fontSize: 10.5, color: c }}>{x.l}</Text>
              {x.k === 'cobrar' && pend > 0 && (
                <View style={{ position: 'absolute', top: -2, right: '18%', backgroundColor: t.bad, borderRadius: 9, paddingHorizontal: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontFamily: F.sansBold }}>{pend}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Toast />
      <Detalle id={abierto} onClose={() => setAbierto(null)} />
    </View>
  );
}

export default function App() {
  const [fuentes] = useFonts({ BricolageGrotesque_700Bold, IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexMono_400Regular, IBMPlexMono_500Medium });
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {fuentes ? <StoreProvider><Principal /></StoreProvider> : <View style={{ flex: 1, backgroundColor: '#F3F5F7' }} />}
    </SafeAreaProvider>
  );
}
