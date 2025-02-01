export async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(response.status);
    const data = await response.json();
    return data;
}

// Converts "0" and "1" to a bool or returns def if key wasn´t found
export function getParamBool(params, key, def) {
    return params.has(key) ? !!+params.get(key) : def;
}

// Converts the value for the key to a number or returns def if not found
export function getParamNumber(params, key, def) {
    return params.has(key) ? +params.get(key) : def;
}

// Returns the value for the key or returns def if key wasn´t found
export function getParamString(params, key, def) {
    return params.has(key) ? params.get(key) : def;
}
