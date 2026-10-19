---
title: Latest Deployed Releases & Upstream Updates
url: https://github.com/datazip-inc/olake/releases
source: github-releases
topics: [release, update, versions, changelog, deploy, fixes, features]
---

# Deployed OLake Upstream Versions & Release Notes
Synchronized at: 2026-10-19T06:16:59.496331+00:00

## OLake Go Core (v0.12.1)
- **Repository**: [datazip-inc/olake](https://github.com/datazip-inc/olake)
- **Version Tag**: `v0.12.1`
- **Published Date**: 2026-10-15T13:27:40Z
- **Release URL**: https://github.com/datazip-inc/olake/releases/tag/v0.12.1

### Changelog & Feature Highlights
## What's Changed
* docs: Update README by @nayanj98 in https://github.com/datazip-inc/olake/pull/1294
* chore: Remove workflow run approval for integration tests on master by @kaizakin in https://github.com/datazip-inc/olake/pull/1046
* fix: move RetryCount default to config.Validate() across all drivers by @cotishq in https://github.com/datazip-inc/olake/pull/1058
* chore(deps): bump go to 1.26.9 and golang.org/x/net to v0.60.0 by @mihir-datazip in https://github.com/datazip-inc/olake/pull/1299
* fix: enforce append_mode true for S3 and append-only drivers by @roshankumar0036singh in https://github.com/datazip-inc/olake/pull/1263
* ci: trigger performance tests on PRs to master and allow manual dispatch by @NotVishesh in https://github.com/datazip-inc/olake/pull/1142
* feat: upsert mode in Kafka(source) by @sahitya-datazip in https://github.com/datazip-inc/olake/pull/1161
* fix(iceberg): relabel u as c only when ResolveUpsertOp is true by @mihir-datazip in https://github.com/datazip-inc/olake/pull/1304
* fix: allow numbers in iceberg catalog names by @Kaileshwar16 in https://github.com/datazip-inc/olake/pull/1184
* feat: report CDC prerequisite checks in test connection by @vikaxsh in https://github.com/datazip-inc/olake/pull/1234
* fix(postgres): prevent first-sync lsn mismatch under concurrent write load by @mihir-datazip in https://github.com/datazip-inc/olake/pull/1084
* fix(mysql): use mariadb binlog flavor for MariaDB sources in CDC by @aphatnani in https://github.com/datazip-inc/olake/pull/1307
* fix(postgres): size ctid chunks by table size including TOAST by @mihir-datazip in https://github.com/datazip-inc/olake/pull/1309
* fix(kafka): list selected dedup keys in upsert missing-key error by @sahitya-datazip in https://github.com/datazip-inc/olake/pull/1313

## New Contributors
* @NotVishesh made their first contribution in https://github.com/datazip-inc/olake/pull/1142
* @aphatnani made their first contribution in https://github.com/datazip-inc/olake/pull/1307

**Full Changelog**: https://github.com/datazip-inc/olake/compare/v0.12.0...v0.12.1

---

## OLake Fusion (v0.1.4)
- **Repository**: [datazip-inc/olake-fusion](https://github.com/datazip-inc/olake-fusion)
- **Version Tag**: `v0.1.4`
- **Published Date**: 2026-08-24T13:25:38Z
- **Release URL**: https://github.com/datazip-inc/olake-fusion/releases/tag/v0.1.4

### Changelog & Feature Highlights
## What's Changed
###  🚨Snapshot Expiry fixed in this version, recommended to upgrade 🚨
* fix(ams): stop auto-snapshot expiry by @badalprasadsingh in https://github.com/datazip-inc/olake-fusion/pull/21
* fix: fusion corrupted tables by @ashi-droid in https://github.com/datazip-inc/olake-fusion/pull/16

## New Contributors
* @ashi-droid made their first contribution in https://github.com/datazip-inc/olake-fusion/pull/16

**Full Changelog**: https://github.com/datazip-inc/olake-fusion/compare/v0.1.3...v0.1.4

---

## OLake Helm Chart (v0.4.0)
- **Repository**: [datazip-inc/olake-helm](https://github.com/datazip-inc/olake-helm)
- **Version Tag**: `v0.4.0`
- **Published Date**: 2026-10-08T12:18:32Z
- **Release URL**: https://github.com/datazip-inc/olake-helm/releases/tag/v0.4.0

### Changelog & Feature Highlights
## What's Changed
* fix: pull MinIO images from quay.io (Docker Hub repos deleted) by @shubham19may in https://github.com/datazip-inc/olake-helm/pull/212
* chore: upgrade from temporalio/auto-setup to temporalio/server by @vishalm0509 in https://github.com/datazip-inc/olake-helm/pull/213
* chore(release): sync staging -> master (olake-helm v0.0.29) by @prashant-shahi in https://github.com/datazip-inc/olake-helm/pull/214
* fix(worker/docker): add heartbeat during image pull by @roshankumar0036singh in https://github.com/datazip-inc/olake-helm/pull/210
* fix: pull MinIO images from olakego mirror (quay.io removed them too) by @shubham19may in https://github.com/datazip-inc/olake-helm/pull/217
* chore: added-s3 by @saksham-datazip in https://github.com/datazip-inc/olake-helm/pull/189
* chore: sync master to staging by @prashant-shahi in https://github.com/datazip-inc/olake-helm/pull/226
* chore: added release version by @saksham-datazip in https://github.com/datazip-inc/olake-helm/pull/224
* refactor(helm): split s3LogFileStorage into minio and external blocks by @prashant-shahi in https://github.com/datazip-inc/olake-helm/pull/227
* chore(release): sync staging -> master (olake-helm v0.0.30) by @prashant-shahi in https://github.com/datazip-inc/olake-helm/pull/225

## New Contributors
* @roshankumar0036singh made their first contribution in https://github.com/datazip-inc/olake-helm/pull/210
* @saksham-datazip made their first contribution in https://github.com/datazip-inc/olake-helm/pull/189

**Full Changelog**: https://github.com/datazip-inc/olake-helm/compare/v0.3.11...v0.4.0

---

## OLake Management UI (v0.7.1)
- **Repository**: [datazip-inc/olake-ui](https://github.com/datazip-inc/olake-ui)
- **Version Tag**: `v0.7.1`
- **Published Date**: 2026-10-15T13:27:48Z
- **Release URL**: https://github.com/datazip-inc/olake-ui/releases/tag/v0.7.1

### Changelog & Feature Highlights
## What's Changed
* chore(deps): bump go to 1.26.9 and golang.org/x/net to v0.60.0 by @mihir-datazip in https://github.com/datazip-inc/olake-ui/pull/481
* feat: add Kafka upsert with dedup keys in stream config(UI) by @sahitya-datazip in https://github.com/datazip-inc/olake-ui/pull/426
* fix: default CONTAINER_REGISTRY_BASE to docker.io by @prashant-shahi in https://github.com/datazip-inc/olake-ui/pull/453
* fix: s3 append mode by @deepanshupal09-datazip in https://github.com/datazip-inc/olake-ui/pull/482
* feat(ui): add CDC prerequisite checks to source test connection by @krishanu-datazip in https://github.com/datazip-inc/olake-ui/pull/459
* fix(ui): link Horizon destination to its docs instead of Glue by @krishanu-datazip in https://github.com/datazip-inc/olake-ui/pull/471
* feat(api): convert long-running endpoints to submit-and-poll by @krishanu-datazip in https://github.com/datazip-inc/olake-ui/pull/454
* chore: staging -> master v0.7.1 by @vishalm0509 in https://github.com/datazip-inc/olake-ui/pull/485

## New Contributors
* @mihir-datazip made their first contribution in https://github.com/datazip-inc/olake-ui/pull/481
* @sahitya-datazip made their first contribution in https://github.com/datazip-inc/olake-ui/pull/426
* @prashant-shahi made their first contribution in https://github.com/datazip-inc/olake-ui/pull/453

**Full Changelog**: https://github.com/datazip-inc/olake-ui/compare/v0.7.0...v0.7.1

---
