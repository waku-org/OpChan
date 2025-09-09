import messageManager from '../waku';
import { RelevanceCalculator } from './RelevanceCalculator';
// Validation is enforced at ingestion time by LocalDatabase. Transformers assume
// cache contains only valid, verified messages.
export const transformCell = async (cellMessage, _verifyMessage, userVerificationStatus, posts) => {
    // Message validity already enforced upstream
    const transformedCell = {
        id: cellMessage.id,
        type: cellMessage.type,
        author: cellMessage.author,
        name: cellMessage.name,
        description: cellMessage.description,
        icon: cellMessage.icon || '',
        timestamp: cellMessage.timestamp,
        signature: cellMessage.signature,
        browserPubKey: cellMessage.browserPubKey,
        delegationProof: cellMessage.delegationProof,
    };
    // Calculate relevance score if user verification status and posts are provided
    if (userVerificationStatus && posts) {
        const relevanceCalculator = new RelevanceCalculator();
        const relevanceResult = relevanceCalculator.calculateCellScore(transformedCell, posts);
        // Calculate active member count
        const cellPosts = posts.filter((post) => post.cellId === cellMessage.id);
        const activeMembers = new Set();
        cellPosts.forEach((post) => {
            activeMembers.add(post.authorAddress);
        });
        return {
            ...transformedCell,
            relevanceScore: relevanceResult.score,
            activeMemberCount: activeMembers.size,
            relevanceDetails: relevanceResult.details,
        };
    }
    return transformedCell;
};
export const transformPost = async (postMessage, _verifyMessage, userVerificationStatus) => {
    // Message validity already enforced upstream
    const votes = Object.values(messageManager.messageCache.votes).filter((vote) => vote.targetId === postMessage.id);
    // Votes in cache are already validated; just map
    const filteredVotes = votes;
    const upvotes = filteredVotes.filter((vote) => vote !== null && vote.value === 1);
    const downvotes = filteredVotes.filter((vote) => vote !== null && vote.value === -1);
    const modMsg = messageManager.messageCache.moderations[postMessage.id];
    const isPostModerated = !!modMsg && modMsg.targetType === 'post';
    const userModMsg = Object.values(messageManager.messageCache.moderations).find((m) => m.targetType === 'user' &&
        m.cellId === postMessage.cellId &&
        m.targetId === postMessage.author);
    const isUserModerated = !!userModMsg;
    const transformedPost = {
        id: postMessage.id,
        type: postMessage.type,
        author: postMessage.author,
        cellId: postMessage.cellId,
        authorAddress: postMessage.author,
        title: postMessage.title,
        content: postMessage.content,
        timestamp: postMessage.timestamp,
        signature: postMessage.signature,
        browserPubKey: postMessage.browserPubKey,
        delegationProof: postMessage.delegationProof,
        upvotes,
        downvotes,
        moderated: isPostModerated || isUserModerated,
        moderatedBy: isPostModerated
            ? modMsg.author
            : isUserModerated
                ? userModMsg.author
                : undefined,
        moderationReason: isPostModerated
            ? modMsg.reason
            : isUserModerated
                ? userModMsg.reason
                : undefined,
        moderationTimestamp: isPostModerated
            ? modMsg.timestamp
            : isUserModerated
                ? userModMsg.timestamp
                : undefined,
        // mark pending for optimistic UI if not yet acknowledged
        // not persisted as a field; UI can check via LocalDatabase
    };
    // Calculate relevance score if user verification status is provided
    if (userVerificationStatus) {
        const relevanceCalculator = new RelevanceCalculator();
        // Get comments for this post
        const comments = await Promise.all(Object.values(messageManager.messageCache.comments).map((comment) => transformComment(comment, undefined, userVerificationStatus))).then((comments) => comments.filter((comment) => comment !== null));
        const postComments = comments.filter((comment) => comment.postId === postMessage.id);
        const relevanceResult = relevanceCalculator.calculatePostScore(transformedPost, filteredVotes, postComments, userVerificationStatus);
        const relevanceScore = relevanceResult.score;
        // Calculate verified upvotes and commenters
        const verifiedUpvotes = upvotes.filter((vote) => {
            const voterStatus = userVerificationStatus[vote.author];
            return voterStatus?.isVerified;
        }).length;
        const verifiedCommenters = new Set();
        postComments.forEach((comment) => {
            const commenterStatus = userVerificationStatus[comment.authorAddress];
            if (commenterStatus?.isVerified) {
                verifiedCommenters.add(comment.authorAddress);
            }
        });
        return {
            ...transformedPost,
            relevanceScore,
            verifiedUpvotes,
            verifiedCommenters: Array.from(verifiedCommenters),
            relevanceDetails: relevanceResult.details,
        };
    }
    return transformedPost;
};
export const transformComment = async (commentMessage, _verifyMessage, userVerificationStatus) => {
    // Message validity already enforced upstream
    const votes = Object.values(messageManager.messageCache.votes).filter((vote) => vote.targetId === commentMessage.id);
    // Votes in cache are already validated
    const filteredVotes = votes;
    const upvotes = filteredVotes.filter((vote) => vote !== null && vote.value === 1);
    const downvotes = filteredVotes.filter((vote) => vote !== null && vote.value === -1);
    const modMsg = messageManager.messageCache.moderations[commentMessage.id];
    const isCommentModerated = !!modMsg && modMsg.targetType === 'comment';
    // Find the post to get the correct cell ID
    const parentPost = Object.values(messageManager.messageCache.posts).find((post) => post.id === commentMessage.postId);
    const userModMsg = Object.values(messageManager.messageCache.moderations).find((m) => m.targetType === 'user' &&
        m.cellId === parentPost?.cellId &&
        m.targetId === commentMessage.author);
    const isUserModerated = !!userModMsg;
    const transformedComment = {
        id: commentMessage.id,
        type: commentMessage.type,
        author: commentMessage.author,
        postId: commentMessage.postId,
        authorAddress: commentMessage.author,
        content: commentMessage.content,
        timestamp: commentMessage.timestamp,
        signature: commentMessage.signature,
        browserPubKey: commentMessage.browserPubKey,
        delegationProof: commentMessage.delegationProof,
        upvotes,
        downvotes,
        moderated: isCommentModerated || isUserModerated,
        moderatedBy: isCommentModerated
            ? modMsg.author
            : isUserModerated
                ? userModMsg.author
                : undefined,
        moderationReason: isCommentModerated
            ? modMsg.reason
            : isUserModerated
                ? userModMsg.reason
                : undefined,
        moderationTimestamp: isCommentModerated
            ? modMsg.timestamp
            : isUserModerated
                ? userModMsg.timestamp
                : undefined,
        // mark pending for optimistic UI via LocalDatabase lookup
    };
    // Calculate relevance score if user verification status is provided
    if (userVerificationStatus) {
        const relevanceCalculator = new RelevanceCalculator();
        const relevanceResult = relevanceCalculator.calculateCommentScore(transformedComment, filteredVotes.filter((vote) => vote !== null), userVerificationStatus);
        return {
            ...transformedComment,
            relevanceScore: relevanceResult.score,
            relevanceDetails: relevanceResult.details,
        };
    }
    return transformedComment;
};
export const transformVote = async (voteMessage, _verifyMessage) => {
    // Message validity already enforced upstream
    return voteMessage;
};
export const getDataFromCache = async (_verifyMessage, // Deprecated parameter, kept for compatibility
userVerificationStatus) => {
    // First transform posts and comments to get relevance scores
    // All validation is now handled internally by the transform functions
    const posts = await Promise.all(Object.values(messageManager.messageCache.posts).map((post) => transformPost(post, undefined, userVerificationStatus))).then((posts) => posts.filter((post) => post !== null));
    const comments = await Promise.all(Object.values(messageManager.messageCache.comments).map((c) => transformComment(c, undefined, userVerificationStatus))).then((comments) => comments.filter((comment) => comment !== null));
    // Then transform cells with posts for relevance calculation
    const cells = await Promise.all(Object.values(messageManager.messageCache.cells).map((cell) => transformCell(cell, undefined, userVerificationStatus, posts))).then((cells) => cells.filter((cell) => cell !== null));
    return { cells, posts, comments };
};
//# sourceMappingURL=transformers.js.map