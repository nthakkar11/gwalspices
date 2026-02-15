import requests
import time
import os

SHIPROCKET_EMAIL = os.getenv("SHIPROCKET_EMAIL")
SHIPROCKET_PASSWORD = os.getenv("SHIPROCKET_PASSWORD")
BASE_URL = os.getenv("SHIPROCKET_BASE_URL")

_token = None
_token_expiry = 0


def get_shiprocket_token():
    global _token, _token_expiry

    if _token and time.time() < _token_expiry:
        return _token

    res = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": SHIPROCKET_EMAIL,
            "password": SHIPROCKET_PASSWORD,
        },
        timeout=10,
    )

    res.raise_for_status()
    data = res.json()

    _token = data["token"]
    _token_expiry = time.time() + (23 * 60 * 60)  # 23 hours

    return _token


def check_pincode_serviceability(pincode: str):
    token = get_shiprocket_token()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    res = requests.get(
        f"{BASE_URL}/courier/serviceability/",
        params={
            "pickup_postcode": "500080",  # your warehouse pincode
            "delivery_postcode": pincode,
            "weight": 0.5,
            "cod": 1,
        },
        headers=headers,
        timeout=10,
    )

    res.raise_for_status()
    return res.json()
