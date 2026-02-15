import asyncio

from pymongo.errors import OperationFailure

from db import db


async def ensure_index(collection, field: str, *, unique: bool, name: str):
    indexes = await collection.index_information()

    for _, meta in indexes.items():
        if meta.get('key') == [(field, 1)]:
            print(f"Index already present on {field}; skipping create.")
            return

    try:
        await collection.create_index(field, unique=unique, name=name)
        print(f"Created index: {name}")
    except OperationFailure as exc:
        if exc.code == 85:
            print(f"Equivalent index for {field} already exists with different name; skipping.")
            return
        raise


async def main():
    await ensure_index(db.carts, 'user_id', unique=True, name='idx_carts_user_id')
    await ensure_index(db.orders, 'user_id', unique=False, name='idx_orders_user_id')
    print('Index setup completed.')


if __name__ == '__main__':
    asyncio.run(main())
