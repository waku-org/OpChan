import { Cell, Comment, Post } from '../types/forum';
import { User } from '../types/identity';
import { DelegationManager } from '../delegation';
type ActionResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};
export declare class ForumActions {
    private delegationManager;
    constructor(delegationManager?: DelegationManager);
    /**
     * Unified permission validation system
     */
    private validatePermission;
    createPost(params: PostCreationParams, updateStateFromCache: () => void): Promise<ActionResult<Post>>;
    createComment(params: CommentCreationParams, updateStateFromCache: () => void): Promise<ActionResult<Comment>>;
    createCell(params: CellCreationParams, updateStateFromCache: () => void): Promise<ActionResult<Cell>>;
    vote(params: VoteParams, updateStateFromCache: () => void): Promise<ActionResult<boolean>>;
    moderatePost(params: PostModerationParams, updateStateFromCache: () => void): Promise<ActionResult<boolean>>;
    moderateComment(params: CommentModerationParams, updateStateFromCache: () => void): Promise<ActionResult<boolean>>;
    moderateUser(params: UserModerationParams, updateStateFromCache: () => void): Promise<ActionResult<boolean>>;
}
interface BaseActionParams {
    currentUser: User | null;
    isAuthenticated: boolean;
}
interface PostCreationParams extends BaseActionParams {
    cellId: string;
    title: string;
    content: string;
}
interface CommentCreationParams extends BaseActionParams {
    postId: string;
    content: string;
}
interface CellCreationParams extends BaseActionParams {
    name: string;
    description: string;
    icon?: string;
}
interface VoteParams extends BaseActionParams {
    targetId: string;
    isUpvote: boolean;
}
interface PostModerationParams extends BaseActionParams {
    cellId: string;
    postId: string;
    reason?: string;
    cellOwner: string;
}
interface CommentModerationParams extends BaseActionParams {
    cellId: string;
    commentId: string;
    reason?: string;
    cellOwner: string;
}
interface UserModerationParams extends BaseActionParams {
    cellId: string;
    userAddress: string;
    reason?: string;
    cellOwner: string;
}
export {};
//# sourceMappingURL=ForumActions.d.ts.map