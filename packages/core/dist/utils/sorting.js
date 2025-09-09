/**
 * Sort posts by relevance score (highest first)
 */
export const sortByRelevance = (items) => {
    return items.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
};
/**
 * Sort by timestamp (newest first)
 */
export const sortByTime = (items) => {
    return items.sort((a, b) => b.timestamp - a.timestamp);
};
/**
 * Sort posts with a specific option
 */
export const sortPosts = (posts, option) => {
    switch (option) {
        case 'relevance':
            return sortByRelevance(posts);
        case 'time':
            return sortByTime(posts);
        default:
            return sortByRelevance(posts);
    }
};
/**
 * Sort comments with a specific option
 */
export const sortComments = (comments, option) => {
    switch (option) {
        case 'relevance':
            return sortByRelevance(comments);
        case 'time':
            return sortByTime(comments);
        default:
            return sortByRelevance(comments);
    }
};
/**
 * Sort cells with a specific option
 */
export const sortCells = (cells, option) => {
    switch (option) {
        case 'relevance':
            return sortByRelevance(cells);
        case 'time':
            return sortByTime(cells);
        default:
            return sortByRelevance(cells);
    }
};
//# sourceMappingURL=sorting.js.map