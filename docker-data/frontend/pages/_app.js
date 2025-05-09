import '../styles/globals.css';
import { Toaster } from 'sonner';
import Layout from '@/components/Layout';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from "@/components/theme-provider";

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <Layout>
          <Toaster richColors position="top-right" />
          <Component {...pageProps} />
        </Layout>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default MyApp; 
