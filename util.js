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

export function type(value) {
    if (value === null) {
        return "null";
    }
    const baseType = typeof value;
    if (!["object", "function"].includes(baseType)) {
        return baseType;
    }
    const tag = value[Symbol.toStringTag];
    if (typeof tag === "string") {
        return tag;
    }
    if (baseType === "function" && Function.prototype.toString.call(value).startsWith("class")) {
        return "class";
    }
    const className = value.constructor.name;
    if (typeof className === "string" && className !== "") {
        return className;
    }
    return baseType;
}