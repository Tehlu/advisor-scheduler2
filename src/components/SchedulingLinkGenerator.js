'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { nanoid } from 'nanoid';

const QUESTION_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'number', label: 'Number' }
];

export default function SchedulingLinkGenerator({ profileId, calendarId }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [formData, setFormData] = useState({
    meeting_duration_minutes: 30,
    max_days_in_advance: 14,
    max_uses: '',
    expires_at: '',
    questions: [
      {
        id: nanoid(),
        question_text: 'What is your name?',
        is_required: true,
        question_type: 'text',
        display_order: 0
      }
    ]
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleAddQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: nanoid(),
          question_text: '',
          is_required: false,
          question_type: 'text',
          display_order: prev.questions.length
        }
      ]
    }));
  };

  const handleRemoveQuestion = (questionId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const handleQuestionChange = (questionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }));
  };

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      // Generate a unique slug
      const slug = nanoid(10);

      // Create the scheduling link
      const { data: link, error: linkError } = await supabase
        .from('scheduling_links')
        .insert({
          profile_id: profileId,
          calendar_id: calendarId,
          slug,
          meeting_duration_minutes: formData.meeting_duration_minutes,
          max_days_in_advance: formData.max_days_in_advance,
          max_uses: formData.max_uses || null,
          expires_at: formData.expires_at || null
        })
        .select()
        .single();

      if (linkError) throw linkError;

      // Create the questions
      const { error: questionsError } = await supabase
        .from('scheduling_questions')
        .insert(
          formData.questions.map(q => ({
            link_id: link.id,
            question_text: q.question_text,
            is_required: q.is_required,
            question_type: q.question_type,
            display_order: q.display_order
          }))
        );

      if (questionsError) throw questionsError;

      setGeneratedLink(`${window.location.origin}/schedule/${slug}`);
    } catch (error) {
      console.error('Error generating scheduling link:', error);
      setError('Failed to generate scheduling link');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="scheduling-link-generator bg-white rounded-xl shadow-2xl p-8 border-2 border-indigo-100">
      <h3 className="text-2xl font-extrabold mb-8 text-gray-900 border-b-2 border-indigo-100 pb-4">Generate Scheduling Link</h3>

      {error && (
        <div className="error-message mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-bold">{error}</p>
          <button 
            className="error-close text-red-600 hover:text-red-800 font-bold text-xl" 
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {generatedLink && (
        <div className="mb-8 p-6 bg-green-50 rounded-lg border-2 border-green-200">
          <p className="text-green-800 font-extrabold text-lg">Scheduling link generated!</p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="flex-1 p-3 border-2 rounded-lg font-bold text-gray-900"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedLink);
              }}
              className="button button-secondary font-bold px-6 py-3"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleGenerateLink} className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
            <label htmlFor="meeting_duration" className="block text-base font-extrabold text-gray-900 mb-3">
              Meeting Duration (minutes)
            </label>
            <input
              type="number"
              id="meeting_duration"
              value={formData.meeting_duration_minutes}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                meeting_duration_minutes: parseInt(e.target.value)
              }))}
              min="1"
              required
              className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-bold text-lg p-3"
            />
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
            <label htmlFor="max_days" className="block text-base font-extrabold text-gray-900 mb-3">
              Max Days in Advance
            </label>
            <input
              type="number"
              id="max_days"
              value={formData.max_days_in_advance}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                max_days_in_advance: parseInt(e.target.value)
              }))}
              min="1"
              required
              className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-bold text-lg p-3"
            />
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
            <label htmlFor="max_uses" className="block text-base font-extrabold text-gray-900 mb-3">
              Max Uses (optional)
            </label>
            <input
              type="number"
              id="max_uses"
              value={formData.max_uses}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                max_uses: e.target.value ? parseInt(e.target.value) : ''
              }))}
              min="1"
              className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-bold text-lg p-3"
            />
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
            <label htmlFor="expires_at" className="block text-base font-extrabold text-gray-900 mb-3">
              Expiration Date (optional)
            </label>
            <input
              type="datetime-local"
              id="expires_at"
              value={formData.expires_at}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                expires_at: e.target.value
              }))}
              className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-bold text-lg p-3"
            />
          </div>
        </div>

        <div className="questions-section bg-white rounded-xl border-2 border-indigo-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xl font-extrabold text-gray-900">Scheduling Questions</h4>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="button button-secondary font-bold px-6 py-3"
            >
              Add Question
            </button>
          </div>

          <div className="space-y-6">
            {formData.questions.map((question, index) => (
              <div key={question.id} className="question-item p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                <div className="flex justify-between items-start mb-6">
                  <h5 className="text-base font-extrabold text-gray-900">Question {index + 1}</h5>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(question.id)}
                    className="text-red-600 hover:text-red-800 font-bold text-xl"
                    disabled={formData.questions.length === 1}
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-base font-extrabold text-gray-900 mb-3">
                      Question Text
                    </label>
                    <input
                      type="text"
                      value={question.question_text}
                      onChange={(e) => handleQuestionChange(question.id, 'question_text', e.target.value)}
                      required
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-bold text-lg p-3"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-extrabold text-gray-900 mb-3">
                      Question Type
                    </label>
                    <select
                      value={question.question_type}
                      onChange={(e) => handleQuestionChange(question.id, 'question_type', e.target.value)}
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-bold text-lg p-3"
                    >
                      {QUESTION_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={question.is_required}
                        onChange={(e) => handleQuestionChange(question.id, 'is_required', e.target.checked)}
                        className="rounded border-2 border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-5 w-5"
                      />
                      <span className="ml-3 text-base font-extrabold text-gray-900">Required</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full flex justify-center py-4 px-6 border-2 border-transparent rounded-xl shadow-lg text-lg font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Link'}
        </button>
      </form>
    </div>
  );
} 