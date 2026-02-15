from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from utils.gokwik_client import verify_gokwik_payment

router = APIRouter(prefix='/payment', tags=['Payment'])


async def get_db():
    from db import db
    return db


@router.post('/webhook')
async def payment_webhook(
    request: Request,
    x_token: str = Header(default=''),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    payload = await request.json()
    if not verify_gokwik_payment(payload, x_token):
        raise HTTPException(status_code=401, detail='Invalid webhook signature')

    order_id = payload.get('merchant_order_id')
    payment_status = str(payload.get('payment_status', '')).lower()

    order = await db.orders.find_one({'id': order_id}, {'_id': 0})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')

    if payment_status == 'success':
        update = {'payment_status': 'SUCCESS', 'order_status': 'PLACED'}
    elif payment_status == 'failed':
        update = {'payment_status': 'FAILED', 'order_status': 'CREATED'}
    else:
        update = {'payment_status': 'PENDING'}

    update['updated_at'] = datetime.now(timezone.utc).isoformat()
    update['gokwik_order_id'] = payload.get('order_id') or order.get('gokwik_order_id')

    await db.orders.update_one({'id': order_id}, {'$set': update})
    return {'success': True, 'order_id': order_id, 'payment_status': update['payment_status']}
