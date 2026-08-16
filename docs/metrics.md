# Axis metric definitions

Release 3 metrics are defined once in `src/lib/metrics.ts` and mirrored by the tenant-safe `axis_intelligence_snapshot` database function. All filters and date comparisons use the lead's `received_at` timestamp. Incomplete records remain in denominators unless a definition explicitly requires a value.

| Metric | Definition | Missing-data behavior |
|---|---|---|
| Total Leads | Count of tenant leads received in the selected period. | Includes leads with missing source, campaign, program, or offer. |
| Accepted Leads | Leads whose current status is `accepted` or `recovered`. | No inferred acceptance from payout. |
| Rejected Leads | Leads whose current status is `rejected`. | No inferred rejection from a failed attempt. |
| Acceptance Rate | Accepted Leads / Total Leads × 100. | Unavailable when Total Leads is zero. |
| Rejection Rate | Rejected Leads / Total Leads × 100. | Unavailable when Total Leads is zero. |
| Recovery Opportunity | Structured rejection records with `recoverable=true`. | Never inferred from free text or a missing reason. |
| Recoverable % | Recovery Opportunity / Rejected Leads × 100. | Unavailable when Rejected Leads is zero. |
| Average Response Time | Mean non-null `lead_delivery_attempts.response_time_ms`. | Missing response times are counted by data-quality diagnostics and excluded only because no duration exists. |
| Median Response Time | Median non-null response duration. | Reserved for the next database percentile extension; not displayed in R3 when unavailable. |
| Timeout Rate | Timeout attempts / all delivery attempts × 100. | Attempts with other missing response data remain in the denominator. |
| Capacity Utilization | Sum of active cap delivered values / sum of active cap limits × 100. | Unavailable when no active capacity is configured. |
| Estimated Revenue | Sum of payout on accepted attempts where payout exists. | Displayed as unavailable when no accepted payout data exists; zero is not fabricated. |
| Revenue per Lead | Estimated Revenue / Total Leads. | Not displayed without sufficient payout data. |
| CPL | Spend / Total Leads. | Not calculated because R2 does not contain spend. |
| Gross Margin | Revenue − lead cost. | Not calculated because complete cost data does not exist. |

## Period comparison

Each preset compares with the immediately preceding equivalent duration. Counts, revenue, and response time use relative percentage change. Rates use percentage-point change. A prior value of zero or absent data produces “No comparable prior-period data” rather than a misleading percentage.

## Capacity states

- Healthy: active and below 85% utilization.
- Approaching Cap: active and at least 85% but below 100%.
- At Cap: active and at least 100%.
- Inactive: buyer or cap context is inactive.
- Unconfigured: no positive active cap exists.

## Data quality

Missing source, campaign, program, response time, and rejection classification are surfaced explicitly. Blank rejection categories are normalized to `Unknown / Unclassified`; Axis never invents a rejection reason.
