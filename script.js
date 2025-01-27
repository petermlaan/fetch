
// +++ Gobal constants
const API_URL_BASE = "https://api.jikan.moe/v4/";
const API_URL_SEARCH = "anime?sfw&q=";
const URL_BASE = "/myanime/";
const LS_MODEL = "model";

// +++ Global variables
let gSearchResults = [];
let gMyAnimes = []; // Saved animes
let gFilterWatched = false;
let gQuery = ""; // The latest search query
let gPage = 1; // search pagination
let gTab = 1; // For site navigation. 0 - search, 1 - saved, 2 - single

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
hBtnPrev.addEventListener("click", onPrevPage);
hChkFilterWatched.addEventListener("click", onFilterWatched);
hChkShowList.addEventListener("click", onShowList);
document.querySelector("#frmSearch").addEventListener("submit", onSearch);
document.querySelector("#mnuSearch").addEventListener("click", onSearchTab);
document.querySelector("#mnuCards").addEventListener("click", onSavedTab);
window.addEventListener("popstate", onHistoryChanged)

document.querySelector("#btnTest").addEventListener("click", onTest);


storage2model();
m2vSaved();
pushStateSaved();

// +++ Event listeners
function onSearchTab(e) {
    e.preventDefault();
    showSearchElements(true);
    if (gTab !== 0) {
        gTab = 0;
        pushStateSearch(gQuery);
    }
    m2vSearchResults();
}
function onSavedTab(e) {
    e.preventDefault();
    if (gTab !== 1) {
        pushStateSaved();
        gTab = 1;
    }
    m2vSaved();
}
function onSingleTab(e) {
    e.preventDefault();
    const anime = e.target.anime;
    if (gTab !== 2) {
        gTab = 2;
        pushStateSingle(anime.id);
    }
    m2vSingle(anime);
}
function onShowList(e) {
    if (gTab === 0)
        m2vSearchResults();
    else
        m2vSaved();
}
async function onSearch(e) {
    try {
        e.preventDefault();
        gPage = 1;
        const newQuery = document.querySelector("#txtQuery").value;
        if (newQuery !== gQuery) {
            pushStateSearch(newQuery);
        }
        const hForm = document.querySelector("#frmSearch");
        if (!hForm.reportValidity())
            return;
        gQuery = newQuery;
        await search();
    }
    catch (err) {
        console.error(e);
    }
}
async function onNextPage(e) {
    e.preventDefault();
    if (gQuery.length > 0) {
        gPage++;
        m2vSearchResults();
    }
}
async function onPrevPage(e) {
    e.preventDefault();
    if (gPage > 1 && gQuery.length > 0) {
        gPage--;
        m2vSearchResults();
    }
}
function onFilterWatched(e) {
    gFilterWatched = !gFilterWatched;
    m2vSaved();
}
function onSavedAdd(e) {
    const anime = e.target.anime;
    anime.saved = true;
    gMyAnimes.unshift(anime);
    model2storage();
    if (gTab === 2)
        m2vSaved();
    else {
        // remove the card/row
        if (hChkShowList.checked)
            e.target.parentElement.remove();
        else
            e.target.parentElement.parentElement.remove();
        gSearchResults.splice(gSearchResults.findIndex(a => a.id === anime.id), 1);
    }
}
function onSavedRemove(e) {
    const anime = e.target.anime;
    gMyAnimes.splice(gMyAnimes.findIndex(a => a.id === anime.id), 1);
    model2storage();
    m2vSaved();
}
function onSavedWatched(e) {
    e.target.anime.watched = !e.target.anime.watched;
    model2storage();
}
function onRatingChange(e) {
    const anime = e.target.anime;
    anime.myRating = e.target.value;
    model2storage();
}
function onHistoryChanged(e) {
    console.log("history changed event - state:");
    console.log(e.state);
    gTab = e.state.tab;
    switch (gTab) {
        case 0:
            gQuery = e.state.query;
            showSearchElements(true);
            if (gQuery)
                search();
            break;
        case 1:
            showSearchElements(false);
            m2vSaved();
            break;
        case 2:
            const anime = gMyAnimes.find(a => a.id === e.state.id);
            if (anime)
                m2vSingle(anime);
            break;
    }
}
async function onTest(e) {
    // Add some test data
    async function addAnime(id) {
        console.log(id);
        const json = await fetchJSON(API_URL_BASE + "anime/" + id);
        const jsondata = json.data;
        const a = new Anime(
            jsondata.mal_id,
            jsondata.title,
            jsondata.title_english,
            jsondata.images.jpg.thumbnail_image_url,
            jsondata.images.jpg.small_image_url,
            jsondata.images.jpg.large_image_url,
            jsondata.synopsis,
            jsondata.genres,
            jsondata.score,
            true,
            false,
            0);
        gMyAnimes.push(a);
    }
    try {
        e.preventDefault();
        let added = 0;
        const ids = [1, 121, 431, 813, 512, 32281, 1943, 21, 572, 523, 199, 5114, 164, 1535, 31964, 40748, 41467, 38000, 57334, 16498, 37521];
        for (id of ids) {
            if (!gMyAnimes.some(a => a.id === id)) {
                await addAnime(id)
                added++;
            };
            if (added > 3)
                break;
        }
        model2storage();
        gTab = 1;
        m2vSaved();
    } catch (err) {
        console.error(err);
    }
}

// +++ Other functions
async function m2vSearchResults() {
    hcMain.innerHTML = ""; // clear the container
    const hcCards = document.createElement("div");
    hcCards.id = hChkShowList.checked ? "cListSearch" : "cCards";
    if (hChkShowList.checked) {
        const hTitleRow = document.createElement("div");
        hTitleRow.innerHTML =
            ["", "Poäng", "Titel"]
                .reduce((a, s) => a + `<span>${s}</span>`, "");
        hTitleRow.classList.add("title-row");
        hcCards.appendChild(hTitleRow);
    }
    for (const a of gSearchResults) {
        if (hChkShowList.checked)
            hcCards.appendChild(createRow(a));
        else
            hcCards.appendChild(createCard(a));
    }
    hcMain.appendChild(hcCards); // Add cards to html page
}
function m2vSaved() {
    try {
        showSearchElements(false);
        hcMain.innerHTML = "";
        const hContainer = document.createElement("div");
        hContainer.id = hChkShowList.checked ? "cListSaved" : "cCards";
        if (hChkShowList.checked) {
            const hTitleRow = document.createElement("div");
            hTitleRow.innerHTML =
                ["", "Har sett", "Betyg", "Poäng", "Titel"]
                    .reduce((a, s) => a + `<span>${s}</span>`, "");
            hTitleRow.classList.add("title-row");
            hContainer.appendChild(hTitleRow);
        }
        for (const a of gMyAnimes) {
            if (!gFilterWatched || !a.watched) {
                if (hChkShowList.checked)
                    hContainer.appendChild(createRow(a));
                else
                    hContainer.appendChild(createCard(a));
            };
        };
        hcMain.appendChild(hContainer);
    }
    catch (e) {
        console.error(e);
    }
}
function m2vSingle(anime) {
    hcMain.innerHTML = "";
    const hCard = document.createElement("article");
    hCard.classList.add("single-card");
    hCard.anime = anime; // Store anime object for use in event handlers

    // Left
    const hLeft = document.createElement("div");
    hLeft.classList.add("single-left");
    // Left top row
    const hLeftTopRow = document.createElement("div");
    hLeftTopRow.classList.add("single-left-toprow");
    // Close button
    const hClose = document.createElement("button");
    hClose.innerText = "Stäng";
    hClose.addEventListener("click", e => history.back());
    hLeftTopRow.appendChild(hClose);
    // Save button
    const hSave = document.createElement("button");
    hSave.innerText = anime.saved ? "Ta bort" : "Spara";
    hSave.addEventListener("click", anime.saved ? onSavedRemove : onSavedAdd);
    hSave.anime = anime; // Store anime object for use in event handler
    hLeftTopRow.appendChild(hSave);
    // Watched
    if (anime.saved) {
        const hWatchedLabel = document.createElement("label");
        hWatchedLabel.innerText = "Har sett";
        hWatchedLabel.htmlFor = `chkWatched${anime.id}`;
        hLeftTopRow.appendChild(hWatchedLabel);
        const hWatched = document.createElement("input");
        hWatched.type = "checkbox";
        hWatched.id = `chkWatched${anime.id}`;
        hWatched.checked = anime.watched;
        hWatched.addEventListener("click", onSavedWatched);
        hWatched.anime = anime; // Store anime object for use in event handler
        hLeftTopRow.appendChild(hWatched);
    }
    hLeft.appendChild(hLeftTopRow);
    // Image
    const hPoster = document.createElement("img");
    hPoster.src = anime.poster_s3;
    hPoster.classList.add("poster");
    hLeft.appendChild(hPoster);
    hCard.appendChild(hLeft);
    // Right
    const hRight = document.createElement("div");
    // Top row
    const hRightTopRow = document.createElement("div");
    hRightTopRow.classList.add("single-right-toprow");
    const hScore = document.createElement("span");
    hScore.innerText = "Poäng: " + anime.score;
    hRightTopRow.appendChild(hScore);
    if (anime.saved) {
        const hRatingLbl = document.createElement("label");
        hRatingLbl.htmlFor = "rating";
        hRatingLbl.innerText = "Betyg:";
        hRightTopRow.appendChild(hRatingLbl);
        hRightTopRow.appendChild(createRatingSelect(anime));
    }
    hRight.appendChild(hRightTopRow);
    // Title english
    const hTitleEn = document.createElement("h2");
    hTitleEn.innerText = anime.title_en;
    hRight.appendChild(hTitleEn);
    // Title
    const hTitle = document.createElement("h3");
    hTitle.innerText = anime.title;
    hRight.appendChild(hTitle);
    // Synopsis
    const hSynopsis = document.createElement("p");
    hSynopsis.innerText = anime.synopsis;
    hRight.appendChild(hSynopsis);
    hCard.appendChild(hRight);

    hcMain.appendChild(hCard);
}
function createRatingSelect(anime) {
    const hRating = document.createElement("select");
    hRating.addEventListener("change", onRatingChange);
    hRating.anime = anime; // Store anime object for use in event handler
    for (let i = 0; i < 6; i++) {
        const hOption = document.createElement("option");
        if (i === 0) {
            hOption.text = "";
            hOption.value = 0;
        } else {
            hOption.text = i;
            hOption.value = i;
        }
        hRating.appendChild(hOption);
    }
    hRating.selectedIndex = anime.myRating;
    return hRating;
}
function createCard(anime) {
    // Returns a small card article element for the supplied anime object

    const hCard = document.createElement("article");
    hCard.classList.add("anime-card");

    // Top row
    const hTopRow = document.createElement("div");
    hTopRow.classList.add("card-toprow");
    // Save button
    const hSave = document.createElement("button");
    hSave.innerText = anime.saved ? "Ta bort" : "Spara";
    hSave.addEventListener("click", anime.saved ? onSavedRemove : onSavedAdd);
    hSave.anime = anime; // Store anime object for use in event handler
    hTopRow.appendChild(hSave);
    // Watched
    if (anime.saved) {
        const hWatchedLabel = document.createElement("label");
        hWatchedLabel.innerText = "Har sett";
        hWatchedLabel.htmlFor = `chkWatched${anime.id}`;
        hTopRow.appendChild(hWatchedLabel);
        const hWatched = document.createElement("input");
        hWatched.type = "checkbox";
        hWatched.id = `chkWatched${anime.id}`;
        hWatched.checked = anime.watched;
        hWatched.addEventListener("click", onSavedWatched);
        hWatched.anime = anime; // Store anime object for use in event handler
        hWatchedLabel.appendChild(hWatched);
    }
    hCard.appendChild(hTopRow);

    // Image
    const hPosterLink = document.createElement("a");
    hPosterLink.href = "#";
    hPosterLink.addEventListener("click", onSingleTab);
    const hPoster = document.createElement("img");
    hPoster.src = anime.poster_s3;
    hPoster.anime = anime; // Needs to be on the img for some reason. Store anime object for use in event handler
    hPoster.classList.add("poster");
    hPosterLink.appendChild(hPoster);
    hCard.appendChild(hPosterLink);
    // Genres
    const hGenres = document.createElement("div");
    hGenres.classList.add("card-genres");
    for (const genre of anime.genres) {
        const hGenre = document.createElement("div");
        hGenre.classList.add("card-genre");
        hGenre.innerText = genre.name;
        hGenres.appendChild(hGenre);
    }
    hCard.appendChild(hGenres);
    // Title
    const hTitleEn = document.createElement("h2");
    hTitleEn.innerText = anime.title_en ? anime.title_en : anime.title;
    hCard.appendChild(hTitleEn);

    return hCard;
}
function createRow(anime) {
    const hRow = document.createElement("div");
    hRow.classList.add("anime-row");
    hRow.anime = anime; // Store anime object for use in event handlers

    // Save / unsave
    const hSave = document.createElement("button");
    hSave.innerText = anime.saved ? "Ta bort" : "Spara";
    hSave.addEventListener("click", anime.saved ? onSavedRemove : onSavedAdd);
    hSave.anime = anime; // Store anime object for use in event handler
    hRow.appendChild(hSave);
    // Watched
    if (anime.saved) {
        const hWatched = document.createElement("input");
        hWatched.type = "checkbox";
        //hWatched.id = `chkWatched${anime.id}`;
        hWatched.checked = anime.watched;
        hWatched.addEventListener("click", onSavedWatched);
        hWatched.anime = anime; // Store anime object for use in event handler
        hRow.appendChild(hWatched);
    }
    // My rating
    if (anime.saved) {
        hRow.appendChild(createRatingSelect(anime));
    }
    // Score
    const hScore = document.createElement("span");
    hScore.innerText = anime.score;
    hRow.appendChild(hScore);
    // Title
    const hTitleDiv = document.createElement("div");
    const hTitleEn = document.createElement("a");
    hTitleEn.href = "#";
    hTitleEn.addEventListener("click", onSingleTab);
    hTitleEn.anime = anime; // Store anime object for use in event handler
    hTitleEn.innerText = anime.title_en ? anime.title_en : anime.title;
    hTitleDiv.appendChild(hTitleEn);
    hRow.appendChild(hTitleDiv);

    return hRow;
}
function storage2model() {
    const m = localStorage.getItem(LS_MODEL);
    if (m !== null)
        gMyAnimes = JSON.parse(m);
    if (!gMyAnimes)
        gMyAnimes = [];
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
async function search() {
    const json = await fetchJSON(API_URL_BASE + API_URL_SEARCH + `${gQuery}&page=${gPage}`);
    gSearchResults = [];
    for (const ja of json.data) {
        const a = new Anime(
            ja.mal_id,
            ja.title,
            ja.title_english,
            ja.images.jpg.thumbnail_image_url,
            ja.images.jpg.small_image_url,
            ja.images.jpg.large_image_url,
            ja.synopsis,
            ja.genres,
            ja.score,
            false,
            false,
            0
        );
        gSearchResults.push(a);
    }
    m2vSearchResults();
}
function pushStateSearch(query) {
    const state = {
        tab: 0,
        query: query
    };
    pushState("search?q=" + query, state, "Search");
}
function pushStateSaved() {
    const state = {
        tab: 1
    };
    pushState("saved", state, "Saved");
}
function pushStateSingle(id) {
    const state = {
        tab: 2,
        id: id
    };
    pushState("search?q=", state, "Details");
}
function pushState(urlend, state, titleEnd) {
    const nextURL = URL_BASE + urlend;
    let title = "My Anime - " + titleEnd;
    console.log(state);
    window.history.pushState(state, title, nextURL);
}

// +++ Classes
class Anime {
    constructor(id, title, title_en, poster_s1, poster_s2, poster_s3, synopsis, genres, score, saved, watched, myRating) {
        this.id = id;
        this.title = title;
        this.title_en = title_en;
        this.poster_s1 = poster_s1;
        this.poster_s2 = poster_s2;
        this.poster_s3 = poster_s3;
        this.synopsis = synopsis;
        this.genres = genres;
        this.score = score;
        this.saved = saved;
        this.watched = watched;
        this.myRating = myRating;
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
