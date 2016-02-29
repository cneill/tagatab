// sort our tabs based on the sort type and direction
var cust_sort = function (a_info, b_info) {
    var result = 0;

    if (a_info < b_info) { 
        result = -1;
    } else if (a_info > b_info) {
        result = 1;
    } 

    if (tat_conf.sorting.direction === "desc") {
        result = result * -1;
    }
    return result;
};

// sort our tabs based on title, domain, or by their index
var tab_sort = function () {
    var tabs = tat_conf.tabs.slice(0);
    switch (tat_conf.sorting.sort) {
    case "title":
        tabs = tabs.sort(function (a, b) {
            return cust_sort(a.title.toLowerCase(), b.title.toLowerCase());
        });
        break;
    case "domain":
        tabs = tabs.sort(function (a, b) {
            return cust_sort(get_domain_name(a.url).toLowerCase(),
                             get_domain_name(b.url).toLowerCase());
        });
        break;
    case "index":
        tabs = tabs.sort(function (a, b) {
            return cust_sort(a.index, b.index);
        });
        break;
    }
    tat_conf.tabs = tabs;
};

// set the event handlers for our table headings to sort by title/domain
var setup_sorting = function () {
    var title_header = document.getElementById("title-header");
    var domain_header = document.getElementById("domain-header");
    title_header.addEventListener("click", function () {
        tat_conf.sorting.sort = "title";
        tat_conf.sorting.direction = tat_conf.sorting.direction === "asc" ? "desc" : "asc";
        request_tabs();
    });
    domain_header.addEventListener("click", function () {
        tat_conf.sorting.sort = "domain";
        tat_conf.sorting.direction = tat_conf.sorting.direction === "asc" ? "desc" : "asc";
        request_tabs();
    });
};
