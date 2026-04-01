"""add barcode_value to product variants

Revision ID: 20260401_0002
Revises: 20260321_0001
Create Date: 2026-04-01 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260401_0002"
down_revision: Union[str, Sequence[str], None] = "20260321_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "product_variants",
        sa.Column("barcode_value", sa.String(length=13), nullable=True),
    )
    op.create_index(
        "ix_product_variants_barcode_value",
        "product_variants",
        ["barcode_value"],
        unique=True,
    )
    op.create_unique_constraint(
        "uq_product_variants_barcode_value",
        "product_variants",
        ["barcode_value"],
    )

    # Backfill: derive barcode_value from existing SKU when it's 12-digit numeric.
    # We do not attempt to coerce non-numeric SKUs; those must be updated manually before enforcing non-null.
    op.execute(
        """
        UPDATE product_variants
        SET barcode_value = sku
        WHERE barcode_value IS NULL
          AND sku ~ '^[0-9]{13}$'
        """
    )

    op.execute(
        """
        UPDATE product_variants
        SET barcode_value = sku || (
            (10 - (
                (
                    (
                        (substring(sku,1,1)::int) +
                        (substring(sku,3,1)::int) +
                        (substring(sku,5,1)::int) +
                        (substring(sku,7,1)::int) +
                        (substring(sku,9,1)::int) +
                        (substring(sku,11,1)::int)
                    ) + 3 * (
                        (substring(sku,2,1)::int) +
                        (substring(sku,4,1)::int) +
                        (substring(sku,6,1)::int) +
                        (substring(sku,8,1)::int) +
                        (substring(sku,10,1)::int) +
                        (substring(sku,12,1)::int)
                    )
                ) % 10
            )) % 10
        )::text
        WHERE barcode_value IS NULL
          AND sku ~ '^[0-9]{12}$'
        """
    )

    # Fallback for legacy/demo SKUs (non-numeric): derive a stable 12-digit base from hashtext(sku),
    # then append a valid EAN-13 check digit.
    op.execute(
        """
        UPDATE product_variants
        SET barcode_value = base12 || (
            (10 - (
                (
                    (
                        (substring(base12,1,1)::int) +
                        (substring(base12,3,1)::int) +
                        (substring(base12,5,1)::int) +
                        (substring(base12,7,1)::int) +
                        (substring(base12,9,1)::int) +
                        (substring(base12,11,1)::int)
                    ) + 3 * (
                        (substring(base12,2,1)::int) +
                        (substring(base12,4,1)::int) +
                        (substring(base12,6,1)::int) +
                        (substring(base12,8,1)::int) +
                        (substring(base12,10,1)::int) +
                        (substring(base12,12,1)::int)
                    )
                ) % 10
            )) % 10
        )::text
        FROM (
            SELECT
              id,
              lpad(((abs(hashtext(sku)) % 1000000000000))::text, 12, '0') AS base12
            FROM product_variants
            WHERE barcode_value IS NULL
        ) AS t
        WHERE product_variants.id = t.id
        """
    )

    op.alter_column("product_variants", "barcode_value", existing_type=sa.String(length=13), nullable=False)


def downgrade() -> None:
    op.drop_constraint("uq_product_variants_barcode_value", "product_variants", type_="unique")
    op.drop_index("ix_product_variants_barcode_value", table_name="product_variants")
    op.drop_column("product_variants", "barcode_value")

