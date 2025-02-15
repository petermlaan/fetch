import { createElement, fetchJSON, getParamBool, getParamNumber, getParamString, type } from "./util.js";

// #region ----- Gobal constants        ..... 
const API_URL_BASE = "https://api.jikan.moe/v4/";
const API_URL_ANIME = "anime/"; // fetch a single anime by id
const API_URL_SEARCH = "anime?sfw&q="; // add query and page=x
const API_URL_SEARCH_TOP = "top/anime?sfw&type="; // add type and page=x
const LS_MODEL = "model"; // local storage key
const TITLES = [" - Sök", "", " - "].map(t => "Mina Anime" + t); // Page titles for the tabs

// URL parameters for this page
const URL_PARAM_TAB = "tab";
const URL_PARAM_QUERY = "q";
const URL_PARAM_TYPE = "type";
const URL_PARAM_PAGE = "page";
const URL_PARAM_TOPSEARCH = "top";
const URL_PARAM_ANIME_ID = "id";
// #endregion

// #region ----- Global variables       ----- 
let gSearchResults = []; // Last search result
let gSavedAnimes = []; // Animes saved by the user
let gTopSearch = false; // Was the last search a top search?
let gQuery = ""; // The last search query
let gType = ""; // The last search type
let gPage = 1; // for search pagination
let gTab = 1; // For site navigation. 0 - search, 1 - saved animes, 2 - single anime

// Last sort: true = ascending, false = descending.
let gTitleSort = false;
let gRatingSort = true;
let gScoreSort = true;
let gWatchedSort = true;
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
hBtnSearch.addEventListener("click", onBtnSearch);
hBtnNext.addEventListener("click", onBtnNextPage);
hBtnPrev.addEventListener("click", onBtnPrevPage);
hChkTopSearch.addEventListener("click", onChkTopSearch);
hChkFilterWatched.addEventListener("click", onChkFilterWatched);
hChkShowList.addEventListener("click", onChkShowList);
hTest.addEventListener("click", onTest);
document.querySelector("#frmSearch").addEventListener("submit", onBtnSearch);
document.querySelector("#mnuSearch").addEventListener("click", onSearchTab);
document.querySelector("#mnuCards").addEventListener("click", onSavedTab);
window.addEventListener("popstate", onWindowPopState);
// #endregion

// #region ----- Startup code           ----- 
try {
    window.history.scrollRestoration = "auto";
    gSavedAnimes = loadSavedAnimes();
    onWindowPopState({}); // Parse the current url
}
catch (err) {
    showError(err);
}
// #endregion

// #region ----- Event listeners        ----- 
function onSearchTab(e) {
    // Show the search tab
    try {
        e.preventDefault();
        if (gTab !== 0) {
            // This means that we have switched tab
            gTab = 0;
            if (hChkTopSearch.checked)
                pushStateSearchTop(gType, gPage);
            else
                pushStateSearch(gQuery, gPage, gType);
        }
        showHideElements(gTab);
        showSearchResults(gSearchResults); // Show the old search results, if any
    }
    catch (err) {
        showError(err);
    }
}
function onSavedTab(e) {
    // Show all saved animes as cards or in a list
    try {
        e.preventDefault();
        if (gTab !== 1) {
            // This means that we have switched tab
            gTab = 1;
            pushStateSaved();
        }
        showHideElements(gTab);
        showSaved(gSavedAnimes);
    }
    catch (err) {
        showError(err);
    }
}
function onSingleTab(e) {
    // Show a detailed view for a single anime
    try {
        e.preventDefault();
        const anime = e.target.anime;
        if (gTab !== 2) {
            // This means that we have switched tab
            gTab = 2;
            pushStateSingle(anime);
        }
        showHideElements(gTab);
        showSingle(anime);
    }
    catch (err) {
        showError(err);
    }
}
async function onBtnSearch(e) {
    // Search button pressed. Use the API to make the search.
    try {
        e.preventDefault();
        gPage = 1;
        const newQuery = hTxtQuery.value;
        const newType = hSelType.value;
        const newTopSearch = hChkTopSearch.checked;
        let hasNextPage = false;
        [gSearchResults, hasNextPage] = await search(newQuery, gPage, newTopSearch, newType, gSavedAnimes);
        checkNextPrev(hasNextPage, gPage);
        if (newTopSearch) {
            hTxtQuery.value = "";
            if (newType !== gType || newTopSearch !== gTopSearch)
                pushStateSearchTop(newType, gPage, hasNextPage);
        } else {
            if (newQuery !== gQuery || newType !== gType)
                pushStateSearch(newQuery, gPage, newType, hasNextPage);
        }
        gQuery = newQuery;
        gType = newType;
        gTopSearch = newTopSearch;
        showSearchResults(gSearchResults);
    }
    catch (err) {
        showError(err);
    }
}
async function onBtnNextPage(e) {
    // Show the next page of the search results.
    try {
        e.preventDefault();
        gPage++;
        let hasNextPage = false;
        [gSearchResults, hasNextPage] = await search(gQuery, gPage, hChkTopSearch.checked, hSelType.value, gSavedAnimes);
        showSearchResults(gSearchResults);
        checkNextPrev(hasNextPage, gPage);
        if (hChkTopSearch.checked)
            pushStateSearchTop(hSelType.value, gPage, hasNextPage);
        else
            pushStateSearch(gQuery, gPage, hSelType.value, hasNextPage);
    }
    catch (err) {
        showError(err);
    }
}
async function onBtnPrevPage(e) {
    // Show the previous page of the search results.
    try {
        e.preventDefault();
        if (gPage > 1) {
            gPage--;
            let hasNextPage = false;
            [gSearchResults, hasNextPage] = await search(gQuery, gPage, hChkTopSearch.checked, hSelType.value, gSavedAnimes);
            showSearchResults(gSearchResults);
            checkNextPrev(hasNextPage, gPage);
            if (hChkTopSearch.checked)
                pushStateSearchTop(hSelType.value, gPage, hasNextPage);
            else
                pushStateSearch(gQuery, gPage, hSelType.value, hasNextPage);
        }
    }
    catch (err) {
        showError(err);
    }
}
function onChkShowList(e) {
    // Switches between cards or a list for the search tab or the saved tab
    try {
        if (gTab === 0)
            showSearchResults(gSearchResults);
        else
            showSaved(gSavedAnimes);
    }
    catch (err) {
        showError(err);
    }
}
function onChkTopSearch(e) {
    // Switches beteen normal search and top search
    try {
        checkTopSearch();
    }
    catch (err) {
        showError(err);
    }
}
function onChkFilterWatched(e) {
    // Switches between showing all saved animes or only unwatched ones.
    try {
        showSaved(gSavedAnimes);
    }
    catch (err) {
        showError(err);
    }
}
function onBtnSave(e) {
    // Adds the anime to the saved list
    try {
        const anime = e.target.anime;
        anime.saved = true;
        if (gSavedAnimes.some(a => a.id === anime.id)) {
            alert("Redan sparad");
            return;
        }
        gSavedAnimes.unshift(anime);
        storeSavedAnimes(gSavedAnimes);
        if (gTab === 2)
            showSaved(gSavedAnimes);
        else {
            // remove the card/row
            if (hChkShowList.checked)
                e.target.parentElement.remove();
            else
                e.target.parentElement.parentElement.remove();
            gSearchResults.splice(gSearchResults.findIndex(a => a.id === anime.id), 1);
        }
    }
    catch (err) {
        showError(err);
    }
}
function onBtnRemove(e) {
    // Removes the anime from the saved list
    try {
        const anime = e.target.anime;
        gSavedAnimes.splice(gSavedAnimes.findIndex(a => a.id === anime.id), 1);
        storeSavedAnimes(gSavedAnimes);
        showSaved(gSavedAnimes);
    }
    catch (err) {
        showError(err);
    }
}
function onBtnClose(e) {
    // Closes the single tab (details view)
    try {
        history.back();
    }
    catch (err) {
        showError(err);
    }
}
function onChkWatched(e) {
    // Marks the anime as having been watched
    try {
        e.target.anime.watched = !e.target.anime.watched;
        storeSavedAnimes(gSavedAnimes);
    }
    catch (err) {
        showError(err);
    }
}
function onSelRating(e) {
    // Sets the user rating for the anime
    try {
        const anime = e.target.anime;
        anime.myRating = +e.target.value;
        storeSavedAnimes(gSavedAnimes);
    }
    catch (err) {
        showError(err);
    }
}
function onHeaderRow(e) {
    // Sort the list by the column title clicked
    try {
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
                case "1": // Score column
                    if (gWatchedSort) // sort a->z or z->a?
                        gSavedAnimes.sort((a, b) => b.watched - a.watched);
                    else
                        gSavedAnimes.sort((a, b) => a.watched - b.watched);
                    gWatchedSort = !gWatchedSort; // switch sort order for next time
                    break;
                case "2": // Score column
                    if (gScoreSort) // sort a->z or z->a?
                        gSavedAnimes.sort((a, b) => b.score - a.score);
                    else
                        gSavedAnimes.sort((a, b) => a.score - b.score);
                    gScoreSort = !gScoreSort; // switch sort order for next time
                    break;
                case "3": // Rating column
                    if (gRatingSort) // sort a->z or z->a?
                        gSavedAnimes.sort((a, b) => b.myRating - a.myRating);
                    else
                        gSavedAnimes.sort((a, b) => a.myRating - b.myRating);
                    gRatingSort = !gRatingSort; // switch sort order for next time
                    break;
                case "4": // Title column
                    if (gTitleSort) // sort a->z or z->a?
                        gSavedAnimes.sort((a, b) => b.title_en.localeCompare(a.title_en));
                    else
                        gSavedAnimes.sort((a, b) => a.title_en.localeCompare(b.title_en));
                    gTitleSort = !gTitleSort; // switch sort order for next time
                    break;
            }
            showSaved(gSavedAnimes);
        }
    }
    catch (err) {
        showError(err);
    }
}
async function onWindowPopState(e) {
    // The user clicked the forward or backward button in the browser
    try {
        let hasNextPage = false;
        const params = new URLSearchParams(window.location.search);
        gTab = getParamNumber(params, URL_PARAM_TAB, 1);
        switch (gTab) {
            case 0: // Search tab
                const newTopSearch = getParamBool(params, URL_PARAM_TOPSEARCH, false);
                hChkTopSearch.checked = newTopSearch;
                const newType = getParamString(params, URL_PARAM_TYPE, "");
                hSelType.value = newType;
                const newQuery = getParamString(params, URL_PARAM_QUERY, "");
                hTxtQuery.value = newQuery;
                const newPage = getParamNumber(params, URL_PARAM_PAGE, 1);
                if (newTopSearch) {
                    // Check if we can reuse the old search result
                    if (!(gType === newType && gPage === newPage && gTopSearch === newTopSearch)) {
                        gType = newType;
                        gPage = newPage;
                        gTopSearch = newTopSearch;
                        [gSearchResults, hasNextPage] = await search(null, gPage, true, gType, gSavedAnimes);
                    }
                } else {
                    // Check if we can reuse the old search result
                    if (!(gQuery === newQuery && gPage === newPage && gType === newType && gTopSearch === newTopSearch)) {
                        gQuery = newQuery;
                        gPage = newPage;
                        gType = newType;
                        gTopSearch = newTopSearch;
                        if (gQuery) {
                            [gSearchResults, hasNextPage] = await search(gQuery, gPage, false, gType, gSavedAnimes);
                        } else
                            gSearchResults = [];
                    }
                }
                setTitle(gTab);
                showSearchResults(gSearchResults);
                break;
            case 1: // Saved tab
                setTitle(gTab);
                showSaved(gSavedAnimes);
                break;
            case 2: // Single tab
                if (params.has(URL_PARAM_ANIME_ID)) {
                    const id = +params.get(URL_PARAM_ANIME_ID);
                    // Check if we already have the anime
                    let anime = gSavedAnimes.find(a => a.id === id);
                    if (!anime && gSearchResults)
                        anime = gSearchResults.find(a => a.id === id);
                    if (!anime)
                        anime = await fetchAnime(id);
                    setTitleSingle(gTab, anime);
                    showSingle(anime);
                } else {
                    gTab = 1;
                    showSaved(gSavedAnimes);
                }
                break;
        }
        showHideElements(gTab);
        checkTopSearch();
        checkNextPrev(e.state ? e.state.hasNextPage : hasNextPage, gPage);
    }
    catch (err) {
        showError(err);
    }
}
async function onTest(e) {
    // Adds two animes to the saved list (from a list of 21)
    async function addAnime(id) {
        const a = await fetchAnime(id);
        a.saved = true;
        gSavedAnimes.push(a);
    }
    try {
        e.preventDefault();
        let added = 0;
        const ids = [1, 121, 431, 813, 512, 32281, 1943, 21, 572, 523, 199, 5114, 164, 1535, 31964, 40748, 41467, 38000, 57334, 16498, 37521];
        for (const id of ids) {
            if (!gSavedAnimes.some(a => a.id === id)) {
                await addAnime(id)
                added++;
                if (added > 1)
                    break;
            };
        }
        storeSavedAnimes(gSavedAnimes);
        gTab = 1;
        showSaved(gSavedAnimes);
    } catch (err) {
        console.error(err);
    }
}
// #endregion

// #region ----- Other functions        ----- 
async function search(query, page, topSearch, type, savedAnimes) {
    /* Sends a search query to the API.
       Returns an array of anime objects and has_next_page.
       topSearch = results are sorted by score.
       query is not used if topSearch = true. */
    const json = topSearch ?
        await fetchJSON(API_URL_BASE + API_URL_SEARCH_TOP + `${type}&page=${page}`) :
        await fetchJSON(API_URL_BASE + API_URL_SEARCH + `${query}&type=${type}&page=${page}`);
    console.log(json.data);
    const animes = [];
    for (const ja of json.data) {
        let a = createAnime(ja);
        const savedanime = savedAnimes.find(b => b.id === a.id);
        if (savedanime)
            a = savedanime;
        animes.push(a);
    }
    return [animes, json.pagination.has_next_page];
}
async function fetchAnime(id) {
    // Fetches anime info from the API and returns an anime object.
    const json = await fetchJSON(API_URL_BASE + API_URL_ANIME + id);
    console.log(json.data);
    const res = createAnime(json.data);
    // return the saved version if possible
    const savedanime = gSavedAnimes.find(b => b.id === res.id);
    if (savedanime) 
        res = savedanime;
    return res;
}
function showSearchResults(animes) {
    // Renders the animes in the search tab
    hMain.innerHTML = ""; // clear the container
    const hCards = document.createElement("div");
    hCards.id = hChkShowList.checked ? "cListSearch" : "cCards";
    // Header row
    if (hChkShowList.checked) {
        const hHeaderRow = document.createElement("div");
        hHeaderRow.innerHTML = [["", 0], ["Poäng", 1], ["Titel", 2]]
            .reduce((a, [s, c]) => a + `<div><a href="#" col="${c}">${s}</a></div>`, "");
        hHeaderRow.childNodes.forEach(n => n.firstChild.addEventListener("click", onHeaderRow));
        hHeaderRow.classList.add("title-row");
        hCards.appendChild(hHeaderRow);
    }
    // Anime rows
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
    // Header row
    if (hChkShowList.checked) {
        const hHeaderRow = document.createElement("div");
        hHeaderRow.innerHTML = // col is used in onTitle for sorting
            [["", 0], ["Sedd", 1], ["Poäng", 2], ["Betyg", 3], ["Titel", 4]]
                .reduce((a, [s, c]) => a + `<div><a href="#" col="${c}">${s}</a></div>`, "");
        hHeaderRow.childNodes.forEach(n => n.firstChild.addEventListener("click", onHeaderRow));
        hHeaderRow.classList.add("title-row");
        hContainer.appendChild(hHeaderRow);
    }
    // Anime rows
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

    // The card container
    const hCard = document.createElement("article");
    hCard.classList.add("single-card");
    hCard.anime = anime; // Store anime object for use in event handlers

    // #region Left part
    const hLeft = document.createElement("div");
    hLeft.classList.add("single-left");

    // Left top row
    const hLeftTopRow = document.createElement("div");
    hLeftTopRow.classList.add("single-left-toprow");
    createElement(hLeftTopRow, "button", "Stäng")
        .addEventListener("click", onBtnClose);

    // Save button
    const hSave = createElement(hLeftTopRow, "button", anime.saved ? "Ta bort" : "Spara");
    hSave.addEventListener("click", anime.saved ? onBtnRemove : onBtnSave);
    hSave.anime = anime; // Store anime object for use in event handler

    // #region Watched
    if (anime.saved) {
        createElement(hLeftTopRow, "label", "Sedd")
            .htmlFor = "chkWatched";
        const hWatched = document.createElement("input");
        hWatched.type = "checkbox";
        hWatched.id = "chkWatched";
        hWatched.checked = anime.watched;
        hWatched.addEventListener("click", onChkWatched);
        hWatched.anime = anime; // Store anime object for use in event handler
        hLeftTopRow.appendChild(hWatched);
    }
    // #endregion

    hLeft.appendChild(hLeftTopRow);

    // #region Poster image
    const hPoster = document.createElement("img");
    hPoster.src = anime.poster_s3;
    hPoster.classList.add("poster");
    hLeft.appendChild(hPoster);
    // #endregion

    // Genres
    const hGenres = createGenresDiv(anime);
    hLeft.appendChild(hGenres);

    hCard.appendChild(hLeft);
    // #endregion

    // #region Right part
    const hRight = document.createElement("div");

    const hRightTopRow = document.createElement("div");
    hRightTopRow.classList.add("single-right-toprow");
    createElement(hRightTopRow, "span", "Poäng: " + (anime.score ? anime.score.toFixed(1) : ""))
    if (anime.saved) {
        const hRatingLbl = createElement(hRightTopRow, "label", "Betyg: ");
        hRatingLbl.appendChild(createRatingSelect(anime));
        hRatingLbl.htmlFor = "rating";
    }
    hRight.appendChild(hRightTopRow);

    createElement(hRight, "h2", anime.title_en);
    createElement(hRight, "h3", anime.title);
    createElement(hRight, "p", `Från: ${anime.aired} --- Källa: ${anime.source} --- Typ: ${anime.type}`);
    createElement(hRight, "p", anime.synopsis);
    createElement(hRight, "p", anime.background);
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
    hSave.addEventListener("click", anime.saved ? onBtnRemove : onBtnSave);
    hSave.anime = anime; // Store anime object for use in event handler
    hTopRow.appendChild(hSave);
    // #endregion

    createElement(hTopRow, "span", "Poäng: " + (anime.score ? anime.score.toFixed(1) : ""));

    // #region Watched
    const hWatchedLabel = createElement(hTopRow, "label", "Sedd");
    hWatchedLabel.htmlFor = `chkWatched${anime.id}`;
    if (tab === 0)
        hWatchedLabel.style.visibility = "hidden";
    const hWatched = document.createElement("input");
    hWatched.type = "checkbox";
    hWatched.id = `chkWatched${anime.id}`;
    hWatched.checked = anime.watched;
    hWatched.addEventListener("click", onChkWatched);
    hWatched.anime = anime; // Store anime object for use in event handler
    if (tab === 0)
        hWatched.style.visibility = "hidden";
    hWatchedLabel.appendChild(hWatched);
    // #endregion

    hCard.appendChild(hTopRow);
    // #endregion

    // #region Title
    const hTitleLink = document.createElement("a");
    hTitleLink.href = "#";
    hTitleLink.addEventListener("click", onSingleTab);
    createElement(hTitleLink, "h2", anime.title_en)
        .anime = anime; // Needs to be on the h2 for some reason. Store anime object for use in event handler.
    hCard.appendChild(hTitleLink);
    // #endregion

    // #region Poster image
    const hPosterLink = document.createElement("a");
    hPosterLink.href = "#";
    hPosterLink.addEventListener("click", onSingleTab);
    const hPoster = document.createElement("img");
    hPoster.src = anime.poster_s3;
    hPoster.anime = anime; // Needs to be on the img for some reason. Store anime object for use in event handler.
    hPoster.classList.add("poster");
    hPosterLink.appendChild(hPoster);
    hCard.appendChild(hPosterLink);
    // #endregion

    // #region Genres
    const hGenres = createGenresDiv(anime);
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
    const hSave = createElement(hRow, "button", tab === 1 ? "Ta bort" : "Spara");
    hSave.addEventListener("click", anime.saved ? onBtnRemove : onBtnSave);
    hSave.anime = anime; // Store anime object for use in event handler
    if (tab === 0 && anime.saved) {
        hSave.disabled = true;
        hSave.classList.add("disabled");
    }
    // #endregion

    // #region Watched
    if (tab === 1) {
        const hWatched = document.createElement("input");
        hWatched.type = "checkbox";
        hWatched.checked = anime.watched;
        hWatched.addEventListener("click", onChkWatched);
        hWatched.anime = anime; // Store anime object for use in event handler
        hRow.appendChild(hWatched);
    }
    // #endregion

    createElement(hRow, "span", anime.score?.toFixed(1) ?? "")
        .classList.add("center");
    if (tab === 1)
        hRow.appendChild(createRatingSelect(anime));

    // #region Title
    const hTitleDiv = document.createElement("div");
    const hTitleEn = createElement(hTitleDiv, "a", anime.title_en);
    hTitleEn.href = "#";
    hTitleEn.addEventListener("click", onSingleTab);
    hTitleEn.anime = anime; // Store anime object for use in event handler
    hRow.appendChild(hTitleDiv);
    // #endregion

    return hRow;
}
function createRatingSelect(anime) {
    // Returns a SELECT element for rating
    const hRating = document.createElement("select");
    hRating.addEventListener("change", onSelRating);
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
function createGenresDiv(anime) {
    // Returns a div element with all genres
    const hGenres = document.createElement("div");
    hGenres.classList.add("card-genres");
    for (const genre of anime.genres)
        createElement(hGenres, "div", genre.name, "card-genre");
    return hGenres;
}
function setTitleSingle(tab, { title_en }) {
    setTitle(tab, title_en);
}
function setTitle(tab, titleEnd) {
    document.title = TITLES[tab] + (titleEnd ?? "");
}
function showError(err) {
    console.log(err);
    hMain.innerHTML = `<div id='errormsg'>
    <p>${err.name}: ${err.message}</p>
    <p>Stack: ${err.stack}</p>
    </div>`;
}
function showHideElements(tab) {
    hTxtQuery.hidden = tab !== 0;
    hBtnSearch.hidden = tab !== 0;
    hBtnPrev.hidden = tab !== 0;
    hBtnNext.hidden = tab !== 0;
    hLblTopSearch.hidden = tab !== 0;
    hChkTopSearch.hidden = tab !== 0;
    hLblType.hidden = tab !== 0;
    hSelType.hidden = tab !== 0;
    hLblFilterWatched.hidden = tab !== 1;
    hChkFilterWatched.hidden = tab !== 1;
    hLblShowList.hidden = tab === 2;
    hChkShowList.hidden = tab === 2;
    hTest.hidden = tab !== 1;
}
function checkNextPrev(has_next_page, current_page) {
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
function checkTopSearch() {
    // Switches beteen normal search and top search
    if (hChkTopSearch.checked) {
        hTxtQuery.disabled = true;
        hTxtQuery.classList.add("disabled");
    } else {
        hTxtQuery.disabled = false;
        hTxtQuery.classList.remove("disabled");
    }
}
function loadSavedAnimes() {
    // Returns saved animes from local storage.
    if (!localStorage)
        throw new Error("Local storage is unavailable. Please activate it in your browser.");
    const m = localStorage.getItem(LS_MODEL);
    let res = m ? JSON.parse(m) : [];
    if (type(res) !== "Array")
        res = [];
    return res ?? [];
}
function storeSavedAnimes(animes) {
    // Stores the animes in local storage
    localStorage.setItem(LS_MODEL, JSON.stringify(animes));
}
function pushStateSearch(query, page, type, hasNextPage) {
    // Adds a history state for the search tab
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set(URL_PARAM_TAB, 0);
    params.set(URL_PARAM_TOPSEARCH, 0);
    params.set(URL_PARAM_TYPE, type);
    params.set(URL_PARAM_QUERY, query);
    params.set(URL_PARAM_PAGE, page);
    url.search = params.toString();
    const state = { hasNextPage: hasNextPage };
    pushState(url, TITLES[0], state);
}
function pushStateSearchTop(type, page, hasNextPage) {
    // Adds a history state for the search tab
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set(URL_PARAM_TAB, 0);
    params.set(URL_PARAM_TOPSEARCH, 1);
    params.set(URL_PARAM_TYPE, type);
    params.set(URL_PARAM_PAGE, page);
    url.search = params.toString();
    const state = { hasNextPage: hasNextPage };
    pushState(url, TITLES[0], state);
}
function pushStateSaved() {
    // Adds a history state for the saved tab
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set(URL_PARAM_TAB, 1);
    url.search = params.toString();
    pushState(url, TITLES[1]);
}
function pushStateSingle({ id, title_en }) {
    // Adds a history state for the details tab
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set(URL_PARAM_TAB, 2);
    params.set(URL_PARAM_ANIME_ID, id);
    url.search = params.toString();
    pushState(url, TITLES[2] + title_en);
}
function pushState(url, title, state) {
    // Adds a history state to enable back and forth browser navigation
    document.title = title;
    window.history.pushState(state, title, url);
}
function createAnime(jsonAnime) {
    return new Anime(
        jsonAnime.mal_id,
        jsonAnime.title,
        jsonAnime.title_english,
        jsonAnime.images.jpg.thumbnail_image_url,
        jsonAnime.images.jpg.small_image_url,
        jsonAnime.images.jpg.large_image_url,
        jsonAnime.synopsis,
        jsonAnime.background,
        jsonAnime.aired.from,
        jsonAnime.genres,
        jsonAnime.source,
        jsonAnime.type,
        jsonAnime.score,
        false,
        false,
        0,
    );
}
// #endregion

// #region ----- Classes                ----- 
class Anime {
    constructor(
        id, title, title_en, poster_s1, poster_s2, poster_s3,
        synopsis, background, aired, genres, source, type, score, saved, watched, myRating) {

        this.id = id;
        this.title = title ? title : title_en;
        this.title_en = title_en ? title_en : title;
        this.poster_s1 = poster_s1;
        this.poster_s2 = poster_s2;
        this.poster_s3 = poster_s3;
        this.synopsis = synopsis ?? "";
        this.background = background ?? "";
        this.aired = aired ? (new Date(aired)).toLocaleDateString("se-sv") : "";
        this.genres = genres;
        this.source = source;
        this.type = type;
        this.score = score ?? 0;
        this.saved = saved;
        this.watched = watched;
        this.myRating = myRating;
    }
}
// #endregion
