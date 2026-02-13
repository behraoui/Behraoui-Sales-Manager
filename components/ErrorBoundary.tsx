
import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary must be a class component. 
class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly defining state property to fix 'Property state does not exist' errors in certain environments
  public state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
    // State is already initialized above, but we keep the constructor for super(props)
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
      window.location.reload();
  };

  public render() {
    // Destructure props and state to avoid direct 'this.props' or 'this.state' access issues in pedantic TS environments
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100 flex flex-col items-center">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                <AlertTriangle size={32} />
             </div>
             <h1 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h1>
             <p className="text-slate-500 text-sm mb-6">The application encountered an error. Please try reloading.</p>
             
             {error && (
                <div className="bg-slate-100 p-3 rounded-lg text-xs font-mono text-left text-slate-600 mb-6 w-full overflow-auto max-h-32 border border-slate-200">
                    {error.message}
                </div>
             )}

             <button 
                onClick={this.handleReset}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
             >
                <RefreshCcw size={18} />
                Reload Application
             </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
