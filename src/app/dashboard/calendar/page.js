'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function Calendar() {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const router = useRouter();

  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Fetch connected accounts from your database
      const { data: accounts, error: accountsError } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (accountsError) throw accountsError;
      setConnectedAccounts(accounts || []);
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectAccount = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error connecting account:', error);
    }
  };

  const handleDisconnectAccount = async (accountId) => {
    try {
      const { error } = await supabase
        .from('connected_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      await fetchConnectedAccounts();
    } catch (error) {
      console.error('Error disconnecting account:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard-card">
        <h2 className="dashboard-title">Connected Calendar Accounts</h2>
        <div className="connected-accounts">
          {connectedAccounts.map((account) => (
            <div key={account.id} className="account-item">
              <span>{account.email}</span>
              <button
                className="button button-danger"
                onClick={() => handleDisconnectAccount(account.id)}
              >
                Disconnect
              </button>
            </div>
          ))}
          <button
            className="button button-primary"
            onClick={handleConnectAccount}
          >
            Connect New Google Account
          </button>
        </div>
      </div>
    </div>
  );
} 