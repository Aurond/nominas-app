import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { configurado, supabase } from '../supabase';
import { F, useTema } from '../theme';
import { Btn, Txt } from '../ui';

export function Login() {
  const t = useTema();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [msg, setMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    setCargando(true); setMsg('');
    const cred = { email: email.trim(), password: pass };
    let { error, data } = modo === 'entrar' ? await supabase.auth.signInWithPassword(cred) : await supabase.auth.signUp(cred);
    if (modo === 'crear' && !error && !data.session) ({ error, data } = await supabase.auth.signInWithPassword(cred) as any);
    setCargando(false);
    if (!error) return;
    const m = error.message || '';
    if (/confirm/i.test(m)) return setMsg('Supabase tiene esta cuenta sin confirmar. En supabase.com: SQL Editor → ejecuta  update auth.users set email_confirmed_at = now();  y vuelve a pulsar Entrar.');
    if (/Invalid login/i.test(m)) return setMsg(modo === 'crear' ? 'Ese email ya tiene cuenta con otra contraseña. Pulsa «Ya tengo cuenta: entrar».' : 'Email o contraseña incorrectos.');
    setMsg(m);
  };

  const campo = { height: 48, borderRadius: 12, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, paddingHorizontal: 12, fontFamily: F.sans, fontSize: 16, color: t.ink } as const;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: t.bg }}>
      <Text style={{ fontFamily: F.display, fontSize: 38, color: t.ink }}>Mis Nóminas</Text>
      <Text style={{ fontFamily: F.sans, color: t.muted, marginTop: 6, marginBottom: 24, fontSize: 15 }}>Tus nóminas, guardadas en tu nube.</Text>
      {!configurado ? <Txt color={t.bad}>Falta configurar Supabase: añade los secretos SUPABASE_URL y SUPABASE_ANON en GitHub y vuelve a publicar.</Txt> : (
        <View style={{ gap: 10 }}>
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={t.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={campo} />
          <TextInput value={pass} onChangeText={setPass} placeholder="Contraseña" placeholderTextColor={t.muted} secureTextEntry autoComplete={modo === 'crear' ? 'new-password' : 'current-password'} style={campo} onSubmitEditing={enviar} />
          <Btn tipo="primario" onPress={enviar} cargando={cargando} disabled={!email || pass.length < 6}>{modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</Btn>
          <Btn onPress={() => { setModo(modo === 'entrar' ? 'crear' : 'entrar'); setMsg(''); }}>{modo === 'entrar' ? 'Es la primera vez: crear cuenta' : 'Ya tengo cuenta: entrar'}</Btn>
          {msg ? <Txt small muted>{msg}</Txt> : null}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
