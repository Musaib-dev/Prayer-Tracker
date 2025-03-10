const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Prayer times (approximate for demonstration)
const prayerTimes = {
    Fajr: { hour: 5, minute: 30 },
    Dhuhr: { hour: 12, minute: 30 },
    Asr: { hour: 15, minute: 30 },
    Maghrib: { hour: 18, minute: 0 },
    Isha: { hour: 20, minute: 0 }
};

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    document.getElementById('timeDisplay').innerText = `${dateString} | ${timeString}`;
    updatePrayerInfo(now);
}

function updatePrayerInfo(now) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Determine current prayer time
    let currentPrayer = null;
    let nextPrayer = null;
    let minTimeDiff = Infinity;
    
    // Convert prayer times to minutes
    const prayerTimesInMinutes = {};
    for (const prayer of prayers) {
        const { hour, minute } = prayerTimes[prayer];
        prayerTimesInMinutes[prayer] = hour * 60 + minute;
    }
    
    // Add Fajr of next day for calculations
    const nextDayFajr = prayerTimesInMinutes['Fajr'] + 24 * 60;
    
    // Find current and next prayer
    // Start from last prayer of the day and go backwards
    for (let i = prayers.length - 1; i >= 0; i--) {
        const prayer = prayers[i];
        if (currentTimeMinutes >= prayerTimesInMinutes[prayer]) {
            // Current time is after this prayer
            currentPrayer = prayer;
            // Next prayer is the next in the array, or Fajr if this is Isha
            nextPrayer = i < prayers.length - 1 ? prayers[i + 1] : 'Fajr';
            break;
        }
    }
    
    // If no prayer time has passed yet today
    if (!currentPrayer) {
        currentPrayer = 'Isha'; // From previous day
        nextPrayer = 'Fajr';
    }
    
    // Calculate time until next prayer
    let nextPrayerTimeMinutes;
    if (nextPrayer === 'Fajr' && currentPrayer === 'Isha') {
         if (currentTimeMinutes < prayerTimesInMinutes['Fajr']) {
           nextPrayerTimeMinutes = prayerTimesInMinutes['Fajr'];
         }else {
           nextPrayerTimeMinutes = nextDayFajr;
         }
        } else {
            nextPrayerTimeMinutes = prayerTimesInMinutes[nextPrayer];
        }
    
    let timeDiff = nextPrayerTimeMinutes - currentTimeMinutes;
    if (timeDiff < 0) timeDiff += 24 * 60; // Add a day if prayer has passed
    
    // Calculate hours and minutes until next prayer
    const hoursUntil = Math.floor(timeDiff / 60);
    const minutesUntil = timeDiff % 60;
    
    const timeUntilText = hoursUntil > 0 
        ? `${hoursUntil}h ${minutesUntil}m` 
        : `${minutesUntil}m`;
    
    // Update the displays
    document.getElementById('currentPrayer').innerText = 
        `Current prayer: ${currentPrayer} (${formatTime(prayerTimes[currentPrayer])})`;
        
    document.getElementById('nextPrayer').innerText = 
        `Next prayer: ${nextPrayer} (${formatTime(prayerTimes[nextPrayer])} - in ${timeUntilText})`;
}

function formatTime({ hour, minute }) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
}

setInterval(updateTime, 1000);
updateTime();

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

// Apply saved theme on load
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
}

function getDayKey(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getTodayKey() {
    return getDayKey(new Date());
}

function loadCheckboxes() {
    const today = getTodayKey();
    const allData = JSON.parse(localStorage.getItem('prayerData')) || {};
    const todayData = allData[today] || {};
    
    const list = document.getElementById('prayerList');
    list.innerHTML = '';

    prayers.forEach(prayer => {
        const isChecked = todayData[prayer] || false;
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        checkboxItem.innerHTML = `
            <input type="checkbox" id="${prayer}" ${isChecked ? 'checked' : ''}>
            <label for="${prayer}">${prayer} (${formatTime(prayerTimes[prayer])})</label>
        `;
        list.appendChild(checkboxItem);

        checkboxItem.querySelector('input').addEventListener('change', updateStates);
    });

    updateStats();
}

function updateStates() {
    const today = getTodayKey();
    const allData = JSON.parse(localStorage.getItem('prayerData')) || {};
    const todayData = {};
    
    prayers.forEach(prayer => {
        todayData[prayer] = document.getElementById(prayer).checked;
    });
    
    allData[today] = todayData;
    localStorage.setItem('prayerData', JSON.stringify(allData));
    
    updateStats();
}

function resetToday() {
    if (confirm("Reset all prayers for today?")) {
        const today = getTodayKey();
        const allData = JSON.parse(localStorage.getItem('prayerData')) || {};
        
        // Reset today's data
        allData[today] = {};
        localStorage.setItem('prayerData', JSON.stringify(allData));
        
        // Reload checkboxes
        loadCheckboxes();
    }
}

function updateStats() {
    const today = getTodayKey();
    const allData = JSON.parse(localStorage.getItem('prayerData')) || {};
    const todayData = allData[today] || {};
    
    const completed = prayers.filter(prayer => todayData[prayer]).length;
    const total = prayers.length;
    
    document.getElementById('prayerStats').innerText = 
        `${completed} of ${total} prayers completed today`;
    
    updateChart(completed, total - completed);
}

let progressChart;

function updateChart(completed, remaining) {
    const ctx = document.getElementById('progressChart').getContext('2d');

    if (progressChart) progressChart.destroy();

    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [completed, remaining],
                backgroundColor: [
                    getComputedStyle(document.documentElement).getPropertyValue('--completed-color'),
                    getComputedStyle(document.documentElement).getPropertyValue('--remaining-color')
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = Math.round((value / (completed + remaining)) * 100);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function openCalendar() {
    document.getElementById('calendarModal').style.display = 'flex';
    renderCalendar();
}

function closeCalendar() {
    document.getElementById('calendarModal').style.display = 'none';
}

function changeMonth(delta) {
    currentMonth += delta;
    
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    
    renderCalendar();
}

function renderCalendar() {
    const calendarTitle = document.getElementById('calendarTitle');
    const calendarGrid = document.getElementById('calendarGrid');
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    calendarTitle.innerText = `${monthNames[currentMonth]} ${currentYear}`;
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerText = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Calculate first day of month and total days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Get prayer data
    const allData = JSON.parse(localStorage.getItem('prayerData')) || {};
    const today = new Date();
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const calendarDay = document.createElement('div');
        calendarDay.className = 'calendar-day';
        calendarDay.innerText = day;
        
        // Check if this day has prayer data
        const date = new Date(currentYear, currentMonth, day);
        const dayKey = getDayKey(date);
        const dayData = allData[dayKey];
        
        if (dayData) {
            const completedCount = prayers.filter(prayer => dayData[prayer]).length;
            if (completedCount > 0) {
                calendarDay.classList.add('day-with-data');
                // Add small indicator showing how many prayers were completed
                const indicator = document.createElement('div');
                indicator.innerText = `${completedCount}/${prayers.length}`;
                indicator.style.fontSize = '0.7em';
                calendarDay.appendChild(indicator);
            }
        }
        
        // Highlight today
        if (today.getDate() === day && 
            today.getMonth() === currentMonth && 
            today.getFullYear() === currentYear) {
            calendarDay.classList.add('current-day');
        }
        
        // Add click event to show day details
        calendarDay.addEventListener('click', () => showDayDetail(day));
        
        calendarGrid.appendChild(calendarDay);
    }
}

function showDayDetail(day) {
    const dayDetail = document.getElementById('dayDetail');
    const date = new Date(currentYear, currentMonth, day);
    const dayKey = getDayKey(date);
    const allData = JSON.parse(localStorage.getItem('prayerData')) || {};
    const dayData = allData[dayKey] || {};
    
    // Format date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString(undefined, options);
    
    // Create detail HTML
    let detailHTML = `<h3>${formattedDate}</h3>`;
    const completedCount = prayers.filter(prayer => dayData[prayer]).length;
    
    detailHTML += `<p>${completedCount} of ${prayers.length} prayers completed</p>`;
    detailHTML += '<ul style="list-style-type: none; padding: 0;">';
    
    prayers.forEach(prayer => {
        const isCompleted = dayData[prayer] || false;
        detailHTML += `
            <li style="margin-bottom: 8px; display: flex; align-items: center;">
                <span style="
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    margin-right: 10px;
                    background-color: ${isCompleted ? 'var(--completed-color)' : 'var(--remaining-color)'};
                "></span>
                ${prayer} ${isCompleted ? '✓' : ''}
            </li>
        `;
    });
    
    detailHTML += '</ul>';
    
    dayDetail.innerHTML = detailHTML;
    dayDetail.style.display = 'block';
}

// Initialize
loadCheckboxes();

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('calendarModal');
    if (event.target === modal) {
        closeCalendar();
    }
};