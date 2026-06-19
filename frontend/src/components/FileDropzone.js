import React, { useState, useRef } from 'react';

export default function FileDropzone({ onFileParsed, accept }) {
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState('');
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const processFile = async (file) => {
    setFilename(file.name);
    const ext = file.name.split('.').pop().toLowerCase();
    const text = await file.text();

    try {
      if (ext === 'json') {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : data.candidates || [];
        if (arr.length === 0) throw new Error('No candidates found');
        onFileParsed({ type: 'candidates', data: arr, filename: file.name });
      } else if (ext === 'csv') {
        const Papa = require('papaparse');
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        onFileParsed({ type: 'candidates', data: result.data, filename: file.name });
      } else if (ext === 'xlsx') {
        const XLSX = require('xlsx');
        const wb = XLSX.read(text, { type: 'string' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        onFileParsed({ type: 'candidates', data, filename: file.name });
      } else if (ext === 'pdf') {
        onFileParsed({ type: 'jd', data: text, filename: file.name });
      } else {
        onFileParsed({ type: 'jd', data: text, filename: file.name });
      }
    } catch (err) {
      onFileParsed({ type: 'error', message: err.message });
    }
  };

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} style={{ display: 'none' }} />
      {filename ? (
        <div className="dropzone-file">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>{filename}</span>
        </div>
      ) : (
        <div className="dropzone-placeholder">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p>Drag & drop a file here, or click to browse</p>
          <span className="dropzone-hint">.pdf .csv .json .xlsx</span>
        </div>
      )}
    </div>
  );
}
