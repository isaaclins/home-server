import type { AppProps } from 'next/app';
import { AuthProvider } from '../src/context/AuthContext';
import Layout from '../src/components/Layout';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
} 
