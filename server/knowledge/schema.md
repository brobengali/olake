---
title: Schema evolution and data types
url: https://olake.io/docs/features/schema/
source: docs
topics: [catalogs, troubleshooting]
---

Source: https://olake.io/docs/features/schema/

OLake Go discovers schema at the start of every sync.

## Columns

- Add: new Iceberg field-ID; historical rows NULL until backfill. A sparse column is not synced until at least one non-NULL value (Parquet column-oriented). New columns sync automatically only if “Sync new columns automatically” is enabled; otherwise select them in the UI.
- Delete: destination column remains for old snapshots; new rows null-filled.
- Rename: treated as old column stays (no new values) + new column receives data. WIP: update name on the same Iceberg field ID.
- JSON keys: add/remove appear in flattened JSON; rename is remove+add.

## Tables

- Add: appears in UI; you must enable the stream.
- Delete source table: destination keeps history, no new data.
- Rename table: treated as a new stream. Old Iceberg table keeps history. Recreating a table with the same name but different structure should be treated as a new stream to avoid field-ID collisions.

## Type promotions (Iceberg v2 widening)

INT → LONG, FLOAT → DOUBLE, DATE → TIMESTAMP/TIMESTAMP_NS, DECIMAL(P,S) → DECIMAL(P',S) with P' > P. INT into FLOAT/DOUBLE and BIGINT into DOUBLE are treated as safe numeric writes.

Narrowing BIGINT→INT or DOUBLE→FLOAT: OLake validates values fit the destination range rather than blindly rewriting files. Iceberg v2 does not support arbitrary narrowing as a schema change.

Parquet (non-Iceberg) widening order: BOOLEAN → INT64 → FLOAT64 → STRING.

Numeric types can be stored as STRING. Unsupported: FLOAT into INT; STRING into numeric Iceberg columns; STRING into FLOAT64/INT64/BOOLEAN on Parquet. Those fail the sync.

Dead Letter Queue columns for other incompatible values are coming soon.

Parquet files are immutable; existing files are not rewritten in place for type changes.

External reference: Apache Iceberg schema evolution documentation.
