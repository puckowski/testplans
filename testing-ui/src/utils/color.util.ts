// Simple string hash function (djb2)
export const hashString = (str: string) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
    }
    return hash >>> 0; // Ensure unsigned
}

// Generate vibrant color from tag string
export const tagToColor = (tag: string) => {
    if (!tag) return '#ccc'; // Fallback for empty tags
    const hash = hashString(tag);
    // Vibrant HSL: Hue [0-360], Saturation [70-100]%, Lightness [50-60]%
    const hue = hash % 360;
    const saturation = 80 + (hash % 20); // 80-99%
    const lightness = 50 + (hash % 10); // 50-59%
    // You can return as hsl or convert to rgb if you prefer
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
        l - a * Math.max(-1, Math.min(Math.min(k(n) - 3, 9 - k(n)), 1));
    return [
        Math.round(255 * f(0)),
        Math.round(255 * f(8)),
        Math.round(255 * f(4))
    ];
}

// Compute luminance (relative, per WCAG)
function luminance([r, g, b]: [number, number, number]): number {
    const toLinear = (c: number) => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

// Choose black or white for best contrast
export const contrastingForeground = (tag: string) => {
    if (!tag) return '#000'; // Fallback for empty tags
    const hash = hashString(tag);
    const hue = hash % 360;
    const saturation = 80 + (hash % 20);
    const lightness = 50 + (hash % 10);

    const rgb = hslToRgb(hue, saturation, lightness);
    const bgLum = luminance(rgb);
    // White luminance = 1, Black = 0
    // Use WCAG contrast ratio formula (threshold ~0.5 for midtones)
    return bgLum > 0.55 ? "#222" : "#fff"; // tweak threshold as needed
};
