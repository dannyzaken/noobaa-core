/* Copyright (C) 2016 NooBaa */
'use strict';

/**
 * SPIKE - real time bucket quota accounting.
 *
 * Holds a single counter row per bucket (used bytes / used objects). The row is
 * incremented from inside the same transaction that completes an object upload,
 * so that a future quota check could read a value that is always consistent with
 * the object metadata. Nothing is enforced here - this module only pays the write
 * cost, which is exactly what we want to measure: contention on one hot row per
 * bucket under high upload concurrency.
 *
 * Deliberately not a db_client "collection": collections are (_id, data jsonb)
 * tables, and incrementing a jsonb field costs a full document rewrite plus
 * jsonb re-serialization on every upload. A narrow table with BIGINT columns is
 * both what we would actually ship and a cleaner measurement of the row lock.
 */

const config = require('../../../config');
const dbg = require('../../util/debug_module')(__filename);
const db_client = require('../../util/db_client');
const { escapeLiteral } = require('../../util/postgres_client.js');

const POSTGRES_POOL = 'md';

class BucketUsageStore {

    constructor() {
        this.table_name = config.BUCKET_USAGE_COUNTER_TABLE;
        this.init_promise = undefined;
        /** @type {Set<string>} bucket ids whose counter row is known to exist */
        this.known_buckets = new Set();
    }

    /**
     * @returns {BucketUsageStore}
     */
    static instance() {
        if (!BucketUsageStore._instance) BucketUsageStore._instance = new BucketUsageStore();
        return BucketUsageStore._instance;
    }

    /**
     * Create the counters table once per process. Memoized - after the first call
     * this returns an already resolved promise, so awaiting it on the upload path
     * costs a microtask. On failure the memo is cleared so the next upload retries.
     * @returns {Promise<void>}
     */
    async ensure_table() {
        if (!this.init_promise) {
            this.init_promise = this._create_table().catch(err => {
                this.init_promise = undefined;
                this.known_buckets.clear();
                throw err;
            });
        }
        return this.init_promise;
    }

    async _create_table() {
        dbg.log0('bucket_usage_store: creating table', this.table_name);
        await db_client.instance().executeSQL(
            `CREATE TABLE IF NOT EXISTS ${this.table_name} (` +
            ` bucket_id CHAR(24) PRIMARY KEY,` +
            ` used_bytes BIGINT NOT NULL DEFAULT 0,` +
            ` used_objects BIGINT NOT NULL DEFAULT 0,` +
            ` last_update TIMESTAMPTZ NOT NULL DEFAULT now())`,
            [], { preferred_pool: POSTGRES_POOL });
    }

    /**
     * Create the counter row for a bucket. Called on bucket creation, and lazily by
     * ensure_bucket_row for buckets that predate this feature. Never on the hot path.
     * @param {any} bucket_id
     */
    async create_bucket_row(bucket_id) {
        await this.ensure_table();
        await db_client.instance().executeSQL(
            `INSERT INTO ${this.table_name} (bucket_id) VALUES ($1) ON CONFLICT (bucket_id) DO NOTHING`,
            [String(bucket_id)], { preferred_pool: POSTGRES_POOL });
        this.known_buckets.add(String(bucket_id));
    }

    /**
     * Guarantee the counter row exists before the first upload completion for this
     * bucket in this process. Memoized per bucket id, so steady state is a Set lookup
     * and the upload path only ever issues a plain UPDATE.
     * @param {any} bucket_id
     */
    async ensure_bucket_row(bucket_id) {
        if (this.known_buckets.has(String(bucket_id))) return;
        await this.create_bucket_row(bucket_id);
    }

    /**
     * SQL that applies a delta to the bucket counter row. A plain UPDATE, not an
     * upsert: the row is created with the bucket, and at 64 concurrent writers on
     * one row UPDATE measured ~1-9% faster than INSERT .. ON CONFLICT DO UPDATE with
     * a much tighter spread, since the upsert also probes the arbiter unique index.
     *
     * Returned as literal SQL text (no bind params) because the caller appends it to
     * a BulkOp batch, which is sent as one multi statement simple query.
     *
     * @param {{ bucket_id: any, size_delta: number, count_delta: number }} delta
     * @returns {string}
     */
    build_delta_query({ bucket_id, size_delta, count_delta }) {
        const id = escapeLiteral(String(bucket_id));
        const bytes = Math.round(Number(size_delta) || 0);
        const count = Math.round(Number(count_delta) || 0);
        return `UPDATE ${this.table_name} SET` +
            ` used_bytes = used_bytes + ${bytes},` +
            ` used_objects = used_objects + ${count},` +
            ` last_update = now()` +
            ` WHERE bucket_id = ${id}`;
    }

    /**
     * Read back a bucket counter - for verification after a test run.
     * @param {any} bucket_id
     * @returns {Promise<{ used_bytes: number, used_objects: number, last_update: Date } | undefined>}
     */
    async read_bucket_usage(bucket_id) {
        await this.ensure_table();
        const res = await db_client.instance().executeSQL(
            `SELECT used_bytes, used_objects, last_update FROM ${this.table_name} WHERE bucket_id = $1`,
            [String(bucket_id)], { preferred_pool: POSTGRES_POOL });
        const row = res.rows[0];
        if (!row) return undefined;
        return {
            used_bytes: Number(row.used_bytes),
            used_objects: Number(row.used_objects),
            last_update: row.last_update,
        };
    }
}

BucketUsageStore._instance = undefined;

exports.BucketUsageStore = BucketUsageStore;
