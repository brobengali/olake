---
title: Deploy OLake on Kubernetes with Helm
url: https://olake.io/docs/install/kubernetes/
source: docs
topics: [deployment, troubleshooting]
---

Official Helm chart deploys OLake UI on Kubernetes. Chart repo: https://github.com/datazip-inc/olake-helm . Docs: https://olake.io/docs/install/kubernetes/

```bash
helm repo add olake https://datazip-inc.github.io/olake-helm
helm repo update
```

EKS example:

```bash
helm install olake olake/olake --set global.storageClass="gp2"
```

That install does not include Fusion. Enable later with helm upgrade and fusion.enabled=true. See Fusion Kubernetes docs: https://olake.io/docs/fusion/install/kubernetes-compaction/

Access:

```bash
kubectl port-forward svc/olake-ui 8000:8000
```

Open http://localhost:8000 . Default admin/password. Prefer replacing via Kubernetes secret olake-admin-credentials and olakeUI.initUser.existingSecret.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- kubectl
- A StorageClass for PostgreSQL, shared storage, and (legacy) Elasticsearch PVCs

Minimum resources (plan concurrent load):

| Component | RAM | vCPU |
| --- | --- | --- |
| OLake UI | 4 GB | 2 |
| Temporal | 4 GB | 2 |
| OLake Worker | 4 GB | 2 |
| PostgreSQL | 4 GB | 2 |
| Sync pod (OLake Go) | 8 GB | 4 |

Prefer on-demand nodes for nfs-server, PostgreSQL, Temporal, workers, and UI.

## Components

OLake UI, OLake Worker, PostgreSQL, Temporal, Signup Init. Elasticsearch is legacy only.

## Upgrade

```bash
helm repo update
helm upgrade olake olake/olake
```

Or `helm upgrade olake olake/olake -f new-values.yaml`. After upgrade, `kubectl rollout restart deployment/olake-workers` so stopped syncs resume. To keep ES: `--set elasticsearch.enabled=true`.

Restart UI/workers:

```bash
kubectl rollout restart deployment/olake-ui
kubectl rollout restart deployment/olake-workers
```

## Ingress

Set olakeUI.ingress.enabled=true, className, hosts, tls secret.

## JobID-based scheduling

global.jobProfiles maps JobID integers (from the Jobs page) to nodeSelector, tolerations, and affinity. Key `0` is the default for unmapped jobs and Fetch/Test/Discover. Legacy global.jobMapping (nodeSelector only) is deprecated; jobProfiles wins if both are set.

## Prometheus

Enable metrics then scrape :8000/metrics. See Prometheus Integration in the docs.

## Kubernetes troubleshooting

Pod logs:

```bash
kubectl logs -l app.kubernetes.io/name=olake-ui -f
kubectl logs -l app.kubernetes.io/name=temporal-server -f
```

Pending pods: resources, node selectors, StorageClass.

CrashLoopBackOff: failed to ping database (see DB section); resource limits; volume mount / nfs-server pod.

Database:

```bash
kubectl get pods -l app.kubernetes.io/name=postgresql
```

For external Postgres: use writer not reader; avoid @ # in passwords; ssl_mode in the secret; test connectivity from other pods.

Helm chart README: https://github.com/datazip-inc/olake-helm
