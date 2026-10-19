# FIPSAS iteration 2 extra - validation edge cases, public classifica prede, timer sync fields
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
def giu(): return login("giudice1", "giudice123")


@pytest.fixture(scope="module")
def surf(): return next(g for g in requests.get(f"{API}/gare").json() if g["nome"] == SURF)


# public classifica exposes prede (approved only) across all settori
def test_public_classifica_has_prede(surf):
    cl = requests.get(f"{API}/gare/{surf['id']}/classifica").json()["classifica"]
    assert cl["surf"] is True
    settori = {r["settore"] for r in cl["individui"]}
    assert len(settori) >= 2
    cs = [c for r in cl["individui"] for c in r["catture"]]
    assert cs and all(c["stato"] == "APPROVATA" for c in cs)
    assert all("punti" in c and "dettaglio" in c for c in cs)


# demo gara left in expected state
def test_demo_state(surf):
    d = requests.get(f"{API}/gare/{surf['id']}").json()
    assert (d["bonus_pesce"], d["preda_tecnica"], d["durata_min"]) == (0, 0, 180)
    assert (d.get("timer") or {"stato": "FERMO"})["stato"] == "FERMO"


# negative values validation (expect rejection)
def test_negative_bonus_rejected(giu):
    r = requests.post(f"{API}/gare", json={"nome": "TEST_neg", "data": "2026-03-01", "luogo": "T", "specialita": "Surf Casting", "bonus_pesce": -5, "durata_min": 0}, headers=giu)
    if r.status_code == 200:
        requests.delete(f"{API}/gare/{r.json()['id']}", headers=giu)
    assert r.status_code == 422, f"accepted negative/zero values: {r.status_code}"


def test_patch_durata_zero_rejected(giu):
    g = requests.post(f"{API}/gare", json={"nome": "TEST_neg2", "data": "2026-03-01", "luogo": "T", "specialita": "Surf Casting"}, headers=giu).json()
    try:
        r = requests.patch(f"{API}/gare/{g['id']}", json={"durata_min": 0}, headers=giu)
        assert r.status_code in (400, 422), f"durata_min=0 accepted ({r.status_code})"
    finally:
        requests.delete(f"{API}/gare/{g['id']}", headers=giu)
