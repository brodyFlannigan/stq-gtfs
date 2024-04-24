import { format } from 'date-fns';

function makeCalendarDates(scheduleData: any[]) {
    const uniqueDates = new Set();
    const calendarDates: { service_id: any; date: any; exception_type: string; }[] = [];

    scheduleData.forEach(({ date, data }) => {
        data.trajet.forEach((trajet: { jour: any[]; }) => {
            // Proceed only if there is at least one non-empty 'jour' array
            trajet.jour.forEach(jour => {
                if (jour.length !== 0 && !uniqueDates.has(jour.date)) {
                    uniqueDates.add(jour.date);
                    const serviceId = jour.date.replace(/-/g, '');
                    calendarDates.push({
                        service_id: jour.date,
                        date: serviceId,
                        exception_type: '1'
                    });
                }
            });
        });
    });

    return calendarDates;
}

export default makeCalendarDates;
