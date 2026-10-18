---
title: Docker Compose setup for OLake UI
url: https://olake.io/docs/getting-started/quickstart/
source: docs
topics: [setup, deployment, troubleshooting]
---

The recommended way to start is OLake UI via Docker Compose. UI repo: https://github.com/datazip-inc/olake-ui . Install docs: https://olake.io/docs/install/olake-ui and https://olake.io/docs/getting-started/quickstart/

## Prerequisites

- Docker and Docker Compose
- Port 8000 free
- Quickstart lists at least 4GB RAM for Docker
- Full UI install page lists minimum 8 vCPU / 16 GB RAM, recommended 16 vCPU / 32 GB RAM for the complete stack

## Ingestion only

```bash
curl -sSL https://raw.githubusercontent.com/datazip-inc/olake-ui/master/docker-compose-v1.yml | docker compose -f - up -d
```

## Ingestion + Fusion maintenance

```bash
curl -sSL https://raw.githubusercontent.com/datazip-inc/olake-ui/master/docker-compose-v1.yml | ENABLE_OPTIMIZATION="true" docker compose --profile fusion -f - up -d
```

ENABLE_OPTIMIZATION=true enables the Maintenance module. The fusion profile starts Fusion and related services. Spark maintenance uses Kind (Kubernetes in Docker) in the Fusion UI install path.

## Access

- UI: http://localhost:8000
- Default login: username `admin`, password `password`
- Change these before any production use.

## Stack components

- OLake UI — job management
- Temporal Worker — replication jobs
- PostgreSQL — jobs, config, sync state, Temporal visibility
- Temporal Server — workflow orchestration
- Signup Init — default admin user
- Elasticsearch — legacy Temporal visibility only; new installs use Postgres visibility
- Fusion (optional) — Iceberg maintenance control plane
- Fusion Spark Optimizer (optional)

## First job (UI)

1. Sources tab → Create Source
2. Destinations tab → Create Destination
3. Jobs tab → Create Job, schedule, pick source and destination
4. Select streams and sync mode (CDC, Full Refresh, Incremental)
Walkthrough: https://olake.io/docs/getting-started/creating-first-pipeline/

## Encryption

Configure x-encryption.key in compose:

- AWS KMS ARN (recommended in production)
- Any passphrase (hashed to AES-256-GCM)
- Empty string disables encryption (dev only)

## Persistence

Default host directory is `./olake-data` (configs, streams, state). Docker volume `temporal-postgresql-data` holds workflow history. Change path via x-app-defaults.host_persistence_path.

## External PostgreSQL

x-db-envs: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_SSLMODE, OLAKE_DB_NAME, TEMPORAL_DB_NAME. For TLS, enable SQL_TLS settings on Temporal. Point at a writer instance, not a reader. Avoid special characters like @ and # in passwords if connection strings break.

## External Temporal

Set TEMPORAL_EXTERNAL=true plus TEMPORAL_ADDRESS, TEMPORAL_API_KEY, TEMPORAL_NAMESPACE, TEMPORAL_TASK_QUEUE, TEMPORAL_ENABLE_TLS.

## S3 log storage

Optional from OLake 0.12.0+, UI 0.7.0+, worker 0.4.0+. OLAKE_STORAGE_MODE=s3 plus bucket, region, keys. Switching to S3 does not migrate old local logs.

## Metrics

METRICS_ENABLED=true then scrape http://<host>:8000/metrics

## Telemetry

TELEMETRY_DISABLED=true to opt out.

## Positional deletes / deletion vectors

Require a Pebble index DB on the worker: OLAKE_INDEX_DB_DIR, OLAKE_INDEX_DB_CACHE_SIZE, OLAKE_INDEX_DB_MAX_OPEN_FILES. Versions: OLake 0.11.0+, UI 0.6.0+, worker 0.3.11+. Equality deletes need no index DB.

## Docker troubleshooting

- Port 8000 in use: `lsof -i :8000` or change compose ports
- DB: `docker compose ps` and `docker compose logs postgresql`
- Memory: allocate enough RAM; `docker stats`
- Permissions: writable olake-data directory; Linux docker group
- Logs: `docker compose logs -f` or `docker compose logs -f <service>`
- Reset (destroys data): `docker compose down -v` then up again

Updating: down then up again with the same docker-compose-v1.yml curl. Data in volumes and olake-data is kept unless you use -v.

Legacy compose with Elasticsearch: upgrading to v1 loses historical Temporal visibility in ES.
