/* Copyright (C) 2016 NooBaa */

import ko from 'knockout';
import {
    getHostDisplayName,
    getHostStateIcon,
    getNodeOrHostCapacityBarValues
} from 'utils/host-utils';

export default class HostRowViewModel {
    constructor({ onToggle }) {
        this.name = '';
        this.displayName = ko.observable();
        this.state = ko.observable();
        this.ip = ko.observable();
        this.capacity = ko.observable();
        this.pool = ko.observable();

        // This computed is used as a glue with table checkbox-cell
        // A better approch will be a cell implementation that communicate
        // via events instead of observables.
        this._selected = ko.observable();
        this.selected = ko.pureComputed({
            read: this._selected,
            write: val => onToggle(this.name, val)
        });
    }

    onHost(host, selectedHosts) {
        const { name, ip, pool } = host;

        this.name = name;
        this.displayName(getHostDisplayName(name));
        this.state(getHostStateIcon(host));
        this.ip(ip);
        this.capacity(getNodeOrHostCapacityBarValues(host));
        this.pool({ text: pool, tooltip: pool });
        this._selected(selectedHosts.includes(name));
    }
}
