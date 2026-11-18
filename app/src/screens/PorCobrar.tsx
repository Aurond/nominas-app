import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { decTxt, eur, fechaCorta, hoy, label, leerFecha, num, PC_BY, PC_TIPOS, r2, sum, toNum } from '../logic';
import { useStore } from '../store';
import { F, useTema } from '../theme';
import { Banner, Btn, Campo, Card, Chips, Eyebrow, Fila, H3, Pantalla, Txt } from '../ui';

export function PorCobrar() {
  const t = useTema();
  const { docs, guardar, borrar, ajustes, nominas, avisar } = useStore();
  const [tipo, setTipo] = useState('horas_extra');
  const [fecha, setFecha] = useState('');
  const [cant, setCant] = useState('');
  const [precio, setPrecio] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [msg, setMsg] = useState('');
  const [del, setDel] = useState<string | null>(null);

  const items = (Object.values(docs) as any[]).filter((x) => String(x.id).startsWith('pc-'))
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || String(b.creado || '').localeCompare(String(a.creado || '')));
  const pend = items.filter((x) => x.estado !== 'cobrado'), cob = items.filter((x) => x.estado === 'cobrado');
  const tp = PC_BY[tipo];
  const precioDef = tp[3] ? ajustes.tarifas[tp[3]] : null;
  const pr = precio != null ? toNum(precio) : precioDef;
  const c = toNum(cant);
  const importe = c != null && pr != null ? r2(c * pr) : null;

  const anadir = () => {
    const f = fecha.trim() ? leerFecha(fecha) : hoy();
    if (!f) return setMsg('La fecha no se entiende. Escríbela como 18/11/2026.');
    if (importe == null) return setMsg(tp[3] ? 'Escribe la cantidad (y el precio si no es el de siempre).' : 'Escribe la cantidad (1) y el importe en "Precio por unidad".');
    setMsg('');
    const id = 'pc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    guardar(id, { tipo, nombre: tp[1], fecha: f, cantidad: c, unidad: tp[2], precio: pr, importe, nota: nota.trim(), estado: 'pendiente', origen: 'manual', creado: new Date().toISOString() });
    setCant(''); setNota(''); setFecha(''); avisar('Añadido a Por cobrar.');
  };
  const cambiar = (x: any, patch: any) => { const { id, ...b } = x; guardar(id, { ...b, ...patch }); };

  const fila = (x: any, i: number) => (
    <View key={x.id} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: t.line, gap: 6 }}>
      <Fila>
        <Txt bold style={{ flexShrink: 1 }}>{x.nombre || PC_BY[x.tipo]?.[1] || 'Concepto'}</Txt>
        <Text style={{ fontFamily: F.mono, fontSize: 15, color: t.ink }}>{x.importe != null ? eur(x.importe) : '—'}</Text>
      </Fila>
      <Txt small muted>{[x.fecha ? fechaCorta(x.fecha) : '', x.cantidad != null ? `${num(x.cantidad)} ${x.unidad || ''}${x.precio != null ? ` × ${eur(x.precio)}` : ''}` : '', x.estado === 'cobrado' && x.cobradoEn ? `cobrado en ${x.cobradoEn}` : ''].filter(Boolean).join(' · ')}</Txt>
      {x.nota ? <Txt small muted>{x.nota}</Txt> : null}
      <Fila style={{ justifyContent: 'flex-start' }}>
        {del === x.id ? (
          <><Txt small>¿Eliminar?</Txt><Btn small tipo="peligro" onPress={() => { setDel(null); borrar(x.id); }}>Eliminar</Btn><Btn small onPress={() => setDel(null)}>No</Btn></>
        ) : x.estado === 'cobrado' ? (
          <><Btn small onPress={() => cambiar(x, { estado: 'pendiente', cobradoEn: null })}>Volver a pendiente</Btn><Btn small onPress={() => setDel(x.id)}>Eliminar</Btn></>
        ) : (
          <><Btn small tipo="primario" onPress={() => { const u = nominas[nominas.length - 1]; cambiar(x, { estado: 'cobrado', cobradoEn: u ? label(u) : new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) }); }}>Cobrado</Btn>
            <Btn small onPress={() => setDel(x.id)}>Eliminar</Btn></>
        )}
      </Fila>
    </View>
  );

  return (
    <Pantalla titulo="Por cobrar">
      <Card>
        <View style={{ borderWidth: 1.5, borderColor: t.ink, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
          <View><Eyebrow>Pendiente de cobrar</Eyebrow><Text style={{ fontFamily: F.monoMed, fontSize: 30, color: pend.length ? t.bad : t.net }}>{eur(r2(sum(pend, (x: any) => x.importe)))}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Eyebrow>{`${pend.length} concepto${pend.length === 1 ? '' : 's'}`}</Eyebrow>{cob.length ? <Txt small muted>{`Ya cobrado: ${eur(r2(sum(cob, (x: any) => x.importe)))}`}</Txt> : null}</View>
        </View>
      </Card>
      <Card>
        <H3>Añadir</H3>
        <Chips opciones={PC_TIPOS.map((x) => ({ v: x[0], l: x[1] }))} valor={tipo} onChange={(v) => { setTipo(v); setPrecio(null); setMsg(''); }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Campo mitad label="Fecha" value={fecha} onChangeText={setFecha} placeholder={fechaCorta(hoy()).replace(/ /g, ' ')} />
          <Campo mitad label={`Cantidad${tp[2] ? ` (${tp[2]})` : ''}`} value={cant} onChangeText={setCant} keyboardType="decimal-pad" placeholder={tp[2] === 'h' ? '8' : '1'} />
          <Campo mitad label="Precio por unidad (€)" value={precio ?? decTxt(precioDef)} onChangeText={setPrecio} keyboardType="decimal-pad" />
        </View>
        <Campo label="Nota" value={nota} onChangeText={setNota} placeholder="Por ejemplo: juicio, prolongación de turno…" />
        <Fila><Txt>{'Importe: '}<Txt mono bold>{importe != null ? eur(importe) : '—'}</Txt></Txt><Btn tipo="primario" onPress={anadir}>Añadir</Btn></Fila>
        {msg ? <Banner tipo="mal">{msg}</Banner> : null}
        {tipo === 'horas_extra' || tipo === 'faltan_horas' ? <Txt small muted>{`El precio por hora es el de la hora RED (${eur(ajustes.tarifas.redHora)}). Cámbialo si tu hora extra se paga distinto. Fecha: escribe 18/11 o déjala vacía para hoy.`}</Txt> : <Txt small muted>Fecha: escribe 18/11 o déjala vacía para hoy.</Txt>}
      </Card>
      <Card>
        <H3>Pendientes</H3>
        {pend.length ? <View>{pend.map(fila)}</View> : <Txt small muted>Nada pendiente. Apunta aquí lo que te deban: horas extra, juicios, desplazamientos u horas que falten. También puedes añadirlo desde Revisar cuando falte algo en la nómina.</Txt>}
      </Card>
      {cob.length ? <Card><H3>Cobrados</H3><View>{cob.map(fila)}</View></Card> : null}
    </Pantalla>
  );
}
