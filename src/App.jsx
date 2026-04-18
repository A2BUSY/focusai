import { useMemo, useState } from 'react';
import './App.css';

function App() {
    const [file, setFile] = useState(null);
    const [summary, setSummary] = useState('');
    const [notes, setNotes] = useState('');
    const [question, setQuestion] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(null);

    // A function for generating the file label
    // Wrapped in use memo to avoid unnecessary re-calculations from state updates
    const fileLabel = useMemo(() => {
        if (!file) {
            return 'No file selected';
        } else {
            // Return the file name and size in KB
            return `${file.name} (${Math.round(file.size / 1024)} KB)`;
        }
    }, [file]);

    async function requestDocument(endpoint, { onSuccess, fallbackError }) {
        if (!file) {
            setError('Please choose a document first.');
            return;
        }

        setLoading(endpoint);
        setError('');

        try {
            const formData = new FormData();
            formData.append('document', file);

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });

            const raw = await response.text();
            let data;
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                throw new Error(response.ok ? 'Server returned invalid JSON.' : `Request failed (${response.status}).`);
            }
            if (!response.ok) {
                throw new Error(data.error || fallbackError);
            }

            onSuccess(data);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : fallbackError);
        } finally {
            setLoading(null);
        }
    }

    async function handleGenerateSummary(event) {
        event.preventDefault();
        setSummary('');
        await requestDocument('/api/summarize', {
            onSuccess: (data) => setSummary(data.summary),
            fallbackError: 'Unable to generate summary.',
        });
    }

    async function handleGenerateNotes() {
        setNotes('');
        await requestDocument('/api/note', {
            onSuccess: (data) => setNotes(data.summary),
            fallbackError: 'Unable to generate notes.',
        });
    }

    async function handleAskQuestion(event) {
        event.preventDefault();

        if (!file) {
            setError('Please upload a document first.');
            return;
        }

        const trimmedQuestion = question.trim();
        if (!trimmedQuestion) {
            setError('Please enter a question.');
            return;
        }

        setLoading('/api/chat');
        setError('');

        const userMessage = { role: 'user', content: trimmedQuestion };
        // Update chat history
        setChatMessages((previous) => [...previous, userMessage]);
        setQuestion('');

        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('question', trimmedQuestion);

            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData,
            });

            const res = await response.text();
            const data = JSON.parse(res);

            if (!response.ok) {
                throw new Error(data.error || 'Unable to answer question.');
            }

            const assistantMessage = { role: 'assistant', content: data.answer || 'No answer generated.' };
            // Add response from ai to chat history
            setChatMessages((previous) => [...previous, assistantMessage]);
        } catch (requestError) {
            setChatMessages((previous) => previous.slice(0, -1));
            setError(requestError instanceof Error ? requestError.message : 'Unable to answer question.');
        } finally {
            setLoading(null);
        }
    }

    function handleFileUpload(event) {
        setFile(event.target.files?.[0] || null);

        // Since the file has changed reset all generated summary, notes and conversation
        setSummary('');
        setNotes('');
        setQuestion('');
        setChatMessages([]);
        setError('');
    }
    return (
        <main className='app-shell'>
            <section className='card'>
                <h1>FocusAI - The AI Study Helper</h1>
                <p className='subtitle'>
                    Upload a <code>.pdf</code>, <code>.txt</code>, <code>.doc</code>, or <code>.docx</code> file and
                    generate a summary using AI.
                </p>

                <form onSubmit={handleGenerateSummary}>
                    <label htmlFor='document' className='file-input'>
                        Choose file
                        <input
                            id='document'
                            type='file'
                            accept='.pdf,.txt,.doc,.docx'
                            disabled={loading !== null}
                            onChange={(event) => handleFileUpload(event)}
                        />
                    </label>
                    <p className='file-name'>{fileLabel}</p>
                    <div className='button-container'>
                        <button type='submit' disabled={loading !== null}>
                            {loading === '/api/summarize' ? 'Generating summary...' : 'Generate Summary'}
                        </button>
                        {/* Button type is button to avoid form submission */}
                        <button type='button' disabled={loading !== null} onClick={() => void handleGenerateNotes()}>
                            {loading === '/api/notes' ? 'Generating notes...' : 'Generate Notes'}
                        </button>
                    </div>
                </form>

                {error && <p className='error'>{error}</p>}
                <div className='output-container'>
                    {summary && (
                        <div className='summary'>
                            <h2>Summary</h2>
                            <pre>{summary}</pre>
                        </div>
                    )}

                    {notes && (
                        <div className='notes'>
                            <h2>Notes</h2>
                            <pre>{notes}</pre>
                        </div>
                    )}
                </div>
            </section>
            <section className='chat-section'>
                <h2>Ask About the Document</h2>
                <form onSubmit={handleAskQuestion} className='chat-form'>
                    <input
                        type='text'
                        placeholder='Ask a question about your document...'
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        disabled={loading !== null}
                    />
                    <button type='submit' disabled={loading !== null}>
                        {loading === '/api/chat' ? 'Asking...' : 'Ask'}
                    </button>
                </form>

                <div className='chat-messages'>
                    {chatMessages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
                            <strong>{message.role === 'user' ? 'You' : 'FocusAI'}:</strong> {message.content}
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}

export default App;
