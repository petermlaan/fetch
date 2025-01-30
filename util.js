export async function fetchJSON(url) {
    console.log(url);
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(response.status);
    const data = await response.json();
    return data;
}
