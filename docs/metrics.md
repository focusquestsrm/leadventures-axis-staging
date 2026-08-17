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

## Release 4 outcome metrics

Outcome metrics count distinct matched leads in the selected lead cohort. An outcome is eligible only when its tenant matches, its lead passes the active R3 filters, its occurrence is no later than the report end, and any buyer filter matches.

| Metric | Definition | Missing-data behavior |
|---|---|---|
| Contacted | Distinct selected leads with a `contacted` outcome. | Zero when no matching outcomes exist. |
| Qualified | Distinct selected leads with a `qualified` outcome. | External stages require explicit mapping. |
| Applications / Sales | Distinct leads with `application` or `sale`. | Terminology remains configurable. |
| Conversions | Distinct leads with `enrollment` or `sale`. | No acceptance-based inference. |
| Starts / Completions | Distinct leads with `start` or `completed`. | No stage-sequence inference. |
| Outcome Revenue | Sum of actual non-null outcome monetary values. | Unavailable when no economic value exists. |
| Revenue per Lead | Outcome Revenue / selected leads. | Unavailable without outcome revenue or leads. |
| Revenue per Accepted Lead | Outcome Revenue / accepted selected leads. | Unavailable without outcome revenue or accepted leads. |

Source/campaign, buyer, and program scorecards inherit attribution from the matched operational lead and optional outcome dimensions. Lead cost and gross contribution remain unsupported until authoritative acquisition cost exists.

## Release 5 recovery metrics

| Metric | Definition | Missing-data behavior |
|---|---|---|
| Rejected Leads | Tenant rejection records in the selected recovery scope. | Zero when none exist. |
| Recoverable Leads | Recovery workflows not blocked or cancelled. | Based on stored, explainable eligibility; never inferred from reason text. |
| Recovery Attempts | Ordered recovery-attempt records. | Pending records remain visible; attempted-workflow rate excludes pending, eligible, skipped, and blocked records. |
| Recovered Leads | Recovery workflows with status `recovered`. | No inference from a primary acceptance. |
| Recovery Rate | Recovered workflows / workflows with an executed recovery attempt × 100. | Unavailable when no workflow has an executed attempt. |
| Recovered Revenue | Sum of non-null `recovery_value` for recovered workflows. | Unavailable when no recovered workflow has trusted value. |
| Average Recovery Value | Recovered Revenue / Recovered Leads. | Unavailable without recovered revenue or recovered leads. |
| Recovery Contribution | Recovered Revenue − complete incremental recovery costs. | Unavailable unless every recovered workflow has authoritative cost. |
| Downstream Conversions | Distinct recovered lead IDs with trusted enrollment, sale, or completed outcomes. | Zero when no matched downstream outcome exists. |

Buyer recovery performance separates primary delivery volume from recovery attempts and acceptance. Program recovery performance reports rejection opportunity, attempts, recovered value, and the top accepted secondary buyer. Economic metrics never substitute zero for unknown payout, revenue, or cost.
