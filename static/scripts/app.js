/*global Callbacks*/
document.addEventListener('DOMContentLoaded', function () {
    "use strict";
    var container = document.getElementById('callbacks'),
        callbacks;
    if (container) {
        callbacks = new Callbacks(container, window.location.href);
    }
});
