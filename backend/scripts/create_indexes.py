import asyncio

from db import db


async def main():
    await db.carts.create_index('user_id', unique=True, name='idx_carts_user_id')
    await db.orders.create_index('user_id', name='idx_orders_user_id')
    print('Indexes created successfully.')


if __name__ == '__main__':
    asyncio.run(main())
