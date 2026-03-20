"""init schema

Revision ID: 20260321_0001
Revises:
Create Date: 2026-03-21 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260321_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


payment_method_enum = postgresql.ENUM(
    "CASH",
    "UPI",
    "CARD",
    name="payment_method_enum",
    create_type=False,
)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("clerk_user_id", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=True)

    op.create_table(
        "stores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_stores_owner_id", "stores", ["owner_id"], unique=False)

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_products_store_id", "products", ["store_id"], unique=False)
    op.create_index("ix_products_store_category", "products", ["store_id", "category"], unique=False)

    op.create_table(
        "product_variants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("size", sa.String(length=50), nullable=False),
        sa.Column("color", sa.String(length=50), nullable=False),
        sa.Column("sku", sa.String(length=100), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("sku", name="uq_product_variants_sku"),
    )
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"], unique=False)
    op.create_index("ix_product_variants_sku", "product_variants", ["sku"], unique=True)
    op.create_index(
        "ix_product_variants_product_color_size",
        "product_variants",
        ["product_id", "color", "size"],
        unique=False,
    )

    payment_method_enum.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount", sa.Numeric(12, 2), nullable=False),
        sa.Column("final_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_method", payment_method_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_orders_store_id", "orders", ["store_id"], unique=False)
    op.create_index("ix_orders_store_created_at", "orders", ["store_id", "created_at"], unique=False)

    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_variant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_variant_id"], ["product_variants.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"], unique=False)
    op.create_index("ix_order_items_product_variant_id", "order_items", ["product_variant_id"], unique=False)
    op.create_index(
        "ix_order_items_order_variant",
        "order_items",
        ["order_id", "product_variant_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_order_items_order_variant", table_name="order_items")
    op.drop_index("ix_order_items_product_variant_id", table_name="order_items")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")

    op.drop_index("ix_orders_store_created_at", table_name="orders")
    op.drop_index("ix_orders_store_id", table_name="orders")
    op.drop_table("orders")
    payment_method_enum.drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_product_variants_product_color_size", table_name="product_variants")
    op.drop_index("ix_product_variants_sku", table_name="product_variants")
    op.drop_index("ix_product_variants_product_id", table_name="product_variants")
    op.drop_table("product_variants")

    op.drop_index("ix_products_store_category", table_name="products")
    op.drop_index("ix_products_store_id", table_name="products")
    op.drop_table("products")

    op.drop_index("ix_stores_owner_id", table_name="stores")
    op.drop_table("stores")

    op.drop_index("ix_users_clerk_user_id", table_name="users")
    op.drop_table("users")
