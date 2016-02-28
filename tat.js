/*globals chrome*/
var tab_table = null
,   CURRENT_TABS = []
,   MUTED_TABS = {}
,   TAB_ANCESTRY = {}
,   INDEX_SORTED = true
,   TITLE_SORTED = false
,   TITLE_SORT_DIR = 1
,   DOMAIN_SORTED = false
,   DOMAIN_SORT_DIR = 1
,   DOMAIN_COLORS = {"tagatab": "#cccc00"}
,   PENDING_DOMAIN_FAVICONS = {};

// return Chrome's tab object for a given id, or null if not found
var get_tab_by_id = function (id) {
    id = parseInt(id, 10);
    for (var i = 0; i < CURRENT_TABS.length; i++) {
        if (CURRENT_TABS[i].id === id) {
            return CURRENT_TABS[i];
        }
    }
    return null;
};

// return full domain name (minus www) from full URL
var get_domain_name = function (url) {
    if (url.indexOf("newtab") !== -1) {
        return "tagatab";
    }
    var domain = url.split("/")[2];
    if (domain.indexOf("www.") === 0) {
        domain = domain.slice(4, domain.length);
    }
    if (!domain) {
        domain = "N/A";
    }
    return domain;
};

// remove HTML characters from title
var sanitize_title = function(title) {
    title = String(title).trim()
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return title;
};

// get an appropriate icon URL for local/chrome-protocol links
var get_proper_favicon_url = function (url) {
    if (typeof(url) === "undefined" || url === "" || url.indexOf("chrome") === 0) {
        return chrome.runtime.getURL("img/icon_tab.png");
    }
    return url;
};

// send request to background page to grab favicon
var request_favicon_data = function (url, domain) {
    url = get_proper_favicon_url(url);
    console.log("Requesting " + url);
    chrome.runtime.sendMessage({ "action": "download_favicon"
                               , "url": url
                               , "domain": domain
                               });
};

// update the DOM with info on all open tabs (fires when a tab_list message is
// sent from the background page)
var update_tab_list = function () {
    var tab;
    var tabs = CURRENT_TABS;

    // clear the table
    var tt_parent = tab_table.parentElement;
    var header_row = tab_table.firstElementChild.cloneNode(true);
    var tt_temp = document.createElement("tbody");
    tt_temp.appendChild(header_row);
    tt_parent.appendChild(tt_temp);
    tab_table.remove();
    tab_table = tt_temp;
    setup_sorting();


    for (var index in tabs) {
        if (tabs.hasOwnProperty(index)) {
            tab = tabs[index];
            var domain = get_domain_name(tab.url)
            ,   color;

            if (DOMAIN_COLORS[domain] !== undefined) {
                color = DOMAIN_COLORS[domain];
            } else if (!PENDING_DOMAIN_FAVICONS[domain] && tab.favIconUrl) {
                PENDING_DOMAIN_FAVICONS[domain] = true;
                request_favicon_data(tab.favIconUrl, domain);
            } /* else if (domain == "newtab" && tab.status == "complete") {
                PENDING_DOMAIN_FAVICONS[domain] = true;
                request_favicon_data(tab.favIconUrl, domain);
            } */ else {
                color = "#ffffff";
            }

            
            var temp_tr = tab_table.insertRow(tab_table.rows.length);
            temp_tr.className = "tab_row";
            // create each TD for the row
            var link_td = temp_tr.insertCell(0)
            ,   icon_td = temp_tr.insertCell(1)
            ,   domain_td = temp_tr.insertCell(2)
            ,   info_td = temp_tr.insertCell(3)
            ,   remember_td = temp_tr.insertCell(4)
            ,   social_td = temp_tr.insertCell(5)
            ,   close_td = temp_tr.insertCell(6);

            // construct the tab td
            var tab_link = get_tab_link(tab.id, tab.title, tab.favIconUrl)
            ,   icon = tab_link.lastElementChild; // TODO: FIX THIS BULLSHIT
            link_td.className = "tab_link_cell";
            link_td.appendChild(tab_link);
            link_td.style.backgroundColor = color;
            link_td.style.color = get_text_color(color);

            // construct the icon td
            icon_td.appendChild(icon);

            // construct the domain td
            domain_td.style.backgroundColor = color;
            domain_td.style.color = get_text_color(color);
            domain_td.className = "tab_domain";
            domain_td.appendChild(document.createTextNode(domain));

            get_info_td(tab, info_td);
            
            // 
            var tag_link = get_tag_button(tab.id)
            ,   bookmark_link = get_bookmark_button(tab.id);
            remember_td.appendChild(tag_link);
            remember_td.appendChild(bookmark_link);
            remember_td.appendChild(get_diigo_button(tab.url, tab.title));

            social_td.appendChild(get_twitter_button(tab.url, tab.title));
            social_td.appendChild(get_reddit_button(tab.url, tab.title));
            social_td.appendChild(get_hn_button(tab.url, tab.title));

            close_td.className = "tab_close";
            var close_link = get_close_button(tab.id);
            close_td.appendChild(close_link);

            // add event listeners on click
            tab_link.addEventListener("click", tab_link_handler);
            close_link.addEventListener("click", close_link_handler);
            tag_link.addEventListener("click", tag_link_handler);
            bookmark_link.addEventListener("click", bookmark_link_handler);
        }
    }
};

// TODO: FIGURE THIS THE FUCK OUT
var BOOKMARKS = {};
var obj;
var add_folder_to_elem = function(elem, search, current) {
    /*
    if (typeof(current) === "undefined") {
        current = obj.slice(0);
    }
    if (typeof(current.children) !== "undefined") {
        
    }
    return obj;
    */
};

// TODO: FIGURE THIS THE FUCK OUT
var traverse_bookmark_tree = function(node, elem, _parent, depth) {
    // elem is the datalist object we will be appending to
    if (typeof(elem) === "undefined") {
        elem = document.getElementsByClassName("modal");
    }
    if (typeof(_parent) === "undefined") {
        _parent = null;
    }

    if (typeof(depth) === "undefined") {
        node = node[0];
        depth = 0;
    }
    if (typeof(node.children) !== "undefined") {
        obj = add_folder_to_obj(obj, node);
        for (var j = 0; j < node.children.length; j++) {
            traverse_bookmark_tree(node.children[j], obj, node, depth + 1);
        }
    }
};

// start with c_tab, populate differences from n_tab, return result
var diff_tabs = function (c_tab, n_tab) {
    var new_tab = c_tab;
    for (var i in c_tab) {
        if (c_tab.hasOwnProperty(i)) {
            for (var j in n_tab) {
                if (n_tab.hasOwnProperty(j)) {
                    if (i === j && c_tab[i] !== n_tab[j]) {
                        new_tab[i] = n_tab[j];
                    }
                }
            }
        }
    }
    return new_tab;
};

var update_tabs = function (tabs) {
    var found_new_tab
    ,   found_old_tab
    ,   temp_tabs
    ,   changed = false;
    // if we haven't populated CURRENT_TABS yet, clone the tabs from
    if (CURRENT_TABS.length === 0) {
        CURRENT_TABS = tabs;
        changed = true;
        return changed;
    }
    // clone `CURRENT_TABS` and compare to `tabs`
    temp_tabs = CURRENT_TABS.slice(0);
    for (var new_index in tabs) {
        if (tabs.hasOwnProperty(new_index)) {
            found_new_tab = false;
            for (var cur_index in temp_tabs) {
                if (temp_tabs.hasOwnProperty(cur_index)) {
                    c_tab = temp_tabs[cur_index];
                    n_tab = tabs[new_index];
                    if (c_tab.url === n_tab.url && c_tab.id === n_tab.id) {
                        // duplicate tab
                        found_new_tab = true;
                        new_tab = diff_tabs(c_tab, n_tab);
                        temp_tabs[cur_index] = new_tab;
                        changed = true;
                        break;
                    }
                }
            }
            if (!found_new_tab) {
                tab_sort();
                temp_tabs.push(n_tab);
                changed = true;
            }
        }
    }
    for (var i in temp_tabs) {
        if (temp_tabs.hasOwnProperty(i)) {
            found_old_tab = false;
            for (var j in tabs) {
                if (tabs.hasOwnProperty(j)) {
                    c_tab = temp_tabs[i];
                    n_tab = tabs[j];
                    if (c_tab.url === n_tab.url && c_tab.id === n_tab.id) {
                        found_old_tab = true;
                        break;
                    }
                }
            }
            if (!found_old_tab) {
                var popped = temp_tabs.splice(i, 1);
                changed = true;
            }
        }
    }
    CURRENT_TABS = temp_tabs;
    return changed;
};

// send request to background page for tabs list
var request_tabs = function () {
    chrome.runtime.sendMessage({"action": "request_tabs"});
};

(function () {
    chrome.runtime.onMessage.addListener(message_handler);
    tab_table = document.getElementsByClassName("tab_table")[0].getElementsByTagName("tbody")[0];
    setup_sorting();
    request_tabs();
})();
