import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import VideoDetail from './pages/VideoDetail';
import Posts from './pages/Posts';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  if (!clerkPubKey) {
    console.error('Missing Clerk publishable key');
    return <div>Missing Clerk configuration</div>;
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route
            path="/"
            element={
              <SignedIn>
                <Layout>
                  <Dashboard />
                </Layout>
              </SignedIn>
            }
          />
          <Route
            path="/upload"
            element={
              <SignedIn>
                <Layout>
                  <Upload />
                </Layout>
              </SignedIn>
            }
          />
          <Route
            path="/videos/:id"
            element={
              <SignedIn>
                <Layout>
                  <VideoDetail />
                </Layout>
              </SignedIn>
            }
          />
          <Route
            path="/posts"
            element={
              <SignedIn>
                <Layout>
                  <Posts />
                </Layout>
              </SignedIn>
            }
          />
          <Route path="/sign-in" element={<RedirectToSignIn />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ClerkProvider>
  );
}

export default App;
