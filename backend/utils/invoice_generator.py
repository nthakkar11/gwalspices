import os
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
import logging
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import qrcode
from io import BytesIO
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "")
)

# ============================================
# INVOICE GENERATOR
# ============================================
class InvoiceGenerator:
    """Professional PDF Invoice Generator"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom styles for invoice"""
        
        # Title style
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#D97706'),
            spaceAfter=20,
            alignment=1  # Center
        ))
        
        # Company name style
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Heading2'],
            fontSize=18,
            textColor=colors.HexColor('#92400E'),
            spaceAfter=6
        ))
        
        # Header style
        self.styles.add(ParagraphStyle(
            name='InvoiceHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#374151'),
            spaceAfter=12
        ))
        
        # Normal text style
        self.styles.add(ParagraphStyle(
            name='InvoiceNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#4B5563'),
            spaceAfter=6
        ))
        
        # Small text style
        self.styles.add(ParagraphStyle(
            name='InvoiceSmall',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#6B7280'),
            spaceAfter=4
        ))
        
        # Total style
        self.styles.add(ParagraphStyle(
            name='InvoiceTotal',
            parent=self.styles['Heading3'],
            fontSize=14,
            textColor=colors.HexColor('#D97706'),
            spaceAfter=6,
            alignment=2  # Right
        ))
    
    def _generate_qr_code(self, order_number: str, payment_id: str) -> Optional[BytesIO]:
        """Generate QR code for invoice verification"""
        try:
            qr_data = f"""
            Invoice: {order_number}
            Payment ID: {payment_id}
            Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            Verify at: https://gwal.com/verify/{order_number}
            """
            
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=3,
                border=2,
            )
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            return buffer
        except Exception as e:
            logger.error(f"QR code generation failed: {str(e)}")
            return None
    
    def _format_currency(self, amount: float) -> str:
        """Format currency in Indian format"""
        return f"₹{amount:,.2f}"
    
    def generate_invoice_pdf(self, order: Dict[str, Any], payment_id: str) -> BytesIO:
        """Generate PDF invoice for order"""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=20*mm
        )
        
        story = []
        
        # ========================================
        # COMPANY HEADER
        # ========================================
        story.append(Paragraph("GWAL SPICES", self.styles['CompanyName']))
        story.append(Paragraph("Premium Indian Spices", self.styles['InvoiceSmall']))
        story.append(Paragraph("123 Spice Market, Jaipur - 302001", self.styles['InvoiceSmall']))
        story.append(Paragraph("GST: 08AABCU9603R1ZM", self.styles['InvoiceSmall']))
        story.append(Paragraph("support@gwal.com | +91 98765 43210", self.styles['InvoiceSmall']))
        story.append(Spacer(1, 10*mm))
        
        # ========================================
        # INVOICE TITLE
        # ========================================
        story.append(Paragraph("TAX INVOICE", self.styles['InvoiceTitle']))
        story.append(Spacer(1, 5*mm))
        
        # ========================================
        # INVOICE DETAILS
        # ========================================
        invoice_data = [
            ["Invoice Number:", f"INV-{order['order_number']}"],
            ["Order Number:", order['order_number']],
            ["Invoice Date:", datetime.now().strftime('%d-%m-%Y %H:%M:%S')],
            ["Order Date:", datetime.fromisoformat(order['created_at']).strftime('%d-%m-%Y %H:%M:%S')],
            ["Payment ID:", payment_id],
            ["Payment Method:", "Razorpay" if order['payment_method'] == 'razorpay' else order['payment_method']],
        ]
        
        invoice_table = Table(invoice_data, colWidths=[80*mm, 100*mm])
        invoice_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(invoice_table)
        story.append(Spacer(1, 10*mm))
        
        # ========================================
        # BILL TO / SHIP TO
        # ========================================
        address = order['shipping_address']
        
        # Create two-column layout
        bill_ship_data = [
            ["BILL TO:", "SHIP TO:"],
            [
                f"{address['name']}\n"
                f"{address['address_line1']}\n"
                f"{address['address_line2'] + '\n' if address.get('address_line2') else ''}"
                f"{address['city']}, {address['state']} - {address['pincode']}\n"
                f"Phone: {address['phone']}",
                f"{address['name']}\n"
                f"{address['address_line1']}\n"
                f"{address['address_line2'] + '\n' if address.get('address_line2') else ''}"
                f"{address['city']}, {address['state']} - {address['pincode']}\n"
                f"Phone: {address['phone']}"
            ]
        ]
        
        bill_ship_table = Table(bill_ship_data, colWidths=[90*mm, 90*mm])
        bill_ship_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#D97706')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(bill_ship_table)
        story.append(Spacer(1, 10*mm))
        
        # ========================================
        # ITEMS TABLE
        # ========================================
        items_data = [["Item", "Size", "Qty", "Unit Price", "Total"]]
        
        for item in order['items']:
            items_data.append([
                item['product_name'],
                item.get('variant_size', ''),
                str(item['quantity']),
                self._format_currency(item['price']),
                self._format_currency(item['price'] * item['quantity'])
            ])
        
        # Add empty row for spacing
        items_data.append(["", "", "", "", ""])
        
        # Add summary rows
        items_data.append(["", "", "", "Subtotal:", self._format_currency(order['subtotal'])])
        
        if order.get('discount', 0) > 0:
            coupon_code = order.get('coupon_applied', {}).get('code', '')
            items_data.append(["", "", "", f"Discount ({coupon_code}):", f"-{self._format_currency(order['discount'])}"])
        
        items_data.append(["", "", "", "Shipping:", 
                          "FREE" if order['shipping_fee'] == 0 else self._format_currency(order['shipping_fee'])])
        items_data.append(["", "", "", "TOTAL:", self._format_currency(order['total'])])
        
        # Create table
        items_table = Table(items_data, colWidths=[60*mm, 30*mm, 20*mm, 30*mm, 30*mm])
        items_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -4), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D97706')),
            ('TEXTCOLOR', (0, -4), (-2, -1), colors.HexColor('#374151')),
            ('TEXTCOLOR', (-1, -4), (-1, -1), colors.HexColor('#D97706')),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -5), 0.5, colors.HexColor('#E5E7EB')),
            ('LINEABOVE', (0, -4), (-1, -4), 1, colors.HexColor('#D1D5DB')),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#D97706')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -5), [colors.white, colors.HexColor('#F9FAFB')]),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 10*mm))
        
        # ========================================
        # AMOUNT IN WORDS
        # ========================================
        amount_in_words = self._number_to_words(int(order['total']))
        story.append(Paragraph(
            f"Amount in words: Rupees {amount_in_words} Only",
            self.styles['InvoiceNormal']
        ))
        story.append(Spacer(1, 5*mm))
        
        # ========================================
        # QR CODE
        # ========================================
        qr_buffer = self._generate_qr_code(order['order_number'], payment_id)
        if qr_buffer:
            qr_img = Image(qr_buffer, width=30*mm, height=30*mm)
            story.append(qr_img)
            story.append(Spacer(1, 5*mm))
            story.append(Paragraph(
                "Scan to verify invoice",
                self.styles['InvoiceSmall']
            ))
        
        # ========================================
        # TERMS & CONDITIONS
        # ========================================
        story.append(Spacer(1, 10*mm))
        story.append(Paragraph(
            "Terms & Conditions:",
            ParagraphStyle(
                'TermsHeader',
                parent=self.styles['Heading4'],
                fontSize=10,
                textColor=colors.HexColor('#374151'),
                spaceAfter=4
            )
        ))
        
        terms = [
            "• This is a computer generated invoice - no signature required",
            "• Goods sold are not returnable due to food safety regulations",
            "• For any queries, contact us within 24 hours of delivery",
            "• This invoice is valid for GST purposes",
            "• Thank you for shopping with GWAL SPICES!"
        ]
        
        for term in terms:
            story.append(Paragraph(term, self.styles['InvoiceSmall']))
        
        # ========================================
        # FOOTER
        # ========================================
        story.append(Spacer(1, 15*mm))
        story.append(Paragraph(
            "✨ Premium Indian Spices - Since 1995 ✨",
            ParagraphStyle(
                'Footer',
                parent=self.styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#9CA3AF'),
                alignment=1,
                spaceAfter=2
            )
        ))
        story.append(Paragraph(
            "www.gwal.com | support@gwal.com",
            self.styles['InvoiceSmall']
        ))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def _number_to_words(self, n: int) -> str:
        """Convert number to words (Indian numbering system)"""
        if n == 0:
            return "Zero"
        
        ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen']
        tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
        
        def _convert_below_thousand(num):
            if num == 0:
                return ''
            elif num < 20:
                return ones[num]
            elif num < 100:
                return tens[num // 10] + (' ' + ones[num % 10] if num % 10 != 0 else '')
            else:
                return ones[num // 100] + ' Hundred' + (' ' + _convert_below_thousand(num % 100) if num % 100 != 0 else '')
        
        # Indian numbering system (lakhs, crores)
        crore = n // 10000000
        n %= 10000000
        lakh = n // 100000
        n %= 100000
        thousand = n // 1000
        n %= 1000
        hundred = n
        
        parts = []
        if crore > 0:
            parts.append(_convert_below_thousand(crore) + ' Crore')
        if lakh > 0:
            parts.append(_convert_below_thousand(lakh) + ' Lakh')
        if thousand > 0:
            parts.append(_convert_below_thousand(thousand) + ' Thousand')
        if hundred > 0:
            parts.append(_convert_below_thousand(hundred))
        
        return ' '.join(parts)


# ============================================
# PUBLIC API FUNCTION
# ============================================
async def generate_invoice(order: Dict[str, Any], payment_id: str) -> Optional[str]:
    """
    Generate invoice PDF and upload to Cloudinary
    
    Args:
        order: Order document from database
        payment_id: Razorpay payment ID
    
    Returns:
        URL of uploaded invoice PDF or None if failed
    """
    
    try:
        logger.info(f"Generating invoice for order: {order['order_number']}")
        
        # Generate PDF
        generator = InvoiceGenerator()
        pdf_buffer = generator.generate_invoice_pdf(order, payment_id)
        
        # Generate filename
        filename = f"invoice_{order['order_number']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        # Upload to Cloudinary
        if cloudinary.config().cloud_name:
            try:
                upload_result = cloudinary.uploader.upload(
                    pdf_buffer,
                    public_id=f"invoices/{order['order_number']}",
                    resource_type="raw",
                    format="pdf",
                    tags=["invoice", order['order_number']],
                    context={
                        "order_number": order['order_number'],
                        "payment_id": payment_id,
                        "customer": order.get('user_name', ''),
                        "amount": str(order['total'])
                    }
                )
                
                invoice_url = upload_result.get('secure_url')
                logger.info(f"Invoice uploaded successfully: {invoice_url}")
                return invoice_url
                
            except Exception as e:
                logger.error(f"Cloudinary upload failed: {str(e)}")
                # Fallback - return None, order will continue without invoice URL
                return None
        else:
            # No Cloudinary configured - return local path for development
            logger.warning("Cloudinary not configured. Invoice not uploaded.")
            return None
            
    except Exception as e:
        logger.error(f"Invoice generation failed: {str(e)}")
        return None


# ============================================
# DEVELOPMENT TESTING FUNCTION
# ============================================
async def test_invoice_generation():
    """Test function to verify invoice generation"""
    
    test_order = {
        "order_number": "GWL240201ABC12345",
        "created_at": datetime.now().isoformat(),
        "payment_method": "razorpay",
        "subtotal": 1590.00,
        "discount": 60.00,
        "shipping_fee": 0,
        "total": 1530.00,
        "coupon_applied": {
            "code": "GWAL10"
        },
        "shipping_address": {
            "name": "John Doe",
            "address_line1": "123 Main Street",
            "address_line2": "Apt 4B",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "phone": "9876543210"
        },
        "items": [
            {
                "product_name": "Red Chilli Powder",
                "variant_size": "100g",
                "quantity": 2,
                "price": 40.00
            },
            {
                "product_name": "Turmeric Powder",
                "variant_size": "100g",
                "quantity": 1,
                "price": 35.00
            }
        ]
    }
    
    url = await generate_invoice(test_order, "pay_test_123456")
    print(f"Invoice URL: {url}")


if __name__ == "__main__":
    # Run test
    import asyncio
    asyncio.run(test_invoice_generation())