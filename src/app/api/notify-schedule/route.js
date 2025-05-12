import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Initialize Supabase with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize nodemailer transporter with secure options
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Only use this in development
  }
});

export async function POST(request) {
  try {
    const { eventId } = await request.json();
    console.log('Received eventId:', eventId);

    // Get event details with more specific query
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        start_time,
        end_time,
        notes,
        calendar_id,
        calendars (
          user_profiles (
            email
          )
        )
      `)
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw eventError;
    }

    if (!event) {
      console.error('No event found with ID:', eventId);
      throw new Error('Event not found');
    }

    console.log('Found event:', event);

    // Get the answers
    const { data: answers, error: answersError } = await supabase
      .from('scheduling_answers')
      .select(`
        *,
        scheduling_questions (
          question_text
        )
      `)
      .eq('event_id', eventId);

    if (answersError) {
      console.error('Error fetching answers:', answersError);
      throw answersError;
    }

    console.log('Found answers:', answers);

    // Parse attendee details from event notes
    const attendeeDetails = JSON.parse(event.notes || '{}');
    console.log('Parsed attendee details:', attendeeDetails);

    // Get the recipient email - try calendar owner first, fall back to attendee
    const recipientEmail = event.calendars?.user_profiles?.email || attendeeDetails.email;
    
    if (!recipientEmail) {
      throw new Error('No recipient email found');
    }

    console.log('Sending email to:', recipientEmail);

    try {
      console.log('Attempting to send email...');
      
      // Format the meeting date
      const meetingDate = new Date(event.start_time).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      // Create email content
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5; margin-bottom: 20px;">New Meeting Scheduled</h1>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #111827; margin-bottom: 15px;">Meeting Details</h2>
            <p><strong>Title:</strong> ${event.title}</p>
            <p><strong>Date & Time:</strong> ${meetingDate}</p>
            <p><strong>Duration:</strong> ${Math.round((new Date(event.end_time) - new Date(event.start_time)) / 1000 / 60)} minutes</p>
          </div>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #111827; margin-bottom: 15px;">Attendee Information</h2>
            <p><strong>Email:</strong> ${attendeeDetails.email}</p>
            ${attendeeDetails.linkedin ? `<p><strong>LinkedIn:</strong> <a href="${attendeeDetails.linkedin}" style="color: #4F46E5;">${attendeeDetails.linkedin}</a></p>` : ''}
            ${attendeeDetails.professionalSummary ? `
              <p><strong>Professional Background:</strong></p>
              <p style="white-space: pre-line;">${attendeeDetails.professionalSummary}</p>
            ` : ''}
          </div>

          ${answers.length > 0 ? `
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
              <h2 style="color: #111827; margin-bottom: 15px;">Pre-Meeting Questions</h2>
              ${answers.map(answer => `
                <div style="margin-bottom: 15px;">
                  <p><strong>Q: ${answer.scheduling_questions.question_text}</strong></p>
                  <p style="margin-left: 20px;">A: ${answer.answer}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;

      // Send email using nodemailer
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `New Meeting Scheduled: ${event.title}`,
        html: emailContent
      };

      const emailResponse = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', emailResponse);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Log the full error details
      console.error('Email error details:', {
        message: emailError.message,
        code: emailError.code,
        stack: emailError.stack
      });
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in notify-schedule:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 