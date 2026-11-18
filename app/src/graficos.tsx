import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { grp, MES3, type Nomina } from './logic';
import { F, useTema } from './theme';
import { Txt } from './ui';

const niceStep = (v: number) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };

function useAncho() {
  const [w, setW] = useState(0);
  return { w, onLayout: (e: any) => setW(Math.round(e.nativeEvent.layout.width)) };
}

export function GraficoLineas({ items }: { items: Nomina[] }) {
  const t = useTema(); const { w, onLayout } = useAncho();
  if (items.length < 2) return <Txt small muted>Necesitas al menos dos nóminas para ver la evolución.</Txt>;
  const h = 190, pl = 46, pr = 10, pt = 12, pb = 26;
  const max = Math.max(...items.map((n) => n.totalDevengado || 0)) * 1.08;
  const step = niceStep(max / 4); const top = Math.ceil(max / step) * step;
  const x = (i: number) => pl + (w - pl - pr) * (i / (items.length - 1));
  const y = (v: number) => pt + (h - pt - pb) * (1 - v / top);
  const path = (f: (n: Nomina) => number) => items.map((n, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(f(n) || 0).toFixed(1)}`).join('');
  const every = Math.ceil(items.length / Math.max(2, Math.floor((w - pl) / 46)));
  const grid: number[] = []; for (let v = 0; v <= top + 0.01; v += step) grid.push(v);
  const li = items.length - 1;
  return (
    <View onLayout={onLayout} style={{ height: h }}>
      {w > 0 && (
        <Svg width={w} height={h}>
          {grid.map((v) => (
            <React.Fragment key={v}>
              <Line x1={pl} x2={w - pr} y1={y(v)} y2={y(v)} stroke={t.line} strokeWidth={1} />
              <SvgText x={pl - 6} y={y(v) + 3} fontSize={10} fill={t.muted} textAnchor="end" fontFamily={F.mono}>{Math.round(v).toLocaleString('es-ES')}</SvgText>
            </React.Fragment>
          ))}
          <Path d={`${path((n) => n.liquido)}L${x(li)},${y(0)}L${x(0)},${y(0)}Z`} fill={t.net} fillOpacity={0.12} />
          <Path d={path((n) => n.totalDevengado)} fill="none" stroke={t.gross} strokeWidth={2} />
          <Path d={path((n) => n.liquido)} fill="none" stroke={t.net} strokeWidth={2.4} />
          <Circle cx={x(li)} cy={y(items[li].liquido || 0)} r={4} fill={t.net} />
          <Circle cx={x(li)} cy={y(items[li].totalDevengado || 0)} r={3.5} fill={t.gross} />
          {items.map((n, i) => (i % every === 0 || i === li) ? (
            <SvgText key={i} x={x(i)} y={h - 8} fontSize={10} fill={t.muted} textAnchor="middle" fontFamily={F.mono}>{n.periodo?.mes ? MES3[n.periodo.mes - 1] + (n.tipo !== 'mensual' ? '*' : '') : '?'}</SvgText>
          ) : null)}
        </Svg>
      )}
    </View>
  );
}

export function GraficoBarras({ meses }: { meses: { bruto: number; neto: number }[] }) {
  const t = useTema(); const { w, onLayout } = useAncho();
  const h = 170, pl = 40, pr = 6, pt = 10, pb = 22;
  const max = Math.max(1, ...meses.map((m) => m.bruto)) * 1.05;
  const step = niceStep(max / 3); const top = Math.ceil(max / step) * step;
  const bw = (w - pl - pr) / 12; const y = (v: number) => pt + (h - pt - pb) * (1 - v / top);
  const grid: number[] = []; for (let v = 0; v <= top + 0.01; v += step) grid.push(v);
  return (
    <View onLayout={onLayout} style={{ height: h }}>
      {w > 0 && (
        <Svg width={w} height={h}>
          {grid.map((v) => (
            <React.Fragment key={v}>
              <Line x1={pl} x2={w - pr} y1={y(v)} y2={y(v)} stroke={t.line} />
              <SvgText x={pl - 5} y={y(v) + 3} fontSize={10} fill={t.muted} textAnchor="end" fontFamily={F.mono}>{`${Math.round(v / 100) / 10}k`}</SvgText>
            </React.Fragment>
          ))}
          {meses.map((m, i) => {
            const x0 = pl + i * bw + bw * 0.18, ww = bw * 0.64;
            return (
              <React.Fragment key={i}>
                {m.bruto > 0 && <Rect x={x0} y={y(m.bruto)} width={ww} height={y(0) - y(m.bruto)} rx={2} fill={t.gross} fillOpacity={0.25} />}
                {m.neto > 0 && <Rect x={x0} y={y(m.neto)} width={ww} height={y(0) - y(m.neto)} rx={2} fill={t.net} />}
                <SvgText x={x0 + ww / 2} y={h - 7} fontSize={10} fill={t.muted} textAnchor="middle" fontFamily={F.mono}>{MES3[i][0].toUpperCase()}</SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

export function BarraReparto({ n }: { n: Nomina }) {
  const t = useTema(); const b = n.totalDevengado || 0; if (!b) return null;
  const partes = ([['Neto', n.liquido, t.net], ['Seg. Social', grp(n, 'ss'), t.ss], ['IRPF', grp(n, 'irpf'), t.irpf], ['Otras', grp(n, 'otras'), t.other]] as [string, number, string][]).filter((p) => p[1] > 0);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: t.surface2 }}>
        {partes.map((p) => <View key={p[0]} style={{ width: `${(p[1] / b) * 100}%`, backgroundColor: p[2] }} />)}
      </View>
      <Leyenda items={partes.map((p) => [`${p[0]} ${((p[1] / b) * 100).toFixed(1).replace('.', ',')} %`, p[2]])} />
    </View>
  );
}

export function Leyenda({ items }: { items: [string, string][] }) {
  const t = useTema();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, columnGap: 14 }}>
      {items.map(([l, c]) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: c }} />
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: t.muted }}>{l}</Text>
        </View>
      ))}
    </View>
  );
}
