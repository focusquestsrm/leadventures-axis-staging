# Forecasting

Release 6 uses a transparent weighted moving average. Recent observations receive greater weight, and the resulting daily projection is multiplied by the selected operational horizon.

Supported horizons in storage are end of day, next seven days, cap-period end, and month end. The initial Optimize views generate next-seven-day projections for leads, accepted, rejected, recoverable, recovered, conversions, and revenue.

Each forecast carries its metric, dimension, horizon, method, model version, sample size, confidence, generation date, and optional expiration. Completed periods may record actual value, signed error, absolute error, and percentage error. Forecast quality is unavailable when the actual value is zero or absent.

Confidence is low below the configured minimum sample, medium at the minimum, and high only at the configured high-confidence sample. Delayed and stale inputs reduce the result. Forecasts are operational estimates and must not be presented as guaranteed outcomes.
