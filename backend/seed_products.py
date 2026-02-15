"""
Seed initial products for GWAL Spices
Run: python seed_products.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

load_dotenv()

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

products_data = [
    {
        "name": "Red Chilli Powder",
        "slug": "red-chilli-powder",
        "description": "Premium quality red chilli powder made from sun-dried Kashmiri chillies. Adds vibrant color and moderate heat to your dishes.",
        "category": "powder",
        "image_urls": [
            "https://images.unsplash.com/photo-1599639832411-84093c0c69a9?q=80&w=600",
            "https://images.unsplash.com/photo-1606656921625-5c9f9e54fb38?q=80&w=600"
        ],
        "nutritional_info": "Rich in Vitamin C, capsaicin, and antioxidants",
        "benefits": ["Boosts metabolism", "Aids digestion", "Anti-inflammatory properties"],
        "variants": [
            {"size": "100g", "mrp": 80, "selling_price": 70, "stock": 50, "sku": "GWL-RCP-100"},
            {"size": "250g", "mrp": 180, "selling_price": 160, "stock": 30, "sku": "GWL-RCP-250"},
            {"size": "500g", "mrp": 320, "selling_price": 290, "stock": 20, "sku": "GWL-RCP-500"}
        ]
    },
    {
        "name": "Turmeric Powder",
        "slug": "turmeric-powder",
        "description": "Pure and organic turmeric powder sourced from premium Indian farms. Known for its health benefits and golden color.",
        "category": "powder",
        "image_urls": [
            "https://images.unsplash.com/photo-1615485500834-bc10199bc768?q=80&w=600",
            "https://images.unsplash.com/photo-1674544037006-079e4c8ae387?q=80&w=600"
        ],
        "nutritional_info": "High in curcumin, antioxidants, and anti-inflammatory compounds",
        "benefits": ["Natural antiseptic", "Improves immunity", "Promotes healthy skin"],
        "variants": [
            {"size": "100g", "mrp": 60, "selling_price": 50, "stock": 40, "sku": "GWL-TUR-100"},
            {"size": "250g", "mrp": 140, "selling_price": 120, "stock": 25, "sku": "GWL-TUR-250"},
            {"size": "500g", "mrp": 260, "selling_price": 230, "stock": 15, "sku": "GWL-TUR-500"}
        ]
    },
    {
        "name": "Coriander Powder",
        "slug": "coriander-powder",
        "description": "Freshly ground coriander powder with authentic aroma. Essential for Indian curries and gravies.",
        "category": "powder",
        "image_urls": [
            "https://images.unsplash.com/photo-1596040033229-a0b34e45c43f?q=80&w=600"
        ],
        "nutritional_info": "Contains dietary fiber, iron, and magnesium",
        "benefits": ["Aids digestion", "Controls blood sugar", "Rich in antioxidants"],
        "variants": [
            {"size": "100g", "mrp": 50, "selling_price": 45, "stock": 60, "sku": "GWL-COR-100"},
            {"size": "250g", "mrp": 110, "selling_price": 100, "stock": 35, "sku": "GWL-COR-250"},
            {"size": "500g", "mrp": 220, "selling_price": 200, "stock": 15, "sku": "GWL-COR-500"}
        ]
    },
    {
        "name": "Garam Masala",
        "slug": "garam-masala",
        "description": "Authentic blend of aromatic spices. The secret ingredient to elevate your Indian dishes.",
        "category": "blend",
        "image_urls": [
            "https://images.unsplash.com/photo-1596040033229-a0b34e45c43f?q=80&w=600"
        ],
        "nutritional_info": "Blend of cardamom, cinnamon, cloves, cumin, and black pepper",
        "benefits": ["Enhances flavor", "Digestive aid", "Anti-inflammatory"],
        "variants": [
            {"size": "100g", "mrp": 100, "selling_price": 90, "stock": 35, "sku": "GWL-GM-100"},
            {"size": "250g", "mrp": 230, "selling_price": 210, "stock": 20, "sku": "GWL-GM-250"}
        ]
    },
    {
        "name": "Cumin Powder",
        "slug": "cumin-powder",
        "description": "Aromatic cumin powder perfect for tempering and flavoring. Essential for every Indian kitchen.",
        "category": "powder",
        "image_urls": [
            "https://images.unsplash.com/photo-1599909533803-492dbb0e9aeb?q=80&w=600"
        ],
        "nutritional_info": "Rich in iron, calcium, and antioxidants",
        "benefits": ["Improves digestion", "Boosts immunity", "Aids weight loss"],
        "variants": [
            {"size": "100g", "mrp": 70, "selling_price": 60, "stock": 45, "sku": "GWL-CUM-100"},
            {"size": "250g", "mrp": 160, "selling_price": 145, "stock": 25, "sku": "GWL-CUM-250"}
        ]
    },
    {
        "name": "Black Pepper Powder",
        "slug": "black-pepper-powder",
        "description": "Premium quality black pepper powder with intense aroma and flavor. The king of spices.",
        "category": "powder",
        "image_urls": [
            "https://images.unsplash.com/photo-1593030668969-cb3844ad8e30?q=80&w=600"
        ],
        "nutritional_info": "High in piperine, antioxidants, and vitamins",
        "benefits": ["Enhances nutrient absorption", "Anti-inflammatory", "Aids digestion"],
        "variants": [
            {"size": "100g", "mrp": 120, "selling_price": 110, "stock": 30, "sku": "GWL-BP-100"},
            {"size": "250g", "mrp": 280, "selling_price": 260, "stock": 18, "sku": "GWL-BP-250"}
        ]
    }
]

async def seed_products():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Starting product seeding...")
    
    # Clear existing products and variants
    await db.products.delete_many({})
    await db.variants.delete_many({})
    print("Cleared existing products and variants")
    
    for product_data in products_data:
        product_id = str(uuid.uuid4())
        variants_data = product_data.pop("variants")
        
        product_doc = {
            "id": product_id,
            **product_data,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.products.insert_one(product_doc)
        print(f"✓ Created product: {product_data['name']}")
        
        # Create variants
        for variant_data in variants_data:
            variant_doc = {
                "id": str(uuid.uuid4()),
                "product_id": product_id,
                **variant_data,
                "is_active": True
            }
            await db.variants.insert_one(variant_doc)
            print(f"  ✓ Created variant: {variant_data['size']} - ₹{variant_data['selling_price']}")
    
    print(f"\n✅ Successfully seeded {len(products_data)} products!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_products())
