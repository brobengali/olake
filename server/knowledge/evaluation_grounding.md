---
title: OLake Architecture, Concepts, Terminology & Compatibility
url: https://olake.io/docs/
source: docs
topics: [overview, sync, sources, destinations, catalogs, cli, deployment, terminology]
---

## Sources and Destinations

OLake can ingest data from 8 source systems:
1. PostgreSQL
2. MySQL
3. MongoDB
4. Oracle Database
5. MSSQL (SQL Server)
6. IBM DB2
7. Apache Kafka
8. Amazon S3

OLake writes data to two destination formats only:
1. Apache Iceberg tables (through a catalog such as AWS Glue, Hive Metastore, JDBC, or REST catalogs).
2. Parquet files on object storage such as Amazon S3, MinIO, and GCS.
OLake does NOT support Delta Lake, Apache Hudi, Snowflake, or BigQuery as destinations. Cassandra is not supported as a source.

## Sync Modes and Execution

OLake supports four sync modes:
1. Full Refresh — reads the full source table; no cursor/state.
2. Full Refresh + Incremental — initial full load first, then each later run reads only rows whose cursor value is greater than the last synced value saved in state. An optional secondary cursor is used when the primary is null. It captures new rows and updates (if cursor is timestamp like updated_at), but not deletes.
3. Full Refresh + CDC — initial snapshot with parallel chunking, followed by transaction log CDC.
4. CDC Only (Strict CDC) — streams transaction log changes without initial snapshot.

Is OLake CDC a continuously running process?
No. OLake CDC is not continuous and is not a daemon. A CDC sync is a bounded session: it records where the log ends at start, streams changes up to that point (or until nothing new arrives within initial_wait_time), commits, and then exits. Near-real-time latency comes from setting a schedule to run often (for example, you schedule it every few minutes).

## Ingestion Modes: Upsert vs Append

- Upsert: Keeps only the latest version of each key, with no duplicates.
- Append: Writes every change as a new row and keeps the full history.
Default mode: The default is Upsert for all database sources, except Apache Kafka, which defaults to Append. Ingestion mode can be overridden per stream, and Full Refresh always appends.

## Metadata Columns

OLake automatically appends four standard metadata columns to every destination table:
- `_op_type`: change operation type ('r' = snapshot read, 'c' = insert, 'u' = update, 'd' = delete).
- `_olake_id`: deterministic unique record identifier used for deduplication.
- `_olake_timestamp`: timestamp when OLake wrote the record to the destination.
- `_cdc_timestamp`: timestamp when the change event occurred at the source database.
(Source-specific drivers may also append position indicators, such as `_cdc_lsn` for PostgreSQL).

## Database CDC Prerequisites

### PostgreSQL CDC
- PostgreSQL version 10+ with the built-in `pgoutput` plugin (wal2json is deprecated).
- Server configuration in postgresql.conf:
  - `wal_level = logical`
  - Sufficient `max_replication_slots` and `max_wal_senders` (senders above slots).
  - `wal_sender_timeout = 0`.
- Authentication in pg_hba.conf must permit replication connections.
- User privileges: `REPLICATION` role and `SELECT` access on target tables.
- Create a `publication` and a logical `replication slot`, and provide both names to OLake.

### MySQL CDC
- MySQL 5.5+ (5.7+ recommended).
- Binary logging enabled with:
  - `binlog_format = ROW`
  - `binlog_row_image = FULL`
  - `binlog_row_metadata = FULL` (on MySQL 8.0+)
  - A unique `server-id`.
- User privileges required: `SELECT`, `REPLICATION CLIENT`, and `REPLICATION SLAVE`.

### MongoDB CDC
- MongoDB must run as a `replica set` (or sharded cluster), which enables the `oplog`.
- MongoDB Atlas has replica sets enabled by default.
- Verify oplog access locally with `db.oplog.rs.findOne()` in the local database.

## Iceberg Catalogs and Query Engines Compatibility

Supported Iceberg Catalogs:
AWS Glue Data Catalog, Apache Hive Metastore (HMS), JDBC catalog (PostgreSQL/MySQL), and Iceberg REST catalogs: generic REST, Nessie, Polaris, Unity Catalog, Lakekeeper, AWS S3 Tables, BigLake, and Horizon.

Supported Query Engines that can read OLake Iceberg tables:
Apache Spark, Trino, Amazon Athena, DuckDB, Snowflake, Apache Flink, Presto, Dremio, ClickHouse, StarRocks, Databricks, BigQuery (via BigLake), and AWS Redshift.

## Local UI Installation & Credentials

Install OLake UI locally via Docker Compose:
```bash
curl -sSL https://raw.githubusercontent.com/datazip-inc/olake-ui/master/docker-compose-v1.yml | docker compose -f - up -d
```
Access the web dashboard at `http://localhost:8000/`.
Default credentials: username `admin`, password `password`. (Defaults can be modified in x-signup-defaults in the compose file).

## OLake CLI Commands

The OLake CLI supports five core commands:
- `spec`: outputs the JSON Schema specification for connector configuration.
- `check`: validates source or destination credentials and connectivity.
- `discover`: inspects the source schema and generates `streams.json`.
- `sync`: runs the data ingestion process (requires `--config`, `--streams`, and `--destination`).
- `clear-destination`: wipes destination data for the selected streams.

## Job Scheduling & Cron

OLake jobs can be scheduled with preset intervals (every minute, hourly, daily, weekly) or custom cron expressions.
- Supported cron formats: standard 5-field cron and 7-field cron expressions.
- Unsupported: Quartz cron syntax is not supported.

## Unsupported Technologies & Uptime SLA

- Cassandra: OLake does not support Cassandra as a source.
- Delta Lake: OLake does not support writing directly into Delta Lake tables (OLake writes Iceberg and Parquet only).
- Uptime SLA: The documentation does not state any uptime SLA for the hosted cloud service. Users should contact the OLake team directly via Slack or community channels.
