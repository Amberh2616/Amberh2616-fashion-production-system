# Django Migration Fix Summary

**Date:** 2026-01-01
**Issue:** AddIndex operations attempted before AddField operations in migration 0002

## Problem

The auto-generated migration `0002_sampleactuals_samplerun_and_more.py` had a dependency ordering issue:
- `AddIndex` operations for `sample_run` fields were placed in the middle of the migration
- These indexes referenced the `sample_run` foreign key field
- However, the `AddField` operations for `sample_run` came AFTER the `AddIndex` operations
- Django migrations require fields to exist before indexes can be created on them

## Solution

Split the migration into two sequential migrations:

### Migration 0002: Field Operations (Original minus indexes)
**File:** `backend/apps/samples/migrations/0002_sampleactuals_samplerun_and_more.py`

Contains:
- CreateModel operations (SampleActuals, SampleRun)
- RemoveIndex/AlterUniqueTogether operations
- RemoveField operations
- AddField operations (including sample_run FK fields)
- AlterField operations
- AlterUniqueTogether operations

### Migration 0003: Index Operations (New)
**File:** `backend/apps/samples/migrations/0003_add_sample_indexes.py`

Contains all AddIndex operations that depend on fields created in 0002:
- `sample_mwos_sample__3ad680_idx` - Index on (sample_run, version_no)
- `sample_mwos_sample__860506_idx` - Index on (sample_run, status)
- `t2pos_for_s_sample__a30471_idx` - Index on (sample_run, version_no)
- `t2pos_for_s_sample__f46767_idx` - Index on (sample_run, status)
- `sample_runs_sample__082739_idx` - Index on (sample_request, status)
- `sample_runs_status_74048f_idx` - Index on (status, target_due_date)

## Migration Status

```
samples
 [X] 0001_initial
 [X] 0002_sampleactuals_samplerun_and_more
 [X] 0003_add_sample_indexes
```

All migrations applied successfully.

## Tables Created

```
sample_actuals
sample_attachments
sample_cost_estimates
sample_mwos
sample_requests
sample_runs
samples
t2pos_for_sample
t2po_lines_for_sample
```

## Indexes Verified

All 6 new indexes from migration 0003 were successfully created in the database.

## Models Verified

Both new models can be imported and used:
- `apps.samples.models.SampleRun`
- `apps.samples.models.SampleActuals`

## Key Takeaway

When Django generates complex migrations with multiple interdependent operations, always verify the operation ordering:

1. **CreateModel** - Create tables first
2. **AddField** - Add fields (including ForeignKey fields)
3. **AddIndex** - Add indexes on those fields (MUST come after AddField)

If auto-generated migrations violate this order, manually split them into sequential migrations.
