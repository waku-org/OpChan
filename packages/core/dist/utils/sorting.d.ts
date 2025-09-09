import { Post, Comment, Cell } from '../types/forum';
export type SortOption = 'relevance' | 'time';
/**
 * Sort posts by relevance score (highest first)
 */
export declare const sortByRelevance: (items: Post[] | Comment[] | Cell[]) => Comment[] | Post[] | Cell[];
/**
 * Sort by timestamp (newest first)
 */
export declare const sortByTime: (items: Post[] | Comment[] | Cell[]) => Comment[] | Post[] | Cell[];
/**
 * Sort posts with a specific option
 */
export declare const sortPosts: (posts: Post[], option: SortOption) => Post[];
/**
 * Sort comments with a specific option
 */
export declare const sortComments: (comments: Comment[], option: SortOption) => Comment[];
/**
 * Sort cells with a specific option
 */
export declare const sortCells: (cells: Cell[], option: SortOption) => Cell[];
//# sourceMappingURL=sorting.d.ts.map