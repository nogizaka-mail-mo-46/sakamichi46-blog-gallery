/*
 * ========================================
 * 画像URL
 * ========================================
 */

export function getImageUrl(
    fileId
) {
    return `/image/${encodeURIComponent(fileId)}`;
}
