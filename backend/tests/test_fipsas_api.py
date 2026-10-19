# FIPSAS Sorteggi Pro - backend API regression tests
import os
import pytest
import requests
from collections import Counter, defaultdict

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
SURF = "Selettiva Provinciale Surf Casting Frosinone"
ANIENE = "Trofeo Aniene Trota Torrente"


def login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def adm(): return login("admin", "admin123")
@pytest.fixture(scope="session")
def giu(): return login("giudice1", "giudice123")
@pytest.fixture(scope="session")
def isp1(): return login("ispettore1", "isp123")
@pytest.fixture(scope="session")
def isp2(): return login("ispettore2", "isp123")


@pytest.fixture(scope="session")
def gare():
    return {g["nome"]: g for g in requests.get(f"{API}/gare").json()}


# --- auth
class TestAuth:
    def test_login_roles(self):
        for u, p, role in [("admin", "admin123", "ADMIN"), ("giudice1", "giudice123", "GIUDICE"), ("ispettore1", "isp123", "ISPETTORE")]:
            r = requests.post(f"{API}/auth/login", json={"username": u, "password": p})
            assert r.status_code == 200 and r.json()["user"]["role"] == role
            assert "password_hash" not in r.json()["user"]

    def test_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "x"})
        assert r.status_code == 401

    def test_me_and_unauth(self, giu):
        assert requests.get(f"{API}/auth/me", headers=giu).json()["username"] == "giudice1"
        assert requests.get(f"{API}/auth/me").status_code == 401
        assert requests.get(f"{API}/users", headers=giu).status_code == 403


# --- public
class TestPublic:
    def test_gare_list(self, gare):
        assert len(gare) >= 10
        assert gare[SURF]["settori_preview"] == "A10 B10 C TECNICO 4"
        assert gare[ANIENE]["n_iscritti"] == 32
        assert "_id" not in gare[SURF]

    def test_classifica_docs_specie(self, gare):
        c = requests.get(f"{API}/gare/{gare[SURF]['id']}/classifica").json()["classifica"]
        assert c["surf"] is True and len(c["settori"]) == 3
        for r in c["individui"]:
            for x in r["catture"]:
                assert x["stato"] == "APPROVATA"
        assert len(requests.get(f"{API}/documenti").json()) >= 1
        assert any(s["name"] == "Spigola" for s in requests.get(f"{API}/specie").json())


# --- ispettore -> giudice validation flow
class TestValidationFlow:
    def test_isp_live_only_own_sector(self, isp1):
        d = requests.get(f"{API}/ispettore/live", headers=isp1).json()
        assert d["settore"] == "A" and d["gara"]["nome"] == SURF
        assert len(d["iscritti"]) == 10 and all(i["settore"] == "A" for i in d["iscritti"])
        assert all(c["settore"] == "A" for c in d["catture"])

    def test_isp_cannot_send_other_sector(self, isp1, giu, gare):
        gid = gare[SURF]["id"]
        isc = requests.get(f"{API}/gare/{gid}/iscritti", headers=giu).json()
        b = next(i for i in isc if i["settore"] == "B")
        r = requests.post(f"{API}/gare/{gid}/catture", headers=isp1, json={"iscritto_id": b["id"], "specie": "Spigola", "cm": 38})
        assert r.status_code == 403

    def test_send_approve_reject_correct(self, isp1, giu, gare):
        gid = gare[SURF]["id"]
        d = requests.get(f"{API}/ispettore/live", headers=isp1).json()
        iid = d["iscritti"][0]["id"]
        ids = []
        for cm in (38, 30, 27):
            r = requests.post(f"{API}/gare/{gid}/catture", headers=isp1, json={"iscritto_id": iid, "specie": "Spigola", "cm": cm, "peso": 0.5})
            assert r.status_code == 200 and r.json()["stato"] == "IN_ATTESA"
            ids.append(r.json()["id"])
        live = requests.get(f"{API}/gare/{gid}/live", headers=giu).json()
        assert all(any(c["id"] == x for c in live["catture"]) for x in ids)
        before = next(r for r in requests.get(f"{API}/gare/{gid}/classifica").json()["classifica"]["individui"] if r["id"] == iid)
        assert requests.put(f"{API}/catture/{ids[0]}", headers=giu, json={"azione": "approva"}).status_code == 200
        assert requests.put(f"{API}/catture/{ids[1]}", headers=giu, json={"azione": "rigetta"}).status_code == 400
        assert requests.put(f"{API}/catture/{ids[1]}", headers=giu, json={"azione": "rigetta", "motivo": "TEST_foto sfocata"}).status_code == 200
        assert requests.put(f"{API}/catture/{ids[2]}", headers=giu, json={"azione": "correggi", "cm": 26.5}).status_code == 200
        after = next(r for r in requests.get(f"{API}/gare/{gid}/classifica").json()["classifica"]["individui"] if r["id"] == iid)
        assert after["n_pesci"] == before["n_pesci"] + 2
        mine = {c["id"]: c for c in after["catture"]}
        assert mine[ids[0]]["punti"] == 106.0  # (38-25+1)*1.5+35+50
        assert mine[ids[2]]["cm"] == 26.5
        assert ids[1] not in mine
        h = {c["id"]: c for c in requests.get(f"{API}/ispettore/live", headers=isp1).json()["catture"]}
        assert h[ids[1]]["stato"] == "RIGETTATA" and h[ids[1]]["motivo"] == "TEST_foto sfocata"
        # cleanup
        for x in ids:
            requests.delete(f"{API}/catture/{x}", headers=giu)


# --- chat
class TestChat:
    def test_chat_targeting(self, giu, isp1, isp2, gare):
        gid = gare[SURF]["id"]
        requests.post(f"{API}/gare/{gid}/messaggi", headers=giu, json={"testo": "TEST_tutti", "a": "ALL"})
        requests.post(f"{API}/gare/{gid}/messaggi", headers=giu, json={"testo": "TEST_solo1", "a": "ispettore1"})
        r = requests.post(f"{API}/gare/{gid}/messaggi", headers=isp1, json={"testo": "TEST_reply1"})
        assert r.status_code == 200 and r.json()["a"] == "GIUDICE"
        m1 = [m["testo"] for m in requests.get(f"{API}/ispettore/live", headers=isp1).json()["messaggi"]]
        m2 = [m["testo"] for m in requests.get(f"{API}/ispettore/live", headers=isp2).json()["messaggi"]]
        assert "TEST_tutti" in m1 and "TEST_solo1" in m1
        assert "TEST_tutti" in m2 and "TEST_solo1" not in m2 and "TEST_reply1" not in m2
        mg = [m["testo"] for m in requests.get(f"{API}/gare/{gid}/live", headers=giu).json()["messaggi"]]
        assert "TEST_reply1" in mg


# --- admin CRUD + sorteggio + chiudi on TEST gara
class TestAdminAndDraw:
    def test_access_control(self, giu, gare):
        r = requests.get(f"{API}/gare/{gare['Trout Area Lazio Open']['id']}/iscritti", headers=giu)
        assert r.status_code == 403

    def test_gara_crud_draw_close(self, adm, giu):
        me = requests.get(f"{API}/auth/me", headers=giu).json()
        g = requests.post(f"{API}/gare", headers=adm, json={"nome": "TEST_Gara", "data": "2026-06-01", "luogo": "X", "specialita": "Surf Casting", "giudice_id": me["id"]}).json()
        gid = g["id"]
        try:
            upd = {**{k: g[k] for k in ("nome", "data", "luogo", "specialita", "tipo", "zone", "max_iscritti", "stato", "giudice_id")}, "nome": "TEST_Gara2"}
            assert requests.put(f"{API}/gare/{gid}", headers=adm, json=upd).json()["nome"] == "TEST_Gara2"
            # sorteggio Individuale 32
            requests.post(f"{API}/gare/{gid}/iscritti", headers=giu, json=[{"nome": f"N{i}", "cognome": "C", "societa": f"S{i%5}"} for i in range(32)])
            r = requests.post(f"{API}/gare/{gid}/sorteggio", headers=giu)
            assert r.status_code == 200 and r.json()["settori_label"] == "A10 B10 C10 D TECNICO 2"
            # Box 4
            requests.patch(f"{API}/gare/{gid}", headers=giu, json={"tipo": "Box 4"})
            requests.post(f"{API}/gare/{gid}/iscritti/demo", headers=giu)
            assert requests.post(f"{API}/gare/{gid}/sorteggio", headers=giu).json()["settori_label"] == "A10 B10 C TECNICO 4"
            isc = requests.get(f"{API}/gare/{gid}/iscritti", headers=giu).json()
            grp = defaultdict(list)
            for i in isc: grp[i["gruppo"]].append(i)
            box_split = [k for k, m in grp.items() if len({x["settore"] for x in m}) > 1]
            for k, m in grp.items():
                if k in box_split: continue
                p = sorted(x["picchetto"] for x in m)
                assert p == list(range(p[0], p[0] + len(p))), f"Box {k} not contiguous {p}"
                assert len({x["colore"] for x in m}) == 1 and m[0]["colore"]
            # Squadre 4
            requests.patch(f"{API}/gare/{gid}", headers=giu, json={"tipo": "Squadre 4"})
            requests.post(f"{API}/gare/{gid}/iscritti/demo", headers=giu)
            requests.post(f"{API}/gare/{gid}/sorteggio", headers=giu)
            isc = requests.get(f"{API}/gare/{gid}/iscritti", headers=giu).json()
            grp = defaultdict(list)
            for i in isc: grp[i["gruppo"]].append(i["settore"])
            dup = {k: v for k, v in grp.items() if max(Counter(v).values()) > 2}
            assert not dup, f"Squadre members heavily clustered: {dup}"
            # Coppie 2
            requests.patch(f"{API}/gare/{gid}", headers=giu, json={"tipo": "Coppie 2"})
            requests.post(f"{API}/gare/{gid}/iscritti/demo", headers=giu)
            requests.post(f"{API}/gare/{gid}/sorteggio", headers=giu)
            isc = requests.get(f"{API}/gare/{gid}/iscritti", headers=giu).json()
            grp = defaultdict(list)
            for i in isc: grp[i["gruppo"]].append(i)
            assert all(len({x["settore"] for x in m}) == 1 for m in grp.values())
            # delete iscritto
            n = len(isc)
            assert requests.delete(f"{API}/gare/{gid}/iscritti/{isc[0]['id']}", headers=giu).status_code == 200
            assert len(requests.get(f"{API}/gare/{gid}/iscritti", headers=giu).json()) == n - 1
            # chiudi
            isc = requests.get(f"{API}/gare/{gid}/iscritti", headers=giu).json()
            assert requests.post(f"{API}/gare/{gid}/catture", headers=giu, json={"iscritto_id": isc[0]["id"], "specie": "Spigola", "cm": 30}).status_code == 200
            assert requests.post(f"{API}/gare/{gid}/chiudi", headers=giu).status_code == 200
            assert requests.get(f"{API}/gare/{gid}").json()["stato"] == "Conclusa"
            r = requests.post(f"{API}/gare/{gid}/catture", headers=giu, json={"iscritto_id": isc[0]["id"], "specie": "Spigola", "cm": 30})
            assert r.status_code == 400 and r.json()["detail"] == "Gara conclusa"
            assert not box_split, f"Box groups split across sectors: {box_split}"
        finally:
            assert requests.delete(f"{API}/gare/{gid}", headers=adm).status_code == 200
        assert requests.get(f"{API}/gare/{gid}").status_code == 404

    def test_user_crud(self, adm, gare):
        gid = gare[ANIENE]["id"]
        r = requests.post(f"{API}/users", headers=adm, json={"username": "TEST_isp9", "password": "pw123", "role": "ISPETTORE", "gara_id": gid, "settore": "B"})
        assert r.status_code == 200
        uid = r.json()["id"]
        assert requests.post(f"{API}/users", headers=adm, json={"username": "test_isp9", "password": "x", "role": "ISPETTORE"}).status_code == 400
        h = login("test_isp9", "pw123")
        # admin-created ispettore has no gara until invited (invite flow)
        d = requests.get(f"{API}/ispettore/live", headers=h).json()
        assert d["gara"] is None
        requests.put(f"{API}/users/{uid}", headers=adm, json={"username": "test_isp9", "role": "ISPETTORE", "nome": "Nuovo", "gara_id": gid, "settore": "C"})
        assert any(u["id"] == uid and u["nome"] == "Nuovo" for u in requests.get(f"{API}/users", headers=adm).json())
        assert requests.delete(f"{API}/users/{uid}", headers=adm).status_code == 200

    def test_doc_and_specie(self, adm):
        d = requests.post(f"{API}/documenti", headers=adm, json={"titolo": "TEST_Doc", "anno": 2026, "specialita": "Feeder", "url": "https://x.it"}).json()
        requests.put(f"{API}/documenti/{d['id']}", headers=adm, json={"titolo": "TEST_Doc2", "anno": 2025, "specialita": "Feeder", "url": "https://x.it"})
        assert any(x["titolo"] == "TEST_Doc2" for x in requests.get(f"{API}/documenti").json())
        requests.delete(f"{API}/documenti/{d['id']}", headers=adm)
        assert not any(x["id"] == d["id"] for x in requests.get(f"{API}/documenti").json())
        sp = next(s for s in requests.get(f"{API}/specie").json() if s["name"] == "Aguglia")
        assert requests.put(f"{API}/specie/Aguglia", headers=adm, json={"min": sp["min"], "coef": sp["coef"], "base": 99}).status_code == 200
        assert next(s for s in requests.get(f"{API}/specie").json() if s["name"] == "Aguglia")["base"] == 99
        requests.put(f"{API}/specie/Aguglia", headers=adm, json={"min": sp["min"], "coef": sp["coef"], "base": sp["base"]})
