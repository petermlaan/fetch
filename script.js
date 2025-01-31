import { fetchJSON } from "./util.js";

// #region ----- Gobal constants        ..... 
const API_URL_BASE = "https://api.jikan.moe/v4/";
const API_URL_SEARCH = "anime?sfw&q="; // add query and page=x
const API_URL_SEARCH_TOP = "top/anime?sfw&type="; // add type and page=x
const API_URL_ANIME = "anime/"; // fetch a single anime by id
const URL_BASE = "/myanime/"; // Our url when state pushing
const LS_MODEL = "model"; // local storage key
// #endregion

// #region ----- Global variables       ----- 
let gSearchResults = []; // Last search result
let gSavedAnimes = []; // Animes saved by the user
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
window.addEventListener("popstate", onWindowPopstate);
// #endregion

gSavedAnimes = loadSavedAnimes();
showSaved(gSavedAnimes);
window.history.scrollRestoration = "auto";

// #region ----- Event listeners        ----- 
function onSearchTab(e) {
    // Show the search tab
    e.preventDefault();
    if (gTab !== 0) {
        gTab = 0;
        pushStateSearch(gQuery, gPage);
    }
    showHideElements(gTab);
    showSearchResults(gSearchResults);
}
function onSavedTab(e) {
    // Show all saved animes as cards or in a list
    e.preventDefault();
    if (gTab !== 1) {
        pushStateSaved();
        gTab = 1;
    }
    showHideElements(gTab);
    showSaved(gSavedAnimes);
}
function onSingleTab(e) {
    // Show a detailed view for a single anime
    e.preventDefault();
    const anime = e.target.anime;
    if (gTab !== 2) {
        gTab = 2;
        pushStateSingle(anime.id);
    }
    showHideElements(gTab);
    showSingle(anime);
}
function onChkShowList(e) {
    // Show cards or a list for the search tab or the saved tab
    if (gTab === 0)
        showSearchResults(gSearchResults);
    else
        showSaved(gSavedAnimes);
}
async function onBtnSearch(e) {
    // Search button pressed. Use the API to make the search.
    try {
        e.preventDefault();
        gPage = 1;
        const newQuery = hTxtQuery.value;
        const newType = hSelType.value;
        const topSearch = hChkTopSearch.checked;
        if (topSearch) {
            if (newType !== gType)
                pushStateSearchTop(newType, gPage);
        } else {
            if (newQuery !== gQuery || newType !== gType)
                pushStateSearch(newQuery, gPage);
        }
        gQuery = newQuery;
        gType = newType;
        gSearchResults = await search(gQuery, gPage, topSearch, gType, gSavedAnimes);
        showSearchResults(gSearchResults);
    }
    catch (err) {
        console.error(err);
        alert("Vi har för tillfället problem med vår animedatabas. Försök igen senare!");
    }
}
async function onBtnNextPage(e) {
    // Show the next page of the search results.
    e.preventDefault();
    if (gQuery || hChkTopSearch.checked) {
        gPage++;
        gSearchResults = await search(gQuery, gPage, hChkTopSearch.checked, hSelType.value, gSavedAnimes);
        showSearchResults(gSearchResults);
        if (hChkTopSearch.checked)
            pushStateSearchTop(hSelType.value, gPage);
        else
            pushStateSearch(gQuery, gPage);
    }
}
async function onBtnPrevPage(e) {
    // Show the previous page of the search results.
    e.preventDefault();
    if (gPage > 1 && (gQuery || hChkTopSearch.checked)) {
        gPage--;
        gSearchResults = await search(gQuery, gPage, hChkTopSearch.checked, hSelType.value, gSavedAnimes);
        showSearchResults(gSearchResults);
        if (hChkTopSearch.checked)
            pushStateSearchTop(hSelType.value, gPage);
        else
            pushStateSearch(gQuery, gPage);
    }
}
function onChkTopSearch(e) {
    // Switches beteen normal search and top search
    if (e.target.checked)
    {
        hTxtQuery.disabled = true;
        hTxtQuery.classList.add("disabled");
    } else {
        hTxtQuery.disabled = false;
        hTxtQuery.classList.remove("disabled");
    }
}
function onChkFilterWatched(e) {
    // Switches between showing all saved animes or only unwatched ones.
    showSaved(gSavedAnimes);
}
function onBtnSave(e) {
    // Adds the anime to the saved list
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
function onBtnRemove(e) {
    // Removes the anime from the saved list
    const anime = e.target.anime;
    gSavedAnimes.splice(gSavedAnimes.findIndex(a => a.id === anime.id), 1);
    storeSavedAnimes(gSavedAnimes);
    showSaved(gSavedAnimes);
}
function onBtnClose(e) {
    // Closes the single tab (details view)
    history.back();
}
function onChkWatched(e) {
    // Marks the anime as having been watched
    e.target.anime.watched = !e.target.anime.watched;
    storeSavedAnimes(gSavedAnimes);
}
function onSelRating(e) {
    // Sets the user rating for the anime
    const anime = e.target.anime;
    anime.myRating = +e.target.value;
    storeSavedAnimes(gSavedAnimes);
}
function onHeaderRow(e) {
    // Sort the list by the column title clicked
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
async function onWindowPopstate(e) {
    // The user clicked the forward or backward button in the browser
    const state = e.state;
    if (!state) {
        // No state object means this was the first page = saved tab
        gTab = 1;
        showHideElements(gTab);
        showSaved(gSavedAnimes);
        document.title = "Mina Anime";
        return;
    }
    document.title = state.title;
    gTab = state.tab;
    showHideElements(gTab);
    switch (gTab) {
        case 0: // Search tab
            gPage = state.page;
            console.log(state);
            if (state.topSearch) {
                const useOldSearchResults = gType === state.type && gPage === state.page;
                gType = state.type;
                if (!useOldSearchResults)
                    gSearchResults = await search(null, gPage, true, state.type, gSavedAnimes);
            } else {
                const useOldSearchResults = gQuery === state.query && gPage === state.page;
                gQuery = state.query;
                if (!useOldSearchResults) {
                    if (gQuery)
                        gSearchResults = await search(gQuery, gPage, false, state.type, gSavedAnimes);
                    else
                        gSearchResults = [];
                }
            }
            showSearchResults(gSearchResults);
            break;
        case 1: // Saved tab
            showSaved(gSavedAnimes);
            break;
        case 2: // Single tab
            let anime = gSavedAnimes.find(a => a.id === state.id);
            if (!anime && gSearchResults)
                anime = gSearchResults.find(a => a.id === state.id);
            if (!anime)
                anime = await fetchAnime(state.id);
            showSingle(anime);
            break;
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
    // Sends a search query to the API and returns an array of anime objects.
    // Also disables or enables next and prev page buttons.
    // topSearch = results are sorted by score.
    // query is not used if topSearch = true.
    const json = topSearch ? 
        await fetchJSON(API_URL_BASE + API_URL_SEARCH_TOP + `${type}&page=${page}`) :
        await fetchJSON(API_URL_BASE + API_URL_SEARCH + `${query}&type=${type}&page=${page}`);
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
        const savedanime = savedAnimes.find(b => b.id === a.id);
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
    const savedanime = gSavedAnimes.find(b => b.id === res.id);
    if (savedanime) // return the saved version if possible
        res = savedanime;
    return res;
}
async function showSearchResults(animes) {
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
    hClose.addEventListener("click", onBtnClose);
    hLeftTopRow.appendChild(hClose);
    // #endregion
    // #region Save button
    const hSave = document.createElement("button");
    hSave.innerText = anime.saved ? "Ta bort" : "Spara";
    hSave.addEventListener("click", anime.saved ? onBtnRemove : onBtnSave);
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
        hWatched.addEventListener("click", onChkWatched);
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
    hScore.innerText = "Poäng: " + (anime.score ? anime.score.toFixed(1) : "");
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
    hSave.addEventListener("click", anime.saved ? onBtnRemove : onBtnSave);
    hSave.anime = anime; // Store anime object for use in event handler
    hTopRow.appendChild(hSave);
    // #endregion

    // #region Score
    const hScore = document.createElement("span");
    hScore.innerText = "Poäng: " + (anime.score ? anime.score.toFixed(1) : "");
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
    const hTitleEn = document.createElement("h2");
    hTitleEn.innerText = anime.title_en;
    hTitleEn.anime = anime; // Needs to be on the h2 for some reason. Store anime object for use in event handler.
    hTitleLink.appendChild(hTitleEn);
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
    hSave.addEventListener("click", anime.saved ? onBtnRemove : onBtnSave);
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
        hWatched.addEventListener("click", onChkWatched);
        hWatched.anime = anime; // Store anime object for use in event handler
        hRow.appendChild(hWatched);
    }
    // #endregion
    // #region Score
    const hScore = document.createElement("span");
    hScore.innerText = anime.score ? anime.score.toFixed(1) : "";
    hScore.classList.add("center");
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
    hLblTopSearch.hidden = tab !== 0;
    hChkTopSearch.hidden = tab !== 0;
    hLblType.hidden = tab !== 0;
    hSelType.hidden = tab !== 0;
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
function loadSavedAnimes() {
    // Loads saved animes from local storage and returns them.
    let res = [];
    const m = localStorage.getItem(LS_MODEL);
    res = m ? JSON.parse(m) : [];
    if (!res)
        res = [];
    return res;
}
function storeSavedAnimes(animes) {
    // Stores the animes in local storage
    localStorage.setItem(LS_MODEL, JSON.stringify(animes));
}
function pushStateSearch(query, page, type) {
    // Adds a history state for the search tab
    const state = {
        tab: 0,
        topSearch: false,
        query: query,
        page: page,
        type: type,
    };
    pushState(`search?q=${query}&page=${page}`, state, " - Sök");
}
function pushStateSearchTop(type, page) {
    // Adds a history state for the search tab
    const state = {
        tab: 0,
        topSearch: true,
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
        Object.freeze(this);
    }
}
// #endregion
