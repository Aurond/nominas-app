// Revisar cobro: calendario de la empresa + Google (iCal) → reglas → comparación con la nómina del mes siguiente.
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { LeerConClaude } from '../LeerConClaude';
import { addDays, buildMonth, cap, MES3, CODE_PC, compute, daysIn, decTxt, DOW, dow, eur, expandICS, ICS_FESTIVOS, nomYm, num, pad, parseICS, parseRange, r2, splitNomina, sum, summarizeGoogle, TARIFA_LBL, toNum, ymAdd, ymLabel, ymNow, type Mes } from '../logic';
import { useStore } from '../store';
import { F, useTema } from '../theme';
import { Banner, Btn, Campo, Card, Chips, Eyebrow, Fila, H3, Pantalla, Pill, Tabla, Txt } from '../ui';

async function leerIcs(url: string, desde: string, hasta: string) {
  const u = url.trim().replace(/^webcal:\/\//i, 'https://');
  const r = await fetch(u);
  if (!r.ok) throw new Error(String(r.status));
  const txt = await r.text();
  if (!/BEGIN:VCALENDAR/.test(txt)) throw new Error('no-ics');
  return expandICS(parseICS(txt), desde, hasta);
}

function Cuadricula({ ym, M }: { ym: string; M: Mes }) {
  const t = useTema();
  const first = (dow(`${ym}-01`) + 6) % 7; const dset = new Set(M.diffs.map((d) => d.ds));
  const celdas: React.ReactNode[] = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <View key={'h' + d} style={{ width: '14.28%', alignItems: 'center', paddingBottom: 2 }}><Eyebrow>{d}</Eyebrow></View>);
  for (let i = 0; i < first; i++) celdas.push(<View key={'v' + i} style={{ width: '14.28%' }} />);
  for (const d of M.days) {
    const main = d.baja ? 'Baja' : d.vac ? 'Vac.' : d.turno;
    const tags: string[] = [];
    if (d.turno && (d.baja || d.vac)) tags.push(d.turno);
    if (d.tercios) tags.push(d.tercios === 3 ? 'R123' : `R${d.tercios}/3`);
    if (d.red) tags.push('RED');
    const borde = dset.has(d.ds) ? t.ss : d.festivo ? t.bad : dow(d.ds) === 0 ? t.irpf : 'transparent';
    celdas.push(
      <View key={d.ds} style={{ width: '14.28%', padding: 1.5 }}>
        <View style={{ minHeight: 50, borderRadius: 7, backgroundColor: d.festivo ? t.badBg : t.surface2, borderWidth: dset.has(d.ds) ? 2 : 1, borderColor: borde, padding: 3, gap: 1 }}>
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: t.muted }}>{d.dia}</Text>
          <Text style={{ fontFamily: F.monoMed, fontSize: 11.5, color: d.turno === 'MT' && !d.baja ? t.gross : d.turno === 'TN' && !d.baja ? t.other : t.muted }}>{main}</Text>
          {tags.map((x) => <Text key={x} style={{ fontFamily: F.sans, fontSize: 9, color: t.ink, backgroundColor: t.surface, borderRadius: 3, paddingHorizontal: 2, alignSelf: 'flex-start' }}>{x}</Text>)}
        </View>
      </View>,
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{celdas}</View>
      <Txt small muted>{`Borde rojo: festivo · rosa: domingo${M.diffs.length ? ' · naranja: Google y la empresa no coinciden' : ''}`}</Txt>
    </View>
  );
}

export function Revisar({ irA }: { irA: (tab: string) => void }) {
  const t = useTema();
  const { docs, nominas, guardar, ajustes: A, avisar } = useStore();
  const [ym, setYm] = useState(ymAdd(ymNow(), -1));
  const [leer, setLeer] = useState(false);
  const [gMsg, setGMsg] = useState<{ ym: string; t: string; err?: boolean; busy?: boolean } | null>(null);
  const [red, setRed] = useState<Record<string, string>>({});
  const [verAj, setVerAj] = useState(false);
  const [aj, setAj] = useState<Record<string, string>>({});

  const payYm = ymAdd(ym, 1);
  const noms = nominas.filter((n) => nomYm(n) === payYm);
  const M = buildMonth(ym, docs, A); const R = M ? compute(M, A.tarifas) : null;
  const meses = Array.from({ length: 18 }, (_, i) => ymAdd(ymNow(), -i));
  const tieneIcs = !!(A.ics.trabajo || A.ics.retenes || A.ics.red);

  const leerGoogle = async () => {
    if (!tieneIcs) { setVerAj(true); setGMsg({ ym, err: true, t: 'Pega primero las direcciones iCal de tus calendarios en Ajustes (abajo).' }); return; }
    setGMsg({ ym, busy: true, t: 'Leyendo Google Calendar…' });
    const desde = `${ym}-01`, hasta = `${payYm}-01`, faltan: string[] = [];
    const uno = async (nombre: string, url: string, hastaX = hasta) => {
      if (!url) { faltan.push(nombre); return null; }
      try { return await leerIcs(url, desde, hastaX); } catch { faltan.push(nombre); return null; }
    };
    const trabajo = await uno('Trabajo', A.ics.trabajo), retenes = await uno('Retenes', A.ics.retenes), redEv = await uno('RED', A.ics.red);
    const festivos = await uno('Festivos', ICS_FESTIVOS, addDays(hasta, 1));
    if (!trabajo && !retenes && !redEv) { setGMsg({ ym, err: true, t: 'No se pudo leer ningún calendario. Revisa las direcciones iCal en Ajustes y que tengas conexión.' }); return; }
    guardar(`cal-${ym}`, summarizeGoogle(ym, { trabajo, retenes, red: redEv, festivos }, faltan));
    setGMsg(faltan.length ? { ym, t: `Leído. No se pudo leer: ${faltan.join(', ')}.` } : null);
  };

  const guardarRed = () => {
    const ov = docs[`mes-${ym}`] || {}; const r = { ...(ov.red || {}) };
    for (const [ds, v] of Object.entries(red)) { if (!ds.startsWith(ym)) continue; const p = parseRange(v); if (p) r[ds] = p.txt; else if (!v.trim()) delete r[ds]; }
    guardar(`mes-${ym}`, { ...ov, red: r }); setRed({}); avisar('Horarios guardados.');
  };

  const guardarAjustes = () => {
    const tar = { ...A.tarifas };
    for (const [k] of TARIFA_LBL) if (aj['tar-' + k] != null) { const v = toNum(aj['tar-' + k]); if (v != null) tar[k] = v; }
    guardar('ajustes', { quien: (aj.quien ?? A.quien).trim(), festivosLocales: (aj.fest ?? A.festivosLocales).trim(), tarifas: tar,
      ics: { trabajo: (aj.icsT ?? A.ics.trabajo).trim(), retenes: (aj.icsR ?? A.ics.retenes).trim(), red: (aj.icsD ?? A.ics.red).trim() } });
    setAj({}); setVerAj(false); avisar('Ajustes guardados.');
  };

  let control: React.ReactNode = null;
  if (R) {
    const { by, otros } = splitNomina(noms);
    const filas = R.lines.map((l) => {
      const nom = noms.length ? (by[l.code]?.importe ?? 0) : null;
      const dif = nom != null ? r2(nom - l.esperado) : null;
      const mal = dif != null && Math.abs(dif) > 0.5;
      const altOk = !!l.alt && nom != null && Math.abs(nom - l.alt.importe) <= 0.5;
      const pcId = `pc-auto-${ym}-${l.code}`;
      return (
        <View key={l.code} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: t.line, gap: 4 }}>
          <Fila>
            <Txt bold style={{ flexShrink: 1 }}>{`${l.nombre} `}<Txt muted small>{`(${l.code})`}</Txt></Txt>
            {nom == null ? null : l.incompleto ? <Pill tipo="aviso">Falta un horario</Pill> : mal && !altOk ? (dif! < 0 ? <Pill tipo="mal">{`Falta ${eur(-dif!)}`}</Pill> : <Pill tipo="aviso">{`De más ${eur(dif)}`}</Pill>) : <Pill tipo="bien">Correcto</Pill>}
          </Fila>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Eyebrow>Esperado</Eyebrow><Txt mono>{eur(l.esperado)}</Txt></View>
            <View style={{ flex: 1 }}><Eyebrow>Nómina</Eyebrow><Txt mono>{nom != null ? eur(nom) : '—'}</Txt></View>
            <View style={{ flex: 1 }}><Eyebrow>Dif.</Eyebrow><Txt mono color={mal && !altOk ? (dif! < 0 ? t.bad : t.ss) : t.muted}>{dif == null ? '—' : Math.abs(dif) < 0.005 ? '=' : `${dif > 0 ? '+' : ''}${eur(dif)}`}</Txt></View>
          </View>
          <Txt small muted>{`${l.precio != null ? `${num(l.cant)} ${l.unidad} × ${eur(l.precio)}` : `${l.cant} ${l.unidad}`}${l.det ? ` · ${l.det}` : ''}`}</Txt>
          {l.incompleto ? <Txt small color={t.bad}>{l.incompleto}</Txt> : null}
          {l.alt ? <Txt small muted>{l.alt.txt + (altOk ? ' Es lo que te han pagado.' : '')}</Txt> : null}
          {mal && !altOk && dif! < 0 ? (docs[pcId] ? <Txt small muted>Está en Por cobrar.</Txt> : (
            <Btn small style={{ alignSelf: 'flex-start' }} onPress={() => {
              guardar(pcId, { tipo: CODE_PC[l.code] || 'diferencia', nombre: `${l.nombre} de ${ymLabel(ym)}`, fecha: `${ym}-${pad(daysIn(ym))}`, cantidad: null, unidad: '', precio: null,
                importe: r2(-dif!), nota: `Diferencia con la nómina de ${ymLabel(payYm)}: esperado ${eur(l.esperado)}, cobrado ${eur(nom)}.`, estado: 'pendiente', origen: 'control', creado: new Date().toISOString() });
              avisar('Añadido a Por cobrar.');
            }}>Añadir a Por cobrar</Btn>)) : null}
        </View>
      );
    });
    const totE = r2(sum(R.lines, (l) => l.esperado)), totN = noms.length ? r2(sum(R.lines, (l) => by[l.code]?.importe ?? 0)) : null;
    control = (
      <>
        <View>{filas}</View>
        <Fila style={{ borderTopWidth: 1.5, borderColor: t.ink, paddingTop: 8 }}>
          <Txt bold>Total variables</Txt>
          <Txt mono>{`${eur(totE)}${totN != null ? `  ·  nómina ${eur(totN)}` : ''}`}</Txt>
        </Fila>
        {otros.length ? <Txt small muted>{`Otros conceptos de la nómina que no salen del calendario: ${otros.map((d) => `${d.concepto} ${eur(d.importe)}`).join(' · ')}. Si son juicios, horas extra o similares, llévalos en Por cobrar.`}</Txt> : null}
      </>
    );
  }

  const v = (k: string, def: string) => aj[k] ?? def;
  return (
    <Pantalla titulo="Revisar cobro">
      <Txt muted>Calcula lo que te corresponde por lo trabajado y lo compara con la nómina.</Txt>
      <Card>
        <Eyebrow>Mes trabajado</Eyebrow>
        <Chips opciones={meses.map((m) => ({ v: m, l: `${cap(MES3[+m.slice(5) - 1])} ${m.slice(0, 4)}${docs['cua-' + m] ? ' •' : ''}` }))} valor={ym} onChange={setYm} />
        <Fila>
          <Txt small>{`Se cobra en la nómina de ${ymLabel(payYm)}`}</Txt>
          {noms.length ? <Pill tipo="bien">{`Nómina de ${ymLabel(payYm).split(' ')[0]} subida`}</Pill> : <Pill tipo="mal">{`Falta la nómina de ${ymLabel(payYm).split(' ')[0]}`}</Pill>}
        </Fila>
        <Txt small muted>• = tiene calendario de la empresa</Txt>
      </Card>

      <Card>
        <Fila><H3>1. Calendario de la empresa</H3><Btn small tipo={M?.cua ? 'normal' : 'primario'} onPress={() => setLeer(true)}>{M?.cua ? 'Cambiar' : 'Subir'}</Btn></Fila>
        <Txt small muted>{M?.cua ? `Leído${M.cua.notas ? `. ${M.cua.notas}` : '.'}` : 'Es la fuente más fiable. Si subes el del año entero, se guardan todos los meses de una vez.'}</Txt>
      </Card>

      <Card>
        <Fila><H3>2. Google Calendar</H3><Btn small onPress={leerGoogle} cargando={gMsg?.ym === ym && gMsg.busy}>{M?.cal ? 'Volver a leer' : 'Leer'}</Btn></Fila>
        {gMsg?.ym === ym && !gMsg.busy ? <Banner tipo={gMsg.err ? 'mal' : undefined}>{gMsg.t}</Banner> : null}
        <Txt small muted>{`${M?.cal ? `Leído el ${new Date(M.cal.generado).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}. ` : ''}Opcional: saca los horarios de los RED y los festivos, y lo cruza con el de la empresa.`}</Txt>
      </Card>

      {M && R ? (
        <Card>
          <H3>{cap(ymLabel(ym))}</H3>
          <Txt small muted>{`${R.c.mt + R.c.noch} turnos (${R.c.mt} MT, ${R.c.noch} TN) · ${num(r2((R.c.terc + R.c.tercBaja) / 3))} retenes · ${R.red.length} RED${M.days.some((d) => d.baja) ? ` · ${M.days.filter((d) => d.baja).length} días de baja` : ''}${M.days.some((d) => d.vac) ? ` · ${M.days.filter((d) => d.vac).length} de vacaciones` : ''}. Fuente: ${M.fuente === 'empresa' ? 'calendario de la empresa' : 'Google Calendar (sube el de la empresa para más seguridad)'}.`}</Txt>
          <Cuadricula ym={ym} M={M} />
          {M.diffs.length ? <Banner>{`Google y la empresa no coinciden en ${M.diffs.length} día${M.diffs.length > 1 ? 's' : ''}. Se usa el de la empresa.\n` + M.diffs.map((d) => `${d.dia} ${DOW[dow(d.ds)]}: ${d.txt}`).join('\n')}</Banner> : null}
          {M.days.some((d) => d.baja || d.vac) ? <Txt small muted>{`Baja o vacaciones: días ${M.days.filter((d) => d.baja || d.vac).map((d) => d.dia).join(', ')}. Los pluses de turno se cobran igual; el desplazamiento no. Comprueba que estos días son correctos.`}</Txt> : null}
          {[...M.fest].some(([d]) => d.startsWith(ym)) ? <Txt small muted>{`Festivos: ${[...M.fest].filter(([d]) => d.startsWith(ym)).map(([d, n]) => `${+d.slice(8)} (${n})`).join(', ')}.`}</Txt> : null}
        </Card>
      ) : <Banner>{`Sube el calendario de la empresa o lee Google Calendar para calcular ${ymLabel(ym)}.`}</Banner>}

      {R && R.red.length ? (
        <Card>
          <H3>Servicios RED</H3>
          <Txt small muted>Confirma el horario de cada servicio. Si no aparece en ningún calendario, escríbelo: la app no lo supone.</Txt>
          {R.red.map((x) => (
            <Fila key={x.d.ds} style={{ borderTopWidth: 1, borderColor: t.line, paddingTop: 8 }}>
              <View style={{ flex: 1, minWidth: 110 }}>
                <Txt bold>{`${x.d.dia} ${DOW[dow(x.d.ds)]}`}</Txt>
                <Txt small muted>{[x.d.redServicio, x.d.redOrigen ? `horario de ${x.d.redOrigen}` : 'sin horario'].filter(Boolean).join(' · ')}</Txt>
              </View>
              <TextInput value={red[x.d.ds] ?? x.d.redHorario ?? ''} onChangeText={(s) => setRed({ ...red, [x.d.ds]: s })} placeholder="18-06" placeholderTextColor={t.muted}
                style={{ width: 74, borderWidth: 1, borderColor: x.falta ? t.bad : t.line, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, fontFamily: F.mono, fontSize: 15, color: t.ink, backgroundColor: t.surface }} />
              <View style={{ width: 92, alignItems: 'flex-end' }}>
                <Txt mono>{x.falta ? '—' : eur(x.importe)}</Txt>
                {!x.falta ? <Txt small muted>{`${x.horas} h · ${x.hN} noct.${x.hS ? ` · ${x.hS} sáb.` : ''}${x.hF ? ` · ${x.hF} fest.` : ''}`}</Txt> : null}
              </View>
            </Fila>
          ))}
          <Btn onPress={guardarRed} disabled={!Object.keys(red).length}>Guardar horarios</Btn>
        </Card>
      ) : null}

      {R ? (
        <Card>
          <Fila><H3>3. Control</H3>{noms.length ? <Txt small muted>{`Nómina de ${ymLabel(payYm)}`}</Txt> : null}</Fila>
          {noms.length ? null : <Txt small muted>{`Esto es lo que deberías cobrar en la nómina de ${ymLabel(payYm)}. Cuando la subas, aparecerá la comparación.`}</Txt>}
          {control}
          <Txt small muted>Diferencias de menos de 0,50 € se consideran correctas. Fijos y otros complementos no se revisan aquí.</Txt>
        </Card>
      ) : null}

      <Card>
        <Fila><H3>Ajustes y tarifas</H3><Btn small onPress={() => { setVerAj(!verAj); setAj({}); }}>{verAj ? 'Cerrar' : 'Editar'}</Btn></Fila>
        {verAj ? (
          <View style={{ gap: 10 }}>
            <Txt small muted>Direcciones iCal secretas (Google Calendar en el ordenador → Configuración → el calendario → Integrar el calendario → «Dirección secreta en formato iCal»).</Txt>
            <Campo label="Calendario Trabajo" value={v('icsT', A.ics.trabajo)} onChangeText={(s) => setAj({ ...aj, icsT: s })} autoCapitalize="none" autoCorrect={false} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
            <Campo label="Calendario Retenes" value={v('icsR', A.ics.retenes)} onChangeText={(s) => setAj({ ...aj, icsR: s })} autoCapitalize="none" autoCorrect={false} />
            <Campo label="Calendario RED" value={v('icsD', A.ics.red)} onChangeText={(s) => setAj({ ...aj, icsD: s })} autoCapitalize="none" autoCorrect={false} />
            <Campo label="Tu nombre o número en el calendario de la empresa (si salen varias personas)" value={v('quien', A.quien)} onChangeText={(s) => setAj({ ...aj, quien: s })} />
            <Campo label="Festivos locales (día/mes, separados por comas)" value={v('fest', A.festivosLocales)} onChangeText={(s) => setAj({ ...aj, fest: s })} placeholder="Por ejemplo: 24/6, 9/10" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {TARIFA_LBL.map(([k, l]) => <Campo mitad key={k} label={l} value={v('tar-' + k, decTxt(A.tarifas[k]))} onChangeText={(s) => setAj({ ...aj, ['tar-' + k]: s })} keyboardType="decimal-pad" />)}
            </View>
            <Btn tipo="primario" onPress={guardarAjustes}>Guardar</Btn>
          </View>
        ) : (
          <Txt small muted>{`Festiva ${eur(A.tarifas.festiva)} · Nocturna ${eur(A.tarifas.nocturna)} · Sábado ${eur(A.tarifas.sabado)} · Retén ${eur(A.tarifas.reten)} · Desplazamiento ${eur(A.tarifas.desplaz)}/día · RED ${eur(A.tarifas.redHora)}/h (+${num(A.tarifas.redNoct)} noct., +${num(A.tarifas.redSab)} sáb., +${num(A.tarifas.redFest)} fest.)${A.festivosLocales ? ` · Festivos locales: ${A.festivosLocales}` : ''} · Google Calendar: ${tieneIcs ? 'configurado' : 'sin configurar'}`}</Txt>
        )}
        <Txt small muted>Reglas: cuenta el día en que empieza el turno. MT en sábado = 2 sábados; en domingo o festivo = 2 festivos. TN = 1 noche; viernes +1 sábado; sábado +1 sábado y +1 festivo; domingo o festivo +1 festivo. La nómina paga lo trabajado el mes natural anterior.</Txt>
      </Card>

      <LeerConClaude tipo="calendario" visible={leer} onClose={() => setLeer(false)} onListo={(yms) => { if (!yms.includes(ym)) setYm(yms[yms.length - 1]); }} />
    </Pantalla>
  );
}
