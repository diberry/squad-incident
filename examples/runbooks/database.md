# Database Service Runbook

## Diagnostics

- Check slow query log for queries exceeding 100ms
- Verify connection pool utilization (warn at 75%)
- Review recent schema migrations
- Check replication lag across read replicas
- Inspect lock contention and deadlock graphs

## Resolution

- Kill long-running queries blocking the pool
- Scale read replicas if replication lag exceeds 5s
- Roll back recent migrations if correlated with onset
- Increase connection pool size as a temporary measure
- Page on-call DBA if not resolved within 10 minutes
