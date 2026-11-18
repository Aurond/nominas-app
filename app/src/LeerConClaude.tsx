// Lectura de PDFs pasando por la app de Claude: copiar instrucciones → adjuntar PDF en Claude → pegar la respuesta aquí.
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calendariosDeRespuesta, label, nominasDeRespuesta, PROMPT_NOMINA, promptCalendario, sacarJSON, ymLabel } from './logic';
import { useStore } from './store';
import { F, useTema } from './theme';
import { Banner, Btn, Card, Eyebrow, Fila, H2, Txt } from './ui';

export function LeerConClaude({ tipo, visible, onClose, onListo }: { tipo: 'nomina' | 'calendario'; visible: boolean; onClose: () => void; onListo?: (yms: string[]) => void }) {
  const t = useTema(); const ins = useSafeAreaInsets();
  const { docs, guardar, ajustes } = useStore();
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState<{ ok?: boolean; t: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const prompt = tipo === 'nomina' ? PROMPT_NOMINA : promptCalendario(ajustes.quien);

  const abrirClaude = async () => {
    await Clipboard.setStringAsync(prompt).catch(() => {});
    setCopiado(true);
    Linking.openURL('https://claude.ai/new?q=' + encodeURIComponent(prompt)).catch(() => setMsg({ t: 'No se pudo abrir Claude. Ábrelo tú y pega las instrucciones, que ya están copiadas.' }));
  };

  const procesar = (crudo: string) => {
    const out = sacarJSON(crudo);
    if (!out) return setMsg({ t: 'No encuentro la respuesta de Claude en lo que has pegado. En Claude, mantén pulsada la respuesta, toca Copiar y vuelve a intentarlo.' });
    if (tipo === 'nomina') {
      const ns = nominasDeRespuesta(out);
      if (!ns.length) return setMsg({ t: 'La respuesta no trae ninguna nómina. Revisa que adjuntaste el PDF en Claude.' });
      const txt = ns.map((n) => `${docs[n.id] ? 'Actualizada' : 'Guardada'}: ${label(n)}`).join(' · ');
      for (const n of ns) { const { id, ...b } = n; guardar(id, b); }
      setMsg({ ok: true, t: txt }); setTexto('');
    } else {
      const cs = calendariosDeRespuesta(out);
      if (!cs.length) return setMsg({ t: 'La respuesta no trae ningún mes del calendario. Revisa que adjuntaste el calendario en Claude.' });
      for (const c of cs) {
        const prev = docs[`cua-${c.ym}`];
        if (c.doc.incompleto && prev?.dias?.length > c.doc.dias.length) { c.doc.dias = [...c.doc.dias, ...prev.dias.slice(c.doc.dias.length)]; c.doc.incompleto = false; }
        guardar(`cua-${c.ym}`, c.doc);
      }
      const yms = cs.map((c) => c.ym).sort();
      const cortados = cs.filter((c) => c.doc.incompleto).map((c) => ymLabel(c.ym));
      setMsg({ ok: true, t: `Calendario guardado: ${yms.length > 1 ? `de ${ymLabel(yms[0])} a ${ymLabel(yms[yms.length - 1])}` : ymLabel(yms[0])}.`
        + (cortados.length ? ` La respuesta venía cortada: a ${cortados.join(', ')} le faltan días. Pide en Claude «continúa con ${cortados[0]}» y pega lo que conteste.` : '') }); setTexto('');
      onListo?.(yms);
    }
  };

  const pegar = async () => {
    const c = await Clipboard.getStringAsync().catch(() => '');
    if (!c) return setMsg({ t: 'El portapapeles está vacío. Copia la respuesta en Claude y vuelve.' });
    procesar(c);
  };

  const paso = (n: number, titulo: string, cuerpo: React.ReactNode) => (
    <Card>
      <Fila style={{ justifyContent: 'flex-start' }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Txt bold color={t.accentInk}>{n}</Txt></View>
        <Txt bold>{titulo}</Txt>
      </Fila>
      {cuerpo}
    </Card>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: ins.bottom + 30 }} keyboardShouldPersistTaps="handled">
          <Fila>
            <View style={{ flex: 1 }}><Eyebrow>Leer con Claude</Eyebrow><H2>{tipo === 'nomina' ? 'Subir nóminas' : 'Calendario de la empresa'}</H2></View>
            <Btn small onPress={() => { setMsg(null); onClose(); }}>Cerrar</Btn>
          </Fila>
          {paso(1, 'Abre Claude con las instrucciones', <>
            <Txt small muted>Se copian las instrucciones y se abre Claude con ellas escritas.</Txt>
            <Btn tipo="primario" onPress={abrirClaude}>{copiado ? 'Abrir Claude otra vez' : 'Abrir Claude'}</Btn>
          </>)}
          {paso(2, `Adjunta ${tipo === 'nomina' ? 'la nómina (o varias)' : 'el calendario'} y envía`, <Txt small muted>
            En Claude, pulsa el clip o el + → Archivos, elige el PDF{tipo === 'calendario' ? ' o la foto' : ''} y envía. {tipo === 'calendario' ? 'Si es el calendario del año entero, se guardan todos los meses de una vez.' : 'Puedes adjuntar varias nóminas a la vez.'}
          </Txt>)}
          {paso(3, 'Copia la respuesta y pégala aquí', <>
            <Txt small muted>Cuando Claude conteste, mantén pulsada la respuesta, toca Copiar y vuelve a esta app.</Txt>
            <Btn tipo="primario" onPress={pegar}>Pegar respuesta de Claude</Btn>
            <TextInput value={texto} onChangeText={setTexto} multiline placeholder="O pégala aquí a mano…" placeholderTextColor={t.muted}
              style={{ minHeight: 70, maxHeight: 160, borderWidth: 1, borderColor: t.line, borderRadius: 10, padding: 10, fontFamily: F.mono, fontSize: 12, color: t.ink, backgroundColor: t.surface }} />
            {texto.trim() ? <Btn onPress={() => procesar(texto)}>Usar el texto pegado</Btn> : null}
          </>)}
          {msg ? <Banner tipo={msg.ok ? 'bien' : 'mal'}>{msg.t}</Banner> : null}
          {msg?.ok ? <Btn onPress={() => { setMsg(null); setCopiado(false); onClose(); }}>Listo</Btn> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
