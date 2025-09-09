import { Cell, Post, Comment } from '../types/forum';
import { CellMessage, CommentMessage, PostMessage, VoteMessage } from '../types/waku';
import { UserVerificationStatus } from '../types/forum';
export declare const transformCell: (cellMessage: CellMessage, _verifyMessage?: unknown, userVerificationStatus?: UserVerificationStatus, posts?: Post[]) => Promise<Cell | null>;
export declare const transformPost: (postMessage: PostMessage, _verifyMessage?: unknown, userVerificationStatus?: UserVerificationStatus) => Promise<Post | null>;
export declare const transformComment: (commentMessage: CommentMessage, _verifyMessage?: unknown, userVerificationStatus?: UserVerificationStatus) => Promise<Comment | null>;
export declare const transformVote: (voteMessage: VoteMessage, _verifyMessage?: unknown) => Promise<VoteMessage | null>;
export declare const getDataFromCache: (_verifyMessage?: unknown, // Deprecated parameter, kept for compatibility
userVerificationStatus?: UserVerificationStatus) => Promise<{
    cells: Cell[];
    posts: Post[];
    comments: Comment[];
}>;
//# sourceMappingURL=transformers.d.ts.map