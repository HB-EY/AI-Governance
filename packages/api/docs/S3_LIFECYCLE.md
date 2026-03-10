# S3 Bucket Lifecycle (Evidence Storage)

Evidence objects use the key pattern `evidence/{year}/{month}/{day}/{trace_id}.json`.

Recommended lifecycle policy for the bucket:

- **Transition to cold storage**: Move objects older than 90 days to a cheaper storage class (e.g. Glacier or S3 Infrequent Access).
- **Expiration**: Optionally expire or archive objects after 1 year per retention requirements.
- **Prefix**: Apply rules to prefix `evidence/` so only evidence objects are affected.

Example AWS lifecycle rule (JSON) for transition after 90 days:

```json
{
  "Rules": [{
    "ID": "EvidenceToColdStorage",
    "Status": "Enabled",
    "Filter": { "Prefix": "evidence/" },
    "Transitions": [{ "Days": 90, "StorageClass": "STANDARD_IA" }]
  }]
}
```

Configure the bucket and lifecycle in your cloud provider console or IaC.
