// +++ Gobal constants
//const BASE_URL = "https://api.jikan.moe/v4/top/anime?now&sfw";
const BASE_URL = "https://api.jikan.moe/v4/";
const URL_SEARCH = "getAnimeSearch?&sfw";

// +++ Globala variabler
const gMyAnimes = [];
let gPage = 1;
let gQuery = "";

// +++ Event handlers
document.querySelector("#btnSearch").addEventListener("click", onSearch);
document.querySelector("#btnNextPage").addEventListener("click", onNextPage);
document.querySelector("#btnPrevPage").addEventListener("click", onPrevPage);

// +++ Event listeners
async function onSearch(e) {
    e.preventDefault();
    gPage = 1;
    const hForm = document.querySelector("#frmSearch");
    if (!hForm.reportValidity())
        return;
    const hQuery = document.querySelector("#txtQuery");
    gQuery = hQuery.value;
    loadAnimeData();
}
async function onNextPage(e) {
    e.preventDefault();
    if (gQuery.length > 0) {
        gPage++;
        getImages();
    }
}
async function onPrevPage(e) {
    e.preventDefault();
    if (gPage > 1 && gQuery.length > 0) {
        gPage--;
        getImages();
    }
}

// +++ Other functions
async function loadAnimeData() {
    try {
        const json = await fetchJSON(BASE_URL + `getAnimeSearch?q=${gQuery}&sfw`);
        console.log(json);
        const hMain = document.querySelector("main");
        for (anime of json.data) {
            const hPoster = document.createElement("img");
            hPoster.src = anime.images.jpg.image_url;
            hMain.appendChild(hPoster);
            const hTitle = document.createElement("h2");
            hTitle.innerText = anime.title;
            hMain.appendChild(hTitle);
            const hTitleEn = document.createElement("h3");
            hTitleEn.innerText = anime.title_english;
            hMain.appendChild(hTitleEn);
        }
        document.querySelector("h1").innerText = "Fetched";
    }
    catch (e) {
        console.error(e.message);
    }

}

// +++ Utility functions
async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(response);
    const data = await response.json();
    return data;
}
