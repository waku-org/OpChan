import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { BookmarkList } from '@/components/ui/bookmark-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Bookmark, BookmarkType } from '@opchan/core';
import {
  Trash2,
  Bookmark as BookmarkIcon,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { useAuth, useContent } from '@/hooks';

const BookmarksPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { bookmarks, removeBookmark, clearAllBookmarks } = useContent();

  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'comments'>(
    'all'
  );

  // Redirect to login if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-cyber-dark text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-cyber-light mb-4">
              Authentication Required
            </h1>
            <p className="text-cyber-neutral">
              Please connect your wallet to view your bookmarks.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const postBookmarks = bookmarks.filter(
    bookmark => bookmark.type === BookmarkType.POST
  );
  const commentBookmarks = bookmarks.filter(
    bookmark => bookmark.type === BookmarkType.COMMENT
  );

  const getFilteredBookmarks = () => {
    switch (activeTab) {
      case 'posts':
        return postBookmarks;
      case 'comments':
        return commentBookmarks;
      default:
        return bookmarks;
    }
  };

  const handleNavigate = (bookmark: Bookmark) => {
    if (bookmark.type === BookmarkType.POST) {
      navigate(`/post/${bookmark.targetId}`);
    } else if (bookmark.type === BookmarkType.COMMENT && bookmark.postId) {
      navigate(`/post/${bookmark.postId}#comment-${bookmark.targetId}`);
    }
  };

  const handleClearAll = async () => {
    await clearAllBookmarks();
  };

  return (
    <div className="page-container">
      <Header />

      <main className="page-content">
        <div className="page-main">
          {/* Header Section */}
          <div className="page-header">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BookmarkIcon className="text-cyber-accent" size={32} />
                <h1 className="page-title">My Bookmarks</h1>
              </div>

              {bookmarks.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Bookmarks</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove all your bookmarks? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearAll}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <p className="page-subtitle">
              Your saved posts and comments. Bookmarks are stored locally and
              won't be shared.
            </p>
          </div>

          {/* Stats */}
          {bookmarks.length > 0 && (
            <div className="flex gap-4 mb-6">
              <Badge
                variant="outline"
                className="border-cyber-accent/30 text-cyber-accent"
              >
                <FileText size={14} className="mr-1" />
                {postBookmarks.length} Posts
              </Badge>
              <Badge
                variant="outline"
                className="border-cyber-accent/30 text-cyber-accent"
              >
                <MessageSquare size={14} className="mr-1" />
                {commentBookmarks.length} Comments
              </Badge>
              <Badge
                variant="outline"
                className="border-cyber-accent/30 text-cyber-accent"
              >
                <BookmarkIcon size={14} className="mr-1" />
                {bookmarks.length} Total
              </Badge>
            </div>
          )}

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={value =>
              setActiveTab(value as 'all' | 'posts' | 'comments')
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <BookmarkIcon size={16} />
                All ({bookmarks.length})
              </TabsTrigger>
              <TabsTrigger value="posts" className="flex items-center gap-2">
                <FileText size={16} />
                Posts ({postBookmarks.length})
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageSquare size={16} />
                Comments ({commentBookmarks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <BookmarkList
                bookmarks={getFilteredBookmarks()}
                onRemove={removeBookmark}
                onNavigate={handleNavigate}
                emptyMessage="No bookmarks yet"
              />
            </TabsContent>

            <TabsContent value="posts">
              <BookmarkList
                bookmarks={getFilteredBookmarks()}
                onRemove={removeBookmark}
                onNavigate={handleNavigate}
                emptyMessage="No bookmarked posts yet"
              />
            </TabsContent>

            <TabsContent value="comments">
              <BookmarkList
                bookmarks={getFilteredBookmarks()}
                onRemove={removeBookmark}
                onNavigate={handleNavigate}
                emptyMessage="No bookmarked comments yet"
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="page-footer">
        <p>OpChan - A decentralized forum built on Waku & Bitcoin Ordinals</p>
      </footer>
    </div>
  );
};

export default BookmarksPage;
