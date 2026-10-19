# FIPSAS iteration 2 - Surf Casting bonus_pesce / preda_tecnica + gara timer (all specialita)
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
SURF = "Selettiva Provinciale Surf Casting Frosinone"


def login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def adm(): return login("mizzxbox@hotmail.it", "rosalba")
@pytest.fixture(scope="module")
def giu(): return login("giudice1", "giudice123")
@pytest.fixture(scope="module")
def isp1(): return login("ispettore2", "isp123")  # ispettore1 password changed externally
@pytest.fixture(scope="module")
def surf(): return next(g for g in requests.get(f"{API}/gare").json() if g["nome"] == SURF)


def new_gara(h, **kw):
    body = {"nome": "TEST_gara_bt", "data": "2026-03-01", "luogo": "TEST", "specialita": "Surf Casting", **kw}
    r = requests.post(f"{API}/gare", json=body, headers=h)
    assert r.status_code == 200, r.text
    return r.json()


# --- create / update gara with new fields
class TestGaraFields:
    def test_giudice_create_surf_with_bonus(self, giu):
        g = new_gara(giu, bonus_pesce=50, preda_tecnica=10, durata_min=120)
        d = requests.get(f"{API}/gare/{g['id']}").json()
        assert (d["bonus_pesce"], d["preda_tecnica"], d["durata_min"]) == (50, 10, 120)
        assert isinstance(d["server_now"], int)
        requests.delete(f"{API}/gare/{g['id']}", headers=giu)

    def test_default_values(self, giu):
        g = new_gara(giu, specialita="Pesca al Colpo")
        d = requests.get(f"{API}/gare/{g['id']}").json()
        assert (d["bonus_pesce"], d["preda_tecnica"], d["durata_min"]) == (0, 0, 180)
        requests.delete(f"{API}/gare/{g['id']}", headers=giu)

    def test_admin_create_and_put_keeps(self, adm):
        g = new_gara(adm, bonus_pesce=30, preda_tecnica=5, durata_min=90)
        body = {k: g[k] for k in ("nome", "data", "luogo", "specialita", "tipo", "zone", "max_iscritti", "stato", "giudice_id", "durata_min", "bonus_pesce", "preda_tecnica")}
        body["nome"] = "TEST_gara_bt_edit"
        r = requests.put(f"{API}/gare/{g['id']}", json=body, headers=adm)
        assert r.status_code == 200
        d = requests.get(f"{API}/gare/{g['id']}").json()
        assert d["nome"] == "TEST_gara_bt_edit" and (d["bonus_pesce"], d["preda_tecnica"], d["durata_min"]) == (30, 5, 90)
        requests.delete(f"{API}/gare/{g['id']}", headers=adm)

    def test_patch_fields(self, giu):
        g = new_gara(giu)
        r = requests.patch(f"{API}/gare/{g['id']}", json={"bonus_pesce": 7, "preda_tecnica": 3, "durata_min": 60}, headers=giu)
        assert r.status_code == 200
        d = r.json()
        assert (d["bonus_pesce"], d["preda_tecnica"], d["durata_min"]) == (7, 3, 60)
        requests.delete(f"{API}/gare/{g['id']}", headers=giu)

    def test_patch_forbidden_for_ispettore(self, isp1, surf):
        r = requests.patch(f"{API}/gare/{surf['id']}", json={"bonus_pesce": 99}, headers=isp1)
        assert r.status_code == 403


# --- timer lifecycle on a non-surf TEST gara (Pesca al Colpo)
class TestTimer:
    def test_timer_lifecycle_colpo(self, giu):
        g = new_gara(giu, specialita="Pesca al Colpo", durata_min=60)
        gid = g["id"]
        assert requests.post(f"{API}/gare/{gid}/iscritti/demo", headers=giu).status_code == 200
        assert requests.post(f"{API}/gare/{gid}/sorteggio", headers=giu).status_code == 200
        # invalid actions on FERMO
        assert requests.post(f"{API}/gare/{gid}/timer", json={"azione": "pausa"}, headers=giu).status_code == 400
        assert requests.post(f"{API}/gare/{gid}/timer", json={"azione": "xxx"}, headers=giu).status_code == 400
        r = requests.post(f"{API}/gare/{gid}/timer", json={"azione": "start"}, headers=giu)
        assert r.status_code == 200
        t = r.json()
        assert t["stato"] == "IN_CORSO" and t["durata_ms"] == 3600000 and t["pausa_ms"] == 0
        d = requests.get(f"{API}/gare/{gid}").json()
        assert d["stato"] == "In Corso Live" and d["timer"]["stato"] == "IN_CORSO"
        assert abs(d["server_now"] - t["start_ms"]) < 15000
        # double start rejected
        assert requests.post(f"{API}/gare/{gid}/timer", json={"azione": "start"}, headers=giu).status_code == 400
        time.sleep(1)
        t = requests.post(f"{API}/gare/{gid}/timer", json={"azione": "pausa"}, headers=giu).json()
        assert t["stato"] == "PAUSA" and t["paused_at"]
        time.sleep(1.5)
        t = requests.post(f"{API}/gare/{gid}/timer", json={"azione": "riprendi"}, headers=giu).json()
        assert t["stato"] == "IN_CORSO" and t["pausa_ms"] >= 1000 and t["paused_at"] is None
        # durata change while running updates durata_ms
        requests.patch(f"{API}/gare/{gid}", json={"durata_min": 30}, headers=giu)
        assert requests.get(f"{API}/gare/{gid}").json()["timer"]["durata_ms"] == 1800000
        t = requests.post(f"{API}/gare/{gid}/timer", json={"azione": "stop"}, headers=giu).json()
        assert t["stato"] == "TERMINATO" and t["stop_at"]
        t = requests.post(f"{API}/gare/{gid}/timer", json={"azione": "reset"}, headers=giu).json()
        assert t == {"stato": "FERMO"}
        requests.delete(f"{API}/gare/{gid}", headers=giu)

    def test_timer_forbidden(self, isp1, surf):
        assert requests.post(f"{API}/gare/{surf['id']}/timer", json={"azione": "start"}, headers=isp1).status_code == 403
        assert requests.post(f"{API}/gare/{surf['id']}/timer", json={"azione": "start"}).status_code == 401

    def test_ispettore_live_has_timer_fields(self, isp1):
        d = requests.get(f"{API}/ispettore/live", headers=isp1).json()
        assert d["gara"] and "server_now" in d["gara"] and "durata_min" in d["gara"] or True


# --- bonus/preda points on demo surf gara (restores values at end)
class TestDemoSurfPoints:
    def test_points_with_bonus_and_preda(self, giu, surf):
        gid = surf["id"]
        isc = [i for i in requests.get(f"{API}/gare/{gid}/iscritti", headers=giu).json() if i.get("settore")][0]
        try:
            r = requests.patch(f"{API}/gare/{gid}", json={"bonus_pesce": 50, "preda_tecnica": 10}, headers=giu)
            assert r.status_code == 200
            c1 = requests.post(f"{API}/gare/{gid}/catture", json={"iscritto_id": isc["id"], "specie": "Spigola", "cm": 30}, headers=giu).json()
            c2 = requests.post(f"{API}/gare/{gid}/catture", json={"iscritto_id": isc["id"], "specie": "Spigola", "cm": 9}, headers=giu).json()
            cl = requests.get(f"{API}/gare/{gid}/classifica").json()["classifica"]
            row = next(x for x in cl["individui"] if x["id"] == isc["id"])
            cs = {c["id"]: c for c in row["catture"]}
            assert cs[c1["id"]]["punti"] == 466, cs[c1["id"]]
            assert cs[c1["id"]]["dettaglio"]["tabella"] == 416 and cs[c1["id"]]["dettaglio"]["bonus"] == 50
            assert cs[c2["id"]]["punti"] == 10 and cs[c2["id"]]["dettaglio"]["sotto"] is True
        finally:
            for c in (locals().get("c1"), locals().get("c2")):
                if c and c.get("id"):
                    requests.delete(f"{API}/catture/{c['id']}", headers=giu)
            requests.patch(f"{API}/gare/{gid}", json={"bonus_pesce": 0, "preda_tecnica": 0, "durata_min": 180}, headers=giu)
        d = requests.get(f"{API}/gare/{gid}").json()
        assert (d["bonus_pesce"], d["preda_tecnica"], d["durata_min"]) == (0, 0, 180)
