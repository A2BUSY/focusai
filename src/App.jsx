import { useMemo, useState } from 'react';
import './App.css';

function App() {
    const [file, setFile] = useState(null);
    const [summary, setSummary] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(null);

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
        await requestDocument('/api/notes', {
            onSuccess: (data) => setNotes(data.summary),
            fallbackError: 'Unable to generate notes.',
        });
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
                            onChange={(event) => {
                                setFile(event.target.files?.[0] || null);
                                setSummary('');
                                setNotes('');
                                setError('');
                            }}
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
        </main>
    );
}

export default App;
