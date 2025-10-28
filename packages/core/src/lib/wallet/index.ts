/**
 * Simplified Ethereum-only wallet module
 * 
 * This module provides wallet functionality for Ethereum addresses only.
 * Bitcoin and Ordinals support has been removed.
 */

export * from './EthereumWallet';
export * from './types';
export * from './config';

// Re-export wagmi/viem for convenience
export { type WalletClient, type PublicClient } from 'viem';
