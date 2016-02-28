// 0 == ascending, 1 == descending
var ghetto_sort = function (a, b, _dir, parser) {
    var a_info = parser(a);
    var b_info = parser(b);
    var result = 0;

    if (_dir === 0) {
        if (a_info < b_info) { 
            result = -1;
        } else if (a_info > b_info) {
            result = 1;
        } 
    } else {
        if (a_info < b_info) {
            result = 1;
        } else if (a_info > b_info) {
            result = -1;
        }
    }
    return result;
};

// title parser for ghetto sorter
var title_parser = function (tab) {
    return tab.title.toLowerCase();
};

// domain parser for ghetto sorter
var domain_parser = function (tab) {
    return get_domain_name(tab.url).toLowerCase();
};

var tab_sort = function () {
    var tabs = CURRENT_TABS.slice(0);
    if (TITLE_SORTED) {
        tabs = tabs.sort(function (a, b) {
            return ghetto_sort(a, b, TITLE_SORT_DIR, title_parser);
        });
    } else if (DOMAIN_SORTED) {
        tabs = tabs.sort(function (a, b) {
            return ghetto_sort(a, b, DOMAIN_SORT_DIR, domain_parser);
        });
    }  else if (INDEX_SORTED) {
        tabs = tabs.sort(function (a, b) {
            return ghetto_sort(a, b, 0, function (tab) {
                return tab.index;
            });
        });
    }
    CURRENT_TABS = tabs;
};

var setup_sorting = function () {
    var title_header = document.getElementById("title-header");
    var domain_header = document.getElementById("domain-header");
    title_header.addEventListener("click", function () {
        INDEX_SORTED = false;
        TITLE_SORTED = true;
        TITLE_SORT_DIR = TITLE_SORT_DIR === 0 ? 1 : 0; // flip sort dir if we're already sorting by title
        DOMAIN_SORTED = false;
        request_tabs();
    });
    domain_header.addEventListener("click", function () {
        INDEX_SORTED = false;
        DOMAIN_SORTED = true;
        DOMAIN_SORT_DIR = DOMAIN_SORT_DIR === 0 ? 1 : 0;
        TITLE_SORTED = false;
        request_tabs();
    });
};


