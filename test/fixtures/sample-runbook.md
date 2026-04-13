# Database Service Runbook

## Diagnostics

### Check Query Performance
- Query current slow query log
- Identify top 10 slowest queries
- Check execution plans

### Check Resource Utilization
- Check CPU usage
- Check memory usage
- Check disk I/O

### Check Connection Count
- Current active connections
- Connection pool status
- Identify long-running transactions

## Common Issues

### High CPU Usage
- Usually caused by:
  - Unoptimized queries with full table scans
  - Missing indexes
  - Connection pool exhaustion
- Check: Slow query log, execution plans

### Memory Pressure
- Usually caused by:
  - Large result sets
  - Inefficient cache configuration
  - Memory leaks in query execution
- Check: Memory usage, cache stats

## Resolution Steps

1. Enable query timeout to prevent cascade failures
2. Identify top resource consumers
3. Either optimize query or scale horizontally
4. Monitor recovery
