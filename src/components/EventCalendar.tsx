import React from 'react';
import { Calendar, momentLocalizer, Event as BigCalendarEvent, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { EventData } from '../lib/eventManagement'; // Assuming EventData interface is here

// Setup the localizer by providing the moment Object
const localizer = momentLocalizer(moment);

// Interface for events formatted for react-big-calendar
export interface CalendarDisplayEvent extends BigCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any; // Original event data can be stored here
  level_tags?: string[] | null;
  description?: string | null;
}

interface EventCalendarProps {
  events: CalendarDisplayEvent[];
  defaultView?: View;
  onSelectEvent?: (event: CalendarDisplayEvent) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] | string[]; action: 'select' | 'click' | 'doubleClick' }) => void;
  onView?: (view: View) => void;
  onNavigate?: (newDate: Date, view: View, action: string) => void;
  height?: string; // e.g., "500px", "100vh"
  selectable?: boolean; // Allow selecting date slots
  // Add any other react-big-calendar props you want to expose
}

const EventCalendarComponent: React.FC<EventCalendarProps> = ({
  events,
  defaultView = 'month',
  onSelectEvent,
  onSelectSlot,
  onView,
  onNavigate,
  height = 'calc(100vh - 200px)', // Default height, adjust as needed
  selectable = false, // Default to not selectable for basic view
}) => {

  // Custom styling for events (optional)
  const eventStyleGetter = (event: CalendarDisplayEvent) => {
    let style = {
      backgroundColor: '#3174ad', // Default blue
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '0.8em',
      padding: '2px 5px',
    };

    // Example: Different color for events with specific tags
    if (event.level_tags?.includes('Staff Meeting')) {
      style.backgroundColor = '#f0ad4e'; // Orange for staff meetings
    } else if (event.level_tags?.includes('Holiday')) {
      style.backgroundColor = '#5cb85c'; // Green for holidays
    } else if (event.level_tags?.some(tag => tag.startsWith('P'))) { // Primary school levels
      style.backgroundColor = '#5bc0de'; // Light blue for primary levels
    }
    // Add more conditions based on event properties if needed

    return {
      style: style,
    };
  };

  return (
    <div style={{ height: height }} className="rbc-calendar-container bg-white p-2 sm:p-4 rounded-lg shadow border">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        defaultView={defaultView}
        views={['month', 'week', 'day', 'agenda']}
        style={{ height: '100%' }} // Make calendar fill its container
        selectable={selectable}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        onView={onView}
        onNavigate={onNavigate}
        eventPropGetter={eventStyleGetter} // Apply custom styles to events
        messages={{
            next: "Next",
            previous: "Prev",
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
            agenda: "Agenda",
            date: "Date",
            time: "Time",
            event: "Event",
            noEventsInRange: "There are no events in this range.",
            showMore: total => `+${total} more`,
        }}
        popup // Enable popup for more events on a day cell
        components={{
            // Example: Custom event wrapper for more detailed tooltips or rendering
            // event: ({ event }) => (
            //   <div title={event.description || event.title}>
            //     <strong>{event.title}</strong>
            //     {event.description && <p className="text-xs truncate">{event.description}</p>}
            //   </div>
            // ),
        }}
      />
    </div>
  );
};

export default EventCalendarComponent;

/**
 * Helper function to transform API EventData to CalendarDisplayEvent
 * This should be used in the dashboard components before passing events to EventCalendarComponent
 */
export const transformApiEventToCalendarEvent = (apiEvent: EventData): CalendarDisplayEvent => {
  return {
    id: apiEvent.id!,
    title: apiEvent.title,
    start: new Date(apiEvent.start_time),
    end: new Date(apiEvent.end_time),
    allDay: false, // Determine this based on start/end times if needed, e.g., if it spans full day(s)
    resource: apiEvent, // Store original API event data
    level_tags: apiEvent.level_tags,
    description: apiEvent.description,
  };
};

export const transformApiEventsToCalendarEvents = (apiEvents: EventData[]): CalendarDisplayEvent[] => {
  return apiEvents.map(transformApiEventToCalendarEvent);
};
