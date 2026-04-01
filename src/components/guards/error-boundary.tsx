'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error) => React.ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component for catching and displaying React errors gracefully
 *
 * @example
 * <ErrorBoundary fallback={(error) => <CustomErrorUI error={error} />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error) || (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-red-500" size={24} />
                <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
              </div>
              <p className="text-sm text-gray-600 mb-4">{this.state.error.message}</p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
export function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-red-50">
      <div className="max-w-md bg-white rounded-lg shadow-lg p-8 border-l-4 border-red-500">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="text-red-500" size={28} />
          <h2 className="text-xl font-bold text-gray-900">Oops! An error occurred</h2>
        </div>
        <details className="text-sm text-gray-600 mb-6">
          <summary className="cursor-pointer font-medium text-gray-700 mb-2">
            Error details
          </summary>
          <pre className="bg-gray-100 p-3 rounded mt-2 overflow-auto text-xs">
            {error.message}
          </pre>
        </details>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
