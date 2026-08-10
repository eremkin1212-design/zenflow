Test cases for the calendar day-off working-hours action:
- Select a day marked as выходной: button «Задать рабочее время» appears above bottom navigation.
- Open the action: start/end fields are prefilled from the matching weekly schedule when available.
- Save valid times: only the selected date is written to working_hours.dates with on=true.
- Refresh: the selected date remains a working day with the saved hours.
- Other dates and weekly schedule remain unchanged.
