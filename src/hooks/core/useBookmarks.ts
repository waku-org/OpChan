import { useState, useEffect, useCallback } from 'react';
import { Bookmark, BookmarkType, Post, Comment } from '@/types/forum';
import { BookmarkService } from '@/lib/services/BookmarkService';
import { useAuth } from '@/contexts/useAuth';

/**
 * Hook for managing bookmarks
 * Provides bookmark state and operations for the current user
 */
export function useBookmarks() {
  const { currentUser } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    if (!currentUser?.address) return;

    setLoading(true);
    setError(null);
    try {
      const userBookmarks = await BookmarkService.getUserBookmarks(
        currentUser.address
      );
      setBookmarks(userBookmarks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.address]);

  // Load user bookmarks when user changes
  useEffect(() => {
    if (currentUser?.address) {
      loadBookmarks();
    } else {
      setBookmarks([]);
    }
  }, [currentUser?.address, loadBookmarks]);

  const bookmarkPost = useCallback(
    async (post: Post, cellId?: string) => {
      if (!currentUser?.address) return false;

      try {
        const isBookmarked = await BookmarkService.togglePostBookmark(
          post,
          currentUser.address,
          cellId
        );
        await loadBookmarks(); // Refresh the list
        return isBookmarked;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to bookmark post'
        );
        return false;
      }
    },
    [currentUser?.address, loadBookmarks]
  );

  const bookmarkComment = useCallback(
    async (comment: Comment, postId?: string) => {
      if (!currentUser?.address) return false;

      try {
        const isBookmarked = await BookmarkService.toggleCommentBookmark(
          comment,
          currentUser.address,
          postId
        );
        await loadBookmarks(); // Refresh the list
        return isBookmarked;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to bookmark comment'
        );
        return false;
      }
    },
    [currentUser?.address, loadBookmarks]
  );

  const removeBookmark = useCallback(
    async (bookmarkId: string) => {
      try {
        const bookmark = BookmarkService.getBookmark(bookmarkId);
        if (bookmark) {
          await BookmarkService.removeBookmark(
            bookmark.type,
            bookmark.targetId
          );
          await loadBookmarks(); // Refresh the list
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to remove bookmark'
        );
      }
    },
    [loadBookmarks]
  );

  const isPostBookmarked = useCallback(
    (postId: string) => {
      if (!currentUser?.address) return false;
      return BookmarkService.isPostBookmarked(currentUser.address, postId);
    },
    [currentUser?.address]
  );

  const isCommentBookmarked = useCallback(
    (commentId: string) => {
      if (!currentUser?.address) return false;
      return BookmarkService.isCommentBookmarked(
        currentUser.address,
        commentId
      );
    },
    [currentUser?.address]
  );

  const getBookmarksByType = useCallback(
    (type: BookmarkType) => {
      return bookmarks.filter(bookmark => bookmark.type === type);
    },
    [bookmarks]
  );

  const clearAllBookmarks = useCallback(async () => {
    if (!currentUser?.address) return;

    try {
      await BookmarkService.clearUserBookmarks(currentUser.address);
      setBookmarks([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to clear bookmarks'
      );
    }
  }, [currentUser?.address]);

  return {
    bookmarks,
    loading,
    error,
    bookmarkPost,
    bookmarkComment,
    removeBookmark,
    isPostBookmarked,
    isCommentBookmarked,
    getBookmarksByType,
    clearAllBookmarks,
    refreshBookmarks: loadBookmarks,
  };
}

/**
 * Hook for bookmarking a specific post
 * Provides bookmark state and toggle function for a single post
 */
export function usePostBookmark(post: Post, cellId?: string) {
  const { currentUser } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check initial bookmark status
  useEffect(() => {
    if (currentUser?.address) {
      const bookmarked = BookmarkService.isPostBookmarked(
        currentUser.address,
        post.id
      );
      setIsBookmarked(bookmarked);
    } else {
      setIsBookmarked(false);
    }
  }, [currentUser?.address, post.id]);

  const toggleBookmark = useCallback(async () => {
    if (!currentUser?.address) return false;

    setLoading(true);
    try {
      const newBookmarkStatus = await BookmarkService.togglePostBookmark(
        post,
        currentUser.address,
        cellId
      );
      setIsBookmarked(newBookmarkStatus);
      return newBookmarkStatus;
    } catch (err) {
      console.error('Failed to toggle post bookmark:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.address, post, cellId]);

  return {
    isBookmarked,
    loading,
    toggleBookmark,
  };
}

/**
 * Hook for bookmarking a specific comment
 * Provides bookmark state and toggle function for a single comment
 */
export function useCommentBookmark(comment: Comment, postId?: string) {
  const { currentUser } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check initial bookmark status
  useEffect(() => {
    if (currentUser?.address) {
      const bookmarked = BookmarkService.isCommentBookmarked(
        currentUser.address,
        comment.id
      );
      setIsBookmarked(bookmarked);
    } else {
      setIsBookmarked(false);
    }
  }, [currentUser?.address, comment.id]);

  const toggleBookmark = useCallback(async () => {
    if (!currentUser?.address) return false;

    setLoading(true);
    try {
      const newBookmarkStatus = await BookmarkService.toggleCommentBookmark(
        comment,
        currentUser.address,
        postId
      );
      setIsBookmarked(newBookmarkStatus);
      return newBookmarkStatus;
    } catch (err) {
      console.error('Failed to toggle comment bookmark:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.address, comment, postId]);

  return {
    isBookmarked,
    loading,
    toggleBookmark,
  };
}
