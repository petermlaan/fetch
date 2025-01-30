import { fetchJSON, formatDecimalPlaces } from "./util.js";

// #region ----- Gobal constants        ..... 
const API_URL_BASE = "https://api.jikan.moe/v4/";
const API_URL_SEARCH = "anime?sfw&q="; // add query and optionally page=x
const API_URL_SEARCH_TOP = "top/anime?sfw&type="; // add query, page=x, cat=y
const API_URL_ANIME = "anime/"; // fetch a single anime by id
const URL_BASE = "/myanime/"; // Our url when state pushing
const LS_MODEL = "model"; // local storage key
// #endregion

// #region ----- Global variables       ----- 
let gSearchResults = []; // Last search result
let gMyAnimes = []; // Saved animes
let gQuery = ""; // The latest search query
let gPage = 1; // search pagination
let gTab = 1; // For site navigation. 0 - search, 1 - saved, 2 - single
let gTitleSort = false;
let gRatingSort = true;
let gScoreSort = true;
// #endregion

// #region ----- Global html elements   ----- 
const hTxtQuery = document.querySelector("#txtQuery");
const hBtnSearch = document.querySelector("#btnSearch");
const hBtnNext = document.querySelector("#btnNextPage");
const hBtnPrev = document.querySelector("#btnPrevPage");
const hChkTopSearch = document.querySelector("#chkTopSearch");
const hLblTopSearch = document.querySelector("#lblTopSearch");
const hSelType = document.querySelector("#selType");
const hLblType = document.querySelector("#lblType");
const hChkFilterWatched = document.querySelector("#chkFilterWatched");
const hLblFilterWatched = document.querySelector("#lblFilterWatched");
const hLblShowList = document.querySelector("#lblShowList");
const hChkShowList = document.querySelector("#chkShowList");
const hTest = document.querySelector("#btnTest");
const hMain = document.querySelector("#cMain");
// #endregion

// #region ----- Add event listeners    ----- 
hBtnSearch.addEventListener("click", onSearch);
hBtnNext.addEventListener("click", onNextPage);
hBtnPrev.addEventListener("click", onPrevPage);
hChkFilterWatched.addEventListener("click", onFilterWatched);
hChkShowList.addEventListener("click", onShowList);
hTest.addEventListener("click", onTest);
document.querySelector("#frmSearch").addEventListener("submit", onSearch);
document.querySelector("#mnuSearch").addEventListener("click", onSearchTab);
document.querySelector("#mnuCards").addEventListener("click", onSavedTab);
window.addEventListener("popstate", onHistoryChanged)
// #endregion

gMyAnimes = loadMyAnimes();
showSaved(gMyAnimes);

// #region ----- Event listeners        ----- 
function onSearchTab(e) {
    e.preventDefault();
    if (gTab !== 0) {
        gTab = 0;
        pushStateSearch(gQuery, gPage);
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
        const hForm = document.querySelector("#frmSearch");
        if (!hForm.reportValidity())
            return;
        gPage = 1;
        const newQuery = hTxtQuery.value;
        const topSearch = hChkTopSearch.checked;
        const type = hSelType.value;
        if (topSearch) {
            pushStateSearchTop(type, gPage);
        } else {
            if (newQuery !== gQuery)
                pushStateSearch(newQuery, gPage);
        }
        gQuery = newQuery;
        gSearchResults = await search(gQuery, gPage, topSearch, type);
        showSearchResults(gSearchResults);
    }
    catch (err) {
        console.error(err);
    }
}
async function onNextPage(e) {
    e.preventDefault();
    if (gQuery || hChkTopSearch.checked) {
        gPage++;
        gSearchResults = await search(gQuery, gPage, hChkTopSearch.checked, hSelType.value);
        showSearchResults(gSearchResults);
        if (hChkTopSearch.checked)
            pushStateSearchTop(hSelType.value, gPage);
        else
            pushStateSearch(gQuery, gPage);
    }
}
async function onPrevPage(e) {
    e.preventDefault();
    if (gPage > 1 && (gQuery || hChkTopSearch.checked)) {
        gPage--;
        gSearchResults = await search(gQuery, gPage, hChkTopSearch.checked, hSelType.value);
        showSearchResults(gSearchResults);
        if (hChkTopSearch.checked)
            pushStateSearchTop(hSelType.value, gPage);
        else
            pushStateSearch(gQuery, gPage);
    }
}
function onFilterWatched(e) {
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
    storeMyAnimes(gMyAnimes);
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
    storeMyAnimes(gMyAnimes);
    showSaved(gMyAnimes);
}
function onClose(e) {
    history.back();
}
function onSavedWatched(e) {
    e.target.anime.watched = !e.target.anime.watched;
    storeMyAnimes(gMyAnimes);
}
function onRatingChange(e) {
    const anime = e.target.anime;
    anime.myRating = +e.target.value;
    storeMyAnimes(gMyAnimes);
}
function onTitle(e) {
    e.preventDefault();
    const col = e.target.attributes["col"].value;
    if (gTab === 0) {
        switch (col) {
            case "1": // Score column
                if (gScoreSort) // sort a->z or z->a?
                    gSearchResults.sort((a, b) => b.score - a.score);
                else
                    gSearchResults.sort((a, b) => a.score - b.score);
                gScoreSort = !gScoreSort; // switch sort order for next time
                break;
            case "2": // Title column
                if (gTitleSort) // sort a->z or z->a?
                    gSearchResults.sort((a, b) => b.title_en.localeCompare(a.title_en));
                else
                    gSearchResults.sort((a, b) => a.title_en.localeCompare(b.title_en));
                gTitleSort = !gTitleSort; // switch sort order for next time
                break;
        }
        showSearchResults(gSearchResults);
    } else {
        switch (col) {
            case "2": // Score column
                if (gScoreSort) // sort a->z or z->a?
                    gMyAnimes.sort((a, b) => b.score - a.score);
                else
                    gMyAnimes.sort((a, b) => a.score - b.score);
                gScoreSort = !gScoreSort; // switch sort order for next time
                break;
            case "3": // Rating column
                if (gRatingSort) // sort a->z or z->a?
                    gMyAnimes.sort((a, b) => b.myRating - a.myRating);
                else
                    gMyAnimes.sort((a, b) => a.myRating - b.myRating);
                gRatingSort = !gRatingSort; // switch sort order for next time
                break;
            case "4": // Title column
                if (gTitleSort) // sort a->z or z->a?
                    gMyAnimes.sort((a, b) => b.title_en.localeCompare(a.title_en));
                else
                    gMyAnimes.sort((a, b) => a.title_en.localeCompare(b.title_en));
                gTitleSort = !gTitleSort; // switch sort order for next time
                break;
        }
        showSaved(gMyAnimes);
    }
}
async function onHistoryChanged(e) {
    if (!e.state) {
        gTab = 1;
        showHideElements(gTab);
        showSaved(gMyAnimes);
        document.title = "Mina Anime";
        return;
    }
    document.title = e.state.title;
    gTab = e.state.tab;
    showHideElements(gTab);
    switch (gTab) {
        case 0: // Search tab
            const useOldSearchResults = gQuery === e.state.query && gPage === e.state.page;
            ({ query: gQuery, page: gPage } = e.state);
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
            let anime = gMyAnimes.find(a => a.id === e.state.id);
            if (!anime && gSearchResults)
                anime = gSearchResults.find(a => a.id === e.state.id);
            if (!anime)
                anime = await fetchAnime(e.state.id);
            showSingle(anime);
            break;
    }
}
async function onTest(e) {
    // Add some test data
    async function addAnime(id) {
        const a = await fetchAnime(id);
        a.saved = true;
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
                if (added > 1)
                    break;
            };
        }
        storeMyAnimes(gMyAnimes);
        gTab = 1;
        showSaved(gMyAnimes);
    } catch (err) {
        console.error(err);
    }
}
// #endregion

// #region ----- Other functions        ----- 
async function search(query, page, topSearch, type) {
    // Sends a search query to the API and returns an array of anime objects.
    // Also disables or enables next and prev page buttons.
    let json = null;
    if (topSearch)
        json = await fetchJSON(API_URL_BASE + API_URL_SEARCH_TOP + `${type}&page=${page}`);
    else
        json = await fetchJSON(API_URL_BASE + API_URL_SEARCH + `${query}&page=${page}`);
    console.log(json);
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
    checkNextPrev(json.pagination);
    return res;
}
async function fetchAnime(id) {
    // Fetches anime info from the API and returns an anime object.
    const json = await fetchJSON(API_URL_BASE + API_URL_ANIME + id);
    const ja = json.data;
    const res = new Anime(
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
    const savedanime = gMyAnimes.find(b => b.id === res.id);
    if (savedanime) // return the saved version if possible
        res = savedanime;
    return res;
}
async function showSearchResults(animes) {
    // Renders the animes in the search tab
    hMain.innerHTML = ""; // clear the container
    const hCards = document.createElement("div");
    hCards.id = hChkShowList.checked ? "cListSearch" : "cCards";
    // Add title row
    if (hChkShowList.checked) {
        const hTitleRow = document.createElement("div");
        hTitleRow.innerHTML = [["", 0], ["Poäng", 1], ["Titel", 2]]
            .reduce((a, [s, c]) => a + `<div><a href="#" col="${c}">${s}</a></div>`, "");
        hTitleRow.childNodes.forEach(n => n.firstChild.addEventListener("click", onTitle));
        hTitleRow.classList.add("title-row");
        hCards.appendChild(hTitleRow);
    }
    // Add animes
    for (const a of animes) {
        if (hChkShowList.checked)
            hCards.appendChild(createRow(a, 0));
        else
            hCards.appendChild(createCard(a, 0));
    }
    hMain.appendChild(hCards); // Add cards to html page
}
function showSaved(animes) {
    // Renders the animes in the saved tab
    hMain.innerHTML = "";
    const hContainer = document.createElement("div");
    hContainer.id = hChkShowList.checked ? "cListSaved" : "cCards";
    // Add title row
    if (hChkShowList.checked) {
        const hTitleRow = document.createElement("div");
        hTitleRow.innerHTML = // col us used in onTitle for sorting
            [["", 0], ["Sedd", 1], ["Poäng", 2], ["Betyg", 3], ["Titel", 4]]
                .reduce((a, [s, c]) => a + `<div><a href="#" col="${c}">${s}</a></div>`, "");
        hTitleRow.childNodes.forEach(n => n.firstChild.addEventListener("click", onTitle));
        hTitleRow.classList.add("title-row");
        hContainer.appendChild(hTitleRow);
    }
    // Add animes
    for (const a of animes) {
        if (!hChkFilterWatched.checked || !a.watched) {
            if (hChkShowList.checked)
                hContainer.appendChild(createRow(a, 1));
            else
                hContainer.appendChild(createCard(a, 1));
        };
    };
    hMain.appendChild(hContainer);
}
function showSingle(anime) {
    // Renders the anime in the single tab
    hMain.innerHTML = ""; // clear the area

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
    hClose.addEventListener("click", onClose);
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

    // #region Poster image
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
        hRatingLbl.innerText = "Betyg: ";
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

    hMain.appendChild(hCard);
}
function createCard(anime, tab) {
    // Returns a small card element for the anime
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
    const hWatchedLabel = document.createElement("label");
    hWatchedLabel.innerText = "Sedd";
    hWatchedLabel.htmlFor = `chkWatched${anime.id}`;
    if (tab === 0)
        hWatchedLabel.style.visibility = "hidden";
    hTopRow.appendChild(hWatchedLabel);
    const hWatched = document.createElement("input");
    hWatched.type = "checkbox";
    hWatched.id = `chkWatched${anime.id}`;
    hWatched.checked = anime.watched;
    hWatched.addEventListener("click", onSavedWatched);
    hWatched.anime = anime; // Store anime object for use in event handler
    if (tab === 0)
        hWatched.style.visibility = "hidden";
    hWatchedLabel.appendChild(hWatched);
    // #endregion

    hCard.appendChild(hTopRow);
    // #endregion

    // #region Title
    const hTitleEn = document.createElement("h2");
    hTitleEn.innerText = anime.title_en ? anime.title_en : anime.title;
    hCard.appendChild(hTitleEn);
    // #endregion

    // #region Poster image
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

    // #region Genres
    const hGenres = createGenreDivs(anime);
    hCard.appendChild(hGenres);
    // #endregion

    return hCard;
}
function createRow(anime, tab) {
    // Returns a row element for the anime
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
    // Returns a SELECT element for rating
    const hRating = document.createElement("select");
    hRating.addEventListener("change", onRatingChange);
    hRating.anime = anime; // Store anime object for later use in event handlers
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
    // Returns a div element with all genres
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
function checkNextPrev({ has_next_page, current_page }) {
    // Next page button
    if (has_next_page) {
        hBtnNext.disabled = false;
        hBtnNext.classList.remove("disabled");
    } else {
        hBtnNext.disabled = true;
        hBtnNext.classList.add("disabled");
    }
    // Prev page button
    if (current_page > 1) {
        hBtnPrev.disabled = false;
        hBtnPrev.classList.remove("disabled");
    } else {
        hBtnPrev.disabled = true;
        hBtnPrev.classList.add("disabled");
    }
}
function loadMyAnimes() {
    // Loads saved animes from local storage and returns them.
    let res = [];
    const m = localStorage.getItem(LS_MODEL);
    res = m ? JSON.parse(m) : [];
    if (!res)
        res = [];
    return res;
}
function storeMyAnimes(animes) {
    // Stores the animes in local storage
    localStorage.setItem(LS_MODEL, JSON.stringify(animes));
}
function pushStateSearch(query, page) {
    // Adds a history state for the search tab
    const state = {
        tab: 0,
        query: query,
        page: page
    };
    pushState(`search?q=${query}&page=${page}`, state, " - Sök");
}
function pushStateSearchTop(type, page) {
    // Adds a history state for the search tab
    const state = {
        tab: 0,
        type: type,
        page: page
    };
    pushState(`search?type=${type}&page=${page}`, state, " - Sök");
}
function pushStateSaved() {
    // Adds a history state for the saved tab
    const state = {
        tab: 1
    };
    pushState("", state, "");
}
function pushStateSingle(id) {
    // Adds a history state for the details tab
    const state = {
        tab: 2,
        id: id
    };
    pushState("details/" + id, state, " - Detaljer");
}
function pushState(urlend, state, titleEnd) {
    // Adds a history state to enable back and forth browser navigation
    const nextURL = URL_BASE + urlend;
    let title = "Mina Anime" + titleEnd;
    state.title = title;
    document.title = title;
    window.history.pushState(state, title, nextURL);
}
// #endregion

// #region ----- Classes                ----- 
class Anime {
    constructor(
        id, title, title_en, poster_s1, poster_s2, poster_s3,
        synopsis, genres, score, saved, watched, myRating) {

        this.id = id;
        this.title = title ? title : title_en;
        this.title_en = title_en ? title_en : title;
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
