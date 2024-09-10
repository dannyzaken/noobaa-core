# NSFS Versioning

## OVERVIEW

NooBaa NSFS versioning feature is used for keeping multiple variants of an object in the same NSFS bucket. A user can use the NSFS Versioning feature to preserve, retrieve, and restore every version of every object stored in a versioning-enabled bucket. S3 WORM locking feature is based on versioned enabled buckets.

## GOALS

- Maintain a directory tree of the NSFS bucket
- Support S3 versioning API for NSFS buckets -
  - Bucket API -
    - Get bucket versioning mode
    - Set bucket versioning mode
  - Object API -
    - List objects
    - List object versions
    - Put object/Complete multipart upload
    - Delete object/Delete multiple objects of latest version/a given version
    - Get object/Head object of latest version/a given version

## SOLUTION

The Versioning implementation consists of lazy creation of a hidden sub-directory that will contain all versions of all objects under the parent directory except the latest version.
The latest version will be located in the parent directory itself.

### PROPOSED SOLUTION DIAGRAM

The following diagram illustrates a directory tree of a versioning-enabled bucket

![Example of a directory '/' with versioning enabled bucket with one object 'Obj1' and one subdirectory 'folder1/' and inside it there's 'Obj2'. For each directory there are the previous versions inside '.versions/'](/docs/design/images/nsfs_versioning_dir_tree.png)

In the figure, each original directory contains a hidden .versions/ sub- directory that stores past versions of objects located under the parent directory, while the latest version of each object can be found under the parent directory itself. For instance, the latest version of Obj1 can be found under the root directory (/), while the old versions of Obj1 reside under /.versions/.

## CONCEPTS

- Objects that are stored in a bucket before you set the versioning state have a version ID of null.
- Objects that are stored in a bucket after you set the versioning state have a unique version ID.
- Objects that are stored in a bucket after you suspended the versioning state have a version ID of null.

#### When versioning is enabled:

- PUT, POST and COPY operations will create a new version of the object identified by a unique version ID.
- DELETE latest version will create a delete marker which is a dummy version identified by a unique version ID as well.
- DELETE version ID will delete the version completely.

#### When versioning is suspended:

- PUT, POST and COPY operations will create a version ID of null.
- DELETE latest version will create a delete marker which is a dummy version with a version ID of null.
- DELETE version ID will delete the version completely.

### Version ID

- Will be allocated to a version on PUT/POST request (or DELETE version ID).
- Consisted of the version mtimeMS + inode number.
- The version ID will be attached as an xattr of the file.
- When a latest version is moved to past versions directory, the file name will be changed from key to key\_{version_id}.

### Delete marker

- A dummy file that will be created under the hidden .versions/ sub-directory on DELETE latest request.
- When A delete marker is the latest version of an object, it indicates that the object is deleted.
- A unique version ID will be allocated to the delete marker as for regular versions.

### Posix safe rename

#### In the following cases NooBaa will move files between a directory and its .versions/ directory:

- Put object / Complete multipart upload - A new latest version will be created and the current latest version should move to .versions/.
- Delete latest version - The latest version should move from the parent directory to .versions/ & a delete marker will be created in .versions as well.
- Delete version ID (latest version & regular version) - The current latest version should be removed and the second latest should move from .versions/ to the parent directory.
- Delete version ID (latest version & a delete marker) - The current latest version should be removed and if the second latest is not a delete marker it should move from .versions/ to the parent directory.
  See - https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html

In order to support best effort on scale of these scenarios, for POSIX file systems, we will use the following methods -

#### Safe link

```
1. stat_res1 = stat path1
2. link path1 path2
3. stat_res2 = stat path2
4. if stat_res1.inode_number != stat_res2.inode_number OR stat_res1.mtimeMs != stat_res2.mtimeMs -
    4.1. unlink path2
    4.2. retry
```

#### Safe unlink

```
1. stat_res1 = stat path
2. mv path unique_tmp_path
3. stat_res2 = stat unique_tmp_path
4. if stat_res1.inode_number != stat_res2.inode_number OR stat_res1.mtimeMs != stat_res2.mtimeMs -
    4.1. link unique_tmp_path path
    4.2. retry
5. else - unlink unique_tmp_path
```

## OUT OF SCOPE

### TODO

- Add GPFS design.
- Versioning on objects that their name ends with '/' (in the file system it looks like a directory).
