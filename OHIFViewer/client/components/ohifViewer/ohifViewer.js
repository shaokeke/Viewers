import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/clinical:router';
import { ReactiveVar } from 'meteor/reactive-var';
import { OHIF } from 'meteor/ohif:core';

Template.ohifViewer.onCreated(() => {
    const instance = Template.instance();
    instance.headerClasses = new ReactiveVar('');
    Session.set("IsStudyListReady", true);;

    const headerItems = [{
        action: () => OHIF.ui.showDialog('serverInformationModal'),
        text: 'Server Information',
        icon: 'fa fa-server fa-lg',
        separatorAfter: true
    }, {
        action: () => OHIF.ui.showDialog('themeSelectorModal'),
        text: 'Themes',
        iconClasses: 'theme',
        iconSvgUse: 'packages/ohif_viewerbase/assets/icons.svg#theme',
        separatorAfter: false
    }, {
        action: () => OHIF.ui.showDialog('userPreferencesDialog'),
        text: 'Preferences',
        icon: 'fa fa-user',
        separatorAfter: true
    }, {
        action: () => OHIF.ui.showDialog('aboutModal'),
        text: 'About',
        icon: 'fa fa-info'
    }];

    const isUserLoggedIn = OHIF.user.userLoggedIn();
    const isDemoUserLoggedIn = OHIF.demoMode && OHIF.demoMode.userLoggedIn();
    if (isUserLoggedIn || isDemoUserLoggedIn) {
        headerItems.push({
            action: isDemoUserLoggedIn ? OHIF.demoMode.logout : OHIF.user.logout,
            text: 'Logout',
            iconClasses: 'logout',
            iconSvgUse: 'packages/ohif_viewerbase/assets/user-menu-icons.svg#logout'
        });
    }

    OHIF.header.dropdown.setItems(headerItems);

    instance.autorun(() => {
        const currentRoute = Router.current();
        if (!currentRoute) return;
        const routeName = currentRoute.route.getName();
        const isViewer = routeName.indexOf('viewer') === 0;

        // Add or remove the strech class from body
        $(document.body)[isViewer ? 'addClass' : 'removeClass']('stretch');

        // Set the header on its bigger version if the viewer is not opened
        instance.headerClasses.set(isViewer ? '' : 'header-big');

        // Set the viewer open state on session
        Session.set('ViewerOpened', isViewer);
    });

    if (OHIF.demoMode && OHIF.demoMode.userLoggedIn()) {
      OHIF.demoMode.setDemoServerConfig();
    } else if (OHIF.gcloud && OHIF.gcloud.isEnabled()) {
        const server = OHIF.servers.getCurrentServer();

        if (!server || !server.isCloud) {
            Session.set("IsStudyListReady", false);
            OHIF.gcloud.showDicomStorePicker({canClose: OHIF.demoMode}).then(config => {
                if (!config) {
                    if (OHIF.demoMode)
                        Router.go('/demo-signin');
                    return;
                }
                OHIF.servers.applyCloudServerConfig(config);
                Session.set("IsStudyListReady", true);
            });
        }
    }
});

Template.ohifViewer.events({
    'click .js-toggle-studyList'(event, instance) {
        event.preventDefault();
        const isViewer = Session.get('ViewerOpened');

        if (isViewer) {
            Router.go('studylist');
        } else {
            const { studyInstanceUids } = OHIF.viewer.data;
            if (studyInstanceUids) {
                Router.go('viewerStudies', { studyInstanceUids });
            }
        }
    },

});

Template.ohifViewer.helpers({
    studyListToggleText() {
        const instance = Template.instance();
        const isViewer = Session.get('ViewerOpened');

        if (isViewer) {
            instance.hasViewerData = true;
            return 'Study list';
        }

        return instance.hasViewerData ? 'Back to viewer' : '';
    },
    isStudyListReady() {
        return !!Session.get('IsStudyListReady');
    }
});
