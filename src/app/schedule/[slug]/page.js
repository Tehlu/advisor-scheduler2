'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, addDays, startOfDay, endOfDay, parseISO } from 'date-fns';

export default function SchedulingPage({ params }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedulingLink, setSchedulingLink] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    linkedin: '',
    professionalSummary: '',
    answers: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchSchedulingLink();
  }, [params.slug]);

  const fetchSchedulingLink = async () => {
    try {
      const { data: link, error: linkError } = await supabase
        .from('scheduling_links')
        .select(`
          *,
          scheduling_questions (
            id,
            question_text,
            is_required,
            question_type
          )
        `)
        .eq('slug', params.slug)
        .single();

      if (linkError) throw linkError;
      if (!link) throw new Error('Scheduling link not found');
      if (!link.is_active) throw new Error('This scheduling link is no longer active');
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        throw new Error('This scheduling link has expired');
      }

      setSchedulingLink(link);
      fetchAvailableSlots(link);
    } catch (error) {
      console.error('Error fetching scheduling link:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSlots = async (link) => {
    try {
      const today = new Date();
      const maxDate = addDays(today, link.max_days_in_advance);
      
      // Get all events for the calendar within the date range
      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('calendar_id', link.calendar_id)
        .gte('start_time', startOfDay(today).toISOString())
        .lte('start_time', endOfDay(maxDate).toISOString());

      if (eventsError) throw eventsError;

      // Generate available slots
      const slots = [];
      let currentDate = today;

      while (currentDate <= maxDate) {
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          // Generate slots for each day from 9 AM to 5 PM
          for (let hour = 9; hour < 17; hour++) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, 0, 0, 0);
            
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + link.meeting_duration_minutes);

            // Check if this slot overlaps with any existing events
            const isAvailable = !events.some(event => {
              const eventStart = parseISO(event.start_time);
              const eventEnd = parseISO(event.end_time);
              return (
                (slotStart >= eventStart && slotStart < eventEnd) ||
                (slotEnd > eventStart && slotEnd <= eventEnd) ||
                (slotStart <= eventStart && slotEnd >= eventEnd)
              );
            });

            if (isAvailable) {
              slots.push({
                start: slotStart,
                end: slotEnd
              });
            }
          }
        }
        currentDate = addDays(currentDate, 1);
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setError('Failed to load available time slots');
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    // Initialize answers object with empty strings for each question
    const answers = {};
    schedulingLink.scheduling_questions.forEach(q => {
      answers[q.id] = '';
    });
    setFormData(prev => ({ ...prev, answers }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Create the event
      const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          calendar_id: schedulingLink.calendar_id,
          title: 'Scheduled Meeting',
          start_time: selectedSlot.start.toISOString(),
          end_time: selectedSlot.end.toISOString(),
          notes: JSON.stringify({
            email: formData.email,
            linkedin: formData.linkedin,
            professionalSummary: formData.professionalSummary
          })
        })
        .select()
        .single();

      if (eventError) {
        console.error('Event creation error:', eventError);
        throw eventError;
      }

      // Store answers in the scheduling_answers table
      const answerInserts = Object.entries(formData.answers).map(([questionId, answer]) => ({
        event_id: event.id,
        question_id: questionId,
        answer: answer
      }));

      const { error: answersError } = await supabase
        .from('scheduling_answers')
        .insert(answerInserts);

      if (answersError) {
        console.error('Error storing answers:', answersError);
        throw answersError;
      }

      // Call the notification endpoint
      const response = await fetch('/api/notify-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Notification error:', errorData);
        throw new Error('Failed to send notification');
      }

      setSuccess(true);
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      setError('Failed to schedule meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scheduling page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Schedule a Meeting</h1>

          {!selectedSlot ? (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Available Time Slots</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleSlotSelect(slot)}
                    className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="font-bold text-gray-900">
                      {format(slot.start, 'MMM d, yyyy')}
                    </div>
                    <div className="text-gray-600">
                      {format(slot.start, 'h:mm a')} - {format(slot.end, 'h:mm a')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-base font-bold text-gray-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium text-lg p-3"
                />
              </div>

              <div>
                <label htmlFor="linkedin" className="block text-base font-bold text-gray-900 mb-2">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/your-profile"
                  className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium text-lg p-3"
                />
              </div>

              <div>
                <label htmlFor="professionalSummary" className="block text-base font-bold text-gray-900 mb-2">
                  Professional Summary
                </label>
                <textarea
                  id="professionalSummary"
                  value={formData.professionalSummary}
                  onChange={(e) => setFormData(prev => ({ ...prev, professionalSummary: e.target.value }))}
                  placeholder="Briefly describe your professional background, experience, and current role..."
                  rows={4}
                  className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium text-lg p-3"
                />
              </div>

              {schedulingLink.scheduling_questions.map((question) => (
                <div key={question.id}>
                  <label htmlFor={`question-${question.id}`} className="block text-base font-bold text-gray-900 mb-2">
                    {question.question_text}
                    {question.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {question.question_type === 'textarea' ? (
                    <textarea
                      id={`question-${question.id}`}
                      value={formData.answers[question.id]}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        answers: { ...prev.answers, [question.id]: e.target.value }
                      }))}
                      required={question.is_required}
                      rows={4}
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium text-lg p-3"
                    />
                  ) : (
                    <input
                      type={question.question_type}
                      id={`question-${question.id}`}
                      value={formData.answers[question.id]}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        answers: { ...prev.answers, [question.id]: e.target.value }
                      }))}
                      required={question.is_required}
                      className="mt-1 block w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium text-lg p-3"
                    />
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between pt-6">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="button button-secondary font-bold px-6 py-3"
                >
                  Back to Time Slots
                </button>
                <button
                  type="submit"
                  className="button button-primary font-bold px-6 py-3"
                >
                  Schedule Meeting
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 