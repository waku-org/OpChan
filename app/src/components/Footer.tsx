import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, FileText, Shield, Github, BookOpen } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-cyber-dark border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-muted-foreground">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Terminal className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
            <span>© 2025 OPCHAN</span>
          </div>

          <nav className="flex items-center flex-wrap justify-center gap-x-3 sm:gap-x-6 gap-y-2 text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em]">
            <Link
              to="/terms"
              className="flex items-center space-x-1 sm:space-x-2 text-muted-foreground hover:text-foreground"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>TERMS</span>
            </Link>
            <Link
              to="/privacy"
              className="flex items-center space-x-1 sm:space-x-2 text-muted-foreground hover:text-foreground"
            >
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>PRIVACY</span>
            </Link>
            <a
              href="https://github.com/waku-org/opchan/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 sm:space-x-2 text-muted-foreground hover:text-foreground"
            >
              <Github className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>GITHUB</span>
            </a>
            <a
              href="https://docs.waku.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 sm:space-x-2 text-muted-foreground hover:text-foreground"
            >
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>DOCS</span>
            </a>
          </nav>

          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground text-center">
            Licensed under CC-BY-SA
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


