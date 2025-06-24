import withAuth from '../src/components/withAuth';

function Home() {
  return <h1 className="p-4 text-xl">Welcome to Home Server PaaS!</h1>;
}

export default withAuth(Home); 
