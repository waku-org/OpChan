import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, FileText, Shield } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black/80 border-t border-cyber-muted/30 backdrop-blur-md mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Logo and Copyright */}
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-cyber-accent" />
            <span className="text-sm font-mono text-cyber-neutral">
              © 2025 <span className="text-white font-bold tracking-wider">opchan</span>
            </span>
          </div>

          {/* Center: Links */}
          <nav className="flex items-center space-x-6">
            <Link
              to="/terms"
              className="flex items-center space-x-1 text-sm font-mono text-cyber-neutral hover:text-cyber-accent transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Terms of Use</span>
            </Link>
            <Link
              to="/privacy"
              className="flex items-center space-x-1 text-sm font-mono text-cyber-neutral hover:text-cyber-accent transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Privacy Policy</span>
            </Link>
          </nav>

          {/* Right: Additional Info */}
          <div className="text-xs font-mono text-cyber-neutral/60">
            Licensed under CC-BY-SA
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


