import Header from '@/components/Header';
import PostList from '@/components/PostList';

const CellPage = () => {
  return (
    <div className="page-container">
      <Header />
      <main className="page-content">
        <PostList />
      </main>
      <footer className="page-footer">
        <p>OpChan - A decentralized forum built on Waku & Bitcoin Ordinals</p>
      </footer>
    </div>
  );
};

export default CellPage;
