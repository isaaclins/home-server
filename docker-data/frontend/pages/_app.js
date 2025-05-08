import '../styles/globals.css';
import { Toaster } from 'sonner';
import Layout from '@/components/Layout';
import { AuthProvider } from '@/context/AuthContext';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout>
        <Toaster richColors position="top-right" />
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp; 
