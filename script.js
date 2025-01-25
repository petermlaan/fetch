
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
const hChkShowList = document.querySelector("#chkShowList");
const hcMain = document.querySelector("#cMain");

// +++ Event handlers
hBtnSearch.addEventListener("click", onSearch);
hBtnNext.addEventListener("click", onNextPage);
hChkFilterWatched.addEventListener("click", onFilterWatched);
hChkShowList.addEventListener("click", onShowList);
document.querySelector("#mnuSearch").addEventListener("click", onSearchTab);
document.querySelector("#mnuCards").addEventListener("click", onSavedTab);
document.querySelector("#frmSearch").addEventListener("submit", onSearch);


storage2model();
showSaved();

// +++ Event listeners
function onSearchTab(e) {
    e.preventDefault();
    showSearchElements(true);
}
function onShowList(e) {
    showSaved();
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
function onSavedTab(e) {
    showSaved();
}
function onFilterWatched(e) {
    gFilterWatched = !gFilterWatched;
    showSaved();
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
    showSaved();
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
        for (const ja of json.data) {
            const a = new Anime(
                ja.mal_id,
                ja.title,
                ja.title_english,
                ja.images.jpg.thumbnail_image_url,
                ja.images.jpg.small_image_url,
                ja.images.jpg.large_image_url,
                false,
                false // TODO: don't include if already favorited? Or mark?
            );
            // Card
            const hCard = document.createElement("article");
            hCard.classList.add("anime-card");
            // Favorite
            const hFav = document.createElement("button");
            hFav.innerText = "Spara";
            hFav.value = JSON.stringify(a); // Can't store the actual object since it's local
            hFav.addEventListener("click", onFavoriteAdd);
            hCard.appendChild(hFav);
            // Image
            const hPoster = document.createElement("img");
            hPoster.src = a.poster_s3;
            hPoster.classList.add("poster")
            hCard.appendChild(hPoster);
            // Title english
            const hTitleEn = document.createElement("h2");
            hTitleEn.innerText = a.title_en;
            hCard.appendChild(hTitleEn);
            // Title
            const hTitle = document.createElement("h3");
            hTitle.innerText = a.title;
            hCard.appendChild(hTitle);
            // Add to cards container
            hcCards.appendChild(hCard);
        }
        hcMain.appendChild(hcCards); // Add cards to html page
    }
    catch (e) {
        console.error(e);
    }
}
function showSaved() {
    try {
        showSearchElements(false);
        hcMain.innerHTML = "";
        const hContainer = document.createElement("div");
        hContainer.id = hChkShowList.checked ?  "cList" : "cCards";
        for (const a of gMyAnimes) {
            if (!gFilterWatched || !a.watched) {
                if (hChkShowList.checked) {
                    // Main container för the row
                    createRow(a, hContainer, true);
                } else {
                    // Main container för the card
                    const hCard = document.createElement("article");
                    hCard.classList.add("anime-card");
                    hCard.value = a; // Store anime object for use in event handlers
                    // Favorite
                    const hFav = document.createElement("button");
                    hFav.innerText = "Ta bort";
                    hFav.addEventListener("click", onFavoriteRemove);
                    hCard.appendChild(hFav);
                    // Watched
                    const hWatchedLabel = document.createElement("label");
                    hWatchedLabel.innerText = "Har sett";
                    hWatchedLabel.htmlFor = `chkWatched${a.id}`;
                    hCard.appendChild(hWatchedLabel);
                    const hWatched = document.createElement("input");
                    hWatched.type = "checkbox";
                    hWatched.id = `chkWatched${a.id}`;
                    hWatched.checked = a.watched;
                    hWatched.addEventListener("click", onFavoriteWatched);
                    hCard.appendChild(hWatched);
                    // Image
                    const hPoster = document.createElement("img");
                    hPoster.src = a.poster_s3;
                    hPoster.classList.add("poster")
                    hCard.appendChild(hPoster);
                    // Title english
                    const hTitleEn = document.createElement("h2");
                    hTitleEn.innerText = a.title_en;
                    hCard.appendChild(hTitleEn);
                    // Title
                    const hTitle = document.createElement("h3");
                    hTitle.innerText = a.title;
                    hCard.appendChild(hTitle);
                    // Add card to cards container
                    hContainer.appendChild(hCard);
                };
            };
        };
        hcMain.appendChild(hContainer);
    }
    catch (e) {
        console.error(e);
    }
}
function createRow(anime, hContainer, saved) {
    const hRow = document.createElement("div");
    hRow.classList.add("anime-row");
    hRow.value = anime; // Store anime object for use in event handlers

    // Title english
    const hTitleEn = document.createElement("span");
    hTitleEn.classList.add("listTitleEn");
    hTitleEn.innerText = anime.title_en;
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
    hFav.innerText = saved ? "Ta bort" : "Spara";
    hFav.addEventListener("click", onFavoriteRemove);
    hRow.appendChild(hFav);
    // Add container to list container
    hContainer.appendChild(hRow);
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

// +++ Constructors
class Anime {
    constructor(id, title, title_en, poster_s1, poster_s2, poster_s3, favorite, watched) {
        this.id = id;
        this.title = title;
        this.title_en = title_en;
        this.poster_s1 = poster_s1;
        this.poster_s2 = poster_s2;
        this.poster_s3 = poster_s3;
        this.favorite = favorite;
        this.watched = watched;
    }
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
