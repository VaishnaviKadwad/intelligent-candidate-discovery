const handleFindCandidates = async (jdText) => {
    setLoading(true);
    setError(null);
    try {
      // Changed to a relative URL path so it works everywhere automatically
      const res = await fetch('/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: jdText }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err.message);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };
