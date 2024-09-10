/* Copyright (C) 2016 NooBaa */
'use strict';

/**
 * This script is used as a part of the CI/CD process to run all Ceph S3 tests On NSFS standalone.
 * It creates the prior configuration needed.
 * In the past this script was a part of file test_ceph_s3.
 */

const dbg = require('../../../util/debug_module')(__filename);
dbg.set_process_name('test_ceph_s3');

const fs = require('fs');
const os_utils = require('../../../util/os_utils');
const test_utils = require('../../system_tests/test_utils');
const {
    TYPES,
    ACTIONS,
} = require('../../../manage_nsfs/manage_nsfs_constants');
const { CEPH_TEST } = require('./test_ceph_s3_constants.js');

async function main() {
    try {
        await run_test();
    } catch (err) {
        console.error(`Ceph Setup Failed: ${err}`);
        process.exit(1);
    }
    process.exit(0);
}

async function run_test() {
    try {
        await ceph_test_setup();
    } catch (err) {
        console.error('Failed setup Ceph tests', err);
        throw new Error('Failed setup Ceph tests');
    }
}

async function ceph_test_setup() {
    console.info(
        `Updating ${CEPH_TEST.ceph_config} with host = ${process.env.S3_SERVICE_HOST}...`,
    );
    // update config with the s3 endpoint
    const conf_file = `${CEPH_TEST.test_dir}${CEPH_TEST.ceph_config}`;
    const conf_file_content = (
        await fs.promises.readFile(conf_file)
    ).toString();
    const new_conf_file_content = conf_file_content.replace(
        /host = localhost/g,
        `host = ${process.env.S3_SERVICE_HOST}`,
    );
    await fs.promises.writeFile(conf_file, new_conf_file_content);
    console.log('conf file updated');

    console.info(
        'CEPH TEST CONFIGURATION: CREATE ACCOUNTS',
        JSON.stringify(CEPH_TEST),
    );
    await create_account(CEPH_TEST.nc_cephalt_account_params);
    await create_account(CEPH_TEST.nc_cephtenant_account_params);
    await create_account(CEPH_TEST.nc_anonymous_account_params);

    console.info(
        'CEPH TEST CONFIGURATION: GET ACCESS KEYS',
        JSON.stringify(CEPH_TEST),
    );
    const cephalt_access_keys = await get_access_keys(
        CEPH_TEST.nc_cephalt_account_params.name,
    );
    const cephalt_access_key = cephalt_access_keys.access_key;
    const cephalt_secret_key = cephalt_access_keys.secret_key;

    await os_utils.exec(
        `echo access_key = ${cephalt_access_key} >> ${CEPH_TEST.test_dir}${CEPH_TEST.ceph_config}`,
    );
    await os_utils.exec(
        `echo secret_key = ${cephalt_secret_key} >> ${CEPH_TEST.test_dir}${CEPH_TEST.ceph_config}`,
    );

    const cephtenant_access_keys = await get_access_keys(
        CEPH_TEST.nc_cephtenant_account_params.name,
    );
    const cephtenant_access_key = cephtenant_access_keys.access_key;
    const cephtenant_secret_key = cephtenant_access_keys.secret_key;

    if (os_utils.IS_MAC) {
        await os_utils.exec(
            `sed -i "" "s|tenant_access_key|"${cephtenant_access_key}"|g" ${CEPH_TEST.test_dir}${CEPH_TEST.ceph_config}`,
        );
        await os_utils.exec(
            `sed -i "" "s|tenant_secret_key|${cephtenant_secret_key}|g" ${CEPH_TEST.test_dir}${CEPH_TEST.ceph_config}`,
        );
    } else {
        await os_utils.exec(
            `sed -i -e 's:tenant_access_key:${cephtenant_access_key}:g' ${CEPH_TEST.test_dir}${CEPH_TEST.ceph_config}`,
        );
        await os_utils.exec(
            `sed -i -e 's:tenant_secret_key:${cephtenant_secret_key}:g' ${CEPH_TEST.test_dir}${CEPH_TEST.ceph_config}`,
        );
        await os_utils.exec(
            `sed -i -e 's:s3_access_key:${cephalt_access_key}:g' ${CEPH_TEST.test_dir}${CEPH_TEST.ceph_config}`,
        );
        await os_utils.exec(
            `sed -i -e 's:s3_secret_key:${cephalt_secret_key}:g' ${CEPH_TEST.test_dir}${CEPH_TEST.ceph_config}`,
        );
    }
    console.info('CEPH TEST CONFIGURATION: DONE');
}

/**
 * get_access_keys returns account access keys using noobaa-cli
 * @param {string} account_name
 */
async function get_access_keys(account_name) {
    const options = { name: account_name, show_secrets: true };
    const res = await test_utils.exec_manage_cli(
        TYPES.ACCOUNT,
        ACTIONS.STATUS,
        options,
    );
    const json_account = JSON.parse(res);
    const account_data = json_account.response.reply;
    return account_data.access_keys[0];
}

/**
 * create_account creates accounts using noobaa-cli
 * @param {{ name?: string, uid?: number, gid?: number, anonymous?: boolean }} [options]
 */
async function create_account(options = {}) {
    const res = await test_utils.exec_manage_cli(
        TYPES.ACCOUNT,
        ACTIONS.ADD,
        options,
    );
    console.log('Account Created', res);
}

if (require.main === module) {
    main();
}
