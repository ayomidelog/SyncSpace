import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Download, Trash2, FileText, Image as ImageIcon, ExternalLink, File } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const getFileTypeIcon = (type) => {
  switch (type) {
    case 'image':
      return { icon: ImageIcon, bgClass: 'bg-neo-pink text-white' };
    case 'file':
      return { icon: File, bgClass: 'bg-neo-blue text-white' };
    default:
      return { icon: FileText, bgClass: 'bg-neo-yellow text-black' };
  }
};

const getFileName = (filePath) => {
  if (!filePath) return 'Unknown file';
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};

export default function Feed({ clips, onDelete }) {
  const copyToClipboard = async (content, type = 'text') => {
    try {
      if (!navigator.clipboard && type === 'text') {
        const textArea = document.createElement("textarea");
        textArea.value = content;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success('COPIED TO CLIPBOARD!', {
            icon: '📋',
            style: {
              border: '2px solid black',
              padding: '16px',
              color: '#000',
              fontWeight: 'bold',
            },
          });
          return;
        } catch (err) {
          document.body.removeChild(textArea);
          throw new Error('Fallback copy failed');
        }
      }

      if (type === 'image') {
        if (!navigator.clipboard) {
          throw new Error('Image copy requires HTTPS');
        }
        const response = await fetch(content, { credentials: 'include' });
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
      } else {
        await navigator.clipboard.writeText(content);
      }
      
      toast.success('COPIED TO CLIPBOARD!', {
        icon: '📋',
        style: {
          border: '2px solid black',
          padding: '16px',
          color: '#000',
          fontWeight: 'bold',
        },
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      if (err.message === 'Image copy requires HTTPS') {
        toast.error('HTTPS REQUIRED FOR IMAGES');
      } else {
        toast.error('FAILED TO COPY');
      }
    }
  };

  if (clips.length === 0) {
    return (
      <div className="text-center py-32 border-4 border-dashed border-black/20 bg-white/50">
        <div className="w-24 h-24 bg-neo-yellow border-2 border-black shadow-neo mx-auto mb-6 flex items-center justify-center rotate-3">
          <FileText size={40} className="text-black" />
        </div>
        <p className="text-2xl font-black uppercase tracking-tight">Nothing here yet</p>
        <p className="text-lg font-mono mt-2 text-gray-600">Be the first to post something!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 w-full max-w-7xl mx-auto pb-20">
      {clips.map((clip, index) => {
        const { icon: TypeIcon, bgClass } = getFileTypeIcon(clip.type);
        
        return (
          <motion.div
            key={clip.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border-4 border-black shadow-neo hover:shadow-neo-hover hover:-translate-y-1 transition-all duration-200 flex flex-col"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b-4 border-black bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 border-2 border-black shadow-sm ${bgClass}`}>
                  <TypeIcon size={16} />
                </div>
                <span className="text-sm font-mono font-bold uppercase">
                  {formatDistanceToNow(new Date(clip.created_at), { addSuffix: true })}
                </span>
              </div>
              <button 
                onClick={() => onDelete(clip.id)}
                className="text-black hover:bg-red-500 hover:text-white border-2 border-transparent hover:border-black p-1 transition-all"
                title="Delete"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="flex-1 relative">
              {clip.type === 'text' ? (
                <div className="p-6 font-mono text-sm leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar bg-white whitespace-pre-wrap">
                  {clip.content}
                </div>
              ) : clip.type === 'image' ? (
                <div className="w-full aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative group border-b-4 border-black">
                  <img 
                    src={clip.file_path} 
                    alt="Clip" 
                    className="w-full h-full object-contain p-2" 
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                    <a 
                      href={clip.file_path} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="neo-button bg-white text-black px-4 py-2 flex items-center gap-2 hover:bg-neo-yellow"
                    >
                      <ExternalLink size={16} /> VIEW
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-video bg-gray-100 flex flex-col items-center justify-center overflow-hidden relative border-b-4 border-black p-4">
                  <div className="w-16 h-16 bg-neo-blue border-2 border-black shadow-neo-sm flex items-center justify-center mb-3 rounded-full">
                    <File className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-black font-bold text-sm text-center break-all px-4">{clip.original_name || getFileName(clip.file_path)}</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t-4 border-black flex justify-between items-center">
              <div className="text-xs font-bold font-mono text-gray-500">ID: {clip.id}</div>
              {clip.type === 'text' ? (
                <button 
                  onClick={() => copyToClipboard(clip.content)}
                  className="flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase bg-white border-2 border-black shadow-neo-sm hover:shadow-neo active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  <Copy size={14} /> COPY
                </button>
              ) : clip.type === 'image' ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => copyToClipboard(clip.file_path, 'image')}
                    className="flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase bg-white border-2 border-black shadow-neo-sm hover:shadow-neo active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <Copy size={14} /> COPY
                  </button>
                  <a 
                    href={clip.file_path} 
                    download
                    className="flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase bg-white border-2 border-black shadow-neo-sm hover:shadow-neo active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                  >
                    <Download size={14} /> SAVE
                  </a>
                </div>
              ) : (
                <a 
                  href={clip.file_path} 
                  download
                  className="flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase bg-white border-2 border-black shadow-neo-sm hover:shadow-neo active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  <Download size={14} /> DOWNLOAD
                </a>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
