# SDF Cloud Infrastructure

Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

Terraform and deployment config for `api.etapsky.com`.

## Structure

- `terraform/` — AWS (RDS, ElastiCache, S3, ECS, CloudFront)
- `docker/` — Build references (Dockerfiles live in app dirs)

## Usage

```bash
cd terraform
terraform init
terraform plan -var="environment=staging"
```

See `.env.example` in `apps/sdf-cloud-api` for required variables.
