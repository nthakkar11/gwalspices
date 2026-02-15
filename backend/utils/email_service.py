import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)
SHOP_NAME = os.getenv("SHOP_NAME", "GWAL SPICES")
SHOP_URL = os.getenv("SHOP_URL", "https://gwal.com")

class EmailService:
    """Email service for sending transactional emails"""
    
    @staticmethod
    def send_email(to_email: str, subject: str, html_content: str) -> bool:
        """Send email using SMTP"""
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.warning("SMTP credentials not configured. Email not sent.")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{SHOP_NAME} <{FROM_EMAIL}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Attach HTML content
            msg.attach(MIMEText(html_content, 'html'))
            
            # Send email
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

# ============================================
# ORDER CONFIRMATION EMAIL
# ============================================
def send_order_confirmation(to_email: str, order_number: str, order_details: Dict[str, Any]) -> bool:
    """Send order confirmation email"""
    
    subject = f"Order Confirmed - {order_number} - {SHOP_NAME}"
    
    # Format items HTML
    items_html = ""
    for item in order_details.get("items", []):
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: 600;">{item['product_name']}</div>
                <div style="font-size: 12px; color: #6b7280;">Size: {item.get('variant_size', '')}</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item['quantity']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹{item['price']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹{item['total']}</td>
        </tr>
        """
    
    # Format address HTML
    address = order_details.get("shipping_address", {})
    address_html = f"""
    {address.get('name', '')}<br>
    {address.get('address_line1', '')}<br>
    {f"{address.get('address_line2', '')}<br>" if address.get('address_line2') else ''}
    {address.get('city', '')}, {address.get('state', '')} - {address.get('pincode', '')}<br>
    Phone: {address.get('phone', '')}
    """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f3f4f6;
            }}
            .container {{
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #D97706, #EA580C);
                padding: 30px 20px;
                text-align: center;
            }}
            .header h1 {{
                color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }}
            .header p {{
                color: rgba(255, 255, 255, 0.9);
                margin: 10px 0 0;
                font-size: 16px;
            }}
            .content {{
                padding: 30px 20px;
            }}
            .order-status {{
                background-color: #fef3c7;
                border-left: 4px solid #D97706;
                padding: 15px;
                margin-bottom: 25px;
                border-radius: 8px;
            }}
            .order-status h3 {{
                margin: 0 0 5px;
                color: #92400e;
                font-size: 18px;
            }}
            .order-status p {{
                margin: 0;
                color: #b45309;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }}
            th {{
                background-color: #f9fafb;
                padding: 12px 10px;
                text-align: left;
                font-size: 14px;
                color: #374151;
                border-bottom: 2px solid #e5e7eb;
            }}
            .summary {{
                background-color: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            .summary-row {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }}
            .total {{
                border-top: 2px solid #e5e7eb;
                padding-top: 10px;
                margin-top: 10px;
                font-weight: 700;
                font-size: 18px;
                color: #D97706;
            }}
            .address-box {{
                background-color: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                background: linear-gradient(135deg, #D97706, #EA580C);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                padding: 20px;
                background-color: #f9fafb;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✨ {SHOP_NAME} ✨</h1>
                <p>Order Confirmation</p>
            </div>
            
            <div class="content">
                <div class="order-status">
                    <h3>✅ Order Confirmed!</h3>
                    <p>Order #{order_number}</p>
                    <p style="font-size: 14px; margin-top: 5px;">Thank you for your purchase!</p>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                    Dear {address.get('name', 'Customer')},
                </p>
                
                <p>Your order has been successfully placed and is being processed. We'll notify you once it ships.</p>
                
                <h3 style="margin-top: 30px;">📋 Order Summary</h3>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Price</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <div class="summary">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>₹{order_details.get('subtotal', 0):.2f}</span>
                    </div>
                    <div class="summary-row">
                        <span>Shipping:</span>
                        <span>{'FREE' if order_details.get('shipping_fee', 0) == 0 else f'₹{order_details["shipping_fee"]:.2f}'}</span>
                    </div>
                    {f'''
                    <div class="summary-row" style="color: #059669;">
                        <span>Coupon Discount ({order_details.get('coupon_code', '')}):</span>
                        <span>-₹{order_details.get('discount', 0):.2f}</span>
                    </div>
                    ''' if order_details.get('discount', 0) > 0 else ''}
                    <div class="summary-row total">
                        <span>Total Paid:</span>
                        <span>₹{order_details.get('total', 0):.2f}</span>
                    </div>
                </div>
                
                <h3 style="margin-top: 30px;">🚚 Shipping Address</h3>
                <div class="address-box">
                    {address_html}
                </div>
                
                <div style="text-align: center;">
                    <a href="{SHOP_URL}/account/orders" class="button">Track Your Order</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #4b5563;">
                    Need help? Contact us at support@gwal.com or call +91 98765 43210
                </p>
            </div>
            
            <div class="footer">
                <p>© 2026 {SHOP_NAME}. All rights reserved.</p>
                <p style="margin-top: 5px;">
                    <a href="{SHOP_URL}" style="color: #D97706; text-decoration: none;">Visit Store</a> • 
                    <a href="{SHOP_URL}/privacy" style="color: #D97706; text-decoration: none;">Privacy Policy</a> • 
                    <a href="{SHOP_URL}/terms" style="color: #D97706; text-decoration: none;">Terms of Service</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return EmailService.send_email(to_email, subject, html_content)


# ============================================
# ORDER STATUS UPDATE EMAIL
# ============================================
def send_order_status_update(
    to_email: str, 
    order_number: str, 
    status: str, 
    tracking_info: Optional[Dict[str, Any]] = None
) -> bool:
    """Send order status update email"""
    
    # Status emoji and message mapping
    status_config = {
        "pending_payment": {
            "emoji": "⏳",
            "title": "Order Placed",
            "message": "Your order has been placed and is awaiting payment confirmation.",
            "color": "#D97706"
        },
        "processing": {
            "emoji": "⚙️",
            "title": "Order Processing",
            "message": "Your payment is confirmed! We're preparing your order for shipment.",
            "color": "#3B82F6"
        },
        "shipped": {
            "emoji": "📦",
            "title": "Order Shipped",
            "message": "Your order has been shipped and is on its way to you!",
            "color": "#8B5CF6"
        },
        "out_for_delivery": {
            "emoji": "🚚",
            "title": "Out for Delivery",
            "message": "Your order is out for delivery and will arrive today!",
            "color": "#059669"
        },
        "delivered": {
            "emoji": "✅",
            "title": "Order Delivered",
            "message": "Your order has been delivered. Thank you for shopping with us!",
            "color": "#059669"
        },
        "cancelled": {
            "emoji": "❌",
            "title": "Order Cancelled",
            "message": "Your order has been cancelled as requested.",
            "color": "#DC2626"
        }
    }
    
    config = status_config.get(status, {
        "emoji": "📋",
        "title": "Order Updated",
        "message": "Your order status has been updated.",
        "color": "#6B7280"
    })
    
    subject = f"{config['emoji']} Order {config['title']} - {order_number} - {SHOP_NAME}"
    
    # Tracking info HTML
    tracking_html = ""
    if tracking_info and tracking_info.get("tracking_number"):
        tracking_html = f"""
        <div style="background: linear-gradient(135deg, #fef3c7, #ffedd5); padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #fed7aa;">
            <h3 style="margin: 0 0 15px; color: #92400e; display: flex; align-items: center; gap: 8px;">
                🚚 Tracking Information
            </h3>
            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                <div>
                    <div style="font-size: 12px; color: #b45309;">Courier Partner</div>
                    <div style="font-weight: 600; color: #92400e;">{tracking_info.get('courier_name', 'Standard Shipping')}</div>
                </div>
                <div>
                    <div style="font-size: 12px; color: #b45309;">Tracking Number</div>
                    <div style="font-weight: 600; color: #92400e; font-family: monospace;">{tracking_info['tracking_number']}</div>
                </div>
                {f'''
                <div>
                    <div style="font-size: 12px; color: #b45309;">Estimated Delivery</div>
                    <div style="font-weight: 600; color: #92400e;">{tracking_info['estimated_delivery']}</div>
                </div>
                ''' if tracking_info.get('estimated_delivery') else ''}
            </div>
            <div style="margin-top: 15px;">
                <a href="{tracking_info.get('tracking_url', '#')}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #D97706; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                    📍 Track Package
                </a>
            </div>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f3f4f6;
            }}
            .container {{
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #D97706, #EA580C);
                padding: 30px 20px;
                text-align: center;
            }}
            .header h1 {{
                color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }}
            .header p {{
                color: rgba(255, 255, 255, 0.9);
                margin: 10px 0 0;
                font-size: 16px;
            }}
            .content {{
                padding: 30px 20px;
            }}
            .status-badge {{
                background-color: {config['color']}10;
                border: 2px solid {config['color']};
                color: {config['color']};
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                margin-bottom: 25px;
            }}
            .status-badge h2 {{
                margin: 10px 0 5px;
                color: {config['color']};
                font-size: 24px;
            }}
            .status-badge p {{
                margin: 0;
                color: {config['color']};
                opacity: 0.9;
            }}
            .order-info {{
                background-color: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                background: linear-gradient(135deg, #D97706, #EA580C);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                padding: 20px;
                background-color: #f9fafb;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
            }}
            .tracking-timeline {{
                margin: 30px 0;
            }}
            .timeline-item {{
                display: flex;
                gap: 15px;
                padding: 15px 0;
                border-bottom: 1px solid #e5e7eb;
            }}
            .timeline-dot {{
                width: 12px;
                height: 12px;
                background-color: {config['color']};
                border-radius: 50%;
                margin-top: 6px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✨ {SHOP_NAME} ✨</h1>
                <p>Order Status Update</p>
            </div>
            
            <div class="content">
                <div class="status-badge">
                    <div style="font-size: 48px;">{config['emoji']}</div>
                    <h2>{config['title']}</h2>
                    <p>{config['message']}</p>
                </div>
                
                <div class="order-info">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 12px; color: #6b7280;">Order Number</div>
                            <div style="font-size: 18px; font-weight: 700; color: #374151;">{order_number}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; color: #6b7280;">Status</div>
                            <div style="font-size: 16px; font-weight: 600; color: {config['color']};">{config['title']}</div>
                        </div>
                    </div>
                </div>
                
                {tracking_html}
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{SHOP_URL}/track-order?order={order_number}" class="button">
                        Track Your Order
                    </a>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #4b5563; text-align: center;">
                    Thank you for shopping with {SHOP_NAME}!<br>
                    Need help? Contact us at support@gwal.com or call +91 98765 43210
                </p>
            </div>
            
            <div class="footer">
                <p>© 2026 {SHOP_NAME}. All rights reserved.</p>
                <p style="margin-top: 5px;">
                    <a href="{SHOP_URL}" style="color: #D97706; text-decoration: none;">Visit Store</a> • 
                    <a href="{SHOP_URL}/privacy" style="color: #D97706; text-decoration: none;">Privacy Policy</a> • 
                    <a href="{SHOP_URL}/terms" style="color: #D97706; text-decoration: none;">Terms of Service</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return EmailService.send_email(to_email, subject, html_content)


# ============================================
# ADMIN ORDER NOTIFICATION
# ============================================
def send_admin_order_notification(order_details: Dict[str, Any]) -> bool:
    """Send notification to admin about new order"""
    
    admin_email = os.getenv("ADMIN_EMAIL", "admin@gwal.com")
    subject = f"🆕 New Order Received - {order_details.get('order_number', '')}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
            .container {{ max-width: 600px; margin: 20px auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #D97706, #EA580C); color: white; padding: 20px; text-align: center; border-radius: 12px 12px 0 0; }}
            .content {{ padding: 20px; background: #f9fafb; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #D97706; color: white; text-decoration: none; border-radius: 6px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🆕 New Order!</h1>
            </div>
            <div class="content">
                <h2>Order #{order_details.get('order_number', '')}</h2>
                <p><strong>Customer:</strong> {order_details.get('user_name', '')}</p>
                <p><strong>Email:</strong> {order_details.get('user_email', '')}</p>
                <p><strong>Total:</strong> ₹{order_details.get('total', 0):.2f}</p>
                <p><strong>Payment Method:</strong> {order_details.get('payment_method', 'Razorpay')}</p>
                
                <div style="margin-top: 30px;">
                    <a href="{SHOP_URL}/admin/orders/{order_details.get('id', '')}" class="button">
                        View Order in Admin Panel
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    return EmailService.send_email(admin_email, subject, html_content)


# ============================================
# TEST EMAIL FUNCTION
# ============================================
def send_test_email(to_email: str) -> bool:
    """Send test email to verify SMTP configuration"""
    
    subject = f"✅ Test Email - {SHOP_NAME} Email Service"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #D97706;">✅ Email Service is Working!</h1>
            <p>Your SMTP configuration is correct.</p>
            <p>You can now send transactional emails from {SHOP_NAME}.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </body>
    </html>
    """
    
    return EmailService.send_email(to_email, subject, html_content)