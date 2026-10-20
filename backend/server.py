from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Form
from fastapi.responses import Response
from storage import init_storage, put_object, get_object, APP_NAME
from starlette.middleware.cors import CORSMiddleware
from pgdb import db, engine, refresh_loop, TABLES
import asyncio
from pydantic import BaseModel

from logic import compute_settori, settori_label, build_classifica, min_cm
from seed import seed, gen_iscritti, apply_draw, now

app = FastAPI()
api = APIRouter(prefix="/api")
NOID = {"_id": 0}


def hash_password(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_password(p, h): return bcrypt.checkpw(p.encode(), h.encode())


def make_token(uid):
    return jwt.encode({"sub": uid, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(days=7)}, os.environ["JWT_SECRET"], algorithm="HS256")


def public_user(u):
    return {**{k: u.get(k) for k in ("id", "username", "role", "nome", "gara_id", "settore")}, "approvato": u.get("approvato", True)}


async def current_user(request: Request):
    h = request.headers.get("Authorization", "")
    if not h.startswith("Bearer "):
        raise HTTPException(401, "Non autenticato")
    try:
        payload = jwt.decode(h[7:], os.environ["JWT_SECRET"], algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Sessione scaduta")
    u = await db.users.find_one({"id": payload["sub"]}, NOID)
    if not u:
        raise HTTPException(401, "Utente non trovato")
    return u


async def optional_user(request: Request):
    try:
        return await current_user(request)
    except HTTPException:
        return None


def require(*roles):
    async def dep(u=Depends(current_user)):
        if u["role"] not in roles:
            raise HTTPException(403, "Accesso negato")
        return u
    return dep


async def get_gara(gid):
    g = await db.gare.find_one({"id": gid}, NOID)
    if not g:
        raise HTTPException(404, "Gara non trovata")
    return g


async def gara_judge(gid, u):
    g = await get_gara(gid)
    if u["role"] == "ADMIN" or (u["role"] == "GIUDICE" and g.get("giudice_id") == u["id"]):
        return g
    raise HTTPException(403, "Gara non assegnata")


def settori_of(u):
    return [x for x in (u.get("settore") or "").split(",") if x]


def avviata(g):
    return (g.get("timer") or {}).get("stato", "FERMO") != "FERMO"


def check_lock(g):
    if avviata(g):
        raise HTTPException(400, "Gara avviata: impostazioni, iscritti e sorteggio bloccati")


async def check_single_live(g, giudice_id=None):
    gid = giudice_id or g.get("giudice_id")
    if not gid:
        return
    other = await db.gare.find_one({"giudice_id": gid, "stato": "In Corso Live", "id": {"$ne": g["id"]}}, NOID)
    if other:
        raise HTTPException(400, f"Il giudice ha già una gara live: {other['nome']}")


async def specie_map():
    return {s["name"]: s for s in await db.specie.find({}, NOID).to_list(200)}


async def classifica(g, only_approved=True):
    isc = await db.iscritti.find({"gara_id": g["id"]}, NOID).to_list(1000)
    q = {"gara_id": g["id"], "stato": "APPROVATA"}
    cat = await db.catture.find(q, NOID).sort("created_at", 1).to_list(5000)
    return build_classifica(g, isc, cat, await specie_map())


async def gara_summary(g):
    n = await db.iscritti.count_documents({"gara_id": g["id"]})
    label = g.get("settori_label") or (settori_label(compute_settori(n, g.get("zone", 1))) if n else "")
    return {**g, "n_iscritti": n, "settori_preview": label, "server_now": now_ms()}


def now_ms():
    return int(datetime.now(timezone.utc).timestamp() * 1000)


# ---------- models
class LoginIn(BaseModel):
    username: str
    password: str


class RegisterIn(BaseModel):
    username: str
    password: str
    nome: str
    role: str = "ISPETTORE"


class InvitoIn(BaseModel):
    ispettore_id: str
    settore: str


class GaraIn(BaseModel):
    nome: str
    data: str
    luogo: str
    specialita: str
    tipo: str = "Individuale"
    zone: int = 1
    max_iscritti: int = 30
    stato: str = "Iscrizioni Aperte"
    giudice_id: Optional[str] = None
    durata_min: int = 180
    bonus_pesce: int = 0
    preda_tecnica: int = 0


class GaraPatch(BaseModel):
    specialita: Optional[str] = None
    tipo: Optional[str] = None
    zone: Optional[int] = None
    durata_min: Optional[int] = None
    bonus_pesce: Optional[int] = None
    preda_tecnica: Optional[int] = None


class UserIn(BaseModel):
    username: str
    password: Optional[str] = None
    role: str
    nome: str = ""
    gara_id: Optional[str] = None
    settore: Optional[str] = None


class IscrittoIn(BaseModel):
    nome: str
    cognome: str
    societa: str = ""
    provincia: str = ""
    gruppo: str = ""
    rank: Optional[int] = None
    esterno_prec: bool = False


class CatturaIn(BaseModel):
    iscritto_id: str
    specie: Optional[str] = None
    cm: Optional[float] = None
    peso: Optional[float] = None


class CatturaAction(BaseModel):
    azione: str
    motivo: str = ""
    specie: Optional[str] = None
    cm: Optional[float] = None
    peso: Optional[float] = None


class MsgIn(BaseModel):
    testo: str
    a: str = "ALL"


class DocIn(BaseModel):
    titolo: str
    anno: int
    specialita: str
    url: str = ""


class SpecieIn(BaseModel):
    punti: List[int]


# ---------- auth
@api.post("/auth/login")
async def login(body: LoginIn):
    u = await db.users.find_one({"username": body.username.strip().lower()}, NOID)
    if not u or not verify_password(body.password, u["password_hash"]):
        raise HTTPException(401, "Credenziali non valide")
    if not u.get("approvato", True):
        raise HTTPException(403, "Account in attesa di approvazione dell'Admin")
    return {"token": make_token(u["id"]), "user": public_user(u)}


@api.post("/auth/register")
async def register(body: RegisterIn):
    uname = body.username.strip().lower()
    if len(uname) < 3 or len(body.password) < 6:
        raise HTTPException(400, "Username min 3 caratteri, password min 6")
    if body.role not in ("GIUDICE", "ISPETTORE"):
        raise HTTPException(400, "Ruolo non valido")
    if await db.users.find_one({"username": uname}):
        raise HTTPException(400, "Username già esistente")
    await db.users.insert_one({"id": str(uuid.uuid4()), "username": uname, "password_hash": hash_password(body.password), "role": body.role,
                               "nome": body.nome.strip(), "gara_id": None, "settore": None, "approvato": False, "created_at": now()})
    return {"ok": True}


@api.get("/auth/me")
async def me(u=Depends(current_user)):
    return public_user(u)


# ---------- public
@api.get("/gare")
async def list_gare():
    gare = await db.gare.find({}, NOID).sort("data", 1).to_list(500)
    return [await gara_summary(g) for g in gare]


@api.get("/gare/{gid}")
async def gara_detail(gid: str):
    return await gara_summary(await get_gara(gid))


@api.get("/gare/{gid}/classifica")
async def public_classifica(gid: str):
    g = await get_gara(gid)
    return {"gara": await gara_summary(g), "classifica": await classifica(g)}


@api.get("/documenti")
async def documenti():
    return await db.documenti.find({"is_deleted": {"$ne": True}}, NOID).sort([("anno", -1), ("titolo", 1)]).to_list(500)


@api.get("/specie")
async def get_specie():
    return await db.specie.find({}, NOID).sort("name", 1).to_list(200)


# ---------- admin
@api.post("/gare")
async def create_gara(body: GaraIn, u=Depends(require("ADMIN", "GIUDICE"))):
    g = {**body.model_dump(), "id": str(uuid.uuid4()), "settori": [], "settori_label": "", "created_at": now()}
    if u["role"] == "GIUDICE":
        g["giudice_id"] = u["id"]
    await db.gare.insert_one(dict(g))
    g.pop("_id", None)
    return g


@api.put("/gare/{gid}")
async def update_gara(gid: str, body: GaraIn, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    upd = body.model_dump(exclude={"giudice_id"} if u["role"] == "GIUDICE" else None)
    if avviata(g) and any(upd.get(k) != g.get(k) for k in ("specialita", "tipo", "zone", "max_iscritti", "durata_min", "bonus_pesce", "preda_tecnica")):
        check_lock(g)
    if upd.get("stato") == "In Corso Live":
        await check_single_live(g, upd.get("giudice_id") or g.get("giudice_id"))
    await db.gare.update_one({"id": gid}, {"$set": upd})
    return await get_gara(gid)


@api.delete("/gare/{gid}")
async def delete_gara(gid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    await gara_judge(gid, u)
    for c in ("iscritti", "catture", "messaggi", "inviti"):
        await db[c].delete_many({"gara_id": gid})
    await db.gare.delete_one({"id": gid})
    await db.users.update_many({"gara_id": gid, "role": "ISPETTORE"}, {"$set": {"gara_id": None, "settore": None}})
    return {"ok": True}


@api.get("/users")
async def list_users(u=Depends(require("ADMIN"))):
    return [public_user(x) for x in await db.users.find({}, NOID).sort("username", 1).to_list(500)]


@api.post("/users")
async def create_user(body: UserIn, u=Depends(require("ADMIN"))):
    uname = body.username.strip().lower()
    if not body.password:
        raise HTTPException(400, "Password obbligatoria")
    if await db.users.find_one({"username": uname}):
        raise HTTPException(400, "Username già esistente")
    doc = {**body.model_dump(exclude={"password", "gara_id", "settore"}), "gara_id": None, "settore": None, "approvato": True, "username": uname, "id": str(uuid.uuid4()), "password_hash": hash_password(body.password), "created_at": now()}
    await db.users.insert_one(doc)
    return public_user(doc)


@api.post("/users/{uid}/approva")
async def approva_user(uid: str, body: dict, u=Depends(require("ADMIN"))):
    if not await db.users.find_one({"id": uid}):
        raise HTTPException(404, "Utente non trovato")
    await db.users.update_one({"id": uid}, {"$set": {"approvato": bool(body.get("approvato", True))}})
    return {"ok": True}


@api.put("/users/{uid}")
async def update_user(uid: str, body: UserIn, u=Depends(require("ADMIN"))):
    upd = body.model_dump(exclude={"password", "username", "gara_id", "settore"})
    if body.password:
        upd["password_hash"] = hash_password(body.password)
    await db.users.update_one({"id": uid}, {"$set": upd})
    return public_user(await db.users.find_one({"id": uid}, NOID))


@api.delete("/users/{uid}")
async def delete_user(uid: str, u=Depends(require("ADMIN"))):
    if uid == u["id"]:
        raise HTTPException(400, "Non puoi eliminare te stesso")
    await db.users.delete_one({"id": uid})
    await db.gare.update_many({"giudice_id": uid}, {"$set": {"giudice_id": None}})
    return {"ok": True}


@api.post("/documenti")
async def add_doc(body: DocIn, u=Depends(require("ADMIN"))):
    d = {**body.model_dump(), "id": str(uuid.uuid4())}
    await db.documenti.insert_one(dict(d))
    return d


@api.post("/documenti/upload")
async def upload_doc(file: UploadFile = File(...), titolo: str = Form(...), anno: int = Form(...), specialita: str = Form(...), u=Depends(require("ADMIN"))):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Solo file PDF")
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(400, "File troppo grande (max 25 MB)")
    did = str(uuid.uuid4())
    res = put_object(f"{APP_NAME}/documenti/{did}.pdf", data, "application/pdf")
    d = {"id": did, "titolo": titolo, "anno": anno, "specialita": specialita, "url": "", "storage_path": res["path"], "filename": file.filename, "size": len(data), "created_at": now()}
    await db.documenti.insert_one(dict(d))
    d.pop("_id", None)
    return d


@api.get("/documenti/{did}/file")
async def download_doc(did: str):
    d = await db.documenti.find_one({"id": did, "is_deleted": {"$ne": True}}, NOID)
    if not d or not d.get("storage_path"):
        raise HTTPException(404, "File non trovato")
    data, _ = get_object(d["storage_path"])
    return Response(content=data, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{d.get("filename", "documento.pdf")}"'})


@api.put("/documenti/{did}")
async def upd_doc(did: str, body: DocIn, u=Depends(require("ADMIN"))):
    await db.documenti.update_one({"id": did}, {"$set": body.model_dump(exclude={"url"} if not body.url else None)})
    return {"ok": True}


@api.delete("/documenti/{did}")
async def del_doc(did: str, u=Depends(require("ADMIN"))):
    await db.documenti.update_one({"id": did}, {"$set": {"is_deleted": True}})
    return {"ok": True}


@api.put("/specie/{name}")
async def upd_specie(name: str, body: SpecieIn, u=Depends(require("ADMIN"))):
    if len(body.punti) != 77:
        raise HTTPException(400, "Servono 77 valori (cm 7-83)")
    await db.specie.update_one({"name": name}, {"$set": {"punti": body.punti, "min": min_cm(body.punti)}})
    return {"ok": True}


# ---------- giudice
@api.get("/giudice/gare")
async def my_gare(u=Depends(require("ADMIN", "GIUDICE"))):
    q = {} if u["role"] == "ADMIN" else {"giudice_id": u["id"]}
    return [await gara_summary(g) for g in await db.gare.find(q, NOID).sort("data", 1).to_list(500)]


@api.patch("/gare/{gid}")
async def patch_gara(gid: str, body: GaraPatch, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    check_lock(g)
    upd = body.model_dump(exclude_none=True)
    await db.gare.update_one({"id": gid}, {"$set": upd})
    return await get_gara(gid)


@api.get("/gare/{gid}/iscritti")
async def get_iscritti(gid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    await gara_judge(gid, u)
    return await db.iscritti.find({"gara_id": gid}, NOID).sort("created_at", 1).to_list(1000)


async def _check_open(g):
    if g["stato"] == "Conclusa":
        raise HTTPException(400, "Gara conclusa")


@api.post("/gare/{gid}/iscritti")
async def add_iscritti(gid: str, body: List[IscrittoIn], u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    await _check_open(g)
    check_lock(g)
    docs = [{**b.model_dump(), "id": str(uuid.uuid4()), "gara_id": gid, "created_at": now()} for b in body if b.nome.strip()]
    if g["tipo"] in ("Squadre 4", "Individuale", "Società"):
        allg = await db.iscritti.find({"gara_id": gid}, NOID).to_list(2000) + docs
        per = {}
        for i in allg:
            if i.get("gruppo"):
                per.setdefault(i.get("societa", ""), set()).add(i["gruppo"])
        troppo = [s for s, gs in per.items() if len(gs) > 2]
        if troppo:
            raise HTTPException(400, f"Massimo 2 squadre per società: {', '.join(troppo)}")
    if docs:
        await db.iscritti.insert_many([dict(d) for d in docs])
    return {"added": len(docs)}


@api.post("/gare/{gid}/iscritti/demo")
async def demo_iscritti(gid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    await _check_open(g)
    check_lock(g)
    await db.iscritti.delete_many({"gara_id": gid})
    await db.catture.delete_many({"gara_id": gid})
    await db.iscritti.insert_many(gen_iscritti(gid, 24, g["tipo"]))
    await db.gare.update_one({"id": gid}, {"$set": {"settori": [], "settori_label": "", "stato": "Iscrizioni Aperte"}})
    return {"added": 24}


@api.delete("/gare/{gid}/iscritti/{iid}")
async def del_iscritto(gid: str, iid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    await _check_open(g)
    check_lock(g)
    await db.iscritti.delete_one({"id": iid, "gara_id": gid})
    await db.catture.delete_many({"iscritto_id": iid})
    return {"ok": True}


@api.delete("/gare/{gid}/iscritti")
async def del_all_iscritti(gid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    await _check_open(g)
    check_lock(g)
    await db.iscritti.delete_many({"gara_id": gid})
    await db.catture.delete_many({"gara_id": gid})
    await db.gare.update_one({"id": gid}, {"$set": {"settori": [], "settori_label": "", "stato": "Iscrizioni Aperte"}})
    return {"ok": True}


@api.post("/gare/{gid}/sorteggio")
async def do_sorteggio(gid: str, body: Optional[dict] = None, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    await _check_open(g)
    check_lock(g)
    isc = await db.iscritti.find({"gara_id": gid}, NOID).to_list(1000)
    if len(isc) < 2:
        raise HTTPException(400, "Servono almeno 2 iscritti")
    await db.catture.delete_many({"gara_id": gid})
    opts = {k: bool((body or {}).get(k, True)) for k in ("societa", "consecutivi", "teste")}
    settori = await apply_draw(db, g, isc, opts)
    await db.gare.update_one({"id": gid}, {"$set": {"settori": settori, "settori_label": settori_label(settori), "stato": "Sorteggiata", "sorteggio_opzioni": opts}})
    return await gara_summary(await get_gara(gid))


@api.post("/gare/{gid}/stato")
async def set_stato(gid: str, body: dict, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    stato = body.get("stato")
    if stato not in ("Iscrizioni Aperte", "Sorteggiata", "In Corso Live", "Conclusa"):
        raise HTTPException(400, "Stato non valido")
    if g["stato"] == "Conclusa" and u["role"] != "ADMIN":
        raise HTTPException(403, "Solo l'Admin può riaprire una gara conclusa")
    if stato == "In Corso Live":
        await check_single_live(g)
    await db.gare.update_one({"id": gid}, {"$set": {"stato": stato}})
    return {"ok": True}


@api.post("/gare/{gid}/timer")
async def timer(gid: str, body: dict, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    t = g.get("timer") or {"stato": "FERMO"}
    az, n = body.get("azione"), now_ms()
    if az == "start" and t["stato"] == "FERMO":
        await _check_open(g)
        if not g.get("settori"):
            raise HTTPException(400, "Effettua prima il sorteggio")
        await check_single_live(g)
        t = {"stato": "IN_CORSO", "start_ms": n, "pausa_ms": 0, "paused_at": None, "durata_ms": int(g.get("durata_min") or 180) * 60000}
        if g["stato"] in ("Sorteggiata", "Iscrizioni Aperte") and g.get("settori"):
            await db.gare.update_one({"id": gid}, {"$set": {"stato": "In Corso Live"}})
    elif az == "pausa" and t["stato"] == "IN_CORSO":
        t.update({"stato": "PAUSA", "paused_at": n})
    elif az == "riprendi" and t["stato"] == "PAUSA":
        t.update({"stato": "IN_CORSO", "pausa_ms": t["pausa_ms"] + n - t["paused_at"], "paused_at": None})
    elif az == "stop" and t["stato"] in ("IN_CORSO", "PAUSA"):
        t.update({"stato": "TERMINATO", "stop_at": n})
    elif az == "reset" and u["role"] == "ADMIN":
        t = {"stato": "FERMO"}
    else:
        raise HTTPException(400, "Azione non valida")
    await db.gare.update_one({"id": gid}, {"$set": {"timer": t}})
    return t


@api.get("/gare/{gid}/live")
async def live(gid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    cat = await db.catture.find({"gara_id": gid}, NOID).sort("created_at", -1).to_list(5000)
    msgs = await db.messaggi.find({"gara_id": gid}, NOID).sort("created_at", 1).to_list(1000)
    isp = [public_user(x) for x in await db.users.find({"role": "ISPETTORE", "gara_id": gid}, NOID).to_list(100)]
    return {"gara": await gara_summary(g), "catture": cat, "messaggi": msgs, "ispettori": isp, "classifica": await classifica(g)}


@api.put("/catture/{cid}")
async def act_cattura(cid: str, body: CatturaAction, u=Depends(require("ADMIN", "GIUDICE"))):
    c = await db.catture.find_one({"id": cid}, NOID)
    if not c:
        raise HTTPException(404, "Misura non trovata")
    g = await gara_judge(c["gara_id"], u)
    await _check_open(g)
    upd = {"validato_da": u["username"], "validato_at": now()}
    if body.azione == "approva":
        upd["stato"] = "APPROVATA"
    elif body.azione == "rigetta":
        if not body.motivo.strip():
            raise HTTPException(400, "Motivazione obbligatoria")
        upd.update({"stato": "RIGETTATA", "motivo": body.motivo})
    elif body.azione == "correggi":
        upd.update({"stato": "APPROVATA", "corretta": True, "originale": {"specie": c.get("specie"), "cm": c.get("cm")}})
        upd.update({k: v for k, v in {"specie": body.specie, "cm": int(body.cm) if body.cm is not None else None, "peso": body.peso}.items() if v is not None})
    else:
        raise HTTPException(400, "Azione non valida")
    await db.catture.update_one({"id": cid}, {"$set": upd})
    return {"ok": True}


@api.delete("/catture/{cid}")
async def del_cattura(cid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    c = await db.catture.find_one({"id": cid}, NOID)
    if not c:
        raise HTTPException(404, "Misura non trovata")
    g = await gara_judge(c["gara_id"], u)
    await _check_open(g)
    await db.catture.delete_one({"id": cid})
    return {"ok": True}


@api.post("/gare/{gid}/chiudi")
async def chiudi(gid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    await gara_judge(gid, u)
    await db.gare.update_one({"id": gid}, {"$set": {"stato": "Conclusa", "chiusa_at": now()}})
    await db.catture.update_many({"gara_id": gid, "stato": "IN_ATTESA"}, {"$set": {"stato": "RIGETTATA", "motivo": "Gara chiusa"}})
    return {"ok": True}


# ---------- catture (giudice + ispettore)
@api.post("/gare/{gid}/catture")
async def add_cattura(gid: str, body: CatturaIn, u=Depends(require("ADMIN", "GIUDICE", "ISPETTORE"))):
    g = await get_gara(gid)
    await _check_open(g)
    i = await db.iscritti.find_one({"id": body.iscritto_id, "gara_id": gid}, NOID)
    if not i or not i.get("settore"):
        raise HTTPException(400, "Concorrente non valido")
    if u["role"] == "ISPETTORE":
        if u.get("gara_id") != gid or i["settore"] not in settori_of(u):
            raise HTTPException(403, "Settore non assegnato")
        if i.get("cartellino_chiuso"):
            raise HTTPException(400, "Cartellino chiuso")
        stato = "IN_ATTESA"
    else:
        await gara_judge(gid, u)
        stato = "APPROVATA"
    if body.cm is None and body.peso is None:
        raise HTTPException(400, "Inserisci misura o peso")
    if body.cm is not None:
        body.cm = int(body.cm)
    c = {**body.model_dump(), "id": str(uuid.uuid4()), "gara_id": gid, "settore": i["settore"], "stato": stato, "motivo": "", "inviato_da": u["username"], "origine": u["role"], "created_at": now()}
    await db.catture.insert_one(dict(c))
    if g["stato"] == "Sorteggiata" and not await db.gare.find_one({"giudice_id": g.get("giudice_id"), "stato": "In Corso Live", "id": {"$ne": gid}}):
        await db.gare.update_one({"id": gid}, {"$set": {"stato": "In Corso Live"}})
    return c


@api.post("/gare/{gid}/iscritti/{iid}/cartellino")
async def cartellino(gid: str, iid: str, body: dict, u=Depends(require("ADMIN", "GIUDICE", "ISPETTORE"))):
    g = await get_gara(gid)
    i = await db.iscritti.find_one({"id": iid, "gara_id": gid}, NOID)
    if not i:
        raise HTTPException(404, "Concorrente non trovato")
    chiuso = bool(body.get("chiuso", True))
    if u["role"] == "ISPETTORE":
        if u.get("gara_id") != gid or i.get("settore") not in settori_of(u):
            raise HTTPException(403, "Settore non assegnato")
        if not chiuso:
            raise HTTPException(403, "Solo il giudice può riaprire il cartellino")
    else:
        await gara_judge(gid, u)
    await _check_open(g)
    await db.iscritti.update_one({"id": iid}, {"$set": {"cartellino_chiuso": chiuso, "cartellino_da": u["username"], "cartellino_at": now()}})
    return {"ok": True}


# ---------- atleti
class AtletaIn(BaseModel):
    nome: str
    cognome: str
    societa: str
    provincia: str = ""
    tessera: str = ""


@api.get("/atleti")
async def list_atleti(u=Depends(require("ADMIN", "GIUDICE"))):
    return await db.atleti.find({}, NOID).sort([("societa", 1), ("cognome", 1), ("nome", 1)]).to_list(5000)


@api.post("/atleti")
async def add_atleti(body: List[AtletaIn], u=Depends(require("ADMIN", "GIUDICE"))):
    docs = [{**{k: v.strip() for k, v in b.model_dump().items()}, "id": str(uuid.uuid4()), "created_at": now()} for b in body if b.nome.strip() and b.societa.strip()]
    if docs:
        await db.atleti.insert_many(docs)
    return {"added": len(docs)}


@api.put("/atleti/{aid}")
async def upd_atleta(aid: str, body: AtletaIn, u=Depends(require("ADMIN", "GIUDICE"))):
    await db.atleti.update_one({"id": aid}, {"$set": body.model_dump()})
    return {"ok": True}


@api.delete("/atleti/{aid}")
async def del_atleta(aid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    await db.atleti.delete_one({"id": aid})
    return {"ok": True}


@api.post("/gare/{gid}/iscritti/da-atleti")
async def iscrivi_atleti(gid: str, body: dict, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    await _check_open(g)
    check_lock(g)
    gia = {i.get("atleta_id") for i in await db.iscritti.find({"gara_id": gid}, NOID).to_list(2000)}
    docs = []
    for a in await db.atleti.find({"id": {"$in": body.get("ids", [])}}, NOID).to_list(2000):
        if a["id"] in gia:
            continue
        docs.append({"id": str(uuid.uuid4()), "gara_id": gid, "atleta_id": a["id"], "nome": a["nome"], "cognome": a["cognome"], "societa": a["societa"],
                     "provincia": a.get("provincia", ""), "gruppo": "", "rank": None, "esterno_prec": False, "created_at": now()})
    if docs:
        await db.iscritti.insert_many(docs)
    return {"added": len(docs)}


@api.post("/gare/{gid}/squadre")
async def crea_squadra(gid: str, body: dict, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    await _check_open(g)
    check_lock(g)
    ids, nome = body.get("membri", []), (body.get("nome") or "").strip()
    if len(set(ids)) != 4 or not nome:
        raise HTTPException(400, "Una squadra deve avere un nome e 4 componenti")
    isc = await db.iscritti.find({"gara_id": gid}, NOID).to_list(2000)
    membri = [i for i in isc if i["id"] in ids]
    if len(membri) != 4 or len({m["societa"] for m in membri}) != 1:
        raise HTTPException(400, "I 4 componenti devono essere della stessa società")
    if any(m.get("gruppo") for m in membri):
        raise HTTPException(400, "Un componente è già in un'altra squadra")
    soc = membri[0]["societa"]
    if any(i.get("gruppo") == nome for i in isc):
        raise HTTPException(400, "Nome squadra già usato")
    if len({i["gruppo"] for i in isc if i.get("gruppo") and i["societa"] == soc}) >= 2:
        raise HTTPException(400, f"{soc} ha già 2 squadre: massimo consentito")
    await db.iscritti.update_many({"gara_id": gid, "id": {"$in": ids}}, {"$set": {"gruppo": nome}})
    return {"ok": True}


@api.delete("/gare/{gid}/squadre/{nome}")
async def del_squadra(gid: str, nome: str, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    await _check_open(g)
    check_lock(g)
    await db.iscritti.update_many({"gara_id": gid, "gruppo": nome}, {"$set": {"gruppo": ""}})
    return {"ok": True}


# ---------- campionati
class CampIn(BaseModel):
    nome: str
    specialita: str = "Surf Casting"
    anno: int = 2026
    scarti: int = 0
    tipo_scarto: str = "intero"
    pen_assenza: int = 11


class ProvaIn(BaseModel):
    tipo: str
    gara_id: Optional[str] = None
    nome: str = ""
    data: str = ""
    risultati: List[dict] = []


async def camp_owner(cid, u):
    c = await db.campionati.find_one({"id": cid}, NOID)
    if not c:
        raise HTTPException(404, "Campionato non trovato")
    if u["role"] != "ADMIN" and c.get("owner_id") != u["id"]:
        raise HTTPException(403, "Campionato non tuo")
    return c


async def prova_risultati(p):
    if p["tipo"] == "manuale":
        return p.get("risultati", [])
    g = await db.gare.find_one({"id": p["gara_id"]}, NOID)
    if not g:
        return []
    c = await classifica(g)
    return [{"nome": r["nome"], "societa": r["societa"], "settore": r["settore"], "pen": r["pen"], "tot": r["tot"]} for r in c["assoluta"]]


async def classifica_generale(c):
    prove = c.get("prove", [])
    atleti = {}
    for k, p in enumerate(prove):
        for r in await prova_risultati(p):
            key = " ".join(str(r.get("nome", "")).lower().split())
            if not key:
                continue
            a = atleti.setdefault(key, {"nome": r["nome"], "societa": r.get("societa", ""), "pen": [None] * len(prove), "tot": [0] * len(prove)})
            a["pen"][k] = int(float(r.get("pen") or 0))
            a["tot"][k] = float(r.get("tot") or 0)
            a["societa"] = r.get("societa") or a["societa"]
    out = []
    sc = 1 if len(prove) > 1 else 0
    for a in atleti.values():
        pens = [p if p is not None else int(c.get("pen_assenza") or 11) for p in a["pen"]]
        scartate = sorted(range(len(pens)), key=lambda i: -pens[i])[:sc]
        mezzo = c.get("tipo_scarto") == "mezzo"
        tot_pen = sum(p for i, p in enumerate(pens) if i not in scartate) + (sum(pens[i] for i in scartate) / 2 if mezzo else 0)
        tot_pen = int(tot_pen) if float(tot_pen).is_integer() else tot_pen
        out.append({**a, "pen_eff": pens, "scartate": scartate, "tot_pen": tot_pen, "tot_punti": round(sum(t * (0.5 if mezzo else 0) if i in scartate else t for i, t in enumerate(a["tot"])), 2), "presenze": sum(1 for p in a["pen"] if p is not None)})
    out.sort(key=lambda a: (a["tot_pen"], -a["tot_punti"]))
    for i, a in enumerate(out):
        a["pos"] = i + 1
    return out


@api.get("/campionati")
async def list_camp():
    return await db.campionati.find({}, NOID).sort([("anno", -1), ("nome", 1)]).to_list(200)


@api.get("/campionati/{cid}")
async def get_camp(cid: str):
    c = await db.campionati.find_one({"id": cid}, NOID)
    if not c:
        raise HTTPException(404, "Campionato non trovato")
    return {"campionato": c, "classifica": await classifica_generale(c)}


@api.post("/campionati")
async def add_camp(body: CampIn, u=Depends(require("ADMIN", "GIUDICE"))):
    c = {**body.model_dump(), "id": str(uuid.uuid4()), "owner_id": u["id"], "prove": [], "created_at": now()}
    await db.campionati.insert_one(dict(c))
    c.pop("_id", None)
    return c


@api.put("/campionati/{cid}")
async def upd_camp(cid: str, body: CampIn, u=Depends(require("ADMIN", "GIUDICE"))):
    await camp_owner(cid, u)
    await db.campionati.update_one({"id": cid}, {"$set": body.model_dump()})
    return {"ok": True}


@api.delete("/campionati/{cid}")
async def del_camp(cid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    await camp_owner(cid, u)
    await db.campionati.delete_one({"id": cid})
    return {"ok": True}


@api.post("/campionati/{cid}/prove")
async def add_prova(cid: str, body: ProvaIn, u=Depends(require("ADMIN", "GIUDICE"))):
    await camp_owner(cid, u)
    p = {"id": str(uuid.uuid4()), "tipo": body.tipo}
    if body.tipo == "app":
        g = await get_gara(body.gara_id or "")
        if g["stato"] != "Conclusa":
            raise HTTPException(400, "La gara deve essere conclusa")
        p.update({"gara_id": g["id"], "nome": g["nome"], "data": g["data"]})
    elif body.tipo == "manuale":
        if not body.nome.strip() or not body.risultati:
            raise HTTPException(400, "Nome prova e risultati obbligatori")
        p.update({"nome": body.nome.strip(), "data": body.data, "risultati": body.risultati})
    else:
        raise HTTPException(400, "Tipo non valido")
    await db.campionati.update_one({"id": cid}, {"$push": {"prove": p}})
    return p


@api.delete("/campionati/{cid}/prove/{pid}")
async def del_prova(cid: str, pid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    await camp_owner(cid, u)
    await db.campionati.update_one({"id": cid}, {"$pull": {"prove": {"id": pid}}})
    return {"ok": True}


# ---------- inviti
@api.get("/ispettori")
async def list_ispettori(u=Depends(require("ADMIN", "GIUDICE"))):
    return [public_user(x) for x in await db.users.find({"role": "ISPETTORE", "approvato": {"$ne": False}}, NOID).sort("username", 1).to_list(500)]


@api.get("/gare/{gid}/inviti")
async def list_inviti(gid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    await gara_judge(gid, u)
    return await db.inviti.find({"gara_id": gid, "stato": {"$ne": "REVOCATO"}}, NOID).sort("created_at", -1).to_list(500)


@api.post("/gare/{gid}/inviti")
async def crea_invito(gid: str, body: InvitoIn, u=Depends(require("ADMIN", "GIUDICE"))):
    g = await gara_judge(gid, u)
    isp = await db.users.find_one({"id": body.ispettore_id, "role": "ISPETTORE"}, NOID)
    if not isp or not isp.get("approvato", True):
        raise HTTPException(400, "Ispettore non approvato")
    if await db.inviti.find_one({"gara_id": gid, "ispettore_id": isp["id"], "settore": body.settore, "stato": {"$in": ["IN_ATTESA", "ACCETTATO"]}}):
        raise HTTPException(400, "Ispettore già invitato in questo settore")
    if isp.get("gara_id") and isp["gara_id"] != gid:
        other = await db.gare.find_one({"id": isp["gara_id"]}, NOID)
        if other and other["stato"] != "Conclusa":
            raise HTTPException(400, f"Ispettore già impegnato nella gara: {other['nome']}")
    inv = {"id": str(uuid.uuid4()), "gara_id": gid, "gara_nome": g["nome"], "ispettore_id": isp["id"], "ispettore_username": isp["username"],
           "ispettore_nome": isp.get("nome", ""), "settore": body.settore, "stato": "IN_ATTESA", "invitato_da": u["username"], "created_at": now()}
    await db.inviti.insert_one(dict(inv))
    return inv


@api.delete("/inviti/{iid}")
async def revoca_invito(iid: str, u=Depends(require("ADMIN", "GIUDICE"))):
    inv = await db.inviti.find_one({"id": iid}, NOID)
    if not inv:
        raise HTTPException(404, "Invito non trovato")
    await gara_judge(inv["gara_id"], u)
    await db.inviti.update_one({"id": iid}, {"$set": {"stato": "REVOCATO"}})
    isp = await db.users.find_one({"id": inv["ispettore_id"], "gara_id": inv["gara_id"]}, NOID)
    if isp:
        rest = [x for x in settori_of(isp) if x != inv["settore"]]
        await db.users.update_one({"id": isp["id"]}, {"$set": {"settore": ",".join(rest) or None, "gara_id": inv["gara_id"] if rest else None}})
    return {"ok": True}


@api.post("/inviti/{iid}/{azione}")
async def rispondi_invito(iid: str, azione: str, u=Depends(require("ISPETTORE"))):
    inv = await db.inviti.find_one({"id": iid, "ispettore_id": u["id"], "stato": "IN_ATTESA"}, NOID)
    if not inv or azione not in ("accetta", "rifiuta") or not await db.gare.find_one({"id": inv["gara_id"]}):
        raise HTTPException(404, "Invito non valido")
    if azione == "rifiuta":
        await db.inviti.update_one({"id": iid}, {"$set": {"stato": "RIFIUTATO"}})
        return {"ok": True}
    if u.get("gara_id") == inv["gara_id"]:
        sett = sorted(set(settori_of(u) + [inv["settore"]]))
    else:
        if u.get("gara_id"):
            other = await db.gare.find_one({"id": u["gara_id"]}, NOID)
            if other and other["stato"] != "Conclusa":
                raise HTTPException(400, f"Sei già impegnato nella gara: {other['nome']}")
        await db.inviti.update_many({"ispettore_id": u["id"], "stato": "ACCETTATO"}, {"$set": {"stato": "TERMINATO"}})
        sett = [inv["settore"]]
    await db.inviti.update_one({"id": iid}, {"$set": {"stato": "ACCETTATO", "accettato_at": now()}})
    await db.users.update_one({"id": u["id"]}, {"$set": {"gara_id": inv["gara_id"], "settore": ",".join(sett)}})
    return {"ok": True}


# ---------- ispettore
@api.get("/ispettore/live")
async def isp_live(u=Depends(require("ISPETTORE"))):
    inviti = await db.inviti.find({"ispettore_id": u["id"], "stato": "IN_ATTESA"}, NOID).to_list(50)
    if not u.get("gara_id"):
        return {"gara": None, "inviti": inviti}
    g = await get_gara(u["gara_id"])
    sett = settori_of(u)
    isc = await db.iscritti.find({"gara_id": g["id"], "settore": {"$in": sett}}, NOID).sort("picchetto", 1).to_list(400)
    cat = await db.catture.find({"gara_id": g["id"], "settore": {"$in": sett}}, NOID).sort("created_at", -1).to_list(2000)
    msgs = await db.messaggi.find({"gara_id": g["id"], "$or": [{"a": "ALL"}, {"a": u["username"]}, {"da": u["username"]}]}, NOID).sort("created_at", 1).to_list(1000)
    return {"gara": await gara_summary(g), "settore": u["settore"], "settori": sett, "iscritti": isc, "catture": cat, "messaggi": msgs, "inviti": inviti}


# ---------- chat
@api.post("/gare/{gid}/messaggi")
async def send_msg(gid: str, body: MsgIn, u=Depends(require("ADMIN", "GIUDICE", "ISPETTORE"))):
    if u["role"] == "ISPETTORE":
        if u.get("gara_id") != gid:
            raise HTTPException(403, "Gara non assegnata")
        to = "GIUDICE"
    else:
        await gara_judge(gid, u)
        to = body.a
    if not body.testo.strip():
        raise HTTPException(400, "Messaggio vuoto")
    m = {"id": str(uuid.uuid4()), "gara_id": gid, "da": u["username"], "da_nome": u.get("nome") or u["username"], "ruolo": u["role"], "settore": u.get("settore"), "a": to, "testo": body.testo.strip(), "created_at": now()}
    await db.messaggi.insert_one(dict(m))
    return m


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO)


@app.on_event("startup")
async def startup():
    await asyncio.gather(*[db[t].load() for t in TABLES])
    asyncio.create_task(refresh_loop())
    await db.users.create_index("username", unique=True)
    await db.iscritti.create_index("gara_id")
    await db.catture.create_index("gara_id")
    await seed(db, hash_password)
    if await db.inviti.count_documents({}) == 0:
        for isp in await db.users.find({"role": "ISPETTORE", "gara_id": {"$ne": None}}, NOID).to_list(100):
            g = await db.gare.find_one({"id": isp["gara_id"]}, NOID)
            await db.inviti.insert_one({"id": str(uuid.uuid4()), "gara_id": isp["gara_id"], "gara_nome": g["nome"] if g else "", "ispettore_id": isp["id"],
                                        "ispettore_username": isp["username"], "ispettore_nome": isp.get("nome", ""), "settore": isp["settore"],
                                        "stato": "ACCETTATO", "invitato_da": "giudice1", "created_at": now()})
    try:
        init_storage()
    except Exception as e:
        logging.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
