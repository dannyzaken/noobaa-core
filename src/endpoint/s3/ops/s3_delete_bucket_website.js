/* Copyright (C) 2016 NooBaa */
'use strict';

/**
 * http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketDELETEwebsite.html
 */
function delete_bucket_website(req) {
    return req.object_sdk.read_bucket({ name: req.params.bucket })
        .then(bucket_info => {
            // TODO S3 delete_bucket_website not implemented
        });
}

module.exports = {
    handler: delete_bucket_website,
    body: {
        type: 'empty',
    },
    reply: {
        type: 'empty',
    },
};
