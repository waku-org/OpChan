import { BookmarkType } from '../types/forum';
import { localDatabase } from '../database/LocalDatabase';
/**
 * Service for managing bookmarks
 * Handles all bookmark-related operations including CRUD operations
 * and metadata extraction for display purposes
 */
export class BookmarkService {
    /**
     * Create a bookmark for a post
     */
    static async bookmarkPost(post, userId, cellId) {
        const bookmark = {
            id: `post:${post.id}`,
            type: BookmarkType.POST,
            targetId: post.id,
            userId,
            createdAt: Date.now(),
            title: post.title,
            author: post.author,
            cellId: cellId || post.cellId,
            postId: post.id,
        };
        await localDatabase.addBookmark(bookmark);
        return bookmark;
    }
    /**
     * Create a bookmark for a comment
     */
    static async bookmarkComment(comment, userId, postId) {
        // Create a preview of the comment content for display
        const preview = comment.content.length > 100
            ? `${comment.content.substring(0, 100)}...`
            : comment.content;
        const bookmark = {
            id: `comment:${comment.id}`,
            type: BookmarkType.COMMENT,
            targetId: comment.id,
            userId,
            createdAt: Date.now(),
            title: preview,
            author: comment.author,
            postId: postId || comment.postId,
        };
        await localDatabase.addBookmark(bookmark);
        return bookmark;
    }
    /**
     * Remove a bookmark
     */
    static async removeBookmark(type, targetId) {
        const bookmarkId = `${type}:${targetId}`;
        await localDatabase.removeBookmark(bookmarkId);
    }
    /**
     * Toggle bookmark status for a post
     */
    static async togglePostBookmark(post, userId, cellId) {
        const isBookmarked = localDatabase.isBookmarked(userId, 'post', post.id);
        if (isBookmarked) {
            await this.removeBookmark(BookmarkType.POST, post.id);
            return false;
        }
        else {
            await this.bookmarkPost(post, userId, cellId);
            return true;
        }
    }
    /**
     * Toggle bookmark status for a comment
     */
    static async toggleCommentBookmark(comment, userId, postId) {
        const isBookmarked = localDatabase.isBookmarked(userId, 'comment', comment.id);
        if (isBookmarked) {
            await this.removeBookmark(BookmarkType.COMMENT, comment.id);
            return false;
        }
        else {
            await this.bookmarkComment(comment, userId, postId);
            return true;
        }
    }
    /**
     * Check if a post is bookmarked by a user
     */
    static isPostBookmarked(userId, postId) {
        return localDatabase.isBookmarked(userId, 'post', postId);
    }
    /**
     * Check if a comment is bookmarked by a user
     */
    static isCommentBookmarked(userId, commentId) {
        return localDatabase.isBookmarked(userId, 'comment', commentId);
    }
    /**
     * Get all bookmarks for a user
     */
    static async getUserBookmarks(userId) {
        return localDatabase.getUserBookmarks(userId);
    }
    /**
     * Get bookmarks by type for a user
     */
    static async getUserBookmarksByType(userId, type) {
        return localDatabase.getUserBookmarksByType(userId, type);
    }
    /**
     * Get bookmark by ID
     */
    static getBookmark(bookmarkId) {
        return localDatabase.getBookmark(bookmarkId);
    }
    /**
     * Get all bookmarks (for debugging/admin purposes)
     */
    static getAllBookmarks() {
        return localDatabase.getAllBookmarks();
    }
    /**
     * Clear all bookmarks for a user (useful for account cleanup)
     */
    static async clearUserBookmarks(userId) {
        const bookmarks = await this.getUserBookmarks(userId);
        await Promise.all(bookmarks.map((bookmark) => localDatabase.removeBookmark(bookmark.id)));
    }
}
//# sourceMappingURL=BookmarkService.js.map