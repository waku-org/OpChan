
import { Cell, Post, Comment } from "../types/forum";

export const mockCells: Cell[] = [
  {
    id: "cell-1",
    name: "Bitcoin",
    description: "Discussion about Bitcoin, the first and largest cryptocurrency",
    icon: "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
  },
  {
    id: "cell-2",
    name: "Waku",
    description: "Discussions about Waku protocol and decentralized communication",
    icon: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
  },
  {
    id: "cell-3",
    name: "Privacy",
    description: "Privacy tools, techniques and discussion",
    icon: "https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
  },
  {
    id: "cell-4",
    name: "Tech",
    description: "General tech discussions and innovations",
    icon: "https://images.unsplash.com/photo-1500673922987-e212871fec22?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
  }
];

export const mockPosts: Post[] = [
  {
    id: "post-1",
    cellId: "cell-1",
    authorAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    content: "What's everyone's opinion on Lightning Network scaling?",
    timestamp: Date.now() - 3600000 * 24 * 3,
    upvotes: ["addr1", "addr2", "addr3"],
    downvotes: ["addr4"],
  },
  {
    id: "post-2",
    cellId: "cell-1",
    authorAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    content: "Just minted my first Ordinal. Any advice on best viewers?",
    timestamp: Date.now() - 3600000 * 12,
    upvotes: ["addr1", "addr5"],
    downvotes: [],
  },
  {
    id: "post-3",
    cellId: "cell-2",
    authorAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    content: "How does Waku compare to libp2p for decentralized messaging?",
    timestamp: Date.now() - 3600000 * 48,
    upvotes: ["addr1", "addr2"],
    downvotes: ["addr3"],
  },
  {
    id: "post-4",
    cellId: "cell-3",
    authorAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    content: "Best practices for maintaining privacy when using Bitcoin?",
    timestamp: Date.now() - 3600000 * 5,
    upvotes: ["addr6"],
    downvotes: [],
  },
];

export const mockComments: Comment[] = [
  {
    id: "comment-1",
    postId: "post-1",
    authorAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    content: "Lightning Network is promising but still has liquidity challenges.",
    timestamp: Date.now() - 3600000 * 23,
    upvotes: ["addr1"],
    downvotes: [],
  },
  {
    id: "comment-2",
    postId: "post-1",
    authorAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    content: "I'm running a lightning node and it's been pretty reliable so far.",
    timestamp: Date.now() - 3600000 * 22,
    upvotes: ["addr2", "addr3"],
    downvotes: [],
  },
  {
    id: "comment-3",
    postId: "post-2",
    authorAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    content: "Ordinals.com is a good place to start for viewing them.",
    timestamp: Date.now() - 3600000 * 10,
    upvotes: ["addr1"],
    downvotes: [],
  },
  {
    id: "comment-4",
    postId: "post-3",
    authorAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    content: "Waku is built on libp2p but has more privacy features like light clients.",
    timestamp: Date.now() - 3600000 * 45,
    upvotes: [],
    downvotes: [],
  },
];
