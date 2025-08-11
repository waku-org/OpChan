import { Post, Comment, Cell } from '@/types';

export type SortOption = 'relevance' | 'time';

/**
 * Sort posts by relevance score (highest first)
 */
export const sortByRelevance = (items: Post[] | Comment[] | Cell[]) => {
  return items.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
};

/**
 * Sort by timestamp (newest first)
 */
export const sortByTime = (items: Post[] | Comment[] | Cell[]) => {
  return items.sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Sort posts with a specific option
 */
export const sortPosts = (posts: Post[], option: SortOption): Post[] => {
  switch (option) {
    case 'relevance':
      return sortByRelevance(posts) as Post[];
    case 'time':
      return sortByTime(posts) as Post[];
    default:
      return sortByRelevance(posts) as Post[];
  }
};

/**
 * Sort comments with a specific option
 */
export const sortComments = (comments: Comment[], option: SortOption): Comment[] => {
  switch (option) {
    case 'relevance':
      return sortByRelevance(comments) as Comment[];
    case 'time':
      return sortByTime(comments) as Comment[];
    default:
      return sortByRelevance(comments) as Comment[];
  }
};

/**
 * Sort cells with a specific option
 */
export const sortCells = (cells: Cell[], option: SortOption): Cell[] => {
  switch (option) {
    case 'relevance':
      return sortByRelevance(cells) as Cell[];
    case 'time':
      return sortByTime(cells) as Cell[];
    default:
      return sortByRelevance(cells) as Cell[];
  }
};
