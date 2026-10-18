---
title: OLake Docker CLI
url: https://olake.io/docs/install/docker-cli
source: docs
topics: [setup, sources]
---

OLake Go can run without the UI via official Docker images per source driver. Docs: https://olake.io/docs/install/docker-cli . Images are on DockerHub under the OLake organization.

Driver SOURCE-TYPE values: postgres, mysql, oracle, mongodb (and additional drivers as they ship).

CLI commands used by the framework:

- spec — JSON Schema for connector configuration
- check — validate source/destination connection
- discover — list streams/tables and schemas
- sync — extract from source and write to destination
- clear-destination — clear destination data for streams listed in streams.json

Typical flow: configure source JSON, destination JSON, discover streams, then sync. Config files commonly named source.json, destination.json, streams.json.

Other install paths from the core README (https://github.com/datazip-inc/olake):

1. OLake UI (recommended) — https://olake.io/docs/getting-started/quickstart/
2. Kubernetes Helm — https://olake.io/docs/install/kubernetes
3. Standalone Docker CLI — https://olake.io/docs/install/docker-cli
4. Airflow on EC2 — https://olake.io/blog/olake-airflow-on-ec2/
5. Airflow on Kubernetes — https://olake.io/blog/olake-airflow

Local contributor environment (https://olake.io/docs/community/setting-up-a-dev-env) needs Java 21, Golang, Node.js, Docker, Maven. A docker-compose helper starts sample Postgres/Mongo/MySQL sources and Iceberg/Parquet destinations (MinIO locally).
