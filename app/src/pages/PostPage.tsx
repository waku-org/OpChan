import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PostDetail from '@/components/PostDetail';

const PostPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-cyber-dark text-white">
      <Header />
      <main className="flex-1 pt-16">
        <PostDetail />
      </main>
      <Footer />
    </div>
  );
};

export default PostPage;
