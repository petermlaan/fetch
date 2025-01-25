
// +++ Gobal constants
const URL_BASE = "https://api.jikan.moe/v4/";
const URL_SEARCH = "anime?sfw&q=";
const LS_MODEL = "model";

// +++ Global variables
let gMyAnimes = [];
let gSearchResults = [];
let gFilterWatched = false;
let gPage = 1;
let gQuery = "";
let gTab = 1; // 0 - search, 1 - saved, 2 - single

// +++ Global html elements
const hTxtQuery = document.querySelector("#txtQuery");
const hBtnSearch = document.querySelector("#btnSearch");
const hBtnNext = document.querySelector("#btnNextPage");
const hBtnPrev = document.querySelector("#btnPrevPage");
const hChkFilterWatched = document.querySelector("#chkFilterWatched");
const hLblFilterWatched = document.querySelector("#lblFilterWatched");
const hChkShowList = document.querySelector("#chkShowList");
const hcMain = document.querySelector("#cMain");

// +++ Add event listeners
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
    gTab = 0;
    showSearchElements(true);
}
function onSavedTab(e) {
    e.preventDefault();
    gTab = 1;
    showSaved();
}
function onSingleTab(e) {
    e.preventDefault();
    gTab = 2;
    showSingle(e.target.parentElement.value);
}
function onShowList(e) {
    if (gTab === 0)
        showSearchResults();
    else
        showSaved();
}
async function onSearch(e) {
    try {
        e.preventDefault();
        gPage = 1;
        const hForm = document.querySelector("#frmSearch");
        if (!hForm.reportValidity())
            return;
        gQuery = document.querySelector("#txtQuery").value;
        const json = await fetchJSON(URL_BASE + URL_SEARCH + `${gQuery}&page=${gPage}`);
        console.log(json);
        gSearchResults = [];
        for (const ja of json.data) {
            const a = new Anime(
                ja.mal_id,
                ja.title,
                ja.title_english,
                ja.images.jpg.thumbnail_image_url,
                ja.images.jpg.small_image_url,
                ja.images.jpg.large_image_url,
                false,
                false
            );
            gSearchResults.push(a);
        }
        showSearchResults();
    }
    catch (err) {
        console.error(e);
    }
}
async function onNextPage(e) {
    e.preventDefault();
    if (gQuery.length > 0) {
        gPage++;
        showSearchResults();
    }
}
async function onPrevPage(e) {
    e.preventDefault();
    if (gPage > 1 && gQuery.length > 0) {
        gPage--;
        showSearchResults();
    }
}
function onFilterWatched(e) {
    gFilterWatched = !gFilterWatched;
    showSaved();
}
function onSavedAdd(e) {
    gMyAnimes.unshift(e.target.parentElement.value);
    model2storage();
    e.target.parentElement.remove(); // remove the card/row
}
function onSavedRemove(e) {
    const fav = e.target.parentElement.value;
    gMyAnimes.splice(gMyAnimes.findIndex(i => i.id === fav.id), 1);
    model2storage();
    showSaved();
}
function onSavedWatched(e) {
    e.target.parentElement.value.watched = !e.target.parentElement.value.watched;
    model2storage();
}

// +++ Other functions
async function showSearchResults() {
    hcMain.innerHTML = ""; // clear the container
    const hcCards = document.createElement("div"); // container for the cards
    hcCards.id = hChkShowList.checked ? "cListSearch" : "cCards";
    for (const a of gSearchResults) {
        if (hChkShowList.checked)
            hcCards.appendChild(createRow(a, false));
        else
            hcCards.appendChild(createCard(a, false));
    }
    hcMain.appendChild(hcCards); // Add cards to html page
}
function showSaved() {
    try {
        showSearchElements(false);
        hcMain.innerHTML = "";
        const hContainer = document.createElement("div");
        hContainer.id = hChkShowList.checked ? "cListSaved" : "cCards";
        if (hChkShowList.checked) {
            const hTitleRow = document.createElement("div");
            hTitleRow.innerHTML = "<span></span><span>Har sett</span><span>Titel</span>";
            hTitleRow.classList.add("anime-row");
            hContainer.appendChild(hTitleRow);
        }
        for (const a of gMyAnimes) {
            if (!gFilterWatched || !a.watched) {
                if (hChkShowList.checked)
                    hContainer.appendChild(createRow(a, true));
                else
                    hContainer.appendChild(createCard(a, true));
            };
        };
        hcMain.appendChild(hContainer);
    }
    catch (e) {
        console.error(e);
    }
}
function createCard(anime, saved) {
    const hCard = document.createElement("article");
    hCard.classList.add("anime-card");
    hCard.value = anime; // Store anime object for use in event handlers
    // Save button
    const hFav = document.createElement("button");
    hFav.innerText = saved ? "Ta bort" : "Spara";
    hFav.addEventListener("click", saved ? onSavedRemove : onSavedAdd);
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
    hWatched.addEventListener("click", onSavedWatched);
    hCard.appendChild(hWatched);
    // Image
    const hPoster = document.createElement("img");
    hPoster.src = anime.poster_s3;
    hPoster.classList.add("poster");
    hCard.appendChild(hPoster);
    // Title english
    const hTitleEn = document.createElement("h2");
    hTitleEn.innerText = anime.title_en;
    hCard.appendChild(hTitleEn);
    // Title
    const hTitle = document.createElement("h3");
    hTitle.innerText = anime.title;
    hCard.appendChild(hTitle);

    return hCard;
}
function createRow(anime, saved) {
    const hRow = document.createElement("div");
    hRow.classList.add("anime-row");
    hRow.value = anime; // Store anime object for use in event handlers

    // Save / unsave
    const hFav = document.createElement("button");
    hFav.innerText = saved ? "Ta bort" : "Spara";
    hFav.addEventListener("click", saved ? onSavedRemove : onSavedAdd);
    hRow.appendChild(hFav);
    // Watched
    if (saved) {
        const hWatched = document.createElement("input");
        hWatched.type = "checkbox";
        hWatched.id = `chkWatched${anime.id}`;
        hWatched.checked = anime.watched;
        hWatched.addEventListener("click", onSavedWatched);
        hRow.appendChild(hWatched);
    }
    // Title
    const hTitleEn = document.createElement("a");
    //hTitleEn.classList.add("listTitleEn");
    hTitleEn.href="#";
    hTitleEn.addEventListener("click", onSingleTab);
    hTitleEn.innerText = anime.title_en ? anime.title_en : anime.title;
    hRow.appendChild(hTitleEn);

    return hRow;
}
function showSingle(anime) {
    hcMain.innerHTML = "";
    const hCard = document.createElement("article");
    hCard.classList.add("anime-card");
    hCard.value = anime; // Store anime object for use in event handlers
    // Save button
    const hFav = document.createElement("button");
    hFav.innerText = anime.saved ? "Ta bort" : "Spara";
    hFav.addEventListener("click", anime.saved ? onSavedRemove : onSavedAdd);
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
    hWatched.addEventListener("click", onSavedWatched);
    hCard.appendChild(hWatched);
    // Image
    const hPoster = document.createElement("img");
    hPoster.src = anime.poster_s3;
    hPoster.classList.add("poster");
    hCard.appendChild(hPoster);
    // Title english
    const hTitleEn = document.createElement("h2");
    hTitleEn.innerText = anime.title_en;
    hCard.appendChild(hTitleEn);
    // Title
    const hTitle = document.createElement("h3");
    hTitle.innerText = anime.title;
    hCard.appendChild(hTitle);
    hcMain.appendChild(hCard);
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

// +++ Classes
class Anime {
    constructor(id, title, title_en, poster_s1, poster_s2, poster_s3, saved, watched) {
        this.id = id;
        this.title = title;
        this.title_en = title_en;
        this.poster_s1 = poster_s1;
        this.poster_s2 = poster_s2;
        this.poster_s3 = poster_s3;
        this.saved = saved;
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
