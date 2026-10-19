import random
from collections import Counter, defaultdict

CM_START = 7
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
GROUP_SIZE = {"Coppie 2": 2, "Box 4": 4, "Squadre 4": 4}
BOX_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#db2777", "#65a30d", "#4f46e5", "#ca8a04", "#0d9488", "#be123c"]


def compute_settori(n):
    full, r = divmod(n, 10)
    out = [{"lettera": LETTERS[i], "size": 10, "tecnico": False} for i in range(full)]
    if r:
        out.append({"lettera": LETTERS[full], "size": r, "tecnico": True})
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


def sorteggio(iscritti, tipo, zone):
    iscritti = list(iscritti)
    random.shuffle(iscritti)
    settori = compute_settori(len(iscritti))
    nz = max(1, min(int(zone or 1), len(settori)))
    sectors = [{**s, "free": s["size"], "units": [], "soc": Counter(), "zona": i * nz // len(settori) + 1} for i, s in enumerate(settori)]
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
    else:
        heads = sorted([i for i in singles if i.get("rank")], key=lambda x: x["rank"])[: len(sectors)]
        order = sorted(range(len(sectors)), key=lambda i: -sectors[i]["size"])
        for h, idx in zip(heads, order):
            singles.remove(h)
            _place([h], idx, sectors)

    freq = Counter(i.get("societa", "") for i in singles)
    singles.sort(key=lambda i: (-freq[i.get("societa", "")], random.random()))
    for m in singles:
        idx = _pick_sector(m, sectors)
        _place([m], idx, sectors)

    result, colors, pos = [], {}, 1
    zone_bounds = {}
    for s in sectors:
        random.shuffle(s["units"])
        flat = [(m, len(u) > 1) for u in s["units"] for m in u]
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


def punti_cattura(c, specie_map, surf):
    peso = float(c.get("peso") or 0)
    if not surf:
        return round(peso, 2), None
    sp = specie_map.get(c.get("specie"))
    if not sp or not sp.get("punti"):
        return 0, None
    p = punti_tabella(sp, c.get("cm"))
    return p, {"min": sp.get("min"), "sotto": p == 0}


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
            p, det = punti_cattura(c, specie_map, surf)
            cs.append({**c, "punti": p, "dettaglio": det})
            tot_p += p if surf else 0
            tot_w += 0 if surf else float(c.get("peso") or 0)
        rows.append({"id": i["id"], "nome": f"{i['nome']} {i['cognome']}", "societa": i.get("societa", ""), "gruppo": i.get("gruppo", ""),
                     "settore": i["settore"], "zona": i.get("zona"), "picchetto": i["picchetto"], "esterno": i.get("esterno", False),
                     "colore": i.get("colore"), "catture": cs, "n_pesci": len(cs), "punti": round(tot_p, 2), "peso": round(tot_w, 2),
                     "tot": round(tot_p + tot_w, 2)})
    settori = []
    tecnici = {s["lettera"] for s in gara.get("settori", []) if s.get("tecnico")}
    for let in sorted({r["settore"] for r in rows}):
        sr = sorted([r for r in rows if r["settore"] == let], key=lambda r: (-r["tot"], r["picchetto"]))
        for r in sr:
            r["pen"] = 1 + sum(1 for o in sr if o["tot"] > r["tot"])
        for k, r in enumerate(sr):
            r["pos"] = k + 1
        settori.append({"lettera": let, "tecnico": let in tecnici, "rows": sr})
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
