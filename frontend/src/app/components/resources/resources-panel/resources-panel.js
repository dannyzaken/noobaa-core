/* Copyright (C) 2016 NooBaa */

import template from './resources-panel.html';
import ConnectableViewModel from 'components/connectable';
import ko from 'knockout';
import  { realizeUri } from 'utils/browser-utils';

class ResourcesPanelViewModel extends ConnectableViewModel  {
    baseRoute = ko.observable();
    selectedTab = ko.observable();

    selectState(state) {
        return [
            state.location
        ];
    }

    mapStateToProps(location) {
        const { system, tab = 'pools' } = location.params;

        ko.assignToProps(this, {
            baseRoute: realizeUri(location.route, { system }, {}, true),
            selectedTab: tab
        });
    }

    tabHref(tab) {
        const route = this.baseRoute();
        return route ? realizeUri(route, { tab }) : '';
    }
}

export default {
    viewModel: ResourcesPanelViewModel,
    template: template
};
