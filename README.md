# tagatab

![Screenshot of tagatab](./img/ss.png)

## About

Ever feel like you have way, way too many tabs open, and you can't keep track
of them all? Try tagatab: a simple Chrome extension designed to help you
easily manage all your tabs from one place.

## Installation

### Chrome Web Store

[![Chrome web store](https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png)](https://chrome.google.com/webstore/detail/tagatab/lebadmogfkelbiobapphelffmdjlnenj)

### From Source

You can install from source like so:

0. Clone the repository somewhere you'll remember
0. Visit `chrome://extensions` in Chrome
0. Check the "Developer Mode" checkbox
0. Click the "Load unpacked extension..." button
0. Navigate to where you cloned tagatab, select the tagatab folder, and click "open"

__Note:__ This extension requests permissions for `http://*/*.ico` and
`https://*/*.ico` so that it can request favicons and use them to generate the
backgrounds for each tab's row.


## Features

__Current__

- Replaces Chrome's "new tab" page
- Random image from [unsplash.it](https://unsplash.it/) on every refresh
- Share tabs on Twitter, reddit, and Hacker News
- Save tabs on Diigo
- Sort tabs by domain, title
- Switch to a tab by clicking its title
- Close a tab
- See audible tabs and toggle mute by clicking the audio icon
- Omnibar (keyword "tat")
    - Search open tabs by typing the title
    - Switch to tagatab (hit enter)
- View HTTP / HTTPS status of tabs
- Tab rows are colored based on the tab's favicon
- 100% native JavaScript!

__Future__
- Bookmark tabs
- More services to save and share with

Something missing that you'd like to see? File an issue, please! :)

## License

tagatab is licensed under the "new" BSD 3-clause [license](./LICENSE). 
