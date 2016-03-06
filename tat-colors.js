// first check the tab cache, then check localstorage, then FINALLY go get the favicon if we have to
var get_tab_colors = function (tab) {
    var domain = get_domain_name(tab.url);
    if (typeof tat_conf.domain_colors[domain] !== "undefined") {
        return tat_conf.domain_colors[domain];
    } else if (typeof tat_conf.pending[domain] === "undefined" && tab.favIconUrl) {
        chrome.runtime.sendMessage({"action": "get_domain_colors", "domain": domain}, function (resp) {
            if (resp.colors === null) {
                request_favicon_data(tab.favIconUrl, domain);
                tat_conf.pending[domain] = true;
                request_tabs();
            } else {
                tat_conf.domain_colors[domain] = resp.colors;
                return resp.colors;
            }
        });
    }
    return { "bg": "#ffffff", "fg": "#000000" };
};

// get the optimal text color for a given background color
var get_text_color = function (bg_color) {
    if (typeof bg_color === "undefined" || bg_color.indexOf("#") === -1) {
        return "#000000";
    }
    var hex = bg_color.split("#").pop();
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    var color = "#000000";

    // http://stackoverflow.com/a/11868159
    var o = Math.round(((r * 299) + (g * 587) + (b * 114)) / 1000);
    if (o < 125) {
        color = "#ffffff";
    }
    return color;
};

// once we receive a message with the raw info for our icon, we analyze it and
// save the background and foreground colors for the domain
var set_domain_colors = function(req) {
    if (typeof tat_conf.domain_colors[req.domain] !== "undefined") {
        return;
    }
    get_icon_color(req.url, req.domain, req.orig_url, function (domain, color) {
        color = color ? color : "#ffffff";
        console.log("GOT COLOR: " + color + " FOR DOMAIN: " + domain);
        var colors = {"fg": get_text_color(color), "bg": color};
        tat_conf.domain_colors[domain] = colors;
        delete tat_conf.pending[domain];
        chrome.runtime.sendMessage({"action": "set_domain_colors", "domain": domain, "colors": colors});
        request_tabs();
    });
};

// helps keep everything from being white/black (EVERYONE LOVES THESE COLORS)
var is_white_or_black = function (r, g, b) {
    if (r > 250 && g > 250 && b > 250) {
        return true;
    } else if (r <= 5 && g <= 5 && b <= 5) {
        return true;
    }
    return false;
};

var get_icon_color = function(url, domain, orig_url, callback) {
    var start_time = new Date().getTime()
    ,   canvas = document.createElement("canvas")
    ,   c = canvas.getContext("2d")
    ,   coords = {}
    ,   colors = {}
    ,   consensus = false
    ,   max_occurrences = 0
    ,   max_color
    ,   img
    ,   x_coord
    ,   y_coord;

    if (orig_url === chrome.runtime.getURL("img/icon_tab.png")) {
        callback(domain, "#ffffff");
        return;
    }


    img = new Image();
    img.onload = function () {
        if (img.height > 24 || img.width > 24) {
            s_canvas = document.createElement("canvas");
            sctx = s_canvas.getContext("2d");
            s_canvas.height = 24;
            s_canvas.width = 24;
            c = sctx;
        }
        c.drawImage(img, 0, 0, 24, 24);
        width = 24;
        height = 24;
        for (var x_coord = 0; x_coord < width; x_coord++) {
            for (var y_coord = 0; y_coord < height; y_coord++) {
                var img_data = c.getImageData(x_coord, y_coord, 1, 1).data
                ,   r = img_data[0]
                ,   g = img_data[1]
                ,   b = img_data[2]
                ,   combined = [r, g, b].join(",");
                
                if (!colors[combined] && !is_white_or_black(r, g, b)) {
                    colors[combined] = 1;
                } else if (!is_white_or_black(r, g, b)) {
                    colors[combined]++;
                }

                if (colors[combined] > max_occurrences) {
                    var r16 = (r.toString(16).length === 2 ? r.toString(16) : "0" + r.toString(16))
                    ,   g16 = (g.toString(16).length === 2 ? g.toString(16) : "0" + g.toString(16))
                    ,   b16 = (b.toString(16).length === 2 ? b.toString(16) : "0" + b.toString(16))
                    ,   hex = "#" + r16 + g16 + b16;

                    max_occurrences = colors[combined];
                    max_color = hex;
                }
                if (max_occurrences > (width * height) / 4) {
                    callback(domain, max_color);
                    return;
                }
            }
        }
        callback(domain, max_color);
    };
    img.onerror = function (e) {
        console.log("oh teh noez");
        console.dir(e);
        callback(domain, "#ffffff");
    };
    img.src = url;
};


