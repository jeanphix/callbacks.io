/*global Handlebars, JST*/
var Callbacks = (function () {
    "use strict";
    Handlebars.registerHelper('keyvalue', function (obj, options) {
        var buffer = "",
            key;
        Array.prototype.forEach.call(Object.keys(obj), function (key) {
            buffer += options.fn({key: key, value: obj[key]});
        });

        return buffer;
    });

    var Callbacks = function (element, url) {
        this.element = element;
        this.url = url + '/callbacks/';
        this.callbacks = {};
        this.count = 0;
        this.init();
    };

    Callbacks.prototype.init = function () {
        self.loadCallback();
    };

    Callbacks.prototype.xhr = function (url, next, range) {
        var http = new XMLHttpRequest();

        http.open('GET', url);
        http.setRequestHeader('Accept', 'application/json');

        if (typeof range !== 'undefined') {
            http.setRequestHeader('Range', range);
        }

        http.onreadystatechange = function () {
            var payload;
            if (this.readyState === this.DONE) {
                payload = JSON.parse(this.response.toString());
                next(payload, this);
            }
        };

        http.send();
    };

    Callbacks.prototype.loadCallback = function (url) {
        var self = this,
            callback = this.callbacks[url],
            index,
            offset,
            range,
            renderCallback = function (callback) {
                self.render(callback);
            };

        if (typeof callback !== 'undefined') {
            return renderCallback(callback);
        }

        // We don't have it, lets load 10 mores.
        if (typeof url !== 'undefined') {
            index = parseInt(url.match(/\/([0-9]{1,})$/)[1], 10);
            offset = self.count - index - 1;
            range = 'items=' + offset.toString() + '-' + (offset + 9).toString();
        }

        this.xhr(this.url, function (callbacks, response) {
            var contentRangeHeader = response.getResponseHeader('Content-Range');
            self.count = parseInt(contentRangeHeader.match(/\/([0-9]{1,})$/)[1], 10);
            if (callbacks.length > 0) {
                self.storeCallbacks(callbacks);
                if (typeof url !== 'undefined') {
                    return self.loadCallback(url);
                }
                return renderCallback(callbacks[0]);
            }
        }, range);
    };

    Callbacks.prototype.storeCallback = function (callback) {
        this.callbacks[callback.url] = callback;
    };

    Callbacks.prototype.storeCallbacks = function (callbacks) {
        var self = this;
        Array.prototype.forEach.call(callbacks, function (callback) {
            self.storeCallback(callback);
        });
    };

    Callbacks.prototype.render = function (callback) {
        var self = this,
            links;

        callback.handler.callbacks_count = this.count;

        this.element.innerHTML = JST['views/partials/callback.hbs'](callback);
        links = this.element.querySelectorAll('a');
        Array.prototype.forEach.call(links, function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                self.loadCallback(link.getAttribute('href'));
            });
        });
    };

    Callbacks.prototype.getHost = function (url) {
        var parser = document.createElement('a');
        parser.href = url;
        return parser.protocol + '//' + parser.host;
    };

    return Callbacks;
}());
