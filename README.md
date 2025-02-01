# Mina Anime

## Find animes and make a list of the ones you have watched or want to watch. Written in HTML, CSS and JavaScript. No libraries are used.

Mina Anime is an SPA (Single Page web Application) för finding and creating a list of anime movies and tv-shows. The user can mark which ones he has watched and rate them. The SPA is only available in Swedish.

View index.html with the live server extension in VS Code or use this raw githack link: 

https://raw.githack.com/petermlaan/fetch/main/index.html

Opening index.html directly in the browser might not work due to secutity restrictions of loading javascript module files.

The SPA uses the Jikan REST API (https://docs.api.jikan.moe). No access key is required. The limit is 3 API calls per second and 60 per minute (no limits beyond that).

The test button will add two animes to the saved list each time (from a list of 21). This has been added to make it easier to test the SPA. Be careful not to click on this button faster than once each second or you will exceed the limit of the API.
