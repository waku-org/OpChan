import { Bookmark, BookmarkType, Post, Comment } from '../types/forum';
/**
 * Service for managing bookmarks
 * Handles all bookmark-related operations including CRUD operations
 * and metadata extraction for display purposes
 */
export declare class BookmarkService {
    /**
     * Create a bookmark for a post
     */
    static bookmarkPost(post: Post, userId: string, cellId?: string): Promise<Bookmark>;
    /**
     * Create a bookmark for a comment
     */
    static bookmarkComment(comment: Comment, userId: string, postId?: string): Promise<Bookmark>;
    /**
     * Remove a bookmark
     */
    static removeBookmark(type: BookmarkType, targetId: string): Promise<void>;
    /**
     * Toggle bookmark status for a post
     */
    static togglePostBookmark(post: Post, userId: string, cellId?: string): Promise<boolean>;
    /**
     * Toggle bookmark status for a comment
     */
    static toggleCommentBookmark(comment: Comment, userId: string, postId?: string): Promise<boolean>;
    /**
     * Check if a post is bookmarked by a user
     */
    static isPostBookmarked(userId: string, postId: string): boolean;
    /**
     * Check if a comment is bookmarked by a user
     */
    static isCommentBookmarked(userId: string, commentId: string): boolean;
    /**
     * Get all bookmarks for a user
     */
    static getUserBookmarks(userId: string): Promise<Bookmark[]>;
    /**
     * Get bookmarks by type for a user
     */
    static getUserBookmarksByType(userId: string, type: BookmarkType): Promise<Bookmark[]>;
    /**
     * Get bookmark by ID
     */
    static getBookmark(bookmarkId: string): Bookmark | undefined;
    /**
     * Get all bookmarks (for debugging/admin purposes)
     */
    static getAllBookmarks(): Bookmark[];
    /**
     * Clear all bookmarks for a user (useful for account cleanup)
     */
    static clearUserBookmarks(userId: string): Promise<void>;
}
//# sourceMappingURL=BookmarkService.d.ts.map