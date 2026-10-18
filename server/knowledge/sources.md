---
title: Supported sources and sync modes
url: https://olake.io/docs/connectors/overview/
source: docs
topics: [sources, sync]
---

OLake Go supports ingestion from PostgreSQL, MySQL, MongoDB, Oracle Database, Apache Kafka, DB2, MSSQL, and S3.

## Sync mode matrix (docs overview)

| Source | Full Refresh | Full Refresh + Incremental | Full Refresh + CDC | CDC Only |
| --- | --- | --- | --- | --- |
| PostgreSQL | yes | yes | yes | yes |
| MySQL | yes | yes | yes | yes |
| MongoDB | yes | yes | yes | yes |
| Oracle Database | yes | yes | no | no |
| Apache Kafka | no | no | no | yes (bounded incremental / CDC-style consume) |
| DB2 | yes | yes | no | no |
| MSSQL | yes | yes | yes | yes |
| S3 | yes | yes | no | no |

GitHub README (https://github.com/datazip-inc/olake) notes Oracle CDC as WIP, Kafka as bounded incremental (latest offset), and S3 incremental without CDC.

Connector docs:

- PostgreSQL: https://olake.io/docs/connectors/postgres
- MySQL: https://olake.io/docs/connectors/mysql/overview
- MongoDB: https://olake.io/docs/connectors/mongodb/overview
- Oracle: https://olake.io/docs/connectors/oracle/overview
- DB2: https://olake.io/docs/connectors/db2/
- MSSQL: https://olake.io/docs/connectors/mssql/
- S3: https://olake.io/docs/connectors/s3/
- Kafka: https://olake.io/docs/connectors/kafka

## Sync modes explained

1. Full Refresh — reads the entire source table every run. No cursor/state for incremental change. Uses parallelised chunking.

2. Full Refresh + Incremental — initial full load, then cursor column (for example updated_at) for later runs. Stateful and resumable.

3. Full Refresh + CDC — initial snapshot with parallelised chunking, then CDC from the database log. Stateful and resumable.

4. CDC Only (Strict CDC) — captures INSERT/UPDATE/DELETE from transaction logs. No initial snapshot. For Kafka, messages are consumed as events.

## PostgreSQL

Requires Postgres 10+. CDC uses native pgoutput (logical replication). wal2json is deprecated. Prerequisites typically include wal_level=logical, replication slots, and replication privileges. Environment-specific CDC guides exist for Aurora, RDS, Azure, Cloud SQL, generic Postgres, and Docker. Connector: https://olake.io/docs/connectors/postgres

Features: parallel chunking, checkpointing, automatic resume for failed full loads. Can run in OLake UI or Docker CLI.

## MySQL

Binlog-based CDC. Typical requirements: binlog_format=ROW, binlog_row_image=FULL, REPLICATION CLIENT and REPLICATION SLAVE (or equivalent) privileges. Docs: https://olake.io/docs/connectors/mysql/overview

## MongoDB

Oplog / change streams based CDC. Requires replica set or sharded cluster and read access to the oplog. Docs: https://olake.io/docs/connectors/mongodb/overview

## Oracle and DB2

JDBC-based full load and incremental. CDC is not listed as supported on the docs overview table. Oracle CDC is WIP per GitHub.

## MSSQL

Full load, incremental, and CDC. SQL Server CDC must be enabled at database and table level.

## Kafka

Available in OLake Go v0.3.0+. Tested with Amazon MSK; uses standard Kafka protocols. Only one sync mode: consume topics (CDC-style / bounded incremental). Kafka topic retention deletes old messages; OLake cannot sync deleted messages — schedule frequently enough.

Required config includes bootstrap servers and security protocol (PLAINTEXT, SASL_PLAINTEXT, SASL_SSL). SASL mechanisms: PLAIN, SCRAM-SHA-512. Consumer group must be dedicated to OLake; each job needs a unique group ID. If a rebalance happens mid-sync, the job shuts down gracefully and resumes later.

Transferred columns include _kafka_key, _kafka_offset, and other Kafka metadata. Dedup uses stream-configured dedup keys. Upsert uses positional deletes only.

If a consumer group is corrupted, create a new job/group rather than sharing groups with other consumers.

## S3 source

Ingests from Amazon S3 or S3-compatible stores (MinIO, LocalStack). Full load and incremental, not CDC.
