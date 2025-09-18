import { useState, useEffect, useCallback } from 'react';
import { HealthStatus } from '@waku/sdk';
import { messageManager } from '@opchan/core';

export interface WakuHealthState {
  isReady: boolean;
  health: HealthStatus;
  isInitialized: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function useWakuHealth(): WakuHealthState {
  const [isReady, setIsReady] = useState(false);
  const [health, setHealth] = useState<HealthStatus>(HealthStatus.Unhealthy);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting');

  const updateHealth = useCallback(
    (ready: boolean, currentHealth: HealthStatus) => {
      setIsReady(ready);
      setHealth(currentHealth);

      if (ready) {
        setConnectionStatus('connected');
      } else if (currentHealth === HealthStatus.Unhealthy) {
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('connecting');
      }
    },
    []
  );

  useEffect(() => {
    try {
      const currentHealth = messageManager.currentHealth ?? HealthStatus.Unhealthy;
      const currentReady = messageManager.isReady;

      setIsInitialized(true);
      updateHealth(currentReady, currentHealth);

      const unsubscribe = messageManager.onHealthChange(updateHealth);
      return unsubscribe;
    } catch (error) {
      console.error('Failed to initialize Waku health monitoring:', error);
      setConnectionStatus('error');
      setIsInitialized(false);
      return undefined;
    }
  }, [updateHealth]);

  return {
    isReady,
    health,
    isInitialized,
    connectionStatus,
  };
}

export function useWakuReady(): boolean {
  const { isReady } = useWakuHealth();
  return isReady;
}

export function useWakuHealthStatus() {
  const { isReady, health, connectionStatus } = useWakuHealth();

  const getHealthDescription = useCallback(() => {
    switch (health) {
      case HealthStatus.SufficientlyHealthy:
        return 'Network is healthy and fully operational';
      case HealthStatus.MinimallyHealthy:
        return 'Network is minimally healthy and functional';
      case HealthStatus.Unhealthy:
        return 'Network is unhealthy or disconnected';
      default:
        return 'Network status unknown';
    }
  }, [health]);

  const getStatusColor = useCallback(() => {
    if (isReady) return 'green';
    if (health === HealthStatus.Unhealthy) return 'red';
    return 'yellow';
  }, [isReady, health]);

  const getStatusMessage = useCallback(() => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to Waku network...';
      case 'connected':
        return 'Connected to Waku network';
      case 'disconnected':
        return 'Disconnected from Waku network';
      case 'error':
        return 'Error connecting to Waku network';
      default:
        return 'Unknown connection status';
    }
  }, [connectionStatus]);

  return {
    isReady,
    health,
    connectionStatus,
    description: getHealthDescription(),
    statusColor: getStatusColor(),
    statusMessage: getStatusMessage(),
  };
}
