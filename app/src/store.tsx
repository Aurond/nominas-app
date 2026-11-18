// Estado: sesión de Supabase y documentos (nóminas, calendarios, ajustes, por cobrar) con caché en el móvil.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { EJEMPLOS, key, leerAjustes, type Ajustes, type Doc, type Nomina } from './logic';
import { supabase } from './supabase';

type Ctx = {
  session: Session | null;
  listo: boolean;
  docs: Record<string, any>;
  nominas: Nomina[];          // reales, ordenadas por periodo
  datos: Nomina[];            // reales o de ejemplo si aún no hay
  ejemplo: boolean;
  ajustes: Ajustes;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  guardar: (id: string, body: Record<string, any>) => void;
  borrar: (id: string) => void;
  toast: string | null;
  avisar: (t: string) => void;
};

const C = createContext<Ctx>(null as any);
export const useStore = () => useContext(C);
const CACHE = 'nominas:v1';
const TABLA = 'nominas';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [docs, setDocs] = useState<Record<string, any>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const tt = useRef<any>(null);
  const colas = useRef<Record<string, Promise<any>>>({});
  const ref = useRef<Record<string, any>>({});

  const avisar = useCallback((t: string) => {
    setToast(t); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setListo(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    AsyncStorage.getItem(CACHE).then((c) => {
      if (c && !Object.keys(ref.current).length) { try { ref.current = JSON.parse(c); setDocs({ ...ref.current }); } catch {} }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const fijar = useCallback((m: Record<string, any>) => {
    ref.current = m; setDocs({ ...m });
    AsyncStorage.setItem(CACHE, JSON.stringify(m)).catch(() => {});
  }, []);

  const recargar = useCallback(async () => {
    if (!session) return;
    setCargando(true); setError(null);
    try {
      const m: Record<string, any> = {};
      for (let desde = 0; ; desde += 1000) {
        const { data, error } = await supabase.from(TABLA).select('id,data').range(desde, desde + 999);
        if (error) throw error;
        for (const r of data || []) m[r.id] = { ...(r.data as any), id: r.id };
        if (!data || data.length < 1000) break;
      }
      fijar(m);
    } catch (e: any) {
      const msg = String(e?.message || '');
      setError(/relation|does not exist|schema cache/i.test(msg)
        ? 'Falta crear la tabla "nominas" en Supabase. Ejecuta el script supabase.sql del repositorio en el SQL Editor.'
        : 'No se pudo conectar. Se muestra lo último guardado en el móvil.');
    }
    setCargando(false);
  }, [session, fijar]);

  useEffect(() => { if (session) recargar(); }, [session, recargar]);
  useEffect(() => {
    const s = AppState.addEventListener('change', (e) => { if (e === 'active' && session) recargar(); });
    return () => s.remove();
  }, [session, recargar]);

  const guardar = useCallback((id: string, body: Record<string, any>) => {
    const { id: _x, ...data } = body as any;
    fijar({ ...ref.current, [id]: { ...data, id } });
    const p = (colas.current[id] || Promise.resolve()).then(async () => {
      const { error } = await supabase.from(TABLA).upsert({ id, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id,id' });
      if (error) throw error;
    }).catch(() => avisar('No se pudo guardar en la nube; está guardado en el móvil.'));
    colas.current[id] = p;
  }, [fijar, avisar]);

  const borrar = useCallback((id: string) => {
    const m = { ...ref.current }; delete m[id]; fijar(m);
    supabase.from(TABLA).delete().eq('id', id).then(({ error }) => { if (error) avisar('No se pudo borrar en la nube.'); });
  }, [fijar, avisar]);

  const valor = useMemo<Ctx>(() => {
    const nominas = (Object.values(docs) as Doc[]).filter((d) => String(d.id).startsWith('n-')).map((d) => d as unknown as Nomina).sort((a, b) => key(a) - key(b));
    const ejemplo = !nominas.length;
    return { session, listo, docs, nominas, datos: ejemplo ? EJEMPLOS : nominas, ejemplo, ajustes: leerAjustes(docs.ajustes),
      cargando, error, recargar, guardar, borrar, toast, avisar };
  }, [session, listo, docs, cargando, error, recargar, guardar, borrar, toast, avisar]);

  return <C.Provider value={valor}>{children}</C.Provider>;
}
