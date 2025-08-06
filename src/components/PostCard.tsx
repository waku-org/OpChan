import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@/types';
import { useForum } from '@/contexts/useForum';
import { useAuth } from '@/contexts/useAuth';

interface PostCardProps {
  post: Post;
  commentCount?: number;
}

const PostCard: React.FC<PostCardProps> = ({ post, commentCount = 0 }) => {
  const { getCellById, votePost, isVoting } = useForum();
  const { isAuthenticated, currentUser } = useAuth();
  
  const cell = getCellById(post.cellId);
  const cellName = cell?.name || 'unknown';
  
  // Calculate vote score
  const score = post.upvotes.length - post.downvotes.length;
  
  // Check user's vote status
  const userUpvoted = currentUser ? post.upvotes.some(vote => vote.author === currentUser.address) : false;
  const userDownvoted = currentUser ? post.downvotes.some(vote => vote.author === currentUser.address) : false;
  
  // Truncate content for preview
  const contentPreview = post.content.length > 200 
    ? post.content.substring(0, 200) + '...' 
    : post.content;
  
  const handleVote = async (e: React.MouseEvent, isUpvote: boolean) => {
    e.preventDefault(); // Prevent navigation when clicking vote buttons
    if (!isAuthenticated) return;
    await votePost(post.id, isUpvote);
  };

  return (
    <div className="bg-cyber-muted/20 border border-cyber-muted rounded-sm hover:border-cyber-accent/50 hover:bg-cyber-muted/30 transition-all duration-200 mb-2">
      <div className="flex">
        {/* Voting column */}
        <div className="flex flex-col items-center p-2 bg-cyber-muted/50 border-r border-cyber-muted">
          <button 
            className={`p-1 rounded hover:bg-cyber-muted transition-colors ${
              userUpvoted ? 'text-cyber-accent' : 'text-cyber-neutral hover:text-cyber-accent'
            }`}
            onClick={(e) => handleVote(e, true)}
            disabled={!isAuthenticated || isVoting}
            title={isAuthenticated ? "Upvote" : "Connect wallet to vote"}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          
          <span className={`text-sm font-medium px-1 ${
            score > 0 ? 'text-cyber-accent' : 
            score < 0 ? 'text-blue-400' : 
            'text-cyber-neutral'
          }`}>
            {score}
          </span>
          
          <button 
            className={`p-1 rounded hover:bg-cyber-muted transition-colors ${
              userDownvoted ? 'text-blue-400' : 'text-cyber-neutral hover:text-blue-400'
            }`}
            onClick={(e) => handleVote(e, false)}
            disabled={!isAuthenticated || isVoting}
            title={isAuthenticated ? "Downvote" : "Connect wallet to vote"}
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        </div>

        {/* Content column */}
        <div className="flex-1 p-3">
          <Link to={`/post/${post.id}`} className="block hover:opacity-80">
            {/* Post metadata */}
            <div className="flex items-center text-xs text-cyber-neutral mb-2 space-x-2">
              <span className="font-medium text-cyber-accent">r/{cellName}</span>
              <span>•</span>
              <span>Posted by u/{post.authorAddress.slice(0, 6)}...{post.authorAddress.slice(-4)}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}</span>
            </div>

            {/* Post title */}
            <h2 className="text-lg font-semibold text-glow mb-2 hover:text-cyber-accent transition-colors">
              {post.title}
            </h2>

            {/* Post content preview */}
            <p className="text-cyber-neutral text-sm leading-relaxed mb-3">
              {contentPreview}
            </p>

            {/* Post actions */}
            <div className="flex items-center space-x-4 text-xs text-cyber-neutral">
              <div className="flex items-center space-x-1 hover:text-cyber-accent transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span>{commentCount} comments</span>
              </div>
              <button className="hover:text-cyber-accent transition-colors">
                Share
              </button>
              <button className="hover:text-cyber-accent transition-colors">
                Save
              </button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PostCard;