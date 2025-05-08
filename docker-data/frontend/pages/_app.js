import '../styles/globals.css';
import { Toaster } from 'sonner';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster richColors position="top-right" />
    </>
  );
}

export default MyApp; 
