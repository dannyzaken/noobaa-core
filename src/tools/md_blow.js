/* Copyright (C) 2016 NooBaa */
'use strict';

const _ = require('lodash');
const argv = require('minimist')(process.argv);
const crypto = require('crypto');
const P = require('../util/promise');
const api = require('../api');
const dbg = require('../util/debug_module')(__filename);

const rpc = api.new_rpc();
const client = rpc.new_client();

argv.email = argv.email || 'demo@noobaa.com';
argv.password = argv.password || 'DeMo1';
argv.system = argv.system || 'demo';
argv.bucket = argv.bucket || 'first.bucket';
argv.count = argv.count || 100;
argv.chunks = argv.chunks || 128;
argv.chunk_size = argv.chunk_size || 1024 * 1024;
argv.concur = argv.concur || 20;
argv.key = argv.key || ('md_blow-' + Date.now().toString(36));

main();

async function main() {
    try {
        await client.create_auth_token({
            email: argv.email,
            password: argv.password,
            system: argv.system,
        });
        await blow_objects();
        process.exit(0);

    } catch (err) {
        dbg.error('md_blow failed with error:', err);
        process.exit(1);
    }

}

async function blow_objects() {
    let index = 0;

    async function blow_next() {
        if (index >= argv.count) return;
        index += 1;
        await blow_object(index).then(blow_next);
    }
    await P.all(_.times(argv.concur, blow_next));
}

async function blow_object(index) {
    const params = {
        bucket: argv.bucket,
        key: argv.key + '-' + index,
        size: argv.chunks * argv.chunk_size,
        content_type: 'application/octet_stream'
    };
    dbg.log0('create_object_upload', params.key);
    const create_reply = await client.object.create_object_upload(params);

    params.obj_id = create_reply.obj_id;
    params.bucket_id = create_reply.bucket_id;
    params.tier_id = create_reply.tier_id;
    params.chunk_coder_config = create_reply.chunk_coder_config;
    await blow_parts(params);
    let complete_params = _.pick(params, 'bucket', 'key', 'size', 'obj_id');
    complete_params.etag = 'bla';
    dbg.log0('complete_object_upload', params.key);
    await client.object.complete_object_upload(complete_params);
}

async function blow_parts(params) {

    dbg.log0('get_mappings', params.key);

    const mappings = await client.object.get_mapping({
        chunks: _.times(argv.chunks, i => ({
            bucket_id: params.bucket_id,
            tier_id: params.tier_id,
            chunk_coder_config: params.chunk_coder_config,
            size: argv.chunk_size,
            frag_size: argv.chunk_size,
            compress_size: argv.chunk_size,
            digest_b64: crypto.randomBytes(32).toString('base64'),
            cipher_key_b64: crypto.randomBytes(32).toString('base64'),
            cipher_iv_b64: crypto.randomBytes(32).toString('base64'),
            frags: _.times(6, data_index => ({
                data_index,
                digest_b64: crypto.randomBytes(32).toString('base64'),
                blocks: []
            })),
            parts: [{
                obj_id: params.obj_id,
                start: i * argv.chunk_size,
                end: (i + 1) * argv.chunk_size,
                seq: i,
            }]

        }))
    });

    dbg.log0('put_mappings', params.key);
    await client.object.put_mapping(mappings);
}
