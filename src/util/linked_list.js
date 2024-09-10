/* Copyright (C) 2016 NooBaa */
'use strict';

class LinkedList {
    constructor(name) {
        name = name || '';
        this.next = '_lln_' + name;
        this.prev = '_llp_' + name;
        this.head = '_llh_' + name;
        this.length = 0;
        this[this.next] = this;
        this[this.prev] = this;
        this[this.head] = this;
    }

    insert_after(item, new_item) {
        this.check_item(item);
        this.check_new_item(new_item);
        const next = item[this.next];
        new_item[this.next] = next;
        new_item[this.prev] = item;
        new_item[this.head] = this;
        next[this.prev] = new_item;
        item[this.next] = new_item;
        this.length += 1;
        return true;
    }

    insert_before(item, new_item) {
        this.check_item(item);
        this.check_new_item(new_item);
        const prev = item[this.prev];
        new_item[this.next] = item;
        new_item[this.prev] = prev;
        new_item[this.head] = this;
        prev[this.next] = new_item;
        item[this.prev] = new_item;
        this.length += 1;
        return true;
    }

    remove(item) {
        const next = item[this.next];
        const prev = item[this.prev];
        if (!next || !prev) {
            return false; // already removed
        }
        this.check_item(item);
        next[this.prev] = prev;
        prev[this.next] = next;
        item[this.next] = null;
        item[this.prev] = null;
        item[this.head] = null;
        this.length -= 1;
        return true;
    }

    get_next(item) {
        const next = item[this.next];
        return next === this ? null : next;
    }

    get_prev(item) {
        const prev = item[this.prev];
        return prev === this ? null : prev;
    }

    get_front() {
        return this.get_next(this);
    }

    get_back() {
        return this.get_prev(this);
    }

    is_empty() {
        return !this.get_front();
    }

    push_front(item) {
        return this.insert_after(this, item);
    }

    push_back(item) {
        return this.insert_before(this, item);
    }

    pop_front() {
        const item = this.get_front();
        if (item) {
            this.remove(item);
            return item;
        }
    }

    pop_back() {
        const item = this.get_back();
        if (item) {
            this.remove(item);
            return item;
        }
    }

    is_linked(item) {
        return item && item[this.head] === this;
    }

    check_item(item) {
        if (item[this.head] !== this) {
            throw new Error('item not member of this linked list');
        }
    }

    check_new_item(item) {
        if (item[this.head] || item[this.prev] || item[this.next]) {
            throw new Error('new item is already a member of a linked list');
        }
    }

    enum_items() {
        if (this.is_empty()) {
            return '';
        }

        let cur = this.get_front();
        let str = String(cur);
        while (cur) {
            cur = this.get_next(cur);
            str += ', ' + cur;
        }

        return str;
    }
}

module.exports = LinkedList;
