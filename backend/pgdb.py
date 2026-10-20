import asyncio
import copy
import json
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

TABLES = ["users", "gare", "iscritti", "catture", "messaggi", "documenti", "specie", "inviti", "campionati", "atleti"]

engine = create_async_engine(
    os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://"),
    pool_size=10, max_overflow=5, pool_timeout=30, pool_recycle=1800, pool_pre_ping=False,
    connect_args={"statement_cache_size": 0, "command_timeout": 30},
)


def _get(doc, key):
    for k in key.split("."):
        if not isinstance(doc, dict) or k not in doc:
            return None, False
        doc = doc[k]
    return doc, True


def match(doc, flt):
    for k, cond in (flt or {}).items():
        if k == "$or":
            if not any(match(doc, f) for f in cond):
                return False
            continue
        val, present = _get(doc, k)
        if isinstance(cond, dict) and any(op.startswith("$") for op in cond):
            for op, arg in cond.items():
                if op == "$ne" and val == arg:
                    return False
                if op == "$in" and val not in arg:
                    return False
                if op == "$nin" and val in arg:
                    return False
                if op == "$exists" and present != bool(arg):
                    return False
        elif val != cond:
            return False
    return True


def _key_id(doc):
    return str(doc.get("id") or doc.get("name"))


def _apply(doc, upd):
    for k, v in upd.get("$set", {}).items():
        d = doc
        parts = k.split(".")
        for p in parts[:-1]:
            d = d.setdefault(p, {})
        d[parts[-1]] = v
    for k, v in upd.get("$push", {}).items():
        doc.setdefault(k, []).append(v)
    for k, v in upd.get("$pull", {}).items():
        doc[k] = [x for x in doc.get(k, []) if not match(x, v)]
    return doc


class Result:
    def __init__(self, n):
        self.matched_count = self.modified_count = self.deleted_count = n


class Cursor:
    def __init__(self, coll, flt):
        self.coll, self.flt, self._sort = coll, flt, []

    def sort(self, key, direction=1):
        self._sort = key if isinstance(key, list) else [(key, direction)]
        return self

    async def to_list(self, n=None):
        docs = await self.coll._fetch(self.flt)
        for key, d in reversed(self._sort):
            docs.sort(key=lambda x: (_get(x, key)[0] is None, _get(x, key)[0] if _get(x, key)[0] is not None else 0), reverse=d < 0)
        return docs[:n] if n else docs

    def __aiter__(self):
        async def gen():
            for d in await self.to_list():
                yield d
        return gen()


class Collection:
    def __init__(self, name):
        self.name = name
        self.cache = None
        self.lock = asyncio.Lock()

    async def load(self):
        async with engine.connect() as c:
            rows = (await c.execute(text(f"SELECT data FROM {self.name}"))).all()
        docs = [r[0] if isinstance(r[0], dict) else json.loads(r[0]) for r in rows]
        self.cache = {_key_id(d): d for d in docs}

    async def _fetch(self, flt):
        if self.cache is None:
            await self.load()
        return [copy.deepcopy(d) for d in self.cache.values() if match(d, flt)]

    async def _upsert(self, conn, doc):
        await conn.execute(text(f"INSERT INTO {self.name} (id, gara_id, data) VALUES (:id, :g, CAST(:d AS jsonb)) "
                                "ON CONFLICT (id) DO UPDATE SET gara_id = EXCLUDED.gara_id, data = EXCLUDED.data"),
                           {"id": _key_id(doc), "g": doc.get("gara_id"), "d": json.dumps(doc, default=str)})

    def find(self, flt=None, projection=None):
        return Cursor(self, flt)

    async def find_one(self, flt=None, projection=None):
        docs = await self._fetch(flt)
        return docs[0] if docs else None

    async def count_documents(self, flt=None):
        return len(await self._fetch(flt))

    async def _write(self, docs):
        async with engine.begin() as c:
            for d in docs:
                d.pop("_id", None)
                await self._upsert(c, d)
        for d in docs:
            self.cache[_key_id(d)] = copy.deepcopy(d)

    async def insert_one(self, doc):
        await self.insert_many([doc])
        return Result(1)

    async def insert_many(self, docs):
        async with self.lock:
            if self.cache is None:
                await self.load()
            await self._write(docs)
        return Result(len(docs))

    async def _update(self, flt, upd, many):
        async with self.lock:
            docs = await self._fetch(flt)
            docs = docs if many else docs[:1]
            if docs:
                await self._write([_apply(d, upd) for d in docs])
        return Result(len(docs))

    async def update_one(self, flt, upd):
        return await self._update(flt, upd, False)

    async def update_many(self, flt, upd):
        return await self._update(flt, upd, True)

    async def _delete(self, flt, many):
        async with self.lock:
            docs = await self._fetch(flt)
            docs = docs if many else docs[:1]
            if docs:
                ids = [_key_id(d) for d in docs]
                async with engine.begin() as c:
                    await c.execute(text(f"DELETE FROM {self.name} WHERE id = ANY(:ids)"), {"ids": ids})
                for i in ids:
                    self.cache.pop(i, None)
        return Result(len(docs))

    async def delete_one(self, flt):
        return await self._delete(flt, False)

    async def delete_many(self, flt):
        return await self._delete(flt, True)

    async def create_index(self, *a, **k):
        return None


class Database:
    def __init__(self):
        for t in TABLES:
            setattr(self, t, Collection(t))

    def __getitem__(self, name):
        return getattr(self, name)


db = Database()


async def refresh_loop(interval=20):
    while True:
        await asyncio.sleep(interval)
        for t in TABLES:
            coll = db[t]
            if coll.lock.locked():
                continue
            try:
                async with coll.lock:
                    await coll.load()
            except Exception:
                pass
