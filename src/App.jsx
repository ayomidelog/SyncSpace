import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Zap, Github, Database, RefreshCw, Terminal } from 'lucide-react';
import InputSection from './components/InputSection';
import Feed from './components/Feed';
import { api } from './lib/api';

function App() {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchClips();
    const interval = setInterval(fetchClips, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchClips = async () => {
    try {
      const data = await api.getClips();
      setError(null);
      setClips(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(data)) {
          return data;
        }
        return prev;
      });
    } catch (error) {
      console.error('Error fetching clips:', error);
      if (error.status === 401) {
        window.location.reload();
        return;
      }
      if (clips.length === 0) {
        setError('SERVER DISCONNECTED');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async ({ type, content, files }) => {
    setUploading(true);
    try {
      await api.saveClip({ type, content, files });
      await fetchClips();
      toast.success('POSTED SUCCESSFULLY!', {
        style: {
          border: '2px solid black',
          padding: '16px',
          color: '#000',
          fontWeight: 'bold',
          background: '#00E676',
        },
        iconTheme: {
          primary: '#000',
          secondary: '#fff',
        },
      });
    } catch (error) {
      console.error('Error saving clip:', error);
      toast.error('FAILED TO POST');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      await api.deleteClip(deleteId);
      await fetchClips();
      toast.success('DELETED', {
        style: {
          border: '2px solid black',
          padding: '16px',
          color: '#000',
          fontWeight: 'bold',
        },
      });
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('FAILED TO DELETE');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] text-black relative overflow-x-hidden font-sans">
      <Toaster position="bottom-right" />

      <div className="bg-neo-yellow border-b-4 border-black py-2 overflow-hidden">
        <div className="whitespace-nowrap animate-marquee font-mono font-bold text-sm">
          SYNCS PACE // LOCAL JSON STORAGE // NO CLOUD // PURE DATA // SYNCS PACE // LOCAL JSON STORAGE // NO CLOUD // PURE DATA
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        <header className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-12 gap-6">
          <div className="flex items-center gap-4 bg-white border-4 border-black p-4 shadow-neo transform -rotate-1">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-black text-white flex items-center justify-center border-2 border-white shadow-sm">
              <Zap className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic">SYNC<span className="text-neo-blue">SPACE</span></h1>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-white border-2 border-black px-3 py-1 md:px-4 md:py-2 shadow-neo-sm font-mono font-bold text-sm md:text-base">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 border border-black animate-pulse" />
              ONLINE
            </div>
            <a 
              href="https://github.com/amosayomide05/paste" 
              target="_blank" 
              rel="noreferrer" 
              className="bg-black text-white p-2 md:p-3 border-2 border-black hover:bg-white hover:text-black transition-colors shadow-neo-sm"
            >
              <Github className="w-5 h-5 md:w-6 md:h-6" />
            </a>
          </div>
        </header>

        <InputSection onSave={handleSave} isUploading={uploading} />

        <div className="relative mt-10 md:mt-20">
          <div className="flex items-center justify-between mb-8 bg-black text-white p-4 border-4 border-black shadow-neo transform rotate-1">
            <h2 className="text-xl md:text-2xl font-black uppercase flex items-center gap-3">
              <Terminal size={24} />
              Recent Activity
            </h2>
            <button 
              onClick={fetchClips} 
              className="p-2 hover:bg-white hover:text-black border-2 border-transparent hover:border-black transition-all rounded-none"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          
          {error ? (
            <div className="text-center py-20 bg-red-100 border-4 border-red-500 shadow-neo">
              <p className="text-red-600 font-black text-3xl mb-2 uppercase">Connection Error</p>
              <p className="text-lg font-mono text-black">{error}</p>
              <button onClick={fetchClips} className="mt-6 neo-button bg-white px-6 py-2">RETRY CONNECTION</button>
            </div>
          ) : (
            <Feed clips={clips} onDelete={handleDelete} />
          )}
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-neo p-8 max-w-md w-full relative animate-bounce-slow">
            <h3 className="text-2xl font-black uppercase mb-4">Delete this clip?</h3>
            <p className="font-mono mb-8 text-gray-600">This action cannot be undone. Are you sure you want to proceed?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 border-2 border-black px-6 py-3 font-bold hover:bg-gray-100 transition-all uppercase"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white border-2 border-black px-6 py-3 font-bold shadow-neo hover:shadow-neo-hover hover:-translate-y-1 transition-all uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
