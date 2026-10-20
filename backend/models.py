from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def _doc_table(name):
    return type(name.capitalize(), (Base,), {
        "__tablename__": name,
        "id": Column(String(80), primary_key=True),
        "gara_id": Column(String(80), index=True, nullable=True),
        "data": Column(JSONB, nullable=False),
        "created_at": Column(DateTime(timezone=True), server_default=func.now()),
    })


for _t in ["users", "gare", "iscritti", "catture", "messaggi", "documenti", "specie", "inviti", "campionati", "atleti"]:
    globals()[_t.capitalize()] = _doc_table(_t)
