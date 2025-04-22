import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForum } from '@/contexts/ForumContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MessageSquare, MessageCircle, ArrowUp, ArrowDown, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CypherImage } from './ui/CypherImage';

const PostList = () => {
  const { cellId } = useParams<{ cellId: string }>();
  const { 
    getCellById, 
    getPostsByCell, 
    getCommentsByPost,
    createPost, 
    isInitialLoading, 
    isPostingPost, 
    isRefreshing, 
    refreshData 
  } = useForum();
  const { isAuthenticated } = useAuth();
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  
  if (!cellId || isInitialLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link to="/" className="text-cyber-accent hover:underline flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Cells
          </Link>
        </div>
        
        <Skeleton className="h-8 w-32 mb-6 bg-cyber-muted" />
        <Skeleton className="h-6 w-64 mb-6 bg-cyber-muted" />
        
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-cyber-muted rounded-sm p-4">
              <div className="mb-2">
                <Skeleton className="h-6 w-full mb-2 bg-cyber-muted" />
                <Skeleton className="h-6 w-3/4 mb-2 bg-cyber-muted" />
              </div>
              <Skeleton className="h-4 w-32 bg-cyber-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  const cell = getCellById(cellId);
  const posts = getPostsByCell(cellId);
  
  if (!cell) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link to="/" className="text-cyber-accent hover:underline flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Cells
          </Link>
        </div>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Cell Not Found</h1>
          <p className="text-cyber-neutral mb-6">The cell you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/">Return to Cells</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPostContent.trim()) return;
    
    try {
      const post = await createPost(cellId, newPostTitle, newPostContent);
      if (post) {
        setNewPostTitle('');
        setNewPostContent('');
      }
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link to="/" className="text-cyber-accent hover:underline flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Cells
        </Link>
      </div>
      
      <div className="flex gap-4 items-start mb-6">
        <CypherImage 
          src={cell.icon} 
          alt={cell.name} 
          className="w-12 h-12 object-cover rounded-sm border border-cyber-muted"
          generateUniqueFallback={true}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-glow">{cell.name}</h1>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={refreshData} 
              disabled={isRefreshing}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-cyber-neutral">{cell.description}</p>
        </div>
      </div>
      
      {isAuthenticated && (
        <div className="mb-8">
          <form onSubmit={handleCreatePost}>
            <h2 className="text-sm font-bold mb-2 flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              New Thread
            </h2>
            <div className="mb-3">
              <Input
                placeholder="Thread title"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="mb-3 bg-cyber-muted/50 border-cyber-muted"
                disabled={isPostingPost}
              />
              <Textarea
                placeholder="What's on your mind?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="bg-cyber-muted/50 border-cyber-muted resize-none"
                disabled={isPostingPost}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isPostingPost || !newPostContent.trim() || !newPostTitle.trim()}
              >
                {isPostingPost ? 'Posting...' : 'Post Thread'}
              </Button>
            </div>
          </form>
        </div>
      )}
      
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-cyber-neutral opacity-50" />
            <h2 className="text-xl font-bold mb-2">No Threads Yet</h2>
            <p className="text-cyber-neutral">
              {isAuthenticated 
                ? "Be the first to post in this cell!" 
                : "Connect your wallet and verify Ordinal ownership to start a thread."}
            </p>
          </div>
        ) : (
          posts.map(post => (
            <Link to={`/post/${post.id}`} key={post.id} className="thread-card block">
              <div>
                <h3 className="font-medium mb-1">{post.title}</h3>
                <p className="text-sm mb-3">{post.content}</p>
                <div className="flex items-center gap-4 text-xs text-cyber-neutral">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                  </span>
                  <span className="flex items-center">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {getCommentsByPost(post.id).length} comments
                  </span>
                  <div className="flex items-center">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    <span>{post.upvotes.length}</span>
                    <ArrowDown className="w-3 h-3 mx-1" />
                    <span>{post.downvotes.length}</span>
                  </div>
                  <span className="truncate max-w-[120px]">
                    {post.authorAddress.slice(0, 6)}...{post.authorAddress.slice(-4)}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default PostList;
