from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import smtplib
from email.message import EmailMessage
import os

router = APIRouter(prefix="/contact", tags=["Contact"])

# -------- ENV VARS REQUIRED --------
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=samridhenterprise24@gmail.com
# EMAIL_PASSWORD=APP_PASSWORD

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    message: str

@router.post("")
async def send_contact_email(payload: ContactRequest):
    try:
        msg = EmailMessage()
        msg["Subject"] = f"New Contact Message from {payload.name}"
        msg["From"] = payload.email
        msg["To"] = os.getenv("EMAIL_USER")

        msg.set_content(f"""
Name: {payload.name}
Email: {payload.email}
Phone: {payload.phone or 'N/A'}

Message:
{payload.message}
        """)

        server = smtplib.SMTP(os.getenv("EMAIL_HOST"), int(os.getenv("EMAIL_PORT")))
        server.starttls()
        server.login(
            os.getenv("EMAIL_USER"),
            os.getenv("EMAIL_PASSWORD")
        )
        server.send_message(msg)
        server.quit()

        return {"message": "Email sent successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send email")
