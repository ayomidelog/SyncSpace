const encode = (text) => {
  if (!text) return text;
  const key = 'syncspace';
  return text.split('').map((c, i) => {
    const code = c.charCodeAt(0) ^ key.charCodeAt(i % key.length);
    return code.toString(16).padStart(4, '0');
  }).join('');
};

export const api = {
  getClips: async () => {
    const res = await fetch('/api/clips', {
      credentials: 'include'
    });
    if (!res.ok) {
      const error = new Error('Failed to fetch');
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  saveClip: async ({ type, content, files }) => {
    const formData = new FormData();
    formData.append('type', type);
    if (content) formData.append('content', encode(content));
    
    if (files && Array.isArray(files)) {
      files.forEach(file => formData.append('files', file));
    } else if (files) {
      formData.append('files', files);
    }

    const res = await fetch('/api/clips', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!res.ok) throw new Error('Failed to save');
    return res.json();
  },

  deleteClip: async (id) => {
    const res = await fetch(`/api/clips/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!res.ok) throw new Error('Failed to delete');
    return res.json();
  }
};
