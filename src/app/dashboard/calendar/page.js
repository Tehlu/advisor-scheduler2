'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import {
  getMonthDates,
  isToday,
  isSameMonth,
  formatTime,
  formatDate,
  getEventsForDate,
  validateEventTime
} from '@/lib/calendar';
import SchedulingLinkGenerator from '@/components/SchedulingLinkGenerator';
import { format } from 'date-fns';

export default function Calendar() {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 4)); // May 2025
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [error, setError] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start_time: '',
    end_time: '',
    notes: ''
  });
  const [newProfile, setNewProfile] = useState({
    profile_name: '',
    email: '',
    color: '#4f46e5'
  });
  const [newCalendar, setNewCalendar] = useState({
    name: '',
    color: '#4f46e5'
  });
  const [selectedEvent, setSelectedEvent] = useState(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const router = useRouter();

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      fetchCalendars();
    }
  }, [selectedProfile]);

  useEffect(() => {
    if (selectedCalendar) {
      fetchEvents();
    }
  }, [selectedCalendar, currentDate]);

  const fetchProfiles = async () => {
    try {
      setError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (profilesError) throw profilesError;
      setProfiles(profiles || []);
      
      if (profiles && profiles.length > 0) {
        setSelectedProfile(profiles[0]);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setError('Failed to load profiles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCalendars = async () => {
    try {
      setError(null);
      const { data: calendars, error: calendarsError } = await supabase
        .from('calendars')
        .select('*')
        .eq('profile_id', selectedProfile.id)
        .eq('is_visible', true)
        .order('created_at');

      if (calendarsError) throw calendarsError;
      setCalendars(calendars || []);
      
      if (calendars && calendars.length > 0) {
        setSelectedCalendar(calendars[0]);
      }
    } catch (error) {
      console.error('Error fetching calendars:', error);
      setError('Failed to load calendars. Please try again.');
    }
  };

  const fetchEvents = async () => {
    try {
      setError(null);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('calendar_id', selectedCalendar.id)
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .order('start_time');

      if (eventsError) throw eventsError;
      setEvents(events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          ...newProfile
        });

      if (insertError) throw insertError;

      setShowProfileForm(false);
      setNewProfile({
        profile_name: '',
        email: '',
        color: '#4f46e5'
      });
      fetchProfiles();
    } catch (error) {
      console.error('Error creating profile:', error);
      setError('Failed to create profile. Please try again.');
    }
  };

  const handleCreateCalendar = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const { error: insertError } = await supabase
        .from('calendars')
        .insert({
          profile_id: selectedProfile.id,
          ...newCalendar
        });

      if (insertError) throw insertError;

      setShowCalendarForm(false);
      setNewCalendar({
        name: '',
        color: '#4f46e5'
      });
      fetchCalendars();
    } catch (error) {
      console.error('Error creating calendar:', error);
      setError('Failed to create calendar. Please try again.');
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (!validateEventTime(newEvent.start_time, newEvent.end_time)) {
        setError('Invalid event time. Please check the date range and ensure end time is after start time.');
        return;
      }

      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert({
          calendar_id: selectedCalendar.id,
          ...newEvent
        });

      if (insertError) throw insertError;

      setShowEventForm(false);
      setSelectedDate(null);
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (deleteError) throw deleteError;
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event. Please try again.');
    }
  };

  const handlePrevMonth = () => {
    if (currentDate.getMonth() > 4) { // Don't go before May 2025
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    }
  };

  const handleNextMonth = () => {
    if (currentDate.getMonth() < 5) { // Don't go after June 2025
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }
  };

  const handleDateClick = (date) => {
    if (isSameMonth(date, currentDate)) {
      setSelectedDate(date);
      setShowEventForm(true);
      setNewEvent({
        title: '',
        start_time: date.toISOString().split('T')[0] + 'T09:00',
        end_time: date.toISOString().split('T')[0] + 'T10:00',
        notes: ''
      });
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Welcome to Your Calendar</h2>
            <button
              onClick={() => router.push('/')}
              className="button button-secondary"
            >
              Back to Login
            </button>
          </div>
          <p className="text-gray-600 mb-6">
            To get started, create your first profile. You can add multiple profiles later.
          </p>
          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <label htmlFor="profile_name" className="block text-sm font-medium text-gray-700">
                Profile Name
              </label>
              <input
                type="text"
                id="profile_name"
                value={newProfile.profile_name}
                onChange={(e) => setNewProfile({ ...newProfile, profile_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={newProfile.email}
                onChange={(e) => setNewProfile({ ...newProfile, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                Profile Color
              </label>
              <input
                type="color"
                id="color"
                value={newProfile.color}
                onChange={(e) => setNewProfile({ ...newProfile, color: e.target.value })}
                className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Profile
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your First Calendar</h2>
          <p className="text-gray-600 mb-6">
            Let's create a calendar for your profile. You can add more calendars later.
          </p>
          <form onSubmit={handleCreateCalendar} className="space-y-4">
            <div>
              <label htmlFor="calendar_name" className="block text-sm font-medium text-gray-700">
                Calendar Name
              </label>
              <input
                type="text"
                id="calendar_name"
                value={newCalendar.name}
                onChange={(e) => setNewCalendar({ ...newCalendar, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="calendar_color" className="block text-sm font-medium text-gray-700">
                Calendar Color
              </label>
              <input
                type="color"
                id="calendar_color"
                value={newCalendar.color}
                onChange={(e) => setNewCalendar({ ...newCalendar, color: e.target.value })}
                className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Calendar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const monthDates = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="dashboard-card">
          {error && (
            <div className="error-message">
              {error}
              <button 
                className="error-close" 
                onClick={() => setError(null)}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
          
          <div className="calendar-header">
            <div className="calendar-header-left">
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={handleLogout}
                  className="button button-secondary"
                >
                  Logout
                </button>
              </div>
              <div className="profile-selector">
                <select
                  value={selectedProfile?.id || ''}
                  onChange={(e) => setSelectedProfile(profiles.find(p => p.id === e.target.value))}
                  className="select-input"
                  style={{ color: '#23272f', fontWeight: 700 }}
                >
                  {profiles.map(profile => (
                    <option key={profile.id} value={profile.id} style={{ color: '#23272f', fontWeight: 700 }}>{profile.profile_name}</option>
                  ))}
                </select>
                <button
                  className="button button-secondary"
                  onClick={() => setShowProfileForm(true)}
                >
                  New Profile
                </button>
              </div>
              {selectedProfile && (
                <div className="calendar-selector">
                  <select
                    value={selectedCalendar?.id || ''}
                    onChange={(e) => setSelectedCalendar(calendars.find(c => c.id === e.target.value))}
                    className="select-input"
                    style={{ color: '#23272f', fontWeight: 700 }}
                  >
                    {calendars.map(calendar => (
                      <option key={calendar.id} value={calendar.id} style={{ color: '#23272f', fontWeight: 700 }}>{calendar.name}</option>
                    ))}
                  </select>
                  <button
                    className="button button-secondary"
                    onClick={() => setShowCalendarForm(true)}
                  >
                    New Calendar
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-end justify-between w-full mt-2 mb-4">
              {selectedProfile && selectedCalendar && (
                <div style={{ marginLeft: 'auto', marginTop: '0', marginBottom: '50px' }}>
                  <SchedulingLinkGenerator 
                    profileId={selectedProfile.id} 
                    calendarId={selectedCalendar.id} 
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between w-full mb-6" style={{ marginTop: '24px' }}>
            <h2 className="dashboard-title" style={{ color: '#23272f', fontWeight: 700, marginBottom: 0, marginLeft: '2px' }}>Calendar</h2>
            <div className="calendar-nav" style={{ marginBottom: 0 }}>
              <button 
                className="button" 
                onClick={handlePrevMonth}
                disabled={currentDate.getMonth() <= 4}
                style={{ color: '#23272f', fontWeight: 700 }}
              >
                Previous
              </button>
              <span style={{ color: '#23272f', fontWeight: 700, margin: '0 16px' }}>
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                className="button" 
                onClick={handleNextMonth}
                disabled={currentDate.getMonth() >= 5}
                style={{ color: '#23272f', fontWeight: 700 }}
              >
                Next
              </button>
            </div>
          </div>

          <div className="calendar-grid relative">
            {weekDays.map(day => (
              <div key={day} className="calendar-day-header font-bold" style={{ color: '#23272f' }}>{day}</div>
            ))}
            {monthDates.map((date, index) => (
              <div
                key={index}
                className={`calendar-day ${isToday(date) ? 'calendar-today' : ''} ${
                  !isSameMonth(date, currentDate) ? 'calendar-other-month' : ''
                } relative`}
                onClick={() => handleDateClick(date)}
              >
                <span className="font-bold" style={{ color: '#23272f' }}>{date.getDate()}</span>
                {getEventsForDate(events, date).map(event => (
                  <div
                    key={event.id}
                    className="calendar-event cursor-pointer hover:bg-opacity-90 transition-colors"
                    style={{ backgroundColor: selectedCalendar?.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSelectedEvent({
                        ...event,
                        position: {
                          top: rect.top,
                          left: rect.left,
                          width: rect.width
                        }
                      });
                    }}
                  >
                    <div className="event-time font-bold" style={{ color: '#23272f' }}>
                      {formatTime(new Date(event.start_time))}
                    </div>
                    <div className="event-title font-bold" style={{ color: '#23272f' }}>{event.title}</div>
                    <button
                      className="event-delete font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(event.id);
                      }}
                      aria-label="Delete event"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {selectedEvent && getEventsForDate(events, date).some(e => e.id === selectedEvent.id) && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center z-50"
                    style={{
                      top: '0',
                      left: '0',
                      right: '0',
                      bottom: '0',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)'
                    }}
                  >
                    <div 
                      className="rounded-xl shadow-2xl w-[90%] max-w-md border-2 border-blue-200"
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(239, 246, 255, 0.98)',
                        backdropFilter: 'blur(4px)',
                        maxHeight: 'calc(100% - 20px)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-start p-4 border-b border-blue-200">
                        <h2 className="text-xl font-bold" style={{ color: '#23272f' }}>{selectedEvent.title}</h2>
                        <button
                          onClick={() => setSelectedEvent(null)}
                          className="text-gray-800 hover:text-black text-xl font-bold flex-shrink-0"
                          aria-label="Close modal"
                        >
                          ×
                        </button>
                      </div>

                      <div className="overflow-y-auto flex-grow p-4">
                        <div className="space-y-4">
                          {/* Time Information */}
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <h3 className="text-base font-bold mb-1" style={{ color: '#23272f' }}>Time</h3>
                            <p className="text-sm" style={{ color: '#23272f' }}>
                              {format(new Date(selectedEvent.start_time), 'EEEE, MMMM d, yyyy')}
                            </p>
                            <p className="text-sm" style={{ color: '#23272f' }}>
                              {format(new Date(selectedEvent.start_time), 'h:mm a')} - {format(new Date(selectedEvent.end_time), 'h:mm a')}
                            </p>
                          </div>

                          {/* Attendee Information */}
                          {selectedEvent.notes && (() => {
                            try {
                              const details = JSON.parse(selectedEvent.notes);
                              if (details.email) {
                                return (
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <h3 className="text-base font-bold mb-1" style={{ color: '#23272f' }}>Attendee Information</h3>
                                    <div className="space-y-1">
                                      <p className="text-sm" style={{ color: '#23272f' }}>
                                        <span className="font-semibold">Email:</span> {details.email}
                                      </p>
                                      {details.linkedin && (
                                        <p className="text-sm" style={{ color: '#23272f' }}>
                                          <span className="font-semibold">LinkedIn:</span>{' '}
                                          <a
                                            href={details.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-900 hover:text-black break-all"
                                          >
                                            {details.linkedin}
                                          </a>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            } catch (error) {
                              console.error('Error parsing event notes:', error);
                            }
                            return null;
                          })()}

                          {/* Custom Questions and Answers */}
                          {selectedEvent.notes && (() => {
                            try {
                              const details = JSON.parse(selectedEvent.notes);
                              if (details.augmentedAnswers && Object.keys(details.augmentedAnswers).length > 0) {
                                return (
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <h3 className="text-base font-bold mb-1" style={{ color: '#23272f' }}>Questions and Answers</h3>
                                    <div className="space-y-2">
                                      {Object.entries(details.augmentedAnswers).map(([questionId, data]) => (
                                        <div key={questionId} className="border-b border-blue-200 pb-1 last:border-0">
                                          <p className="text-sm font-semibold" style={{ color: '#23272f' }}>{questionId}</p>
                                          <p className="text-sm" style={{ color: '#23272f' }}>{data.original}</p>
                                          <p className="text-sm italic" style={{ color: '#23272f' }}>
                                            <span className="font-semibold">Additional Context:</span> {data.context}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                            } catch (error) {
                              console.error('Error parsing event notes:', error);
                            }
                            return null;
                          })()}

                          {/* LinkedIn Context */}
                          {selectedEvent.notes && (() => {
                            try {
                              const details = JSON.parse(selectedEvent.notes);
                              if (details.linkedinContext) {
                                return (
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <h3 className="text-base font-bold mb-1" style={{ color: '#23272f' }}>LinkedIn Context</h3>
                                    <p className="text-sm" style={{ color: '#23272f' }}>{details.linkedinContext}</p>
                                  </div>
                                );
                              }
                            } catch (error) {
                              console.error('Error parsing event notes:', error);
                            }
                            return null;
                          })()}

                          {/* Notes */}
                          {selectedEvent.notes && (() => {
                            try {
                              const details = JSON.parse(selectedEvent.notes);
                              if (!details.email) {
                                return (
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <h3 className="text-base font-bold mb-1" style={{ color: '#23272f' }}>Notes</h3>
                                    <p className="text-sm" style={{ color: '#23272f' }}>{selectedEvent.notes}</p>
                                  </div>
                                );
                              }
                            } catch (error) {
                              console.error('Error parsing event notes:', error);
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      <div className="flex justify-end p-4 border-t border-blue-200 bg-blue-50">
                        <button
                          onClick={() => setSelectedEvent(null)}
                          className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showProfileForm && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Create New Profile</h3>
                <form onSubmit={handleCreateProfile}>
                  <div className="form-group">
                    <label htmlFor="profile_name">Profile Name</label>
                    <input
                      type="text"
                      id="profile_name"
                      value={newProfile.profile_name}
                      onChange={(e) => setNewProfile({ ...newProfile, profile_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={newProfile.email}
                      onChange={(e) => setNewProfile({ ...newProfile, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="color">Color</label>
                    <input
                      type="color"
                      id="color"
                      value={newProfile.color}
                      onChange={(e) => setNewProfile({ ...newProfile, color: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="button button-primary">Create Profile</button>
                    <button 
                      type="button" 
                      className="button" 
                      onClick={() => setShowProfileForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showCalendarForm && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Create New Calendar</h3>
                <form onSubmit={handleCreateCalendar}>
                  <div className="form-group">
                    <label htmlFor="name">Calendar Name</label>
                    <input
                      type="text"
                      id="name"
                      value={newCalendar.name}
                      onChange={(e) => setNewCalendar({ ...newCalendar, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="calendar_color">Color</label>
                    <input
                      type="color"
                      id="calendar_color"
                      value={newCalendar.color}
                      onChange={(e) => setNewCalendar({ ...newCalendar, color: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="button button-primary">Create Calendar</button>
                    <button 
                      type="button" 
                      className="button" 
                      onClick={() => setShowCalendarForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEventForm && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Add Event for {formatDate(selectedDate)}</h3>
                <form onSubmit={handleEventSubmit}>
                  <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input
                      type="text"
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="start_time">Start Time</label>
                    <input
                      type="datetime-local"
                      id="start_time"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="end_time">End Time</label>
                    <input
                      type="datetime-local"
                      id="end_time"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      value={newEvent.notes}
                      onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="button button-primary">Add Event</button>
                    <button 
                      type="button" 
                      className="button" 
                      onClick={() => {
                        setShowEventForm(false);
                        setSelectedDate(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .calendar-day:hover {
          background-color: #ede9fe !important;
          transition: background 0.2s;
          cursor: pointer;
        }
      `}</style>
    </>
  );
} 