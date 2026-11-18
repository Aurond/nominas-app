import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { GraficoBarras, GraficoLineas, Leyenda } from '../graficos';
import { cap, eur, eur0, grp, MESES, pct, r2, sum, TIPO, type Nomina } from '../logic';
import { useStore } from '../store';
import { useTema } from '../theme';
import { Banner, Card, Chips, Fila, H3, Pantalla, Tabla, Tiles, Txt } from '../ui';
import { FilaNomina } from './Nomina';

export function Historial({ abrir }: { abrir: (id: string) => void }) {
  const t = useTema(); const { datos } = useStore();
  if (!datos.length) return <Pantalla titulo="Historial"><Txt muted>Aún no hay nóminas.</Txt></Pantalla>;
  const ult = datos.slice(-24);
  return (
    <Pantalla titulo="Historial">
      <Card>
        <Fila><H3>Bruto y neto</H3><Leyenda items={[['Bruto', t.gross], ['Neto', t.net]]} /></Fila>
        <GraficoLineas items={ult} />
        {ult.some((n) => n.tipo !== 'mensual') ? <Txt small muted>* Paga extra, atrasos u otra nómina no mensual.</Txt> : null}
      </Card>
      <Card>
        <H3>{`${datos.length} nómina${datos.length > 1 ? 's' : ''}`}</H3>
        <View>{[...datos].reverse().map((n, i) => <FilaNomina key={n.id} n={n} primera={i === 0} onPress={() => abrir(n.id)} />)}</View>
      </Card>
    </Pantalla>
  );
}

export function Anual() {
  const t = useTema(); const { datos, ejemplo } = useStore();
  const years = useMemo(() => [...new Set(datos.map((n) => n.periodo?.anio).filter(Boolean) as number[])].sort((a, b) => b - a), [datos]);
  const [year, setYear] = useState<number | null>(null);
  if (!years.length) return <Pantalla titulo="Resumen anual"><Txt muted>Aún no hay nóminas con fecha.</Txt></Pantalla>;
  const y = year && years.includes(year) ? year : years[0];
  const ys = datos.filter((n) => n.periodo?.anio === y);
  const bruto = sum(ys, (n) => n.totalDevengado), neto = sum(ys, (n) => n.liquido), irpf = sum(ys, (n) => grp(n, 'irpf')), ss = sum(ys, (n) => grp(n, 'ss'));
  const meses = Array.from({ length: 12 }, (_, i) => {
    const m = ys.filter((n) => n.periodo?.mes === i + 1);
    return { bruto: sum(m, (n) => n.totalDevengado), neto: sum(m, (n) => n.liquido), irpf: sum(m, (n) => grp(n, 'irpf')), ss: sum(m, (n) => grp(n, 'ss')), n: m.length };
  });
  const nm = meses.filter((m) => m.n).length;
  return (
    <Pantalla titulo="Resumen anual">
      <Chips opciones={years.map((v) => ({ v, l: String(v) }))} valor={y} onChange={setYear} />
      {ejemplo ? <Banner>Datos de ejemplo. Sube tus nóminas para ver tu año real.</Banner> : null}
      <Tiles items={[
        { l: 'Bruto anual', v: eur(bruto), s: `${ys.length} nóminas · ${nm} meses` },
        { l: 'Neto cobrado', v: eur(neto), s: `Media ${eur(nm ? neto / nm : null)}/mes`, color: t.net },
        { l: 'IRPF retenido', v: eur(irpf), s: `Tipo efectivo ${pct(bruto ? r2(irpf / bruto * 100) : null)}`, color: t.irpf },
        { l: 'Seguridad Social', v: eur(ss), s: `${pct(bruto ? r2(ss / bruto * 100) : null)} del bruto`, color: t.ss },
      ]} />
      <Card>
        <Fila><H3>Mes a mes</H3><Leyenda items={[['Bruto', t.gross + '55'], ['Neto', t.net]]} /></Fila>
        <GraficoBarras meses={meses} />
        <Tabla cab={['Mes', 'Bruto', 'IRPF', 'Neto']} anchos={[0, 70, 62, 70]}
          filas={meses.map((m, i) => m.n ? [cap(MESES[i]), eur0(m.bruto), eur0(m.irpf), eur0(m.neto)] : null).filter(Boolean) as string[][]}
          total={['Total', eur0(bruto), eur0(irpf), eur0(neto)]} />
      </Card>
      <Txt small muted>Cifras orientativas, calculadas con las nóminas subidas. Para la renta, usa el certificado de retenciones y los datos fiscales de la Agencia Tributaria.</Txt>
    </Pantalla>
  );
}

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export function Comparar() {
  const t = useTema(); const { datos } = useStore();
  const [a, setA] = useState<string | null>(null), [b, setB] = useState<string | null>(null);
  if (datos.length < 2) return <Pantalla titulo="Comparar"><Txt muted>Sube al menos dos nóminas para compararlas.</Txt></Pantalla>;
  const ids = datos.map((n) => n.id);
  const A = datos.find((n) => n.id === (a && ids.includes(a) ? a : ids[ids.length - 2]))!;
  const B = datos.find((n) => n.id === (b && ids.includes(b) ? b : ids[ids.length - 1]))!;
  const ops = [...datos].reverse().map((n) => ({ v: n.id, l: `${cap(n.periodo?.mes ? MESES[n.periodo.mes - 1].slice(0, 3) : '?')} ${n.periodo?.anio || ''}${n.tipo !== 'mensual' ? ' · ' + (TIPO[n.tipo] || n.tipo) : ''}` }));
  const dif = (x: any, y: any, inv = false) => {
    const d = r2((y || 0) - (x || 0));
    if (Math.abs(d) < 0.005) return <Txt muted small>=</Txt>;
    const bien = inv ? d < 0 : d > 0;
    return <Txt mono small color={bien ? t.good : t.bad}>{`${d > 0 ? '+' : ''}${eur(d)}`}</Txt>;
  };
  const filas = (fa: any[], fb: any[], inv: boolean) => {
    const m = new Map<string, { c: string; a: number; b: number }>();
    for (const x of fa) { const k = norm(x.concepto); const o = m.get(k) || { c: x.concepto, a: 0, b: 0 }; o.a += x.importe || 0; m.set(k, o); }
    for (const x of fb) { const k = norm(x.concepto); const o = m.get(k) || { c: x.concepto, a: 0, b: 0 }; o.b += x.importe || 0; m.set(k, o); }
    return [...m.values()].map((o) => [o.c, o.a ? eur(o.a) : '—', o.b ? eur(o.b) : '—', dif(o.a, o.b, inv)]);
  };
  const an = [0, 78, 78, 74];
  return (
    <Pantalla titulo="Comparar">
      <Card>
        <Txt small muted>Nómina A</Txt><Chips opciones={ops} valor={A.id} onChange={setA} />
        <Txt small muted>Nómina B</Txt><Chips opciones={ops} valor={B.id} onChange={setB} />
        <Tabla cab={['', 'A', 'B', 'Dif.']} anchos={an} filas={[
          ['Líquido', eur(A.liquido), eur(B.liquido), dif(A.liquido, B.liquido)],
          ['Bruto', eur(A.totalDevengado), eur(B.totalDevengado), dif(A.totalDevengado, B.totalDevengado)],
          ['Deducciones', eur(A.totalDeducciones), eur(B.totalDeducciones), dif(A.totalDeducciones, B.totalDeducciones, true)],
          ['% IRPF', pct(A.irpfPct), pct(B.irpfPct), ''],
        ]} />
      </Card>
      <Card><H3>Devengos</H3><Tabla cab={['Concepto', 'A', 'B', 'Dif.']} anchos={an} filas={filas(A.devengos || [], B.devengos || [], false)} /></Card>
      <Card><H3>Deducciones</H3><Tabla cab={['Concepto', 'A', 'B', 'Dif.']} anchos={an} filas={filas(A.deducciones || [], B.deducciones || [], true)} />
        <Txt small muted>En deducciones, verde significa que te quitan menos.</Txt></Card>
    </Pantalla>
  );
}
