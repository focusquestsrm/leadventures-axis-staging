# Acquisition attribution

Release 7 uses **Last Known Acquisition Touch**. Axis selects the most recent deterministic tenant/lead touch containing platform IDs, click ID, UTM values, an Axis media relationship, or a landing-page relationship.

Attribution fields are identifiers, not identity:

- click ID
- platform campaign, ad-group, and ad ID
- UTM source, medium, campaign, content, and term
- Axis lead ID
- landing-page ID

Email, phone, name, address, and customer-list matching are excluded. Destination references must not carry lead PII. Platform-attributed conversions remain labeled separately from Axis downstream conversions derived from trusted outcome records.

Multi-touch allocation, probabilistic identity matching, and media-platform audience uploads are outside Release 7.
