import asyncio
import uuid
from decimal import Decimal

from sqlalchemy import delete, select

from app.db.session import SessionLocal
from app.models.order import Order, OrderItem
from app.models.product import Product, ProductVariant
from app.models.store import Store


def ean13_check_digit(base12: str) -> str:
    digits = [int(c) for c in base12]
    odd_sum = sum(digits[::2])
    even_sum = sum(digits[1::2])
    total = odd_sum + (even_sum * 3)
    check = (10 - (total % 10)) % 10
    return str(check)


def barcode_from_sku(sku: str) -> str:
    s = sku.strip()
    if not s.isdigit() or len(s) != 12:
        raise ValueError("SKU must be 12 digits (numeric) for this seed script")
    return f"{s}{ean13_check_digit(s)}"


def make_sku(prefix12: int, offset: int) -> str:
    return str(prefix12 + offset).zfill(12)


async def seed(store_id: uuid.UUID) -> None:
    async with SessionLocal() as session:
        store = await session.scalar(select(Store).where(Store.id == store_id))
        if not store:
            raise SystemExit(f"Store not found: {store_id}")

        # Clear existing store data (orders first, then products/variants).
        await session.execute(delete(OrderItem).where(OrderItem.order_id.in_(select(Order.id).where(Order.store_id == store_id))))
        await session.execute(delete(Order).where(Order.store_id == store_id))
        await session.execute(
            delete(ProductVariant).where(
                ProductVariant.product_id.in_(select(Product.id).where(Product.store_id == store_id))
            )
        )
        await session.execute(delete(Product).where(Product.store_id == store_id))
        await session.commit()

        # Seed products with meaningful variants (sizes/colors) + realistic prices.
        # SKUs are 12-digit numeric (EAN-13 barcode_value is derived).
        sku_base = 910550000000  # arbitrary 12-digit base; offsets keep uniqueness
        i = 0

        def pv(size: str, color: str, price: str, stock: int) -> ProductVariant:
            nonlocal i
            sku = make_sku(sku_base, i)
            i += 1
            return ProductVariant(
                size=size,
                color=color,
                sku=sku,
                barcode_value=barcode_from_sku(sku),
                price=Decimal(price),
                stock_quantity=stock,
            )

        products: list[Product] = []

        tshirt = Product(store_id=store_id, name="Basic Cotton T‑Shirt", category="Tops")
        tshirt.variants.extend(
            [
                pv("S", "Black", "399.00", 40),
                pv("M", "Black", "399.00", 45),
                pv("L", "Black", "399.00", 35),
                pv("M", "White", "399.00", 30),
            ]
        )
        products.append(tshirt)

        jeans = Product(store_id=store_id, name="Slim Fit Jeans", category="Bottomwear")
        jeans.variants.extend(
            [
                pv("30", "Blue", "1299.00", 18),
                pv("32", "Blue", "1299.00", 22),
                pv("34", "Black", "1399.00", 15),
            ]
        )
        products.append(jeans)

        kurta = Product(store_id=store_id, name="Festive Kurta", category="Ethnic")
        kurta.variants.extend(
            [
                pv("M", "Navy", "999.00", 16),
                pv("L", "Navy", "999.00", 14),
                pv("XL", "Maroon", "1099.00", 10),
            ]
        )
        products.append(kurta)

        saree = Product(store_id=store_id, name="Silk Saree", category="Ethnic")
        saree.variants.extend(
            [
                pv("Free", "Red", "2499.00", 8),
                pv("Free", "Green", "2499.00", 7),
            ]
        )
        products.append(saree)

        dress = Product(store_id=store_id, name="Summer Midi Dress", category="Dresses")
        dress.variants.extend(
            [
                pv("S", "Floral", "1599.00", 12),
                pv("M", "Floral", "1599.00", 10),
                pv("L", "Solid", "1499.00", 9),
            ]
        )
        products.append(dress)

        session.add_all(products)
        await session.commit()

        print(f"Seeded store_id={store_id} with {len(products)} products and {i} variants")


if __name__ == "__main__":
    # Usage: python scripts/seed_store_inventory.py <store_id>
    import sys

    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/seed_store_inventory.py <store_id>")
    asyncio.run(seed(uuid.UUID(sys.argv[1])))

