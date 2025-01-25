// +++ Gobal constants
const URL_BASE = "https://api.jikan.moe/v4/";
const URL_SEARCH = "anime?sfw&q=";
const LS_MODEL = "model";

// +++ Global variables
let gMyAnimes = [];
let gFilterWatched = false;
let gPage = 1;
let gQuery = "";

// +++ Global html elements
const hTxtQuery = document.querySelector("#txtQuery");
const hBtnSearch = document.querySelector("#btnSearch");
const hBtnNext = document.querySelector("#btnNextPage");
const hBtnPrev = document.querySelector("#btnPrevPage");
const hChkFilterWatched = document.querySelector("#chkFilterWatched");
const hLblFilterWatched = document.querySelector("#lblFilterWatched");
const hcMain = document.querySelector("#cMain");

// +++ Event handlers
hBtnSearch.addEventListener("click", onSearch);
hBtnNext.addEventListener("click", onNextPage);
hChkFilterWatched.addEventListener("click", onFilterWatched);
document.querySelector("#mnuSearch").addEventListener("click", onSearchTab);
document.querySelector("#mnuCards").addEventListener("click", onCardsTab);
document.querySelector("#mnuList").addEventListener("click", onListTab);
document.querySelector("#frmSearch").addEventListener("submit", onSearch);

storage2model();
showMyAnime();

// +++ Event listeners
function onSearchTab(e) {
    e.preventDefault();
    showSearchElements(true);
}
function onListTab(e) {
    e.preventDefault();
    showList();
}
async function onSearch(e) {
    e.preventDefault();
    gPage = 1;
    const hForm = document.querySelector("#frmSearch");
    if (!hForm.reportValidity())
        return;
    const hQuery = document.querySelector("#txtQuery");
    gQuery = hQuery.value;
    searchAnime();
}
async function onNextPage(e) {
    e.preventDefault();
    if (gQuery.length > 0) {
        gPage++;
        searchAnime();
    }
}
async function onPrevPage(e) {
    e.preventDefault();
    if (gPage > 1 && gQuery.length > 0) {
        gPage--;
        searchAnime();
    }
}
function onCardsTab(e) {
    showMyAnime();
}
function onFilterWatched(e) {
    gFilterWatched = !gFilterWatched;
    showMyAnime();
}
function onFavoriteAdd(e) {
    gMyAnimes.push(JSON.parse(e.target.value));
    model2storage();
    e.target.parentElement.remove(); // remove the card
}
function onFavoriteRemove(e) {
    const fav = e.target.parentElement.value;
    gMyAnimes.splice(gMyAnimes.findIndex(i => i.id === fav.id), 1);
    model2storage();
    showMyAnime();
}
function onFavoriteWatched(e) {
    e.target.parentElement.value.watched = !e.target.parentElement.value.watched;
    model2storage();
}

// +++ Other functions
async function searchAnime() {
    try {
        // Search for anime
        const json = await fetchJSON(URL_BASE + URL_SEARCH + `${gQuery}&page=${gPage}`);
        console.log(json);
        // Show the search results
        hcMain.innerHTML = ""; // clear the main container
        const hcCards = document.createElement("div"); // container for the cards
        hcCards.id = "cCards";
        for (anime of json.data) {
            const fav = {
                id: anime.mal_id,
                poster: anime.images.jpg.large_image_url,
                title: anime.title,
                title_english: anime.title_english,
                watched: false // TODO: don't include if already favorited? Or mark?
            };
            // Card
            const hCard = document.createElement("article");
            hCard.classList.add("anime-card");
            // Favorite
            const hFav = document.createElement("button");
            hFav.innerText = "Favorit";
            hFav.value = JSON.stringify(fav); // Can't store the actual object since it's local
            hFav.addEventListener("click", onFavoriteAdd);
            hCard.appendChild(hFav);
            // Image
            const hPoster = document.createElement("img");
            hPoster.src = anime.images.jpg.large_image_url;
            hPoster.classList.add("poster")
            hCard.appendChild(hPoster);
            // Title
            const hTitle = document.createElement("h2");
            hTitle.innerText = anime.title;
            hCard.appendChild(hTitle);
            // Title english
            const hTitleEn = document.createElement("h3");
            hTitleEn.innerText = anime.title_english;
            hCard.appendChild(hTitleEn);
            // Add to cards container
            hcCards.appendChild(hCard);
        }
        hcMain.appendChild(hcCards); // Add cards to html page
    }
    catch (e) {
        console.error(e);
    }
}
function showMyAnime() {
    try {
        showSearchElements(false);
        // Show the search results
        hcMain.innerHTML = "";
        const hcCards = document.createElement("div");
        hcCards.id = "cCards";
        for (anime of gMyAnimes) {
            if (!gFilterWatched || !anime.watched) {
                // Main container för the card
                const hCard = document.createElement("article");
                hCard.classList.add("anime-card");
                hCard.value = anime; // Store anime object for use in event handlers
                // Favorite
                const hFav = document.createElement("button");
                hFav.innerText = "Ta bort";
                hFav.addEventListener("click", onFavoriteRemove);
                hCard.appendChild(hFav);
                // Watched
                const hWatchedLabel = document.createElement("label");
                hWatchedLabel.innerText = "Har sett";
                hWatchedLabel.htmlFor = `chkWatched${anime.id}`;
                hCard.appendChild(hWatchedLabel);
                const hWatched = document.createElement("input");
                hWatched.type = "checkbox";
                hWatched.id = `chkWatched${anime.id}`;
                hWatched.checked = anime.watched;
                hWatched.addEventListener("click", onFavoriteWatched);
                hCard.appendChild(hWatched);
                // Image
                const hPoster = document.createElement("img");
                hPoster.src = anime.poster;
                hPoster.classList.add("poster")
                hCard.appendChild(hPoster);
                // Title english
                const hTitleEn = document.createElement("h2");
                hTitleEn.innerText = anime.title_english;
                hCard.appendChild(hTitleEn);
                // Title
                const hTitle = document.createElement("h3");
                hTitle.innerText = anime.title;
                hCard.appendChild(hTitle);
                // Add container to html page
                hcCards.appendChild(hCard);
            };
        };
        hcMain.appendChild(hcCards);
    }
    catch (e) {
        console.error(e);
    }
}
function showList() {
    try {
        showSearchElements(false);
        // Show the search results
        hcMain.innerHTML = ""
        const hcList = document.createElement("div");
        hcList.id = "cList";
        for (anime of gMyAnimes) {
            if (!gFilterWatched || !anime.watched) {
                // Main container för the row
                const hRow = document.createElement("div");
                hRow.classList.add("anime-row");
                hRow.value = anime; // Store anime object for use in event handlers
                // Title english
                const hTitleEn = document.createElement("span");
                hTitleEn.classList.add("listTitleEn");
                hTitleEn.innerText = anime.title_english;
                hRow.appendChild(hTitleEn);
                // Watched
                const hWatchedLabel = document.createElement("label");
                hWatchedLabel.innerText = "Har sett";
                hWatchedLabel.htmlFor = `chkWatched${anime.id}`;
                hRow.appendChild(hWatchedLabel);
                const hWatched = document.createElement("input");
                hWatched.type = "checkbox";
                hWatched.id = `chkWatched${anime.id}`;
                hWatched.checked = anime.watched;
                hWatched.addEventListener("click", onFavoriteWatched);
                hRow.appendChild(hWatched);
                // Favorite
                const hFav = document.createElement("button");
                hFav.innerText = "Ta bort";
                hFav.addEventListener("click", onFavoriteRemove);
                hRow.appendChild(hFav);
                // Add container to list container
                hcList.appendChild(hRow);
            };
        };
        hcMain.appendChild(hcList); // Add list to html page
    }
    catch (e) {
        console.error(e);
    }
}
function storage2model() {
    const m = localStorage.getItem(LS_MODEL);
    if (m !== null)
        gMyAnimes = JSON.parse(m);
}
function model2storage() {
    localStorage.setItem(LS_MODEL, JSON.stringify(gMyAnimes));
}
function showSearchElements(show) {
    hTxtQuery.hidden = !show;
    hBtnSearch.hidden = !show;
    hBtnPrev.hidden = !show;
    hBtnNext.hidden = !show;
    hLblFilterWatched.hidden = show;
    hChkFilterWatched.hidden = show;
}

// +++ Utility functions
async function fetchJSON(url) {
    console.log(url);
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(response);
    const data = await response.json();
    return data;
}
