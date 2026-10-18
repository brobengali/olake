---
title: What is OLake Go
url: https://olake.io/docs
source: docs
topics: [overview, capabilities, destinations]
---

OLake Go is a high-performance, open-source EL (Extract–Load) platform that bridges operational databases and open lakehouse storage — writing Apache Iceberg tables or Parquet files on Amazon S3, enabling organizations to replicate data at scale with minimal overhead. Supporting Incremental Sync, Change Data Capture (CDC), and stateful, resumable syncs, OLake Go ensures your tables remain fresh, organized, and optimized for analytics.

It is written as a Go ingestion engine. It does not require Spark, Flink, Kafka, or Debezium for CDC from supported databases. A web UI and CLI are available. Docs: https://olake.io/docs . Core repo: https://github.com/datazip-inc/olake

## Destinations

OLake Go writes data to open lakehouse storage:

- Parquet files on object storage such as Amazon S3, MinIO, and Google Cloud Storage
- Apache Iceberg tables with catalogs: AWS Glue Data Catalog, Apache Hive Metastore, REST catalogs (Nessie, Polaris, Unity Catalog, Lakekeeper, AWS S3 Tables), and JDBC catalogs

## Capabilities

1. Parallelised Chunking — splits large datasets into virtual chunks processed in parallel. Used in Full Refresh, Full Refresh + CDC, and Full Refresh + Incremental. Does not alter source data.

2. Stateful, Resumable Syncs — resume from last checkpoint after crashes, network failures, or pauses. Applies to Full Refresh + CDC, Full Refresh + Incremental, and Strict CDC.

3. Configurable Max Connections — each job sets its own maximum source database connections. The limit is per job, not shared across jobs even if they use the same source.

4. Data Deduplication — in Upsert mode, unique records are stored using the source primary key plus olake_id. For Kafka, deduplication uses dedup keys configured in the streams section, not source primary keys.

5. Hive Style Partitioning — Iceberg partitioning is metadata-driven (pruning and schema evolution). S3-style partitioning uses folders such as year=2025/month=08/day=22/. Normalization expands level-1 nested JSON into top-level columns.

6. Schema Evolution & Data Type Changes — OLake Go handles table schema changes without breaking downstream jobs. See https://olake.io/docs/features/schema/

7. Dead Letter Queue Columns (Coming soon) — will isolate values whose type changes Iceberg/Parquet cannot promote, so syncs do not fail.

8. Two Phase Commit — for Iceberg during full refresh, incremental, and CDC (MongoDB, PostgreSQL, MySQL, MSSQL). Per-chunk commit status is tracked via destination state to avoid inconsistent or duplicate writes.

9. Query Engine Interoperability — in Upsert mode OLake Go can write equality deletes, positional deletes, or Iceberg v3 deletion vectors. Configure the delete format in job or stream settings. Kafka Upsert uses positional deletes only. Engines include Spark, Trino, Databricks, Snowflake, and Athena.

Benchmarks published by OLake (see https://olake.io/docs/benchmarks): Postgres full load about 580K RPS; MySQL full load about 140K RPS; CDC rates are lower and source-specific. Treat these as vendor-published figures, not independent audits.

Roadmap notes from the GitHub README: Iceberg V3 support and some interoperability items are marked coming soon. Oracle CDC is listed as WIP in the source matrix on GitHub while the docs overview table shows Oracle without CDC.
