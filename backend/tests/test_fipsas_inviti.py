# FIPSAS - registration/approval, inviti, integer surf points, PDF upload, validation rules
import os
import uuid
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
def adm(): return login("admin", "admin123")
@pytest.fixture(scope="module")
def giu(): return login("giudice1", "giudice123")
@pytest.fixture(scope="module")
def isp1(): return login("ispettore1", "isp123")
@pytest.fixture(scope="module")
def surf():
    return next(g for g in requests.get(f"{API}/gare").json() if g["nome"] == SURF)


# --- registration + approval + invite flow
class TestRegistrationInvite:
    def test_full_flow(self, adm, giu, surf):
        uname = f"test_reg_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/auth/register", json={"username": uname, "password": "pass123", "nome": "TEST Reg"})
        assert r.status_code == 200
        assert requests.post(f"{API}/auth/register", json={"username": uname, "password": "pass123", "nome": "x"}).status_code == 400
        assert requests.post(f"{API}/auth/register", json={"username": "ab", "password": "1", "nome": "x"}).status_code == 400
        r = requests.post(f"{API}/auth/login", json={"username": uname, "password": "pass123"})
        assert r.status_code == 403 and "attesa" in r.json()["detail"]
        u = next(x for x in requests.get(f"{API}/users", headers=adm).json() if x["username"] == uname)
        assert u["approvato"] is False and u["role"] == "ISPETTORE"
        # pending not listed in giudice ispettori + cannot be invited
        assert not any(x["id"] == u["id"] for x in requests.get(f"{API}/ispettori", headers=giu).json())
        assert requests.post(f"{API}/gare/{surf['id']}/inviti", headers=giu, json={"ispettore_id": u["id"], "settore": "B"}).status_code == 400
        try:
            assert requests.post(f"{API}/users/{u['id']}/approva", headers=adm, json={"approvato": True}).status_code == 200
            h = login(uname, "pass123")
            d = requests.get(f"{API}/ispettore/live", headers=h).json()
            assert d["gara"] is None and d["inviti"] == []
            inv = requests.post(f"{API}/gare/{surf['id']}/inviti", headers=giu, json={"ispettore_id": u["id"], "settore": "B"})
            assert inv.status_code == 200
            inv = inv.json()
            assert requests.post(f"{API}/gare/{surf['id']}/inviti", headers=giu, json={"ispettore_id": u["id"], "settore": "B"}).status_code == 400
            d = requests.get(f"{API}/ispettore/live", headers=h).json()
            assert len(d["inviti"]) == 1 and d["inviti"][0]["settore"] == "B"
            assert requests.post(f"{API}/inviti/{inv['id']}/accetta", headers=h).status_code == 200
            d = requests.get(f"{API}/ispettore/live", headers=h).json()
            assert d["gara"]["id"] == surf["id"] and d["settore"] == "B"
            assert d["iscritti"] and all(i["settore"] == "B" for i in d["iscritti"])
            # chat ispettore -> giudice
            assert requests.post(f"{API}/gare/{surf['id']}/messaggi", headers=h, json={"testo": "TEST_ciao"}).status_code == 200
            live = requests.get(f"{API}/gare/{surf['id']}/live", headers=giu).json()
            assert any(m["testo"] == "TEST_ciao" for m in live["messaggi"])
            assert any(x["id"] == u["id"] for x in live["ispettori"])
            # revoke -> loses gara
            assert requests.delete(f"{API}/inviti/{inv['id']}", headers=giu).status_code == 200
            assert requests.get(f"{API}/ispettore/live", headers=h).json()["gara"] is None
        finally:
            requests.delete(f"{API}/users/{u['id']}", headers=adm)

    def test_pending_seed_user_blocked(self):
        r = requests.post(f"{API}/auth/login", json={"username": "nuovoisp", "password": "isp12345"})
        assert r.status_code in (403, 200)  # 200 only if approved by a previous run
        if r.status_code == 403:
            assert "attesa" in r.json()["detail"]


# --- validation + integer points on surf
class TestSurfValidation:
    def test_measure_flow_integer_points(self, isp1, giu, surf):
        d = requests.get(f"{API}/ispettore/live", headers=isp1).json()
        assert d["settore"] == "A"
        iid = d["iscritti"][0]["id"]
        c1 = requests.post(f"{API}/gare/{surf['id']}/catture", headers=isp1, json={"iscritto_id": iid, "specie": "Spigola", "cm": 38.7}).json()
        c2 = requests.post(f"{API}/gare/{surf['id']}/catture", headers=isp1, json={"iscritto_id": iid, "specie": "Spigola", "cm": 41}).json()
        assert c1["stato"] == "IN_ATTESA"
        try:
            r = requests.put(f"{API}/catture/{c2['id']}", headers=giu, json={"azione": "rigetta", "motivo": "  "})
            assert r.status_code == 400
            assert requests.put(f"{API}/catture/{c1['id']}", headers=giu, json={"azione": "approva"}).status_code == 200
            assert requests.put(f"{API}/catture/{c2['id']}", headers=giu, json={"azione": "correggi", "specie": "Spigola", "cm": 39.3}).status_code == 200
            cl = requests.get(f"{API}/gare/{surf['id']}/classifica").json()["classifica"]
            for r_ in cl["individui"]:
                assert float(r_["tot"]).is_integer(), r_
                for c in r_["catture"]:
                    assert isinstance(c["punti"], int), c
            # surf with peso -> must not produce decimals
            c3 = requests.post(f"{API}/gare/{surf['id']}/catture", headers=giu, json={"iscritto_id": iid, "specie": "Spigola", "cm": 40, "peso": 1.37}).json()
            cl = requests.get(f"{API}/gare/{surf['id']}/classifica").json()["classifica"]
            row = next(x for x in cl["individui"] if x["id"] == iid)
            requests.delete(f"{API}/catture/{c3['id']}", headers=giu)
            assert float(row["tot"]).is_integer(), f"Surf tot not integer when peso provided: {row['tot']}"
        finally:
            for c in (c1, c2):
                requests.delete(f"{API}/catture/{c['id']}", headers=giu)


# --- PDF upload / public download
class TestDocsUpload:
    def test_upload_download(self, adm):
        pdf = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
        r = requests.post(f"{API}/documenti/upload", headers=adm, files={"file": ("test.pdf", pdf, "application/pdf")},
                          data={"titolo": "TEST_Upload", "anno": 2026, "specialita": "Surf Casting"})
        assert r.status_code == 200, r.text
        did = r.json()["id"]
        try:
            f = requests.get(f"{API}/documenti/{did}/file")
            assert f.status_code == 200 and f.content == pdf and f.headers["content-type"].startswith("application/pdf")
            assert requests.post(f"{API}/documenti/upload", headers=adm, files={"file": ("x.txt", b"x", "text/plain")},
                                 data={"titolo": "T", "anno": 2026, "specialita": "X"}).status_code == 400
            assert requests.post(f"{API}/documenti/upload", files={"file": ("t.pdf", pdf, "application/pdf")},
                                 data={"titolo": "T", "anno": 2026, "specialita": "X"}).status_code == 401
        finally:
            requests.delete(f"{API}/documenti/{did}", headers=adm)
        assert requests.get(f"{API}/documenti/{did}/file").status_code == 404


# --- access control
class TestAccess:
    def test_isp_cannot_judge(self, isp1, surf):
        assert requests.get(f"{API}/gare/{surf['id']}/live", headers=isp1).status_code == 403
        assert requests.get(f"{API}/users", headers=isp1).status_code == 403
        assert requests.post(f"{API}/gare/{surf['id']}/inviti", headers=isp1, json={"ispettore_id": "x", "settore": "A"}).status_code == 403
