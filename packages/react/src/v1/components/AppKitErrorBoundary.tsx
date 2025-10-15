import React, { Component, ReactNode } from 'react';

interface AppKitErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface AppKitErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class AppKitErrorBoundary extends Component<
  AppKitErrorBoundaryProps,
  AppKitErrorBoundaryState
> {
  constructor(props: AppKitErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AppKitErrorBoundaryState {
    // Check if this is an AppKit initialization error
    if (error.message.includes('createAppKit') || 
        error.message.includes('useAppKitState') ||
        error.message.includes('AppKit')) {
      return { hasError: true, error };
    }
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[AppKitErrorBoundary] Caught AppKit error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI or the children with error handling
      return this.props.fallback || (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">
            Wallet Connection Initializing...
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            The wallet system is still loading. Please wait a moment.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
