import json
import random
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
from logic import sorteggio, settori_label, GROUP_SIZE, min_cm

SPECIE_MIN = [
    ("Aguglia", 25, 1.0), ("Aguglia Imperiale", 60, 1.0), ("Alaccia", 15, 0.5), ("Balestra", 20, 1.0), ("Barracuda", 30, 1.0),
    ("Boga", 15, 0.5), ("Castagnola", 10, 0.5), ("Cefalo", 20, 1.0), ("Cernia", 45, 1.5), ("Corvina", 25, 1.5),
    ("Dentice", 25, 1.5), ("Donzella", 10, 0.5), ("Gallinella", 15, 1.0), ("Ghiozzo", 10, 0.5), ("Grongo", 40, 1.0),
    ("Leccia", 40, 1.5), ("Leccia Stella", 25, 1.0), ("Mennola", 10, 0.5), ("Merlano", 20, 1.0), ("Molo", 20, 1.0),
    ("Mormora", 20, 1.0), ("Murena", 40, 1.0), ("Occhiata", 15, 0.5), ("Ombrina", 25, 1.5), ("Orata", 20, 1.5),
    ("Pagello Fragolino", 15, 1.0), ("Pagro", 18, 1.0), ("Palamita", 30, 1.0), ("Pesce Serra", 30, 1.5), ("Rana Pescatrice", 30, 1.0),
    ("Razza", 30, 1.0), ("Rombo", 30, 1.5), ("Salpa", 15, 0.5), ("Sarago Faraone", 23, 1.0), ("Sarago Fasciato", 23, 1.0),
    ("Sarago Maggiore", 23, 1.5), ("Sarago Pizzuto", 18, 1.0), ("Sarago Sparaglione", 12, 0.5), ("Scorfano", 15, 1.0), ("Sgombro", 18, 1.0),
    ("Sogliola", 20, 1.5), ("Spigola", 25, 1.5), ("Sugarello", 15, 0.5), ("Tanuta", 20, 1.0), ("Tracina", 15, 1.0),
    ("Triglia", 11, 1.0), ("Tordo", 12, 0.5),
]
BASE = {"Aguglia": 25, "Cefalo": 30, "Spigola": 35, "Orata": 28, "Mormora": 22, "Sarago Maggiore": 30, "Sogliola": 30, "Triglia": 20, "Pesce Serra": 32, "Leccia": 40}

NOMI = ["Marco", "Luca", "Giuseppe", "Andrea", "Paolo", "Francesco", "Stefano", "Roberto", "Alessandro", "Davide", "Simone", "Fabio", "Matteo", "Antonio", "Giovanni", "Massimo", "Claudio", "Daniele", "Sara", "Giulia", "Elena", "Mario", "Enrico", "Pietro"]
COGNOMI = ["Rossi", "Bianchi", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Moretti", "Barbieri", "Fontana", "Santoro", "Mariani", "Rinaldi", "Caruso", "Ferrara", "Galli"]
SOCIETA = [("ASD Ceccano Fishing", "FR"), ("Lenza Ciociara", "FR"), ("Team Aniene", "RM"), ("ASD Pescatori Pontini", "LT"), ("Surf Club Terracina", "LT"), ("Amici della Canna", "FR")]

DOCUMENTI = [
    ("Circolare Normativa Surf Casting 2026", 2026, "Surf Casting", "https://www.fipsas.it/pesca-di-superficie/mare/surf-casting"),
    ("Circolare Normativa Pesca al Colpo 2026", 2026, "Pesca al Colpo", "https://www.fipsas.it/pesca-di-superficie/acque-interne/pesca-al-colpo"),
    ("Circolare Normativa Trota Lago 2026", 2026, "Trota Lago", "https://www.fipsas.it/pesca-di-superficie/acque-interne/trota-lago"),
    ("Regolamento Nazionale Pesca di Superficie", 2025, "Generale", "https://www.fipsas.it/pesca-di-superficie"),
]


def now():
    return datetime.now(timezone.utc).isoformat()


def gen_iscritti(gara_id, n, tipo):
    k = GROUP_SIZE.get(tipo, 1)
    out = []
    labels = {"Coppie 2": "Coppia", "Box 4": "Box", "Squadre 4": "Squadra"}
    for idx in range(n):
        gi = idx // k
        soc, prov = SOCIETA[gi % len(SOCIETA)] if k > 1 else SOCIETA[idx % len(SOCIETA)]
        out.append({"id": str(uuid.uuid4()), "gara_id": gara_id, "nome": NOMI[idx % len(NOMI)], "cognome": COGNOMI[(idx * 7) % len(COGNOMI)] + ("" if idx < len(COGNOMI) else f" {idx // len(COGNOMI) + 1}"),
                    "societa": soc, "provincia": prov, "gruppo": f"{labels[tipo]} {gi + 1}" if k > 1 else "",
                    "rank": (idx + 1) if idx < 3 and k == 1 else None, "esterno_prec": idx == 5, "created_at": now()})
    return out


async def apply_draw(db, gara, iscritti, opts=None):
    res, settori = sorteggio(iscritti, gara["tipo"], gara.get("zone", 1), opts)
    for r in res:
        await db.iscritti.update_one({"id": r["id"]}, {"$set": r})
    return settori


async def seed(db, hash_password):
    await db.users.delete_one({"username": "admin"})
    users = [("mizzxbox@hotmail.it", "rosalba", "ADMIN", "Amministratore", None), ("giudice1", "giudice123", "GIUDICE", "Giudice Mario Verdi", None),
             ("ispettore1", "isp123", "ISPETTORE", "Ispettore Sponda A", "A"), ("ispettore2", "isp123", "ISPETTORE", "Ispettore Sponda B", "B"),
             ("ispettore3", "isp123", "ISPETTORE", "Ispettore Sponda C", "C")]
    if not await db.specie.find_one({"punti": {"$exists": True}}):
        tab = json.load(open(Path(__file__).parent / "specie_tabella.json"))
        await db.specie.delete_many({})
        await db.specie.insert_many([{"name": n, "punti": p, "min": min_cm(p)} for n, p in tab.items()])
        names = list(tab)
        async for c in db.catture.find({"cm": {"$ne": None}, "specie": {"$nin": names}}, {"_id": 0, "id": 1}):
            await db.catture.update_one({"id": c["id"]}, {"$set": {"specie": random.choice(["Spigola", "Mormora", "Saraghi", "Orata Tanuta", "Aguglia", "Cefalo"]), "cm": random.choice([14, 19, 23, 27, 31, 36])}})
    if await db.documenti.count_documents({}) == 0:
        await db.documenti.insert_many([{"id": str(uuid.uuid4()), "titolo": t, "anno": a, "specialita": s, "url": u} for t, a, s, u in DOCUMENTI])
    for u, p, r, name, _ in users:
        if not await db.users.find_one({"username": u}):
            await db.users.insert_one({"id": str(uuid.uuid4()), "username": u, "password_hash": hash_password(p), "role": r, "nome": name, "gara_id": None, "settore": None, "created_at": now()})
    if await db.gare.count_documents({}) > 0:
        return
    today = datetime.now(timezone.utc).date()
    gare = [
        ("Selettiva Provinciale Surf Casting Frosinone", 0, "Ponza - Spiaggia di Frontone", "Surf Casting", "Individuale", 3, 30, "In Corso Live", 24),
        ("Campionato Provinciale Pesca al Colpo", 12, "Ceccano - Fiume Sacco", "Pesca al Colpo", "Individuale", 2, 40, "Iscrizioni Aperte", 18),
        ("Trofeo Aniene Trota Torrente", 5, "Subiaco - Fiume Aniene", "Trota Torrente", "Individuale", 2, 40, "Sorteggiata", 32),
        ("Feeder Cup Lago di Canterno", -14, "Fiuggi - Lago di Canterno", "Feeder", "Individuale", 2, 30, "Conclusa", 20),
        ("Coppa Società Canna da Riva", 26, "Gaeta - Lungomare Serapo", "Canna Riva", "Società", 2, 50, "Iscrizioni Aperte", 0),
        ("Bolentino Golfo di Gaeta", 33, "Gaeta - Porto", "Bolentino", "Individuale", 1, 24, "Iscrizioni Aperte", 12),
        ("Carp Fishing 48h Lago di Fondi", 9, "Fondi - Lago", "Carp Fishing", "Coppie 2", 2, 20, "Sorteggiata", 16),
        ("Trout Area Lazio Open", -30, "Anagni - Laghetto Le Fontane", "Trout Area", "Individuale", 1, 20, "Conclusa", 14),
        ("Kayak Fishing Isola di Ponza", 40, "Ponza - Cala Feola", "Kayak", "Individuale", 1, 16, "Iscrizioni Aperte", 8),
        ("Campionato Regionale Box Surf Casting", 19, "Sabaudia - Lungomare", "Surf Casting", "Box 4", 2, 40, "Iscrizioni Aperte", 24),
    ]
    giudice = await db.users.find_one({"username": "giudice1"})
    for idx, (nome, d, luogo, spec, tipo, zone, mx, stato, n) in enumerate(gare):
        gid = str(uuid.uuid4())
        g = {"id": gid, "nome": nome, "data": (today + timedelta(days=d)).isoformat(), "luogo": luogo, "specialita": spec, "tipo": tipo,
             "zone": zone, "max_iscritti": mx, "stato": stato, "giudice_id": giudice["id"] if idx in (0, 2) else None, "settori": [], "settori_label": "", "created_at": now()}
        isc = gen_iscritti(gid, n, tipo)
        if isc:
            await db.iscritti.insert_many([dict(i) for i in isc])
        if stato != "Iscrizioni Aperte" and isc:
            g["settori"] = await apply_draw(db, g, isc)
            g["settori_label"] = settori_label(g["settori"])
        await db.gare.insert_one(g)
        if stato in ("In Corso Live", "Conclusa") and isc:
            drawn = await db.iscritti.find({"gara_id": gid}, {"_id": 0}).to_list(500)
            surf = spec == "Surf Casting"
            for k, i in enumerate(drawn[: 12 if surf else len(drawn)]):
                st = "APPROVATA"
                ins = None
                if surf and k >= 10:
                    st = "IN_ATTESA"
                    ins = f"ispettore{ {'A': 1, 'B': 2}.get(i['settore'], 3) }".replace(" ", "")
                c = {"id": str(uuid.uuid4()), "gara_id": gid, "iscritto_id": i["id"], "settore": i["settore"], "stato": st, "motivo": "",
                     "inviato_da": ins or "giudice1", "origine": "ISPETTORE" if ins else "GIUDICE", "created_at": now()}
                if surf:
                    c.update({"specie": random.choice(["Spigola", "Mormora", "Saraghi", "Orata Tanuta", "Aguglia", "Cefalo"]), "cm": random.choice([14, 19, 23, 27, 31, 36]), "peso": None})
                else:
                    c.update({"specie": "Pesata", "cm": None, "peso": random.randint(300, 4200)})
                await db.catture.insert_one(c)
            if idx == 0:
                for u, s in (("ispettore1", "A"), ("ispettore2", "B"), ("ispettore3", "C")):
                    await db.users.update_one({"username": u}, {"$set": {"gara_id": gid, "settore": s}})
                await db.messaggi.insert_one({"id": str(uuid.uuid4()), "gara_id": gid, "da": "giudice1", "da_nome": "Giudice", "a": "ALL", "testo": "Buongiorno, inizio gara ore 8:00.", "created_at": now()})
