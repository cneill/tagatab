var current_window = null;
var tat_tab_id = null;
var pending_tabs = [];
var TAB_ANCESTRY = {};
var known_tab_ids = [];

// HELPER METHODS

// if there is already a tat tab open, switch to it. otherwise, create one
var switch_to_tat_tab = function() {
    var url = chrome.extension.getURL("tat.html");
    if (tat_tab_id) {
        try {
            chrome.tabs.update(tat_tab_id, {"active": true});
        } catch (e) {
            tat_tab_id = null;
        }
    } else {
        chrome.tabs.create({url: url}, function (tab) {
            tat_tab_id = tab.id; 
        });
    }
};

// clean up title and mark match when searching in url bar
var prepare_title = function (title, search_text) {
    replace = ["&", '"', "'", "<", ">"];
    replacement = ["&amp;", "&quot;", "&apos;", "&lt;", "&gt;"]; 
    for (var i in replace) {
        title = title.replace(replace[i], replacement[i]);
    }
    index = title.toLowerCase().indexOf(search_text.toLowerCase());
    tagged_title = title.slice(0, index) + "<match>" + title.slice(index, index + search_text.length) + "</match>" + title.slice(index + search_text.length, title.length);
    return tagged_title;
};

var update_tabs = function (_id, callback) {
    if (!_id) {
        return;
    }
    chrome.windows.getCurrent({"populate": true}, function (window) {
        current_window = window; 
        if (tat_tab_id === null) {
            tat_tab_id = _id;
        } else if (_id !== tat_tab_id) {
            old_tat_tab_id = tat_tab_id;
            tat_tab_id = _id;
            switch_to_tat_tab();
            chrome.tabs.remove(old_tat_tab_id);
            return;
        }
        tabs = current_window.tabs;
        chrome.tabs.sendMessage(_id, {"type": "tab_list", "tabs": tabs, "ancestry": TAB_ANCESTRY});

        // keep "known_tab_ids" up-to-date (adding and removing as necessary)
        for (var i in tabs) {
            if (known_tab_ids.indexOf(tabs[i].id) === -1) {
                known_tab_ids.push(tabs[i].id);
            }
        }
        for (var j in known_tab_ids) {
            var found = false;
            for (var k in tabs) {
                if (tabs[k].id === known_tab_ids[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                delete known_tab_ids[j];
            }
        }
        /*
        if(typeof(callback) === "function") {
            callback(current_window.tabs);
        }
        */
    });
};
// AHHHHH WTF IS THIS
var update_ancestry_tree = function (_id, parent_id) {
    if (!TAB_ANCESTRY[_id]) {
        if (typeof parent_id === "undefined") {
            TAB_ANCESTRY[_id] = {"parent": null, "children": []};
        } else if (TAB_ANCESTRY[parent_id]) {
            TAB_ANCESTRY[parent_id].children.push(_id);
            TAB_ANCESTRY[_id] = {"parent": parent_id, "children": []};
        } else {
            TAB_ANCESTRY[parent_id] = {"parent": null, "children": [_id]};
            TAB_ANCESTRY[_id] = {"parent": parent_id, "children": []};
        }
    } else {
        if (typeof parent_id === "undefined") {
            // do nothing, orphan
            return;
        } else if (TAB_ANCESTRY[parent_id] && TAB_ANCESTRY[parent_id].children.indexOf(_id) === -1) {
            TAB_ANCESTRY[parent_id].children.push(_id);
        } else if (!TAB_ANCESTRY[parent_id]) {
            TAB_ANCESTRY[parent_id] = {"parent": parent_id, "children": [_id]};
            TAB_ANCESTRY[_id].parent = parent_id;
        } else {
            // do nothing, we got it
            return;
        }
    }
};

// AHHHHH WTF IS THIS
var update_tab_ancestry = function (details) {
    if (known_tab_ids.indexOf(details.sourceTabId) !== -1) {
        update_ancestry_tree(details.tabId, details.sourceTabId);
    } else {
        update_ancestry_tree(details.sourceTabId);
        update_ancestry_tree(details.tabId, details.sourceTabId);
        known_tab_ids.push(details.sourceTabId);
    }
    known_tab_ids.push(details.tabId);
    pending_tabs.pop(pending_tabs.indexOf(details.tabId));
};

var set_up_event_listeners = function () {
    chrome.browserAction.onClicked.addListener(function(tab) {
        switch_to_tat_tab();
    });

    // from https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa
    function utf8_to_b64(str) {
        return window.btoa(unescape(encodeURIComponent(str)));
    }

    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        var callback = sendResponse;
        var msg = message;
        if (msg.action === "request_tabs") {
            if (sender.tab.id) {
                update_tabs(sender.tab.id);
            }
        } else if (msg.action === "switch_tab") {
             chrome.tabs.update(msg.tab_id, {"active": true});
        } else if (msg.action === "close_tab") {
            // tab_ids should be integer or array of integers
            chrome.tabs.remove(msg.tab_ids);
        } else if (msg.action === "bookmark_tab") {
            chrome.bookmarks.getTree(function (tree) {
                callback({ "type": "bookmark_tree"
                         , "bookmark_tree": tree
                         , "focused_tab_id": msg.focused_tab_id
                         });
            });
            return true;
        } else if (message.action === "get_domain_colors") {
            chrome.storage.sync.get(msg.domain + "_colors", function (result) {
                if (result[msg.domain + "_colors"]) {
                    callback({"colors": result[msg.domain + "_colors"]});
                } else {
                    callback({"colors": null});
                }
            });
            return true;
        } else if (msg.action === "set_domain_colors") {
            colors = {};
            colors[msg.domain + "_colors"] = msg.colors;
            chrome.storage.sync.set(colors);
        } else if (msg.action === "download_favicon") {
            // USE AJAX TO DOWNLOAD THE FAVICON
            // THIS IS WHY WE NEED THE http://* AND https://* PERMISSIONS!
            // with help from https://stackoverflow.com/questions/20035615/using-raw-image-data-from-ajax-request-for-data-uri
            var xhr = new XMLHttpRequest();
            var url;
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    var arr = new Uint8Array(this.response);
                    // var raw = String.fromCharCode.apply(null,arr);
                    var raw = "";
                    var i,j,subArray,chunk = 5000;
                    for (i=0,j=arr.length; i<j; i+=chunk) {
                       subArray = arr.subarray(i,i+chunk);
                       raw += String.fromCharCode.apply(null, subArray);
                    }
                    var b64 = btoa(raw);                   
                    var data_url = "data:image/x-icon;base64," + b64;
                    callback({ "type": "favicon_data"
                             , "url": data_url
                             , "domain": msg.domain
                             , "orig_url": msg.url
                             });
                }
            };
            xhr.responseType = "arraybuffer";
            url = msg.url;
            xhr.open("GET", url, true);
            xhr.send();
            return true;
        } else if (msg.action === "mute_toggle") {
            chrome.tabs.update(msg.id, {"muted": msg.mute_status});
        }
    });

    // TAB UPDATE EVENTS
    chrome.tabs.onCreated.addListener(function (tab) {
        if (tab.url === "newtab" && tat_tab_id && tab.id !== tat_tab_id) {
            switch_to_tat_tab();
            chrome.tabs.remove(tab.id);
            update_tabs(tat_tab_id);
            return;
        }
        pending_tabs.push(tab.id);
        update_tabs(tat_tab_id);
    });

    chrome.tabs.onUpdated.addListener(function (tab_id, change_info, tab) {
        if (tab_id === tat_tab_id && change_info.url) {
            tat_tab_id = null;
            console.log(tab_id, change_info);
            return;
        }
        update_tabs(tat_tab_id);
    });

    chrome.tabs.onRemoved.addListener(function (tab_id, remove_info) {
        if (tab_id === tat_tab_id) {
            tat_tab_id = null;
        } else {
            update_tabs(tat_tab_id);
        }
    });

    chrome.tabs.onReplaced.addListener(function (added, removed) {
        if (removed === tat_tab_id) {
            tat_tab_id = null;
        } else {
            update_tabs(tat_tab_id);
        }
    });

    // TRYING TO CATCH NEW TAB CREATION
    chrome.webNavigation.onCreatedNavigationTarget.addListener(function (details) {
        console.log("hayooo");
        update_tab_ancestry(details);
    });

    // OMNIBOX EVENTS
    chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
        update_tabs();
        text = text.toLowerCase();
        tabs = current_window.tabs;
        suggestions = [];

        for (var i in tabs) {
            title = tabs[i].title;

            if (title.toLowerCase().indexOf(text) !== -1) {
                tagged_title = prepare_title(title, text);
                temp = {"content": title, "description": tagged_title};
                suggestions.push(temp);
            }
        }
        suggest(suggestions);
    });

    chrome.omnibox.onInputEntered.addListener(function (text, disposition) {
        switched = false;
        tabs = current_window.tabs;
        for (var i in tabs) {
            if (tabs[i].title === text) {
                chrome.tabs.update(tabs[i].id, {"active": true});
                switched = true;
            }
        }
        if (!switched) {
            switch_to_tat_tab();
        }
    });
};

(function () {
    chrome.omnibox.setDefaultSuggestion({"description": "Switch to TAT tab"});
    set_up_event_listeners();
})();
