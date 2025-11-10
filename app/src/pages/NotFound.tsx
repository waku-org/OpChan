import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import Footer from '@/components/Footer';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-cyber-dark text-white">
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold mb-4 text-cyber-accent">404</h1>
          <p className="text-xl text-cyber-neutral mb-8">
            Oops! Page not found
          </p>
          <Link
            to="/"
            className="text-cyber-accent hover:text-cyber-accent/80 hover:underline"
          >
            Return to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
