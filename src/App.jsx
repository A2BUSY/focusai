import { useMemo, useState } from 'react';
import './App.css';

function App() {
    const [file, setFile] = useState(null);
    const [summary, setSummary] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fileLabel = useMemo(() => {
        if (!file) {
            return 'No file selected';
        } else {
            // Return the file name and size in KB
            return `${file.name} (${Math.round(file.size / 1024)} KB)`;
        }
    }, [file]);

    async function handleSubmit(event) {
        // Prevent the default form submission behavior
        event.preventDefault();
        if (!file) {
            setError('Please choose a document first.');
            return;
        }

        setLoading(true);
        setError('');
        setSummary('');

        try {
            const formData = new FormData();
            formData.append('document', file);

            const response = await fetch('/api/notes', {
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
                throw new Error(data.error || 'Unable to generate summary.');
            }

            setSummary(data.summary);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to generate summary.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className='app-shell'>
            <section className='card'>
                <h1>FocusAI - The AI Study Helper</h1>
                <p className='subtitle'>
                    Upload a <code>.pdf</code>, <code>.txt</code>, <code>.doc</code>, or <code>.docx</code> file and
                    generate a summary using AI.
                </p>

                <form onSubmit={handleSubmit}>
                    <label htmlFor='document' className='file-input'>
                        Choose file
                        <input
                            id='document'
                            type='file'
                            accept='.pdf,.txt,.doc,.docx'
                            onChange={(event) => {
                                setFile(event.target.files?.[0] || null);
                                setSummary('');
                                setError('');
                            }}
                        />
                    </label>
                    <p className='file-name'>{fileLabel}</p>
                    <button type='submit' disabled={loading}>
                        {loading ? 'Generating summary...' : 'Generate Summary'}
                    </button>
                </form>

                {error && <p className='error'>{error}</p>}

                {summary && (
                    <div className='summary'>
                        <h2>Summary</h2>
                        <pre>{summary}</pre>
                    </div>
                )}
            </section>
        </main>
    );
}

export default App;
