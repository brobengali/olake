---
title: Iceberg catalogs and writers
url: https://olake.io/docs/writers/iceberg/catalog/glue/
source: docs
topics: [catalogs]
---

OLake Go Iceberg writers store Parquet data files plus Iceberg metadata in object storage, and register tables in a catalog.

Supported catalogs (core README and docs): AWS Glue, Hive Metastore, JDBC, REST including Nessie, Polaris, Unity, Lakekeeper, AWS S3 Tables.

Writer docs index:

- Glue: https://olake.io/docs/writers/iceberg/catalog/glue
- REST: https://olake.io/docs/writers/iceberg/catalog/rest
- JDBC: https://olake.io/docs/writers/iceberg/catalog/jdbc
- Hive: https://olake.io/docs/writers/iceberg/catalog/hive
- Azure ADLS Gen2: https://olake.io/docs/writers/iceberg/azure
- GCS: https://olake.io/docs/writers/iceberg/gcp/
- MinIO local: https://olake.io/docs/writers/iceberg/troubleshooting-local/
- Parquet (non-Iceberg): https://olake.io/docs/writers/parquet/config/

## AWS Glue

Data in S3; metadata in Glue. Create the S3 bucket in the same region as Glue. IAM needs Glue + S3 access. Example bucket: s3://olake-iceberg/

## REST catalog

Needs object store (S3/MinIO), a metadata database (typically PostgreSQL with a dedicated DB/user), and a REST catalog service (Nessie, Polaris, Unity, Lakekeeper, generic Iceberg REST). Configure REST endpoint URL and auth.

## JDBC catalog

Metadata in PostgreSQL or MySQL via JDBC; data in object storage. Catalog user needs CREATE TABLE, INSERT, UPDATE, DELETE, SELECT so OLake can create iceberg_tables, iceberg_namespace_properties, and related metadata tables. Apache Iceberg JDBC catalog docs are the upstream reference for DB-specific permissions.

## Hive Metastore

Thrift URI to HMS. Data still lives in object storage.

## Parquet destination

Writes Parquet to S3/GCS/filesystem without Iceberg table metadata. Use when you want files, not a catalog table.

## Two-phase commit

Iceberg destination tracks per-chunk commit status in destination state for full refresh, incremental, and CDC (MongoDB, PostgreSQL, MySQL, MSSQL) to reduce duplicates and partial writes.

## Upsert delete formats

Equality deletes (default; no index DB), positional deletes, deletion vectors (Iceberg v3). Kafka upsert is positional deletes only. Index DB env vars required for positional deletes / deletion vectors (see Docker Compose docs).
