---
title: Troubleshooting OLake
url: https://olake.io/docs/install/olake-ui
source: docs
topics: [troubleshooting]
---

## Docker Compose

- Port 8000 busy: find the process or change published ports.
- PostgreSQL unhealthy: `docker compose logs postgresql`. For external DB use the writer endpoint, check sslmode, and avoid @ # in passwords.
- Permission errors on olake-data: make the host directory writable.
- OOM: increase Docker RAM; UI docs suggest substantial CPU/RAM for the full stack.
- Service logs: `docker compose logs -f olake-ui` / temporal-worker.
- Reset: `docker compose down -v` deletes job data.

## Kubernetes

- Pending: StorageClass, resources, selectors.
- CrashLoop: database ping, resource limits, NFS volume.
- After helm upgrade: rollout restart olake-workers.
- Logs: kubectl logs -l app.kubernetes.io/name=olake-ui

## CDC lag or missing changes

- PostgreSQL: wal_level=logical, replication slot exists and is not inactive, use pgoutput not wal2json.
- MySQL: binlog enabled, ROW format, FULL row image, retention long enough for the job interval.
- MongoDB: replica set, oplog window large enough.
- Kafka: topic retention; unique dedicated consumer group; do not share the group.

## Iceberg write failures

Check object-store credentials, bucket region vs Glue region, catalog connectivity, and IAM (s3:GetObject, PutObject, ListBucket; Glue APIs). JDBC catalog needs DDL on metadata tables.

## Sync stuck or slow

Tune max connections per job (not global). Increase parallel chunking/threads where the source can take it. Kafka: Threads Equal Total Partitions vs max_threads.

## Schema / type errors

See https://olake.io/docs/features/schema/ . Unsupported promotions fail the job. DLQ columns are not generally available yet.

## Duplicates

Two-phase commit tracks Iceberg chunk commits. Upsert + primary keys (or Kafka dedup keys) collapse duplicates. Interrupted Full Refresh without state may rewrite; resumable modes checkpoint.

## Community

Slack: https://olake.io/slack/ . Issues: https://github.com/datazip-inc/olake/issues , https://github.com/datazip-inc/olake-ui/issues , https://github.com/datazip-inc/olake-helm/issues , https://github.com/datazip-inc/olake-fusion/issues .
