import Link from 'next/link';
import withAuth from '../src/components/withAuth';

function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Home Server PaaS</h1>
      <p>Select an option to get started:</p>
      <ul className="list-disc list-inside space-y-2">
        <li>
          <Link href="/chat" className="text-blue-600 hover:underline">
            Open Chat
          </Link>
        </li>
        <li>
          <Link href="/admin/users" className="text-blue-600 hover:underline">
            Admin Dashboard
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default withAuth(Home); 
