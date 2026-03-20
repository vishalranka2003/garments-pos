import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.product import Product, ProductVariant
from app.models.store import Store


async def seed() -> None:
    async with SessionLocal() as session:
        existing = await session.scalar(select(Store).where(Store.owner_id == "user_seed_demo"))
        if existing:
            print(f"Seed already exists for store: {existing.id}")
            return

        store = Store(name="Demo Garments Store", owner_id="user_seed_demo")
        session.add(store)
        await session.flush()

        tshirt = Product(store_id=store.id, name="Basic T-Shirt", category="Tops")
        jeans = Product(store_id=store.id, name="Slim Fit Jeans", category="Bottomwear")

        tshirt.variants.extend(
            [
                ProductVariant(
                    size="M",
                    color="Black",
                    sku="TSHIRT-BLK-M",
                    price=Decimal("499.00"),
                    stock_quantity=40,
                ),
                ProductVariant(
                    size="L",
                    color="White",
                    sku="TSHIRT-WHT-L",
                    price=Decimal("499.00"),
                    stock_quantity=30,
                ),
            ]
        )
        jeans.variants.extend(
            [
                ProductVariant(
                    size="32",
                    color="Blue",
                    sku="JEANS-BLU-32",
                    price=Decimal("1199.00"),
                    stock_quantity=20,
                ),
                ProductVariant(
                    size="34",
                    color="Black",
                    sku="JEANS-BLK-34",
                    price=Decimal("1299.00"),
                    stock_quantity=15,
                ),
            ]
        )

        session.add_all([tshirt, jeans])
        await session.commit()
        print(f"Seeded store_id={store.id} with 2 products and 4 variants")


if __name__ == "__main__":
    asyncio.run(seed())
