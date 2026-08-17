# Performance Readiness

Core workspace reads cap leads at 250 and audits at 100; recovery, optimization and automation histories are bounded. Intelligence uses aggregate RPCs, and migrations add tenant/time, target, queue, status and dimension indexes. Tables scroll responsively and imports validate bounded batches.

Before production, generate representative synthetic small/medium/large tenants and measure login-to-shell, dashboard aggregates, filter/drill-down, largest table, import validation and automation queues on desktop/mobile. Capture p50/p95/p99 latency, query plans, rows/bytes transferred, browser memory and error rate. Establish pagination/virtualization and retention thresholds from evidence. Acquisition workspace queries require particular volume profiling and may need server pagination/materialized aggregates before large-tenant launch.
