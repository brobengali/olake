---
title: OLake Fusion table maintenance
url: https://olake.io/docs/iceberg-maintenance/overview/
source: docs
topics: [maintenance]
---

OLake Fusion is an automated Iceberg table maintenance platform. Repo: https://github.com/datazip-inc/olake-fusion . Overview: https://olake.io/docs/iceberg-maintenance/overview/ and https://olake.io/docs/fusion/getting-started/overview/

As Iceberg tables ingest updates and deletes they accumulate small files, delete files, and excess metadata. Fusion runs compaction and related maintenance so tables stay queryable.

Run maintenance when you see frequent ingestion, small files, delete files, high partition cardinality, slower queries, or growing table size.

Architecture:

- Fusion management service — table lifecycle, self-optimization, data expiration, unified catalog interface
- Spark Optimizer — file layout / read efficiency jobs (Kind cluster in Docker for local Fusion profile)

Features: cron-based compaction in the UI; multi-catalog; deploy on private/public/hybrid cloud.

Vendor benchmarks claim up to 2x vs vanilla Spark compaction and about 5% better query performance: https://olake.io/docs/benchmarks/compaction/

UI module is available from OLake UI v0.4.0. Existing Docker users follow the upgrade guide; Helm users follow the chart upgrade with fusion.enabled=true.

Docker (ingestion + maintenance):

```bash
curl -sSL https://raw.githubusercontent.com/datazip-inc/olake-ui/master/docker-compose-v1.yml | ENABLE_OPTIMIZATION="true" docker compose --profile fusion -f - up -d
```

Docs: https://olake.io/docs/fusion/install/olake-ui/

Helm: https://olake.io/docs/fusion/install/kubernetes-compaction/

First compaction: https://olake.io/docs/fusion/getting-started/configure-first-compaction/

## Catalogs in Fusion

Imported catalogs come from OLake destinations. External catalogs are added manually on Maintenance → Catalogs → New Catalog when tables were created outside OLake.

Supported: AWS Glue, REST generic, Nessie, Polaris, Unity, Lakekeeper, S3 Tables, JDBC, Hive Metastore. https://olake.io/docs/fusion/maintenance/catalogs/
