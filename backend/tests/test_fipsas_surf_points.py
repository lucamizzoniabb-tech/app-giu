# FIPSAS - specie lookup table, surf integer points (table index cm-7), sotto misura, giudice own gara lifecycle + chiudi
import os
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
def isp1(): return login("ispettore1", "isp123")
@pytest.fixture(scope="module")
def specie(): return {s["name"]: s for s in requests.get(f"{API}/specie").json()}
@pytest.fixture(scope="module")
def surf(): return next(g for g in requests.get(f"{API}/gare").json() if g["nome"] == SURF)


# --- public home ordering & demo gara
class TestPublic:
    def test_gare_list_and_demo(self, surf):
        gare = requests.get(f"{API}/gare").json()
        assert len(gare) >= 8
        assert surf["settori_preview"] == "A10 B10 C TECNICO 4"
        assert surf["n_iscritti"] == 24

    def test_classifica_structure(self, surf):
        cl = requests.get(f"{API}/gare/{surf['id']}/classifica").json()["classifica"]
        assert cl["surf"] is True
        lets = [s["lettera"] for s in cl["settori"]]
        assert lets == ["A", "B", "C"]
        assert next(s for s in cl["settori"] if s["lettera"] == "C")["tecnico"] is True
        assert "societa" in cl and "assoluta" in cl


# --- specie table
class TestSpecie:
    def test_52_species_77_values(self, specie):
        assert len(specie) == 52
        for s in specie.values():
            assert len(s["punti"]) == 77, s["name"]
            assert all(isinstance(x, int) for x in s["punti"])

    def test_put_specie_validation(self, adm):
        assert requests.put(f"{API}/specie/Spigola", headers=adm, json={"punti": [1, 2]}).status_code == 400
        assert requests.put(f"{API}/specie/Spigola", json={"punti": [0] * 77}).status_code == 401


# --- surf points equal table values
class TestSurfPoints:
    def test_points_match_table(self, isp1, giu, surf, specie):
        spig = specie["Spigola"]
        d = requests.get(f"{API}/ispettore/live", headers=isp1).json()
        iid = d["iscritti"][0]["id"]
        made = []
        try:
            for cm in (30, 9):
                r = requests.post(f"{API}/gare/{surf['id']}/catture", headers=isp1, json={"iscritto_id": iid, "specie": "Spigola", "cm": cm})
                assert r.status_code == 200 and r.json()["stato"] == "IN_ATTESA"
                made.append(r.json()["id"])
                assert requests.put(f"{API}/catture/{made[-1]}", headers=giu, json={"azione": "approva"}).status_code == 200
            row = next(x for x in requests.get(f"{API}/gare/{surf['id']}/classifica").json()["classifica"]["individui"] if x["id"] == iid)
            cs = {c["id"]: c for c in row["catture"]}
            assert cs[made[0]]["punti"] == spig["punti"][30 - 7] and spig["punti"][23] > 0
            assert cs[made[1]]["punti"] == 0 and cs[made[1]]["dettaglio"]["sotto"] is True
            assert isinstance(row["tot"], (int, float)) and float(row["tot"]).is_integer()
        finally:
            for c in made:
                requests.delete(f"{API}/catture/{c}", headers=giu)


# --- giudice creates own gara, demo, sorteggio, invite, chiudi
class TestGiudiceGara:
    def test_lifecycle(self, adm, giu, isp1):
        g = requests.post(f"{API}/gare", headers=giu, json={"nome": "TEST_GaraGiudice", "data": "2026-07-01", "luogo": "Sperlonga", "specialita": "Surf Casting"})
        assert g.status_code == 200
        g = g.json()
        gid = g["id"]
        try:
            assert any(x["id"] == gid for x in requests.get(f"{API}/giudice/gare", headers=giu).json())
            assert requests.post(f"{API}/gare/{gid}/iscritti/demo", headers=giu).status_code == 200
            r = requests.post(f"{API}/gare/{gid}/sorteggio", headers=giu)
            assert r.status_code == 200 and r.json()["settori_label"] == "A10 B10 C TECNICO 4" and r.json()["stato"] == "Sorteggiata"
            isc = requests.get(f"{API}/gare/{gid}/iscritti", headers=giu).json()
            assert sorted(i["picchetto"] for i in isc) == list(range(1, 25))
            # ispettore1 not assigned to this gara -> 403
            r = requests.post(f"{API}/gare/{gid}/catture", headers=isp1, json={"iscritto_id": isc[0]["id"], "specie": "Spigola", "cm": 30})
            assert r.status_code == 403
            # judge measure -> auto-approved, gara goes live
            r = requests.post(f"{API}/gare/{gid}/catture", headers=giu, json={"iscritto_id": isc[0]["id"], "specie": "Spigola", "cm": 30})
            assert r.status_code == 200 and r.json()["stato"] == "APPROVATA"
            assert requests.get(f"{API}/gare/{gid}").json()["stato"] == "In Corso Live"
            # chiudi
            assert requests.post(f"{API}/gare/{gid}/chiudi", headers=giu).status_code == 200
            assert requests.get(f"{API}/gare/{gid}").json()["stato"] == "Conclusa"
            r = requests.post(f"{API}/gare/{gid}/catture", headers=giu, json={"iscritto_id": isc[0]["id"], "specie": "Spigola", "cm": 31})
            assert r.status_code == 400 and r.json()["detail"] == "Gara conclusa"
            assert requests.post(f"{API}/gare/{gid}/sorteggio", headers=giu).status_code == 400
        finally:
            assert requests.delete(f"{API}/gare/{gid}", headers=giu).status_code == 200
