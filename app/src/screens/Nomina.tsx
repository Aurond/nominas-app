// Fila de nómina y ficha con el desglose completo.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarraReparto, Leyenda } from '../graficos';
import { cuadra, eur, grp, Label, label, num, pct, r2, TIPO, type Nomina } from '../logic';
import { useStore } from '../store';
import { F, useTema } from '../theme';
import { Banner, Btn, Card, Eyebrow, Fila, H1, H3, Pill, Tabla, Txt } from '../ui';

export function PillCuadra({ n }: { n: Nomina }) {
  const d = cuadra(n); if (d == null) return null;
  return Math.abs(d) < 0.05 ? <Pill tipo="bien">Cuadra</Pill> : <Pill tipo="mal">{`Descuadre ${eur(d)}`}</Pill>;
}

export function FilaNomina({ n, onPress, primera }: { n: Nomina; onPress: () => void; primera?: boolean }) {
  const t = useTema();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ paddingVertical: 12, borderTopWidth: primera ? 0 : 1, borderColor: t.line, gap: 3, opacity: pressed ? 0.7 : 1 })}>
      <Fila>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1 }}>
          <Txt bold>{Label(n)}</Txt>
          {n.tipo !== 'mensual' ? <Pill>{TIPO[n.tipo] || n.tipo}</Pill> : null}
          {n.ejemplo ? <Pill tipo="ejemplo">Ejemplo</Pill> : null}
        </View>
        <Text style={{ fontFamily: F.mono, fontSize: 15, color: t.net }}>{eur(n.liquido)}</Text>
      </Fila>
      <Text style={{ fontFamily: F.mono, fontSize: 12, color: t.muted, textAlign: 'right' }}>{`Bruto ${eur(n.totalDevengado)} · IRPF ${pct(n.irpfPct)}`}</Text>
    </Pressable>
  );
}

export function Liquido({ n, derecha }: { n: Nomina; derecha?: React.ReactNode }) {
  const t = useTema();
  return (
    <View style={{ borderWidth: 1.5, borderColor: t.ink, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
      <View><Eyebrow>Líquido a percibir</Eyebrow><Text style={{ fontFamily: F.monoMed, fontSize: 30, color: t.net, letterSpacing: -0.5 }}>{eur(n.liquido)}</Text></View>
      {derecha}
    </View>
  );
}

export function Cifras({ n }: { n: Nomina }) {
  const t = useTema();
  const c = (l: string, v: string) => <View style={{ flex: 1, gap: 2 }}><Eyebrow>{l}</Eyebrow><Text style={{ fontFamily: F.mono, fontSize: 15, color: t.ink }}>{v}</Text></View>;
  return <View style={{ flexDirection: 'row', gap: 10 }}>{c('Bruto', eur(n.totalDevengado))}{c('Deducciones', eur(n.totalDeducciones))}{c('IRPF', pct(n.irpfPct))}</View>;
}

export function Detalle({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTema(); const ins = useSafeAreaInsets();
  const { datos, borrar } = useStore();
  const [confirmar, setConfirmar] = useState(false);
  const n = id ? datos.find((x) => x.id === id) : null;
  const d = n ? cuadra(n) : null;
  const gcol: Record<string, string> = { ss: t.ss, irpf: t.irpf, otras: t.other };
  const meta = n ? ([['Empresa', n.empresa], ['Trabajador', n.trabajador], ['NIF', n.nif], ['Categoría', n.categoria], ['Antigüedad', n.antiguedad],
    ['Periodo', n.periodo?.desde && n.periodo?.hasta ? `${n.periodo.desde} a ${n.periodo.hasta}` : null], ['Días', n.periodo?.dias]] as [string, any][]).filter((x) => x[1] != null && x[1] !== '') : [];
  return (
    <Modal visible={!!n} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={() => setConfirmar(false)}>
      {n ? (
        <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: ins.bottom + 30 }}>
          <Fila><Btn small onPress={() => { setConfirmar(false); onClose(); }}>Cerrar</Btn><View style={{ flexDirection: 'row', gap: 6 }}>{n.ejemplo ? <Pill tipo="ejemplo">Ejemplo</Pill> : null}<PillCuadra n={n} /></View></Fila>
          <View><Eyebrow>{TIPO[n.tipo] || n.tipo}</Eyebrow><H1>{Label(n)}</H1></View>
          <Card>
            <Liquido n={n} />
            <Cifras n={n} />
            <BarraReparto n={n} />
            {d != null && Math.abs(d) >= 0.05 ? <Txt small color={t.bad}>{`Bruto menos deducciones no coincide con el líquido (diferencia ${eur(d)}). Revisa la nómina original o vuelve a leerla.`}</Txt> : null}
            {n.notas ? <Txt small muted>{n.notas}</Txt> : null}
          </Card>
          <Card>
            <H3>Devengos</H3>
            <Tabla cab={['Concepto', 'Cant.', 'Importe']} anchos={[0, 56, 96]}
              filas={(n.devengos || []).map((x) => [`${x.codigo ? x.codigo + ' · ' : ''}${x.concepto}`, x.cantidad != null ? num(x.cantidad) : '', eur(x.importe)])}
              total={['Total devengado', '', eur(n.totalDevengado)]} />
          </Card>
          <Card>
            <H3>Deducciones</H3>
            <Tabla cab={['Concepto', '%', 'Importe']} anchos={[0, 50, 96]}
              filas={(n.deducciones || []).map((x) => [
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: gcol[x.grupo || 'otras'] || t.other }} /><Txt style={{ fontSize: 13.5, flexShrink: 1 }}>{x.concepto}</Txt></View>,
                x.porcentaje != null ? num(x.porcentaje) : '', eur(x.importe)])}
              total={['Total deducciones', '', eur(n.totalDeducciones)]} />
            <Leyenda items={[[`S. Social ${eur(grp(n, 'ss'))}`, t.ss], [`IRPF ${eur(grp(n, 'irpf'))}`, t.irpf], ...(grp(n, 'otras') ? [[`Otras ${eur(grp(n, 'otras'))}`, t.other] as [string, string]] : [])]} />
          </Card>
          <Card>
            <H3>Bases de cotización</H3>
            <Tabla cab={['Base', 'Importe']} anchos={[0, 110]} filas={[
              ['Contingencias comunes', eur(n.bases?.contingenciasComunes)], ['Contingencias profesionales', eur(n.bases?.contingenciasProfesionales)], ['Sujeta a IRPF', eur(n.bases?.irpf)],
              ...(n.aportacionEmpresa != null ? [['Aportación de la empresa a la S. Social', eur(n.aportacionEmpresa)], ['Coste total para la empresa', eur(r2((n.totalDevengado || 0) + n.aportacionEmpresa))]] : []),
            ]} />
          </Card>
          {meta.length ? <Card><H3>Datos de la nómina</H3><Tabla cab={['Dato', '']} anchos={[0, 170]} filas={meta.map(([k, v]) => [k, String(v)])} /></Card> : null}
          {!n.ejemplo ? (
            <Card>
              {confirmar ? (
                <View style={{ gap: 10 }}>
                  <Txt>{`¿Eliminar la nómina de ${label(n)}? No se puede deshacer.`}</Txt>
                  <Fila style={{ justifyContent: 'flex-start' }}><Btn tipo="peligro" small onPress={() => { const i = n.id; setConfirmar(false); onClose(); borrar(i); }}>Eliminar</Btn><Btn small onPress={() => setConfirmar(false)}>Cancelar</Btn></Fila>
                </View>
              ) : <Btn tipo="peligro" onPress={() => setConfirmar(true)}>Eliminar esta nómina</Btn>}
            </Card>
          ) : <Banner>Es una nómina de ejemplo. Desaparece cuando subas la primera tuya.</Banner>}
        </ScrollView>
      ) : <View />}
    </Modal>
  );
}
