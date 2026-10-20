import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
import sys  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from pgdb import db as pg, TABLES  # noqa: E402


async def main():
    mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    for t in TABLES:
        docs = await mongo[t].find({}, {"_id": 0}).to_list(100000)
        if docs:
            await pg[t].insert_many(docs)
        print(t, len(docs), "->", await pg[t].count_documents({}))

asyncio.run(main())
