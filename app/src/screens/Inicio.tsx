import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { LeerConClaude } from '../LeerConClaude';
import { BarraReparto } from '../graficos';
import { eur, Label, r2, TIPO } from '../logic';
import { useStore } from '../store';
import { F, useTema } from '../theme';
import { Banner, Btn, Card, Eyebrow, Fila, H2, H3, Pantalla, Pill, Txt } from '../ui';
import { Cifras, FilaNomina, Liquido, PillCuadra } from './Nomina';

export function Inicio({ abrir, irA }: { abrir: (id: string) => void; irA: (tab: string) => void }) {
  const t = useTema();
  const { datos, ejemplo, error, docs } = useStore();
  const [leer, setLeer] = useState(false);
  const last = datos[datos.length - 1];
  const mensuales = datos.filter((n) => n.tipo === 'mensual');
  const dif = mensuales.length >= 2 ? r2(mensuales[mensuales.length - 1].liquido - mensuales[mensuales.length - 2].liquido) : null;
  const pend = Object.values(docs).filter((x: any) => String(x.id).startsWith('pc-') && x.estado !== 'cobrado');
  const totPend = r2(pend.reduce((s: number, x: any) => s + (Number(x.importe) || 0), 0));

  return (
    <Pantalla>
      {error ? <Banner tipo="mal">{error}</Banner> : null}
      {ejemplo ? <Banner>Datos de ejemplo. Así se verá la app con tus nóminas. Desaparecen en cuanto subas la primera.</Banner> : null}
      {last ? (
        <Card>
          <Fila>
            <View><Eyebrow>Última nómina</Eyebrow><H2>{Label(last)}</H2></View>
            <View style={{ flexDirection: 'row', gap: 6 }}>{last.ejemplo ? <Pill tipo="ejemplo">Ejemplo</Pill> : null}{last.tipo !== 'mensual' ? <Pill>{TIPO[last.tipo] || last.tipo}</Pill> : null}<PillCuadra n={last} /></View>
          </Fila>
          <Liquido n={last} derecha={dif != null ? (
            <View style={{ alignItems: 'flex-end' }}><Eyebrow>vs. mes anterior</Eyebrow><Text style={{ fontFamily: F.mono, fontSize: 15, color: dif >= 0 ? t.good : t.bad }}>{`${dif >= 0 ? '+' : ''}${eur(dif)}`}</Text></View>
          ) : undefined} />
          <Cifras n={last} />
          <BarraReparto n={last} />
          {last.notas ? <Txt small muted>{last.notas}</Txt> : null}
          <Btn onPress={() => abrir(last.id)}>Ver desglose completo</Btn>
        </Card>
      ) : null}
      {totPend > 0 ? (
        <Card>
          <Fila><View><Eyebrow>Por cobrar</Eyebrow><Text style={{ fontFamily: F.monoMed, fontSize: 20, color: t.bad }}>{eur(totPend)}</Text></View><Btn small onPress={() => irA('cobrar')}>Ver</Btn></Fila>
          <Txt small muted>{`${pend.length} concepto${pend.length === 1 ? '' : 's'} pendiente${pend.length === 1 ? '' : 's'}`}</Txt>
        </Card>
      ) : null}
      {datos.length > 1 ? (
        <Card>
          <Fila><H3>Últimas nóminas</H3><Btn small onPress={() => irA('historial')}>Ver todas</Btn></Fila>
          <View>{datos.slice(-3).reverse().map((n, i) => <FilaNomina key={n.id} n={n} primera={i === 0} onPress={() => abrir(n.id)} />)}</View>
        </Card>
      ) : null}
      <Card style={{ borderStyle: 'dashed' }}>
        <H2>Sube tus nóminas</H2>
        <Txt muted>En PDF, con Claude. Puedes subir varias a la vez: Claude las lee y aquí ves el desglose.</Txt>
        <Btn tipo="primario" onPress={() => setLeer(true)}>Subir nóminas</Btn>
      </Card>
      <LeerConClaude tipo="nomina" visible={leer} onClose={() => setLeer(false)} />
    </Pantalla>
  );
}
