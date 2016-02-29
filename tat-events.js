// Event handlers for click events (called in tat.js)

var tab_link_handler = function () {
    chrome.runtime.sendMessage({"action": "switch_tab", "tab_id": parseInt(this.id, 10)});
};

var close_link_handler = function () {
    chrome.runtime.sendMessage({"action": "close_tab", "tab_ids": parseInt(this.id, 10)});
    request_tabs();
};

var bookmark_link_handler = function () {
    chrome.runtime.sendMessage({"action": "bookmark_tab",  "focused_tab_id": parseInt(this.id, 10)}, 
        function (resp) {
            bookmark_message_handler(resp.bookmark_tree, resp.focused_tab_id);
        });
};

// close the active modal if the user clicks outside of it
var window_click_handler = function (e) {
    if (e.target === get_active_modal()) {
        close_active_modal(); 
    }
};

// responds to bookmark_tree message from background.js
var bookmark_message_handler = function (tree, id) {
    //bookmark_tree = traverse_bookmark_tree(tree);
    var tab = get_tab_by_id(id);
    modal_template = document.getElementById("bookmark-modal-template");
    bookmark_modal = get_modal_node(tab, modal_template.cloneNode(true), "bookmark");
    bookmark_modal.style.display = "block";
    document.body.appendChild(bookmark_modal);
    bookmark_modal.getElementsByClassName("bookmark-folder")[0].focus();
    window.onclick = window_click_handler;
};

// open a modal when a tab's tag button is clicked
var tag_link_handler = function () {
    var tab = get_tab_by_id(this.id);    
    modal_template = document.getElementById("tag-modal-template");
    tag_modal = get_modal_node(tab, modal_template.cloneNode(true), "tags");
    tag_modal.style.display = "block";
    document.body.appendChild(tag_modal);
    tag_modal.getElementsByClassName("tags-list")[0].focus();
    window.onclick = window_click_handler;
};

var save_tags = function (data) {
    var dat = {};
    dat[data.url] = data;
    chrome.storage.sync.set(dat, function () {
        console.log("saved :)");
    });
    chrome.storage.sync.get(null, function (items) {
        console.dir(items);    
    });
};

// get the active modal window element, if any
var get_active_modal = function () {
    var modals = document.getElementsByClassName("modal");
    for (var m = 0; m < modals.length; m++) {
        if (modals[m].style.display === "none") {
            continue;
        } else if (modals[m].id.indexOf("modal-template") === -1) {
            return modals[m];
        }
    }
    return null;
};

// close the active modal (if any)
var close_active_modal = function() {
    var active_modal = get_active_modal();
    if (!active_modal) {
        return;
    }
    active_modal.style.display = "none";
    active_modal.parentElement.removeChild(active_modal);
    window.onclick = null;
};

// toggle audio muting for a given tab
var mute_toggle = function (_id, mute_status) {
    chrome.runtime.sendMessage({"action": "mute_toggle", "id": parseInt(_id, 10), "mute_status": mute_status});
};

// handle the audible / mute button on click
var audible_handler = function () {
    if (this.className.indexOf("volume-up") !== -1) {
        this.className = "fa fa-volume-off clicky";
        id = this.parentElement.parentElement.getElementsByClassName("tab_link")[0].id;
        mute_toggle(id, true);
        tat_conf.muted[id] = true;
    } else {
        this.className = "fa fa-volume-up clicky";
        id = this.parentElement.parentElement.getElementsByClassName("tab_link")[0].id;
        mute_toggle(id, false);
        tat_conf.muted[id] = false;
    }
};

// event handler for new messages from background page
var message_handler = function (request, sender, sendResponse) {
    // we got a list of tabs from the background page
    if (request.type === "tab_list") {
        temp_tabs = request.tabs.slice(0); // clone the tabs
        tat_conf.ancestry = request.ancestry;
        var changed = update_tabs(temp_tabs);
        if (changed) {
            tab_sort();
            update_tab_list();
        }
    }
};
