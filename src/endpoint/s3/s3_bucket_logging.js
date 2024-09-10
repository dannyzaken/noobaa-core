/* Copyright (C) 2016 NooBaa */
'use strict';

const dbg = require('../../util/debug_module')(__filename);
const http_utils = require('../../util/http_utils');
const dgram = require('node:dgram');
const { Buffer } = require('node:buffer');
const config = require('../../../config');

async function send_bucket_op_logs(req, res) {
    if (req.params && req.params.bucket && req.op_name !== 'put_bucket') {
        const bucket_info = await req.object_sdk.read_bucket_sdk_config_info(
            req.params.bucket,
        );
        dbg.log2('read_bucket_sdk_config_info =  ', bucket_info);

        if (is_bucket_logging_enabled(bucket_info)) {
            dbg.log2(
                'Bucket logging is enabled for Bucket : ',
                req.params.bucket,
            );
            await endpoint_bucket_op_logs(req.op_name, req, res, bucket_info);
        }
    }
}

function is_bucket_logging_enabled(source_bucket) {
    if (!source_bucket || !source_bucket.bucket_info.logging) {
        return false;
    }
    return true;
}

// UDP socket

const create_syslog_udp_socket = (() => {
    let client;
    let url;
    let port;
    let hostname;
    return function (syslog) {
        if (!client) {
            client = dgram.createSocket('udp4');
            process.on('SIGINT', () => {
                client.close();
                process.exit();
            });
        }
        if (!url) {
            url = new URL(syslog);
            port = parseInt(url.port, 10);
            hostname = url.hostname;
        }
        return { client, port, hostname };
    };
})();

async function endpoint_bucket_op_logs(op_name, req, res, source_bucket) {
    // 1 - Get all the information to be logged in a log message.
    // 2 - Format it and send it to log bucket/syslog.
    const s3_log = get_bucket_log_record(op_name, source_bucket, req, res);
    dbg.log1('Bucket operation logs = ', s3_log);

    switch (config.BUCKET_LOG_TYPE) {
        case 'PERSISTENT': {
            await req.bucket_logger.append(JSON.stringify(s3_log));
            break;
        }
        default: {
            send_op_logs_to_syslog(
                req.object_sdk.rpc_client.rpc.router.syslog,
                s3_log,
            );
        }
    }
}

function send_op_logs_to_syslog(syslog, s3_log) {
    const buffer = Buffer.from(JSON.stringify(s3_log));
    const { client, port, hostname } = create_syslog_udp_socket(syslog);
    if (client && port && hostname) {
        client.send(buffer, port, hostname, err => {
            if (err) {
                dbg.log0('failed to send udp err = ', err);
            }
        });
    } else {
        dbg.log0(
            `Could not send bucket logs: client: ${client} port: ${port} hostname:${hostname}`,
        );
    }
}

function get_bucket_log_record(op_name, source_bucket, req, res) {
    const client_ip = http_utils.parse_client_ip(req);
    let status_code = 102;
    if (res && res.statusCode) {
        status_code = res.statusCode;
    }
    const log = {
        noobaa_bucket_logging: 'true',
        op: req.method,
        bucket_owner: source_bucket.bucket_owner,
        source_bucket: req.params.bucket,
        object_key: req.originalUrl,
        log_bucket: source_bucket.bucket_info.logging.log_bucket,
        log_prefix: source_bucket.bucket_info.logging.log_prefix,
        remote_ip: client_ip,
        request_uri: req.originalUrl,
        http_status: status_code,
        request_id: req.request_id,
    };

    return log;
}

exports.is_bucket_logging_enabled = is_bucket_logging_enabled;
exports.endpoint_bucket_op_logs = endpoint_bucket_op_logs;
exports.get_bucket_log_record = get_bucket_log_record;
exports.send_bucket_op_logs = send_bucket_op_logs;
