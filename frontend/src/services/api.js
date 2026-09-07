import axios from 'axios';

// Base API setup with Vite proxy support or fallback to direct localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s for LLM execution
});

export const queryRAG = async (queryText, threadId = 'default_user') => {
  const response = await apiClient.post('/query', {
    q: queryText,
    thread_id: threadId,
  });
  return response.data;
};

export const queryRAGStream = async (
  queryText,
  threadId = 'default_user',
  { onMeta, onToken, onError, onDone }
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: queryText, thread_id: threadId }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || ''; // Keep incomplete trailing chunk in buffer

      for (const chunk of chunks) {
        const trimmed = chunk.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'meta' && onMeta) {
              onMeta(data);
            } else if (data.type === 'token' && onToken) {
              onToken(data.content);
            } else if (data.type === 'done' && onDone) {
              onDone();
            }
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        }
      }
    }
    if (onDone) onDone();
  } catch (err) {
    if (onError) onError(err);
  }
};


export const fetchHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    return { status: 'offline', error: error.message };
  }
};

export const fetchVectorStats = async () => {
  try {
    const response = await apiClient.get('/stats');
    return response.data;
  } catch (error) {
    return { status: 'error', error: error.message };
  }
};

export const fetchDocuments = async () => {
  try {
    const response = await apiClient.get('/documents');
    return response.data;
  } catch (error) {
    return { documents: [], total_files: 0, error: error.message };
  }
};

export const uploadDocument = async (file, sourceType = 'general') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_type', sourceType);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const fetchGuardrailsInfo = async () => {
  try {
    const response = await apiClient.get('/guardrails');
    return response.data;
  } catch (error) {
    return { guardrail_status: 'Error', error: error.message };
  }
};

export const clearMemory = async (threadId) => {
  const response = await apiClient.delete(`/memory/${threadId}`);
  return response.data;
};

export const getGraphUrl = () => `${API_BASE_URL}/graph?t=${Date.now()}`;
