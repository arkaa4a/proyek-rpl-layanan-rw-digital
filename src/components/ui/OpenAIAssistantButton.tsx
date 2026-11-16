'use client';

export default function OpenAIAssistantButton() {
  return (
    <button 
      className="btn" 
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      onClick={() => document.dispatchEvent(new CustomEvent('open-ai-assistant'))}
    >
      Tanya AI Assistant
    </button>
  );
}
