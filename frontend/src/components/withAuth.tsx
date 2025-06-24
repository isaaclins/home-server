import React, { ComponentType, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

export default function withAuth<P extends Record<string, unknown>>(Wrapped: ComponentType<P>) {
  const Guard: React.FC<P> = (props: P) => {
    const { token } = useContext(AuthContext);
    const router = useRouter();

    useEffect(() => {
      if (!token) {
        router.replace('/login');
      }
    }, [token]);

    if (!token) return null;
    // @ts-ignore – props type is compatible but TS has difficulty with generics here
    return <Wrapped {...props} />;
  };

  return Guard;
} 
