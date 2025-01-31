# Mina Anime

## Find animes and make a list of the ones your have watched or want to watch. Written in HTML, CSS and JavaScript. No libraries are used.

Mina Anime is an SPA (Single Page web Application) för finding and creating a list of anime movies and tv-shows. The user can mark which ones he has watched and rate them. The SPA is only available in Swedish.

View index.html with the live server extension in VS Code or use this raw githack link: 

https://raw.githack.com/petermlaan/fetch/main/index.html

Opening index.html directly in the browser might not work due to secutity issues of loading javascript module files.

Bookmarks will only work for the index.html url. When the user navigates to another part of the SPA it will change the url and bookmarks for those url:s wont work (unless you host it in a web server that is configured to route those urls to index.html).

The SPA uses Jikan REST API (https://docs.api.jikan.moe). No access key is required. The limit is 3 API calls per second and 60 per minute (no limits beyond that). The SPA makes one call for each click on the search button and may make one call when the user navigates back or forwards in the browser's history. It will also make two calls each time the test button is clicked. No other API calls will be made.

The test button will add two anime's to the saved list each time (from a list of 21). This has been added to make it easier to test the SPA.
