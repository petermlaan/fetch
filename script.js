
// +++ Gobal constants
const API_URL_BASE = "https://api.jikan.moe/v4/";
const API_URL_SEARCH = "anime?sfw&q=";
const URL_BASE = "/myanime/";
const LS_MODEL = "model";

// +++ Global variables
let gMyAnimes = []; // Saved animes
let gSearchResults = [];
let gFilterWatched = false;
let gPage = 1; // search pagination
let gQuery = ""; // The latest search query
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
showSaved();
pushState("");

// +++ Event listeners
function onSearchTab(e) {
    e.preventDefault();
    showSearchElements(true);
    if (gTab !== 0) {
        console.log("changing url to search tab...");
        const state = { additionalInformation: 'Updated the URL with JS' };
        pushState("search?q=" + gQuery, state);
        console.log(window.history);
        gTab = 0;
    }
    showSearchResults();
}
function onSavedTab(e) {
    e.preventDefault();
    if (gTab !== 1) {
        console.log("changing url to saved...");
        const state = { additionalInformation: 'Updated the URL with JS' };
        pushState("saved", state);
        console.log(window.history);
        gTab = 1;
    }
    showSaved();
}
function onSingleTab(e) {
    e.preventDefault();
    const anime = e.target.anime;
    if (gTab !== 2) {
        console.log("changing url to single...");
        const state = { additionalInformation: 'Updated the URL with JS' };
        pushState("details?id=" + anime.id, state);
        console.log(window.history);
        gTab = 2;
    }
    showSingle(anime);
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
        const newQuery = document.querySelector("#txtQuery").value;
        if (newQuery !== gQuery) {
            console.log("changing url to new search query...");
            const state = { additionalInformation: 'Updated the URL with JS' };
            pushState("search?q=" + newQuery, state);
            console.log(window.history);
        }
        gPage = 1;
        const hForm = document.querySelector("#frmSearch");
        if (!hForm.reportValidity())
            return;
        gQuery = newQuery;
        const json = await fetchJSON(API_URL_BASE + API_URL_SEARCH + `${gQuery}&page=${gPage}`);
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
                ja.synopsis,
                ja.genres,
                ja.score,
                false,
                false,
                0
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
    const anime = e.target.anime;
    anime.saved = true;
    gMyAnimes.unshift(anime);
    model2storage();
    if (gTab === 2)
        showSaved();
    else
        e.target.parentElement.remove(); // remove the card/row
}
function onSavedRemove(e) {
    const anime = e.target.anime;
    gMyAnimes.splice(gMyAnimes.findIndex(i => i.id === anime.id), 1);
    model2storage();
    showSaved();
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
    console.log("history changed event");
    console.log(e);
}
async function onTest(e) {
    // Add some test data
    async function addAnime(id) {
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
        gMyAnimes = [];
        console.log("Is array? " + Array.isArray(gMyAnimes));
        await addAnime(121);
        await addAnime(431);
/*        await addAnime(813);
        await addAnime(512);
        await addAnime(1);
        await addAnime(32281);
        await addAnime(1943);
        await addAnime(21);
        await addAnime(572);
        await addAnime(523);
        await addAnime(199);
        addAnime(5114);
        addAnime(164);
        addAnime(1535);
        addAnime(31964);
        addAnime(40748);
        addAnime(41467);
        addAnime(38000);
        addAnime(57334);
        addAnime(16498);
        addAnime(37521);*/
        model2storage();
        gTab = 1;
        showSaved();
    } catch (err) {
        console.error(err);
    }
}

// +++ Other functions
async function showSearchResults() {
    hcMain.innerHTML = ""; // clear the container
    const hcCards = document.createElement("div"); // container for the cards
    hcCards.id = hChkShowList.checked ? "cListSearch" : "cCards";
    for (const a of gSearchResults) {
        if (hChkShowList.checked)
            hcCards.appendChild(createRow(a));
        else
            hcCards.appendChild(createCard(a));
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
            hTitleRow.innerHTML = "<span></span><span>Har sett</span><span>Betyg</span><span>Poäng</span><span>Titel</span>";
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
function showSingle(anime) {
    hcMain.innerHTML = "";
    const hCard = document.createElement("article");
    hCard.classList.add("single-card");
    hCard.anime = anime; // Store anime object for use in event handlers

    // Left
    const hLeft = document.createElement("div");
    // Save button
    const hSave = document.createElement("button");
    hSave.innerText = anime.saved ? "Ta bort" : "Spara";
    hSave.addEventListener("click", anime.saved ? onSavedRemove : onSavedAdd);
    hSave.anime = anime; // Store anime object for use in event handler
    hLeft.appendChild(hSave);
    // Watched
    if (anime.saved) {
        const hWatchedLabel = document.createElement("label");
        hWatchedLabel.innerText = "Har sett";
        hWatchedLabel.htmlFor = `chkWatched${anime.id}`;
        hLeft.appendChild(hWatchedLabel);
        const hWatched = document.createElement("input");
        hWatched.type = "checkbox";
        hWatched.id = `chkWatched${anime.id}`;
        hWatched.checked = anime.watched;
        hWatched.addEventListener("click", onSavedWatched);
        hWatched.anime = anime; // Store anime object for use in event handler
        hLeft.appendChild(hWatched);
    }
    // Image
    const hPoster = document.createElement("img");
    hPoster.src = anime.poster_s3;
    hPoster.classList.add("poster");
    hLeft.appendChild(hPoster);
    hCard.appendChild(hLeft);
    // Right
    const hRight = document.createElement("div");
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
        hRow.appendChild(hRating);
    }
    const hScore = document.createElement("span");
    hScore.innerText = anime.score;
    hRow.appendChild(hScore);
    // Title
    const hTitleEn = document.createElement("a");
    hTitleEn.href = "#";
    hTitleEn.addEventListener("click", onSingleTab);
    hTitleEn.anime = anime; // Store anime object for use in event handler
    hTitleEn.innerText = anime.title_en ? anime.title_en : anime.title;
    hRow.appendChild(hTitleEn);

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
    console.log("model2storage: gMyAnimes");
    console.log(gMyAnimes);
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
function pushState(urlend, state) {
    const nextURL = URL_BASE + urlend;
    let title = "My Anime -";
    switch (gTab) {
        case 0:
            title += "Search";
            break;
        case 1:
            title += "Saved";
            break;
        default:
            title += "Details";
            break;
    }
    window.history.pushState(state, title, nextURL);
}
