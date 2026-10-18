---
title: OLake open-source repositories
url: https://github.com/datazip-inc/olake
source: github
topics: [overview, setup, deployment, maintenance]
---

Official GitHub organizations under datazip-inc:

- olake — OLake Go engine. High-performance ingestion from databases, S3, and Kafka into Iceberg or Parquet. CLI commands spec, check, discover, sync, clear-destination. https://github.com/datazip-inc/olake
- olake-ui — Frontend and BFF for storing sync configuration and orchestrating jobs with Temporal. Docker Compose is the recommended local path. Port 8000. https://github.com/datazip-inc/olake-ui
- olake-helm — Helm chart repository. `helm repo add olake https://datazip-inc.github.io/olake-helm`. Chart docs live under helm/olake in that repo. https://github.com/datazip-inc/olake-helm
- olake-fusion — Iceberg table maintenance (compaction, expiration). Fusion service + Spark optimizer. https://github.com/datazip-inc/olake-fusion
- olake-docs — website and documentation source. https://github.com/datazip-inc/olake-docs

Documentation site: https://olake.io/docs
Community Slack: https://olake.io/slack/

Playgrounds listed on the core README include Iceberg + REST + Presto, Glue + Trino/Athena/Snowflake, REST + Spark.

OLake Go README claims exactly-once delivery and Arrow writes, Iceberg-native catalogs, and no Spark/Flink/Debezium requirement for supported CDC sources. Fusion README describes cron compaction UI and multi-catalog support.
