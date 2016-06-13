define(function(require) {
    var template = require('text!templates/plugins/dev/fquerysandbox.hbs'),
        pm = require('utils/pluginmanager'),
        fhelpers = require('utils/fountain/helpers'),
        data = require('modules/data'),
        queries = require('modules/queries'),
        fquery = require('utils/fountain/query'),
        helper = require('utils/helper');

    var plugin = pm.create_plugin('dev/fquerysandbox', 'fquery', template);

    plugin.activate = function() {
        window.data = data;
        window.fquery = fquery;
        window.fhelpers = fhelpers;
        window.helper = helper;
        window.queries = queries;
    };

    return plugin;
});