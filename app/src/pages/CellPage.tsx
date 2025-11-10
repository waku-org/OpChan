import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PostList from '@/components/PostList';

const CellPage = () => {
  return (
    <div className="page-container">
      <Header />
      <main className="page-content">
        <PostList />
      </main>
      <Footer />
    </div>
  );
};

export default CellPage;
