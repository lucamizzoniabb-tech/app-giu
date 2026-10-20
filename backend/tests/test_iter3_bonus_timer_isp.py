# Iteration 3: Surf bonus/preda tecnica, timer, ispettore misure flow, public prede - ONLY on newly created TEST_ gare
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}, r.json()["user"]


@pytest.fixture(scope="module")
def adm():
    return login("mizzxbox@hotmail.it", "rosalba")[0]


@pytest.fixture(scope="module")
def giu():
    return login("giudice1", "giudice123")[0]


@pytest.fixture(scope="module")
def spigola():
    return next(s for s in requests.get(f"{API}/specie").json() if s["name"] == "Spigola")


@pytest.fixture(scope="module")
def gara(giu, adm):
    r = requests.post(f"{API}/gare", headers=giu, json={"nome": "TEST_iter3_api", "data": "2026-04-01", "luogo": "TEST", "specialita": "Surf Casting",
                                                       "bonus_pesce": 50, "preda_tecnica": 10, "durata_min": 60})
    assert r.status_code == 200, r.text
    g = r.json()
    assert requests.post(f"{API}/gare/{g['id']}/iscritti/demo", headers=giu).status_code == 200
    s = requests.post(f"{API}/gare/{g['id']}/sorteggio", headers=giu)
    assert s.status_code == 200, s.text
    yield s.json()
    requests.delete(f"{API}/gare/{g['id']}", headers=giu)


@pytest.fixture(scope="module")
def isp(adm, giu, gara):
    uname = f"test_isp_{uuid.uuid4().hex[:6]}"
    assert requests.post(f"{API}/auth/register", json={"username": uname, "password": "test1234", "nome": "TEST Isp"}).status_code == 200
    u = next(x for x in requests.get(f"{API}/users", headers=adm).json() if x["username"] == uname)
    a = requests.post(f"{API}/users/{u['id']}/approva", headers=adm, json={})
    assert a.status_code == 200, a.text
    h, _ = login(uname, "test1234")
    inv = requests.post(f"{API}/gare/{gara['id']}/inviti", headers=giu, json={"ispettore_id": u["id"], "settore": "A"})
    assert inv.status_code == 200, inv.text
    acc = requests.post(f"{API}/inviti/{inv.json()['id']}/accetta", headers=h)
    assert acc.status_code == 200, acc.text
    yield h
    requests.delete(f"{API}/users/{u['id']}", headers=adm)


def iscritti(giu, gid, settore):
    return sorted([i for i in requests.get(f"{API}/gare/{gid}/iscritti", headers=giu).json() if i.get("settore") == settore], key=lambda i: i["picchetto"])


def row(gid, iid):
    cls = requests.get(f"{API}/gare/{gid}/classifica").json()["classifica"]
    return next(r for r in cls["individui"] if r["id"] == iid)


class TestBonusPreda:
    def test_created_fields(self, gara):
        d = requests.get(f"{API}/gare/{gara['id']}").json()
        assert (d["bonus_pesce"], d["preda_tecnica"], d["durata_min"]) == (50, 10, 60)

    def test_points(self, giu, gara, spigola):
        i = iscritti(giu, gara["id"], "A")[0]
        for cm in (30, 9):
            r = requests.post(f"{API}/gare/{gara['id']}/catture", headers=giu, json={"iscritto_id": i["id"], "specie": "Spigola", "cm": cm})
            assert r.status_code == 200 and r.json()["stato"] == "APPROVATA"
        rw = row(gara["id"], i["id"])
        pts = sorted(c["punti"] for c in rw["catture"])
        assert pts == [10, spigola["punti"][23] + 50], pts
        assert rw["tot"] == spigola["punti"][23] + 60

    def test_patch_bonus_updates(self, giu, gara, spigola):
        assert requests.patch(f"{API}/gare/{gara['id']}", headers=giu, json={"bonus_pesce": 20, "preda_tecnica": 5}).status_code == 200
        i = iscritti(giu, gara["id"], "A")[0]
        assert row(gara["id"], i["id"])["tot"] == spigola["punti"][23] + 25

    def test_negative_bonus_rejected(self, giu, gara):
        r = requests.patch(f"{API}/gare/{gara['id']}", headers=giu, json={"bonus_pesce": -5})
        r2 = requests.patch(f"{API}/gare/{gara['id']}", headers=giu, json={"durata_min": -5})
        requests.patch(f"{API}/gare/{gara['id']}", headers=giu, json={"bonus_pesce": 20, "durata_min": 60})  # restore
        assert r.status_code in (400, 422), f"negative bonus accepted: {r.status_code}"
        assert r2.status_code in (400, 422), f"negative durata accepted: {r2.status_code}"


class TestTimer:
    def test_lifecycle(self, giu, gara):
        gid = gara["id"]
        t = requests.post(f"{API}/gare/{gid}/timer", headers=giu, json={"azione": "start"}).json()
        assert t["stato"] == "IN_CORSO" and t["durata_ms"] == 60 * 60000
        time.sleep(1.2)
        assert requests.post(f"{API}/gare/{gid}/timer", headers=giu, json={"azione": "pausa"}).json()["stato"] == "PAUSA"
        time.sleep(1.0)
        t = requests.post(f"{API}/gare/{gid}/timer", headers=giu, json={"azione": "riprendi"}).json()
        assert t["stato"] == "IN_CORSO" and t["pausa_ms"] >= 900
        assert requests.post(f"{API}/gare/{gid}/timer", headers=giu, json={"azione": "pausa"}).status_code == 200
        bad = requests.post(f"{API}/gare/{gid}/timer", headers=giu, json={"azione": "pausa"})
        assert bad.status_code == 400
        assert requests.post(f"{API}/gare/{gid}/timer", headers=giu, json={"azione": "stop"}).json()["stato"] == "TERMINATO"
        pub = requests.get(f"{API}/gare/{gid}").json()
        assert pub["timer"]["stato"] == "TERMINATO" and "server_now" in pub
        assert requests.post(f"{API}/gare/{gid}/timer", headers=giu, json={"azione": "reset"}).json()["stato"] == "FERMO"

    def test_patch_durata_while_running(self, giu, gara):
        gid = gara["id"]
        requests.post(f"{API}/gare/{gid}/timer", headers=giu, json={"azione": "start"})
        requests.patch(f"{API}/gare/{gid}", headers=giu, json={"durata_min": 90})
        assert requests.get(f"{API}/gare/{gid}").json()["timer"]["durata_ms"] == 90 * 60000
        requests.post(f"{API}/gare/{gid}/timer", headers=giu, json={"azione": "reset"})

    def test_unauth_timer(self, gara):
        assert requests.post(f"{API}/gare/{gara['id']}/timer", json={"azione": "start"}).status_code in (401, 403)


class TestIspettoreFlow:
    def test_isp_timer_forbidden(self, isp, gara):
        assert requests.post(f"{API}/gare/{gara['id']}/timer", headers=isp, json={"azione": "start"}).status_code == 403

    def test_isp_live(self, isp, gara):
        d = requests.get(f"{API}/ispettore/live", headers=isp).json()
        assert d["gara"]["id"] == gara["id"] and d["settore"] == "A"
        assert d["iscritti"] and all(i["settore"] == "A" for i in d["iscritti"])
        assert "server_now" in d["gara"] and d["gara"]["bonus_pesce"] == 20

    def test_isp_submit_pending_then_approve(self, isp, giu, gara, spigola):
        i = iscritti(giu, gara["id"], "A")[1]
        r = requests.post(f"{API}/gare/{gara['id']}/catture", headers=isp, json={"iscritto_id": i["id"], "specie": "Spigola", "cm": 30})
        assert r.status_code == 200 and r.json()["stato"] == "IN_ATTESA"
        assert row(gara["id"], i["id"])["n_pesci"] == 0  # not public before approval
        assert requests.put(f"{API}/catture/{r.json()['id']}", headers=giu, json={"azione": "approva"}).status_code == 200
        rw = row(gara["id"], i["id"])
        assert rw["n_pesci"] == 1 and rw["tot"] == spigola["punti"][23] + 20

    def test_isp_other_settore_forbidden(self, isp, giu, gara):
        b = iscritti(giu, gara["id"], "B")
        r = requests.post(f"{API}/gare/{gara['id']}/catture", headers=isp, json={"iscritto_id": b[0]["id"], "specie": "Spigola", "cm": 30})
        assert r.status_code == 403
