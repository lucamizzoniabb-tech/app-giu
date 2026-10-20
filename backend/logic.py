import random
from collections import Counter, defaultdict

CM_START = 7
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
GROUP_SIZE = {"Coppie 2": 2, "Box 4": 4, "Squadre 4": 4}
BOX_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#db2777", "#65a30d", "#4f46e5", "#ca8a04", "#0d9488", "#be123c"]


def compute_settori(n, zone=1, shuffle=False):
    nz = max(1, min(int(zone or 1), n or 1))
    base, extra = divmod(n, nz)
    out = []
    for z in range(nz):
        full, r = divmod(base + (1 if z < extra else 0), 10)
        zs = [{"size": 10, "tecnico": False} for _ in range(full)] + ([{"size": r, "tecnico": True}] if r else [])
        if shuffle:
            random.shuffle(zs)
        out += [{**x, "zona": z + 1} for x in zs]
    for i, x in enumerate(out):
        x["lettera"] = LETTERS[i]
    return out


def settori_label(settori):
    return " ".join(f"{s['lettera']} TECNICO {s['size']}" if s["tecnico"] else f"{s['lettera']}{s['size']}" for s in settori)


def _pick_sector(isc, sectors, need=1, avoid=None):
    cands = [i for i, s in enumerate(sectors) if s["free"] >= need and (avoid is None or i not in avoid)]
    if not cands:
        return None
    soc = isc.get("societa", "")
    return min(cands, key=lambda i: (sectors[i]["soc"][soc], -sectors[i]["free"] / sectors[i]["size"], random.random()))


def _place(unit, idx, sectors):
    s = sectors[idx]
    s["units"].append(unit)
    s["free"] -= len(unit)
    for m in unit:
        s["soc"][m.get("societa", "")] += 1


def _arrange(units, pilotato):
    random.shuffle(units)
    if not pilotato:
        return units
    out, rest = [], list(units)
    while rest:
        last = out[-1][-1].get("societa", "") if out else None
        freq = Counter(u[0].get("societa", "") for u in rest)
        cands = [u for u in rest if u[0].get("societa", "") != last] or rest
        u = max(cands, key=lambda x: freq[x[0].get("societa", "")])
        rest.remove(u)
        out.append(u)
    return out


def sorteggio(iscritti, tipo, zone, opts=None):
    o = {"societa": True, "consecutivi": True, "teste": True, **(opts or {})}
    iscritti = list(iscritti)
    random.shuffle(iscritti)
    settori = compute_settori(len(iscritti), zone, shuffle=True)
    sectors = [{**s, "free": s["size"], "units": [], "soc": Counter()} for s in settori]
    gsize = GROUP_SIZE.get(tipo)
    groups = defaultdict(list)
    singles = []
    for i in iscritti:
        (groups[i["gruppo"]] if gsize and i.get("gruppo") else singles).append(i)

    if tipo in ("Coppie 2", "Box 4"):
        for g in sorted(groups.values(), key=len, reverse=True):
            idx = _pick_sector(g[0], sectors, need=len(g))
            if idx is None:
                singles.extend(g)
            else:
                _place(g, idx, sectors)
    elif tipo == "Squadre 4":
        for g in groups.values():
            used, used_z = set(), set()
            for m in g:
                cands = [i for i, s in enumerate(sectors) if s["free"] > 0 and i not in used]
                if not cands:
                    singles.append(m)
                    continue
                idx = min(cands, key=lambda i: (sectors[i]["zona"] in used_z, -sectors[i]["free"], random.random()))
                used.add(idx)
                used_z.add(sectors[idx]["zona"])
                _place([m], idx, sectors)
    elif o["teste"]:
        heads = sorted([i for i in singles if i.get("rank")], key=lambda x: x["rank"])[: len(sectors)]
        order = sorted(range(len(sectors)), key=lambda i: -sectors[i]["size"])
        for h, idx in zip(heads, order):
            singles.remove(h)
            _place([h], idx, sectors)

    if o["societa"]:
        freq = Counter(i.get("societa", "") for i in singles)
        singles.sort(key=lambda i: (-freq[i.get("societa", "")], random.random()))
        for m in singles:
            _place([m], _pick_sector(m, sectors), sectors)
    else:
        for m in singles:
            _place([m], next(i for i, x in enumerate(sectors) if x["free"] > 0), sectors)

    result, colors, pos = [], {}, 1
    zone_bounds = {}
    for s in sectors:
        flat = [(m, len(u) > 1) for u in _arrange(s["units"], o["consecutivi"]) for m in u]
        start = pos
        for m, grouped in flat:
            color = None
            if tipo == "Box 4" and grouped:
                color = colors.setdefault(m["gruppo"], BOX_COLORS[len(colors) % len(BOX_COLORS)])
            result.append({"id": m["id"], "settore": s["lettera"], "zona": s["zona"], "picchetto": pos, "colore": color, "_grouped": grouped, "_prec": m.get("esterno_prec", False)})
            pos += 1
        zb = zone_bounds.setdefault(s["zona"], [start, pos - 1])
        zb[1] = pos - 1
    ext = {p for b in zone_bounds.values() for p in b}
    if tipo not in ("Coppie 2", "Box 4"):
        by_pk = {r["picchetto"]: r for r in result}
        for p in ext:
            r = by_pk[p]
            if not r["_prec"]:
                continue
            swap = next((o for o in result if o["settore"] == r["settore"] and o["picchetto"] not in ext and not o["_prec"]), None)
            if swap:
                r["id"], swap["id"] = swap["id"], r["id"]
                r["_prec"], swap["_prec"] = False, True
    for r in result:
        r["esterno"] = r["picchetto"] in ext
        r.pop("_grouped"); r.pop("_prec")
    return result, settori


def punti_cattura(c, specie_map, surf, gara=None):
    peso = float(c.get("peso") or 0)
    if not surf:
        return round(peso, 2), None
    gara = gara or {}
    sp = specie_map.get(c.get("specie"))
    tab = punti_tabella(sp, c.get("cm")) if sp and sp.get("punti") else 0
    if tab == 0:
        pt = int(gara.get("preda_tecnica") or 0)
        return pt, {"min": sp.get("min") if sp else None, "tabella": 0, "bonus": 0, "sotto": True, "preda_tecnica": pt}
    bonus = int(gara.get("bonus_pesce") or 0)
    return tab + bonus, {"min": sp.get("min"), "tabella": tab, "bonus": bonus, "sotto": False}


def min_cm(punti):
    return next((CM_START + i for i, p in enumerate(punti) if p > 0), CM_START)


def punti_tabella(sp, cm):
    i = int(float(cm or 0)) - CM_START
    if i < 0:
        return 0
    return int(sp["punti"][min(i, len(sp["punti"]) - 1)])


def build_classifica(gara, iscritti, catture, specie_map):
    surf = gara.get("specialita") == "Surf Casting"
    by_isc = defaultdict(list)
    for c in catture:
        by_isc[c["iscritto_id"]].append(c)
    rows = []
    for i in iscritti:
        if not i.get("settore"):
            continue
        cs, tot_p, tot_w = [], 0.0, 0.0
        for c in by_isc.get(i["id"], []):
            p, det = punti_cattura(c, specie_map, surf, gara)
            cs.append({**c, "punti": p, "dettaglio": det})
            tot_p += p if surf else 0
            tot_w += 0 if surf else float(c.get("peso") or 0)
        rows.append({"id": i["id"], "nome": f"{i['nome']} {i['cognome']}", "societa": i.get("societa", ""), "gruppo": i.get("gruppo", ""),
                     "settore": i["settore"], "zona": i.get("zona"), "picchetto": i["picchetto"], "esterno": i.get("esterno", False),
                     "colore": i.get("colore"), "cartellino_chiuso": i.get("cartellino_chiuso", False), "catture": cs, "n_pesci": len(cs), "punti": round(tot_p, 2), "peso": round(tot_w, 2),
                     "tot": round(tot_p + tot_w, 2)})
    settori = []
    tecnici = {s["lettera"] for s in gara.get("settori", []) if s.get("tecnico")}
    for let in sorted({r["settore"] for r in rows}):
        sr = sorted([r for r in rows if r["settore"] == let], key=lambda r: (-r["tot"], r["picchetto"]))
        for r in sr:
            r["pen"] = 1 + sum(1 for o in sr if o["tot"] > r["tot"])
        for k, r in enumerate(sr):
            r["pos"] = k + 1
        settori.append({"lettera": let, "tecnico": let in tecnici, "rows": sr, "integrati": []})
    for k, s in enumerate(settori):
        need = 10 - len(s["rows"])
        if not s["tecnico"] or need <= 0:
            continue
        prev = settori[k - 1] if k > 0 and not settori[k - 1]["tecnico"] else None
        nxt = settori[k + 1] if k + 1 < len(settori) and not settori[k + 1]["tecnico"] else None
        if prev:
            integ = sorted(prev["rows"], key=lambda r: r["picchetto"])[-need:]
        elif nxt:
            integ = sorted(nxt["rows"], key=lambda r: r["picchetto"])[:need]
        else:
            continue
        comb = s["rows"] + integ
        for r in s["rows"]:
            r["pen"] = 1 + sum(1 for o in comb if o["tot"] > r["tot"])
        s["rows"].sort(key=lambda r: (r["pen"], r["picchetto"]))
        for j, r in enumerate(s["rows"]):
            r["pos"] = j + 1
        s["integrati"] = [{"nome": r["nome"], "settore": r["settore"], "picchetto": r["picchetto"], "tot": r["tot"], "pos_tec": 1 + sum(1 for o in comb if o["tot"] > r["tot"])} for r in integ]
    assoluta = sorted(rows, key=lambda r: (r.get("pen", 99), -r["tot"]))
    grp = defaultdict(list)
    for r in rows:
        if r["gruppo"]:
            grp[r["gruppo"]].append(r)
    gruppi = sorted([{"gruppo": g, "societa": m[0]["societa"], "pen": sum(x["pen"] for x in m), "tot": round(sum(x["tot"] for x in m), 2),
                      "membri": sorted(m, key=lambda x: x["picchetto"])} for g, m in grp.items()], key=lambda g: (g["pen"], -g["tot"]))
    soc = defaultdict(list)
    for r in rows:
        soc[r["societa"]].append(r)
    societa = []
    for s, m in soc.items():
        best = sorted(m, key=lambda x: (x["pen"], -x["tot"]))[:3]
        societa.append({"societa": s, "pen": sum(x["pen"] for x in best), "tot": round(sum(x["tot"] for x in best), 2), "migliori": [x["nome"] for x in best], "n": len(best)})
    societa.sort(key=lambda s: (-s["n"], s["pen"], -s["tot"]))
    return {"surf": surf, "individui": sorted(rows, key=lambda r: r["picchetto"]), "settori": settori, "assoluta": assoluta, "gruppi": gruppi, "societa": societa}
