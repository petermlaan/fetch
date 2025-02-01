export async function fetchJSON(url) {
    console.log(url);
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(response.status);
    const data = await response.json();
    return data;
}

// converts the value for the key param to a bool or returns def if not found
export function getParamBool(params, key, def) {
    return params.has(key) ? !!+params.get(key) : def;
}

// converts the value for the key param to a bool or returns def if not found
export function getParamNumber(params, key, def) {
    return params.has(key) ? +params.get(key) : def;
}

// converts the value for the key param to a bool or returns def if not found
export function getParamString(params, key, def) {
    return params.has(key) ? params.get(key) : def;
}
