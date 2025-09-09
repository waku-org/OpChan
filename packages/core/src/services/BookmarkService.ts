import { Bookmark, BookmarkType, Post, Comment } from '../types/forum';
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
  public static async bookmarkPost(
    post: Post,
    userId: string,
    cellId?: string
  ): Promise<Bookmark> {
    const bookmark: Bookmark = {
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
  public static async bookmarkComment(
    comment: Comment,
    userId: string,
    postId?: string
  ): Promise<Bookmark> {
    // Create a preview of the comment content for display
    const preview =
      comment.content.length > 100
        ? `${comment.content.substring(0, 100)}...`
        : comment.content;

    const bookmark: Bookmark = {
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
  public static async removeBookmark(
    type: BookmarkType,
    targetId: string
  ): Promise<void> {
    const bookmarkId = `${type}:${targetId}`;
    await localDatabase.removeBookmark(bookmarkId);
  }

  /**
   * Toggle bookmark status for a post
   */
  public static async togglePostBookmark(
    post: Post,
    userId: string,
    cellId?: string
  ): Promise<boolean> {
    const isBookmarked = localDatabase.isBookmarked(userId, 'post', post.id);

    if (isBookmarked) {
      await this.removeBookmark(BookmarkType.POST, post.id);
      return false;
    } else {
      await this.bookmarkPost(post, userId, cellId);
      return true;
    }
  }

  /**
   * Toggle bookmark status for a comment
   */
  public static async toggleCommentBookmark(
    comment: Comment,
    userId: string,
    postId?: string
  ): Promise<boolean> {
    const isBookmarked = localDatabase.isBookmarked(
      userId,
      'comment',
      comment.id
    );

    if (isBookmarked) {
      await this.removeBookmark(BookmarkType.COMMENT, comment.id);
      return false;
    } else {
      await this.bookmarkComment(comment, userId, postId);
      return true;
    }
  }

  /**
   * Check if a post is bookmarked by a user
   */
  public static isPostBookmarked(userId: string, postId: string): boolean {
    return localDatabase.isBookmarked(userId, 'post', postId);
  }

  /**
   * Check if a comment is bookmarked by a user
   */
  public static isCommentBookmarked(
    userId: string,
    commentId: string
  ): boolean {
    return localDatabase.isBookmarked(userId, 'comment', commentId);
  }

  /**
   * Get all bookmarks for a user
   */
  public static async getUserBookmarks(userId: string): Promise<Bookmark[]> {
    return localDatabase.getUserBookmarks(userId);
  }

  /**
   * Get bookmarks by type for a user
   */
  public static async getUserBookmarksByType(
    userId: string,
    type: BookmarkType
  ): Promise<Bookmark[]> {
    return localDatabase.getUserBookmarksByType(userId, type);
  }

  /**
   * Get bookmark by ID
   */
  public static getBookmark(bookmarkId: string): Bookmark | undefined {
    return localDatabase.getBookmark(bookmarkId);
  }

  /**
   * Get all bookmarks (for debugging/admin purposes)
   */
  public static getAllBookmarks(): Bookmark[] {
    return localDatabase.getAllBookmarks();
  }

  /**
   * Clear all bookmarks for a user (useful for account cleanup)
   */
  public static async clearUserBookmarks(userId: string): Promise<void> {
    const bookmarks = await this.getUserBookmarks(userId);
    await Promise.all(
      bookmarks.map((bookmark) => localDatabase.removeBookmark(bookmark.id))
    );
  }
}
