/*global chrome, MUTED_TABS*/
var get_tab_link = function (id, title, favicon) {
    return get_link({ "type": "tab"
                    , "id": id
                    , "title": title
                    , "class_name": "tab_link"
                    , "icon": { "type": "img"
                              , "url": get_proper_favicon_url(favicon)
                              , "alt": "Tab"
                              , "class_name": "tab_favicon"
                              }
                    });
};

var get_diigo_button = function (url, title) {
    return get_link({ "type": "diigo"
                    , "url": "http://www.diigo.com/post?url=" + encodeURIComponent(url) + "&title=" + encodeURIComponent(title)
                    , "class_name": "tab_diigo_link"
                    , "target": "_blank"
                    , "icon": { "type": "img"
                              , "url": chrome.runtime.getURL("img/diigo.png")
                              , "alt": "Add this tab to Diigo"
                              , "class_name": "tab_diigo_icon"
                              }
                    });
};

var get_twitter_button = function (url, title) {
    return get_link({ "type": "twitter"
                    , "url": "https://twitter.com/intent/tweet?text=" + encodeURIComponent(title + " - " + url)
                    , "class_name": "tab_twitter_link"
                    , "target": "_blank"
                    , "icon": { "type": "fa"
                              , "alt": "Tweet this tab"
                              , "class_name": "tab_twitter_icon fa fa-twitter"
                              , "color": "cornflowerblue"
                              }
                    });
};

var get_reddit_button = function (url, title) {
    return get_link({ "type": "reddit"
                    , "url": "https://www.reddit.com/submit?title=" + encodeURIComponent(title) + "&url=" + encodeURIComponent(url)
                    , "class_name": "tab_reddit_link"
                    , "target": "_blank"
                    , "icon": { "type": "fa"
                              , "alt": "Submit this to reddit"
                              , "class_name": "tab_reddit_icon fa fa-reddit"
                              , "color": "#777777"
                              }
                    });
};

var get_hn_button = function (url, title) {
    return get_link({ "type": "hn"
                    , "url": "https://news.ycombinator.com/submitlink?u=" + encodeURIComponent(url) + "&t=" + encodeURIComponent(title)
                    , "class_name": "tab_hn_link"
                    , "target": "_blank"
                    , "icon": { "type": "fa"
                              , "alt": "Submit this to Hacker News"
                              , "class_name": "tab_hn_icon fa fa-hacker-news"
                              , "color": "#ff6600"
                              }
                    });
};



var get_tag_button = function (id) {
    return get_link({ "type": "tag"
                    , "id": id
                    , "class_name": "tab_tag_link"
                    , "icon": { "type": "fa"
                              , "alt": "Tag this tab"
                              , "class_name": "tab_tag_icon fa fa-hashtag"
                              , "color": "#bbee00"
                              }
                    });
};

var get_bookmark_button = function (id) {
    return get_link({ "type": "bookmark"
                    , "id": id
                    , "class_name": "tab_bookmark_link"
                    , "icon": { "type": "fa"
                              , "alt": "Bookmark this tab"
                              , "class_name": "tab_bookmark_icon fa fa-bookmark"
                              , "color": "#ff0000"
                              }
                    });
};

var get_close_button = function (id) {
    return get_link({ "type": "close"
                    , "id": id
                    , "icon": { "type": "fa"
                              , "alt": "Close this tab"
                              , "class_name": "tab_close_icon fa fa-close" 
                              , "color": "#ff0000"
                              }
                    , "class_name": "tab_close_link"
                    });
};

var get_fa_icon = function (_class, color) {
    var fa_ico = document.createElement("i");
    fa_ico.className = _class;
    if (typeof color !== "undefined") {
        fa_ico.style.color = color;
    }
    return fa_ico;
};

var get_link = function (opts) {
    // types = ["tab", "close", "bookmark", "tag", "diigo", "twitter", "reddit"]
    var temp_link, temp_icon;

    var url    = typeof(opts.url) === "undefined" ? "#" : opts.url
    ,   title  = typeof(opts.title) === "undefined" ? "" : opts.title
    ,   icon   = typeof(opts.icon) === "undefined" ? {} : opts.icon
    ,   type   = typeof(opts.type) === "undefined" ? "tab" : opts.type
    ,   id     = typeof(opts.id) === "undefined" ? "" : opts.id
    ,   target = typeof(opts.target) === "undefined" ? "" : opts.target
    ,   class_name = typeof(opts.class_name) === "undefined" ? "" : opts.class_name;

    if (!type) {
        return null;
    }

    if (url === "#") {
        temp_link = document.createElement("span");
        temp_link.className = "clicky " + class_name;
    } else {
        temp_link = document.createElement("a");
        temp_link.href = url;
        temp_link.className = class_name;
        temp_link.target = target;
    }

    temp_link.title = title;

    if (id) {
        temp_link.id = id;
    }

    if (icon.type === "img") {
        temp_icon = document.createElement("img");
        temp_icon.src = icon.url;
    } else {
        temp_icon = get_fa_icon(icon.class_name, icon.color);
    }

    temp_icon.alt = icon.alt;
    temp_icon.className = icon.class_name;

    temp_link.appendChild(document.createTextNode((title ? " " + title : "")));
    temp_link.appendChild(temp_icon);
    return temp_link;
};


// get info icons td for a tab (ex: audible, secure, loading)
var get_info_td = function (tab, td) {
    if (tab.audible) {
        var vol_icon;
        if (typeof tat_conf.muted_tabs[tab.id] !== "undefined" && tat_conf.muted_tabs[tab.id]) {
            vol_icon = get_fa_icon("fa fa-volume-off clicky");
        } else {
            vol_icon = get_fa_icon("fa fa-volume-up clicky");
        }
        td.appendChild(vol_icon);
        vol_icon.addEventListener("click", audible_handler);
    }

    if (tab.status === "loading") {
        td.appendChild(get_fa_icon("fa fa-spinner fa-pulse"));
    }

    if (tab.url.indexOf("https") === 0) {
        td.appendChild(get_fa_icon("fa fa-lock", "#22aa00"));
    } else {
        td.appendChild(get_fa_icon("fa fa-unlock", "#ff0000"));
    }
};

// returns a modal element, which must still be "shown"
var get_modal_node = function(tab, modal, type) {
    var title_input, url_input, desc_input, tags_input, save_button;
    var modal_close = modal.getElementsByClassName("modal-close")[0];
    switch (type) {
        case "tags":
            title_input = modal.getElementsByClassName("tags-title")[0];
            url_input = modal.getElementsByClassName("tags-url")[0];
            desc_input = modal.getElementsByClassName("tags-desc")[0];
            tags_input = modal.getElementsByClassName("tags-list")[0];
            save_button = modal.getElementsByClassName("tags-save")[0];
            save_button.onclick = function () {
                save_tags({
                    title: title_input.value,
                    url: url_input.value,
                    desc: desc_input.value,
                    tags: tags_input.value,
                    domain: get_domain_name(url_input.value)
                });
            };
            break;

        case "bookmark":
            title_input = modal.getElementsByClassName("bookmark-title")[0];
            url_input = modal.getElementsByClassName("bookmark-url")[0];
            save_button = modal.getElementsByClassName("bookmark-save")[0];
            save_button.onclick = function () {
                // TODO: DO THIS
                save_bookmark();
            };
            break;
        default:
            return;
    }
    modal.id = type + "-modal-" + tab.id;
    if (title_input) {
        title_input.value = tab.title;
    }
    if (url_input) {
        url_input.value = tab.url;
    }
    modal_close.onclick = close_active_modal;
    return modal;
};
