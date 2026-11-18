#!/usr/bin/env python3
"""Guarda en la base de datos de Mis Nóminas (Supabase) nóminas y calendarios leídos por Claude.

Uso:
  python3 herramientas/guardar.py nominas    datos.json   # {"nominas":[...]} con el formato de PROMPT_NOMINA
  python3 herramientas/guardar.py calendario datos.json   # {"meses":[{"m":10,"a":2026,"d":["MT","TN R1",...]}]}
  python3 herramientas/guardar.py listar                  # qué hay guardado

La clave secreta de Supabase la pone el proxy de la sesión de Claude (cabecera apikey):
este script manda "proxy-injected" y nunca ve la clave real.
"""
import datetime
import json
import re
import sys
import urllib.request

BASE = "https://ieapolxalxznhliszmkz.supabase.co"
CLAVE = "proxy-injected"


def pedir(metodo, ruta, cuerpo=None, extra=None):
    h = {"apikey": CLAVE, "Content-Type": "application/json"}
    h.update(extra or {})
    data = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=data, method=metodo, headers=h)
    with urllib.request.urlopen(req, timeout=60) as r:
        t = r.read().decode()
        return json.loads(t) if t else None


def usuario():
    us = pedir("GET", "/auth/v1/admin/users?per_page=50").get("users", [])
    if len(us) != 1:
        sys.exit(f"Hay {len(us)} cuentas en la app; esperaba una. Indica cuál usar.")
    return us[0]["id"]


def ahora():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def rango(s):
    m = re.search(r"(\d{1,2})(?::\d{2})?\s*[-–]\s*(\d{1,2})", str(s or ""))
    if not m or int(m[1]) > 24 or int(m[2]) > 24:
        return None
    return f"{int(m[1]):02d}-{int(m[2]):02d}"


def dia_de_texto(n, txt):
    if isinstance(txt, dict):
        return {**txt, "dia": txt.get("dia", n)}
    tok = [t for t in re.split(r"[\s,;]+", str(txt or "").upper()) if t]
    rd = next((t for t in tok if t.startswith("RD")), None)
    return {"dia": n, "turno": "MT" if "MT" in tok else "TN" if "TN" in tok else "",
            "reten": next((t for t in tok if re.fullmatch(r"R[123]+", t)), ""),
            "red": bool(rd), "horarioRed": rango(rd[2:]) if rd else None,
            "festivo": "F" in tok, "baja": "B" in tok, "vacaciones": "V" in tok, "texto": str(txt or "")}


def filas_nominas(out):
    filas = []
    for n in out.get("nominas", []):
        p = n.get("periodo") or {}
        dev, ded = n.get("devengos") or [], n.get("deducciones") or []
        n.setdefault("tipo", "mensual")
        if n.get("totalDevengado") is None:
            n["totalDevengado"] = round(sum(d.get("importe") or 0 for d in dev), 2)
        if n.get("totalDeducciones") is None:
            n["totalDeducciones"] = round(sum(d.get("importe") or 0 for d in ded), 2)
        if n.get("liquido") is None:
            n["liquido"] = round(n["totalDevengado"] - n["totalDeducciones"], 2)
        n["subida"] = ahora()
        filas.append((f"n-{p.get('anio') or 'x'}-{int(p.get('mes') or 0):02d}-{n['tipo']}", n))
    return filas


def filas_calendario(out):
    filas = []
    for m in out.get("meses", []):
        mes, anio, dias = m.get("mes", m.get("m")), m.get("anio", m.get("a")), m.get("dias", m.get("d"))
        if not (mes and anio and dias):
            continue
        filas.append((f"cua-{anio}-{int(mes):02d}", {"dias": [dia_de_texto(i + 1, x) for i, x in enumerate(dias)],
                                                     "notas": out.get("notas", ""), "subida": ahora(), "origen": "chat"}))
    return filas


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    modo = sys.argv[1]
    if modo == "listar":
        for r in pedir("GET", "/rest/v1/nominas?select=id,updated_at&order=id"):
            print(r["id"], r["updated_at"][:16])
        return
    out = json.load(open(sys.argv[2], encoding="utf-8"))
    filas = filas_nominas(out) if modo == "nominas" else filas_calendario(out) if modo == "calendario" else sys.exit("Modo: nominas, calendario o listar")
    if not filas:
        sys.exit("No hay nada que guardar en el archivo.")
    uid = usuario()
    cuerpo = [{"user_id": uid, "id": i, "data": d, "updated_at": ahora()} for i, d in filas]
    pedir("POST", "/rest/v1/nominas?on_conflict=user_id,id", cuerpo,
          {"Prefer": "resolution=merge-duplicates,return=minimal"})
    for i, _ in filas:
        print("guardado", i)


if __name__ == "__main__":
    main()
