import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-cyber-dark border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-2 py-2">
        <div className="text-center text-[10px] text-muted-foreground">
          <span>© 2025 OPCHAN</span>
          <span className="mx-1">|</span>
          <Link to="/terms" className="hover:text-foreground">TERMS</Link>
          <span className="mx-1">|</span>
          <Link to="/privacy" className="hover:text-foreground">PRIVACY</Link>
          <span className="mx-1">|</span>
          <a href="https://github.com/waku-org/opchan/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GITHUB</a>
          <span className="mx-1">|</span>
          <a href="https://docs.waku.org" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">DOCS</a>
          <span className="mx-1">|</span>
          <span>Reference client</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


