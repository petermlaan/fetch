import { fetchJSON, formatDecimalPlaces } from "./util.js";

// #region Gobal constants
const API_URL_BASE = "https://api.jikan.moe/v4/";
const API_URL_SEARCH = "anime?sfw&q=";
const URL_BASE = "/myanime/";
const LS_MODEL = "model";
// #endregion

// #region Global variables
let gSearchResults = []; // Last search result
let gMyAnimes = []; // Saved animes
let gFilterWatched = false;
let gQuery = ""; // The latest search query
let gPage = 1; // search pagination
let gTab = 1; // For site navigation. 0 - search, 1 - saved, 2 - single
// #endregion

// #region Global html elements
const hTxtQuery = document.querySelector("#txtQuery");
const hBtnSearch = document.querySelector("#btnSearch");
const hBtnNext = document.querySelector("#btnNextPage");
const hBtnPrev = document.querySelector("#btnPrevPage");
const hChkFilterWatched = document.querySelector("#chkFilterWatched");
const hLblFilterWatched = document.querySelector("#lblFilterWatched");
const hLblShowList = document.querySelector("#lblShowList");
const hChkShowList = document.querySelector("#chkShowList");
const hTest = document.querySelector("#btnTest");
const hcMain = document.querySelector("#cMain");
// #endregion

// #region Add event listeners
hBtnSearch.addEventListener("click", onSearch);
hBtnNext.addEventListener("click", onNextPage);
hBtnPrev.addEventListener("click", onPrevPage);
hChkFilterWatched.addEventListener("click", onFilterWatched);
hChkShowList.addEventListener("click", onShowList);
document.querySelector("#frmSearch").addEventListener("submit", onSearch);
document.querySelector("#mnuSearch").addEventListener("click", onSearchTab);
document.querySelector("#mnuCards").addEventListener("click", onSavedTab);
document.querySelector("#btnTest").addEventListener("click", onTest);
window.addEventListener("popstate", onHistoryChanged)
// #endregion

storage2model();
showHideElements(gTab);
showSaved(gMyAnimes);
pushStateSaved();

// #region Event listeners
function onSearchTab(e) {
    e.preventDefault();
    if (gTab !== 0) {
        gTab = 0;
        pushStateSearch(gQuery);
    }
    showHideElements(gTab);
    showSearchResults(gSearchResults);
}
function onSavedTab(e) {
    e.preventDefault();
    if (gTab !== 1) {
        pushStateSaved();
        gTab = 1;
    }
    showHideElements(gTab);
    showSaved(gMyAnimes);
}
function onSingleTab(e) {
    e.preventDefault();
    const anime = e.target.anime;
    if (gTab !== 2) {
        gTab = 2;
        pushStateSingle(anime.id);
    }
    showHideElements(gTab);
    showSingle(anime);
}
function onShowList(e) {
    if (gTab === 0)
        showSearchResults(gSearchResults);
    else
        showSaved(gMyAnimes);
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
        gSearchResults = await search(gQuery, gPage);
        showSearchResults(gSearchResults);
    }
    catch (err) {
        console.error(err);
    }
}
async function onNextPage(e) {
    e.preventDefault();
    if (gQuery) {
        gPage++;
        gSearchResults = await search(gQuery, gPage);
        showSearchResults(gSearchResults);
    }
}
async function onPrevPage(e) {
    e.preventDefault();
    if (gPage > 1 && gQuery) {
        gPage--;
        gSearchResults = await search(gQuery, gPage);
        showSearchResults(gSearchResults);
    }
}
function onFilterWatched(e) {
    gFilterWatched = !gFilterWatched;
    showSaved(gMyAnimes);
}
function onSavedAdd(e) {
    const anime = e.target.anime;
    anime.saved = true;
    if (gMyAnimes.some(a => a.id === anime.id)) {
        alert("Redan sparad");
        return;
    }
    gMyAnimes.unshift(anime);
    model2storage();
    if (gTab === 2)
        showSaved(gMyAnimes);
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
    showSaved(gMyAnimes);
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
async function onHistoryChanged(e) {
    document.title = e.state.title;
    gTab = e.state.tab;
    showHideElements(gTab);
    switch (gTab) {
        case 0: // Search tab
            const useOldSearchResults = gQuery === e.state.query;
            gQuery = e.state.query;
            if (useOldSearchResults)
                showSearchResults(gSearchResults);
            else {
                if (gQuery)
                    gSearchResults = await search(gQuery, gPage);
                else
                    gSearchResults = [];
                showSearchResults(gSearchResults);
            }
            break;
        case 1: // Saved tab
            showSaved(gMyAnimes);
            break;
        case 2: // Single tab
            const anime = gMyAnimes.find(a => a.id === e.state.id);
            if (anime)
                showSingle(anime);
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
        for (const id of ids) {
            if (!gMyAnimes.some(a => a.id === id)) {
                await addAnime(id)
                added++;
            };
            if (added > 1)
                break;
        }
        model2storage();
        gTab = 1;
        showSaved(gMyAnimes);
    } catch (err) {
        console.error(err);
    }
}
// #endregion

// #region Other functions
async function search(query, page) {
    const json = await fetchJSON(API_URL_BASE + API_URL_SEARCH + `${query}&page=${page}`);
    const res = [];
    for (const ja of json.data) {
        let a = new Anime(
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
        const savedanime = gMyAnimes.find(b => b.id === a.id);
        if (savedanime)
            a = savedanime;
        res.push(a);
    }
    return res;
}
async function showSearchResults(animes) {
    hcMain.innerHTML = ""; // clear the container
    const hcCards = document.createElement("div");
    hcCards.id = hChkShowList.checked ? "cListSearch" : "cCards";
    if (hChkShowList.checked) {
        const hTitleRow = document.createElement("div");
        hTitleRow.innerHTML = ["", "Poäng", "Titel"]
            .reduce((a, s) => a + `<span>${s}</span>`, "");
        hTitleRow.classList.add("title-row");
        hcCards.appendChild(hTitleRow);
    }
    for (const a of animes) {
        if (hChkShowList.checked)
            hcCards.appendChild(createRow(a, 0));
        else
            hcCards.appendChild(createCard(a, 0));
    }
    hcMain.appendChild(hcCards); // Add cards to html page
}
function showSaved(animes) {
    hcMain.innerHTML = "";
    const hContainer = document.createElement("div");
    hContainer.id = hChkShowList.checked ? "cListSaved" : "cCards";
    if (hChkShowList.checked) {
        const hTitleRow = document.createElement("div");
        hTitleRow.innerHTML =
            ["", "Sedd", "Poäng", "Betyg", "Titel"]
                .reduce((a, s) => a + `<span>${s}</span>`, "");
        hTitleRow.classList.add("title-row");
        hContainer.appendChild(hTitleRow);
    }
    for (const a of animes) {
        if (!gFilterWatched || !a.watched) {
            if (hChkShowList.checked)
                hContainer.appendChild(createRow(a, 1));
            else
                hContainer.appendChild(createCard(a, 1));
        };
    };
    hcMain.appendChild(hContainer);
}
function showSingle(anime) {
    hcMain.innerHTML = ""; // clear the area

    // #region The card container
    const hCard = document.createElement("article");
    hCard.classList.add("single-card");
    hCard.anime = anime; // Store anime object for use in event handlers
    // #endregion

    // #region Left part
    const hLeft = document.createElement("div");
    hLeft.classList.add("single-left");
    // #region Left top row
    const hLeftTopRow = document.createElement("div");
    hLeftTopRow.classList.add("single-left-toprow");
    // #region Close button
    const hClose = document.createElement("button");
    hClose.innerText = "Stäng";
    hClose.addEventListener("click", e => history.back());
    hLeftTopRow.appendChild(hClose);
    // #endregion
    // #region Save button
    const hSave = document.createElement("button");
    hSave.innerText = anime.saved ? "Ta bort" : "Spara";
    hSave.addEventListener("click", anime.saved ? onSavedRemove : onSavedAdd);
    hSave.anime = anime; // Store anime object for use in event handler
    hLeftTopRow.appendChild(hSave);
    // #endregion
    // #region Watched
    if (anime.saved) {
        const hWatchedLabel = document.createElement("label");
        hWatchedLabel.innerText = "Sedd";
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
    // #endregion
    hLeft.appendChild(hLeftTopRow);
    // #endregion
    // #region Poster
    const hPoster = document.createElement("img");
    hPoster.src = anime.poster_s3;
    hPoster.classList.add("poster");
    hLeft.appendChild(hPoster);
    // #endregion
    // #region Genres
    const hGenres = createGenreDivs(anime);
    hLeft.appendChild(hGenres);
    // #endregion
    hCard.appendChild(hLeft);
    // #endregion

    // #region Right part
    const hRight = document.createElement("div");
    // #region Top row
    const hRightTopRow = document.createElement("div");
    hRightTopRow.classList.add("single-right-toprow");
    const hScore = document.createElement("span");
    hScore.innerText = "Poäng: " + formatDecimalPlaces(anime.score, 1);
    hRightTopRow.appendChild(hScore);
    if (anime.saved) {
        const hRatingLbl = document.createElement("label");
        hRatingLbl.htmlFor = "rating";
        hRatingLbl.innerText = "Betyg:";
        hRatingLbl.appendChild(createRatingSelect(anime));
        hRightTopRow.appendChild(hRatingLbl);
    }
    hRight.appendChild(hRightTopRow);
    // #endregion
    // #region Title english
    const hTitleEn = document.createElement("h2");
    hTitleEn.innerText = anime.title_en;
    hRight.appendChild(hTitleEn);
    // #endregion
    // #region Title
    const hTitle = document.createElement("h3");
    hTitle.innerText = anime.title;
    hRight.appendChild(hTitle);
    // #endregion
    // #region Synopsis
    const hSynopsis = document.createElement("p");
    hSynopsis.innerText = anime.synopsis;
    hRight.appendChild(hSynopsis);
    // #endregion
    hCard.appendChild(hRight);
    // #endregion

    hcMain.appendChild(hCard);
}
function createCard(anime, tab) {
    // Returns a small card article element for the supplied anime object

    const hCard = document.createElement("article");
    hCard.classList.add("anime-card");

    // #region Top row
    const hTopRow = document.createElement("div");
    hTopRow.classList.add("card-toprow");
    // #region Save button
    const hSave = document.createElement("button");
    hSave.innerText = tab === 1 ? "Ta bort" : "Spara";
    if (anime.saved && tab === 0) {
        hSave.disabled = true;
        hSave.classList.add("disabled");
    }
    hSave.addEventListener("click", anime.saved ? onSavedRemove : onSavedAdd);
    hSave.anime = anime; // Store anime object for use in event handler
    hTopRow.appendChild(hSave);
    // #endregion
    // #region Score
    const hScore = document.createElement("span");
    hScore.innerText = "Poäng: " + formatDecimalPlaces(anime.score, 1);
    hTopRow.appendChild(hScore);
    // #endregion
    // #region Watched
    if (anime.saved) {
        const hWatchedLabel = document.createElement("label");
        hWatchedLabel.innerText = "Sedd";
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
    // #endregion
    hCard.appendChild(hTopRow);
    // #endregion

    // #region Image
    const hPosterLink = document.createElement("a");
    hPosterLink.href = "#";
    hPosterLink.addEventListener("click", onSingleTab);
    const hPoster = document.createElement("img");
    hPoster.src = anime.poster_s3;
    hPoster.anime = anime; // Needs to be on the img for some reason. Store anime object for use in event handler
    hPoster.classList.add("poster");
    hPosterLink.appendChild(hPoster);
    hCard.appendChild(hPosterLink);
    // #endregion

    // #region Title
    const hTitleEn = document.createElement("h2");
    hTitleEn.innerText = anime.title_en ? anime.title_en : anime.title;
    hCard.appendChild(hTitleEn);
    // #endregion

    // #region Genres
    const hGenres = createGenreDivs(anime);
    hCard.appendChild(hGenres);
    // #endregion

    return hCard;
}
function createRow(anime, tab) {
    const hRow = document.createElement("div");
    hRow.classList.add("anime-row");
    hRow.anime = anime; // Store anime object for use in event handlers

    // #region Save / unsave button
    const hSave = document.createElement("button");
    hSave.innerText = tab === 1 ? "Ta bort" : "Spara";
    hSave.addEventListener("click", anime.saved ? onSavedRemove : onSavedAdd);
    hSave.anime = anime; // Store anime object for use in event handler
    if (tab === 0 && anime.saved) {
        hSave.disabled = true;
        hSave.classList.add("disabled");
    }
    hRow.appendChild(hSave);
    // #endregion
    // #region Watched
    if (tab === 1) {
        const hWatched = document.createElement("input");
        hWatched.type = "checkbox";
        //hWatched.id = `chkWatched${anime.id}`;
        hWatched.checked = anime.watched;
        hWatched.addEventListener("click", onSavedWatched);
        hWatched.anime = anime; // Store anime object for use in event handler
        hRow.appendChild(hWatched);
    }
    // #endregion
    // #region Score
    const hScore = document.createElement("span");
    hScore.innerText = formatDecimalPlaces(anime.score, 1);
    hRow.appendChild(hScore);
    // #endregion
    // #region My rating
    if (tab === 1) {
        hRow.appendChild(createRatingSelect(anime));
    }
    // #endregion
    // #region Title
    const hTitleDiv = document.createElement("div");
    const hTitleEn = document.createElement("a");
    hTitleEn.href = "/myanime/details/" + anime.id;
    hTitleEn.addEventListener("click", onSingleTab);
    hTitleEn.anime = anime; // Store anime object for use in event handler
    hTitleEn.innerText = anime.title_en ? anime.title_en : anime.title;
    hTitleDiv.appendChild(hTitleEn);
    hRow.appendChild(hTitleDiv);
    // #endregion

    return hRow;
}
function createRatingSelect(anime) {
    const hRating = document.createElement("select");
    hRating.addEventListener("change", onRatingChange);
    hRating.anime = anime; // Store anime object for use in event handler
    for (let i = 0; i < 11; i++) {
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
function createGenreDivs(anime) {
    const hGenres = document.createElement("div");
    hGenres.classList.add("card-genres");
    for (const genre of anime.genres) {
        const hGenre = document.createElement("div");
        hGenre.classList.add("card-genre");
        hGenre.innerText = genre.name;
        hGenres.appendChild(hGenre);
    }
    return hGenres;
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
function showHideElements(tab) {
    hTxtQuery.hidden = tab !== 0;
    hBtnSearch.hidden = tab !== 0;
    hBtnPrev.hidden = tab !== 0;
    hBtnNext.hidden = tab !== 0;
    hLblFilterWatched.hidden = tab !== 1;
    hChkFilterWatched.hidden = tab !== 1;
    hLblShowList.hidden = tab === 2;
    hChkShowList.hidden = tab === 2;
    hTest.hidden = tab === 2;
}
function pushStateSearch(query) {
    const state = {
        tab: 0,
        query: query
    };
    pushState("search?q=" + query, state, "Sök");
}
function pushStateSaved() {
    const state = {
        tab: 1
    };
    pushState("saved", state, "Sparade");
}
function pushStateSingle(id) {
    const state = {
        tab: 2,
        id: id
    };
    pushState("details/" + id, state, "Detaljer");
}
function pushState(urlend, state, titleEnd) {
    const nextURL = URL_BASE + urlend;
    let title = "Mina Anime - " + titleEnd;
    state.title = title;
    document.title = title;
    window.history.pushState(state, title, nextURL);
}
// #endregion

// #region Classes
class Anime {
    constructor(
        id, title, title_en, poster_s1, poster_s2, poster_s3,
        synopsis, genres, score, saved, watched, myRating) {

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
// #endregion
